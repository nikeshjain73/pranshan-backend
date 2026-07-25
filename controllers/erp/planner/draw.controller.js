const Draw = require("../../../models/erp/planner/draw.model");
const TransactionItems = require("../../../models/store/transaction_item.model");
const GridItems = require("../../../models/erp/planner/draw_grid_items.model");
const Grid = require("../../../models/erp/planner/draw_grid.model");
const { sendResponse } = require("../../../helper/response");
const { Status } = require("../../../utils/enum");
const { default: mongoose } = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const ejs = require("ejs");
const fs = require("fs");
const XLSX = require('xlsx');  // for utility functions
const XLSXStyle = require('xlsx-style');  // for styling
const puppeteer = require("puppeteer");
const path = require("path");
const URI = process.env.PDF_URL;
const PATH = process.env.PDF_PATH;
const excelJs = require('exceljs');
const moment = require('moment');
const upload = require('../../../helper/multerConfig');
var parser = require('simple-excel-to-json');
const itemModel = require("../../../models/store/item.model");
const partyModel = require("../../../models/store/party.model");
const jointTypeModel = require("../../../models/erp/JointType/joint_type.model");
const Contractor = require("../../../models/erp/Contractor/contractor.model");
const User = require("../../../models/users.model");
const ErpRole = require("../../../models/erp/erp_role.model");
const Project = require("../../../models/project.model");
const addEmailJob = require("../../../utils/emailJob");
const sendEmail = require("../../../utils/sendEmail");
const commonStageOfferEmail = require("../../../utils/commonStageOfferEmail");
const commonStageAcceptanceEmail = require("../../../utils/commonStageAcceptanceEmail");

const getdrawingIssue = async (query) => {
  try {
    const drawingData = await Draw.find(query, { deleted: 0 }).populate({
      path: "issued_person",
      select: "name",
    });

    if (drawingData && drawingData.length > 0) {
      return { status: 1, result: drawingData };
    } else {
      return { status: 0, result: [] };
    }
  } catch (error) {
    return { status: 2, result: error };
  }
};

const formatToDate = (date) => {
  if (!isNaN(date) && typeof date === 'number') {
    const serialDate = new Date(0);
    serialDate.setDate(serialDate.getDate() + date - 25569);
    return serialDate.toISOString().split('T')[0];
  }

  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    return null;
  }

  const year = parsedDate.getFullYear();
  const month = ('0' + (parsedDate.getMonth() + 1)).slice(-2);
  const day = ('0' + parsedDate.getDate()).slice(-2);
  return `${year}-${month}-${day}`;
};


// exports.getDrawing = async (req, res) => {
//   if (req.user && !req.error) {
//     try {
     
//       let page = req.query.page ? parseInt(req.query.page) : null;
//       let limit = req.query.limit ? parseInt(req.query.limit) : null;
//       let skip = page && limit ? (page - 1) * limit : 0;

   
//       let query = { deleted: false };
//       if (req.query.project) {
//         query.project = req.query.project; 
//       }

//       const total = await Draw.countDocuments(query);

    
//       let drawQuery = Draw.find(query, { deleted: 0 })
//         .populate("issued_person", "name")
//         .populate({
//           path: "project",
//           select: "name firm_id party",
//           populate: [
//             { path: "firm_id", select: "name" },
//             { path: "party", select: "name" },
//           ],
//         })
//         .sort({ createdAt: -1 });

//       if (page && limit) {
//         drawQuery = drawQuery.skip(skip).limit(limit);
//       }

//       const drawingData = await drawQuery;

//       if (drawingData && drawingData.length > 0) {
//         sendResponse(
//           res,
//           200,
//           true,
//           {
//             data: drawingData,
//             pagination: page && limit ? {
//               total,
//               page,
//               pages: Math.ceil(total / limit),
//               limit,
//             } : null, 
//           },
//           "Drawing list"
//         );
//       } else {
//         sendResponse(res, 404, false, {}, "No drawings found");
//       }
//     } catch (err) {
//       console.error("getDrawing error:", err);
//       sendResponse(res, 500, false, {}, "Something went wrong");
//     }
//   } else {
//     sendResponse(res, 401, false, {}, "Unauthorized");
//   }
// };


