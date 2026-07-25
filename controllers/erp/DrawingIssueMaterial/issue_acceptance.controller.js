const IssueAcceptance = require("../../../models/erp/DrawingIssueMaterial/issue_acceptance.model");
const { sendResponse } = require("../../../helper/response");
const issue_requestModel = require("../../../models/erp/DrawingIssueMaterial/issue_request.model");
const { Status, TitleFormat } = require("../../../utils/enum");
const ejs = require("ejs");
const fs = require("fs");
const XLSX = require('xlsx');  // for utility functions
const XLSXStyle = require('xlsx-style');  // for styling
const puppeteer = require("puppeteer");
const path = require("path");
const purchase_offerModel = require("../../../models/store/purchase_offer.model");
const transaction_itemModel = require("../../../models/store/transaction_item.model");
const { generatePDF } = require("../../../utils/pdfUtils");
const URI = process.env.PDF_URL;
const PATH = process.env.PDF_PATH;

exports.manageIssueAcceptance = async (req, res) => {
  const { id, issue_req_id, items, issued_by, status, project, drawing_id } =
    req.body;

  if (req.user && !req.error) {
    try {
      let lastaccepted = await IssueAcceptance.findOne(
        { deleted: false, issue_accept_no: { $regex: `/${project}/` } }, {}, { sort: { createdAt: -1 } }
      );

      let issue_acc_No = "1";
      if (lastaccepted && lastaccepted.issue_accept_no) {
        const split = lastaccepted.issue_accept_no.split("/");
        const lastacceptedNo = parseInt(split[split.length - 1]);
        issue_acc_No = lastacceptedNo + 1;
      }
      const gen_issue_acc_No =
        TitleFormat.issueAcceptNo.replace("/PROJECT/", `/${project}/`) +
        issue_acc_No;
      const newItems = JSON.parse(items) || [];

      if (!id) {
        if (!issue_req_id) {
          return sendResponse(res, 404, false, {}, "Missing parameter");
        }
        const object = new IssueAcceptance({
          issue_accept_no: gen_issue_acc_No,
          issue_req_id: issue_req_id,
          items: newItems,
          status: Status.Completed,
          issued_by: issued_by,
          drawing_id,
        });

        const issueRequest = await issue_requestModel
          .findOne({ _id: issue_req_id })
          .populate({
            path: "items.transaction_id",
            select: "itemName quantity",
            populate: {
              path: "itemName",
              select: "name",
            },
          });

        const transactionIds = newItems.map((item) => item.transaction_id);
        const transactedItems = await transaction_itemModel
          .find({
            _id: { $in: transactionIds },
          })
          .select("itemName");

        let bulkUpdates = [];

        for (let elem of newItems) {
          const possibleImirNos = await purchase_offerModel.findOne({
            imir_no: elem.imir_no,
          });

          const transactedItem = transactedItems.find(
            (item) => item._id.toString() === elem.transaction_id.toString()
          );

          if (transactedItem) {
            const itemName = transactedItem.itemName;

            for (const i of possibleImirNos.items) {
              const itemDetails = await transaction_itemModel.findOne({
                _id: i.transactionId,
              });

              if (
                itemDetails &&
                itemDetails.itemName.toString() === itemName.toString()
              ) {
                if (i.balance_qty >= elem.issued_qty) {
                  i.balance_qty -= elem.issued_qty;
                  bulkUpdates.push({
                    updateOne: {
                      filter: {
                        _id: possibleImirNos._id,
                        "items.transactionId": i.transactionId,
                      },
                      update: {
                        $set: { "items.$.balance_qty": i.balance_qty },
                      },
                    },
                  });
                }
              }
            }
          }
        }

        if (bulkUpdates.length > 0) {
          await purchase_offerModel.bulkWrite(bulkUpdates);
        }

        await object
          .save()
          .then(async (result) => {
            issueRequest.status = result.status === 4 && Status.Completed;
            await issueRequest.save();
            sendResponse(
              res,
              200,
              true,
              {},
              "Material issue acceptance added successfully"
            );
          })
          .catch((err) => {
            console.log(err.message);
            sendResponse(
              res,
              500,
              false,
              {},
              "Something went wrong while saving"
            );
          });
      } else {
        await IssueAcceptance.findByIdAndUpdate(id, {
          items: newItems,
          status: status,
          issued_by: issued_by,
        })
          .then(() => {
            sendResponse(
              res,
              200,
              true,
              {},
              "Material issue acceptance updated successfully"
            );
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
      sendResponse(res, 500, false, {}, "Something went wrong");
      console.log("err", err);
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.getIssueAcceptance = async (req, res) => {
  const { id, project } = req.body;
  if (req.user && !req.error) {
    try {
      let query = { deleted: false };
      if (id) {
        query._id = id;
      }
      let result = await IssueAcceptance.find(query, { deleted: 0 })
        .populate("issued_by", "user_name")
        .populate("drawing_id", "project")
        .populate({
          path: "issue_req_id",
          select:
            "issue_req_no items requested_length requested_width requested_qty remarks requested_by",
          populate: [
            {
              path: "items.transaction_id",
              select:
                "itemName quantity item_no item_length item_width item_weight assembly_weight assembly_surface_area grid_no drawingId",
              populate: [
                { path: "itemName", select: "name" },
                {
                  path: "drawingId",
                  select:
                    "project master_updation_date drawing_no draw_receive_date unit sheet_no rev assembly_no assembly_quantity drawing_pdf drawing_pdf_name status issued_date issued_person",
                  populate: [
                    { path: "issued_person", select: "name" },
                    {
                      path: "project",
                      select: "name party work_order_no",
                      populate: {
                        path: "party",
                        select: "name",
                      },
                    },
                  ],
                },
              ],
            },
            { path: "requested_by", select: "user_name" },
          ],
        })
        .populate({
          path: "items.transaction_id",
          select: "drawingId itemName grid_no item_no",
          populate: [{ path: "itemName", select: "name" }],
        })
        .sort({ createdAt: -1 });

      if (project) {
        result = result.filter(
          (reqData) => reqData?.drawing_id?.project?.toString() === project
        );
      }

      if (result) {
        sendResponse(res, 200, true, result, "Material acceptance  list");
      } else {
        sendResponse(res, 200, true, {}, "Material acceptance not found");
      }
    } catch (err) {
      sendResponse(res, 500, false, {}, "Something went wrong" + err);
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

const getIssueAcceptance = async (issue_accept_no) => {
  try {
    const requestData = await IssueAcceptance.aggregate([
      { $match: { deleted: false, issue_accept_no: issue_accept_no } },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "users",
          localField: "issued_by",
          foreignField: "_id",
          as: "issueDetails",
          pipeline: [{ $project: { _id: 0, user_name: "$user_name" } }],
        },
      },
      { $unwind: "$issueDetails" },
      {
        $lookup: {
          from: "drawing-issue_requests",
          localField: "issue_req_id",
          foreignField: "_id",
          as: "issueRequestDetails",
        },
      },
      {
        $unwind: {
          path: "$issueRequestDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          matchingItem: {
            $filter: {
              input: "$issueRequestDetails.items",
              as: "issueItem",
              cond: {
                $eq: ["$$issueItem.transaction_id", "$items.transaction_id"],
              },
            },
          },
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
                      from: "contractors",
                      localField: "issued_person",
                      foreignField: "_id",
                      as: "contractorDetails",
                    },
                  },
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
          "transactionDetails.itemProfile": {
            $arrayElemAt: ["$transactionDetails.itemProfile", 0],
          },
          "transactionDetails.drawingDetails": {
            $arrayElemAt: ["$transactionDetails.drawingDetails", 0],
          },
        },
      },
      {
        $addFields: {
          "transactionDetails.drawingDetails.contractorDetails": {
            $arrayElemAt: [
              "$transactionDetails.drawingDetails.contractorDetails",
              0,
            ],
          },
          "transactionDetails.drawingDetails.projectDetails": {
            $arrayElemAt: [
              "$transactionDetails.drawingDetails.projectDetails",
              0,
            ],
          },
        },
      },
      {
        $addFields: {
          "transactionDetails.drawingDetails.projectDetails.partyDetails": {
            $arrayElemAt: [
              "$transactionDetails.drawingDetails.projectDetails.partyDetails",
              0,
            ],
          },
        },
      },
      {
        $project: {
          _id: 1,
          miv_no: "$issue_accept_no",
          client:
            "$transactionDetails.drawingDetails.projectDetails.partyDetails.name",
          project_name:
            "$transactionDetails.drawingDetails.projectDetails.name",
          contractor_name:
            "$transactionDetails.drawingDetails.contractorDetails.name",
          issued_date: "$transactionDetails.drawingDetails.issued_date",
          issue_name: "$issueDetails.user_name",
          createdAt: "$createdAt",
          items: {
            _id: "$items._id",
            drawing_no: "$transactionDetails.drawingDetails.drawing_no",
            rev: "$transactionDetails.drawingDetails.rev",
            sheet_no: "$transactionDetails.drawingDetails.sheet_no",
            assembly_no: "$transactionDetails.drawingDetails.assembly_no",
            grid_no: "$transactionDetails.grid_no",
            item_no: "$transactionDetails.item_no",
            profile: "$transactionDetails.itemProfile.name",
            requested_length: {
              $arrayElemAt: ["$matchingItem.requested_length", 0],
            },
            requested_width: {
              $arrayElemAt: ["$matchingItem.requested_width", 0],
            },
            requested_qty: {
              $arrayElemAt: ["$matchingItem.requested_qty", 0],
            },
            issued_length: "$items.issued_length",
            issued_width: "$items.issued_width",
            issued_qty: "$items.issued_qty",
            imir_no: "$items.imir_no",
            heat_no: "$items.heat_no",
            remarks: "$items.remarks",
          },
        },
      },
      {
        $group: {
          _id: {
            _id: "$_id",
            issue_accept_no: "$miv_no",
            project_name: "$project_name",
            client: "$client",
            contractor_name: "$contractor_name",
            issued_date: "$issued_date",
            issue_name: "$issue_name",
            createdAt: "$createdAt",
          },
          items: { $push: "$items" },
        },
      },
      {
        $project: {
          _id: "$_id._id",
          miv_no: "$_id.issue_accept_no",
          client: "$_id.client",
          project_name: "$_id.project_name",
          contractor_name: "$_id.contractor_name",
          issued_date: "$_id.issued_date",
          issue_name: "$_id.issue_name",
          issue_date: "$_id.createdAt",
          items: 1,
        },
      },
    ]);
    
    if (requestData.length && requestData.length > 0) {
      return { status: 1, result: requestData };
    } else {
      return { status: 0, result: [] };
    }
  } catch (error) {
    return { status: 2, result: error };
  }
};

exports.downloadOneIssueAcceptance = async (req, res) => {
  const { issue_accept_no, print_date } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await getIssueAcceptance(issue_accept_no)
      let requestData = data.result;

      if (data.status === 1) {
        const template = fs.readFileSync(
          "templates/issueAcceptanceItem.html",
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

    
        const pdfBuffer = await generatePDF(page, { print_date });
        await browser.close();

        const pdfsDir = path.join(__dirname, "../../../pdfs");
        if (!fs.existsSync(pdfsDir)) {
          fs.mkdirSync(pdfsDir);
        }

        const filename = `issue_acceptance_${Date.now()}.pdf`;
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
        sendResponse(res, 200, false, {}, `Issue acceptance not found`)
      }
      else if (data.status === 2) {
        sendResponse(res, 500, false, {}, "Something went wrong");
      }
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.xlsxOneIssueAcceptance = async (req, res) => {
  const { issue_accept_no, print_date } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await getIssueAcceptance(issue_accept_no)
      let requestData = data.result;

      if (data.status === 1) {
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
            { v: `PROJECT MATERIAL ISSUE/RETURN VOUCHER`, s: headerStyle4 },
            "", "", "", "", "", "", "", "",
            print_date ? { v: `Download Date : ${new Date().toLocaleDateString()}`, s: headerStyle4 } : "",
          ],
          [
            { v: `Client                : ${requestData[0].client}`, s: headerStyle1 },
            "", "", "", "", "", "", "", "",
            { v: `Project                               : ${requestData[0].project_name}`, s: headerStyle1 },
          ],
          [
            { v: `MIV No.           : ${requestData[0].miv_no}`, s: headerStyle1 },
            "", "", "", "", "", "", "", "",
            { v: `Contractor Name             : ${requestData[0].contractor_name}`, s: headerStyle1 },
          ],
        ];

        const headers = [
          { v: "Sr No.", s: headerStyle },
          { v: "Draw. No.", s: headerStyle },
          { v: "Rev No.", s: headerStyle },
          { v: "Sheet No.", s: headerStyle },
          { v: "ASS. No.", s: headerStyle },
          { v: "Grid No.", s: headerStyle },
          { v: "Item No.", s: headerStyle },
          { v: "Profile", s: headerStyle },
          { v: "Req. Len.(mm)", s: headerStyle },
          { v: "Req. Wid.(mm)", s: headerStyle },
          { v: "Req. Qty.(nos)", s: headerStyle },
          { v: "Iss. Len.(mm)", s: headerStyle },
          { v: "Iss. Wid.(mm)", s: headerStyle },
          { v: "Iss. Qty.(nos)", s: headerStyle },
          { v: "IMIR No.", s: headerStyle },
          { v: "Heat No.", s: headerStyle },
          { v: "Remarks", s: headerStyle },
        ];

        ws_data.push(headers);

        requestData[0].items.forEach((detail, itemIndex) => {
          const row = [
            itemIndex + 1,
            detail.drawing_no || '--',
            detail.rev || '--',
            detail.sheet_no || '--',
            detail.assembly_no || '--',
            detail.grid_no || '--',
            detail.item_no || '--',
            detail.profile || '--',
            detail.requested_length || '--',
            detail.requested_width || '--',
            detail.requested_qty || '--',
            detail.issued_length || '--',
            detail.issued_width || '--',
            detail.issued_qty || '--',
            detail.imir_no || '--',
            detail.heat_no || '--',
            detail.remarks || '--',
          ];

          ws_data.push(row);
        });
        ws_data.push([]);
        ws_data.push(
          [
            "", "",
            {
              v: `Issued By`, s: headerStyle4
            },
          ],
          [
            { v: `Signature`, s: headerStyle3 },
          ],
          [
            { v: `Name`, s: headerStyle3 },
            "",
            {
              v: `${requestData[0].issue_name}`, s: headerStyle5
            },
          ],
          [
            { v: `Date`, s: headerStyle3 },
            "",
            {
              v: `${requestData[0].issued_date ? new Date(requestData[0].issued_date).toLocaleDateString() : ''}`, s: headerStyle5
            },
          ],
          [
            { v: `VE-STR-07`, s: headerStyle1 },
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
          { s: { r: 0, c: 0 }, e: { r: 0, c: 16 } },
          { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
          { s: { r: 1, c: 9 }, e: { r: 1, c: 16 } },
          { s: { r: 2, c: 0 }, e: { r: 2, c: 8 } },
          { s: { r: 2, c: 9 }, e: { r: 2, c: 16 } },
          { s: { r: 3, c: 0 }, e: { r: 3, c: 8 } },
          { s: { r: 3, c: 9 }, e: { r: 3, c: 16 } },
          { s: { r: ws_data.length - 5, c: 0 }, e: { r: ws_data.length - 5, c: 1 } },
          { s: { r: ws_data.length - 5, c: 2 }, e: { r: ws_data.length - 5, c: 16 } },
          { s: { r: ws_data.length - 4, c: 0 }, e: { r: ws_data.length - 4, c: 1 } },
          { s: { r: ws_data.length - 4, c: 2 }, e: { r: ws_data.length - 4, c: 16 } },
          { s: { r: ws_data.length - 3, c: 0 }, e: { r: ws_data.length - 3, c: 1 } },
          { s: { r: ws_data.length - 3, c: 2 }, e: { r: ws_data.length - 3, c: 16 } },
          { s: { r: ws_data.length - 2, c: 0 }, e: { r: ws_data.length - 2, c: 1 } },
          { s: { r: ws_data.length - 2, c: 2 }, e: { r: ws_data.length - 2, c: 16 } },
          { s: { r: ws_data.length - 1, c: 0 }, e: { r: ws_data.length - 1, c: 16 } },
        ];

        XLSX.utils.book_append_sheet(wb, ws, `Issue Acceptance`);

        const xlsxPath = path.join(__dirname, '../../../xlsx');

        if (!fs.existsSync(xlsxPath)) {
          fs.mkdirSync(xlsxPath, { recursive: true });
        }

        const filename = `Issue_acceptance_${Date.now()}.xlsx`;
        const filePath = path.join(xlsxPath, filename);

        await XLSXStyle.writeFile(wb, filePath);


        const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
        const fileUrl = `${protocol}://${req.get('host')}/xlsx/${filename}`;

        sendResponse(res, 200, true, { file: fileUrl }, `XLSX file generated successfully`)

      }
      else if (data.status === 0) {
        sendResponse(res, 200, false, {}, `Issue Acceptance not found`)
      }
      else if (data.status === 2) {
        sendResponse(res, 500, false, {}, "Something went wrong111");
      }
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
}
