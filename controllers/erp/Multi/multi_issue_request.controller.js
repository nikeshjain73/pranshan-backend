
const IssueRequest = require("../../../models/erp/Multi/multi_issue_request.model");
const { sendResponse } = require("../../../helper/response");
const { TitleFormat } = require("../../../utils/enum");
const ejs = require('ejs');
const puppeteer = require("puppeteer");
const path = require("path");
const URI = process.env.PDF_URL;
const PATH = process.env.PDF_PATH;
const fs = require("fs");
const { generatePDF, generatePDFWithoutPrintDate } = require("../../../utils/pdfUtils");
const mongoose = require("mongoose");
const Draw = require("../../../models/erp/planner/draw.model");

const User = require("../../../models/users.model");
const ErpRole = require("../../../models/erp/erp_role.model");
const Project = require("../../../models/project.model");
const addEmailJob = require("../../../utils/emailJob");
const sendEmail = require("../../../utils/sendEmail");
const commonStageOfferEmail = require("../../../utils/commonStageOfferEmail");

exports.manageIssueRequest = async (req, res) => {
  const { id, requested_by, items, project, project_id, isFd } = req.body;

  if (!req.user || req.error) {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }

  if (!requested_by || !items || !project) {
    return sendResponse(res, 404, false, {}, "Missing parameter");
  }

  try {
    let issueNo = "1";
    const lastRequest = await IssueRequest.findOne(
      { deleted: false, issue_req_no: { $regex: `/${project}/` } },
      {},
      { sort: { createdAt: -1 } }
    );

    if (lastRequest && lastRequest.issue_req_no) {
      const split = lastRequest.issue_req_no.split("/");
      const lastRequestNo = parseInt(split[split.length - 1]);
      issueNo = isNaN(lastRequestNo) ? "1" : lastRequestNo + 1;
    }

    const gen_issue_req_no = TitleFormat.issueReqNo.replace("/PROJECT/", `/${project}/`) + issueNo;
    const newItems = Array.isArray(items) ? items : JSON.parse(items || '[]');

    if (!id) {
      const newIssueRequest = new IssueRequest({
        issue_req_no: gen_issue_req_no,
        items: newItems,
        requested_by: requested_by,
        isFd: isFd,
      });

      await newIssueRequest.save()
        .then(() => {
          sendResponse(res, 200, true, {}, "Material issue request added successfully");
        })
        .catch((err) => {
          console.log(err);
          sendResponse(res, 500, false, {}, "Something went wrong while saving");
        });

    } else {
      await IssueRequest.findByIdAndUpdate(id, {
        items: newItems,
        requested_by: requested_by,
      })
        .then((result) => {
          if (result) {
            sendResponse(res, 200, true, {}, "Material issue request updated successfully");
          } else {
            sendResponse(res, 404, false, {}, "Issue request not found");
          }
        })
        .catch(() => {
          sendResponse(res, 500, false, {}, "Something went wrong while updating");
        });

    }

        // ==========================================
        // SEND EMAIL TO MATERIAL CONTROLLER
        // ==========================================
        
        
        try {
          // creator of request
          const requestUser = await User.findById(requested_by);
        
          // project details
          const projectDetails = await Project.findById(project_id);
        
          // find required roles
          const acceptanceRoles = await ErpRole.find({
            deleted: false,
            name: {
              $in: [
                "Material Controller",
              ],
            },
          });
        
          const roleIds = acceptanceRoles.map(role => role._id);
        
          // get users with these roles
          const users = await User.find({
            deleted: false,
            status: true,
            structureRole: { $in: roleIds },
            email: { $exists: true, $ne: "" }
          });
        
          console.log("Users found:", users.length);
        
          // formatted date
          // ==========================================
// GET REQUEST DATA FOR EMAIL DATE
// ==========================================

let issueRequestData;

if (id) {
  // update case
  issueRequestData = await IssueRequest.findById(id);
} else {
  // create case
  issueRequestData = await IssueRequest.findOne({
    issue_req_no: gen_issue_req_no
  });
}

// formatted date
const offerDateTime = issueRequestData?.createdAt
  ? new Date(issueRequestData.createdAt)
      .toLocaleString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      })
      .replace("am", "AM")
      .replace("pm", "PM")
  : "-";
        
          for (const user of users) {
            try {
              const html = commonStageOfferEmail({
                module: "Structural",
        
                userName: user?.user_name || "-",
        
                stageName: "Material Issue Request",
        
                  offerNo: gen_issue_req_no,
        
               projectName: project || "-",
        
                workOrderNo: projectDetails?.work_order_no || "-",
        
                offerDateTime: offerDateTime,
        
                createdBy: requestUser?.user_name || "-",
        
                totalItems: newItems?.length || 0,
        
                remarks:
                  `Material issue request Offer Generated by ${requestUser?.user_name || "-"} and waiting for Material issue acceptance.`,
        
                loginUrl: process.env.ERP_URL,
              });
        
             addEmailJob({
                to: user.email,
                subject: `Material Issue Request - ${gen_issue_req_no}`,
                html,
              });
        
              console.log(`Email sent successfully -> ${user.email}`);
        
            } catch (mailErr) {
              console.log(
                `Email failed for ${user.email}`,
                mailErr.message
              );
            }
          }
        
        } catch (emailErr) {
          console.log("EMAIL ERROR:", emailErr);
        }
  } catch (err) {
    sendResponse(res, 500, false, {}, "Something went wrong: " + err.message);
  }
};