exports.getDrawing = async (req, res) => {
  if (req.user && !req.error) {
    try {
      let page = req.query.page ? parseInt(req.query.page) : null;
      let limit = req.query.limit ? parseInt(req.query.limit) : null;
      let skip = page && limit ? (page - 1) * limit : 0;

      let query = { deleted: false };

      //  Project filter
      if (req.query.project) {
        query.project = req.query.project;
      }

      //  Search filter (Assembly No. / Drawing No.)
      if (req.query.search) {
        const search = req.query.search.trim();
        query.$or = [
          { assembly_no: { $regex: search, $options: "i" } },
          { drawing_no: { $regex: search, $options: "i" } },
        ];
      }

      // Count total after applying filters
      const total = await Draw.countDocuments(query);

      let drawQuery = Draw.find(query, { deleted: 0 })
        .populate("issued_person", "name")
        .populate({
          path: "project",
          select: "name firm_id party",
          populate: [
            { path: "firm_id", select: "name" },
            { path: "party", select: "name" },
          ],
        })
        .populate({
          path: "grid_items",
          match: { deleted: false },
          populate: [
            { path: "grid_id", select: "grid_no" },
            { path: "item_name", select: "name item_code" },
            { path: "joint_type", select: "name type" }
          ]
        })
        .sort({ createdAt: -1 })
        .lean();  

      if (page && limit) {
        drawQuery = drawQuery.skip(skip).limit(limit);
      }

      const drawingData = await drawQuery;

      if (drawingData && drawingData.length > 0) {
        sendResponse(
          res,
          200,
          true,
          {
            data: drawingData,
            pagination:
              page && limit
                ? {
                    total,
                    page,
                    pages: Math.ceil(total / limit),
                    limit,
                  }
                : null,
          },
          "Drawing list"
        );
      } else {
        sendResponse(res, 404, false, {}, "No drawings found");
      }
    } catch (err) {
      console.error("getDrawing error:", err);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};


exports.drawingIssueDownload = async (req, res) => {
  const { print_date, project } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await getdrawingIssue(project)
      let drawingData = data.result;

      if (data.status === 1) {
        const template = fs.readFileSync("templates/drawIssue.html", "utf-8");
        const renderedHtml = ejs.render(template, {
          drawingData,
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
          format: "A4",
          landscape: true,
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

        const filename = `drawing_issue_register_${Date.now()}.pdf`;
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
        sendResponse(res, 200, false, {}, `Material Inspaction not found`)
      }
      else if (data.status === 2) {
        sendResponse(res, 500, false, {}, "Something went wrong11");
      }
    } catch (error) {
      console.log(error, '222')
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.xlsxOfferInspactionItem = async (req, res) => {
  const { print_date } = req.body;

  if (req.user && !req.error) {
    try {
      const data = await getdrawingIssue()
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
            { v: `DRAWING ISSUE REGISTER`, s: headerStyle4 },
            "", "",
            print_date ? { v: `Download Date : ${new Date().toLocaleDateString()}`, s: headerStyle4 } : "",
          ],
        ];

        const headers = [
          { v: "Sr No.", s: headerStyle },
          { v: "Area", s: headerStyle },
          { v: "Drawing No.", s: headerStyle },
          { v: "Rev", s: headerStyle },
          { v: "Sheet No.", s: headerStyle },
          { v: "Iss. Date ", s: headerStyle },
          { v: "Iss To.", s: headerStyle },
        ];

        ws_data.push(headers);

        requestData.forEach((item, itemIndex) => {
          const row = [
            itemIndex + 1,
            item.unit || '--',
            item.drawing_no || '--',
            item.rev || '--',
            item.sheet_no || '--',
            item.issued_date ? new Date(item.issued_date).toLocaleDateString() : '--',
            item.issued_person.name || '--'
          ];

          ws_data.push(row);
        });
        ws_data.push([]);
        ws_data.push(
          [
            {
              v: `VE-STR-06`, s: headerStyle1
            },
          ]
        );

        const colWidths = ws_data[2].map((_, colIndex) => ({
          wch: Math.max(
            ...ws_data.slice(2, 2 + requestData.length + 1).map(row => (
              row[colIndex]?.toString().length || 0
            ))
          ),
        }));

        ws = XLSX.utils.aoa_to_sheet(ws_data);
        ws['!cols'] = colWidths;

        ws['!merges'] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
          { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
          { s: { r: 1, c: 3 }, e: { r: 1, c: 6 } },
          { s: { r: ws_data.length - 1, c: 0 }, e: { r: ws_data.length - 1, c: 6 } },
        ];

        XLSX.utils.book_append_sheet(wb, ws, `Drawing Issue Register`);

        const xlsxPath = path.join(__dirname, '../../../xlsx');

        if (!fs.existsSync(xlsxPath)) {
          fs.mkdirSync(xlsxPath, { recursive: true });
        }

        const filename = `drawing_issue_register_${Date.now()}.xlsx`;
        const filePath = path.join(xlsxPath, filename);

        await XLSXStyle.writeFile(wb, filePath);


        const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
        const fileUrl = `${protocol}://${req.get('host')}/xlsx/${filename}`;

        sendResponse(res, 200, true, { file: fileUrl }, `XLSX file generated successfully`)

      }
      else if (data.status === 0) {
        sendResponse(res, 200, false, {}, `Stock report not found`)
      }
      else if (data.status === 2) {
        console.log("error", data.result);
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

// Drawing Based Details
exports.oneDrawingDownload = async (req, res) => {
  const { id, print_date } = req.body;
  if (req.user && !req.error) {
    try {
      const requestData = await Draw.aggregate([
        { $match: { deleted: false, _id: new ObjectId(id) } },
        {
          $lookup: {
            from: "store_transaction_items",
            localField: "_id",
            foreignField: "drawingId",
            as: "transItemDetails",
            pipeline: [
              {
                $lookup: {
                  from: "store-items",
                  localField: "itemName",
                  foreignField: "_id",
                  as: "itemDetails",
                },
              },
              {
                $addFields: {
                  itemName: { $arrayElemAt: ["$itemDetails.name", 0] },
                },
              },
              {
                $project: {
                  itemDetails: 0,
                  drawingId: 0,
                  status: 0,
                  deleted: 0,
                  createdAt: 0,
                  updatedAt: 0,
                  __v: 0
                },
              },
            ],
          },
        },
        {
          $project: {
            drawing_pdf: 0,
            project: 0,
            drawing_pdf_name: 0,
            status: 0,
            deleted: 0,
            createdAt: 0,
            updatedAt: 0,
            __v: 0,
            issued_date: 0,
            issued_person: 0
          },
        },
      ]);

      // sendResponse(res, 200, true, requestData, "PDF downloaded Successfully");

      if (requestData && requestData.length > 0) {
        const template = fs.readFileSync("templates/drawItems.html", "utf-8");
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

        const filename = `drawing_items_${Date.now()}.pdf`;
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
      } else {
        sendResponse(res, 200, false, {}, "PDF data not found");
      }
    } catch (error) {
      console.log("error", error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.getAdminDrawing = async (req, res) => {
  const { id, date, status } = req.body;
  if (req.user && !req.error) {
    try {
      let query = { deleted: false };
      if (status) {
        query.status = status;
      }
      if (date) {
        query.draw_receive_date = date;
      }
      if (id) {
        query._id = id;
      }

      const drawingData = await Draw.find(query, { deleted: 0 })
        .populate("issued_person", "name")
        .populate({
          path: "project",
          select: "name firm_id party",
          populate: [
            { path: "firm_id", select: "name" },
            { path: "party", select: "name" },
          ],
        })
        .sort({ createdAt: -1 });

      // const finalData = await Promise.all(
      //   drawingData.map(async (elem) => {
      //     const items = await TransactionItems.find(
      //       { deleted: false, drawingId: elem?._id },
      //       { deleted: 0 }
      //     ).populate("itemName", "name");
      //     return { ...elem.toObject(), items };
      //   })
      // );

      if (drawingData) {
        sendResponse(res, 200, true, drawingData, "Drawing list");
      } else {
        sendResponse(res, 400, false, {}, "Drawing not found");
      }
    } catch (err) {
      sendResponse(res, 500, false, {}, "Something went wrong" + err);
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.manageDrawing = async (req, res) => {
  if (req.user && !req.error) {
    const {
      project,
      drawing_no,
      draw_receive_date,
      unit,
      sheet_no,
      rev,
      assembly_no,
      assembly_quantity,
      drawing_pdf,
      drawing_pdf_name,
      status,
      id,
    } = req.body;

    if (
      project &&
      drawing_no &&
      draw_receive_date &&
      unit &&
      rev &&
      assembly_no &&
      drawing_pdf &&
      drawing_pdf_name
    ) {
      const drawing = new Draw({
        project: project,
        drawing_no: drawing_no,
        draw_receive_date: draw_receive_date,
        unit: unit,
        rev: rev,
        assembly_no: assembly_no,
        assembly_quantity: assembly_quantity,
        master_updation_date: Date.now(),
        drawing_pdf: drawing_pdf,
        drawing_pdf_name: drawing_pdf_name,
        sheet_no: sheet_no,
      });

      if (!id) {

        const checkDrawing = await Draw.findOne({ project: new ObjectId(project), rev, assembly_no, drawing_no, unit, deleted: false });
        if (checkDrawing) {
          sendResponse(res, 400, false, {}, "Drawing already exists");
          return;
        }
        try {
          await drawing
            .save(drawing)
            .then((data) => {
              sendResponse(
                res,
                200,
                true,
                data,
                "Drawing added successfully"
              );
            })
            .catch((error) => {
              sendResponse(
                res,
                400,
                false,
                {},
                "Drawing already exists" + error
              );
            });
        } catch (error) {
          sendResponse(res, 500, false, {}, "Something went wrong");
        }
      } else {
        await Draw.findByIdAndUpdate(id, {
          project: project,
          drawing_no: drawing_no,
          draw_receive_date: draw_receive_date,
          unit: unit,
          rev: rev,
          assembly_no: assembly_no,
          assembly_quantity: assembly_quantity,
          master_updation_date: Date.now(),
          drawing_pdf: drawing_pdf,
          drawing_pdf_name: drawing_pdf_name,
          sheet_no: sheet_no,
          status: status,
        }).then((data) => {
          if (data) {
            sendResponse(res, 200, true, {}, "Drawing updated successfully");
          } else {
            sendResponse(res, 200, true, {}, "Drawing not found");
          }
        });
      }
    } else {
      sendResponse(res, 400, false, {}, "Missing parameters");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.deleteDrawing = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error && id) {
    try {
      await Draw.findByIdAndUpdate(id, { deleted: true }).then((data) => {
        if (data) {
          sendResponse(res, 200, true, {}, "Drawing deleted successfully");
        }
      });
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.getProjectDrawings = async (req, res) => {
  const { project, date, status, contractor } = req.body;
  if (req.user && !req.error) {
    try {
      let query = {};
      if (date) {
        query.draw_receive_date = date;
      }
      if (status) {
        query.status = status;
      }
      if (project) {
        query.project = project;
      }
      if (contractor) {
        query.issued_person = contractor;
      }
      const drawingList = await Draw.find(query)
        .sort({ createdAt: -1 })
        .populate({
          path: "project",
          select: "name firm_id",
          populate: [{ path: "firm_id", select: "name" }],
        })
        .populate('issued_person', 'name')

      const message =
        drawingList.length === 0 ? "No drawing found" : "Drawing image list";
      const resStatus = drawingList.length === 0 ? false : true;

      sendResponse(res, 200, resStatus, drawingList, message);
    } catch (err) {
      console.error(err);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.issueDrawing = async (req, res) => {
  let { id, issued_date, issued_person,project_name,project_id } = req.body;

  if (req.user && !req.error) {
    if (!id || !issued_date || !issued_person) {
      sendResponse(res, 400, false, {}, "Missing parameter");
      return;
    }

    try {
      // Always try to parse
      try {
        id = JSON.parse(id);
      } catch (e) {
        // if not JSON, leave it
      }

      let result;

      if (Array.isArray(id)) {
        result = await Draw.updateMany(
          { _id: { $in: id } },
          {
            $set: {
              issued_date,
              issued_person,
              status: Status.Approved,
            },
          }
        );

        if (result.modifiedCount > 0) {
          sendResponse(res, 200, true, {}, "Drawings issued successfully");
        } else {
          sendResponse(res, 404, false, {}, "No drawings found to update");
        }
      } else {
        result = await Draw.findByIdAndUpdate(
          id,
          {
            issued_date,
            issued_person,
            status: Status.Approved,
          },
          { new: true }
        );

        if (result) {
          sendResponse(res, 200, true, {}, "Drawing issued successfully");
        } else {
          sendResponse(res, 404, false, {}, "Drawing not found");
        }
      }
/* =========================================================
   SEND EMAIL TO CONTRACTOR + PRODUCTION USERS
========================================================= */

try {

  let emailUsers = [];

  /* ---------------- CONTRACTOR ---------------- */

  const contractor =
    await Contractor.findById(
      issued_person
    );

  if (
    contractor?.email
  ) {

    emailUsers.push({
      name:
        contractor?.name || "-",

      contractorName:
        contractor?.name || "-",

      email:
        contractor.email
    });

  }

  const projectData =
    await Project.findById(
      project_id
    ).select(
      "name work_order_no"
    );

  /* ---------------- PRODUCTION USERS ---------------- */

  const productionRoles =
    await ErpRole.find({

      deleted:false,

      name:{
        $in:[
          "Production Engineer"
        ]
      }

    });

  const productionRoleIds =
    productionRoles.map(
      role => role._id
    );

  const productionUsers =
    await User.find({

      deleted:false,

      status:true,

      structureRole:{
        $in:productionRoleIds
      },

      email:{
        $exists:true,
        $ne:""
      }

    });

  productionUsers.forEach(user => {

    if (
      !emailUsers.some(
        u => u.email === user.email
      )
    ) {

      emailUsers.push({

        name:
          user?.user_name || "-",

        contractorName:
          contractor?.name || "-",

        email:
          user.email

      });

    }

  });

  /* ---------------- DRAWING NUMBERS ---------------- */

  let drawingNos = [];

  if (Array.isArray(id)) {

    const drawings =
      await Draw.find({
        _id: { $in: id }
      }).select("drawing_no");

    drawingNos =
      drawings.map(
        d => d.drawing_no
      );

  } else {

    drawingNos = [
      result?.drawing_no || "-"
    ];

  }

  /* ---------------- SEND EMAIL ---------------- */

  const issuedDateFormat =
    issued_date
      ? new Date(issued_date)
          .toLocaleDateString(
            "en-IN",
            {
              day: "2-digit",
              month: "2-digit",
              year: "numeric"
            }
          )
      : "-";

  for (
    const user
    of emailUsers
  ) {

    try {

      const html =
        commonStageOfferEmail({

          userName:
            user?.name || "-",

          module:
            "Structural",

          stageName:
            "Issued Drawing",

          drawingNo:
            drawingNos.join(", "),

          contractorName:
            user?.contractorName || "-",

          projectName:
            project_name || "-",

          workOrderNo:
            projectData?.work_order_no || "-",

          // offeredBy:
          //   req.user?.user_name || "-",

          offerDateTime:
            new Date()
              .toLocaleString(
                "en-IN",
                {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: true
                }
              )
              .replace("am", "AM")
              .replace("pm", "PM"),

          remarks:
            `Drawing No: ${drawingNos.join(", ")} has been issued to contractor ${contractor?.name || "-"}. Please proceed with Material issue Request.`,

          loginUrl:
            process.env.ERP_URL

        });

      addEmailJob({

        to:
          user.email,

        subject:
          `Issued Drawing - ${drawingNos.join(", ")}`,

        html

      });

      console.log(
        `DRAWING EMAIL QUEUED -> ${user.email}`
      );

    }
    catch(mailErr){

      console.log(
        `DRAWING MAIL ERROR ${user.email}`,
        mailErr.message
      );

    }

  }

}
catch(emailErr){

  console.log(
    "DRAWING EMAIL ERROR :",
    emailErr
  );

}
    } catch (err) {
      console.error("Error issuing drawings:", err);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorised");
  }
};

exports.getDPReport = async (req, res) => {
  if (req.user && !req.error) {
    const drawingReport = await Draw.aggregate([
      {
        $match: {
          deleted: false,
        },
      },
      {
        $lookup: {
          from: "parties",
          localField: "party",
          foreignField: "_id",
          as: "clientData",
        },
      },
      {
        $lookup: {
          from: "contractors",
          localField: "issued_person",
          foreignField: "_id",
          as: "contractorData",
        },
      },
      {
        $lookup: {
          from: "store_transaction_items",
          localField: "_id",
          foreignField: "drawingId",
          as: "drawingItems",
        },
      },
      {
        $lookup: {
          from: "drawing-issue_requests",
          localField: "_id",
          foreignField: "drawing_id",
          as: "issueData",
        },
      },
      {
        $lookup: {
          from: "drawing-issue-acceptances",
          localField: "_id",
          foreignField: "drawing_id",
          as: "acceptanceData",
        },
      },
      {
        $lookup: {
          from: "erp-fitup-inspections",
          localField: "_id",
          foreignField: "drawing_id",
          as: "fitupData",
        },
      },
      {
        $lookup: {
          from: "erp-weld-inspection-offers",
          localField: "_id",
          foreignField: "drawing_id",
          as: "weldData",
        },
      },
      {
        $lookup: {
          from: "erp-paint-surfaces",
          localField: "_id",
          foreignField: "drawing_id",
          as: "surfaceData",
        },
      },
      {
        $lookup: {
          from: "erp-paint-mios",
          localField: "_id",
          foreignField: "drawing_id",
          as: "mioData",
        },
      },
      {
        $lookup: {
          from: "erp-paint-final-coats",
          localField: "_id",
          foreignField: "drawing_id",
          as: "finalCoatData",
        },
      },
      {
        $lookup: {
          from: "erp-painting-dispatch-notes",
          localField: "_id",
          foreignField: "drawing_id",
          as: "dispatchData",
        },
      },
      {
        $project: {
          _id: 1,
          drawing_no: 1,
          draw_receive_date: 1,
          unit: 1,
          rev: 1,
          assembly_no: 1,
          assembly_quantity: 1,
          project: 1,
          client: "$clintData",
          total_item_weight: {
            $reduce: {
              input: "$drawingItems.item_weight",
              initialValue: 0,
              in: { $add: ["$$value", "$$this"] }
            }
          },
          status: 1,
          issued_date: 1,
          issued_person: 1,
          contractor_name: { $ifNull: [{ $arrayElemAt: ['$contractorData.name', 0] }, ''] },
          material_issue_date: { $ifNull: [{ $arrayElemAt: ['$issueData.createdAt', 0] }, ''] },
          material_acceptance_date: { $ifNull: [{ $arrayElemAt: ['$acceptanceData.createdAt', 0] }, ''] },
          fitup_issue_date: { $ifNull: [{ $arrayElemAt: ['$fitupData.createdAt', 0] }, ''] },
          // fitup_accepted_date: { $ifNull: [{ $arrayElemAt: ['$fitupData.qc_time', 0] }, ''] },
          // fitup_accepted_date: {
          //   $cond: {
          //     if: { $eq: [{ $arrayElemAt: ["$fitupData.qc_status", 0] }, true] },
          //     then: { $ifNull: [{ $arrayElemAt: ["$fitupData.qc_time", 0] }, ''] },
          //     else: ''
          //   }
          // },

          fitup_accepted_date: {
            $let: {
              vars: {
                sortedFitup: {
                  $sortArray: {
                    input: {
                      $filter: {
                        input: "$fitupData",
                        as: "fitup",
                        cond: { $eq: ["$$fitup.qc_status", true] }
                      }
                    },
                    sortBy: { qc_time: -1 }
                  }
                }
              },
              in: { $ifNull: [{ $arrayElemAt: ["$$sortedFitup.qc_time", 0] }, ''] }
            }
          },

          fitup_rej_date: {
            $let: {
              vars: {
                sortedFitup: {
                  $sortArray: {
                    input: {
                      $filter: {
                        input: "$fitupData",
                        as: "fitup",
                        cond: { $eq: ["$$fitup.qc_status", false] }
                      }
                    },
                    sortBy: { qc_time: -1 }
                  }
                }
              },
              in: { $ifNull: [{ $arrayElemAt: ["$$sortedFitup.qc_time", 0] }, ''] }
            }
          },


          weld_visual_issue_date: { $ifNull: [{ $arrayElemAt: ['$weldData.createdAt', 0] }, ''] },

          // weld_visual_accepted_date: {
          //   $cond: {
          //     if: { $eq: [{ $arrayElemAt: ["$weldData.qc_status", 0] }, true] },
          //     then: { $ifNull: [{ $arrayElemAt: ["$weldData.qc_time", 0] }, ''] },
          //     else: ''
          //   }
          // },

          weld_visual_accepted_date: {
            $let: {
              vars: {
                sortedWeld: {
                  $sortArray: {
                    input: {
                      $filter: {
                        input: "$weldData",
                        as: "weld",
                        cond: { $eq: ["$$weld.qc_status", true] }
                      }
                    },
                    sortBy: { qc_time: -1 }
                  }
                }
              },
              in: { $ifNull: [{ $arrayElemAt: ["$$sortedWeld.qc_time", 0] }, ''] }
            }
          },

          weld_visual_rej_date: {
            $let: {
              vars: {
                sortedWeld: {
                  $sortArray: {
                    input: {
                      $filter: {
                        input: "$weldData",
                        as: "weld",
                        cond: { $eq: ["$$weld.qc_status", false] }
                      }
                    },
                    sortBy: { qc_time: -1 }
                  }
                }
              },
              in: { $ifNull: [{ $arrayElemAt: ["$$sortedWeld.qc_time", 0] }, ''] }
            }
          },

          surface_primer_offer_date: { $ifNull: [{ $arrayElemAt: ['$surfaceData.createdAt', 0] }, ''] },
          // surface_primer_accepted_date: { $ifNull: [{ $arrayElemAt: ['$surfaceData.qc_time', 0] }, ''] },

          surface_primer_accepted_date: {
            $let: {
              vars: {
                sortedSurface: {
                  $sortArray: {
                    input: {
                      $filter: {
                        input: "$surfaceData",
                        as: "surface",
                        cond: { $eq: ["$$surface.qc_status", true] }
                      }
                    },
                    sortBy: { qc_time: -1 }
                  }
                }
              },
              in: { $ifNull: [{ $arrayElemAt: ["$$sortedSurface.qc_time", 0] }, ''] }
            }
          },

          surface_primer_rejected_date: {
            $let: {
              vars: {
                sortedSurface: {
                  $sortArray: {
                    input: {
                      $filter: {
                        input: "$surfaceData",
                        as: "surface",
                        cond: { $eq: ["$$surface.qc_status", false] }
                      }
                    },
                    sortBy: { qc_time: -1 }
                  }
                }
              },
              in: { $ifNull: [{ $arrayElemAt: ["$$sortedSurface.qc_time", 0] }, ''] }
            }
          },

          mio_offer_date: { $ifNull: [{ $arrayElemAt: ['$mioData.createdAt', 0] }, ''] },

          mio_accepted_date: {
            $let: {
              vars: {
                sortedMio: {
                  $sortArray: {
                    input: {
                      $filter: {
                        input: "$mioData",
                        as: "mio",
                        cond: { $eq: ["$$mio.qc_status", true] }
                      }
                    },
                    sortBy: { qc_time: -1 }
                  }
                }
              },
              in: { $ifNull: [{ $arrayElemAt: ["$$sortedMio.qc_time", 0] }, ''] }
            }
          },

          mio_rejected_date: {
            $let: {
              vars: {
                sortedMio: {
                  $sortArray: {
                    input: {
                      $filter: {
                        input: "$mioData",
                        as: "mio",
                        cond: { $eq: ["$$mio.qc_status", false] }
                      }
                    },
                    sortBy: { qc_time: -1 }
                  }
                }
              },
              in: { $ifNull: [{ $arrayElemAt: ["$$sortedMio.qc_time", 0] }, ''] }
            }
          },

          final_coat_offer_date: { $ifNull: [{ $arrayElemAt: ['$finalCoatData.createdAt', 0] }, ''] },
          // final_coat_accepted_date: { $ifNull: [{ $arrayElemAt: ['$finalCoatData.qc_time', 0] }, ''] },

          final_coat_accepted_date: {
            $let: {
              vars: {
                sortedFinalCoat: {
                  $sortArray: {
                    input: {
                      $filter: {
                        input: "$finalCoatData",
                        as: "finalCoat",
                        cond: { $eq: ["$$finalCoat.qc_status", true] }
                      }
                    },
                    sortBy: { qc_time: -1 }
                  }
                }
              },
              in: { $ifNull: [{ $arrayElemAt: ["$$sortedFinalCoat.qc_time", 0] }, ''] }
            }
          },

          final_coat_rejected_date: {
            $let: {
              vars: {
                sortedFinalCoat: {
                  $sortArray: {
                    input: {
                      $filter: {
                        input: "$finalCoatData",
                        as: "finalCoat",
                        cond: { $eq: ["$$finalCoat.qc_status", false] }
                      }
                    },
                    sortBy: { qc_time: -1 }
                  }
                }
              },
              in: { $ifNull: [{ $arrayElemAt: ["$$sortedFinalCoat.qc_time", 0] }, ''] }
            }
          },

          dispatchDate: { $ifNull: [{ $arrayElemAt: ['$dispatchData.dispatch_date', 0] }, ''] },
        },
      },
    ]);

    sendResponse(res, 200, true, drawingReport, 'Drawing report fetched successfully');
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.downloadExcelDPReport = async (req, res) => {
  let { drawingReport } = req.body;
  if (req.user && !req.error) {
    const workBook = new excelJs.Workbook();
    const worksheet = workBook.addWorksheet("Daily-Progress-Report");
    drawingReport = JSON.parse(drawingReport);

    worksheet.mergeCells('A1:U1');
    worksheet.getCell('A1').value = "Vishal Enterprise & VRISHAL ENGINEERING PRIVATE LIMITED group of companies";
    worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getCell('A1').font = { bold: true, size: 24 };

    worksheet.mergeCells('A2:U2');
    worksheet.getCell('A2').value = "Client: PROJECT-1";
    worksheet.getCell('A2').alignment = { vertical: 'left', horizontal: 'left' };
    worksheet.getCell('A2').font = { bold: true, size: 12 };

    worksheet.mergeCells('A3:U3');
    worksheet.getCell('A3').value = "Daily Progress Report";
    worksheet.getCell('A3').alignment = { vertical: 'left', horizontal: 'left' };
    worksheet.getCell('A3').font = { bold: true, size: 12 };

    const headers = [
      'SNO', 'Drawing No', 'Assembly No', 'Rev', 'Quantity',
      'Assembly Weight', 'Total Weight', 'Issued Date', 'Contractor Name',
      'Material Issue Date', 'Material Acceptance Date', 'Fitup Issue Date',
      'Fitup Accepted Date', 'Weld Visual Issue Date', 'Weld Visual Accepted Date',
      'Surface Primer Offer Date', 'Surface Primer Accepted Date',
      'MIO Offer Date', 'MIO Accepted Date', 'Final Coat Offer Date', 'Final Coat Accepted Date'
    ];
    worksheet.getRow(4).values = headers;

    let colIndex = 1;
    headers.forEach((header) => {
      worksheet.mergeCells(4, colIndex, 5, colIndex);
      colIndex += 1;
    });

    const headerRow = worksheet.getRow(4);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FAE2D5' },
      };
    });

    worksheet.columns = headers.map((header, i) => {
      return {
        width: Math.max(20, header.length + 5),
      };
    });
    let totalQty = 0, totalWeight = 0, tassemWeight = 0;

    drawingReport.forEach((elem, i) => {
      (totalWeight += elem.total_item_weight);
      (totalQty += elem.assembly_quantity);
      (tassemWeight += elem.total_assembly_weight);
      const row = worksheet.addRow([
        i + 1,
        elem.drawing_no,
        elem.assembly_no,
        elem.rev,
        elem.assembly_quantity === '' ? 0 : elem.assembly_quantity,
        elem.total_assembly_weight === '' ? 0 : elem.total_assembly_weight,
        elem.total_item_weight === '' ? 0 : elem.total_item_weight,
        moment(elem.issued_date).local().format('DD-MM-YYYY hh:mm a'),
        elem.contractor_name,
        elem.material_issue_date ? moment(elem.material_issue_date).local().format('DD-MM-YYYY hh:mm a') : '-',
        elem.material_acceptance_date ? moment(elem.material_acceptance_date).local().format('DD-MM-YYYY hh:mm a') : '-',
        elem.fitup_issue_date ? moment(elem.fitup_issue_date).local().format('DD-MM-YYYY hh:mm a') : '-',
        elem.fitup_accepted_date ? moment(elem.fitup_accepted_date).local().format('DD-MM-YYYY hh:mm a') : '-',
        elem.weld_visual_issue_date ? moment(elem.weld_visual_issue_date).local().format('DD-MM-YYYY hh:mm a') : '-',
        elem.weld_visual_accepted_date ? moment(elem.weld_visual_accepted_date).local().format('DD-MM-YYYY hh:mm a') : '-',
        elem.surface_primer_offer_date ? moment(elem.surface_primer_offer_date).local().format('DD-MM-YYYY hh:mm a') : '-',
        elem.surface_primer_accepted_date ? moment(elem.surface_primer_accepted_date).local().format('DD-MM-YYYY hh:mm a') : '-',
        elem.mio_offer_date ? moment(elem.mio_offer_date).local().format('DD-MM-YYYY hh:mm a') : '-',
        elem.mio_accepted_date ? moment(elem.mio_accepted_date).local().format('DD-MM-YYYY hh:mm a') : '-',
        elem.final_coat_offer_date ? moment(elem.final_coat_offer_date).local().format('DD-MM-YYYY hh:mm a') : '-',
        elem.final_coat_accepted_date ? moment(elem.final_coat_accepted_date).local().format('DD-MM-YYYY hh:mm a') : '-'
      ]);

      row.eachCell((cell) => {
        cell.alignment = { vertical: 'middle', horizontal: 'center' }; // Center alignment
      });
    });

    // Adding empty rows for spacing
    worksheet.addRow([]);
    worksheet.addRow([]);
    worksheet.addRow([]);

    const totalRow = worksheet.addRow([
      'Total',
      '', '', '', isNaN(totalQty) ? '0' : `${totalQty.toString()}`, isNaN(tassemWeight) ? '0' : `${tassemWeight.toString()}`, isNaN(totalWeight) ? '0' : `${totalWeight.toString()}`, '', '', '', '', '', '', '', '', '', '', '', '', '', ''
    ]);

    totalRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    totalRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    totalRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    const filePath = path.join(__dirname, '../../../xlsx/Daily-progress-report.xlsx');

    await workBook.xlsx.writeFile(filePath);
    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const fileUrl = `${protocol}://${req.get('host')}/xlsx/Daily-progress-report.xlsx`;

    sendResponse(res, 200, true, { file: fileUrl }, 'XLSX file downloaded successfully');
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
}

exports.importDrawing = async (req, res) => {
  if (!req.user || req.error) {
    return sendResponse(res, 401, false, {}, 'Unauthorized');
  }
  upload(req, res, async (err) => {
    const { project } = req.body;
    if (!project) {
      return sendResponse(res, 400, false, {}, 'Project is required');
    }
    if (!req.file) {
      return sendResponse(res, 400, false, {}, 'Select an Excel file');
    }
    if (req.file.mimetype !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      fs.unlinkSync(req.file.path);
      return sendResponse(res, 400, false, {}, 'Invalid file type. Please upload an Excel file');
    }
    if (err) {
      return sendResponse(res, 400, false, {}, `File not uploaded: ${err.message}`);
    }
    try {
      const data = parser.parseXls2Json(req.file.path);
      const result = data.at(0);
      const entries = [];
      for (let draw of result) {
        const { drawing_no, draw_receive_date, unit, sheet_no, rev, assembly_no, assembly_quantity, drawing_pdf_name } = draw;
        const dateFormat = formatToDate(draw_receive_date);
        const newDrawing = {
          project: project,
          drawing_no,
          draw_receive_date: dateFormat,
          unit,
          sheet_no,
          rev,
          assembly_no,
          assembly_quantity,
          drawing_pdf_name
        };

        entries.push(newDrawing);
      }
      await Draw.insertMany(entries);
      sendResponse(res, 200, true, {}, 'Data imported successfully');
    } catch (err) {
      sendResponse(res, 500, false, {}, 'Internal server error');
    } finally {
      fs.unlinkSync(req.file.path);
    }
  })
}

exports.uploadDrawingPdf = async (req, res) => {
  if (req.user && !req.error) {
    const { id, drawing_pdf } = req.body;
    if (drawing_pdf) {
      try {
        const uploadDraw = await Draw.findByIdAndUpdate(id, { drawing_pdf: drawing_pdf })
        if (uploadDraw) {
          sendResponse(res, 200, true, {}, "Drawing pdf uploaded successfully");
        } else {
          sendResponse(res, 200, true, {}, "Drawing not found");
        }
      } catch (error) {
        sendResponse(res, 500, false, {}, "Something went wrong");
      }
    } else {
      sendResponse(res, 400, false, {}, "Missing parameters");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
}

exports.getRequestImportSample = async (req, res) => {
  if (!req.user) {
    return sendResponse(res, 401, false, {}, 'Unauthorized');
  }

  try {
    const filePath = path.join(__dirname, '../../../xlsx/request-item-import-sample.xlsx');
    const workBook = new excelJs.Workbook();
    const worksheet = workBook.addWorksheet('Drawing-import');

    worksheet.columns = [
      { header: 'SR', key: 'sr', width: '5' },
      { header: 'SECTION_DETAILS', key: 'itemName', width: '50' },
      { header: 'MCODE', key: 'mcode', width: '15' },
      { header: 'STORE', key: 'store', width: '10' },
      { header: 'QTY', key: 'qty', width: '10' },
      { header: 'RATE', key: 'rate', width: '15' },
      { header: 'TOTAL', key: 'total', width: '20' },
      { header: 'REMARKS', key: 'remarks', width: '40' },
      { header: 'MANUFACTURER', key: 'manufacturer', width: '30' },
      { header: 'SUPPLIER', key: 'supplier', width: '30' },
    ];

    worksheet.getRow(1).eachCell(cell => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFF00' }
      };
    });

    await workBook.xlsx.writeFile(filePath);

    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const fileUrl = `${protocol}://${req.get('host')}/xlsx/request-item-import-sample.xlsx`;
    sendResponse(res, 200, true, { file: fileUrl }, 'XLSX file downloaded successfully');


  } catch (error) {
    console.error(error);
    return sendResponse(res, 500, false, {}, "Something went wrong");
  }
}

exports.importRequestItem = async (req, res) => {

  if (!req.user || req.error) {
    return sendResponse(res, 401, false, {}, 'Unauthorized');
  }

  upload(req, res, async (err) => {
    if (!req.file) {
      return sendResponse(res, 400, false, {}, 'Select an Excel file');
    }
    const { project } = req.body;
    if (req.file.mimetype !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      fs.unlinkSync(req.file.path);
      return sendResponse(res, 400, false, {}, 'Invalid file type. Please upload an Excel file');
    }
    if (err) {
      return sendResponse(res, 400, false, {}, `File not uploaded: ${err.message}`);
    }

    try {
      const data = parser.parseXls2Json(req.file.path);
      const result = data[0].filter((p) => p.SECTION_DETAILS !== '' && p.QTY !== "");
      const entries = [];
      const errors = [];

      for (const item of result) {
        const { SR, SECTION_DETAILS, MCODE, STORE, QTY, RATE, TOTAL, REMARKS, MANUFACTURER, SUPPLIER } = item;

        const itemDetails = await itemModel.findOne({
          name: SECTION_DETAILS.trim(), project: new mongoose.Types.ObjectId(project), deleted: false,

        });

        let supplierDetails = "";
        if (SUPPLIER != "") {
          supplierDetails = await partyModel.find({
            name: SUPPLIER,
            deleted: false
          });
        }

        let manufactureDetails = [];
        if (MANUFACTURER !== "") {
          manufactureDetails = await partyModel.find({
            name: { $in: MANUFACTURER?.split(',').map(supplier => supplier.trim()) },
            deleted: false
          });
        }

        let existingEntry = null;
        existingEntry = await TransactionItems.findOne({
          itemName: itemDetails?._id,
          requestId: new mongoose.Types.ObjectId(req.body.requestId),
          deleted: false,
        });

        if (!itemDetails) {
          errors.push({
            sr: SR,
            section_details: SECTION_DETAILS,
            msg: `Item "${SECTION_DETAILS}" not found in the system.`,
          });
          continue;
        }

        if (!supplierDetails && SUPPLIER !== "") {
          errors.push({
            sr: SR,
            section_details: SECTION_DETAILS,
            msg: `Supplier "${MANUFACTURER.trim()}" not found in the system.`,
          });
          continue;
        }

        if (existingEntry) {
          errors.push({
            sr: SR,
            section_details: SECTION_DETAILS,
            msg: `Record already exists.`,
          });
          continue;
        }

        if (itemDetails?.id !== 'undefined') {
          entries.push({
            itemName: itemDetails?._id,
            main_supplier: supplierDetails?._id || null,
            preffered_supplier: manufactureDetails.length > 0 ? manufactureDetails?.map(supplier => {
              return {
                supId: supplier?._id,
              };
            }) : [],
            mcode: MCODE || "",
            store_type: STORE || 2,
            quantity: QTY,
            balance_qty: QTY,
            unit_rate: RATE || 0,
            total_rate: TOTAL || 0,
            remarks: REMARKS || '',
            tag: 3,
            requestId: new mongoose.Types.ObjectId(req.body.requestId),
          });
        }
      }

      let errorFile = "";
      if (errors.length > 0) {
        const workbook = new excelJs.Workbook();
        const worksheet = workbook.addWorksheet('Errors');

        worksheet.addRow(['SR', 'SECTION_DETAILS', 'ERR_MSG']);
        worksheet.getColumn(1).width = 5;
        worksheet.getColumn(2).width = 40;
        worksheet.getColumn(3).width = 60;

        worksheet.getRow(1).eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFF00' },
          };
        });

        errors.forEach((error) => {
          worksheet.addRow([error.sr, error.section_details, error.msg]);
        });

        const xlsxDir = path.join(__dirname, '../../../xlsx');
        if (!fs.existsSync(xlsxDir)) {
          fs.mkdirSync(xlsxDir);
        }

        const filename = `Drawing-Error-Report.xlsx`;
        const filePath = path.join(xlsxDir, filename);
        await workbook.xlsx.writeFile(filePath);

        const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
        const fileUrl = `${protocol}://${req.get('host')}/xlsx/${filename}`;

        errorFile = fileUrl;
      }
      if (entries.length > 0) {
        await TransactionItems.insertMany(entries);
        if (errorFile) {
          sendResponse(res, 200, true, { file: errorFile }, 'Data imported successfully, but some errors occurred. Please review the error file.');
        } else {
          sendResponse(res, 200, true, {}, 'Data imported successfully.');
        }
      } else if (errorFile) {
        sendResponse(res, 200, true, { file: errorFile }, 'No valid entries found to import. Please review the error file.');
      } else {
        sendResponse(res, 200, false, {}, 'No valid entries found to import.');
      }
    } catch (err) {
      console.error(err);
      sendResponse(res, 500, false, {}, 'Internal server error');
    } finally {
      fs.unlinkSync(req.file.path);
    }
  });
};

exports.getDrawingImportSample = async (req, res) => {
  if (!req.user) {
    return sendResponse(res, 401, false, {}, 'Unauthorized');
  }

  try {
    const filePath = path.join(__dirname, '../../../xlsx/drawing-item-import-sample.xlsx');
    const workBook = new excelJs.Workbook();
    const worksheet = workBook.addWorksheet('Drawing-item-import');

    worksheet.columns = [
      { header: 'SR', key: 'sr', width: '5' },
      { header: 'SECTION_DETAILS', key: 'itemName', width: '50' },
      { header: 'GRID_NO', key: 'grid', width: '15' },
      { header: 'ITEM_NO', key: 'item', width: '10' },
      { header: 'QTY', key: 'qty', width: '10' },
      { header: 'LENGTH', key: 'length', width: '15' },
      { header: 'WIDTH', key: 'width', width: '20' },
      { header: 'ITEM_WEIGHT', key: 'weight', width: '25' },
      { header: 'ASSEMBLY_WEIGHT', key: 'assem', width: '25' },
      { header: 'ASSEM_SURF_AREA', key: 'as', width: '25' },
      { header: 'JOINT_TYPE', key: 'jt', width: '25' },
    ];

    worksheet.getRow(1).eachCell(cell => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFF00' }
      };
    });

    await workBook.xlsx.writeFile(filePath);

    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const fileUrl = `${protocol}://${req.get('host')}/xlsx/drawing-item-import-sample.xlsx`;
    sendResponse(res, 200, true, { file: fileUrl }, 'XLSX file downloaded successfully');


  } catch (error) {
    console.error(error);
    return sendResponse(res, 500, false, {}, "Something went wrong");
  }
}

// Importing Items based on Drawing
exports.importDrawingItem = async (req, res) => {
  if (!req.user || req.error) {
    return sendResponse(res, 401, false, {}, 'Unauthorized');
  }

  upload(req, res, async (err) => {
    if (!req.file) {
      return sendResponse(res, 400, false, {}, 'Select an Excel file');
    }

    if (req.file.mimetype !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      fs.unlinkSync(req.file.path);
      return sendResponse(res, 400, false, {}, 'Invalid file type. Please upload an Excel file');
    }
    if (err) {
      return sendResponse(res, 400, false, {}, `File not uploaded: ${err.message}`);
    }

    try {
      const data = parser.parseXls2Json(req.file.path);
      const result = data[0].filter((p) => p.SECTION_DETAILS !== '' && p.QTY !== '');

      const newEntries = [];
      const errors = [];

      for (const item of result) {
        const { SR, SECTION_DETAILS, GRID_NO, QTY, ITEM_NO, LENGTH, WIDTH, ITEM_WEIGHT, ASSEMBLY_WEIGHT, ASSEM_SURF_AREA } = item;

        const itemDetails = await itemModel.findOne({ name: SECTION_DETAILS, deleted: false });
        const existingEntry = await TransactionItems.findOne({
          grid_no: GRID_NO,
          item_no: ITEM_NO,
          drawingId: new mongoose.Types.ObjectId(req.body.drawingId),
          deleted: false,
        });

        if (!itemDetails) {
          errors.push({
            sr: SR,
            section_details: SECTION_DETAILS,
            msg: `Item "${SECTION_DETAILS}" not found in the system.`,
          });
          continue;
        }
        if (existingEntry) {
          errors.push({
            sr: SR,
            section_details: SECTION_DETAILS,
            msg: `Record already exists with Grid No: ${GRID_NO} and Item No: ${ITEM_NO}.`,
          });
          continue;
        }
        if (itemDetails?.id !== 'undefined') {
          newEntries.push({
            itemName: itemDetails?._id,
            grid_no: GRID_NO,
            item_no: ITEM_NO,
            item_length: LENGTH,
            quantity: QTY,
            item_width: WIDTH,
            item_weight: ITEM_WEIGHT,
            assembly_weight: ASSEMBLY_WEIGHT,
            assembly_surface_area: ASSEM_SURF_AREA,
            drawingId: new mongoose.Types.ObjectId(req.body.drawingId),
          });
        }
      }
      let errorFile = "";
      if (errors.length > 0) {
        const workbook = new excelJs.Workbook();
        const worksheet = workbook.addWorksheet('Errors');

        worksheet.addRow(['SR', 'SECTION_DETAILS', 'ERR_MSG']);
        worksheet.getColumn(1).width = 5;
        worksheet.getColumn(2).width = 40;
        worksheet.getColumn(3).width = 60;

        worksheet.getRow(1).eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFF00' },
          };
        });

        errors.forEach((error) => {
          worksheet.addRow([error.sr, error.section_details, error.msg]);
        });


//       const xlsxDir = path.join(__dirname, '../../../xlsx');
//         if (!fs.existsSync(xlsxDir)) {
//           fs.mkdirSync(xlsxDir, { recursive: true });
//         }

//         const filename = `Drawing-import-error.xlsx`;
//         const filePath = path.join(xlsxDir, filename);
//         await workbook.xlsx.writeFile(filePath);
//         // const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
//         // const fileUrl = `${protocol}://${req.get('host')}/xlsx/${filename}`;
//         // errorFile = fileUrl;
//         const errorFilePath = path.join(xlsxDir, filename);

// // Auto-download the file
// res.download(errorFilePath, filename, (err) => {
//   if (err) console.error("Error sending file:", err);
//   fs.unlinkSync(filePath); // delete uploaded file
//   fs.unlinkSync(errorFilePath); // delete error file after sending
// });
// return; // exit after sending file


const xlsxDir = path.join(__dirname, '../../../xlsx');
    if (!fs.existsSync(xlsxDir)) fs.mkdirSync(xlsxDir, { recursive: true });

    const filename = `Drawing-import-error.xlsx`;
    const errorFilePath = path.join(xlsxDir, filename);

    await workbook.xlsx.writeFile(errorFilePath);

    // Auto-download directly
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    const filestream = fs.createReadStream(errorFilePath);
    filestream.pipe(res);

    filestream.on('end', () => {
      // Clean up both files after download
      fs.unlinkSync(req.file.path);
      fs.unlinkSync(errorFilePath);
    });

    return; // stop further execution


      }
      if (newEntries.length > 0) {
        await TransactionItems.insertMany(newEntries);
        if (errorFile) {
          sendResponse(res, 200, true, { file: errorFile }, 'Data imported successfully, but some errors occurred. Please review the error file.');
        } else {
          sendResponse(res, 200, true, {}, 'Data imported successfully.');
        }
      } else if (errorFile) {
        sendResponse(res, 200, true, { file: errorFile }, 'No valid entries found to import. Please review the error file.');
      } else {
        sendResponse(res, 200, false, {}, 'No valid entries found to import.');
      }

    } catch (err) {
      console.error(err);
      return sendResponse(res, 500, false, {}, 'Internal server error');
    } finally {
      fs.unlinkSync(req.file.path);
    }
  });
};

// Import items based on GridId(GridNo, Qty)
exports.importGridItem = async (req, res) => {

  if (!req.user || req.error) {
    return sendResponse(res, 401, false, {}, 'Unauthorized');
  }

  upload(req, res, async (err) => {

    const { project } = req.body;

    if (!req.file) {
      return sendResponse(res, 400, false, {}, 'Select an Excel file');
    }

    if (!req.body.grid_id || !req.body.drawing_id) {
      sendResponse(res, 400, false, {}, 'Missing parameter');
      return;
    }

    if (req.file.mimetype !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      fs.unlinkSync(req.file.path);
      return sendResponse(res, 400, false, {}, 'Invalid file type. Please upload an Excel file');
    }
    if (err) {
      return sendResponse(res, 400, false, {}, `File not uploaded: ${err.message}`);
    }
    if (!req.body.grid_id || !req.body.drawing_id) {
      return sendResponse(res, 400, false, {}, 'Grid ID and Drawing ID are required');
    }
    try {
      const data = parser.parseXls2Json(req.file.path);
      const result = data[0].filter((p) => p.SECTION_DETAILS !== '' && p.QTY !== '');

      const newEntries = [];
      const errors = [];
      const gridDetails = await Grid.findById(req.body.grid_id);

      if (!gridDetails) {
        return sendResponse(res, 400, false, {}, 'Grid not found');
      }

      for (const item of result) {
        const { SR, SECTION_DETAILS, QTY, ITEM_NO, LENGTH, WIDTH, ITEM_WEIGHT,  ASSEM_SURF_AREA, JOINT_TYPE, GRID_NO } = item;

        const jointTypeNames = JOINT_TYPE ? JOINT_TYPE.split(',').map(j => j.trim()) : [];
        const jointTypeObjects = await jointTypeModel.find({
          name: { $in: jointTypeNames },
          deleted: false
        });

        const foundJointTypes = jointTypeObjects.map(jt => jt._id);

        const notFoundJointTypes = jointTypeNames.filter(j => !jointTypeObjects.some(jt => jt.name === j));

        if (notFoundJointTypes.length > 0) {
          errors.push({
            sr: SR,
            section_details: SECTION_DETAILS,
            msg: `Joint types not found: ${notFoundJointTypes.join(', ')}`,
          });
          continue;
        }

        const itemDetails = await itemModel.findOne({ name: SECTION_DETAILS, project: new mongoose.Types.ObjectId(project), deleted: false });

        if (!itemDetails) {
          errors.push({
            sr: SR,
            section_details: SECTION_DETAILS,
            msg: `Item "${SECTION_DETAILS}" not found in the system for this project.`,
          });
          continue;
        }

        const existingEntry = await GridItems.findOne({
          grid_id: new mongoose.Types.ObjectId(req.body.grid_id),
          drawing_id: new mongoose.Types.ObjectId(req.body.drawing_id),
          item_name: itemDetails._id,
          deleted: false,
        });

        if (existingEntry) {
          errors.push({
            sr: SR,
            section_details: SECTION_DETAILS,
            msg: `Record already exists with Grid No: ${GRID_NO} and Item No: ${ITEM_NO}.`,
          });
          continue;
        }

        newEntries.push({
          item_name: itemDetails._id,
          grid_id: new mongoose.Types.ObjectId(req.body.grid_id),
          item_no: ITEM_NO,
          item_length: LENGTH,
          item_qty: QTY,
          item_width: WIDTH,
          item_weight: ITEM_WEIGHT,
          assembly_weight: (Number(ITEM_WEIGHT) || 0) * (Number(QTY) || 0),
          assembly_surface_area: ASSEM_SURF_AREA,
          used_grid: 0,
          balance_grid: gridDetails.grid_qty,
          drawing_id: new mongoose.Types.ObjectId(req.body.drawing_id),
          joint_type: foundJointTypes,
        });
      }
      let errorFile = "";
      if (errors.length > 0) {
        const workbook = new excelJs.Workbook();
        const worksheet = workbook.addWorksheet('Errors');

        worksheet.addRow(['SR', 'SECTION_DETAILS', 'ERR_MSG']);
        worksheet.getColumn(1).width = 5;
        worksheet.getColumn(2).width = 40;
        worksheet.getColumn(3).width = 60;

        worksheet.getRow(1).eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFF00' },
          };
        });

        errors.forEach((error) => {
          worksheet.addRow([error.sr, error.section_details, error.msg]);
        });

        const xlsxDir = path.join(__dirname, '../../../xlsx');
        if (!fs.existsSync(xlsxDir)) {
          fs.mkdirSync(xlsxDir, { recursive: true });
        }

        const filename = `Grid-Drawing-Import-Error.xlsx`;
        const filePath = path.join(xlsxDir, filename);
        await workbook.xlsx.writeFile(filePath);


        const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
        const fileUrl = `${protocol}://${req.get('host')}/xlsx/${filename}`;
        errorFile = fileUrl;
      }
      if (newEntries.length > 0) {
        await GridItems.insertMany(newEntries);
        if (errorFile) {
          sendResponse(res, 200, true, { file: errorFile }, 'Data imported successfully, but some errors occurred. Please review the error file.');
        } else {
          sendResponse(res, 200, true, {}, 'Data imported successfully.');
        }
      } else if (errorFile) {
        sendResponse(res, 200, true, { file: errorFile }, 'No valid entries found to import. Please review the error file.');
      } else {
        sendResponse(res, 200, false, {}, 'No valid entries found to import.');
      }

    } catch (err) {
      console.error(err);
      return sendResponse(res, 500, false, {}, 'Internal server error');
    } finally {
      fs.unlinkSync(req.file.path);
    }
  });
};

// Grid wise Details Display
exports.GridWiseSingleDrawing = async (req, res) => {
  const { id, print_date } = req.body;
  if (!req.user || req.error) {
    return sendResponse(res, 401, false, {}, 'Unauthorized');
  }
  try {
    const requestData = await Draw.aggregate([
      { $match: { deleted: false, _id: new ObjectId(id) } },
      {
        $lookup: {
          from: "erp-drawing-grid-items",
          localField: "_id",
          foreignField: "drawing_id",
          as: "transItemDetails",
          pipeline: [
            {
              $lookup: {
                from: "store-items",
                localField: "item_name",
                foreignField: "_id",
                as: "itemDetails",
              },
            },
            {
              $lookup: {
                from: "erp-drawing-grids",
                localField: "grid_id",
                foreignField: "_id",
                as: "gridDetails",
              }
            },
            {
              $addFields: {
                itemName: { $arrayElemAt: ["$itemDetails.name", 0] },
                grid_no: { $arrayElemAt: ["$gridDetails.grid_no", 0] },
                grid_qty: { $arrayElemAt: ["$gridDetails.grid_qty", 0] },
              },
            },
            {
              $project: {
                itemDetails: 0,
                gridDetails: 0,
                drawingId: 0,
                status: 0,
                deleted: 0,
                createdAt: 0,
                updatedAt: 0,
                __v: 0
              },
            },
          ],
        },
      },
      {
        $project: {
          drawing_pdf: 0,
          project: 0,
          drawing_pdf_name: 0,
          status: 0,
          deleted: 0,
          createdAt: 0,
          updatedAt: 0,
          __v: 0,
          issued_date: 0,
          issued_person: 0
        },
      },
    ]);

    let headerInfo = {
      drawing_no: requestData[0]?.drawing_no,
      master_updation_date: requestData[0]?.master_updation_date,
      unit: requestData[0]?.unit,
      draw_receive_date: requestData[0]?.draw_receive_date,
      sheet_no: requestData[0]?.sheet_no,
      rev: requestData[0]?.rev,
      assembly_no: requestData[0]?.assembly_no,
      assembly_quantity: requestData[0]?.assembly_quantity
    }

    if (requestData && requestData.length > 0) {
      const template = fs.readFileSync("templates/Grid_drawings/grid_drawing.html", "utf-8");
      const renderedHtml = ejs.render(template, {
        headerInfo,
        items: requestData[0]?.transItemDetails,
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
        format: "A4",
        landscape: true,
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

      const filename = `drawing_items_${Date.now()}.pdf`;
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
    } else {
      sendResponse(res, 200, false, {}, "PDF data not found");
    }
  } catch (error) {
    console.log("error", error);
    sendResponse(res, 500, false, {}, "Something went wrong");
  }
};

// Filter based Drawing Reports
exports.filterDrawingReports = async (req, res) => {
  const { date, status, contractor, project, print_date } = req.body;
  if (!req.user || req.error) {
    return sendResponse(res, 401, false, {}, 'Unauthorized');
  }
  try {
    let query = { deleted: false, status: 2 };
    if (date) {
      query.issued_date = date;
    }
    if (status) {
      query.status = status;
    }
    if (project) {
      query.project = project;
    }
    if (contractor) {
      query.issued_person = new mongoose.Types.ObjectId(contractor);
    }

    const data = await getdrawingIssue(query)
    let drawingData = data.result;

    if (data.status === 1) {
      const template = fs.readFileSync("templates/drawIssue.html", "utf-8");
      const renderedHtml = ejs.render(template, {
        drawingData,
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
        format: "A4",
        landscape: true,
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

      const filename = `drawing_issue_register_${Date.now()}.pdf`;
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
      sendResponse(res, 200, false, {}, `Material Inspaction not found`)
    }
    else if (data.status === 2) {
      sendResponse(res, 500, false, {}, "Something went wrong11");
    }
  } catch (error) {
    console.log(error, '222')
    sendResponse(res, 500, false, {}, "Something went wrong");
  }

}

const oneGetDprGrid = async (project, search , page , limit  ) => {
  try {
    const matchObj = { deleted: false }

    
    if (project) {
      matchObj.project = new ObjectId(project)
    }

      if (search) {
        const searchRegex = new RegExp(search.trim(), "i");
        matchObj.$or = [
            { assembly_no: { $regex: searchRegex } },
            { drawing_no: { $regex: searchRegex } },
        ];
    }

 const skip = (page - 1) * limit;
    const requestData = await Draw.aggregate([
      {
        $match: matchObj,
      },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
         
   
      {
        $lookup: {
          from: "contractors",
          localField: "issued_person",
          foreignField: "_id",
          as: "contractorData",
        },
      },
      {
        $lookup: {
          from: "erp-drawing-grid-items",
          localField: "_id",
          foreignField: "drawing_id",
          as: "gridItemsDetails",
          pipeline: [
            {
              $lookup: {
                from: "erp-drawing-grids",
                localField: "grid_id",
                foreignField: "_id",
                as: "gridDetails",
                pipeline: [
                  {
                    $project: {
                      _id: 1,
                      drawing_id: 1,
                      grid_no: 1,
                      grid_qty: 1
                    }
                  }
                ]
              }
            },
            {
              $project: {
                _id: 1,
                drawing_id: 1,
                grid_id: 1,
                item_name: 1,
                gridDetails: 1,
                assembly_weight: 1,
                assembly_surface_area: 1,
              }
            }
          ]
        }
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
                as: "clientDetails",
              },
            },
          ],
        }
      },
      {
        $lookup: {
          from: "erp-drawing-grids",
          localField: "_id",
          foreignField: "drawing_id",
          as: "drGridDetails",
          pipeline: [
            {
              $project: {
                _id: 1,
                drawing_id: 1,
                grid_qty: 1,
                grid_no: 1,
              }
            }
          ]
        }
      },
      {
        $addFields: {
          drGridDetails: {
            $filter: {
              input: "$drGridDetails",
              as: "grid",
              cond: {
                $in: ["$$grid._id", {
                  $map: {
                    input: "$gridItemsDetails",
                    as: "item",
                    in: "$$item.grid_id"
                  }
                }]
              }
            }
          }
        }
      },
      // Issue Request =================================================================
      {
        $lookup: {
          from: "multi-drawing-issue_requests",
          let: {
            drawingId: "$_id",
            gridItems: "$gridItemsDetails"
          },
          pipeline: [
            {
              $match: { deleted: false }
            },
            {
              $unwind: "$items"
            },
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$items.drawing_id", "$$drawingId"] },
                    { $in: ["$items.grid_item_id", "$$gridItems._id"] },
                    // { $in: ["$items.grid_item_id", "$$gridItems.grid_id"] }
                  ]
                }
              }
            },
            {
              $lookup: {
                from: "erp-drawing-grid-items",
                localField: "items.grid_item_id",
                foreignField: "_id",
                as: "gridItemDetails"
              }
            },
            { $unwind: { path: "$gridItemDetails", preserveNullAndEmptyArrays: true } },
            {
              $lookup: {
                from: "erp-drawing-grids",
                localField: "gridItemDetails.grid_id",
                foreignField: "_id",
                as: "gridDetails"
              }
            },
            { $unwind: { path: "$gridDetails", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 0,
                issue_req_no: 1,
                used_grid_qty: "$items.used_grid_qty",
                createdAt: 1,
                grid_no: "$gridDetails.grid_no"
              }
            },
            {
              $group: {
                _id: {
                  issue_req_no: "$issue_req_no",
                  used_grid_qty: "$used_grid_qty",
                  grid_no: "$grid_no"
                },
                createdAt: { $first: "$createdAt" }
              }
            },
            {
              $project: {
                _id: 0,
                issue_req_no: "$_id.issue_req_no",
                used_grid_qty: "$_id.used_grid_qty",
                grid_no: "$_id.grid_no",
                createdAt: 1
              }
            }
          ],
          as: "issueRequests"
        }
      },
      // Issue Acceptance =================================================================
      {
        $lookup: {
          from: "multi-drawing-issue-acceptances",
          let: {
            drawingId: "$_id",
            gridItems: "$gridItemsDetails"
          },
          pipeline: [
            {
              $match: { deleted: false }
            },
            {
              $unwind: "$items"
            },
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$items.drawing_id", "$$drawingId"] },
                    { $in: ["$items.grid_item_id", "$$gridItems._id"] },
                    // { $in: ["$items.grid_item_id", "$$gridItems.grid_id"] }
                  ]
                }
              }
            },
            {
              $lookup: {
                from: "multi-drawing-issue_requests",
                localField: "issue_req_id",
                foreignField: "_id",
                as: "issReqDetails",
              },
            },
            {
              $addFields: {
                issReqDetails: { $arrayElemAt: ["$issReqDetails", 0] },
              },
            },
            {
              $lookup: {
                from: "erp-drawing-grid-items",
                localField: "items.grid_item_id",
                foreignField: "_id",
                as: "gridItemDetails"
              }
            },
            { $unwind: { path: "$gridItemDetails", preserveNullAndEmptyArrays: true } },
            {
              $lookup: {
                from: "erp-drawing-grids",
                localField: "gridItemDetails.grid_id",
                foreignField: "_id",
                as: "gridDetails"
              }
            },
            { $unwind: { path: "$gridDetails", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 0,
                issue_accept_no: 1,
                issue_req_no: "$issReqDetails.issue_req_no",
                used_grid_qty: "$items.iss_used_grid_qty",
                grid_no: "$gridDetails.grid_no",
                is_accepted: "$items.is_accepted",
                createdAt: 1,
              }
            },
            {
              $group: {
                _id: {
                  issue_accept_no: "$issue_accept_no",
                  issue_req_no: "$issue_req_no",
                  used_grid_qty: "$used_grid_qty",
                  is_accepted: "$is_accepted",
                  grid_no: "$grid_no"
                },
                createdAt: { $first: "$createdAt" }
              }
            },
            {
              $project: {
                _id: 0,
                issue_accept_no: "$_id.issue_accept_no",
                issue_req_no: "$_id.issue_req_no",
                used_grid_qty: "$_id.used_grid_qty",
                is_accepted: "$_id.is_accepted",
                grid_no: "$_id.grid_no",
                createdAt: 1,
              }
            }
          ],
          as: "issueAcceptance",
        }
      },
      // Fitup Details ==================================================================
      {
        $lookup: {
          from: "multi-erp-fitup-inspections",
          let: {
            drawingId: "$_id",
            gridItems: "$gridItemsDetails"
          },
          pipeline: [
            {
              $match: { deleted: false }
            },
            {
              $unwind: "$items"
            },
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$items.drawing_id", "$$drawingId"] },
                    { $in: ["$items.grid_item_id", "$$gridItems._id"] },
                    // { $in: ["$items.grid_item_id", "$$gridItems.grid_id"] }
                  ]
                }
              }
            },
            {
              $lookup: {
                from: "erp-drawing-grid-items",
                localField: "items.grid_item_id",
                foreignField: "_id",
                as: "gridItemDetails"
              }
            },
            { $unwind: { path: "$gridItemDetails", preserveNullAndEmptyArrays: true } },
            {
              $lookup: {
                from: "erp-drawing-grids",
                localField: "gridItemDetails.grid_id",
                foreignField: "_id",
                as: "gridDetails"
              }
            },
            { $unwind: { path: "$gridDetails", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 0,
                report_no: 1,
                report_no_two: 1,
                createdAt: 1,
                status: 1, // 1 = Pending, 2/3 = Accepted/Rejected,
                fitOff_used_grid_qty: "$items.fitOff_used_grid_qty",
                grid_no: "$gridDetails.grid_no",
                is_accepted: "$items.is_accepted",
                qc_date: "$qc_time",
              }
            },
            {
              $group: {
                _id: {
                  report_no: "$report_no",
                  report_no_two: "$report_no_two",
                  status: "$status",
                  fitOff_used_grid_qty: "$fitOff_used_grid_qty",
                  is_accepted: "$is_accepted",
                  grid_no: "$grid_no",
                },
                createdAt: { $first: "$createdAt" },
                qc_date: { $first: "$qc_date" }
              }
            },
            {
              $project: {
                _id: 0,
                report_no: "$_id.report_no",
                report_no_two: "$_id.report_no_two",
                createdAt: 1,
                status: "$_id.status",
                fitOff_used_grid_qty: "$_id.fitOff_used_grid_qty",
                is_accepted: "$_id.is_accepted",
                qc_date: 1,
                grid_no: "$_id.grid_no",
              }
            }
          ],
          as: "fitupDetails",
        }
      },
      {
        $addFields: {
          fitupOffer: {
            $filter: {
              input: "$fitupDetails",
              as: "fitup",
              cond: { $gte: ["$$fitup.status", 1] } // Pending Fitup Offers
            }
          },
          fitupAcceptance: {
            $filter: {
              input: "$fitupDetails",
              as: "fitup",
              cond: { $in: ["$$fitup.status", [2, 3]] } // Approved/Rejected Fitup Acceptances
            }
          }
        }
      },
      // Weld Visual Field ==================================================================
      {
        $lookup: {
          from: "multi-erp-weldvisual-inspections",
          let: {
            drawingId: "$_id",
            gridItems: "$gridItemsDetails"
          },
          pipeline: [
            {
              $match: { deleted: false }
            },
            {
              $unwind: "$items"
            },
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$items.drawing_id", "$$drawingId"] },
                    { $in: ["$items.grid_item_id", "$$gridItems._id"] },
                    // { $in: ["$items.grid_item_id", "$$gridItems.grid_id"] }
                  ]
                }
              }
            },
            {
              $lookup: {
                from: "erp-drawing-grid-items",
                localField: "items.grid_item_id",
                foreignField: "_id",
                as: "gridItemDetails"
              }
            },
            { $unwind: { path: "$gridItemDetails", preserveNullAndEmptyArrays: true } },
            {
              $lookup: {
                from: "erp-drawing-grids",
                localField: "gridItemDetails.grid_id",
                foreignField: "_id",
                as: "gridDetails"
              }
            },
            { $unwind: { path: "$gridDetails", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 0,
                report_no: 1,
                report_no_two: 1,
                createdAt: 1,
                status: 1, // 1 = Pending, 2/3 = Accepted/Rejected,
                weld_used_grid_qty: "$items.weld_used_grid_qty",
                is_accepted: "$items.is_accepted",
                grid_no: "$gridDetails.grid_no",
                qc_date: "$qc_time",
              }
            },
            {
              $group: {
                _id: {
                  report_no: "$report_no",
                  report_no_two: "$report_no_two",
                  status: "$status",
                  weld_used_grid_qty: "$weld_used_grid_qty",
                  is_accepted: "$is_accepted",
                  grid_no: "$grid_no",
                },
                createdAt: { $first: "$createdAt" },
                qc_date: { $first: "$qc_date" }
              }
            },
            {
              $project: {
                _id: 0,
                report_no: "$_id.report_no",
                report_no_two: "$_id.report_no_two",
                status: "$_id.status",
                weld_used_grid_qty: "$_id.weld_used_grid_qty",
                is_accepted: "$_id.is_accepted",
                createdAt: 1,
                grid_no: "$_id.grid_no",
                qc_date: 1,
              }
            }
          ],
          as: "weldVisualDetails",
        },
      },
      {
        $addFields: {
          weldVisualOffer: {
            $filter: {
              input: "$weldVisualDetails",
              as: "weld",
              cond: { $gte: ["$$weld.status", 1] }
            }
          },
          weldVisualAcceptance: {
            $filter: {
              input: "$weldVisualDetails",
              as: "weld",
              cond: { $in: ["$$weld.status", [2, 3]] }
            }
          }
        }
      },
      // NDT Details =================================================================
      {
        $lookup: {
          from: "multi-erp-ndt-masters",
          let: {
            drawingId: "$_id",
            gridItems: "$gridItemsDetails"
          },
          pipeline: [
            {
              $match: { deleted: false }
            },
            {
              $unwind: "$items"
            },
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$items.drawing_id", "$$drawingId"] },
                    { $in: ["$items.grid_item_id", "$$gridItems._id"] },
                    // { $in: ["$items.grid_item_id", "$$gridItems.grid_id"] }
                  ]
                }
              }
            },
            {
              $lookup: {
                from: "erp-drawing-grid-items",
                localField: "items.grid_item_id",
                foreignField: "_id",
                as: "gridItemDetails"
              }
            },
            { $unwind: { path: "$gridItemDetails", preserveNullAndEmptyArrays: true } },
            {
              $lookup: {
                from: "erp-drawing-grids",
                localField: "gridItemDetails.grid_id",
                foreignField: "_id",
                as: "gridDetails"
              }
            },
            { $unwind: { path: "$gridDetails", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 0,
                report_no: 1,
                ut_status: 1,
                rt_status: 1,
                mpt_status: 1,
                lpt_status: 1,
                createdAt: 1,
                status: 1, // 1 = Pending, 2/3 = Accepted/Rejected,
                ndt_used_grid_qty: "$items.ndt_used_grid_qty",
                grid_no: "$gridDetails.grid_no",
              }
            },
            {
              $group: {
                _id: {
                  report_no: "$report_no",
                  ut_status: "$ut_status",
                  rt_status: "$rt_status",
                  mpt_status: "$mpt_status",
                  lpt_status: "$lpt_status",
                  status: "$status",
                  ndt_used_grid_qty: "$ndt_used_grid_qty",
                  grid_no: "$grid_no",
                },
                createdAt: { $first: "$createdAt" }
              }
            },
            {
              $project: {
                _id: 0,
                report_no: "$_id.report_no",
                status: "$_id.status",
                createdAt: 1,
                ndt_used_grid_qty: "$_id.ndt_used_grid_qty",
                grid_no: "$_id.grid_no",
                // Managing statuses
                ut_status: {
                  $switch: {
                    branches: [
                      { case: { $eq: ["$_id.ut_status", 1] }, then: "Pending" },
                      { case: { $eq: ["$_id.ut_status", 2] }, then: "Offered" },
                      { case: { $eq: ["$_id.ut_status", 3] }, then: "Completed" }
                    ],
                    default: ""
                  }
                },
                rt_status: {
                  $switch: {
                    branches: [
                      { case: { $eq: ["$_id.rt_status", 1] }, then: "Pending" },
                      { case: { $eq: ["$_id.rt_status", 2] }, then: "Offered" },
                      { case: { $eq: ["$_id.rt_status", 3] }, then: "Completed" }
                    ],
                    default: ""
                  }
                },
                mpt_status: {
                  $switch: {
                    branches: [
                      { case: { $eq: ["$_id.mpt_status", 1] }, then: "Pending" },
                      { case: { $eq: ["$_id.mpt_status", 2] }, then: "Offered" },
                      { case: { $eq: ["$_id.mpt_status", 3] }, then: "Completed" }
                    ],
                    default: ""
                  }
                },
                lpt_status: {
                  $switch: {
                    branches: [
                      { case: { $eq: ["$_id.lpt_status", 1] }, then: "Pending" },
                      { case: { $eq: ["$_id.lpt_status", 2] }, then: "Offered" },
                      { case: { $eq: ["$_id.lpt_status", 3] }, then: "Completed" }
                    ],
                    default: ""
                  }
                }
              }
            }
          ],
          as: "ndtDetails",
        }
      },
      // Final Dimension Details ==================================================================
      {
        $lookup: {
          from: "multi-erp-fd-masters",
          let: {
            drawingId: "$_id",
            gridItems: "$gridItemsDetails"
          },
          pipeline: [
            {
              $match: { deleted: false }
            },
            {
              $unwind: "$items"
            },
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$items.drawing_id", "$$drawingId"] },
                    { $in: ["$items.grid_id", "$$gridItems.grid_id"] }
                  ]
                }
              }
            },
            {
              $lookup: {
                from: "erp-drawing-grids",
                localField: "items.grid_id",
                foreignField: "_id",
                as: "fdGridDetails",
                pipeline: [
                  {
                    $project: {
                      _id: 1,
                      grid_no: 1,
                      grid_qty: 1
                    }
                  }
                ]
              }
            },
            {
              $addFields: {
                fdGridDetails: { $arrayElemAt: ["$fdGridDetails", 0] },
              },
            },
            {
              $project: {
                _id: 0,
                report_no: 1,
                report_no_two: 1,
                createdAt: 1,
                grid_id: "$fdGridDetails",
                status: 1, // 1 = Pending, 2/3 = Accepted/Rejected,
                fd_used_grid_qty: "$items.fd_used_grid_qty",
                is_accepted: "$items.is_accepted",
                qc_date: "$qc_time",
              }
            },
            {
              $group: {
                _id: {
                  report_no: "$report_no",
                  report_no_two: "$report_no_two",
                  status: "$status",
                  grid_id: "$grid_id",
                  fd_used_grid_qty: "$fd_used_grid_qty",
                  is_accepted: "$is_accepted"
                },
                createdAt: { $first: "$createdAt" },
                qc_date: { $first: "$qc_date" },
              }
            },
            {
              $project: {
                _id: 0,
                report_no: "$_id.report_no",
                report_no_two: "$_id.report_no_two",
                createdAt: 1,
                grid_id: "$_id.grid_id",
                status: "$_id.status",
                fd_used_grid_qty: "$_id.fd_used_grid_qty",
                is_accepted: "$_id.is_accepted",
                qc_date: 1,
              }
            }
          ],
          as: "fdDetails",
        },
      },
      {
        $addFields: {
          fdOffer: {
            $filter: {
              input: "$fdDetails",
              as: "fd",
              cond: { $gte: ["$$fd.status", 1] }
            }
          },
          fdAcceptance: {
            $filter: {
              input: "$fdDetails",
              as: "fd",
              cond: { $in: ["$$fd.status", [2, 3]] }
            }
          }
        }
      },
      // Inspection Summary
      {
        $lookup: {
          from: "multi-erp-inspect-summaries",
          let: {
            drawingId: "$_id",
            gridItems: "$gridItemsDetails"
          },
          pipeline: [
            { $match: { deleted: false, is_generate: true } },
            {
              $unwind: "$items"
            },
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$items.drawing_id", "$$drawingId"] },
                    { $in: ["$items.grid_id", "$$gridItems.grid_id"] }
                  ]
                }
              }
            },
            {
              $lookup: {
                from: "erp-drawing-grids",
                localField: "items.grid_id",
                foreignField: "_id",
                as: "summaryGridDetails",
                pipeline: [
                  {
                    $project: {
                      _id: 1,
                      grid_no: 1,
                      grid_qty: 1
                    }
                  }
                ]
              }
            },
            {
              $addFields: {
                summaryGridDetails: { $arrayElemAt: ["$summaryGridDetails", 0] },
              },
            },
            {
              $project: {
                _id: 0,
                report_no: 1,
                batch_id: 1,
                is_grid_qty: "$items.is_grid_qty",
                grid_id: "$summaryGridDetails",
                summary_date: 1,
              }
            },
            {
              $group: {
                _id: {
                  report_no: "$report_no",
                  batch_id: "$batch_id",
                  grid_id: "$grid_id",
                  is_grid_qty: "$is_grid_qty"
                },
                summary_date: { $first: "$summary_date" },
              }
            },
            {
              $project: {
                _id: 0,
                report_no: "$_id.report_no",
                batch_id: "$_id.batch_id",
                grid_id: "$_id.grid_id",
                is_grid_qty: "$_id.is_grid_qty",
                summary_date: 1,
              }
            }
          ],
          as: "insSummaryDetails",
        }
      },

      // Dispatch Note =================================================================
      {
        $lookup: {
          from: "multi-erp-painting-dispatch-notes",
          let: {
            drawingId: "$_id",
            gridItems: "$gridItemsDetails"
          },
          pipeline: [
            {
              $match: { deleted: false }
            },
            {
              $unwind: "$items"
            },
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$items.drawing_id", "$$drawingId"] },
                    { $in: ["$items.grid_id", "$$gridItems.grid_id"] }
                  ]
                }
              }
            },
            {
              $lookup: {
                from: "erp-drawing-grids",
                localField: "items.grid_id",
                foreignField: "_id",
                as: "dnGridDetails",
                pipeline: [
                  {
                    $project: {
                      _id: 1,
                      grid_no: 1,
                      grid_qty: 1
                    }
                  }
                ]
              }
            },
            {
              $addFields: {
                dnGridDetails: { $arrayElemAt: ["$dnGridDetails", 0] },
              },
            },
            {
              $project: {
                _id: 0,
                report_no: 1,
                dispatch_used_grid_qty: "$items.dispatch_used_grid_qty",
                grid_id: "$dnGridDetails",
                createdAt: 1,
              }
            },
            {
              $group: {
                _id: {
                  report_no: "$report_no",
                  grid_id: "$grid_id",
                  dispatch_used_grid_qty: "$dispatch_used_grid_qty"
                },
                createdAt: { $first: "$createdAt" },
              }
            },
            {
              $project: {
                _id: 0,
                report_no: "$_id.report_no",
                grid_id: "$_id.grid_id",
                dispatch_used_grid_qty: "$_id.dispatch_used_grid_qty",
                createdAt: 1,
              }
            }
          ],
          as: "dnDetails",
        },
      },
      // Surface Details =================================================================
      {
        $lookup: {
          from: "multi-erp-surface-inspections",
          let: {
            drawingId: "$_id",
            gridItems: "$gridItemsDetails"
          },
          pipeline: [
            {
              $match: { deleted: false }
            },
            {
              $unwind: "$items"
            },
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$items.drawing_id", "$$drawingId"] },
                    { $in: ["$items.grid_id", "$$gridItems.grid_id"] }
                  ]
                }
              }
            },
            {
              $lookup: {
                from: "erp-drawing-grids",
                localField: "items.grid_id",
                foreignField: "_id",
                as: "surfaceGridDetails",
                pipeline: [
                  {
                    $project: {
                      _id: 1,
                      grid_no: 1,
                      grid_qty: 1
                    }
                  }
                ]
              }
            },
            {
              $addFields: {
                surfaceGridDetails: { $arrayElemAt: ["$surfaceGridDetails", 0] },
              },
            },
            {
              $project: {
                _id: 0,
                report_no: 1,
                report_no_two: 1,
                status: 1, // 1-Pending 2-Partially 3-Approved 4-Rejected 
                surface_used_grid_qty: "$items.surface_used_grid_qty",
                grid_id: "$surfaceGridDetails",
                is_accepted: "$items.is_accepted", // 2- Acc, 3- Rej
                createdAt: 1,
                qc_date: 1,
              }
            },
            {
              $group: {
                _id: {
                  report_no: "$report_no",
                  grid_id: "$grid_id",
                  report_no_two: "$report_no_two",
                  status: "$status",
                  surface_used_grid_qty: "$surface_used_grid_qty",
                  is_accepted: "$is_accepted",
                },
                qc_date: { $first: "$qc_date" },
                createdAt: { $first: "$createdAt" },
              }
            },
            {
              $project: {
                _id: 0,
                report_no: "$_id.report_no",
                report_no_two: "$_id.report_no_two",
                grid_id: "$_id.grid_id",
                status: "$_id.status",
                surface_used_grid_qty: "$_id.surface_used_grid_qty",
                is_accepted: "$_id.is_accepted",
                createdAt: 1,
                qc_date: 1,
              }
            }
          ],
          as: "surfaceDetails",
        }
      },
      {
        $addFields: {
          surfaceOffer: {
            $filter: {
              input: "$surfaceDetails",
              as: "surface",
              cond: { $gte: ["$$surface.status", 1] }
            }
          },
          surfaceAcceptance: {
            $filter: {
              input: "$surfaceDetails",
              as: "surface",
              cond: { $in: ["$$surface.status", [2, 3, 4]] }
            }
          }
        }
      },
      // MIO Details =================================================================
      {
        $lookup: {
          from: "multi-erp-mio-inspections",
          let: {
            drawingId: "$_id",
            gridItems: "$gridItemsDetails"
          },
          pipeline: [
            {
              $match: { deleted: false }
            },
            {
              $unwind: "$items"
            },
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$items.drawing_id", "$$drawingId"] },
                    { $in: ["$items.grid_id", "$$gridItems.grid_id"] }
                  ]
                }
              }
            },
            {
              $lookup: {
                from: "erp-drawing-grids",
                localField: "items.grid_id",
                foreignField: "_id",
                as: "mioGridDetails",
                pipeline: [
                  {
                    $project: {
                      _id: 1,
                      grid_no: 1,
                      grid_qty: 1
                    }
                  }
                ]
              }
            },
            {
              $addFields: {
                mioGridDetails: { $arrayElemAt: ["$mioGridDetails", 0] },
              },
            },
            {
              $project: {
                _id: 0,
                report_no: 1,
                report_no_two: 1,
                status: 1, // 1-Pending 2-Partially 3-Approved 4-Rejected 
                mio_used_grid_qty: "$items.mio_used_grid_qty",
                grid_id: "$mioGridDetails",
                is_accepted: "$items.is_accepted", // 2- Acc, 3- Rej
                createdAt: 1,
                qc_date: 1,
              }
            },
            {
              $group: {
                _id: {
                  report_no: "$report_no",
                  grid_id: "$grid_id",
                  report_no_two: "$report_no_two",
                  status: "$status",
                  mio_used_grid_qty: "$mio_used_grid_qty",
                  is_accepted: "$is_accepted"
                },
                createdAt: { $first: "$createdAt" },
                qc_date: { $first: "$qc_date" },
              }
            },
            {
              $project: {
                _id: 0,
                report_no: "$_id.report_no",
                report_no_two: "$_id.report_no_two",
                grid_id: "$_id.grid_id",
                status: "$_id.status",
                mio_used_grid_qty: "$_id.mio_used_grid_qty",
                is_accepted: "$_id.is_accepted",
                createdAt: 1,
                qc_date: 1,
              }
            }
          ],
          as: "mioDetails",
        }
      },
      {
        $addFields: {
          mioOffer: {
            $filter: {
              input: "$mioDetails",
              as: "mio",
              cond: { $gte: ["$$mio.status", 1] }
            }
          },
          mioAcceptance: {
            $filter: {
              input: "$mioDetails",
              as: "mio",
              cond: { $in: ["$$mio.status", [2, 3, 4]] }
            }
          }
        }
      },
      // Final Coat Details =================================================================
      {
        $lookup: {
          from: "multi-erp-final-coat-inspections",
          let: {
            drawingId: "$_id",
            gridItems: "$gridItemsDetails"
          },
          pipeline: [
            {
              $match: { deleted: false }
            },
            {
              $unwind: "$items"
            },
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$items.drawing_id", "$$drawingId"] },
                    { $in: ["$items.grid_id", "$$gridItems.grid_id"] }
                  ]
                }
              }
            },
            {
              $lookup: {
                from: "erp-drawing-grids",
                localField: "items.grid_id",
                foreignField: "_id",
                as: "fcGridDetails",
                pipeline: [
                  {
                    $project: {
                      _id: 1,
                      grid_no: 1,
                      grid_qty: 1
                    }
                  }
                ]
              }
            },
            {
              $addFields: {
                fcGridDetails: { $arrayElemAt: ["$fcGridDetails", 0] },
              },
            },
            {
              $project: {
                _id: 0,
                report_no: 1,
                report_no_two: 1,
                status: 1, // 1-Pending 2-Partially 3-Approved 4-Rejected 
                fc_used_grid_qty: "$items.fc_used_grid_qty",
                grid_id: "$fcGridDetails",
                is_accepted: "$items.is_accepted", // 2- Acc, 3- Rej
                createdAt: 1,
                qc_date: 1,
              }
            },
            {
              $group: {
                _id: {
                  report_no: "$report_no",
                  grid_id: "$grid_id",
                  report_no_two: "$report_no_two",
                  status: "$status",
                  fc_used_grid_qty: "$fc_used_grid_qty",
                  is_accepted: "$is_accepted"
                },
                createdAt: { $first: "$createdAt" },
                qc_date: { $first: "$qc_date" },
              }
            },
            {
              $project: {
                _id: 0,
                report_no: "$_id.report_no",
                report_no_two: "$_id.report_no_two",
                grid_id: "$_id.grid_id",
                status: "$_id.status",
                fc_used_grid_qty: "$_id.fc_used_grid_qty",
                is_accepted: "$_id.is_accepted",
                createdAt: 1,
                qc_date: 1,
              }
            }
          ],
          as: "finalCoatDetails",
        },
      },
      {
        $addFields: {
          finalCoatOffer: {
            $filter: {
              input: "$finalCoatDetails",
              as: "finalCoat",
              cond: { $gte: ["$$finalCoat.status", 1] }
            }
          },
          finalCoatAcceptance: {
            $filter: {
              input: "$finalCoatDetails",
              as: "finalCoat",
              cond: { $in: ["$$finalCoat.status", [2, 3, 4]] }
            }
          }
        }
      },

      // Release Note Details =================================================================
      {
        $lookup: {
          from: "multi-erp-ins-release-notes",
          let: {
            drawingId: "$_id",
            gridItems: "$gridItemsDetails"
          },
          pipeline: [
            { $match: { deleted: false, is_generate: true } },
            {
              $unwind: "$items"
            },
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$items.drawing_id", "$$drawingId"] },
                    { $in: ["$items.grid_id", "$$gridItems.grid_id"] }
                  ]
                }
              }
            },
            {
              $lookup: {
                from: "erp-drawing-grids",
                localField: "items.grid_id",
                foreignField: "_id",
                as: "rnGridDetails",
                pipeline: [
                  {
                    $project: {
                      _id: 1,
                      grid_no: 1,
                      grid_qty: 1
                    }
                  }
                ]
              }
            },
            {
              $addFields: {
                rnGridDetails: { $arrayElemAt: ["$rnGridDetails", 0] },
              },
            },
            {
              $project: {
                _id: 0,
                report_no: 1,
                batch_id: 1,
                is_grid_qty: "$items.is_grid_qty",
                grid_id: "$rnGridDetails",
                release_date: 1,
              }
            },
            {
              $group: {
                _id: {
                  report_no: "$report_no",
                  batch_id: "$batch_id",
                  grid_id: "$grid_id",
                  is_grid_qty: "$is_grid_qty"
                },
                release_date: { $first: "$release_date" },
              }
            },
            {
              $project: {
                _id: 0,
                report_no: "$_id.report_no",
                batch_id: "$_id.batch_id",
                grid_id: "$_id.grid_id",
                is_grid_qty: "$_id.is_grid_qty",
                release_date: 1,
              }
            }
          ],
          as: "rnDetails",
        }
      },

      // ==========================================================
      {
        $addFields: {
          projectDetails: { $arrayElemAt: ["$projectDetails", 0] },
          contractorData: { $arrayElemAt: ["$contractorData", 0] },
        },
      },
      {
        $addFields: {
          clientDetails: {
            $arrayElemAt: ["$projectDetails.clientDetails", 0],
          },
        },
      },
      {
        $project: {
          _id: 1,
          issued_name: "$contractorData.name",
          issued_id: "$contractorData._id",
          issued_date: "$issued_date",
          project_id: "$projectDetails._id",
          project_name: "$projectDetails.name",
          wo_no: "$projectDetails.work_order_no",
          project_po_no: "$projectDetails.work_order_no",
          client: "$clientDetails.name",
          drawing_no: "$drawing_no",
          unit: "$unit",
          rev: "$rev",
          assembly_no: "$assembly_no",
          assembly_quantity: "$assembly_quantity",
          grid_items: "$gridItemsDetails",
          grid_data: "$drGridDetails",
          issue_requests: "$issueRequests",
          issue_acceptance: "$issueAcceptance",
          fitupOffer: { report_no: 1, createdAt: 1, fitOff_used_grid_qty: 1, grid_no: 1, },
          fitupAcceptance: { report_no: 1, report_no_two: 1, is_accepted: 1, fitOff_used_grid_qty: 1, qc_date: 1, grid_no: 1 },
          weldVisualOffer: { report_no: 1, createdAt: 1, weld_used_grid_qty: 1, grid_no: 1, },
          weldVisualAcceptance: { report_no: 1, report_no_two: 1, is_accepted: 1, weld_used_grid_qty: 1, qc_date: 1, grid_no: 1, },
          ndt_details: "$ndtDetails",

          fdOffer: { report_no: 1, createdAt: 1, fd_used_grid_qty: 1, grid_id: 1, },
          fdAcceptance: { report_no: 1, report_no_two: 1, is_accepted: 1, fd_used_grid_qty: 1, grid_id: 1, qc_date: 1 },

          dispatch_note: "$dnDetails",

          insSummary: "$insSummaryDetails",

          surfaceOffer: { report_no: 1, createdAt: 1, surface_used_grid_qty: 1, grid_id: 1, },
          surfaceAcceptance: { report_no: 1, report_no_two: 1, is_accepted: 1, surface_used_grid_qty: 1, grid_id: 1, qc_date: 1 },
          mioOffer: { report_no: 1, createdAt: 1, mio_used_grid_qty: 1, grid_id: 1, },
          mioAcceptance: { report_no: 1, report_no_two: 1, createdAt: 1, is_accepted: 1, mio_used_grid_qty: 1, grid_id: 1, qc_date: 1 },
          finalCoatOffer: { report_no: 1, createdAt: 1, fc_used_grid_qty: 1, grid_id: 1, },
          finalCoatAcceptance: { report_no: 1, report_no_two: 1, createdAt: 1, is_accepted: 1, fc_used_grid_qty: 1, grid_id: 1, qc_date: 1 },

          release_note: "$rnDetails"
        }
      },
 ],
           totalCount: [{ $count: "count" }],
        }
      },

        
 
    ]);

    
    const data = requestData[0]?.data || [];
    const total = requestData[0]?.totalCount[0]?.count || 0;

    if (data.length > 0) {
      return { status: 1, result: data, total };
    } else {
      return { status: 0, result: [], total: 0 };
    }
    // if (requestData.length > 0) {
    //   return { status: 1, result: requestData };
    // } else {
    //   return { status: 0, result: [] };
    // }
  } catch (error) {
    console.log(error, '333')
    return { status: 2, result: error };
  }
}

