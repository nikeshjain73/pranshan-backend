const FitupInspection = require("../../../models/erp/Execution/fitup_inspection.model");
const IssueAcceptance = require("../../../models/erp/Multi/multi_issue_acceptance.model");
const { sendResponse } = require("../../../helper/response");
const { TitleFormat } = require("../../../utils/enum");
const ejs = require("ejs");
const fs = require("fs");
const XLSX = require('xlsx');  // for utility functions
const XLSXStyle = require('xlsx-style');  // for styling
const puppeteer = require("puppeteer");
const path = require("path");
const URI = process.env.PDF_URL;
const PATH = process.env.PDF_PATH;
const moment = require("moment");

exports.manageFitupInspection = async (req, res) => {
  const { id, issue_id, items, offered_by, status, project, drawing_id } = req.body;

  if (req.user && !req.error) {
    if (issue_id && offered_by && items && drawing_id) {
      try {
        let lastInspection = await FitupInspection.findOne({ deleted: false, report_no: { $regex: `/${project}/` } }, {}, { sort: { createdAt: -1 } });
        let inspectionNo = "1";
        if (lastInspection && lastInspection.report_no) {
          const split = lastInspection.report_no.split('/');
          const lastInspectionNo = parseInt(split[split.length - 1]);
          inspectionNo = lastInspectionNo + 1;
        }
        const gen_report_no = TitleFormat.fitupOffer.replace('/PROJECT/', `/${project}/`) + inspectionNo;

        if (!id) {
          const object = new FitupInspection({
            report_no: gen_report_no,
            issue_id: issue_id,
            items: JSON.parse(items) || [],
            offered_by: offered_by,
            drawing_id,
          });

          await object
            .save().then((result) => {
              if (result) {
                sendResponse(res, 200, true, {}, "Fitup inspection offer added successfully");
              }
            }).catch((err) => {
              sendResponse(res, 500, false, {}, "Something went wrong while saving");
            });
        } else {
          await FitupInspection.findByIdAndUpdate(id, {
            items: JSON.parse(items) || [],
            offered_by: offered_by,
            status: status,
            drawing_id
          })
            .then((result) => {
              if (result) {
                sendResponse(res, 200, true, {}, "Fitup inspection offer updated successfully");
              }
            }).catch((err) => {
              sendResponse(res, 500, false, {}, "Something went wrong while updating");
            });
        }
      } catch (err) {
        sendResponse(res, 500, false, {}, "Something went wrong");
      }
    } else {
      sendResponse(res, 400, false, {}, "Missing parameter");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.getFitupInspecction = async (req, res) => {
  const { id, status } = req.query;
  if (req.user && !req.error) {
    try {
      let query = { deleted: false };
      if (id) {
        query._id = id;
      }
      if (status) {
        query.status = status;
      }
      const result = await FitupInspection.find(query, { deleted: 0, __v: 0 })
        .populate("offered_by", "user_name")
        .populate("qc_name", "user_name")
        .populate({
          path: "items",
          select: "transaction_id wps_no joint_type",
          populate: [
            {
              path: "wps_no",
              select: "weldingProcess wpsNo jointType",
              populate: { path: "jointType.jointId", select: "name" },
            },
            { path: "joint_type", select: "name" },
            {
              path: "transaction_id",
              select: "itemName drawingId quantity item_no grid_no ",
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
            },
          ],
        })
        .populate({
          path: "issue_id",
          select: "items",
          populate: {
            path: "items",
            select: "imir_no heat_no "
          }
        })
        .sort({ createdAt: -1 })
        .lean();

      if (result) {
        sendResponse(res, 200, true, result, "Fitup inspection offer list");
      } else {
        sendResponse(res, 200, true, {}, "Fitup inspection offer not found");
      }
    } catch (err) {
      sendResponse(res, 500, false, {}, "Something went wrong" + err);
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.getQcApproval = async (req, res) => {
  const { id, qc_name, status, project, items } = req.body;

  if (req.user && !req.error) {
    if (id && items && status) {
      try {
        let lastInspection = await FitupInspection.findOne(
          { deleted: false, report_no_two: { $regex: `/${project}/` } }, {}, { sort: { createdAt: -1 } }
        );
        let inspectionNo = "1";
        if (lastInspection && lastInspection.report_no_two) {
          const split = lastInspection.report_no_two.split("/");
          const lastInspectionNo = parseInt(split[split.length - 1]);
          inspectionNo = lastInspectionNo + 1;
        }
        const gen_report_no =
          TitleFormat.fitupReport.replace("/PROJECT/", `/${project}/`) +
          inspectionNo;

        await FitupInspection.findByIdAndUpdate(id, {
          items: JSON.parse(items),
          qc_status: status,
          qc_time: Date.now(),
          qc_name: qc_name,
          report_no_two: gen_report_no,
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
        sendResponse(
          res,
          500,
          false,
          {},
          "Something went wrong" + error.message
        );
      }
    } else {
      sendResponse(res, 400, false, {}, "Missing parameter");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.downloadOneFitupInspection = async (req, res) => {
  const { report_no, report_no_two, print_date } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await getOneFitupInspection(report_no, report_no_two,)
      let requestData = data.result;

      if (data.status === 1) {
        const template = fs.readFileSync(
          "templates/fitupInspectionItem.html",
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
          width: "15in",
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

        const filename = `fitup_${x}_${Date.now()}.pdf`;
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
        sendResponse(res, 200, false, {}, `Fit up data not found`)
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

exports.xlsxOneFitupInspection = async (req, res) => {
  const { report_no, report_no_two, print_date } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await getOneFitupInspection(report_no, report_no_two,)
      let requestData = data.result;

      if (data.status === 1) {
        if (requestData[0].items.some(detail => detail.wps_no || detail.accept)) {
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
              { v: `FIT-UP INSPECTION REPORT (STRUCTURE)`, s: headerStyle4 },
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
            { v: "Sheet No.", s: headerStyle },
            { v: "ASS. No.", s: headerStyle },
            { v: "Grid No.", s: headerStyle },
            { v: "Item No.", s: headerStyle },
            { v: "Qty.", s: headerStyle },
            { v: "Profile", s: headerStyle },
            { v: "IMIR No.", s: headerStyle },
            { v: "Heat No.", s: headerStyle },
            { v: "Joint Type.", s: headerStyle },
            { v: "WPS No..", s: headerStyle },
            { v: "Acc/Rej.", s: headerStyle },
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
              detail.issued_qty || '--',
              detail.profile || '--',
              detail.imir_no || '--',
              detail.heat_no || '--',
              detail.joint_type || '--',
              detail.wps_no || '--',
              detail.accept || '--',
              detail.remarks || '--',
            ];

            ws_data.push(row);
          });
          ws_data.push([]);
          ws_data.push(
            [
              { v: `☐ DIR & ORIENTATION`, s: headerStyle1 },
              "", "",
              { v: `☐ W.E.P AS PER WPS`, s: headerStyle1 },
              "", "",
              { v: `☐ DIMENSIONS`, s: headerStyle1 },
              "", "",
              { v: `☐ SQUARENESS`, s: headerStyle1 },
              "", "",
              { v: `☐ OFFSET`, s: headerStyle1 },
            ],
            [
              { v: `☐ FLANGE STRADLING`, s: headerStyle1 },
              "", "",
              { v: `☐ EREC. COORDINATES`, s: headerStyle1 },
              "", "",
              { v: `☐ PHYSICAL CONDITION`, s: headerStyle1 },
              "", "",
              { v: `☐ ARC STRIKE`, s: headerStyle1 },
              "", "",
              { v: `☐ SLOPE`, s: headerStyle1 },
            ],
            [
              { v: `☐ PAINTING LINES FOR ERECTED SPOOLS`, s: headerStyle1 },
              "", "", "", "", "",
              { v: `☐ EREC. VERTICALITY`, s: headerStyle1 },
              "", "",
              { v: `☐ PRESERVATION`, s: headerStyle1 },
              "", "",
              { v: `☐ VISUAL`, s: headerStyle1 },
            ],
            [
              { v: `Remarks`, s: headerStyle3 },
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
              { v: `VE-STR-10`, s: headerStyle1 },
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
            { s: { r: ws_data.length - 9, c: 0 }, e: { r: ws_data.length - 9, c: 2 } },
            { s: { r: ws_data.length - 9, c: 3 }, e: { r: ws_data.length - 9, c: 5 } },
            { s: { r: ws_data.length - 9, c: 6 }, e: { r: ws_data.length - 9, c: 8 } },
            { s: { r: ws_data.length - 9, c: 9 }, e: { r: ws_data.length - 9, c: 11 } },
            { s: { r: ws_data.length - 9, c: 12 }, e: { r: ws_data.length - 9, c: 14 } },
            { s: { r: ws_data.length - 8, c: 0 }, e: { r: ws_data.length - 8, c: 2 } },
            { s: { r: ws_data.length - 8, c: 3 }, e: { r: ws_data.length - 8, c: 5 } },
            { s: { r: ws_data.length - 8, c: 6 }, e: { r: ws_data.length - 8, c: 8 } },
            { s: { r: ws_data.length - 8, c: 9 }, e: { r: ws_data.length - 8, c: 11 } },
            { s: { r: ws_data.length - 8, c: 12 }, e: { r: ws_data.length - 8, c: 14 } },
            { s: { r: ws_data.length - 7, c: 0 }, e: { r: ws_data.length - 7, c: 2 } },
            { s: { r: ws_data.length - 7, c: 3 }, e: { r: ws_data.length - 7, c: 5 } },
            { s: { r: ws_data.length - 7, c: 6 }, e: { r: ws_data.length - 7, c: 8 } },
            { s: { r: ws_data.length - 7, c: 9 }, e: { r: ws_data.length - 7, c: 11 } },
            { s: { r: ws_data.length - 7, c: 12 }, e: { r: ws_data.length - 7, c: 14 } },
            { s: { r: ws_data.length - 6, c: 0 }, e: { r: ws_data.length - 6, c: 1 } },
            { s: { r: ws_data.length - 6, c: 2 }, e: { r: ws_data.length - 6, c: 15 } },
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

          XLSX.utils.book_append_sheet(wb, ws, `Fit up inspection`);

          const xlsxPath = path.join(__dirname, '../../../xlsx');

          if (!fs.existsSync(xlsxPath)) {
            fs.mkdirSync(xlsxPath, { recursive: true });
          }

          const filename = `Fitup_inspection_${Date.now()}.xlsx`;
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
              { v: `FIT-UP INSPECTION OFFER LIST`, s: headerStyle4 },
              "", "", "", "", "", "",
              print_date ? { v: `Download Date : ${new Date().toLocaleDateString()}`, s: headerStyle4 } : "",
            ],
            [
              { v: `Client                           : ${requestData[0].client}`, s: headerStyle1 },
              "", "", "", "", "", "",
              { v: `Project                                : ${requestData[0].project_name}`, s: headerStyle1 },
            ],
            [
              { v: `Report No.                  : ${requestData[0].report_no}`, s: headerStyle1 },
              "", "", "", "", "", "",
              { v: `WO PO No.                        : ${requestData[0].wo_no}`, s: headerStyle1 },
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
            { v: "Qty.", s: headerStyle },
            { v: "Profile", s: headerStyle },
            { v: "IMIR No.", s: headerStyle },
            { v: "Heat No.", s: headerStyle },
            { v: "Joint Type.", s: headerStyle },
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
              detail.issued_qty || '--',
              detail.profile || '--',
              detail.imir_no || '--',
              detail.heat_no || '--',
              detail.joint_type || '--',
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
              { v: `VE-STR-09`, s: headerStyle1 },
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
            { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
            { s: { r: 1, c: 7 }, e: { r: 1, c: 12 } },
            { s: { r: 2, c: 0 }, e: { r: 2, c: 6 } },
            { s: { r: 2, c: 7 }, e: { r: 2, c: 12 } },
            { s: { r: 3, c: 0 }, e: { r: 3, c: 6 } },
            { s: { r: 3, c: 7 }, e: { r: 3, c: 12 } },
            { s: { r: ws_data.length - 5, c: 0 }, e: { r: ws_data.length - 5, c: 1 } },
            { s: { r: ws_data.length - 5, c: 2 }, e: { r: ws_data.length - 5, c: 12 } },
            { s: { r: ws_data.length - 4, c: 0 }, e: { r: ws_data.length - 4, c: 1 } },
            { s: { r: ws_data.length - 4, c: 2 }, e: { r: ws_data.length - 4, c: 12 } },
            { s: { r: ws_data.length - 3, c: 0 }, e: { r: ws_data.length - 3, c: 1 } },
            { s: { r: ws_data.length - 3, c: 2 }, e: { r: ws_data.length - 3, c: 12 } },
            { s: { r: ws_data.length - 2, c: 0 }, e: { r: ws_data.length - 2, c: 1 } },
            { s: { r: ws_data.length - 2, c: 2 }, e: { r: ws_data.length - 2, c: 12 } },
            { s: { r: ws_data.length - 1, c: 0 }, e: { r: ws_data.length - 1, c: 12 } },
          ];

          XLSX.utils.book_append_sheet(wb, ws, `Fit up offer`);

          const xlsxPath = path.join(__dirname, '../../../xlsx');

          if (!fs.existsSync(xlsxPath)) {
            fs.mkdirSync(xlsxPath, { recursive: true });
          }

          const filename = `Fitup_offer_${Date.now()}.xlsx`;
          const filePath = path.join(xlsxPath, filename);

          await XLSXStyle.writeFile(wb, filePath);

          const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
          const fileUrl = `${protocol}://${req.get('host')}/xlsx/${filename}`;

          sendResponse(res, 200, true, { file: fileUrl }, `XLSX file generated successfully`)
        }
      }
      else if (data.status === 0) {
        sendResponse(res, 200, false, {}, `Fit up not found`)
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

exports.downloadMultiInspectionOffers = async (req, res) => {
  const { reports, print_date } = req.body;

  if (!reports) {
    return sendResponse(res, 400, false, {}, "Invalid or missing reports array");
  }
  if (req.user && !req.error) {
    try {
      let results = [];
      for (const { report_no } of JSON.parse(reports)) {
        let data = await getMultiFitupInspectionOffer(report_no);
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

          const itemsWithReportNoAndDate = result.items.map(item => ({
            ...item,               
            report_no: result.report_no, 
            date: new Date(result.date).toLocaleDateString() 
          }));
    
          aggregatedItems.push(...itemsWithReportNoAndDate,); 
      });

      headerInfo.client = Array.from(uniqueClients).join(', ') || '--';
      headerInfo.project_name = Array.from(uniqueProjects).join(', ') || '--';
      headerInfo.report_no = Array.from(uniqueReportNos).join(', ') || '--';
      headerInfo.wo_no = Array.from(uniqueWoNos).join(', ') || '--';
      headerInfo.project_po_no = Array.from(uniqueProjectPoNos).join(', ') || '--';
      headerInfo.date = Array.from(datesSet).join(', ') || '--';

      const template = fs.readFileSync("templates/multiFitupInspection.html", "utf-8");
      const renderHtml = ejs.render(template, {
        headerInfo,
        logoUrl1: process.env.LOGO_URL_1,
        logoUrl2: process.env.LOGO_URL_2,
        items: aggregatedItems
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
        scale:1,
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: true,
        footerTemplate: `
          <div style="font-size: 14px; width: 100%; text-align: right; margin-top: 15px;padding-right: 40px; padding-bottom: 10px;">
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

      const filename = `fitup_Offer_${Date.now()}.pdf`;
      const filePath = path.join(__dirname, "../../../pdfs", filename);
      fs.writeFileSync(filePath, pdfBuffer);

      const fileUrl = `${URI}/pdfs/${filename}`;

      return sendResponse(res, 200, true, { file: fileUrl }, 'PDF downloaded successfully')

    } catch (error) {
      console.error(error);
      sendResponse(res, 500, false, {}, "Internal Server Error");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.downloadMultiInspectionList = async (req, res) => {
  const { reports, print_date,} = req.body;
  if (!reports) {
    return sendResponse(res, 400, false, {}, "Invalid or missing reports array");
  }

  try {
      
      let results = [];
      for (const { report_no_two } of JSON.parse(reports)) {
          let data = await getMultiFitupInspectionList(report_no_two);
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

      const template = fs.readFileSync("templates/multiFitupInspectionList.html", "utf-8");
      const renderHtml = ejs.render(template, {
          headerInfo,
          logoUrl1: process.env.LOGO_URL_1,
          logoUrl2: process.env.LOGO_URL_2,
          items: paginatedItems, 
          pagination: {
              // totalItems,
              // totalPages,
              // currentPage,
              // itemsPerPage
          }
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

exports.downloadMultiInspectionList = async (req, res) => {
  const { reports, print_date,} = req.body;
  if (!reports) {
    return sendResponse(res, 400, false, {}, "Invalid or missing reports array");
  }

  try {
      
      let results = [];
      for (const { report_no_two } of JSON.parse(reports)) {
          let data = await getMultiFitupInspectionList(report_no_two);
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

      const template = fs.readFileSync("templates/multiFitupInspectionList.html", "utf-8");
      const renderHtml = ejs.render(template, {
          headerInfo,
          logoUrl1: process.env.LOGO_URL_1,
          logoUrl2: process.env.LOGO_URL_2,
          items: paginatedItems, 
          pagination: {
              // totalItems,
              // totalPages,
              // currentPage,
              // itemsPerPage
          }
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

const getMultiFitupInspectionOffer = async (report_no) => {
  try {
    let matchObj = { deleted: false }
    if (report_no) {
      matchObj = { ...matchObj, report_no: report_no }
    }
    const requestData = await FitupInspection.aggregate([
      { $match: matchObj },
      { $unwind: "$items" },
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
          from: "drawing-issue-acceptances",
          localField: "issue_id",
          foreignField: "_id",
          as: "issueAcceptanceDetails",
        },
      },
      {
        $unwind: {
          path: "$issueAcceptanceDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          matchingItem: {
            $filter: {
              input: "$issueAcceptanceDetails.items",
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
          itemProfile: {
            $arrayElemAt: ["$transactionDetails.itemProfile", 0],
          },
          drawingDetails: {
            $arrayElemAt: ["$transactionDetails.drawingDetails", 0],
          },
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
      {
        $lookup: {
          from: "joint-types",
          localField: "items.joint_type",
          foreignField: "_id",
          as: "jointTypeDetails",
        },
      },
      {
        $addFields: {
          "items.joint_type": {
            $map: {
              input: "$jointTypeDetails",
              as: "jointType",
              in: "$$jointType.name"
            }
          }
        }
      },
      {
        $lookup: {
          from: "store-wps-masters",
          localField: "items.wps_no",
          foreignField: "_id",
          as: "wpsDetails",
        },
      },
      {
        $addFields: {
          "items.wps_no": { $arrayElemAt: ["$wpsDetails.wpsNo", 0] },
        },
      },
      {
        $project: {
          _id: 1,
          report_no: report_no ? "$report_no" : "$report_no_two",
          client: "$partyDetails.name",
          project_name: "$projectDetails.name",
          wo_no: "$projectDetails.work_order_no",
          project_po_no: "$projectDetails.work_order_no",
          offer_name: "$offerDetails.user_name",
          qc_time: report_no ? "$createdAt" : "$qc_time",
          items: {
            _id: "$items._id",
            drawing_no: "$drawingDetails.drawing_no",
            rev: "$drawingDetails.rev",
            assembly_no: "$drawingDetails.assembly_no",
            sheet_no: "$drawingDetails.sheet_no",
            grid_no: "$transactionDetails.grid_no",
            item_no: "$transactionDetails.item_no",
            issued_qty: { $arrayElemAt: ["$matchingItem.issued_qty", 0] },
            profile: "$itemProfile.name",
            imir_no: { $arrayElemAt: ["$matchingItem.imir_no", 0] },
            heat_no: { $arrayElemAt: ["$matchingItem.heat_no", 0] },
            joint_type: "$items.joint_type",
            remarks: report_no && "$items.remarks",

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
          date: "$_id.qc_time",
          offer_name: "$_id.offer_name",
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

const getMultiFitupInspectionList = async (report_no_two) => {
  try {
      let matchObj = { deleted: false };
      if (report_no_two) {
          matchObj = { ...matchObj, report_no_two: report_no_two };
      }

      const requestData = await FitupInspection.aggregate([
          { $match: matchObj },
          { $unwind: "$items" },
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
                  from: "drawing-issue-acceptances",
                  localField: "issue_id",
                  foreignField: "_id",
                  as: "issueAcceptanceDetails",
              },
          },
          {
              $unwind: {
                  path: "$issueAcceptanceDetails",
                  preserveNullAndEmptyArrays: true,
              },
          },
          {
              $addFields: {
                  matchingItem: {
                      $filter: {
                          input: "$issueAcceptanceDetails.items",
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
                              from:"erp-planner-drawings", 
                              localField:"drawingId", 
                              foreignField:"_id", 
                              as:"drawingDetails", 
                              pipeline:[
                                  {
                                      $lookup:{
                                          from:"bussiness-projects", 
                                          localField:"project", 
                                          foreignField:"_id", 
                                          as:"projectDetails", 
                                          pipeline:[
                                              { 
                                                  $lookup:{
                                                      from:"store-parties", 
                                                      localField:"party", 
                                                      foreignField:"_id", 
                                                      as:"partyDetails"
                                                  }
                                              }
                                          ]
                                      }
                                  }
                              ]
                          }
                      }
                  ],
              },
          },
          {
              $addFields:{
                  transactionDetails:{ $arrayElemAt:["$transactionDetails", 0] }
              }
          },
          {
              $addFields:{
                  itemProfile:{ 
                      $arrayElemAt:["$transactionDetails.itemProfile", 0] 
                  },
                  drawingDetails:{ 
                      $arrayElemAt:["$transactionDetails.drawingDetails", 0] 
                  }
              }
          },
          {
              $addFields:{
                  projectDetails:{
                      $arrayElemAt:[
                          "$drawingDetails.projectDetails", 
                          0
                      ]
                  }
              }
          },
          {
              $addFields:{
                  partyDetails:{
                      $arrayElemAt:[
                          "$projectDetails.partyDetails", 
                          0
                      ]
                  }
              }
          },

          {
              $lookup:{
                  from:"joint-types", 
                  localField:"items.joint_type", 
                  foreignField:"_id", 
                  as:"jointTypeDetails"
              }
          },

          {
              $addFields:{
                  "items.joint_type": { 
                      $map : { 
                          input : "$jointTypeDetails", 
                          as : "jointType", 
                          in : "$$jointType.name" 
                      }
                   }
              }
          },

          {
              $lookup:{
                  from:"store-wps-masters", 
                  localField:"items.wps_no", 
                  foreignField:"_id", 
                  as:"wpsDetails"
              }
          },

          {
              $addFields:{
                   "items.wps_no": { 
                       $arrayElemAt:["$wpsDetails.wpsNo", 0] 
                   }
               }
           },

           {
               $project:{
                   _id : 1,
                   report_no : "$report_no_two", // Include report_no_two
                   client : "$partyDetails.name", 
                   project_name : "$projectDetails.name", 
                   wo_no : "$projectDetails.work_order_no", 
                   project_po_no : "$projectDetails.work_order_no", 
                   offer_name : "$offerDetails.user_name", 
                   qc_name : "$qcDetails.user_name", // Include QC name
                   qc_time : "$qc_time", // Use appropriate QC time
                   items : { // Structure items with report number included
                       _id : "$items._id",
                       drawing_no : "$drawingDetails.drawing_no",
                       rev : "$drawingDetails.rev",
                       assembly_no : "$drawingDetails.assembly_no",
                       sheet_no : "$drawingDetails.sheet_no",
                       grid_no : "$transactionDetails.grid_no",
                       item_no : "$transactionDetails.item_no",
                       issued_qty : { $arrayElemAt:["$matchingItem.issued_qty", 0] }, // Match issued quantity
                       profile : "$itemProfile.name",
                       imir_no : { $arrayElemAt:["$matchingItem.imir_no", 0] }, // Match IMIR number
                       heat_no : { $arrayElemAt:["$matchingItem.heat_no", 0] }, // Match heat number
                       joint_type : "$items.joint_type",
                       remarks : "$items.qc_remarks",
                       wps_no: "$items.wps_no",
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
                      },
                   },
               }
           },

           {
               $group:{
                   _id:{
                       _id:"$_id",
                       report_no:"$report_no",
                       project_name:"$project_name",
                       wo_no:"$wo_no",
                       project_po_no:"$project_po_no",
                       client:"$client",
                       offer_name:"$offer_name",
                       qc_name: "$qc_name",
                       qc_time: "$qc_time",
                   },  
                   items:{ $push:"$items" } // Push all items into an array grouped by report number
               }
           },

           {
               $project:{
                   _id:"$_id._id",
                   client:"$_id.client",
                   project_name:"$_id.project_name",
                   report_no:"$_id.report_no",
                   wo_no:"$_id.wo_no",
                   project_po_no:"$_id.project_po_no",
                   date:"$_id.qc_time", // Include QC time if needed
                   qc_name :"$_id.qc_name" , // Include QC name in final projection
                   offer_name:"$_id.offer_name",
                   items : 1, // Include all grouped items in the output
               }
           }

      ]);

      if (requestData.length && requestData.length > 0) {
        return { status : 1 , result : requestData };
      } else{
        return { status : 0 , result : [] };
      }

  } catch (error) {
      return { status : 2 , result : error };
  }
};

const getOneFitupInspection = async (report_no, report_no_two) => {
  try {
    let matchObj = { deleted: false }
    if (report_no) {
      matchObj = { ...matchObj, report_no: report_no }
    }
    if (report_no_two) {
      matchObj = { ...matchObj, report_no_two: report_no_two }
    }

    const requestData = await FitupInspection.aggregate([
      { $match: matchObj },
      { $unwind: "$items" },
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
          from: "drawing-issue-acceptances",
          localField: "issue_id",
          foreignField: "_id",
          as: "issueAcceptanceDetails",
        },
      },
      {
        $unwind: {
          path: "$issueAcceptanceDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          matchingItem: {
            $filter: {
              input: "$issueAcceptanceDetails.items",
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
          itemProfile: {
            $arrayElemAt: ["$transactionDetails.itemProfile", 0],
          },
          drawingDetails: {
            $arrayElemAt: ["$transactionDetails.drawingDetails", 0],
          },
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
      {
        $lookup: {
          from: "joint-types",
          localField: "items.joint_type",
          foreignField: "_id",
          as: "jointTypeDetails",
        },
      },
      {
        $addFields: {
          "items.joint_type": {
            $map: {
              input: "$items.joint_type",
              as: "joint",
              in: {
                $let: {
                  vars: {
                    jointDetail: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$jointTypeDetails",
                            as: "jointDetail",
                            cond: { $eq: ["$$jointDetail._id", "$$joint"] },
                          },
                        },
                        0,
                      ],
                    },
                  },
                  in: {
                    _id: "$$jointDetail._id",
                    name: "$$jointDetail.name",
                  },
                },
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: "store-wps-masters",
          localField: "items.wps_no",
          foreignField: "_id",
          as: "wpsDetails",
        },
      },
      {
        $addFields: {
          "items.wps_no": { $arrayElemAt: ["$wpsDetails.wpsNo", 0] },
        },
      },
      {
        $project: {
          _id: 1,
          report_no: report_no ? "$report_no" : "$report_no_two",
          client: "$partyDetails.name",
          project_name: "$projectDetails.name",
          wo_no: "$projectDetails.work_order_no",
          project_po_no: "$projectDetails.work_order_no",
          offer_name: "$offerDetails.user_name",
          qc_name: "$qcDetails.user_name",
          qc_time: report_no ? "$createdAt" : "$qc_time",
          items: {
            _id: "$items._id",
            drawing_no: "$drawingDetails.drawing_no",
            rev: "$drawingDetails.rev",
            assembly_no: "$drawingDetails.assembly_no",
            sheet_no: "$drawingDetails.sheet_no",
            grid_no: "$transactionDetails.grid_no",
            item_no: "$transactionDetails.item_no",
            issued_qty: { $arrayElemAt: ["$matchingItem.issued_qty", 0] },
            profile: "$itemProfile.name",
            imir_no: { $arrayElemAt: ["$matchingItem.imir_no", 0] },
            heat_no: { $arrayElemAt: ["$matchingItem.heat_no", 0] },
            joint_type: "$items.joint_type",
            remarks: report_no ? "$items.remarks" : "$items.qc_remarks",
            ...(report_no_two && {
              wps_no: "$items.wps_no",
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
          date: "$_id.qc_time",
          qc_name: "$_id.qc_name",
          offer_name: "$_id.offer_name",
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