//last live code
// exports.getIssueRequest = async (req, res) => {
//   const { id, project } = req.body;

//   if (!req.user || req.error) {
//     return sendResponse(res, 401, false, {}, "Unauthorized");
//   }

//   try {
//     let query = { deleted: false };
//     if (id) query._id = id;

//     let result = await IssueRequest.find(query, { deleted: 0 })
//       .populate("requested_by", "user_name")
//       .populate({
//         path: "items",
//         populate: [
//           {
//             path: "grid_item_id",
//             select: "item_name item_qty item_no item_length item_width item_weight assembly_weight assembly_surface_area grid_id",
//             populate: [
//               { path: "item_name", select: "name" },
//               { path: "grid_id", select: "grid_no grid_qty" }
//             ]
//           },
//           {
//             path: "drawing_id",
//             select: "project master_updation_date drawing_no draw_receive_date unit sheet_no rev assembly_no assembly_quantity drawing_pdf drawing_pdf_name status issued_date issued_person",
//             populate: [
//               { path: "issued_person", select: "name" },
//               {
//                 path: "project",
//                 select: "name party",
//                 populate: {
//                   path: "party",
//                   select: "name",
//                 },
//               },
//             ],
//           }
//         ]
//       }).sort({ createdAt: -1 });
//     if (project) {
//       result = result.filter(reqData =>
//         reqData?.items?.some(item => item?.drawing_id?.project?._id?.toString() === project)
//       );
//     }

//     if (result && result.length > 0) {
//       sendResponse(res, 200, true, result, "Material issue request list");
//     } else {
//       sendResponse(res, 200, true, [], "Material issue request not found");
//     }
//   } catch (err) {
//     sendResponse(res, 500, false, {}, "Something went wrong: " + err.message);
//   }
// };

exports.getIssueRequest = async (req, res) => {
  const { id, project, page, limit } = req.body;

  // normalize search
  const searchRaw = Array.isArray(req.query.search)
    ? req.query.search[0]
    : req.query.search || req.body.search || "";
  const search = typeof searchRaw === "string" ? searchRaw.trim() : "";

  const hasPagination = page !== undefined && limit !== undefined;
  const pageNum = hasPagination ? parseInt(page) || 1 : 1;
  const limitNum = hasPagination ? parseInt(limit) || 10 : 0;
  const skip = (pageNum - 1) * limitNum;

  if (!req.user || req.error) {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }

  try {
    let query = { deleted: false };
    if (id) query._id = id;

    // 🔍 Multi-field search
    if (search) {
      // Find matching drawings by assembly_no
      const drawingMatch = await Draw.find({
        assembly_no: { $regex: search, $options: "i" },
        deleted: false
      }).distinct("_id");

      const searchConditions = [
        { issue_req_no: { $regex: search, $options: "i" } }, // by Issue Request No
      ];

      if (drawingMatch.length > 0) {
        searchConditions.push({ "items.drawing_id": { $in: drawingMatch } }); // by Assembly No
      }

      query.$or = searchConditions;
    }

    // 🎯 Project filter (intersects with search if both applied)
    if (project) {
      const drawingIds = await Draw.find({
        deleted: false,
        project: project,
      }).distinct("_id");

      if (drawingIds.length > 0) {
        query["items.drawing_id"] = query["items.drawing_id"]
          ? { $in: drawingIds.filter(id => query["items.drawing_id"].$in.includes(id)) }
          : { $in: drawingIds };
      } else {
        return sendResponse(res, 200, true, {
          items: [],
          pagination: { total: 0, page: pageNum, limit: limitNum, totalPages: 0 },
        }, "Material issue request list");
      }
    }

    // 📊 Count total
    const totalCount = await IssueRequest.countDocuments(query);

    // 🔎 Main query with population
    let queryExec = IssueRequest.find(query, { deleted: 0 })
      .populate("requested_by", "user_name")
      .populate({
        path: "items",
        populate: [
          {
            path: "grid_item_id",
            select:
              "item_name item_qty item_no item_length item_width item_weight assembly_weight assembly_surface_area grid_id",
            populate: [
              { path: "item_name", select: "name" },
              { path: "grid_id", select: "grid_no grid_qty" },
            ],
          },
          {
            path: "drawing_id",
            select:
              "project master_updation_date drawing_no draw_receive_date unit sheet_no rev assembly_no assembly_quantity drawing_pdf drawing_pdf_name status issued_date issued_person",
            populate: [
              { path: "issued_person", select: "name" },
              {
                path: "project",
                select: "name party",
                populate: { path: "party", select: "name" },
              },
            ],
          },
        ],
      })
      .sort({ createdAt: -1 });

    // 📑 Pagination
    if (hasPagination) {
      queryExec = queryExec.skip(skip).limit(limitNum);
    }

    const result = await queryExec;

    return sendResponse(res, 200, true, {
      items: result,
      total: totalCount,
      page: hasPagination ? pageNum : 1,
      limit: hasPagination ? limitNum : totalCount,
      totalPages: hasPagination ? Math.ceil(totalCount / limitNum) : 1,
    }, "Material issue request list");

  } catch (err) {
    console.error("Error fetching material issue request list:", err);
    return sendResponse(res, 500, false, {}, "Internal Server Error");
  }
};

