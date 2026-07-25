const FdOfferModel = require('../../../models/erp/Execution/fd_inspection_offer.model');
const { TitleFormat } = require('../../../utils/enum');
const { sendResponse } = require('../../../helper/response');
const ejs = require("ejs");
const fs = require("fs");
const XLSX = require('xlsx');  // for utility functions
const XLSXStyle = require('xlsx-style');  // for styling
const puppeteer = require("puppeteer");
const path = require("path");
const URI = process.env.PDF_URL;
const PATH = process.env.PDF_PATH;

const { manageInspectSummary } = require('./inspect_summary.controller');

exports.manageFdOffer = async (req, res) => {
  const { id, ndt_master_id, drawing_id, required_dimension, remarks, project, offered_by } = req.body;

  if (req.user && !req.error) {
    if (ndt_master_id && drawing_id && required_dimension) {
      try {
        if (!id) {
          const lastReportNo = await FdOfferModel.findOne({ deleted: false, report_no: { $regex: `/${project}/` } }, { deleted: 0 }, { sort: { createdAt: -1 } });
          let ReportNo = "1";
          if (lastReportNo && lastReportNo.report_no) {
            const split = lastReportNo.report_no.split('/');
            ReportNo = parseInt(split[split.length - 1]) + 1;
          }
          const gen_report_no = TitleFormat.FDOFFERNO.replace('/PROJECT/', `/${project}/`) + ReportNo;

          const fdOffer = new FdOfferModel({
            report_no: gen_report_no,
            ndt_master_id,
            report_date: Date.now(),
            drawing_id,
            required_dimension,
            offered_by,
            remarks,
          });

          const result = await fdOffer.save();
          if (result) {
            sendResponse(res, 200, true, result, 'Final-dimension  offer added successfully');
          } else {
            sendResponse(res, 400, false, {}, 'Final-dimension  Offer already exists');
          }
        } else {
          const fdOffer = await FdOfferModel.findByIdAndUpdate(id, {
            ndt_master_id,
            report_date: Date.now(),
            drawing_id,
            required_dimension,
            offered_by,
            remarks,
          });
          if (fdOffer) {
            sendResponse(res, 200, true, fdOffer, 'Final-dimension offer updated successfully');
          } else {
            sendResponse(res, 400, false, {}, 'Final-dimension Offer not found');
          }
        }
      } catch (error) {
        sendResponse(res, 500, false, {}, 'Something went wrong');
      }
    } else {
      sendResponse(res, 400, false, {}, 'Missing parameter');
    }
  } else {
    sendResponse(res, 401, false, {}, 'Unauthorised');
  }
}

exports.getFdOfferList = async (req, res) => {
  if (req.user && !req.error) {
   
    const { status } = req.query;
   

    let query = { deleted: false };
    if (status) {
      query.status = status
    }
    try {
      const fdOfferList = await FdOfferModel.find(query, { deleted: 0 })
        .populate('ndt_master_id', 'ndt_voucher_no')
        .populate({
          path: 'drawing_id', select: 'drawing_no sheet_no rev assembly_no',
          populate: { path: 'project', select: 'name party work_order_no', populate: { path: 'party', select: 'name' } }
        })
        .populate('offered_by', 'user_name')
        .populate('qc_name', 'user_name')
      sendResponse(res, 200, true, fdOfferList, 'Final-dimension offer list');
    } catch (error) {
      sendResponse(res, 500, false, {}, 'Something went wrong');
    }
  } else {
    sendResponse(res, 401, false, {}, 'Unauthorised');
  }
}

