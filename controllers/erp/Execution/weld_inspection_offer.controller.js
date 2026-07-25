
const WeldInspectionOffer = require("../../../models/erp/Execution/weld_inspection_offer.model");
const { sendResponse } = require("../../../helper/response");
const { TitleFormat } = require("../../../utils/enum");
const ejs = require("ejs");
const fs = require("fs");
const XLSX = require('xlsx');  // for utility functions
const XLSXStyle = require('xlsx-style');  // for styling
const puppeteer = require("puppeteer");
const path = require("path");
const moment = require("moment");
const URI = process.env.PDF_URL;
const PATH = process.env.PDF_PATH;

exports.manageWeldInspectionOffer = async (req, res) => {
  const { id, items, offered_by, status, project, fitup_id, drawing_id } = req.body;
  if (req.user && !req.error) {
    const newItems = (items && JSON.parse(items)) || [];
    if (newItems && offered_by) {
      try {
        let lastWeldinspection = await WeldInspectionOffer.findOne(
          { deleted: false, weld_report_no: { $regex: `/${project}/` } }, {}, { sort: { createdAt: -1 } }
        );
        let inspectionNo = "1";
        if (lastWeldinspection && lastWeldinspection.weld_report_no) {
          const split = lastWeldinspection.weld_report_no.split("/");
          const lastWeldinspectionNo = parseInt(split[split.length - 1]);
          inspectionNo = lastWeldinspectionNo + 1;
        }
        const gen_weld_report_no =
          TitleFormat.weldVisual.replace("/PROJECT/", `/${project}/`) +
          inspectionNo;

        if (!id) {
          const object = new WeldInspectionOffer({
            weld_report_no: gen_weld_report_no,
            fitup_id: fitup_id,
            items: newItems,
            offered_by: offered_by,
            drawing_id,
          });

          await object
            .save()
            .then((result) => {
              if (result) {
                sendResponse(
                  res,
                  200,
                  true,
                  {},
                  "Weld visual inspection offer added successfully"
                );
              }
            })
            .catch((err) => {
              sendResponse(
                res,
                500,
                false,
                {},
                "Something went wrong while saving" + err
              );
            });
        } else {
          await WeldInspectionOffer.findByIdAndUpdate(id, {
            items: newItems,
            offered_by: offered_by,
            status: status,
            drawing_id
          })
            .then((result) => {
              if (result) {
                sendResponse(
                  res,
                  200,
                  true,
                  {},
                  "Weld visual inspection offer updated successfully"
                );
              }
            })
            .catch((err) => {
              sendResponse(
                res,
                500,
                false,
                {},
                "Something went wrong while updating"
              );
            });
        }
      } catch (err) {
        sendResponse(res, 500, false, {}, "Something went wrong" + err);
      }
    } else {
      sendResponse(res, 400, false, {}, "Missing parameter");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.getWeldingInspectionOffer = async (req, res) => {
  const { status } = req.query;
  if (req.user && !req.error) {
    try {
      let query = { deleted: false };
      if (status) {
        query.status = status;
      }
      const result = await WeldInspectionOffer.find(query, { deleted: 0 })
        .populate("offered_by", "user_name")
        .populate("qc_name", "user_name")
        .populate({
          path: "items.weldor_no",
          select: "wpsNo welderNo",
          populate: {
            path: "wpsNo",
            select: "wpsNo jointType weldingProcess",
            populate: { path: "jointType.jointId", select: "name" },
          },
        })

        .populate({
          path: "items.transaction_id",
          select: "itemName drawingId quantity item_no grid_no",
          populate: [
            { path: "itemName", select: "name" },
            {
              path: "drawingId",
              select: "drawing_no sheet_no rev assembly_no project",
              populate: {
                path: "project",
                select: "name party work_order_no",
                populate: { path: "party", select: "name" },
              },
            },
          ],
        })

        .populate({
          path: "fitup_id",
          select: "report_no po_no issue_id joint_type report_no_two items",
          populate: { path: "items.joint_type", select: "name" }
        })
        .sort({ createdAt: -1 })
        .lean();

      if (result) {
        sendResponse(
          res,
          200,
          true,
          result,
          "Weld visual inspection offer list"
        );
      } else {
        sendResponse(
          res,
          200,
          true,
          {},
          "Weld visual inspection offer not found"
        );
      }
    } catch (err) {
      sendResponse(res, 500, false, {}, "Something went wrong" + err);
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.getQcWeldApproval = async (req, res) => {
  const { id, status, qc_name, project } = req.body;

  if (req.user && !req.error) {
    if (id && status) {
      try {
        //const newItems = (items && JSON.parse(items)) || [];
        let lastInspection = await WeldInspectionOffer.findOne(
          { deleted: false, weld_report_qc_no: { $regex: `/${project}/` } }, {}, { sort: { qc_time: -1 } }
        );
        let inspectionNo = "1";
        if (lastInspection && lastInspection.weld_report_qc_no) {
          const split = lastInspection.weld_report_qc_no.split("/");
          const lastInspectionNo = parseInt(split[split.length - 1]);
          inspectionNo = lastInspectionNo + 1;
        }
        const gen_report_no =
          TitleFormat.weldVisualReport.replace("/PROJECT/", `/${project}/`) +
          inspectionNo;

        await WeldInspectionOffer.findByIdAndUpdate(id, {
          qc_status: status,
          qc_time: Date.now(),
          qc_name: qc_name,
          //  items: newItems,
          weld_report_qc_no: gen_report_no,
          status: status === "true" ? 2 : 3,
        }).then((result) => {
          if (result) {
            sendResponse(
              res,
              200,
              true,
              {},
              "Qc details submitted successfully"
            );
          }
        });
      } catch (error) {
        sendResponse(res, 500, false, {}, "Something went wrong" + error);
      }
    } else {
      sendResponse(res, 400, false, {}, "Missing parameter");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

const getWeldVisuals = async (weld_report_no, weld_report_qc_no) => {
  try {
    let matchObj = { deleted: false };
    if (weld_report_no) matchObj = { ...matchObj, weld_report_no: weld_report_no };
    if (weld_report_qc_no) matchObj = { ...matchObj, weld_report_qc_no: weld_report_qc_no };
    
    const requestData = await WeldInspectionOffer.aggregate([
      { $match: matchObj },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "users",
          localField: "offered_by",
          foreignField: "_id",
          as: "offerDetails",
          pipeline: [{ $project: { _id: 0, user_name: "$user_name" } }],
        },
      },
      { $unwind: "$offerDetails" },
      ...(weld_report_qc_no
        ? [
            {
              $lookup: {
                from: "users",
                localField: "qc_name",
                foreignField: "_id",
                as: "qcDetails",
                pipeline: [{ $project: { _id: 0, user_name: "$user_name" } }],
              },
            },
            { $unwind: "$qcDetails" },
          ]
        : []),
      {
        $lookup: {
          from: "erp-fitup-inspections",
          localField: "fitup_id",
          foreignField: "_id",
          as: "fitupDetails",
          pipeline: [
            {
              $lookup: {
                from: "drawing-issue-acceptances",
                localField: "issue_id",
                foreignField: "_id",
                as: "issueDetails",
              },
            },
            {
              $lookup: {
                from: "joint-types",
                localField: "fitupDetails.items.joint_type",
                foreignField: "_id",
                as: "joinDetails",
              },
            },
            { $unwind: { path: "$issueDetails", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$joinDetails", preserveNullAndEmptyArrays: true } },
          ],
        },
      },
      { $unwind: { path: "$fitupDetails", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          matchingItem: {
            $filter: {
              input: "$fitupDetails.issueDetails.items",
              as: "fitupItem",
              cond: { $eq: ["$$fitupItem.transaction_id", "$items.transaction_id"] },
            },
          },
        },
      },
      {
        $lookup: {
          from: "qualified_welder_lists",
          localField: "items.weldor_no",
          foreignField: "_id",
          as: "qualWeldDetails",
          pipeline: [
            {
              $lookup: {
                from: "store-wps-masters",
                localField: "wpsNo",
                foreignField: "_id",
                as: "wpsDetails",
                pipeline: [
                  {
                    $lookup: {
                      from: "joint-types",
                      localField: "jointType",
                      foreignField: "_id",
                      as: "jointDetails",
                    },
                  },
                  { $unwind: { path: "$jointDetails", preserveNullAndEmptyArrays: true } },
                ],
              },
            },
          ],
        },
      },
      {
        $addFields: {
          qualWeldDetails: { $arrayElemAt: ["$qualWeldDetails", 0] },
          wpsDetails: { $arrayElemAt: ["$qualWeldDetails.wpsDetails", 0] },
          jointDetails: { $arrayElemAt: ["$qualWeldDetails.wpsDetails.jointDetails", 0] },
        },
      },
      {
        $addFields: {
          welder_no: "$qualWeldDetails.welderNo",
          wps_no: { $arrayElemAt: ["$qualWeldDetails.wpsDetails.wpsNo", 0] },
          weld_process: { $arrayElemAt: ["$qualWeldDetails.wpsDetails.weldingProcess", 0] },
          joint_type: { $arrayElemAt: ["$qualWeldDetails.wpsDetails.jointDetails.name", 0] },
        },
      },
      {
        $lookup: {
          from: "store_transaction_items",
          localField: "items.transaction_id",
          foreignField: "_id",
          as: "transactionDetails",
          pipeline: [
            {
              $lookup: {
                from: "store-items",
                localField: "itemName",
                foreignField: "_id",
                as: "itemProfile",
              },
            },
            {
              $lookup: {
                from: "erp-planner-drawings",
                localField: "drawingId",
                foreignField: "_id",
                as: "drawingDetails",
                pipeline: [
                  {
                    $lookup: {
                      from: "bussiness-projects",
                      localField: "project",
                      foreignField: "_id",
                      as: "projectDetails",
                      pipeline: [
                        {
                          $lookup: {
                            from: "store-parties",
                            localField: "party",
                            foreignField: "_id",
                            as: "partyDetails",
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      {
        $addFields: {
          transactionDetails: { $arrayElemAt: ["$transactionDetails", 0] },
        },
      },
      {
        $addFields: {
          itemProfile: { $arrayElemAt: ["$transactionDetails.itemProfile", 0] },
          drawingDetails: { $arrayElemAt: ["$transactionDetails.drawingDetails", 0] },
        },
      },
      {
        $addFields: {
          projectDetails: { $arrayElemAt: ["$drawingDetails.projectDetails", 0] },
        },
      },
      {
        $addFields: {
          partyDetails: { $arrayElemAt: ["$projectDetails.partyDetails", 0] },
        },
      },
      {
        $project: {
          _id: 1,
          report_no: weld_report_no ? "$weld_report_no" : "$weld_report_qc_no",
          client: "$partyDetails.name",
          project_name: "$projectDetails.name",
          wo_no: "$projectDetails.work_order_no",
          project_po_no: "$projectDetails.work_order_no",
          offer_name: "$offerDetails.user_name",
          qc_name: "$qcDetails.user_name",
          qc_time: weld_report_no ? "$createdAt" : "$qc_time",
          items: {
            _id: "$items._id",
            drawing_no: "$drawingDetails.drawing_no",
            rev: "$drawingDetails.rev",
            assembly_no: "$drawingDetails.assembly_no",
            grid_no: "$transactionDetails.grid_no",
            item_no: "$transactionDetails.item_no",
            qty: { $arrayElemAt: ["$matchingItem.issued_qty", 0] },
            profile: "$itemProfile.name",
            joint_type: "$joint_type",
            wps_no: "$wps_no",
            weld_process: "$weld_process",
            welder_no: "$welder_no",
            fit_up_no: "$fitupDetails.report_no_two",
            remarks: weld_report_no ? "$items.remarks" : "$items.qc_remarks",
            ...(weld_report_qc_no && {
              accept: {
                $cond: [
                  { $eq: ["$status", 1] },
                  "PEN",
                  {
                    $cond: [
                      { $eq: ["$status", 2] },
                      "ACC",
                      { $cond: [{ $eq: ["$status", 3] }, "REJ", "--"] },
                    ],
                  },
                ],
              },
            }),
          },
        },
      },
      {
        $group: {
          _id: {
            _id: "$_id",
            report_no: "$report_no",
            project_name: "$project_name",
            wo_no: "$wo_no",
            project_po_no: "$project_po_no",
            client: "$client",
            offer_name: "$offer_name",
            qc_name: "$qc_name",
            qc_time: "$qc_time",
          },
          items: { $push: "$items" },
        },
      },
      {
        $project: {
          _id: "$_id._id",
          client: "$_id.client",
          project_name: "$_id.project_name",
          report_no: "$_id.report_no",
          wo_no: "$_id.wo_no",
          project_po_no: "$_id.project_po_no",
          qc_name: "$_id.qc_name",
          offer_name: "$_id.offer_name",
          date: "$_id.qc_time",
          items: 1,
          fitUp: "$fitupDetails"
        },
      },
    ]);

    return requestData.length ? { status: 1, result: requestData } : { status: 0, result: [] };
  } catch (error) {
    return { status: 2, result: error };
  }
};
exports.downloadOneWeldVisule = async (req, res) => {
  const { weld_report_no, weld_report_qc_no, print_date } = req.body;
  // if (req.user && !req.error) {
    try {
      const data = await getWeldVisuals(weld_report_no, weld_report_qc_no)
      let requestData = data.result;

      if (data.status === 1) {
        const template = fs.readFileSync(
          "templates/weldInspectionItem.html",
          "utf-8"
        );
        const renderedHtml = ejs.render(template, {
          requestData,
          logoUrl1: process.env.LOGO_URL_1,
          logoUrl2: process.env.LOGO_URL_2,
        });

        const browser = await puppeteer.launch({
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
          executablePath: PATH,
        });

        const page = await browser.newPage();

        await page.setContent(renderedHtml, {
          baseUrl: `${URI}`,
        });

        const pdfBuffer = await page.pdf({
          width: "18in",
          height: "17in",
          margin: {
            top: "0.5in",
            right: "0.5in",
            bottom: "0.7in",
            left: "0.5in",
          },
          printBackground: true,
          preferCSSPageSize: true,
          displayHeaderFooter: true,
          footerTemplate: `
            <div style="font-size: 14px; width: 100%; text-align: right; padding-right: 50px; padding-bottom: 30px;">
              ${print_date ? `<span>${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>` : ''}
              ${print_date ? '&nbsp;&nbsp;&nbsp;' : ''}
              Page <span class="pageNumber"></span> of <span class="totalPages"></span>
            </div>
          `,
          headerTemplate: `<div></div>`,
          compress: true,
        });

        await browser.close();

        const pdfsDir = path.join(__dirname, "../../../pdfs");
        if (!fs.existsSync(pdfsDir)) {
          fs.mkdirSync(pdfsDir);
        }

        let lastInspection = ""

        if (requestData && requestData.length) {
          const split = requestData[0].report_no.split("/");
          lastInspection = split[split.length - 2];
        }

        let x = ""
        if (lastInspection === "OFFER") {
          x = "offer"
        } else {
          x = "inspection"
        }

        const filename = `weld_${x}_${Date.now()}.pdf`;
        const filePath = path.join(__dirname, "../../../pdfs", filename);

        fs.writeFileSync(filePath, pdfBuffer);

        const fileUrl = `${URI}/pdfs/${filename}`;

        sendResponse(
          res,
          200,
          true,
          { file: fileUrl },
          "PDF downloaded Successfully"
        );
      }
      else if (data.status === 0) {
        sendResponse(res, 200, false, {}, `Weld data not found`)
      }
      else if (data.status === 2) {
        sendResponse(res, 500, false, {}, "Something went wrong");
      }
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  // } else {
  //   sendResponse(res, 401, false, {}, "Unauthorized");
  // }
};

exports.xlsxOneWeldVisule = async (req, res) => {
  const { weld_report_no, weld_report_qc_no, print_date } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await getWeldVisuals(weld_report_no, weld_report_qc_no)
      let requestData = data.result;

      if (data.status === 1) {
        if (requestData[0].items.some(detail => detail.accept)) {
          const wb = XLSX.utils.book_new();
          let ws

          const headerStyle = {
            font: { bold: true }, fill: { fgColor: { rgb: "fdc686" } }, alignment: { horizontal: 'center', vertical: 'middle' }
          };

          const headerStyle1 = {
            font: { size: 2, bold: false }, alignment: { horizontal: 'left', vertical: 'middle' },
          };

          const headerStyle2 = {
            font: { size: 16, bold: true }, fill: { fgColor: { rgb: 'fdc686' } }, alignment: { horizontal: 'center', vertical: 'middle' },
          };

          const headerStyle3 = {
            font: { bold: true }, alignment: { horizontal: 'left', vertical: 'middle' },
          };

          const headerStyle4 = {
            font: { bold: true }, alignment: { horizontal: 'center', vertical: 'middle' },
          };

          const headerStyle5 = {
            font: { bold: false }, alignment: { horizontal: 'center', vertical: 'middle' },
          };

          // *** Do not remove space ***
          const ws_data = [
            [
              {
                v: `VISHAL ENTERPRISE & VRISHAL ENGINEERING PRIVATE LIMITED GROUP OF COMPANIES`, s: headerStyle2
              },
            ],
            [
              { v: `WELD VISUAL INSPECTION REPORT (STRUCTURE)`, s: headerStyle4 },
              "", "", "", "", "", "", "",
              print_date ? { v: `Download Date : ${new Date().toLocaleDateString()}`, s: headerStyle4 } : "",
            ],
            [
              { v: `Client                           : ${requestData[0].client}`, s: headerStyle1 },
              "", "", "", "", "", "", "",
              { v: `Project                                : ${requestData[0].project_name}`, s: headerStyle1 },
            ],
            [
              { v: `Report No.                  : ${requestData[0].report_no}`, s: headerStyle1 },
              "", "", "", "", "", "", "",
              { v: `WO PO No.                        : ${requestData[0].wo_no}`, s: headerStyle1 },
            ],
          ];

          const headers = [
            { v: "Sr No.", s: headerStyle },
            { v: "Draw. No.", s: headerStyle },
            { v: "Rev No.", s: headerStyle },
            { v: "ASS. No.", s: headerStyle },
            { v: "Grid No.", s: headerStyle },
            { v: "Item No.", s: headerStyle },
            { v: "Qty.", s: headerStyle },
            { v: "Profile", s: headerStyle },
            { v: "Type Of Weld", s: headerStyle },
            { v: "Wps No.", s: headerStyle },
            { v: "Weld Process", s: headerStyle },
            { v: "Welder No.", s: headerStyle },
            { v: "Fit-up report No.", s: headerStyle },
            { v: "Acc/Rej.", s: headerStyle },
            { v: "Remarks", s: headerStyle },
          ];

          ws_data.push(headers);

          requestData[0].items.forEach((detail, itemIndex) => {
            const row = [
              itemIndex + 1,
              detail.drawing_no || '--',
              detail.rev || '--',
              detail.assembly_no || '--',
              detail.grid_no || '--',
              detail.item_no || '--',
              detail.qty || '--',
              detail.profile || '--',
              detail.joint_type || '--',
              detail.wps_no || '--',
              detail.weld_process || '--',
              detail.welder_no || '--',
              detail.fit_up_no || '--',
              detail.accept || '--',
              detail.remarks || '--',
            ];

            ws_data.push(row);
          });
          ws_data.push([]);
          ws_data.push(
            [
              { v: `QC CHECK SHEET `, s: headerStyle4 },
              "",
              { v: `CHECKED ✔ ✘ NOT APPLICABLE`, s: headerStyle4 },
            ],
            [
              { v: `DOCUMENT VERIFICATION`, s: headerStyle4 },
              "",
              { v: `MARKING VERIFICATION CHECK `, s: headerStyle4 },
              "",
              { v: `WELD SURFACE DEFECT CHECK`, s: headerStyle4 },
              "", "", "", "", "", "", "",
              { v: `VISUAL CHECK`, s: headerStyle4 },
            ],
            [
              { v: `☐ APPROVED NDT DRG./TESTPLAN WITH LATEST REV.`, s: headerStyle1 },
              "",
              { v: `☐ JOINT NO.`, s: headerStyle1 },
              "",
              { v: `☐ SPATTER`, s: headerStyle1 },
              { v: `☐ REINFORCEMENT`, s: headerStyle1 },
              "",
              { v: `☐ POROSITY/PIN HOLES`, s: headerStyle1 },
              "",
              { v: `☐ SLAG`, s: headerStyle1 },
              { v: `☐ CRACK`, s: headerStyle1 },
              "",
              { v: `☐ ARC STRIKE`, s: headerStyle1 },
              { v: `☐ DISTORTION`, s: headerStyle1 },
            ],
            [
              { v: `☐ QUALIFIED WELDER LIST`, s: headerStyle1 },
              "",
              { v: `☐ WELDER NO.`, s: headerStyle1 },
              "",
              { v: `☐ UNDER CUT`, s: headerStyle1 },
              { v: `☐ LUMPS/HIGH SPOT`, s: headerStyle1 },
              "",
              { v: `☐ BEAD APEARANCE/WEAVING`, s: headerStyle1 },
              "",
              { v: `☐ WELD SIZE`, s: headerStyle1 },
              { v: `☐ BUNDER FILL`, s: headerStyle1 },
              "",
              { v: `☐ CLEAT MARK`, s: headerStyle1 },
              { v: `☐ CORNER SEALING/ROUNDING`, s: headerStyle1 },
            ],
            [
              { v: `☐ APPROVED WPS`, s: headerStyle1 },
              "", "", "", "", "", "", "", "", "", "", "",
              { v: `☐ PHYSICAL CONDITION`, s: headerStyle1 },
            ],
            [
              "", "",
              {
                v: `VE-QC`, s: headerStyle4
              },
              "", "", "", "", "", "",
              {
                v: `CLIENT-QC / TPI`, s: headerStyle4
              },
            ],
            [
              { v: `Signature`, s: headerStyle3 },
            ],
            [
              { v: `Name`, s: headerStyle3 },
              "",
              {
                v: `${requestData[0].qc_name}`, s: headerStyle5
              },
            ],
            [
              { v: `Date`, s: headerStyle3 },
              "",
              {
                v: `${requestData[0].date ? new Date(requestData[0].date).toLocaleDateString() : ''}`, s: headerStyle5
              },
            ],
            [
              { v: `VE-STR-28`, s: headerStyle1 },
            ]
          );

          const colWidths = ws_data[4].map((_, colIndex) => ({
            wch: Math.max(
              ...ws_data.slice(4, 4 + requestData[0].items.length + 1).map(row => (
                row[colIndex]?.toString().length || 0
              ))
            ),
          }));

          ws = XLSX.utils.aoa_to_sheet(ws_data);
          ws['!cols'] = colWidths;

          ws['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 14 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
            { s: { r: 1, c: 8 }, e: { r: 1, c: 14 } },
            { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } },
            { s: { r: 2, c: 8 }, e: { r: 2, c: 14 } },
            { s: { r: 3, c: 0 }, e: { r: 3, c: 7 } },
            { s: { r: 3, c: 8 }, e: { r: 3, c: 14 } },
            { s: { r: ws_data.length - 10, c: 0 }, e: { r: ws_data.length - 10, c: 1 } },
            { s: { r: ws_data.length - 10, c: 2 }, e: { r: ws_data.length - 10, c: 14 } },
            { s: { r: ws_data.length - 9, c: 0 }, e: { r: ws_data.length - 9, c: 1 } },
            { s: { r: ws_data.length - 9, c: 2 }, e: { r: ws_data.length - 9, c: 3 } },
            { s: { r: ws_data.length - 9, c: 4 }, e: { r: ws_data.length - 9, c: 11 } },
            { s: { r: ws_data.length - 9, c: 12 }, e: { r: ws_data.length - 9, c: 14 } },
            { s: { r: ws_data.length - 8, c: 0 }, e: { r: ws_data.length - 8, c: 1 } },
            { s: { r: ws_data.length - 8, c: 2 }, e: { r: ws_data.length - 8, c: 3 } },
            { s: { r: ws_data.length - 8, c: 5 }, e: { r: ws_data.length - 8, c: 6 } },
            { s: { r: ws_data.length - 8, c: 7 }, e: { r: ws_data.length - 8, c: 8 } },
            { s: { r: ws_data.length - 8, c: 10 }, e: { r: ws_data.length - 8, c: 11 } },
            { s: { r: ws_data.length - 8, c: 13 }, e: { r: ws_data.length - 8, c: 14 } },
            { s: { r: ws_data.length - 7, c: 0 }, e: { r: ws_data.length - 7, c: 1 } },
            { s: { r: ws_data.length - 7, c: 2 }, e: { r: ws_data.length - 7, c: 3 } },
            { s: { r: ws_data.length - 7, c: 5 }, e: { r: ws_data.length - 7, c: 6 } },
            { s: { r: ws_data.length - 7, c: 7 }, e: { r: ws_data.length - 7, c: 8 } },
            { s: { r: ws_data.length - 7, c: 10 }, e: { r: ws_data.length - 7, c: 11 } },
            { s: { r: ws_data.length - 7, c: 13 }, e: { r: ws_data.length - 7, c: 14 } },
            { s: { r: ws_data.length - 6, c: 0 }, e: { r: ws_data.length - 6, c: 1 } },
            { s: { r: ws_data.length - 6, c: 2 }, e: { r: ws_data.length - 6, c: 3 } },
            { s: { r: ws_data.length - 6, c: 5 }, e: { r: ws_data.length - 6, c: 6 } },
            { s: { r: ws_data.length - 6, c: 7 }, e: { r: ws_data.length - 6, c: 8 } },
            { s: { r: ws_data.length - 6, c: 10 }, e: { r: ws_data.length - 6, c: 11 } },
            { s: { r: ws_data.length - 6, c: 13 }, e: { r: ws_data.length - 6, c: 14 } },
            { s: { r: ws_data.length - 5, c: 0 }, e: { r: ws_data.length - 5, c: 1 } },
            { s: { r: ws_data.length - 5, c: 2 }, e: { r: ws_data.length - 5, c: 8 } },
            { s: { r: ws_data.length - 5, c: 9 }, e: { r: ws_data.length - 5, c: 14 } },
            { s: { r: ws_data.length - 4, c: 0 }, e: { r: ws_data.length - 4, c: 1 } },
            { s: { r: ws_data.length - 4, c: 2 }, e: { r: ws_data.length - 4, c: 8 } },
            { s: { r: ws_data.length - 4, c: 9 }, e: { r: ws_data.length - 4, c: 14 } },
            { s: { r: ws_data.length - 3, c: 0 }, e: { r: ws_data.length - 3, c: 1 } },
            { s: { r: ws_data.length - 3, c: 2 }, e: { r: ws_data.length - 3, c: 8 } },
            { s: { r: ws_data.length - 3, c: 9 }, e: { r: ws_data.length - 3, c: 14 } },
            { s: { r: ws_data.length - 2, c: 0 }, e: { r: ws_data.length - 2, c: 1 } },
            { s: { r: ws_data.length - 2, c: 2 }, e: { r: ws_data.length - 2, c: 8 } },
            { s: { r: ws_data.length - 2, c: 9 }, e: { r: ws_data.length - 2, c: 14 } },
            { s: { r: ws_data.length - 1, c: 0 }, e: { r: ws_data.length - 1, c: 14 } },
          ];

          XLSX.utils.book_append_sheet(wb, ws, `Weld inspection`);

          const xlsxPath = path.join(__dirname, '../../../xlsx');

          if (!fs.existsSync(xlsxPath)) {
            fs.mkdirSync(xlsxPath, { recursive: true });
          }

          const filename = `Weld_inspection_${Date.now()}.xlsx`;
          const filePath = path.join(xlsxPath, filename);

          await XLSXStyle.writeFile(wb, filePath);

          const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
          const fileUrl = `${protocol}://${req.get('host')}/xlsx/${filename}`;

          sendResponse(res, 200, true, { file: fileUrl }, `XLSX file generated successfully`)

        } else {
          const wb = XLSX.utils.book_new();
          let ws

          const headerStyle = {
            font: { bold: true }, fill: { fgColor: { rgb: "fdc686" } }, alignment: { horizontal: 'center', vertical: 'middle' }
          };

          const headerStyle1 = {
            font: { size: 2, bold: false }, alignment: { horizontal: 'left', vertical: 'middle' },
          };

          const headerStyle2 = {
            font: { size: 16, bold: true }, fill: { fgColor: { rgb: 'fdc686' } }, alignment: { horizontal: 'center', vertical: 'middle' },
          };

          const headerStyle3 = {
            font: { bold: true }, alignment: { horizontal: 'left', vertical: 'middle' },
          };

          const headerStyle4 = {
            font: { bold: true }, alignment: { horizontal: 'center', vertical: 'middle' },
          };

          const headerStyle5 = {
            font: { bold: false }, alignment: { horizontal: 'center', vertical: 'middle' },
          };

          // *** Do not remove space ***
          const ws_data = [
            [
              {
                v: `VISHAL ENTERPRISE & VRISHAL ENGINEERING PRIVATE LIMITED GROUP OF COMPANIES`, s: headerStyle2
              },
            ],
            [
              { v: `WELD VISUAL INSPECTION OFFER`, s: headerStyle4 },
              "", "", "", "", "", "", "",
              print_date ? { v: `Download Date : ${new Date().toLocaleDateString()}`, s: headerStyle4 } : "",
            ],
            [
              { v: `Client                           : ${requestData[0].client}`, s: headerStyle1 },
              "", "", "", "", "", "", "",
              { v: `Project                                : ${requestData[0].project_name}`, s: headerStyle1 },
            ],
            [
              { v: `Report No.                  : ${requestData[0].report_no}`, s: headerStyle1 },
              "", "", "", "", "", "", "",
              { v: `WO PO No.                        : ${requestData[0].wo_no}`, s: headerStyle1 },
            ],
          ];

          const headers = [
            { v: "Sr No.", s: headerStyle },
            { v: "Draw. No.", s: headerStyle },
            { v: "Rev No.", s: headerStyle },
            { v: "ASS. No.", s: headerStyle },
            { v: "Grid No.", s: headerStyle },
            { v: "Item No.", s: headerStyle },
            { v: "Qty.", s: headerStyle },
            { v: "Profile", s: headerStyle },
            { v: "Type Of Weld", s: headerStyle },
            { v: "Wps No.", s: headerStyle },
            { v: "Weld Process", s: headerStyle },
            { v: "Welder No.", s: headerStyle },
            { v: "Fit-up report No.", s: headerStyle },
            { v: "Remarks", s: headerStyle },
          ];

          ws_data.push(headers);

          requestData[0].items.forEach((detail, itemIndex) => {
            const row = [
              itemIndex + 1,
              detail.drawing_no || '--',
              detail.rev || '--',
              detail.assembly_no || '--',
              detail.grid_no || '--',
              detail.item_no || '--',
              detail.qty || '--',
              detail.profile || '--',
              detail.joint_type || '--',
              detail.wps_no || '--',
              detail.weld_process || '--',
              detail.welder_no || '--',
              detail.fit_up_no || '--',
              detail.remarks || '--',
            ];

            ws_data.push(row);
          });
          ws_data.push([]);
          ws_data.push(
            [
              "", "",
              {
                v: `Offered By`, s: headerStyle4
              },
            ],
            [
              { v: `Signature`, s: headerStyle3 },
            ],
            [
              { v: `Name`, s: headerStyle3 },
              "",
              {
                v: `${requestData[0].offer_name}`, s: headerStyle5
              },
            ],
            [
              { v: `Date`, s: headerStyle3 },
              "",
              {
                v: `${requestData[0].date ? new Date(requestData[0].date).toLocaleDateString() : ''}`, s: headerStyle5
              },
            ],
            [
              { v: `VE-STR-28A`, s: headerStyle1 },
            ]
          );

          const colWidths = ws_data[4].map((_, colIndex) => ({
            wch: Math.max(
              ...ws_data.slice(4, 4 + requestData[0].items.length + 1).map(row => (
                row[colIndex]?.toString().length || 0
              ))
            ),
          }));

          ws = XLSX.utils.aoa_to_sheet(ws_data);
          ws['!cols'] = colWidths;

          ws['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 13 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
            { s: { r: 1, c: 7 }, e: { r: 1, c: 13 } },
            { s: { r: 2, c: 0 }, e: { r: 2, c: 6 } },
            { s: { r: 2, c: 7 }, e: { r: 2, c: 13 } },
            { s: { r: 3, c: 0 }, e: { r: 3, c: 6 } },
            { s: { r: 3, c: 7 }, e: { r: 3, c: 13 } },
            { s: { r: ws_data.length - 5, c: 0 }, e: { r: ws_data.length - 5, c: 1 } },
            { s: { r: ws_data.length - 5, c: 2 }, e: { r: ws_data.length - 5, c: 13 } },
            { s: { r: ws_data.length - 4, c: 0 }, e: { r: ws_data.length - 4, c: 1 } },
            { s: { r: ws_data.length - 4, c: 2 }, e: { r: ws_data.length - 4, c: 13 } },
            { s: { r: ws_data.length - 3, c: 0 }, e: { r: ws_data.length - 3, c: 1 } },
            { s: { r: ws_data.length - 3, c: 2 }, e: { r: ws_data.length - 3, c: 13 } },
            { s: { r: ws_data.length - 2, c: 0 }, e: { r: ws_data.length - 2, c: 1 } },
            { s: { r: ws_data.length - 2, c: 2 }, e: { r: ws_data.length - 2, c: 13 } },
            { s: { r: ws_data.length - 1, c: 0 }, e: { r: ws_data.length - 1, c: 13 } },
          ];

          XLSX.utils.book_append_sheet(wb, ws, `Weld offer`);

          const xlsxPath = path.join(__dirname, '../../../xlsx');

          if (!fs.existsSync(xlsxPath)) {
            fs.mkdirSync(xlsxPath, { recursive: true });
          }

          const filename = `Weld_offer_${Date.now()}.xlsx`;
          const filePath = path.join(xlsxPath, filename);

          await XLSXStyle.writeFile(wb, filePath);

          const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
          const fileUrl = `${protocol}://${req.get('host')}/xlsx/${filename}`;

          sendResponse(res, 200, true, { file: fileUrl }, `XLSX file generated successfully`)
        }
      }
      else if (data.status === 0) {
        sendResponse(res, 200, false, {}, `Weld detail not found`)
      }
      else if (data.status === 2) {
        sendResponse(res, 500, false, {}, "Something went wrong111");
      }
    } catch (error) {
      console.log("error", error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.downMultiWeldVisualOffers = async (req, res) => {
  const { reports, print_date,} = req.body;
  if (!reports) {
    return sendResponse(res, 400, false, {}, "Invalid or missing reports array");
  }
  try {
      let results = [];
      for (const { weld_report_no } of JSON.parse(reports)) {
          let data = await getWeldVisuals(weld_report_no,null);
          results.push(data);
      }
    
      const filteredResults = results.filter(elem => elem.status === 1);
      
      if (filteredResults.length === 0) {
          return sendResponse(res, 200, false, {}, `Fit up data not found`);
      }

      const aggregatedItems = [];
      let headerInfo = {
          client: '',
          project_name: '',
          report_no: '',
          wo_no: '',
          project_po_no: '',
          date: ''
      };
      
      const uniqueClients = new Set();
      const uniqueProjects = new Set();
      const uniqueReportNos = new Set();
      const uniqueWoNos = new Set();
      const uniqueProjectPoNos = new Set();
      const datesSet = new Set();

      filteredResults.forEach(elem => {
          const result = elem.result[0]; 
          uniqueClients.add(result.client);
          uniqueProjects.add(result.project_name);
          uniqueReportNos.add(result.report_no);
          uniqueWoNos.add(result.wo_no);
          uniqueProjectPoNos.add(result.project_po_no);
          
          if (result.date) {
              datesSet.add(new Date(result.date).toLocaleDateString());
          }

          const itemsWithReportNo = result.items.map(item => ({
            ...item,          
            report_no: result.report_no,
            date: moment(new Date(result.date)).format('DD/MM/YYYY')
        }));
    
        aggregatedItems.push(...itemsWithReportNo); // Push items with new field
      });

 
      const paginatedItems = aggregatedItems;
      headerInfo.client = Array.from(uniqueClients).join(', ') || '--';
      headerInfo.project_name = Array.from(uniqueProjects).join(', ') || '--';
      headerInfo.report_no = Array.from(uniqueReportNos).join(', ') || '--';
      headerInfo.wo_no = Array.from(uniqueWoNos).join(', ') || '--';
      headerInfo.project_po_no = Array.from(uniqueProjectPoNos).join(', ') || '--';
      headerInfo.date = Array.from(datesSet).join(', ') || '--';

      const template = fs.readFileSync("templates/multiWeldVisualOffers.html", "utf-8");
      const renderHtml = ejs.render(template, {
          headerInfo,
          logoUrl1: process.env.LOGO_URL_1,
          logoUrl2: process.env.LOGO_URL_2,
          items: paginatedItems, 
      });
      const browser = await puppeteer.launch({
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
          executablePath: PATH,
      });
      
      const page = await browser.newPage();
      await page.setContent(renderHtml, { baseUrl: `${URI}` });
      const pageHeight = await page.evaluate(() => {
        return document.body.scrollHeight;
      });

      
      const pdfBuffer = await page.pdf({
        height: pageHeight,
        landscape: true,
        margin: {
          top: "0.5in",
          right: "0.2in",
          bottom: "0.5in",
          left: "0.2in",
        },
        format: 'A4',
        scale: 1,
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: true,
        footerTemplate: `
          <div style="font-size: 14px; width: 100%; text-align: right; padding-right: 50px; padding-bottom: 30px;">
            ${print_date ? `<span>${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>` : ''}
            ${print_date ? '&nbsp;&nbsp;&nbsp;' : ''}
            Page <span class="pageNumber"></span> of <span class="totalPages"></span>
          </div>
        `,
        headerTemplate: `<div></div>`,
        compress: true,
      });

      await browser.close();

      // Save PDF
      const pdfsDir = path.join(__dirname, "../../../pdfs");
      if (!fs.existsSync(pdfsDir)) {
          fs.mkdirSync(pdfsDir);
      }
      
      const filename = `Weld-inspection-offers${Date.now()}.pdf`;
      const filePath = path.join(__dirname, "../../../pdfs", filename);
      fs.writeFileSync(filePath, pdfBuffer);

      const fileUrl = `${URI}/pdfs/${filename}`;
      
      return sendResponse(res, 200, true, {file: fileUrl}, 'PDF downloaded successfully')
  } catch(err) {
    console.error(err);
    return sendResponse(res, 500, false, {}, "Internal Server Error");
  }

};

exports.downMultiWeldVisualInspections = async (req, res) => {
  const { reports, print_date,} = req.body;
  if (!reports) {
    return sendResponse(res, 400, false, {}, "Invalid or missing reports array");
  }

  try {
      
      let results = [];
      for (const { weld_report_qc_no } of JSON.parse(reports)) {
          let data = await getWeldVisuals(null,weld_report_qc_no);
          results.push(data);
      }
    
      const filteredResults = results.filter(elem => elem.status === 1);
      
      if (filteredResults.length === 0) {
          return sendResponse(res, 200, false, {}, `Fit up data not found`);
      }

      const aggregatedItems = [];
      let headerInfo = {
          client: '',
          project_name: '',
          report_no: '',
          wo_no: '',
          project_po_no: '',
          date: ''
      };
      
      const uniqueClients = new Set();
      const uniqueProjects = new Set();
      const uniqueReportNos = new Set();
      const uniqueWoNos = new Set();
      const uniqueProjectPoNos = new Set();
      const datesSet = new Set();

      filteredResults.forEach(elem => {
          const result = elem.result[0]; 
          uniqueClients.add(result.client);
          uniqueProjects.add(result.project_name);
          uniqueReportNos.add(result.report_no);
          uniqueWoNos.add(result.wo_no);
          uniqueProjectPoNos.add(result.project_po_no);
          
          if (result.date) {
              datesSet.add(new Date(result.date).toLocaleDateString());
          }

          const itemsWithReportNo = result.items.map(item => ({
            ...item,          
            report_no: result.report_no,
            date: moment(new Date(result.date)).format('DD/MM/YYYY')
        }));
    
        aggregatedItems.push(...itemsWithReportNo); // Push items with new field
      });

 
      const paginatedItems = aggregatedItems;
      headerInfo.client = Array.from(uniqueClients).join(', ') || '--';
      headerInfo.project_name = Array.from(uniqueProjects).join(', ') || '--';
      headerInfo.report_no = Array.from(uniqueReportNos).join(', ') || '--';
      headerInfo.wo_no = Array.from(uniqueWoNos).join(', ') || '--';
      headerInfo.project_po_no = Array.from(uniqueProjectPoNos).join(', ') || '--';
      headerInfo.date = Array.from(datesSet).join(', ') || '--';

      const template = fs.readFileSync("templates/multiWeldVisualInspects.html", "utf-8");
      const renderHtml = ejs.render(template, {
          headerInfo,
          logoUrl1: process.env.LOGO_URL_1,
          logoUrl2: process.env.LOGO_URL_2,
          items: paginatedItems, 
      });
      const browser = await puppeteer.launch({
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
          executablePath: PATH,
      });
      
      const page = await browser.newPage();
      await page.setContent(renderHtml, { baseUrl: `${URI}` });
      const pageHeight = await page.evaluate(() => {
        return document.body.scrollHeight;
      });

      
      const pdfBuffer = await page.pdf({
        height: pageHeight,
        landscape: true,
        margin: {
          top: "0.5in",
          right: "0.2in",
          bottom: "0.5in",
          left: "0.2in",
        },
        format: 'A4',
        scale: 1,
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: true,
        footerTemplate: `
          <div style="font-size: 14px; width: 100%; text-align: right; padding-right: 50px; padding-bottom: 20px;">
            ${print_date ? `<span>${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>` : ''}
            ${print_date ? '&nbsp;&nbsp;&nbsp;' : ''}
            Page <span class="pageNumber"></span> of <span class="totalPages"></span>
          </div>
        `,
        headerTemplate: `<div></div>`,
        compress: true,
      });

      await browser.close();

      // Save PDF
      const pdfsDir = path.join(__dirname, "../../../pdfs");
      if (!fs.existsSync(pdfsDir)) {
          fs.mkdirSync(pdfsDir);
      }
      
      const filename = `fitup_Inspection_${Date.now()}.pdf`;
      const filePath = path.join(__dirname, "../../../pdfs", filename);
      fs.writeFileSync(filePath, pdfBuffer);

      const fileUrl = `${URI}/pdfs/${filename}`;
      
      return sendResponse(res, 200, true, {file: fileUrl}, 'PDF downloaded successfully')
  } catch(err) {
    console.error(err);
    return sendResponse(res, 500, false, {}, "Internal Server Error");
  }
};