// exports.getIssueRequest = async (req, res) => {
//   const { id, project, limit, page } = req.body;

//   if (!req.user || req.error) {
//     return sendResponse(res, 401, false, {}, "Unauthorized");
//   }

//   try {
//     let query = { deleted: false };
//     if (id) query._id = id;

//     const skip = (page - 1) * limit;

//     // If project is provided, first get drawing_ids of that project
//     if (project) {
//       const drawingIds = await Draw.find({
//         deleted: false,
//         project: project,
//       }).distinct("_id");

    

//       if (!drawingIds.length) {
//         return sendResponse(res, 200, true, { items: [], total: 0, currentPage: page, totalPages: 0 }, "No data");
//       }

//       query["items.drawing_id"] = { $in: drawingIds };
//     }

//     // Count total first
//     const totalCount = await IssueRequest.countDocuments(query);

//     //  Then fetch with populate
//     let result = await IssueRequest.find(query, { deleted: 0 })
//       .populate("requested_by", "user_name")
//       .populate({
//         path: "items",
//         populate: [
//           {
//             path: "grid_item_id",
//             select:
//               "item_name item_qty item_no item_length item_width item_weight assembly_weight assembly_surface_area grid_id",
//             populate: [
//               { path: "item_name", select: "name" },
//               { path: "grid_id", select: "grid_no grid_qty" },
//             ],
//           },
//           {
//             path: "drawing_id",
//             select:
//               "project master_updation_date drawing_no draw_receive_date unit sheet_no rev assembly_no assembly_quantity drawing_pdf drawing_pdf_name status issued_date issued_person",
//             populate: [
//               { path: "issued_person", select: "name" },
//               {
//                 path: "project",
//                 select: "name party",
//                 populate: { path: "party", select: "name" },
//               },
//             ],
//           },
//         ],
//       })
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(Number(limit));

//     sendResponse(
//       res,
//       200,
//       true,
//       {
//         items: result,
//         total: totalCount,
//         currentPage: Number(page),
//         totalPages: Math.ceil(totalCount / limit),
//       },
//       "Material issue request list"
//     );
//   } catch (err) {
//     sendResponse(res, 500, false, {}, "Something went wrong: " + err.message);
//   }
// };