exports.acceptOffer = async (req, res) => {
  const { id, qc_name, qc_time, qc_status, actual_dimension, qc_remarks, project, drawing_id, remarks } = req.body;
  if (req.user && !req.error) {
    if (!id) {
      sendResponse(res, 400, false, {}, 'Missing Parameter');
      return;
    }
    try {
      const FdOffer = await FdOfferModel.findOne({ _id: id, status: 1, deleted: false });

      const lastReportNo = await FdOfferModel.findOne(
        { deleted: false, qc_report_no: { $regex: `/${project}/` } },
        { deleted: 0 },
        // { sort: { createdAt: -1 } } 
        { sort: { qc_time: -1 } }
      );
      let ReportNo = "1";
      if (lastReportNo && lastReportNo.qc_report_no) {
        const split = lastReportNo.qc_report_no.split('/');
        ReportNo = parseInt(split[split.length - 1]) + 1;
      }
      const gen_report_no = TitleFormat.FDINSPECTNO.replace('/PROJECT/', `/${project}/`) + ReportNo;

      if (!FdOffer) {
        sendResponse(res, 400, false, {}, "Offer not found or already accepted");
        return;
      }
      if (qc_status === "true") {
        FdOffer.qc_report_no = gen_report_no;
        FdOffer.qc_name = qc_name;
        FdOffer.qc_time = Date.now();
        FdOffer.qc_status = true;
        FdOffer.actual_dimension = actual_dimension;
        FdOffer.qc_remarks = qc_remarks;
        FdOffer.status = 2;
        await FdOffer.save().then(result => {
          manageInspectSummary(drawing_id, project, remarks);
          sendResponse(res, 200, true, {}, "Qc details submitted successfully");
        }).catch(err => {
          console.error(err);
          sendResponse(res, 500, false, {}, "Something went wrong");
        });
      } else if (qc_status === "false") {
        FdOffer.qc_report_no = gen_report_no;
        FdOffer.qc_name = qc_name;
        FdOffer.qc_time = qc_time;
        FdOffer.qc_status = false;
        FdOffer.actual_dimension = actual_dimension;
        FdOffer.qc_remarks = qc_remarks;
        FdOffer.status = 3;
        await FdOffer.save().then(res => {
          sendResponse(res, 200, true, {}, "Qc details submitted successfully");
        }).catch(err => {
          console.error(err);
          sendResponse(res, 500, false, {}, "Something went wrong");
        });
      }
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
}

const getOneOneFD = async (report_no, qc_report_no) => {
  try {
    let matchObj = { deleted: false }
    if (report_no) {
      matchObj = { ...matchObj, report_no: report_no }
    }
    if (qc_report_no) {
      matchObj = { ...matchObj, qc_report_no: qc_report_no }
    }
    const requestData = await FdOfferModel.aggregate([
      { $match: matchObj },
      // {
      //   $lookup: {
      //     from: "store_transaction_items",
      //     localField: "drawing_id",
      //     foreignField: "drawingId",
      //     as: "transItemDetails",
      //   },
      // },                                                   //FOR GRID NUMBER
      // {
      //   $addFields: {
      //     grid_no: "$transItemDetails.grid_no",
      //   },
      // },
      // { $unwind: "$grid_no" },
      {
        $lookup: {
          from: "users",
          localField: "offered_by",
          foreignField: "_id",
          as: "offerDetails",
          pipeline: [
            { $project: { _id: 0, user_name: "$user_name" } },
          ],
        },
      },
      { $unwind: "$offerDetails" },
      {
        $lookup: {
          from: "users",
          localField: "qc_name",
          foreignField: "_id",
          as: "qcDetails",
          pipeline: [
            { $project: { _id: 0, user_name: "$user_name" } },
          ],
        },
      },
      { $unwind: "$qcDetails" },
      {
        $lookup: {
          from: "erp-planner-drawings",
          localField: "drawing_id",
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
      {
        $addFields: {
          drawingDetails: { $arrayElemAt: ["$drawingDetails", 0] },
        },
      },
      {
        $addFields: {
          projectDetails: {
            $arrayElemAt: [
              "$drawingDetails.projectDetails",
              0,
            ],
          },
        },
      },
      {
        $addFields: {
          partyDetails: {
            $arrayElemAt: [
              "$projectDetails.partyDetails",
              0,
            ],
          },
        },
      },
      // {
      //   $group: {
      //     _id: {
      //       report_no: report_no ? "$report_no" : "$qc_report_no",
      //       client: "$partyDetails.name",
      //       project_name: "$projectDetails.name",
      //       wo_no: "$projectDetails.work_order_no",
      //       project_po_no: "$projectDetails.work_order_no",
      //       date: report_no ? "$report_date" : "$qc_time",
      //       ...(qc_report_no && {
      //         actual_dimension: "$actual_dimension",
      //         accept: {
      //           $cond: [
      //             { $eq: ["$status", 1] },
      //             "PEN",
      //             {
      //               $cond: [
      //                 { $eq: ["$status", 2] },
      //                 "ACC",
      //                 {
      //                   $cond: [{ $eq: ["$status", 3] }, "REJ", "--"]
      //                 }
      //               ]
      //             }
      //           ]
      //         }
      //       }),
      //     },
      //     gridDetails: {
      //       $push: {
      //         drawing_no: "$drawingDetails.drawing_no",
      //         rev: "$drawingDetails.rev",
      //         assembly_no: "$drawingDetails.assembly_no",
      //         grid_no: "$grid_no",
      //         required_dimension: "$required_dimension",
      //         remarks: report_no ? "$remarks" : "$qc_remarks",
      //       }
      //     }
      //   },
      // },                                                          //FOR GRID NUMBER
      // {
      //   $project: {
      //     _id: 0,
      //     report_no: "$_id.report_no",
      //     client: "$_id.client",
      //     project_name: "$_id.project_name",
      //     wo_no: "$_id.wo_no",
      //     project_po_no: "$_id.project_po_no",
      //     date: "$_id.date",
      //     actual_dimension: "$_id.actual_dimension",
      //     accept: "$_id.accept",
      //     gridDetails: 1,
      //   },
      // },
      {
        $project: {
          _id: 1,
          report_no: report_no ? "$report_no" : "$qc_report_no",
          client: "$partyDetails.name",
          project_name:
            "$projectDetails.name",
          wo_no:
            "$projectDetails.work_order_no",
          project_po_no:
            "$projectDetails.work_order_no",
          date: report_no ? "$report_date" : "$qc_time",
          drawing_no: "$drawingDetails.drawing_no",
          rev: "$drawingDetails.rev",
          assembly_no: "$drawingDetails.assembly_no",
          grid_no: "$grid_no",
          offer_name: "$offerDetails.user_name",
          qc_name: "$qcDetails.user_name",
          qc_time: report_no ? "$createdAt" : "$qc_time",
          required_dimension: "$required_dimension",
          ...(qc_report_no && {
            actual_dimension: "$actual_dimension",
            accept: {
              $cond: [
                { $eq: ["$status", 1] },
                "PEN",
                {
                  $cond: [
                    { $eq: ["$status", 2] },
                    "ACC",
                    {
                      $cond: [{ $eq: ["$status", 3] }, "REJ", "--"]
                    }
                  ]
                }
              ]
            }
          }),
          remarks: report_no ? "$remarks" : "$qc_remarks",
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

exports.downloadOneFDInspection = async (req, res) => {
  const { report_no, qc_report_no, print_date } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await getOneOneFD(report_no, qc_report_no)
      let requestData = data.result;

      if (data.status === 1) {
        const template = fs.readFileSync(
          "templates/FDInspection.html",
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
          width: "12in",
          height: "15in",
          // format: "A4",
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

        const filename = `fd_${x}_${Date.now()}.pdf`;
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
        sendResponse(res, 200, false, {}, `FD data not found`)
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

exports.xlsxOneFDInspection = async (req, res) => {
  const { report_no, qc_report_no, print_date } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await getOneOneFD(report_no, qc_report_no)
      let requestData = data.result;

      if (data.status === 1) {
        if (requestData.some(detail => detail.actual_dimension)) {
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
              "", "", "",
              print_date ? { v: `Download Date : ${new Date().toLocaleDateString()}`, s: headerStyle4 } : "",
            ],
            [
              { v: `Client                           : ${requestData[0].client}`, s: headerStyle1 },
              "", "", "",
              { v: `Project                                : ${requestData[0].project_name}`, s: headerStyle1 },
            ],
            [
              { v: `Report No.                  : ${requestData[0].report_no}`, s: headerStyle1 },
              "", "", "",
              { v: `WO PO No.                        : ${requestData[0].wo_no}`, s: headerStyle1 },
            ],
          ];

          const headers = [
            { v: "Sr No.", s: headerStyle },
            { v: "Fabrication Drawing No.", s: headerStyle },
            { v: "Rev No.", s: headerStyle },
            { v: "ASS. No.", s: headerStyle },
            { v: "Req. Dimension", s: headerStyle },
            { v: "Act. Dimension", s: headerStyle },
            { v: "Acc/Rej", s: headerStyle },
            { v: "Remarks", s: headerStyle },
          ];

          ws_data.push(headers);

          requestData.forEach((order, itemIndex) => {
            const row = [
              itemIndex + 1,
              order.drawing_no || '--',
              order.rev || '--',
              order.assembly_no || '--',
              order.required_dimension || '--',
              order.actual_dimension || '--',
              order.accept || '--',
              order.remarks || '--',
            ];

            ws_data.push(row);
          });
          ws_data.push([]);
          ws_data.push(
            [
              { v: `Note`, s: headerStyle3 },
            ],
            [
              "",
              {
                v: `VE QC`, s: headerStyle4
              },
              "",
              {
                v: `CLIENT-QC / TPI`, s: headerStyle4
              },
            ],
            [
              { v: `Signature`, s: headerStyle3 },
            ],
            [
              { v: `Name`, s: headerStyle3 },
              {
                v: `${requestData[0].qc_name}`, s: headerStyle5
              },
            ],
            [
              { v: `Date`, s: headerStyle3 },
              {
                v: `${requestData[0].date ? new Date(requestData[0].date).toLocaleDateString() : ''}`, s: headerStyle5
              },
            ],
            [
              { v: `VE-STR-20B`, s: headerStyle1 },
            ]
          );

          const colWidths = ws_data[4].map((_, colIndex) => ({
            wch: Math.max(
              ...ws_data.slice(4, 4 + requestData.length + 1).map(row => (
                row[colIndex]?.toString().length || 0
              ))
            ),
          }));

          colWidths[1] = { wch: 30 };

          ws = XLSX.utils.aoa_to_sheet(ws_data);
          ws['!cols'] = colWidths;

          ws['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
            { s: { r: 1, c: 4 }, e: { r: 1, c: 7 } },
            { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } },
            { s: { r: 2, c: 4 }, e: { r: 2, c: 7 } },
            { s: { r: 3, c: 0 }, e: { r: 3, c: 3 } },
            { s: { r: 3, c: 4 }, e: { r: 3, c: 7 } },
            { s: { r: ws_data.length - 6, c: 0 }, e: { r: ws_data.length - 6, c: 7 } },
            { s: { r: ws_data.length - 5, c: 1 }, e: { r: ws_data.length - 5, c: 3 } },
            { s: { r: ws_data.length - 5, c: 4 }, e: { r: ws_data.length - 5, c: 7 } },
            { s: { r: ws_data.length - 4, c: 1 }, e: { r: ws_data.length - 4, c: 3 } },
            { s: { r: ws_data.length - 4, c: 4 }, e: { r: ws_data.length - 4, c: 7 } },
            { s: { r: ws_data.length - 3, c: 1 }, e: { r: ws_data.length - 3, c: 3 } },
            { s: { r: ws_data.length - 3, c: 4 }, e: { r: ws_data.length - 3, c: 7 } },
            { s: { r: ws_data.length - 2, c: 1 }, e: { r: ws_data.length - 2, c: 3 } },
            { s: { r: ws_data.length - 2, c: 4 }, e: { r: ws_data.length - 2, c: 7 } },
            { s: { r: ws_data.length - 1, c: 0 }, e: { r: ws_data.length - 1, c: 7 } },
          ];

          XLSX.utils.book_append_sheet(wb, ws, `FD inspection`);

          const xlsxPath = path.join(__dirname, '../../../xlsx');

          if (!fs.existsSync(xlsxPath)) {
            fs.mkdirSync(xlsxPath, { recursive: true });
          }

          const filename = `FD_inspection_${Date.now()}.xlsx`;
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
              "", "",
              print_date ? { v: `Download Date : ${new Date().toLocaleDateString()}`, s: headerStyle4 } : "",
            ],
            [
              { v: `Client                           : ${requestData[0].client}`, s: headerStyle1 },
              "", "",
              { v: `Project                                : ${requestData[0].project_name}`, s: headerStyle1 },
            ],
            [
              { v: `Report No.                  : ${requestData[0].report_no}`, s: headerStyle1 },
              "", "",
              { v: `WO PO No.                        : ${requestData[0].wo_no}`, s: headerStyle1 },
            ],
          ];

          const headers = [
            { v: "Sr No.", s: headerStyle },
            { v: "Fabrication Drawing No.", s: headerStyle },
            { v: "Rev No.", s: headerStyle },
            { v: "ASS. No.", s: headerStyle },
            { v: "Req. Dimension", s: headerStyle },
            { v: "Remarks", s: headerStyle },
          ];

          ws_data.push(headers);

          requestData.forEach((order, itemIndex) => {
            const row = [
              itemIndex + 1,
              order.drawing_no || '--',
              order.rev || '--',
              order.assembly_no || '--',
              order.required_dimension || '--',
              order.remarks || '--',
            ];

            ws_data.push(row);
          });
          ws_data.push([]);
          ws_data.push(
            [
              { v: `Note`, s: headerStyle3 },
            ],
            [
              "",
              {
                v: `Offer By`, s: headerStyle4
              },
              "",
              {
                v: `CLIENT-QC / TPI`, s: headerStyle4
              },
            ],
            [
              { v: `Signature`, s: headerStyle3 },
            ],
            [
              { v: `Name`, s: headerStyle3 },
              {
                v: `${requestData[0].offer_name}`, s: headerStyle5
              },
            ],
            [
              { v: `Date`, s: headerStyle3 },
              {
                v: `${requestData[0].date ? new Date(requestData[0].date).toLocaleDateString() : ''}`, s: headerStyle5
              },
            ],
            [
              { v: `VE-STR-20B`, s: headerStyle1 },
            ]
          );

          const colWidths = ws_data[4].map((_, colIndex) => ({
            wch: Math.max(
              ...ws_data.slice(4, 4 + requestData.length + 1).map(row => (
                row[colIndex]?.toString().length || 0
              ))
            ),
          }));
          colWidths[1] = { wch: 30 };

          ws = XLSX.utils.aoa_to_sheet(ws_data);
          ws['!cols'] = colWidths;

          ws['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
            { s: { r: 1, c: 3 }, e: { r: 1, c: 5 } },
            { s: { r: 2, c: 0 }, e: { r: 2, c: 2 } },
            { s: { r: 2, c: 3 }, e: { r: 2, c: 5 } },
            { s: { r: 3, c: 0 }, e: { r: 3, c: 2 } },
            { s: { r: 3, c: 3 }, e: { r: 3, c: 5 } },
            { s: { r: ws_data.length - 6, c: 0 }, e: { r: ws_data.length - 6, c: 5 } },
            { s: { r: ws_data.length - 5, c: 1 }, e: { r: ws_data.length - 5, c: 2 } },
            { s: { r: ws_data.length - 5, c: 3 }, e: { r: ws_data.length - 5, c: 5 } },
            { s: { r: ws_data.length - 4, c: 1 }, e: { r: ws_data.length - 4, c: 2 } },
            { s: { r: ws_data.length - 4, c: 3 }, e: { r: ws_data.length - 4, c: 5 } },
            { s: { r: ws_data.length - 3, c: 1 }, e: { r: ws_data.length - 3, c: 2 } },
            { s: { r: ws_data.length - 3, c: 3 }, e: { r: ws_data.length - 3, c: 5 } },
            { s: { r: ws_data.length - 2, c: 1 }, e: { r: ws_data.length - 2, c: 2 } },
            { s: { r: ws_data.length - 2, c: 3 }, e: { r: ws_data.length - 2, c: 5 } },
            { s: { r: ws_data.length - 1, c: 0 }, e: { r: ws_data.length - 1, c: 5 } },
          ];

          XLSX.utils.book_append_sheet(wb, ws, `FD offer`);

          const xlsxPath = path.join(__dirname, '../../../xlsx');

          if (!fs.existsSync(xlsxPath)) {
            fs.mkdirSync(xlsxPath, { recursive: true });
          }

          const filename = `FD_offer_${Date.now()}.xlsx`;
          const filePath = path.join(xlsxPath, filename);

          await XLSXStyle.writeFile(wb, filePath);

          const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
          const fileUrl = `${protocol}://${req.get('host')}/xlsx/${filename}`;

          sendResponse(res, 200, true, { file: fileUrl }, `XLSX file generated successfully`)
        }
      }
      else if (data.status === 0) {
        sendResponse(res, 200, false, {}, `FD detail not found`)
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
}