exports.dprGridReport = async (req, res) => {
    if (req.user && !req.error) {
        try {
            // Get query parameters with sensible defaults
            const project = req.query.project;
            const page = req.query.page ? parseInt(req.query.page) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit) : 10;
            const search = req.query.search || "";
            
            let matchObj = { deleted: false };
            if (project) {
                matchObj.project = new ObjectId(project);
            }
            
            // Re-apply search logic for counting total documents
            if (search) {
                const searchRegex = new RegExp(search.trim(), "i");
                matchObj.$or = [
                    { assembly_no: { $regex: searchRegex } },
                    { drawing_no: { $regex: searchRegex } },
                ];
            }
            
            // 1. Get total count first (This is fast)
            const total = await Draw.countDocuments(matchObj);
            
            // 2. Get paginated data (Now fast because $skip/$limit is inside oneGetDprGrid)
             const dataResult = await oneGetDprGrid(project, search, page, limit);
            
             console.log("status", dataResult.status);
            //const dataResult = await oneGetDprGrid(project, "",search,  parseInt(page), parseInt(limit));
          
    if (dataResult.status !== 1 ) {
      return sendResponse(res, 200, false, [], "No DPR Grid Report found");
    }
else{
    return sendResponse(res, 200, true, {
     
       
     data: dataResult.result,
      pagination: {
         total,
      page: parseInt(page),
      limit: parseInt(limit),
        totalPages: Math.ceil(dataResult.length / limit)
      }
    
    });
  } 
}         

         catch (err) {
            console.error("dprGridReport error:", err);
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
};

// const oneGetDprGrid = async (project, search = "", page = 1, limit = 10) => {
//   try {
//     const matchObj = { deleted: false };
//     if (project) matchObj.project = new ObjectId(project);

//     // 🔍 optional text search on drawing/assembly
//     if (search && search.trim() !== "") {
//       matchObj.$or = [
//         { drawing_no: { $regex: search, $options: "i" } },
//         { assembly_no: { $regex: search, $options: "i" } }
//       ];
//     }

//     const skip = (page - 1) * limit;

//     // ⚡ Apply pagination BEFORE heavy lookups
//     const requestData = await Draw.aggregate([
//       { $match: matchObj },
//       { $sort: { createdAt: -1 } },
//       { $skip: skip },
//       { $limit: limit },

//       // --- contractor ---
//       {
//         $lookup: {
//           from: "contractors",
//           localField: "issued_person",
//           foreignField: "_id",
//           as: "contractorData",
//         }
//       },

//       // --- grid items ---
//       {
//         $lookup: {
//           from: "erp-drawing-grid-items",
//           localField: "_id",
//           foreignField: "drawing_id",
//           as: "gridItemsDetails",
//           pipeline: [
//             {
//               $lookup: {
//                 from: "erp-drawing-grids",
//                 localField: "grid_id",
//                 foreignField: "_id",
//                 as: "gridDetails"
//               }
//             },
//             {
//               $project: {
//                 drawing_id: 1,
//                 grid_id: 1,
//                 assembly_weight: 1,
//                 assembly_surface_area: 1,
//                 gridDetails: { _id: 1, grid_no: 1, grid_qty: 1 }
//               }
//             }
//           ]
//         }
//       },

//       // --- issue requests ---
//       {
//         $lookup: {
//           from: "drawing-issue_requests",
//           localField: "_id",
//           foreignField: "drawing_id",
//           as: "issue_requests"
//         }
//       },

//       // --- issue acceptance ---
//       {
//         $lookup: {
//           from: "drawing-issue-acceptances",
//           localField: "_id",
//           foreignField: "drawing_id",
//           as: "issue_acceptance"
//         }
//       },

//       // --- fitup ---
//       {
//         $lookup: {
//           from: "erp-fitup-inspections",
//           localField: "_id",
//           foreignField: "drawing_id",
//           as: "fitupOffer"
//         }
//       },
//       {
//         $lookup: {
//           from: "erp-fitup-inspection-acceptances",
//           localField: "_id",
//           foreignField: "drawing_id",
//           as: "fitupAcceptance"
//         }
//       },

//       // --- weld ---
//       {
//         $lookup: {
//           from: "erp-weld-inspection-offers",
//           localField: "_id",
//           foreignField: "drawing_id",
//           as: "weldVisualOffer"
//         }
//       },
//       {
//         $lookup: {
//           from: "erp-weld-inspection-acceptances",
//           localField: "_id",
//           foreignField: "drawing_id",
//           as: "weldVisualAcceptance"
//         }
//       },

//       // --- ndt ---
//       {
//         $lookup: {
//           from: "erp-ndt-inspections",
//           localField: "_id",
//           foreignField: "drawing_id",
//           as: "ndt_details"
//         }
//       },

//       // --- final dimensional ---
//       {
//         $lookup: {
//           from: "erp-final-dim-offers",
//           localField: "_id",
//           foreignField: "drawing_id",
//           as: "fdOffer"
//         }
//       },
//       {
//         $lookup: {
//           from: "erp-final-dim-acceptances",
//           localField: "_id",
//           foreignField: "drawing_id",
//           as: "fdAcceptance"
//         }
//       },

//       // --- inspection summary ---
//       {
//         $lookup: {
//           from: "erp-inspection-summaries",
//           localField: "_id",
//           foreignField: "drawing_id",
//           as: "insSummary"
//         }
//       },

//       // --- dispatch ---
//       {
//         $lookup: {
//           from: "erp-painting-dispatch-notes",
//           localField: "_id",
//           foreignField: "drawing_id",
//           as: "dispatch_note"
//         }
//       },

//       // --- surface ---
//       {
//         $lookup: {
//           from: "erp-paint-surfaces",
//           localField: "_id",
//           foreignField: "drawing_id",
//           as: "surfaceOffer"
//         }
//       },
//       {
//         $lookup: {
//           from: "erp-paint-surface-acceptances",
//           localField: "_id",
//           foreignField: "drawing_id",
//           as: "surfaceAcceptance"
//         }
//       },

//       // --- mio ---
//       {
//         $lookup: {
//           from: "erp-paint-mios",
//           localField: "_id",
//           foreignField: "drawing_id",
//           as: "mioOffer"
//         }
//       },
//       {
//         $lookup: {
//           from: "erp-paint-mio-acceptances",
//           localField: "_id",
//           foreignField: "drawing_id",
//           as: "mioAcceptance"
//         }
//       },

//       // --- final coat ---
//       {
//         $lookup: {
//           from: "erp-paint-final-coats",
//           localField: "_id",
//           foreignField: "drawing_id",
//           as: "finalCoatOffer"
//         }
//       },
//       {
//         $lookup: {
//           from: "erp-paint-final-coat-acceptances",
//           localField: "_id",
//           foreignField: "drawing_id",
//           as: "finalCoatAcceptance"
//         }
//       },

//       // --- release note ---
//       {
//         $lookup: {
//           from: "erp-release-notes",
//           localField: "_id",
//           foreignField: "drawing_id",
//           as: "release_note"
//         }
//       }
//     ]);

//     const total = await Draw.countDocuments(matchObj);

//     return { status: 1, result: requestData, total };
//   } catch (error) {
//     console.error("oneGetDprGrid error:", error);
//     return { status: 2, result: error };
//   }
// };

// // --- Optimized dprGridReport ---
// exports.dprGridReport = async (req, res) => {
//   const { project } = req.body;
//   const page = req.query.page ? parseInt(req.query.page, 10) : 1;
//   const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
//   const search = req.query.search || "";

//   if (req.user && !req.error) {
//     try {
//       const data = await oneGetDprGrid(project, search, page, limit);

//       if (data.status === 1) {
//         sendResponse(res, 200, true, {
//           data: data.result,
//           pagination: {
//             total: data.total,
//             page,
//             pages: Math.ceil(data.total / limit),
//             limit
//           }
//         }, "DPR Grid Report fetched successfully");
//       } else {
//         sendResponse(res, 500, false, {}, "Failed to fetch DPR");
//       }
//     } catch (err) {
//       console.error("dprGridReport error:", err);
//       sendResponse(res, 500, false, {}, "Something went wrong");
//     }
//   } else {
//     sendResponse(res, 401, false, {}, "Unauthorized");
//   }
// };


// exports.dprGridReport = async (req, res) => {
//   const { project, page, limit } = req.query;

//   if (!req.user || req.error) {
//     return sendResponse(res, 401, false, {}, 'Unauthorized');
//   }

//   try {
//     // Convert page and limit to integers
//     const pageNumber = parseInt(page, 10);
//     const limitNumber = parseInt(limit, 10);
//     const offset = (pageNumber - 1) * limitNumber;

//     // Get the full data (or ideally modify oneGetDprGrid to accept pagination params)
//     const data = await oneGetDprGrid(project);
//     let requestData = data.result;

//     if (!Array.isArray(requestData) || requestData.length === 0) {
//       return sendResponse(res, 200, false, [], "No DPR Grid Report found");
//     }

//     // Paginate the data (if oneGetDprGrid doesn't support pagination natively)
//     const paginatedData = requestData.slice(offset, offset + limitNumber);

//     return sendResponse(res, 200, true, {
      
//       data: paginatedData,
//       pagination: {
//         total: requestData.length,
//         page: pageNumber,
//         limit: limitNumber,
//         totalPages: Math.ceil(requestData.length / limitNumber)
//       }
//     }, "DPR Grid Report fetched successfully");
//   } catch (error) {
//     return sendResponse(res, 500, false, {}, error.message);
//   }
// };


const oneGetDprGrid1 = async (project,search ) => {
  try {
    const matchObj = { deleted: false }

    if (project) {
      matchObj.project = new ObjectId(project)
    }

    const requestData = await Draw.aggregate([
      {
        $match: matchObj,
      },

      {
        $lookup: {
          from: "contractors",
          localField: "issued_person",
          foreignField: "_id",
          as: "contractorData",
        },
      },
      {
        $lookup: {
          from: "erp-drawing-grid-items",
          localField: "_id",
          foreignField: "drawing_id",
          as: "gridItemsDetails",
          pipeline: [
            {
              $lookup: {
                from: "erp-drawing-grids",
                localField: "grid_id",
                foreignField: "_id",
                as: "gridDetails",
                pipeline: [
                  {
                    $project: {
                      _id: 1,
                      drawing_id: 1,
                      grid_no: 1,
                      grid_qty: 1
                    }
                  }
                ]
              }
            },
            {
              $project: {
                _id: 1,
                drawing_id: 1,
                grid_id: 1,
                item_name: 1,
                gridDetails: 1,
                assembly_weight: 1,
                assembly_surface_area: 1,
              }
            }
          ]
        }
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
                as: "clientDetails",
              },
            },
          ],
        }
      },
      {
        $lookup: {
          from: "erp-drawing-grids",
          localField: "_id",
          foreignField: "drawing_id",
          as: "drGridDetails",
          pipeline: [
            {
              $project: {
                _id: 1,
                drawing_id: 1,
                grid_qty: 1,
                grid_no: 1,
              }
            }
          ]
        }
      },
      {
        $addFields: {
          drGridDetails: {
            $filter: {
              input: "$drGridDetails",
              as: "grid",
              cond: {
                $in: ["$$grid._id", {
                  $map: {
                    input: "$gridItemsDetails",
                    as: "item",
                    in: "$$item.grid_id"
                  }
                }]
              }
            }
          }
        }
      },
      // Issue Request =================================================================
      {
        $lookup: {
          from: "multi-drawing-issue_requests",
          let: {
            drawingId: "$_id",
            gridItems: "$gridItemsDetails"
          },
          pipeline: [
            {
              $match: { deleted: false }
            },
            {
              $unwind: "$items"
            },
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$items.drawing_id", "$$drawingId"] },
                    { $in: ["$items.grid_item_id", "$$gridItems._id"] },
                    // { $in: ["$items.grid_item_id", "$$gridItems.grid_id"] }
                  ]
                }
              }
            },
            {
              $lookup: {
                from: "erp-drawing-grid-items",
                localField: "items.grid_item_id",
                foreignField: "_id",
                as: "gridItemDetails"
              }
            },
            { $unwind: { path: "$gridItemDetails", preserveNullAndEmptyArrays: true } },
            {
              $lookup: {
                from: "erp-drawing-grids",
                localField: "gridItemDetails.grid_id",
                foreignField: "_id",
                as: "gridDetails"
              }
            },
            { $unwind: { path: "$gridDetails", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 0,
                issue_req_no: 1,
                used_grid_qty: "$items.used_grid_qty",
                createdAt: 1,
                grid_no: "$gridDetails.grid_no"
              }
            },
            {
              $group: {
                _id: {
                  issue_req_no: "$issue_req_no",
                  used_grid_qty: "$used_grid_qty",
                  grid_no: "$grid_no"
                },
                createdAt: { $first: "$createdAt" }
              }
            },
            {
              $project: {
                _id: 0,
                issue_req_no: "$_id.issue_req_no",
                used_grid_qty: "$_id.used_grid_qty",
                grid_no: "$_id.grid_no",
                createdAt: 1
              }
            }
          ],
          as: "issueRequests"
        }
      },
      // Issue Acceptance =================================================================
      {
        $lookup: {
          from: "multi-drawing-issue-acceptances",
          let: {
            drawingId: "$_id",
            gridItems: "$gridItemsDetails"
          },
          pipeline: [
            {
              $match: { deleted: false }
            },
            {
              $unwind: "$items"
            },
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$items.drawing_id", "$$drawingId"] },
                    { $in: ["$items.grid_item_id", "$$gridItems._id"] },
                    // { $in: ["$items.grid_item_id", "$$gridItems.grid_id"] }
                  ]
                }
              }
            },
            {
              $lookup: {
                from: "multi-drawing-issue_requests",
                localField: "issue_req_id",
                foreignField: "_id",
                as: "issReqDetails",
              },
            },
            {
              $addFields: {
                issReqDetails: { $arrayElemAt: ["$issReqDetails", 0] },
              },
            },
            {
              $lookup: {
                from: "erp-drawing-grid-items",
                localField: "items.grid_item_id",
                foreignField: "_id",
                as: "gridItemDetails"
              }
            },
            { $unwind: { path: "$gridItemDetails", preserveNullAndEmptyArrays: true } },
            {
              $lookup: {
                from: "erp-drawing-grids",
                localField: "gridItemDetails.grid_id",
                foreignField: "_id",
                as: "gridDetails"
              }
            },
            { $unwind: { path: "$gridDetails", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 0,
                issue_accept_no: 1,
                issue_req_no: "$issReqDetails.issue_req_no",
                used_grid_qty: "$items.iss_used_grid_qty",
                grid_no: "$gridDetails.grid_no",
                is_accepted: "$items.is_accepted",
                createdAt: 1,
              }
            },
            {
              $group: {
                _id: {
                  issue_accept_no: "$issue_accept_no",
                  issue_req_no: "$issue_req_no",
                  used_grid_qty: "$used_grid_qty",
                  is_accepted: "$is_accepted",
                  grid_no: "$grid_no"
                },
                createdAt: { $first: "$createdAt" }
              }
            },
            {
              $project: {
                _id: 0,
                issue_accept_no: "$_id.issue_accept_no",
                issue_req_no: "$_id.issue_req_no",
                used_grid_qty: "$_id.used_grid_qty",
                is_accepted: "$_id.is_accepted",
                grid_no: "$_id.grid_no",
                createdAt: 1,
              }
            },
        ...(search && search.trim() !== ""
  ? [
      {
        $match: {
          $or: [
            { drawing_no: { $regex: search, $options: "i" } },
            { rev: { $regex: search, $options: "i" } },
            { assembly_no: { $regex: search, $options: "i" } },
            { "gridItemsDetails.item_name": { $regex: search, $options: "i" } },
            { "drGridDetails.grid_no": { $regex: search, $options: "i" } },
            { "contractorData.name": { $regex: search, $options: "i" } },
            { "projectDetails.project_name": { $regex: search, $options: "i" } },
            { "projectDetails.clientDetails.party_name": { $regex: search, $options: "i" } }
          ]
        }
      }
    ]
  : []),
          ],
          as: "issueAcceptance",
        }
      },
      // Fitup Details ==================================================================
      {
        $lookup: {
          from: "multi-erp-fitup-inspections",
          let: {
            drawingId: "$_id",
            gridItems: "$gridItemsDetails"
          },
          pipeline: [
            {
              $match: { deleted: false }
            },
            {
              $unwind: "$items"
            },
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$items.drawing_id", "$$drawingId"] },
                    { $in: ["$items.grid_item_id", "$$gridItems._id"] },
                    // { $in: ["$items.grid_item_id", "$$gridItems.grid_id"] }
                  ]
                }
              }
            },
            {
              $lookup: {
                from: "erp-drawing-grid-items",
                localField: "items.grid_item_id",
                foreignField: "_id",
                as: "gridItemDetails"
              }
            },
            { $unwind: { path: "$gridItemDetails", preserveNullAndEmptyArrays: true } },
            {
              $lookup: {
                from: "erp-drawing-grids",
                localField: "gridItemDetails.grid_id",
                foreignField: "_id",
                as: "gridDetails"
              }
            },
            { $unwind: { path: "$gridDetails", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 0,
                report_no: 1,
                report_no_two: 1,
                createdAt: 1,
                status: 1, // 1 = Pending, 2/3 = Accepted/Rejected,
                fitOff_used_grid_qty: "$items.fitOff_used_grid_qty",
                grid_no: "$gridDetails.grid_no",
                is_accepted: "$items.is_accepted",
                qc_date: "$qc_time",
              }
            },
            {
              $group: {
                _id: {
                  report_no: "$report_no",
                  report_no_two: "$report_no_two",
                  status: "$status",
                  fitOff_used_grid_qty: "$fitOff_used_grid_qty",
                  is_accepted: "$is_accepted",
                  grid_no: "$grid_no",
                },
                createdAt: { $first: "$createdAt" },
                qc_date: { $first: "$qc_date" }
              }
            },
            {
              $project: {
                _id: 0,
                report_no: "$_id.report_no",
                report_no_two: "$_id.report_no_two",
                createdAt: 1,
                status: "$_id.status",
                fitOff_used_grid_qty: "$_id.fitOff_used_grid_qty",
                is_accepted: "$_id.is_accepted",
                qc_date: 1,
                grid_no: "$_id.grid_no",
              }
            }
          ],
          as: "fitupDetails",
        }
      },
      {
        $addFields: {
          fitupOffer: {
            $filter: {
              input: "$fitupDetails",
              as: "fitup",
              cond: { $gte: ["$$fitup.status", 1] } // Pending Fitup Offers
            }
          },
          fitupAcceptance: {
            $filter: {
              input: "$fitupDetails",
              as: "fitup",
              cond: { $in: ["$$fitup.status", [2, 3]] } // Approved/Rejected Fitup Acceptances
            }
          }
        }
      },
      // Weld Visual Field ==================================================================
      {
        $lookup: {
          from: "multi-erp-weldvisual-inspections",
          let: {
            drawingId: "$_id",
            gridItems: "$gridItemsDetails"
          },
          pipeline: [
            {
              $match: { deleted: false }
            },
            {
              $unwind: "$items"
            },
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$items.drawing_id", "$$drawingId"] },
                    { $in: ["$items.grid_item_id", "$$gridItems._id"] },
                    // { $in: ["$items.grid_item_id", "$$gridItems.grid_id"] }
                  ]
                }
              }
            },
            {
              $lookup: {
                from: "erp-drawing-grid-items",
                localField: "items.grid_item_id",
                foreignField: "_id",
                as: "gridItemDetails"
              }
            },
            { $unwind: { path: "$gridItemDetails", preserveNullAndEmptyArrays: true } },
            {
              $lookup: {
                from: "erp-drawing-grids",
                localField: "gridItemDetails.grid_id",
                foreignField: "_id",
                as: "gridDetails"
              }
            },
            { $unwind: { path: "$gridDetails", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 0,
                report_no: 1,
                report_no_two: 1,
                createdAt: 1,
                status: 1, // 1 = Pending, 2/3 = Accepted/Rejected,
                weld_used_grid_qty: "$items.weld_used_grid_qty",
                is_accepted: "$items.is_accepted",
                grid_no: "$gridDetails.grid_no",
                qc_date: "$qc_time",
              }
            },
            {
              $group: {
                _id: {
                  report_no: "$report_no",
                  report_no_two: "$report_no_two",
                  status: "$status",
                  weld_used_grid_qty: "$weld_used_grid_qty",
                  is_accepted: "$is_accepted",
                  grid_no: "$grid_no",
                },
                createdAt: { $first: "$createdAt" },
                qc_date: { $first: "$qc_date" }
              }
            },
            {
              $project: {
                _id: 0,
                report_no: "$_id.report_no",
                report_no_two: "$_id.report_no_two",
                status: "$_id.status",
                weld_used_grid_qty: "$_id.weld_used_grid_qty",
                is_accepted: "$_id.is_accepted",
                createdAt: 1,
                grid_no: "$_id.grid_no",
                qc_date: 1,
              }
            }
          ],
          as: "weldVisualDetails",
        },
      },
      {
        $addFields: {
          weldVisualOffer: {
            $filter: {
              input: "$weldVisualDetails",
              as: "weld",
              cond: { $gte: ["$$weld.status", 1] }
            }
          },
          weldVisualAcceptance: {
            $filter: {
              input: "$weldVisualDetails",
              as: "weld",
              cond: { $in: ["$$weld.status", [2, 3]] }
            }
          }
        }
      },
      // NDT Details =================================================================
      {
        $lookup: {
          from: "multi-erp-ndt-masters",
          let: {
            drawingId: "$_id",
            gridItems: "$gridItemsDetails"
          },
          pipeline: [
            {
              $match: { deleted: false }
            },
            {
              $unwind: "$items"
            },
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$items.drawing_id", "$$drawingId"] },
                    { $in: ["$items.grid_item_id", "$$gridItems._id"] },
                    // { $in: ["$items.grid_item_id", "$$gridItems.grid_id"] }
                  ]
                }
              }
            },
            {
              $lookup: {
                from: "erp-drawing-grid-items",
                localField: "items.grid_item_id",
                foreignField: "_id",
                as: "gridItemDetails"
              }
            },
            { $unwind: { path: "$gridItemDetails", preserveNullAndEmptyArrays: true } },
            {
              $lookup: {
                from: "erp-drawing-grids",
                localField: "gridItemDetails.grid_id",
                foreignField: "_id",
                as: "gridDetails"
              }
            },
            { $unwind: { path: "$gridDetails", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 0,
                report_no: 1,
                ut_status: 1,
                rt_status: 1,
                mpt_status: 1,
                lpt_status: 1,
                createdAt: 1,
                status: 1, // 1 = Pending, 2/3 = Accepted/Rejected,
                ndt_used_grid_qty: "$items.ndt_used_grid_qty",
                grid_no: "$gridDetails.grid_no",
              }
            },
            {
              $group: {
                _id: {
                  report_no: "$report_no",
                  ut_status: "$ut_status",
                  rt_status: "$rt_status",
                  mpt_status: "$mpt_status",
                  lpt_status: "$lpt_status",
                  status: "$status",
                  ndt_used_grid_qty: "$ndt_used_grid_qty",
                  grid_no: "$grid_no",
                },
                createdAt: { $first: "$createdAt" }
              }
            },
            {
              $project: {
                _id: 0,
                report_no: "$_id.report_no",
                status: "$_id.status",
                createdAt: 1,
                ndt_used_grid_qty: "$_id.ndt_used_grid_qty",
                grid_no: "$_id.grid_no",
                // Managing statuses
                ut_status: {
                  $switch: {
                    branches: [
                      { case: { $eq: ["$_id.ut_status", 1] }, then: "Pending" },
                      { case: { $eq: ["$_id.ut_status", 2] }, then: "Offered" },
                      { case: { $eq: ["$_id.ut_status", 3] }, then: "Completed" }
                    ],
                    default: ""
                  }
                },
                rt_status: {
                  $switch: {
                    branches: [
                      { case: { $eq: ["$_id.rt_status", 1] }, then: "Pending" },
                      { case: { $eq: ["$_id.rt_status", 2] }, then: "Offered" },
                      { case: { $eq: ["$_id.rt_status", 3] }, then: "Completed" }
                    ],
                    default: ""
                  }
                },
                mpt_status: {
                  $switch: {
                    branches: [
                      { case: { $eq: ["$_id.mpt_status", 1] }, then: "Pending" },
                      { case: { $eq: ["$_id.mpt_status", 2] }, then: "Offered" },
                      { case: { $eq: ["$_id.mpt_status", 3] }, then: "Completed" }
                    ],
                    default: ""
                  }
                },
                lpt_status: {
                  $switch: {
                    branches: [
                      { case: { $eq: ["$_id.lpt_status", 1] }, then: "Pending" },
                      { case: { $eq: ["$_id.lpt_status", 2] }, then: "Offered" },
                      { case: { $eq: ["$_id.lpt_status", 3] }, then: "Completed" }
                    ],
                    default: ""
                  }
                }
              }
            }
          ],
          as: "ndtDetails",
        }
      },
      // Final Dimension Details ==================================================================
      {
        $lookup: {
          from: "multi-erp-fd-masters",
          let: {
            drawingId: "$_id",
            gridItems: "$gridItemsDetails"
          },
          pipeline: [
            {
              $match: { deleted: false }
            },
            {
              $unwind: "$items"
            },
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$items.drawing_id", "$$drawingId"] },
                    { $in: ["$items.grid_id", "$$gridItems.grid_id"] }
                  ]
                }
              }
            },
            {
              $lookup: {
                from: "erp-drawing-grids",
                localField: "items.grid_id",
                foreignField: "_id",
                as: "fdGridDetails",
                pipeline: [
                  {
                    $project: {
                      _id: 1,
                      grid_no: 1,
                      grid_qty: 1
                    }
                  }
                ]
              }
            },
            {
              $addFields: {
                fdGridDetails: { $arrayElemAt: ["$fdGridDetails", 0] },
              },
            },
            {
              $project: {
                _id: 0,
                report_no: 1,
                report_no_two: 1,
                createdAt: 1,
                grid_id: "$fdGridDetails",
                status: 1, // 1 = Pending, 2/3 = Accepted/Rejected,
                fd_used_grid_qty: "$items.fd_used_grid_qty",
                is_accepted: "$items.is_accepted",
                qc_date: "$qc_time",
              }
            },
            {
              $group: {
                _id: {
                  report_no: "$report_no",
                  report_no_two: "$report_no_two",
                  status: "$status",
                  grid_id: "$grid_id",
                  fd_used_grid_qty: "$fd_used_grid_qty",
                  is_accepted: "$is_accepted"
                },
                createdAt: { $first: "$createdAt" },
                qc_date: { $first: "$qc_date" },
              }
            },
            {
              $project: {
                _id: 0,
                report_no: "$_id.report_no",
                report_no_two: "$_id.report_no_two",
                createdAt: 1,
                grid_id: "$_id.grid_id",
                status: "$_id.status",
                fd_used_grid_qty: "$_id.fd_used_grid_qty",
                is_accepted: "$_id.is_accepted",
                qc_date: 1,
              }
            }
          ],
          as: "fdDetails",
        },
      },
      {
        $addFields: {
          fdOffer: {
            $filter: {
              input: "$fdDetails",
              as: "fd",
              cond: { $gte: ["$$fd.status", 1] }
            }
          },
          fdAcceptance: {
            $filter: {
              input: "$fdDetails",
              as: "fd",
              cond: { $in: ["$$fd.status", [2, 3]] }
            }
          }
        }
      },
      // Inspection Summary
      {
        $lookup: {
          from: "multi-erp-inspect-summaries",
          let: {
            drawingId: "$_id",
            gridItems: "$gridItemsDetails"
          },
          pipeline: [
            { $match: { deleted: false, is_generate: true } },
            {
              $unwind: "$items"
            },
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$items.drawing_id", "$$drawingId"] },
                    { $in: ["$items.grid_id", "$$gridItems.grid_id"] }
                  ]
                }
              }
            },
            {
              $lookup: {
                from: "erp-drawing-grids",
                localField: "items.grid_id",
                foreignField: "_id",
                as: "summaryGridDetails",
                pipeline: [
                  {
                    $project: {
                      _id: 1,
                      grid_no: 1,
                      grid_qty: 1
                    }
                  }
                ]
              }
            },
            {
              $addFields: {
                summaryGridDetails: { $arrayElemAt: ["$summaryGridDetails", 0] },
              },
            },
            {
              $project: {
                _id: 0,
                report_no: 1,
                batch_id: 1,
                is_grid_qty: "$items.is_grid_qty",
                grid_id: "$summaryGridDetails",
                summary_date: 1,
              }
            },
            {
              $group: {
                _id: {
                  report_no: "$report_no",
                  batch_id: "$batch_id",
                  grid_id: "$grid_id",
                  is_grid_qty: "$is_grid_qty"
                },
                summary_date: { $first: "$summary_date" },
              }
            },
            {
              $project: {
                _id: 0,
                report_no: "$_id.report_no",
                batch_id: "$_id.batch_id",
                grid_id: "$_id.grid_id",
                is_grid_qty: "$_id.is_grid_qty",
                summary_date: 1,
              }
            }
          ],
          as: "insSummaryDetails",
        }
      },

      // Dispatch Note =================================================================
      {
        $lookup: {
          from: "multi-erp-painting-dispatch-notes",
          let: {
            drawingId: "$_id",
            gridItems: "$gridItemsDetails"
          },
          pipeline: [
            {
              $match: { deleted: false }
            },
            {
              $unwind: "$items"
            },
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$items.drawing_id", "$$drawingId"] },
                    { $in: ["$items.grid_id", "$$gridItems.grid_id"] }
                  ]
                }
              }
            },
            {
              $lookup: {
                from: "erp-drawing-grids",
                localField: "items.grid_id",
                foreignField: "_id",
                as: "dnGridDetails",
                pipeline: [
                  {
                    $project: {
                      _id: 1,
                      grid_no: 1,
                      grid_qty: 1
                    }
                  }
                ]
              }
            },
            {
              $addFields: {
                dnGridDetails: { $arrayElemAt: ["$dnGridDetails", 0] },
              },
            },
            {
              $project: {
                _id: 0,
                report_no: 1,
                dispatch_used_grid_qty: "$items.dispatch_used_grid_qty",
                grid_id: "$dnGridDetails",
                createdAt: 1,
              }
            },
            {
              $group: {
                _id: {
                  report_no: "$report_no",
                  grid_id: "$grid_id",
                  dispatch_used_grid_qty: "$dispatch_used_grid_qty"
                },
                createdAt: { $first: "$createdAt" },
              }
            },
            {
              $project: {
                _id: 0,
                report_no: "$_id.report_no",
                grid_id: "$_id.grid_id",
                dispatch_used_grid_qty: "$_id.dispatch_used_grid_qty",
                createdAt: 1,
              }
            }
          ],
          as: "dnDetails",
        },
      },
      // Surface Details =================================================================
      {
        $lookup: {
          from: "multi-erp-surface-inspections",
          let: {
            drawingId: "$_id",
            gridItems: "$gridItemsDetails"
          },
          pipeline: [
            {
              $match: { deleted: false }
            },
            {
              $unwind: "$items"
            },
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$items.drawing_id", "$$drawingId"] },
                    { $in: ["$items.grid_id", "$$gridItems.grid_id"] }
                  ]
                }
              }
            },
            {
              $lookup: {
                from: "erp-drawing-grids",
                localField: "items.grid_id",
                foreignField: "_id",
                as: "surfaceGridDetails",
                pipeline: [
                  {
                    $project: {
                      _id: 1,
                      grid_no: 1,
                      grid_qty: 1
                    }
                  }
                ]
              }
            },
            {
              $addFields: {
                surfaceGridDetails: { $arrayElemAt: ["$surfaceGridDetails", 0] },
              },
            },
            {
              $project: {
                _id: 0,
                report_no: 1,
                report_no_two: 1,
                status: 1, // 1-Pending 2-Partially 3-Approved 4-Rejected 
                surface_used_grid_qty: "$items.surface_used_grid_qty",
                grid_id: "$surfaceGridDetails",
                is_accepted: "$items.is_accepted", // 2- Acc, 3- Rej
                createdAt: 1,
                qc_date: 1,
              }
            },
            {
              $group: {
                _id: {
                  report_no: "$report_no",
                  grid_id: "$grid_id",
                  report_no_two: "$report_no_two",
                  status: "$status",
                  surface_used_grid_qty: "$surface_used_grid_qty",
                  is_accepted: "$is_accepted",
                },
                qc_date: { $first: "$qc_date" },
                createdAt: { $first: "$createdAt" },
              }
            },
            {
              $project: {
                _id: 0,
                report_no: "$_id.report_no",
                report_no_two: "$_id.report_no_two",
                grid_id: "$_id.grid_id",
                status: "$_id.status",
                surface_used_grid_qty: "$_id.surface_used_grid_qty",
                is_accepted: "$_id.is_accepted",
                createdAt: 1,
                qc_date: 1,
              }
            }
          ],
          as: "surfaceDetails",
        }
      },
      {
        $addFields: {
          surfaceOffer: {
            $filter: {
              input: "$surfaceDetails",
              as: "surface",
              cond: { $gte: ["$$surface.status", 1] }
            }
          },
          surfaceAcceptance: {
            $filter: {
              input: "$surfaceDetails",
              as: "surface",
              cond: { $in: ["$$surface.status", [2, 3, 4]] }
            }
          }
        }
      },
      // MIO Details =================================================================
      {
        $lookup: {
          from: "multi-erp-mio-inspections",
          let: {
            drawingId: "$_id",
            gridItems: "$gridItemsDetails"
          },
          pipeline: [
            {
              $match: { deleted: false }
            },
            {
              $unwind: "$items"
            },
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$items.drawing_id", "$$drawingId"] },
                    { $in: ["$items.grid_id", "$$gridItems.grid_id"] }
                  ]
                }
              }
            },
            {
              $lookup: {
                from: "erp-drawing-grids",
                localField: "items.grid_id",
                foreignField: "_id",
                as: "mioGridDetails",
                pipeline: [
                  {
                    $project: {
                      _id: 1,
                      grid_no: 1,
                      grid_qty: 1
                    }
                  }
                ]
              }
            },
            {
              $addFields: {
                mioGridDetails: { $arrayElemAt: ["$mioGridDetails", 0] },
              },
            },
            {
              $project: {
                _id: 0,
                report_no: 1,
                report_no_two: 1,
                status: 1, // 1-Pending 2-Partially 3-Approved 4-Rejected 
                mio_used_grid_qty: "$items.mio_used_grid_qty",
                grid_id: "$mioGridDetails",
                is_accepted: "$items.is_accepted", // 2- Acc, 3- Rej
                createdAt: 1,
                qc_date: 1,
              }
            },
            {
              $group: {
                _id: {
                  report_no: "$report_no",
                  grid_id: "$grid_id",
                  report_no_two: "$report_no_two",
                  status: "$status",
                  mio_used_grid_qty: "$mio_used_grid_qty",
                  is_accepted: "$is_accepted"
                },
                createdAt: { $first: "$createdAt" },
                qc_date: { $first: "$qc_date" },
              }
            },
            {
              $project: {
                _id: 0,
                report_no: "$_id.report_no",
                report_no_two: "$_id.report_no_two",
                grid_id: "$_id.grid_id",
                status: "$_id.status",
                mio_used_grid_qty: "$_id.mio_used_grid_qty",
                is_accepted: "$_id.is_accepted",
                createdAt: 1,
                qc_date: 1,
              }
            }
          ],
          as: "mioDetails",
        }
      },
      {
        $addFields: {
          mioOffer: {
            $filter: {
              input: "$mioDetails",
              as: "mio",
              cond: { $gte: ["$$mio.status", 1] }
            }
          },
          mioAcceptance: {
            $filter: {
              input: "$mioDetails",
              as: "mio",
              cond: { $in: ["$$mio.status", [2, 3, 4]] }
            }
          }
        }
      },
      // Final Coat Details =================================================================
      {
        $lookup: {
          from: "multi-erp-final-coat-inspections",
          let: {
            drawingId: "$_id",
            gridItems: "$gridItemsDetails"
          },
          pipeline: [
            {
              $match: { deleted: false }
            },
            {
              $unwind: "$items"
            },
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$items.drawing_id", "$$drawingId"] },
                    { $in: ["$items.grid_id", "$$gridItems.grid_id"] }
                  ]
                }
              }
            },
            {
              $lookup: {
                from: "erp-drawing-grids",
                localField: "items.grid_id",
                foreignField: "_id",
                as: "fcGridDetails",
                pipeline: [
                  {
                    $project: {
                      _id: 1,
                      grid_no: 1,
                      grid_qty: 1
                    }
                  }
                ]
              }
            },
            {
              $addFields: {
                fcGridDetails: { $arrayElemAt: ["$fcGridDetails", 0] },
              },
            },
            {
              $project: {
                _id: 0,
                report_no: 1,
                report_no_two: 1,
                status: 1, // 1-Pending 2-Partially 3-Approved 4-Rejected 
                fc_used_grid_qty: "$items.fc_used_grid_qty",
                grid_id: "$fcGridDetails",
                is_accepted: "$items.is_accepted", // 2- Acc, 3- Rej
                createdAt: 1,
                qc_date: 1,
              }
            },
            {
              $group: {
                _id: {
                  report_no: "$report_no",
                  grid_id: "$grid_id",
                  report_no_two: "$report_no_two",
                  status: "$status",
                  fc_used_grid_qty: "$fc_used_grid_qty",
                  is_accepted: "$is_accepted"
                },
                createdAt: { $first: "$createdAt" },
                qc_date: { $first: "$qc_date" },
              }
            },
            {
              $project: {
                _id: 0,
                report_no: "$_id.report_no",
                report_no_two: "$_id.report_no_two",
                grid_id: "$_id.grid_id",
                status: "$_id.status",
                fc_used_grid_qty: "$_id.fc_used_grid_qty",
                is_accepted: "$_id.is_accepted",
                createdAt: 1,
                qc_date: 1,
              }
            }
          ],
          as: "finalCoatDetails",
        },
      },
      {
        $addFields: {
          finalCoatOffer: {
            $filter: {
              input: "$finalCoatDetails",
              as: "finalCoat",
              cond: { $gte: ["$$finalCoat.status", 1] }
            }
          },
          finalCoatAcceptance: {
            $filter: {
              input: "$finalCoatDetails",
              as: "finalCoat",
              cond: { $in: ["$$finalCoat.status", [2, 3, 4]] }
            }
          }
        }
      },

      // Release Note Details =================================================================
      {
        $lookup: {
          from: "multi-erp-ins-release-notes",
          let: {
            drawingId: "$_id",
            gridItems: "$gridItemsDetails"
          },
          pipeline: [
            { $match: { deleted: false, is_generate: true } },
            {
              $unwind: "$items"
            },
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$items.drawing_id", "$$drawingId"] },
                    { $in: ["$items.grid_id", "$$gridItems.grid_id"] }
                  ]
                }
              }
            },
            {
              $lookup: {
                from: "erp-drawing-grids",
                localField: "items.grid_id",
                foreignField: "_id",
                as: "rnGridDetails",
                pipeline: [
                  {
                    $project: {
                      _id: 1,
                      grid_no: 1,
                      grid_qty: 1
                    }
                  }
                ]
              }
            },
            {
              $addFields: {
                rnGridDetails: { $arrayElemAt: ["$rnGridDetails", 0] },
              },
            },
            {
              $project: {
                _id: 0,
                report_no: 1,
                batch_id: 1,
                is_grid_qty: "$items.is_grid_qty",
                grid_id: "$rnGridDetails",
                release_date: 1,
              }
            },
            {
              $group: {
                _id: {
                  report_no: "$report_no",
                  batch_id: "$batch_id",
                  grid_id: "$grid_id",
                  is_grid_qty: "$is_grid_qty"
                },
                release_date: { $first: "$release_date" },
              }
            },
            {
              $project: {
                _id: 0,
                report_no: "$_id.report_no",
                batch_id: "$_id.batch_id",
                grid_id: "$_id.grid_id",
                is_grid_qty: "$_id.is_grid_qty",
                release_date: 1,
              }
            }
          ],
          as: "rnDetails",
        }
      },

      // ==========================================================
      {
        $addFields: {
          projectDetails: { $arrayElemAt: ["$projectDetails", 0] },
          contractorData: { $arrayElemAt: ["$contractorData", 0] },
        },
      },
      {
        $addFields: {
          clientDetails: {
            $arrayElemAt: ["$projectDetails.clientDetails", 0],
          },
        },
      },
      {
        $project: {
          _id: 1,
          issued_name: "$contractorData.name",
          issued_id: "$contractorData._id",
          issued_date: "$issued_date",
          project_id: "$projectDetails._id",
          project_name: "$projectDetails.name",
          wo_no: "$projectDetails.work_order_no",
          project_po_no: "$projectDetails.work_order_no",
          client: "$clientDetails.name",
          drawing_no: "$drawing_no",
          unit: "$unit",
          rev: "$rev",
          assembly_no: "$assembly_no",
          assembly_quantity: "$assembly_quantity",
          grid_items: "$gridItemsDetails",
          grid_data: "$drGridDetails",
          issue_requests: "$issueRequests",
          issue_acceptance: "$issueAcceptance",
          fitupOffer: { report_no: 1, createdAt: 1, fitOff_used_grid_qty: 1, grid_no: 1, },
          fitupAcceptance: { report_no: 1, report_no_two: 1, is_accepted: 1, fitOff_used_grid_qty: 1, qc_date: 1, grid_no: 1 },
          weldVisualOffer: { report_no: 1, createdAt: 1, weld_used_grid_qty: 1, grid_no: 1, },
          weldVisualAcceptance: { report_no: 1, report_no_two: 1, is_accepted: 1, weld_used_grid_qty: 1, qc_date: 1, grid_no: 1, },
          ndt_details: "$ndtDetails",

          fdOffer: { report_no: 1, createdAt: 1, fd_used_grid_qty: 1, grid_id: 1, },
          fdAcceptance: { report_no: 1, report_no_two: 1, is_accepted: 1, fd_used_grid_qty: 1, grid_id: 1, qc_date: 1 },

          dispatch_note: "$dnDetails",

          insSummary: "$insSummaryDetails",

          surfaceOffer: { report_no: 1, createdAt: 1, surface_used_grid_qty: 1, grid_id: 1, },
          surfaceAcceptance: { report_no: 1, report_no_two: 1, is_accepted: 1, surface_used_grid_qty: 1, grid_id: 1, qc_date: 1 },
          mioOffer: { report_no: 1, createdAt: 1, mio_used_grid_qty: 1, grid_id: 1, },
          mioAcceptance: { report_no: 1, report_no_two: 1, createdAt: 1, is_accepted: 1, mio_used_grid_qty: 1, grid_id: 1, qc_date: 1 },
          finalCoatOffer: { report_no: 1, createdAt: 1, fc_used_grid_qty: 1, grid_id: 1, },
          finalCoatAcceptance: { report_no: 1, report_no_two: 1, createdAt: 1, is_accepted: 1, fc_used_grid_qty: 1, grid_id: 1, qc_date: 1 },

          release_note: "$rnDetails"
        }
      },

     
    ]);

    

    if (requestData.length > 0) {
      return { status: 1, result: requestData };
    } else {
      return { status: 0, result: [] };
    }
  } catch (error) {
    console.log(error, '333')
    return { status: 2, result: error };
  }
}