exports.downloadOneIssueRequest = async (req, res) => {
  const { issue_req_no, print_date } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await getIssueRequests(issue_req_no);
      let requestData = data.result;
      console.log(requestData);

      let headerInfo = {
        offer_no: requestData[0]?.offer_no,
        client: requestData[0]?.client,
        project_name: requestData[0]?.project_name,
        contractor_name: requestData[0]?.contractor_name,
        issued_date: requestData[0]?.issued_date,
        request_name: requestData[0]?.request_name,
        request_date: requestData[0]?.request_date,
        request_signature: requestData[0]?.request_signature,
      }

      if (data.status === 1) {
        const template = fs.readFileSync("templates/multiIssueRequest.html", "utf-8");

        const renderedHtml = ejs.render(template, {
          headerInfo,
          items: requestData[0]?.items,
          logoUrl1: process.env.LOGO_URL_1,
          logoUrl2: process.env.LOGO_URL_2,
        });

        const browser = await puppeteer.launch({
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
          executablePath: PATH,
        });

        const page = await browser.newPage();

        await page.setContent(renderedHtml, { baseUrl: `${URI}` });

        const pageHeight = await page.evaluate(() => {
          return document.body.scrollHeight;
        });

        const pdfBuffer = await generatePDFWithoutPrintDate(page, { print_date: true, height: pageHeight });

        await browser.close();

        const pdfsDir = path.join(__dirname, "../../../pdfs");
        if (!fs.existsSync(pdfsDir)) fs.mkdirSync(pdfsDir);

        const filename = `issue_request_${Date.now()}.pdf`;
        const filePath = path.join(pdfsDir, filename);
        fs.writeFileSync(filePath, pdfBuffer);

        const fileUrl = `${URI}/pdfs/${filename}`;

        sendResponse(res, 200, true, { file: fileUrl }, "PDF downloaded successfully");
      } else if (data.status === 0) {
        sendResponse(res, 200, false, {}, `Issue request not found`);
      } else {
        sendResponse(res, 500, false, {}, "Something went wrong");
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

const getIssueRequests = async (issue_req_no) => {
  try {
    const requestData = await IssueRequest.aggregate([
      { $match: { deleted: false, issue_req_no: issue_req_no } },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "users",
          localField: "requested_by",
          foreignField: "_id",
          as: "requestDetails",
          pipeline: [{ $project: { _id: 0, user_name: "$user_name", signature: 1 } }],
        },
      },
      { $unwind: "$requestDetails" },
      {
        $lookup: {
          from: "erp-drawing-grid-items",
          localField: "items.grid_item_id",
          foreignField: "_id",
          as: "materialDetails",
        }
      },
      {
        $unwind: "$materialDetails",
      },
      {
        $lookup: {
          from: "erp-drawing-grids",
          localField: "materialDetails.grid_id",
          foreignField: "_id",
          as: "gridDetails",
        }
      },
      {
        $unwind: "$gridDetails",
      },
      {
        $lookup: {
          from: "store-items",
          localField: "materialDetails.item_name",
          foreignField: "_id",
          as: "itemDetails",
        }
      },
      {
        $unwind: "$itemDetails",
      },
      {
        $lookup: {
          from: "erp-planner-drawings",
          localField: "items.drawing_id",
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
      {
        $addFields: {
          drawingDetails: { $arrayElemAt: ["$drawingDetails", 0] },
        },
      },
      {
        $addFields: {
          "drawingDetails.contractorDetails": {
            $arrayElemAt: ["$drawingDetails.contractorDetails", 0],
          },
          "drawingDetails.projectDetails": {
            $arrayElemAt: ["$drawingDetails.projectDetails", 0],
          },
        },
      },
      {
        $addFields: {
          "drawingDetails.projectDetails.partyDetails": {
            $arrayElemAt: ["$drawingDetails.projectDetails.partyDetails", 0],
          },
        },
      },
      {
        $project: {
          _id: 1,
          offer_no: "$issue_req_no",
          client: "$drawingDetails.projectDetails.partyDetails.name",
          project_name: "$drawingDetails.projectDetails.name",
          contractor_name: "$drawingDetails.contractorDetails.name",
          issued_date: "$drawingDetails.issued_date",
          request_name: "$requestDetails.user_name",
          request_signature: "$requestDetails.signature",
          createdAt: "$createdAt",
          items: {
            _id: "$items._id",
            grid_no: "$gridDetails.grid_no",
            grid_qty: "$gridDetails.grid_qty",
            drawing_no: "$drawingDetails.drawing_no",
            issued_date: "$drawingDetails.issued_date",
            rev: "$drawingDetails.rev",
            sheet_no: "$drawingDetails.sheet_no",
            assembly_no: "$drawingDetails.assembly_no",
            item_no: "$materialDetails.item_no",
            profile: "$itemDetails.name",
            used_grid_qty: "$items.used_grid_qty",
            requested_length: "$items.requested_length",
            requested_width: "$items.requested_width",
            requested_qty: "$items.requested_qty",
            multiply_iss_qty: "$items.multiply_iss_qty",
            remarks: "$items.remarks",
          },
        },
      },
      {
        $group: {
          _id: {
            _id: "$_id",
            offer_no: "$offer_no",
            project_name: "$project_name",
            client: "$client",
            contractor_name: "$contractor_name",
            // issued_date: "$issued_date",
            request_name: "$request_name",
            request_signature: "$request_signature",
            createdAt: "$createdAt",
          },
          issued_date: { $first: "$issued_date" },
          items: { $push: "$items" }, // Group all the items under one request
        },
      },
      {
        $project: {
          _id: "$_id._id",
          offer_no: "$_id.offer_no",
          client: "$_id.client",
          project_name: "$_id.project_name",
          contractor_name: "$_id.contractor_name",
          // issued_date: "$_id.issued_date",
          issued_date: "$issued_date",
          request_name: "$_id.request_name",
          request_signature: "$_id.request_signature",
          request_date: "$_id.createdAt",
          items: 1, // Include all the items
        },
      },
    ]);


    if (requestData.length > 0) {
      return { status: 1, result: requestData };
    } else {
      return { status: 0, result: [] };
    }
  } catch (error) {
    return { status: 2, result: error };
  }
};
