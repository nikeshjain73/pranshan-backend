const NdtMaster = require("../../../models/erp/NDT/ndt_master.model");
const TestModel = require("../../../models/erp/Testing/test_offer_model");
const ndtModel = require("../../../models/erp/NDT/ndt.model");
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

exports.getNDT = async (req, res) => {
  if (req.user && !req.error) {
    let status = req.query.status
    let qurey = { deleted: false }
    if (status) {
      qurey.status = status
    }
    try {
      let data = await NdtMaster.find(qurey, { deleted: 0, __v: 0 })
        .populate({ path: 'weld_inspection_id', select: 'weld_report_qc_no fitup_id', populate: { path: 'fitup_id', select: 'items transaction_id', populate: { path: 'items.joint_type', select: 'name' } } })
        .populate({
          path: 'items.weldor_no',
          select: 'welderNo wpsNo',
          populate: {
            path: 'wpsNo',
            select: 'jointType weldingProcess',
            populate: {
              path: 'jointType.jointId',
              select: 'name'
            }
          }
        })

        .populate({
          path: 'items.transaction_id',
          select: 'itemName drawingId quantity item_no grid_no',
          populate: [
            { path: 'itemName', select: 'name' },
            {
              path: 'drawingId', select: 'drawing_no sheet_no rev assembly_no project',
              populate: { path: 'project', select: 'name party work_order_no', populate: { path: 'party', select: 'name' } }
            }
          ]
        })

        .populate({
          path: 'items.ndt_requirements',
          select: 'ndt_type',
          populate: { path: 'ndt_type', select: 'name' }
        })
        .sort({ createdAt: -1 }).lean()
      if (data) {
        sendResponse(res, 200, true, data, "NDT data found successfully");
      } else {
        sendResponse(res, 400, false, data, "NDT data not found");
      }
    } catch (err) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.manageNDT = async (req, res) => {
  const { id, weld_inspection_id, items, drawing_id } = req.body;

  if (req.user && !req.error) {
    if (weld_inspection_id && items && drawing_id) {
      try {
        const newItems = JSON.parse(items) || [];

        // Fetch the last NDT for voucher number generation
        let lastNdt = await NdtMaster.findOne({ deleted: false }, { deleted: 0 }, { sort: { createdAt: -1 } });
        let ndtVoucherNo = "1";
        if (lastNdt && lastNdt.ndt_voucher_no) {
          const split = lastNdt.ndt_voucher_no.split('/');
          const lastNdtNo = parseInt(split[split.length - 1]);
          ndtVoucherNo = lastNdtNo + 1;
        }
        const gen_voucher_no = TitleFormat.ndtVoucher + ndtVoucherNo;

        const testTypes = await ndtModel.find({ deleted: false }, { deleted: 0, __v: 0, status: 0 }).lean();
        let testLabel = testTypes.map(item => item.name);
        let testId = testTypes.map(item => item._id.toString());
        let categorizedItems = [];

        testId.forEach((id, index) => {
          let currentLabel = testLabel[index];
          let filteredItems = newItems
            .filter(item =>
              item.ndt_requirements.some(requirement => requirement.ndt_type === id)
            )
            .map(item => ({
              ndt_type: id,
              weldor_no: item.weldor_no,
              transaction_id: item.transaction_id,
            }));

          categorizedItems.push({
            label: currentLabel,
            items: filteredItems,
          });
        });

        // Check for 'None' type ID
        const noneTypeId = await ndtModel.findOne({ name: "None", deleted: false });

        if (!id) {
          if (newItems.length === 1 && newItems[0]?.ndt_requirements.length === 1) {
            const noneType = newItems[0].ndt_requirements[0]?.ndt_type;
            if (noneTypeId?._id.toString() === noneType) {
              const object = new NdtMaster({
                ndt_voucher_no: gen_voucher_no,
                weld_inspection_id: weld_inspection_id,
                items: newItems,
                drawing_id,
                status: 2, // Set status to 2 for 'None' type
              });

              await object.save();
              return sendResponse(res, 200, true, {}, "NDT created successfully");
            }
          }

          // Create a new NDT normally if the above condition is not met
          await NdtMaster.create({
            ndt_voucher_no: gen_voucher_no,
            weld_inspection_id: weld_inspection_id,
            items: newItems,
            drawing_id
          }).then(async (data) => {
            if (data) {
              const ndtMasterId = data._id;
              await Promise.all(categorizedItems.map(async item => {
                if (item.items[0]?.ndt_type) {
                  let combinedItems = item.items.map(elem => ({
                    weldor_no: elem.weldor_no,
                    transaction_id: elem.transaction_id,
                  }));

                  let testObject = {
                    ndt_master_id: ndtMasterId,
                    ndt_type_id: item.items[0]?.ndt_type,
                    items: combinedItems,
                    drawing_id: drawing_id,
                  };

                  await TestModel.create(testObject);
                }
              }));

              return sendResponse(res, 200, true, {}, "NDT master created successfully");
            }
          });
        } else {
          // Update existing NDT
          await NdtMaster.findByIdAndUpdate(id, {
            weld_inspection_id: weld_inspection_id,
            items: newItems
          }).then((data) => {
            if (data) {
              return sendResponse(res, 200, true, {}, "NDT master updated successfully");
            }
          });
        }
      } catch (error) {
        console.error(error);
        return sendResponse(res, 500, false, {}, "Something went wrong");
      }
    } else {
      return sendResponse(res, 400, false, {}, "Missing parameters");
    }
  } else {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

const getOneNDT = async (ndt_voucher_no) => {
  try {
    const requestData = await NdtMaster.aggregate([
      { $match: { deleted: false, ndt_voucher_no: ndt_voucher_no } },
      { $unwind: "$items" },
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
        $lookup: {
          from: "ndts",
          localField: "items.ndt_requirements.ndt_type",
          foreignField: "_id",
          as: "ndtDetails",
        },
      },
      {
        $addFields: {
          "items.ndt_requirements": {
            $map: {
              input: "$items.ndt_requirements",
              as: "req",
              in: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: "$ndtDetails",
                      as: "ndt",
                      cond: { $eq: ["$$ndt._id", "$$req.ndt_type"] },
                    },
                  },
                  0,
                ],
              },
            },
          },
        },
      },
      {
        $addFields: {
          "items.ndt_requirements": {
            $map: {
              input: "$items.ndt_requirements",
              as: "req",
              in: "$$req.name",
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          client: "$partyDetails.name",
          project_name: "$projectDetails.name",
          wo_no: "$projectDetails.work_order_no",
          items: {
            _id: "$items._id",
            ndt_requirements: "$items.ndt_requirements",
            drawing_no: "$drawingDetails.drawing_no",
            rev: "$drawingDetails.rev",
            assembly_no: "$drawingDetails.assembly_no",
            grid_no: "$transactionDetails.grid_no",
            profile: "$itemProfile.name",
            joint_type: "$joint_type",
            weld_process: "$weld_process",
            welder_no: "$welder_no",
          },
        },
      },
      {
        $group: {
          _id: {
            _id: "$_id",
            project_name: "$project_name",
            wo_no: "$wo_no",
            client: "$client",
          },
          items: { $push: "$items" },
        },
      },
      {
        $project: {
          _id: "$_id._id",
          client: "$_id.client",
          project_name: "$_id.project_name",
          wo_no: "$_id.wo_no",
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

exports.downloadOneNDT = async (req, res) => {
  const { ndt_voucher_no, print_date } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await getOneNDT(ndt_voucher_no)
      let requestData = data.result;

      if (data.status === 1) {
        const template = fs.readFileSync(
          "templates/NDTmasterItem.html",
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

        const pageHeight = await page.evaluate(() => {
          return document.body.scrollHeight;
        });

        const pdfBuffer = await page.pdf({
          height: pageHeight, 
          landscape: true, 
          format: "A4", 
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

        const filename = `ndt_master_${Date.now()}.pdf`;
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

exports.xlsxOneNDT = async (req, res) => {
  const { ndt_voucher_no, print_date } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await getOneNDT(ndt_voucher_no)
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
          font: { bold: false }, alignment: { horizontal: 'center', vertical: 'middle' },
        };

        const headerStyle4 = {
          font: { bold: true }, alignment: { horizontal: 'center', vertical: 'middle' },
        };

        const headerStyle5 = {
          font: { bold: true }, alignment: { horizontal: 'left', vertical: 'middle' },
        };

        // *** Do not remove space ***
        const ws_data = [
          [
            {
              v: `VISHAL ENTERPRISE & VRISHAL ENGINEERING PRIVATE LIMITED GROUP OF COMPANIES`, s: headerStyle2
            },
          ],
          [
            { v: `NDT MASTER LIST`, s: headerStyle4 },
            "", "", "", "", "",
            print_date ? { v: `Download Date : ${new Date().toLocaleDateString()}`, s: headerStyle4 } : "",
          ],
          [
            { v: `Client`, s: headerStyle5 },
            "",
            { v: `${requestData[0].client}`, s: headerStyle3 },
          ],
          [
            { v: `Project`, s: headerStyle5 },
            "",
            { v: `${requestData[0].project_name}`, s: headerStyle3 },
          ],
          [
            { v: `WO PO No.`, s: headerStyle5 },
            "",
            { v: `${requestData[0].wo_no}`, s: headerStyle3 },
          ],
          [
            "", "", "", "", "", "", "", "", "",
            { v: `NDT Requirements`, s: headerStyle },
          ],
        ];

        const headers = [
          { v: "Sr No.", s: headerStyle },
          { v: "Drawing No.", s: headerStyle },
          { v: "Rev No.", s: headerStyle },
          { v: "ASS. No.", s: headerStyle },
          { v: "Grid No.", s: headerStyle },
          { v: "Profile", s: headerStyle },
          { v: "Type Of Weld", s: headerStyle },
          { v: "Welding Process", s: headerStyle },
          { v: "Welder No.", s: headerStyle },
          { v: "UT", s: headerStyle },
          { v: "RT", s: headerStyle },
          { v: "LPT", s: headerStyle },
          { v: "MPT", s: headerStyle },
        ];

        ws_data.push(headers);

        requestData[0].items.forEach((detail, itemIndex) => {
          const row = [
            itemIndex + 1,
            detail.drawing_no || '--',
            detail.rev || '--',
            detail.assembly_no || '--',
            detail.grid_no || '--',
            detail.profile || '--',
            detail.joint_type || '--',
            detail.weld_process || '--',
            detail.welder_no || '--',
          ];
          const columns = ["UT", "LPT", "MPT", "RT"];

          columns.forEach(column => {
            if (detail.ndt_requirements && detail.ndt_requirements.includes(column)) {
              row.push('✓');
            } else {
              row.push('✗');
            }
          });

          ws_data.push(row);
        });
        ws_data.push([]);
        ws_data.push(
          [
            { v: `VE-NDT-STR-01`, s: headerStyle1 },
          ]
        );

        const colWidths = ws_data[6].map((_, colIndex) => ({
          wch: Math.max(
            ...ws_data.slice(6, 6 + requestData[0].items.length + 1).map(row => (
              row[colIndex]?.toString().length || 0
            ))
          ),
        }));

        colWidths[9].wch = 4;
        colWidths[10].wch = 4;
        colWidths[11].wch = 4;
        colWidths[12].wch = 4;

        ws = XLSX.utils.aoa_to_sheet(ws_data);
        ws['!cols'] = colWidths;

        ws['!merges'] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } },
          { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
          { s: { r: 1, c: 6 }, e: { r: 1, c: 12 } },
          { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } },
          { s: { r: 2, c: 2 }, e: { r: 2, c: 12 } },
          { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } },
          { s: { r: 3, c: 2 }, e: { r: 3, c: 12 } },
          { s: { r: 4, c: 0 }, e: { r: 4, c: 1 } },
          { s: { r: 4, c: 2 }, e: { r: 4, c: 12 } },
          { s: { r: 5, c: 0 }, e: { r: 5, c: 8 } },
          { s: { r: 5, c: 9 }, e: { r: 5, c: 12 } },
          { s: { r: ws_data.length - 1, c: 0 }, e: { r: ws_data.length - 1, c: 12 } },
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
      else if (data.status === 0) {
        sendResponse(res, 200, false, {}, `NDT detail not found`)
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