exports.drpXlsxGridReport = async (req, res) => {
  const { project } = req.body;
  if (!req.user || req.error) {
    return sendResponse(res, 401, false, {}, 'Unauthorized');
  }
  try {
    const data = await oneGetDprGrid1(project);
    let requestData = data.result;
    if (requestData?.length > 0) {
      const grouped = requestData.reduce((acc, item) => {
        const key = `${item.drawing_no}-${item.unit}-${item.assembly_no}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      }, {});

      Object.values(grouped).forEach(group => {
        const maxRev = Math.max(...group.map(item => item.rev));
        group.forEach(item => {
          item.isMain = item.rev === maxRev;
        });
      });

      const flattenedData = Object.values(grouped).flat();


      const x = flattenedData.filter((item) => {
        return item.isMain === false
      });
      console.log("x", x);
      console.log("xlength", x.length);
      console.log("flattenedDatalength", flattenedData.length);

      const workbook = new excelJs.Workbook();
      const worksheet = workbook.addWorksheet('Rejected Data');

      // Define column headers
      const columnHeaders = [
        "SR.", "DRAW NO.", "REV", "ASSEM. NO.", "ASSEM. QTY.", "UNIT/AREA", "DR.ISS. NAME", "DR.ISS. DT.",
        "GRID NO.", "GRID QTY.", "UNIT WEIGHT(KG)", "TOTAL WEIGHT(KG)", "UNIT ASM(SQM)", "TOTAL ASM(SQM)",
        "ISS. REQ.", "ISS. ACC.", "FITUP OFF.", "FITUP ACC.", "WELD OFF.", "WELD ACC.", "NDT ACC",
        "FD OFF.", "FD ACC.", "INS. SUMMARY", "DIS. NOTE", "SURFACE OFF.", "SURFACE ACC.",
        "MIO OFF.", "MIO ACC.", "FINAL COAT OFF.", "FINAL COAT ACC.", "RELEASE NOTE"
      ];

      worksheet.addRow(columnHeaders);

      worksheet.columns = [
        { width: 6 }, { width: 40 }, { width: 6 }, { width: 20 }, { width: 10 }, { width: 30 }, { width: 30 }, { width: 12 },
        { width: 18 }, { width: 10 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 },
        { width: 35 }, { width: 35 }, { width: 35 }, { width: 35 }, { width: 35 }, { width: 35 }, { width: 35 },
        { width: 35 }, { width: 35 }, { width: 35 }, { width: 35 }, { width: 35 }, { width: 35 },
        { width: 35 }, { width: 35 }, { width: 35 }, { width: 35 }, { width: 35 }
      ];

      let rowIndex = 1;
      flattenedData.forEach((elem, i) => {

        const gridStatsMap = elem.grid_items?.reduce((acc, item) => {
          const gridId = item.grid_id;
          if (!acc[gridId]) {
            acc[gridId] = {
              totalAssemblyWeight: 0,
              totalAssemblySurfaceArea: 0,
            };
          }
          acc[gridId].totalAssemblyWeight += item.assembly_weight || 0;
          acc[gridId].totalAssemblySurfaceArea += item.assembly_surface_area || 0;
          return acc;
        }, {});

        const maxRows = Math.max(
          elem.grid_data?.length || 0,
          elem.issue_requests?.length || 0,
          elem.issue_acceptance?.length || 0,
          elem.fitupOffer?.length || 0,
          elem.fitupAcceptance?.length || 0,
          elem.weldVisualOffer?.length || 0,
          elem.weldVisualAcceptance?.length || 0,
          elem.ndt_details?.length || 0,
          elem.fdOffer?.length || 0,
          elem.fdAcceptance?.length || 0,
          elem.insSummary?.length || 0,
          elem.dispatch_note?.length || 0,
          elem.surfaceOffer?.length || 0,
          elem.surfaceAcceptance?.length || 0,
          elem.mioOffer?.length || 0,
          elem.mioAcceptance?.length || 0,
          elem.finalCoatOffer?.length || 0,
          elem.finalCoatAcceptance?.length || 0,
          elem.release_note?.length || 0,
          1
        );

        for (let rowIdx = 0; rowIdx < maxRows; rowIdx++) {

          const gridId = elem?.grid_data?.[rowIdx]?._id;
          const gridNo = elem?.grid_data?.[rowIdx]?.grid_no || "-";
          const gridQty = elem?.grid_data?.[rowIdx]?.grid_qty || 0;

          const totalAssemblyWeight = gridId ? gridStatsMap?.[gridId]?.totalAssemblyWeight || 0 : 0;
          const totalAssemblySurfaceArea = gridId ? gridStatsMap?.[gridId]?.totalAssemblySurfaceArea || 0 : 0;

          const totalWeight = gridQty > 0 ? totalAssemblyWeight * gridQty : "-";
          const unitWeight = gridQty > 0 ? (totalWeight / gridQty).toFixed(2) : "-";

          const totalSurfaceArea = gridQty > 0 ? totalAssemblySurfaceArea * gridQty : "-";
          const unitSurfaceArea = gridQty > 0 ? (totalSurfaceArea / gridQty).toFixed(2) : "-";

          const row = [
            rowIndex++,
            elem.drawing_no, elem.rev, elem.assembly_no, elem.assembly_quantity, elem.unit,
            elem.issued_name, elem.issued_date ? moment(elem.issued_date).format('YYYY-MM-DD') : "-",
            elem.grid_data?.[rowIdx]?.grid_no || "-",
            elem.grid_data?.[rowIdx]?.grid_qty || "-",
            unitWeight, totalWeight, unitSurfaceArea, totalSurfaceArea,
            elem.issue_requests?.[rowIdx]?.createdAt
              ? `${moment(elem.issue_requests?.[rowIdx]?.createdAt).format('YYYY-MM-DD HH:mm')} (${elem.issue_requests?.[rowIdx]?.grid_no || '-'}-${elem.issue_requests?.[rowIdx]?.used_grid_qty || '-'})`
              : '-',
            elem.issue_acceptance?.[rowIdx]?.createdAt
              ? `${moment(elem.issue_acceptance?.[rowIdx]?.createdAt).format('YYYY-MM-DD HH:mm')} (${elem.issue_acceptance?.[rowIdx]?.grid_no || '-'}-${elem.issue_acceptance?.[rowIdx]?.used_grid_qty || '-'})`
              : '-',
            elem.fitupOffer?.[rowIdx]?.createdAt
              ? `${moment(elem.fitupOffer?.[rowIdx]?.createdAt).format('YYYY-MM-DD HH:mm')} (${elem.fitupOffer?.[rowIdx]?.grid_no || '-'}-${elem.fitupOffer?.[rowIdx]?.fitOff_used_grid_qty || '-'})`
              : '-',
            elem.fitupAcceptance?.[rowIdx]?.qc_date
              ? `${moment(elem.fitupAcceptance?.[rowIdx]?.qc_date).format('YYYY-MM-DD HH:mm')} (${elem.fitupAcceptance?.[rowIdx]?.grid_no || '-'}-${elem.fitupAcceptance?.[rowIdx]?.fitOff_used_grid_qty || '-'})`
              : '-',
            elem.weldVisualOffer?.[rowIdx]?.createdAt
              ? `${moment(elem.weldVisualOffer?.[rowIdx]?.createdAt).format('YYYY-MM-DD HH:mm')} (${elem.weldVisualOffer?.[rowIdx]?.grid_no || '-'}-${elem.weldVisualOffer?.[rowIdx]?.weld_used_grid_qty || '-'})`
              : '-',
            elem.weldVisualAcceptance?.[rowIdx]?.qc_date
              ? `${moment(elem.weldVisualAcceptance?.[rowIdx]?.qc_date).format('YYYY-MM-DD HH:mm')} (${elem.weldVisualAcceptance?.[rowIdx]?.grid_no || '-'}-${elem.weldVisualAcceptance?.[rowIdx]?.weld_used_grid_qty || '-'})`
              : '-',

            elem?.ndt_details?.[rowIdx]?.status === 3 ?
              `${moment(elem?.ndt_details?.[rowIdx]?.createdAt).format('YYYY-MM-DD HH:mm')} (${elem.ndt_details?.[rowIdx]?.grid_no || "-"}-${elem.ndt_details?.[rowIdx]?.ndt_used_grid_qty || "-"})` : "",

            elem.fdOffer?.[rowIdx]?.createdAt
              ? `${moment(elem.fdOffer?.[rowIdx]?.createdAt).format('YYYY-MM-DD HH:mm')} (${elem.fdOffer?.[rowIdx]?.grid_id?.grid_no || '-'}-${elem.fdOffer?.[rowIdx]?.fd_used_grid_qty || '-'})`
              : '-',
            elem.fdAcceptance?.[rowIdx]?.qc_date
              ? `${moment(elem.fdAcceptance?.[rowIdx]?.qc_date).format('YYYY-MM-DD HH:mm')} (${elem.fdAcceptance?.[rowIdx]?.grid_id?.grid_no || '-'}-${elem.fdAcceptance?.[rowIdx]?.fd_used_grid_qty || '-'})`
              : '-',
            elem.insSummary?.[rowIdx]?.summary_date
              ? `${moment(elem.insSummary?.[rowIdx]?.summary_date).format('YYYY-MM-DD HH:mm')} (${elem.insSummary?.[rowIdx]?.grid_id?.grid_no || '-'}-${elem.insSummary?.[rowIdx]?.is_grid_qty || '-'})`
              : '-',
            elem.dispatch_note?.[rowIdx]?.createdAt
              ? `${moment(elem.dispatch_note?.[rowIdx]?.createdAt).format('YYYY-MM-DD HH:mm')} (${elem.dispatch_note?.[rowIdx]?.grid_id?.grid_no || '-'}-${elem.dispatch_note?.[rowIdx]?.dispatch_used_grid_qty || '-'})`
              : '-',
            elem.surfaceOffer?.[rowIdx]?.createdAt
              ? `${moment(elem.surfaceOffer?.[rowIdx]?.createdAt).format('YYYY-MM-DD HH:mm')} (${elem.surfaceOffer?.[rowIdx]?.grid_id?.grid_no || '-'}-${elem.surfaceOffer?.[rowIdx]?.surface_used_grid_qty || '-'})`
              : '-',
            elem.surfaceAcceptance?.[rowIdx]?.qc_date
              ? `${moment(elem.surfaceAcceptance?.[rowIdx]?.qc_date).format('YYYY-MM-DD HH:mm')} (${elem.surfaceAcceptance?.[rowIdx]?.grid_id?.grid_no || '-'}-${elem.surfaceAcceptance?.[rowIdx]?.surface_used_grid_qty || '-'})`
              : '-',
            elem.mioOffer?.[rowIdx]?.createdAt
              ? `${moment(elem.mioOffer?.[rowIdx]?.createdAt).format('YYYY-MM-DD HH:mm')} (${elem.mioOffer?.[rowIdx]?.grid_id?.grid_no || '-'}-${elem.mioOffer?.[rowIdx]?.mio_used_grid_qty || '-'})`
              : '-',
            elem.mioAcceptance?.[rowIdx]?.qc_date
              ? `${moment(elem.mioAcceptance?.[rowIdx]?.qc_date).format('YYYY-MM-DD HH:mm')} (${elem.mioAcceptance?.[rowIdx]?.grid_id?.grid_no || '-'}-${elem.mioAcceptance?.[rowIdx]?.mio_used_grid_qty || '-'})`
              : '-',
            elem.finalCoatOffer?.[rowIdx]?.createdAt
              ? `${moment(elem.finalCoatOffer?.[rowIdx]?.createdAt).format('YYYY-MM-DD HH:mm')} (${elem.finalCoatOffer?.[rowIdx]?.grid_id?.grid_no || '-'}-${elem.finalCoatOffer?.[rowIdx]?.fc_used_grid_qty || '-'})`
              : '-',
            elem.finalCoatAcceptance?.[rowIdx]?.qc_date
              ? `${moment(elem.finalCoatAcceptance?.[rowIdx]?.qc_date).format('YYYY-MM-DD HH:mm')} (${elem.finalCoatAcceptance?.[rowIdx]?.grid_id?.grid_no || '-'}-${elem.finalCoatAcceptance?.[rowIdx]?.fc_used_grid_qty || '-'})`
              : '-',
            elem.release_note?.[rowIdx]?.release_date
              ? `${moment(elem.release_note?.[rowIdx]?.release_date).format('YYYY-MM-DD HH:mm')} (${elem.release_note?.[rowIdx]?.grid_id?.grid_no || '-'}-${elem.release_note?.[rowIdx]?.is_grid_qty || '-'})`
              : '-'
          ];

          const addedRow = worksheet.addRow(row);

          if (elem.isMain === false) {
            addedRow.eachCell((cell) => {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFCCCC' } // Light red to simulate rgba(255, 0, 0, 0.15)
              };
            });
          }

          if (elem.issue_acceptance?.[rowIdx]?.is_accepted === false) {
            addedRow.getCell(15).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } }; // Red color
          }
          if (elem.fitupAcceptance?.[rowIdx]?.is_accepted === false) {
            addedRow.getCell(17).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
          }
          if (elem.weldVisualAcceptance?.[rowIdx]?.is_accepted === false) {
            addedRow.getCell(19).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
          }
          if (elem.fdAcceptance?.[rowIdx]?.is_accepted === false) {
            addedRow.getCell(21).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
          }
          if (elem.surfaceAcceptance?.[rowIdx]?.is_accepted === false) {
            addedRow.getCell(25).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
          }
          if (elem.mioAcceptance?.[rowIdx]?.is_accepted === false) {
            addedRow.getCell(27).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
          }
          if (elem.finalCoatAcceptance?.[rowIdx]?.is_accepted === false) {
            addedRow.getCell(29).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
          }
        }
      });

      // Ensure the "xlsx" directory exists
      const uploadDir = path.join(__dirname, "..", "..", "..", "xlsx");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, "Daily-progress-report.xlsx");

      await workbook.xlsx.writeFile(filePath);

      const protocol = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
      const file = `${protocol}://${req.get("host")}/xlsx/Daily-progress-report.xlsx`;

      return sendResponse(res, 200, true, { file }, "DPR Grid Report generated successfully");
    } else {
      return sendResponse(res, 200, false, [], "No DPR Grid Report found");
    }
  } catch (error) {
    return sendResponse(res, 500, false, {}, error.message);
  }
}