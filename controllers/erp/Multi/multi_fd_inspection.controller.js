const FinalDimension = require("../../../models/erp/Multi/multi_fd_master.model");
const NDTMaster = require("../../../models/erp/Multi/multi_ndt_detail.model");
const drawGridItems = require("../../../models/erp/planner/draw_grid_items.model");
const IssueAcceptance = require("../../../models/erp/Multi/multi_issue_acceptance.model");
const { sendResponse } = require("../../../helper/response");
const { TitleFormat, Status } = require("../../../utils/enum");
const { default: mongoose } = require("mongoose");
const {
    addMultiInspectioSummary,
    addMultiInspectSummary,
} = require("./inspect_summary/multi_inspect_summary.controller");
const ejs = require("ejs");
const fs = require("fs");
const XLSX = require("xlsx"); // for utility functions
const XLSXStyle = require("xlsx-style"); // for styling
const puppeteer = require("puppeteer");
const path = require("path");
const {
    generatePDF,
    generatePDFWithoutPrintDate,
} = require("../../../utils/pdfUtils");
const URI = process.env.PDF_URL;
const PATH = process.env.PDF_PATH;
const Draw = require("../../../models/erp/planner/draw.model");
const User = require("../../../models/users.model");
const ErpRole = require("../../../models/erp/erp_role.model");
const Project = require("../../../models/project.model");
const addEmailJob = require("../../../utils/emailJob");
const sendEmail = require("../../../utils/sendEmail");
const commonStageOfferEmail = require("../../../utils/commonStageOfferEmail");
const commonStageAcceptanceEmail = require("../../../utils/commonStageAcceptanceEmail");

// exports.getFinalDimension = async (req, res) => {
//     const { id, status, project } = req.query;


//     if (!req.user || req.error) {
//         return sendResponse(res, 401, false, {}, "Unauthorized");
//     }

//     try {
//         const pipeline = [
//             {
//                 $lookup: {
//                     from: "multi-erp-ndt-masters",
//                     localField: "ndt_master_id",
//                     foreignField: "_id",
//                     as: "ndt_master_id",
//                 },
//             },
//             {
//                 $lookup: {
//                     from: "multi-drawing-issue-acceptances",
//                     localField: "issue_acc_id",
//                     foreignField: "_id",
//                     as: "issue_acc_id",
//                 },
//             },
//             {
//                 $lookup: {
//                     from: "users",
//                     localField: "offered_by",
//                     foreignField: "_id",
//                     as: "offered_by",
//                 },
//             },
//             {
//                 $lookup: {
//                     from: "users",
//                     localField: "qc_name",
//                     foreignField: "_id",
//                     as: "qc_name",
//                 },
//             },
//             { $unwind: "$items" },
//             {
//                 $lookup: {
//                     from: "erp-planner-drawings",
//                     localField: "items.drawing_id",
//                     foreignField: "_id",
//                     as: "drawing_id",
//                     pipeline: [
//                         {
//                             $lookup: {
//                                 from: "bussiness-projects",
//                                 localField: "project",
//                                 foreignField: "_id",
//                                 as: "project",
//                                 pipeline: [
//                                     {
//                                         $lookup: {
//                                             from: "store-parties",
//                                             localField: "party",
//                                             foreignField: "_id",
//                                             as: "client",
//                                         },
//                                     },
//                                 ],
//                             },
//                         },
//                     ],
//                 },
//             },
//             {
//                 $lookup: {
//                     from: "erp-drawing-grids",
//                     localField: "items.grid_id",
//                     foreignField: "_id",
//                     as: "grid_id",
//                 },
//             },
//             {
//                 $addFields: {
//                     grid_id: { $arrayElemAt: ["$grid_id", 0] },
//                     drawing_id: { $arrayElemAt: ["$drawing_id", 0] },
//                     qc_name: { $arrayElemAt: ["$qc_name", 0] },
//                     offered_by: { $arrayElemAt: ["$offered_by", 0] },
//                 },
//             },
//             {
//                 $addFields: {
//                     "drawing_id.project": { $arrayElemAt: ["$drawing_id.project", 0] },
//                 },
//             },
//             {
//                 $addFields: {
//                     "drawing_id.project.client": {
//                         $arrayElemAt: ["$drawing_id.project.client", 0],
//                     },
//                 },
//             },
//             {
//                 $project: {
//                     _id: 1,
//                     report_no: 1,
//                     report_no_two: 1,
//                     qc_time: 1,
//                     ndt_master_id: {
//                         report_no: { $arrayElemAt: ["$ndt_master_id.report_no", 0] },
//                         _id: { $arrayElemAt: ["$ndt_master_id._id", 0] },
//                     },
//                     issue_acc_id: {
//                         issue_accept_no: {
//                             $arrayElemAt: ["$issue_acc_id.issue_accept_no", 0],
//                         },
//                         _id: { $arrayElemAt: ["$issue_acc_id._id", 0] },
//                     },
//                     createdAt: 1,
//                     offered_by: {
//                         user_name: "$offered_by.user_name",
//                         _id: "$offered_by._id",
//                     },
//                     qc_name: {
//                         _id: "$qc_name._id",
//                         name: "$qc_name.user_name",
//                     },
//                     status: 1,
//                     items: {
//                         grid_id: {
//                             _id: "$grid_id._id",
//                             grid_no: "$grid_id.grid_no",
//                             grid_qty: "$grid_id.grid_qty",
//                         },
//                         drawing_id: {
//                             _id: "$drawing_id._id",
//                             drawing_no: "$drawing_id.drawing_no",
//                             rev: "$drawing_id.rev",
//                             assembly_no: "$drawing_id.assembly_no",
//                             unit: "$drawing_id.unit",
//                             assembly_quantity: "$drawing_id.assembly_quantity",
//                             project: {
//                                 _id: "$drawing_id.project._id",
//                                 name: "$drawing_id.project.name",
//                                 client: {
//                                     _id: "$drawing_id.project.client._id",
//                                     name: "$drawing_id.project.client.name",
//                                 },
//                             },
//                         },
//                         required_dimension: "$items.required_dimension",
//                         actual_dimension: "$items.actual_dimension",
//                         fd_balanced_grid_qty: "$items.fd_balanced_grid_qty",
//                         fd_used_grid_qty: "$items.fd_used_grid_qty",
//                         moved_next_step: "$items.moved_next_step",
//                         remarks: "$items.remarks",
//                         qc_remarks: "$items.qc_remarks",
//                     },
//                 },
//             },
//             {
//                 $group: {
//                     _id: {
//                         _id: "$_id",
//                         report_no: "$report_no",
//                         report_no_two: "$report_no_two",
//                         qc_time: "$qc_time",
//                         issue_acc_id: "$issue_acc_id",
//                         ndt_master_id: "$ndt_master_id",
//                         createdAt: "$createdAt",
//                         offered_by: "$offered_by",
//                         qc_name: "$qc_name",
//                         status: "$status",
//                     },

//                     items: { $push: "$items" },
//                 },
//             },
//             {
//                 $project: {
//                     _id: "$_id._id",
//                     report_no: "$_id.report_no",
//                     report_no_two: "$_id.report_no_two",
//                     qc_time: "$_id.qc_time",
//                     issue_acc_id: "$_id.issue_acc_id",
//                     ndt_master_id: "$_id.ndt_master_id",
//                     createdAt: "$_id.createdAt",
//                     offered_by: "$_id.offered_by",
//                     qc_name: "$_id.qc_name",
//                     status: "$_id.status",
//                     items: 1,
//                 },
//             },
//             {
//                 $sort: { createdAt: -1 },
//             },
//         ];
//         if (status !== undefined && status !== null) {
//             pipeline.push({
//                 $match: {
//                     status: parseInt(status),
//                 },
//             });
//         }
//         if (id !== undefined && id !== null && id !== "") {
//             pipeline.push({
//                 $match: {
//                     _id: new mongoose.Types.ObjectId(id),
//                 },
//             });
//         }

//         let result = await FinalDimension.aggregate(pipeline);

//         if (!result || result.length === 0) {
//             return sendResponse(res, 200, true, [], "No records found");
//         }
//         if (project) {
//             result = result.filter((item) =>
//                 item.items.some(
//                     (i) => i.drawing_id?.project?._id?.toString() === project
//                 )
//             );
          
//         }
//         return sendResponse(res, 200, true, result, "Records fetched successfully");
//     } catch (err) {
//         sendResponse(res, 500, false, {}, `Something went wrong: ${err}`);
//     }
// };

exports.getFinalDimension = async (req, res) => {
  const { id, status, project, page, limit, search } = req.query;

  if (!req.user || req.error) {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }

  try {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const matchStage = {};
    if (status !== undefined && status !== null) {
      matchStage.status = parseInt(status);
    }
    if (id) {
      matchStage._id = new mongoose.Types.ObjectId(id);
    }

    let drawingIds = [];
    if (project) {
      drawingIds = await Draw.find({ deleted: false, project }).distinct("_id");
      if (drawingIds.length === 0) {
        return sendResponse(res, 200, true, [], "No records found for the given project");
      }
      matchStage["items.drawing_id"] = { $in: drawingIds };
    }

    const pipeline = [];

    if (Object.keys(matchStage).length) {
      pipeline.push({ $match: matchStage });
    }

    pipeline.push(
      { $lookup: { from: "multi-erp-ndt-masters", localField: "ndt_master_id", foreignField: "_id", as: "ndt_master_id" } },
      { $lookup: { from: "multi-drawing-issue-acceptances", localField: "issue_acc_id", foreignField: "_id", as: "issue_acc_id" } },
      { $lookup: { from: "users", localField: "offered_by", foreignField: "_id", as: "offered_by" } },
      { $lookup: { from: "users", localField: "qc_name", foreignField: "_id", as: "qc_name" } },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "erp-planner-drawings",
          localField: "items.drawing_id",
          foreignField: "_id",
          as: "drawing_id",
          pipeline: [
            {
              $lookup: {
                from: "bussiness-projects",
                localField: "project",
                foreignField: "_id",
                as: "project",
                pipeline: [
                  {
                    $lookup: {
                      from: "store-parties",
                      localField: "party",
                      foreignField: "_id",
                      as: "client",
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      { $lookup: { from: "erp-drawing-grids", localField: "items.grid_id", foreignField: "_id", as: "grid_id" } },
      {
        $addFields: {
          grid_id: { $arrayElemAt: ["$grid_id", 0] },
          drawing_id: { $arrayElemAt: ["$drawing_id", 0] },
          qc_name: { $arrayElemAt: ["$qc_name", 0] },
          offered_by: { $arrayElemAt: ["$offered_by", 0] },
        },
      },
      {
        $addFields: {
          "drawing_id.project": {
            $cond: [
              { $isArray: "$drawing_id.project" },
              { $arrayElemAt: ["$drawing_id.project", 0] },
              "$drawing_id.project",
            ],
          },
        },
      },
      {
        $addFields: {
          "drawing_id.project.client": {
            $cond: [
              { $isArray: "$drawing_id.project.client" },
              { $arrayElemAt: ["$drawing_id.project.client", 0] },
              "$drawing_id.project.client",
            ],
          },
        },
      }
    );

    // 🔍 Apply search filter here
    if (search && search.trim() !== "") {
      const regex = new RegExp(search, "i");
      pipeline.push({
        $match: {
          $or: [
            { report_no: regex },
            { report_no_two: regex },
            { "drawing_id.assembly_no": regex }
          ],
        },
      });
    }

    pipeline.push(
      {
        $project: {
          _id: 1,
          report_no: 1,
          report_no_two: 1,
          qc_time: 1,
          createdAt: 1,
          status: 1,
          ndt_master_id: {
            report_no: { $arrayElemAt: ["$ndt_master_id.report_no", 0] },
            _id: { $arrayElemAt: ["$ndt_master_id._id", 0] },
          },
          issue_acc_id: {
            issue_accept_no: { $arrayElemAt: ["$issue_acc_id.issue_accept_no", 0] },
            _id: { $arrayElemAt: ["$issue_acc_id._id", 0] },
          },
          offered_by: {
            user_name: "$offered_by.user_name",
            _id: "$offered_by._id",
          },
          qc_name: {
            _id: "$qc_name._id",
            name: "$qc_name.user_name",
          },
          items: {
            grid_id: {
              _id: "$grid_id._id",
              grid_no: "$grid_id.grid_no",
              grid_qty: "$grid_id.grid_qty",
            },
            drawing_id: {
              _id: "$drawing_id._id",
              drawing_no: "$drawing_id.drawing_no",
              rev: "$drawing_id.rev",
              assembly_no: "$drawing_id.assembly_no",
              unit: "$drawing_id.unit",
              assembly_quantity: "$drawing_id.assembly_quantity",
              project: {
                _id: "$drawing_id.project._id",
                name: "$drawing_id.project.name",
                client: {
                  _id: "$drawing_id.project.client._id",
                  name: "$drawing_id.project.client.name",
                },
              },
            },
            required_dimension: "$items.required_dimension",
            actual_dimension: "$items.actual_dimension",
            fd_balanced_grid_qty: "$items.fd_balanced_grid_qty",
            fd_used_grid_qty: "$items.fd_used_grid_qty",
            moved_next_step: "$items.moved_next_step",
            remarks: "$items.remarks",
            qc_remarks: "$items.qc_remarks",
          },
        },
      },
      {
        $group: {
          _id: {
            _id: "$_id",
            report_no: "$report_no",
            report_no_two: "$report_no_two",
            qc_time: "$qc_time",
            issue_acc_id: "$issue_acc_id",
            ndt_master_id: "$ndt_master_id",
            createdAt: "$createdAt",
            offered_by: "$offered_by",
            qc_name: "$qc_name",
            status: "$status",
          },
          items: { $push: "$items" },
        },
      },
      {
        $project: {
          _id: "$_id._id",
          report_no: "$_id.report_no",
          report_no_two: "$_id.report_no_two",
          qc_time: "$_id.qc_time",
          issue_acc_id: "$_id.issue_acc_id",
          ndt_master_id: "$_id.ndt_master_id",
          createdAt: "$_id.createdAt",
          offered_by: "$_id.offered_by",
          qc_name: "$_id.qc_name",
          status: "$_id.status",
          items: 1,
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limitNum }],
          totalCount: [{ $count: "count" }],
        },
      }
    );

    const result = await FinalDimension.aggregate(pipeline);
    const finalData = result[0]?.data || [];
    const totalCount = result[0]?.totalCount?.[0]?.count || 0;
    const totalPages = Math.ceil(totalCount / limitNum);

    return sendResponse(
      res,
      200,
      true,
      {
        data: finalData,
        pagination: {
          totalCount,
          totalPages,
          currentPage: pageNum,
          limit: limitNum,
        },
      },
      finalData.length ? "Records fetched successfully" : "No records found"
    );
  } catch (err) {
    console.error("Error in getFinalDimension:", err);
    sendResponse(res, 500, false, {}, `Something went wrong: ${err.message || err}`);
  }
};

// exports.getFinalDimension = async (req, res) => {
//     const { id, status, project, page, limit } = req.query;

//     if (!req.user || req.error) {
//         return sendResponse(res, 401, false, {}, "Unauthorized");
//     }

//     try {
//         const pageNum = parseInt(page) || 1;
//         const limitNum = parseInt(limit) || 10;
//         const skip = (pageNum - 1) * limitNum;

//         const matchStage = {};
//         if (status !== undefined && status !== null) {
//             matchStage.status = parseInt(status);
//         }
//         if (id) {
//             matchStage._id = new mongoose.Types.ObjectId(id);
//         }

//         let drawingIds = [];
//         if (project) {
//             drawingIds = await Draw.find({ deleted: false, project }).distinct("_id");
//             if (drawingIds.length === 0) {
//                 return sendResponse(res, 200, true, [], "No records found for the given project");
//             }
//             matchStage["items.drawing_id"] = { $in: drawingIds };
//         }

//         const pipeline = [];

//         if (Object.keys(matchStage).length) {
//             pipeline.push({ $match: matchStage });
//         }

//         pipeline.push(
//             { $lookup: { from: "multi-erp-ndt-masters", localField: "ndt_master_id", foreignField: "_id", as: "ndt_master_id" } },
//             { $lookup: { from: "multi-drawing-issue-acceptances", localField: "issue_acc_id", foreignField: "_id", as: "issue_acc_id" } },
//             { $lookup: { from: "users", localField: "offered_by", foreignField: "_id", as: "offered_by" } },
//             { $lookup: { from: "users", localField: "qc_name", foreignField: "_id", as: "qc_name" } },
//             { $unwind: "$items" },
//             {
//                 $lookup: {
//                     from: "erp-planner-drawings",
//                     localField: "items.drawing_id",
//                     foreignField: "_id",
//                     as: "drawing_id",
//                     pipeline: [
//                         {
//                             $lookup: {
//                                 from: "bussiness-projects",
//                                 localField: "project",
//                                 foreignField: "_id",
//                                 as: "project",
//                                 pipeline: [
//                                     {
//                                         $lookup: {
//                                             from: "store-parties",
//                                             localField: "party",
//                                             foreignField: "_id",
//                                             as: "client",
//                                         },
//                                     },
//                                 ],
//                             },
//                         },
//                     ],
//                 },
//             },
//             { $lookup: { from: "erp-drawing-grids", localField: "items.grid_id", foreignField: "_id", as: "grid_id" } },
//             {
//                 $addFields: {
//                     grid_id: { $arrayElemAt: ["$grid_id", 0] },
//                     drawing_id: { $arrayElemAt: ["$drawing_id", 0] },
//                     qc_name: { $arrayElemAt: ["$qc_name", 0] },
//                     offered_by: { $arrayElemAt: ["$offered_by", 0] },
//                 },
//             },
//        // First: extract project array to object
// {
//     $addFields: {
//         "drawing_id.project": {
//             $cond: [
//                 { $isArray: "$drawing_id.project" },
//                 { $arrayElemAt: ["$drawing_id.project", 0] },
//                 "$drawing_id.project"
//             ]
//         }
//     }
// },
// // Second: extract client from that project
// {
//     $addFields: {
//         "drawing_id.project.client": {
//             $cond: [
//                 { $isArray: "$drawing_id.project.client" },
//                 { $arrayElemAt: ["$drawing_id.project.client", 0] },
//                 "$drawing_id.project.client"
//             ]
//         }
//     }
// },

//             {
//                 $project: {
//                     _id: 1,
//                     report_no: 1,
//                     report_no_two: 1,
//                     qc_time: 1,
//                     createdAt: 1,
//                     status: 1,
//                     ndt_master_id: {
//                         report_no: { $arrayElemAt: ["$ndt_master_id.report_no", 0] },
//                         _id: { $arrayElemAt: ["$ndt_master_id._id", 0] },
//                     },
//                     issue_acc_id: {
//                         issue_accept_no: { $arrayElemAt: ["$issue_acc_id.issue_accept_no", 0] },
//                         _id: { $arrayElemAt: ["$issue_acc_id._id", 0] },
//                     },
//                     offered_by: {
//                         user_name: "$offered_by.user_name",
//                         _id: "$offered_by._id",
//                     },
//                     qc_name: {
//                         _id: "$qc_name._id",
//                         name: "$qc_name.user_name",
//                     },
//                     items: {
//                         grid_id: {
//                             _id: "$grid_id._id",
//                             grid_no: "$grid_id.grid_no",
//                             grid_qty: "$grid_id.grid_qty",
//                         },
//                         drawing_id: {
//                             _id: "$drawing_id._id",
//                             drawing_no: "$drawing_id.drawing_no",
//                             rev: "$drawing_id.rev",
//                             assembly_no: "$drawing_id.assembly_no",
//                             unit: "$drawing_id.unit",
//                             assembly_quantity: "$drawing_id.assembly_quantity",
//                             project: {
//                                 _id: "$drawing_id.project._id",
//                                 name: "$drawing_id.project.name",
//                                 client: {
//                                     _id: "$drawing_id.project.client._id",
//                                     name: "$drawing_id.project.client.name",
//                                 },
//                             },
//                         },
//                         required_dimension: "$items.required_dimension",
//                         actual_dimension: "$items.actual_dimension",
//                         fd_balanced_grid_qty: "$items.fd_balanced_grid_qty",
//                         fd_used_grid_qty: "$items.fd_used_grid_qty",
//                         moved_next_step: "$items.moved_next_step",
//                         remarks: "$items.remarks",
//                         qc_remarks: "$items.qc_remarks",
//                     },
//                 },
//             },
//             {
//                 $group: {
//                     _id: {
//                         _id: "$_id",
//                         report_no: "$report_no",
//                         report_no_two: "$report_no_two",
//                         qc_time: "$qc_time",
//                         issue_acc_id: "$issue_acc_id",
//                         ndt_master_id: "$ndt_master_id",
//                         createdAt: "$createdAt",
//                         offered_by: "$offered_by",
//                         qc_name: "$qc_name",
//                         status: "$status",
//                     },
//                     items: { $push: "$items" },
//                 },
//             },
//             {
//                 $project: {
//                     _id: "$_id._id",
//                     report_no: "$_id.report_no",
//                     report_no_two: "$_id.report_no_two",
//                     qc_time: "$_id.qc_time",
//                     issue_acc_id: "$_id.issue_acc_id",
//                     ndt_master_id: "$_id.ndt_master_id",
//                     createdAt: "$_id.createdAt",
//                     offered_by: "$_id.offered_by",
//                     qc_name: "$_id.qc_name",
//                     status: "$_id.status",
//                     items: 1,
//                 },
//             },
//             { $sort: { createdAt: -1 } },
//             {
//                 $facet: {
//                     data: [{ $skip: skip }, { $limit: limitNum }],
//                     totalCount: [{ $count: "count" }],
//                 },
//             }
//         );

//         const result = await FinalDimension.aggregate(pipeline);
//         const finalData = result[0]?.data || [];
//         const totalCount = result[0]?.totalCount?.[0]?.count || 0;
//         const totalPages = Math.ceil(totalCount / limitNum);

//         return sendResponse(res, 200, true, {
//             data: finalData,
//             pagination: {
//                 totalCount,
//                 totalPages,
//                 currentPage: pageNum,
//                 limit: limitNum,
//             },
//         }, finalData.length ? "Records fetched successfully" : "No records found");
//     } catch (err) {
//         console.error("Error in getFinalDimension:", err);
//         sendResponse(res, 500, false, {}, `Something went wrong: ${err.message || err}`);
//     }
// };

exports.manageFinalDimension = async (req, res) => {
    const {
        id,
        items,
        offered_by,
        project,
        project_id,
        issue_acc_id,
        ndt_master_id,
        is_new,
        isFd,
    } = req.body;
    if (!req.user || req.error) {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }
    if (!(issue_acc_id || ndt_master_id) || !offered_by || !items) {
        return sendResponse(res, 400, false, {}, "Missing parameter");
    }
    try {
        const lastInspection = await FinalDimension.findOne(
            { deleted: false, report_no: { $regex: `/${project}/` } },
            {},
            { sort: { createdAt: -1 } }
        );

        let inspectionNo = lastInspection?.report_no
            ? parseInt(lastInspection.report_no.split("/").pop()) + 1
            : 1;

        const gen_report_no =
            TitleFormat.FDOFFERNO.replace("/PROJECT/", `/${project}/`) + inspectionNo;
        if (!id && is_new) {
            const newInspection = {
                report_no: gen_report_no,
                items: JSON.parse(items) || [],
                offered_by,
                isFd: isFd 
            };
            newInspection["ndt_master_id"] = JSON.parse(ndt_master_id);
            newInspection["issue_acc_id"] = JSON.parse(issue_acc_id);
            const result = await FinalDimension(newInspection).save();

            /* ================= FINAL DIMENSION EMAIL START ================= */

try {

    // creator details

    const requestUser =
        await User.findById(
            offered_by
        );

    // project details

     const projectDetails =
                await Project.findById(
                    project_id
                );

    // QC roles

    const roles =
        await ErpRole.find({

            deleted:false,

            name:{
                $in:[
                    "QC Engineer"
                ]
            }

        });

    const roleIds =
        roles.map(
            role=>role._id
        );

    // users

    const users =
        await User.find({

            deleted:false,

            status:true,

            structureRole:{
                $in:roleIds
            },

            email:{
                $exists:true,
                $ne:""
            }

        });


    const offerDateTime =

        result?.createdAt

        ? new Date(
            result.createdAt
          )
        .toLocaleString(
            "en-IN",
            {
                day:"2-digit",
                month:"2-digit",
                year:"numeric",
                hour:"2-digit",
                minute:"2-digit",
                second:"2-digit",
                hour12:true
            }
        )
        .replace(
            "am",
            "AM"
        )
        .replace(
            "pm",
            "PM"
        )

        : "-";


    for(
        const user of users
    ){

        try{

            const html =
                commonStageOfferEmail({

                module:
                    "Structural",

                userName:
                    user?.user_name || "-",

                stageName:
                    "Final Dimension Inspection",

                offerNo:
                    result?.report_no || "-",

                projectName:
                    project || "-",

                workOrderNo:
                    projectDetails?.work_order_no || "-",

                offerDateTime,

                createdBy:
                    requestUser?.user_name || "-",

                remarks:
                    `Final Dimension inspection offer generated by ${
                        requestUser?.user_name || "-"
                    } and waiting for Final Dimension inspection process.`,

                loginUrl:
                    process.env.ERP_URL

            });

            addEmailJob({

                to:
                    user.email,

                subject:
                    `Final Dimension Inspection Offer - ${result?.report_no}`,

                html

            });

            console.log(
                `Final Dimension EMAIL QUEUED -> ${user.email}`
            );

        }
        catch(mailErr){

            console.log(

                `MAIL ERROR ${user.email}`,

                mailErr.message

            );

        }

    }

}
catch(emailErr){

    console.log(

        "FINAL DIMENSION EMAIL ERROR:",

        emailErr

    );

}

/* ================= FINAL DIMENSION EMAIL END ================= */

            return sendResponse(
                res,
                200,
                true,
                result,
                "Final Dimension inspection offer added successfully"
            );
        }
        const newInspection = {
            items: JSON.parse(items) || [],
            offered_by,
            isFd: isFd
        };
        newInspection["ndt_master_id"] = JSON.parse(ndt_master_id);
        newInspection["issue_acc_id"] = JSON.parse(issue_acc_id);
        const result = await FinalDimension.findByIdAndUpdate(id, newInspection);
        if (result) {
            return sendResponse(
                res,
                200,
                true,
                {},
                "Final Dimension inspection offer updated successfully"
            );
        }
        return sendResponse(res, 400, false, {}, "Final Dimension data not found");
    } catch (error) {
        sendResponse(res, 500, false, {}, "Something went wrong");
    }
};

exports.updateFDGridBalance = async (req, res) => {
    const { items, flag, issue_acc_id, ndt_master_id } = req.body;
    if (!req.user || req.error) {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }
    if (!items || !flag || !(issue_acc_id || ndt_master_id)) {
        return sendResponse(res, 400, false, {}, "Missing parameter");
    }
    const flagValue = parseInt(flag);
    if (![0, 1].includes(flagValue)) {
        return sendResponse(res, 400, false, {}, "Invalid flag value");
    }
    try {
        const parsedItems = JSON.parse(items);
        let ndt_master_ids = JSON.parse(ndt_master_id);
        let issue_acc_ids = JSON.parse(issue_acc_id);
        if (ndt_master_ids.length > 0) {
            let ndt_details = await NDTMaster.find({ _id: { $in: ndt_master_ids } });
            if (ndt_details.length == 0) {
                return sendResponse(res, 404, false, {}, "NDT detail not found");
            }
            for (const nd of ndt_details) {
                const Items = nd?.items || [];
                const gridItemIds = Items.map((Item) => Item.grid_item_id);
                const gridItems = await drawGridItems.find({
                    _id: { $in: gridItemIds },
                });
                const gridItemMap = Object.fromEntries(
                    gridItems.map((grid) => [
                        grid._id.toString(),
                        grid.grid_id.toString(),
                    ])
                );

                const commonElements = Items.filter((Item) =>
                    parsedItems.some(
                        (inputItem) =>
                            inputItem.grid_id === gridItemMap[Item.grid_item_id.toString()]
                    )
                );
                const adjustment = flagValue === 1 ? 1 : -1;
                commonElements.forEach((Item) => {
                    const inputItem = parsedItems.find(
                        (pitem) =>
                            pitem.grid_id === gridItemMap[Item.grid_item_id.toString()]
                    );
                    if (inputItem) {
                        Item.moved_next_step += adjustment * inputItem.fd_used_grid_qty;
                    }
                });
                await NDTMaster.findByIdAndUpdate(nd._id, { items: Items });
            }
        } else if (issue_acc_ids.length > 0) {
            let issueAccdetails = await IssueAcceptance.find({
                _id: { $in: issue_acc_ids },
            });
            if (issueAccdetails.length == 0) {
                return sendResponse(
                    res,
                    404,
                    false,
                    {},
                    "Issue acceptance detail not found"
                );
            }
            for (const iad of issueAccdetails) {
                const Items = iad?.items || [];
                const gridItemIds = Items.map((Item) => Item.grid_item_id);
                const gridItems = await drawGridItems.find({
                    _id: { $in: gridItemIds },
                });
                const gridItemMap = Object.fromEntries(
                    gridItems.map((grid) => [
                        grid._id.toString(),
                        grid.grid_id.toString(),
                    ])
                );
                const commonElements = Items.filter((Item) =>
                    parsedItems.some(
                        (inputItem) =>
                            inputItem.grid_id === gridItemMap[Item.grid_item_id.toString()]
                    )
                );
                const adjustment = flagValue === 1 ? 1 : -1;
                commonElements.forEach((Item) => {
                    const inputItem = parsedItems.find(
                        (pitem) =>
                            pitem.grid_id === gridItemMap[Item.grid_item_id.toString()]
                    );
                    if (inputItem) {
                        Item.moved_next_step += adjustment * inputItem.fd_used_grid_qty;
                    }
                });
                await IssueAcceptance.findByIdAndUpdate(iad._id, { items: Items });
            }
        }
        return sendResponse(
            res,
            200,
            true,
            {},
            "Grid balance updated successfully"
        );
    } catch (err) {
        console.error(`Error updating grid balance for issue:`, err.message || err);
        return sendResponse(res, 500, false, {}, "Something went wrong");
    }
};


async function getLastInspection(project) {
  try {
    const pipeline = [
      {
        $match: {
          deleted: false,
          report_no_two: {
            $regex: `^VE/${project}/STR/FD/\\d+$`,
            $options: 'i'
          }
        }
      },
      {
        $addFields: {
          inspectionNumber: {
            $toInt: {
              $arrayElemAt: [
                { $split: ["$report_no_two", "/"] },
                -1
              ]
            }
          }
        }
      },
      { $sort: { inspectionNumber: -1 } },
      { $limit: 1 },
      {
        $project: {
          _id: 1,
          report_no_two: 1,
          createdAt: 1,
          inspectionNumber: 1
        }
      }
    ];

    const [lastInspection] = await FinalDimension.aggregate(pipeline);
    // console.log('Aggregation result:', lastInspection); // Debug log
    return lastInspection || null;
  } catch (error) {
    console.error('Error fetching last inspection:', error);
    throw error;
  }
}
exports.verifyFDQcDetails = async (req, res) => {
    const { id, items, qc_name, project, project_id } = req.body;

    if (!req.user || req.error) {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }
    if (!id || !items || !qc_name || !project) {
        return sendResponse(res, 400, false, {}, "Missing parameter");
    }
    try {
        const parsedItems = JSON.parse(items);

        // let lastInspection = await FinalDimension.findOne(
        //     { deleted: false, report_no_two: { $regex: `/${project}/` } },
        //     {},
        //     { sort: { createdAt: -1 } }
        // );
        const lastInspection = await getLastInspection(project);
        let inspectionNo = "1";
        if (lastInspection && lastInspection.report_no_two) {
            const split = lastInspection.report_no_two.split("/");
            const lastInspectionNo = parseInt(split[split.length - 1]);
            inspectionNo = lastInspectionNo + 1;
        }

        const gen_report_no =
            TitleFormat.FDINSPECTNO.replace("/PROJECT/", `/${project}/`) +
            inspectionNo;

        let FDMaster = await FinalDimension.findById(id);
        if (!FDMaster) {
            return sendResponse(res, 404, false, {}, "Final dimension not found");
        }

        FDMaster.report_no_two = gen_report_no;
        FDMaster.items = parsedItems;
        FDMaster.qc_name = qc_name;
        FDMaster.qc_time = Date.now();

        const updatedResult = await FDMaster.save();
        if (updatedResult) {
            try {
                const allRejectedItems = updatedResult.items.filter(
                    (item) => !item.is_accepted
                );
                if (updatedResult.ndt_master_id.length > 0) {
                    let ndt_details = await NDTMaster.find({
                        _id: { $in: updatedResult.ndt_master_id },
                    });
                    if (ndt_details) {
                        for (const nd of ndt_details) {
                            const Items = nd.items || [];
                            const gridItemIds = Items.map((Item) => Item.grid_item_id);
                            const gridItems = await drawGridItems.find({
                                _id: { $in: gridItemIds },
                            });
                            const gridItemMap = Object.fromEntries(
                                gridItems.map((grid) => [
                                    grid._id.toString(),
                                    grid.grid_id.toString(),
                                ])
                            );
                            const filterData = Items?.filter((it) =>
                                allRejectedItems.some(
                                    (it2) =>
                                        gridItemMap[it.grid_item_id.toString()] ===
                                        it2.grid_id.toString()
                                )
                            );

                            for (const NDTItem of filterData) {
                                const rejectedItem = allRejectedItems.find(
                                    (it2) =>
                                        it2.grid_id.toString() ===
                                        gridItemMap[NDTItem.grid_item_id.toString()]
                                );

                                if (rejectedItem && rejectedItem.fd_used_grid_qty) {
                                    NDTItem.moved_next_step -= rejectedItem.fd_used_grid_qty;
                                    if (NDTItem.moved_next_step < 0) {
                                        NDTItem.moved_next_step = 0;
                                    }
                                }
                            }
                            await nd.save();
                        }
                    }
                }
                if (updatedResult.issue_acc_id.length > 0) {
                    let issue_acceptance_details = await IssueAcceptance.find({
                        _id: { $in: updatedResult.issue_acc_id },
                    });
                    if (issue_acceptance_details) {
                        for (const iad of issue_acceptance_details) {
                            const Items = iad.items || [];
                            const gridItemIds = Items.map((Item) => Item.grid_item_id);
                            const gridItems = await drawGridItems.find({
                                _id: { $in: gridItemIds },
                            });
                            const gridItemMap = Object.fromEntries(
                                gridItems.map((grid) => [
                                    grid._id.toString(),
                                    grid.grid_id.toString(),
                                ])
                            );
                            const filterData = Items?.filter((it) =>
                                allRejectedItems.some(
                                    (it2) =>
                                        gridItemMap[it.grid_item_id.toString()] ===
                                        it2.grid_id.toString()
                                )
                            );

                            for (const issueItem of filterData) {
                                const rejectedItem = allRejectedItems.find(
                                    (it2) =>
                                        it2.grid_id.toString() ===
                                        gridItemMap[issueItem.grid_item_id.toString()]
                                );

                                if (rejectedItem && rejectedItem.fd_used_grid_qty) {
                                    issueItem.moved_next_step -= rejectedItem.fd_used_grid_qty;
                                    if (issueItem.moved_next_step < 0) {
                                        issueItem.moved_next_step = 0;
                                    }
                                }
                            }
                            await iad.save();
                        }
                    }
                }
                const allRejected = updatedResult.items.every(
                    (item) => !item.is_accepted
                );
                FDMaster.status = allRejected ? Status.Rejected : Status.Approved;
                await FDMaster.save();

                const addInspectSummary = await addMultiInspectSummary(
                    parsedItems,
                    id
                );

/* =========================================================
   FINAL DIMENSION QC EMAIL
========================================================= */

try {

    const inspection = FDMaster;

    const qcUser =
        await User.findById(
            qc_name
        );

    const projectDetails =
        await Project.findById(
            project_id
        );

    /* ==========================================
       NEXT STAGE USERS (QC Engineer)
    ========================================== */

    const roles =
        await ErpRole.find({

            deleted:false,

            name:{
                $in:[
                    "QC Engineer"
                ]
            }

        });

    const roleIds =
        roles.map(
            r => r._id
        );

    const nextStageUsers =
        await User.find({

            deleted:false,

            status:true,

            structureRole:{
                $in:roleIds
            },

            email:{
                $exists:true,
                $ne:""
            }

        });

    /* ==========================================
       OFFER USER
    ========================================== */

    let offerUsers=[];

    if(
        inspection?.offered_by
    ){

        offerUsers=
            await User.find({

                _id:
                    inspection.offered_by,

                deleted:false,
                status:true,

                email:{
                    $exists:true,
                    $ne:""
                }

            });

    }

    /* ==========================================
       QC STATUS
    ========================================== */

    const qcStatus =

        inspection.status ===
        Status.Approved

        ? "Accepted"

        : inspection.status ===
        Status.Rejected

        ? "Rejected"

        : "Partially Accepted";


    /* ==========================================
       DATE TIME
    ========================================== */

    const accptanceDateTime =

        inspection?.qc_time

        ? new Date(
            inspection.qc_time
          )
        .toLocaleString(
            "en-IN",
            {
                day:"2-digit",
                month:"2-digit",
                year:"numeric",
                hour:"2-digit",
                minute:"2-digit",
                second:"2-digit",
                hour12:true
            }
        )
        .replace("am","AM")
        .replace("pm","PM")

        : "-";


    /* ==========================================
       RECIPIENTS
    ========================================== */

    let recipients=[];

    // ACCEPTED → QC Engineer
    if(
        inspection.status ===
        Status.Approved
    ){

        recipients =
            nextStageUsers;

    }

    // REJECTED → Offer creator
    else if(
        inspection.status ===
        Status.Rejected
    ){

        recipients =
            offerUsers;

    }

    // PARTIAL → Both
    else if(
        inspection.status ===
        Status.Partially
    ){

        recipients=[

            ...offerUsers,
            ...nextStageUsers

        ];

    }


    /* ==========================================
       REMOVE DUPLICATES
    ========================================== */

    recipients =
        recipients.filter(

            (
                user,
                index,
                self
            ) =>

            index===self.findIndex(
                u=>
                String(u._id)
                ===
                String(user._id)
            )

        );


    /* ==========================================
       REMARKS
    ========================================== */

    let remarks="";

    if(
        inspection.status ===
        Status.Approved
    ){

        remarks=
        `Final Dimension QC verification completed by ${
            qcUser?.user_name || "-"
        } with status ${qcStatus} and moved to next stage.`;

    }

    else if(
        inspection.status ===
        Status.Rejected
    ){

        remarks=
        `Final Dimension QC verification completed by ${
            qcUser?.user_name || "-"
        } with status ${qcStatus}. Action required for correction and reoffering.`;

    }

    else{

        remarks=
        `Final Dimension QC verification completed by ${
            qcUser?.user_name || "-"
        } with status ${qcStatus}. Accepted items moved to next stage and rejected items require reoffering.`;

    }


    /* ==========================================
       SEND EMAIL
    ========================================== */

    for(const user of recipients){

        try{

            const html =
                commonStageAcceptanceEmail({

                    userName:
                        user?.user_name || "-",

                    module:
                        "Structural",

                    stageName:
                        "Final Dimension QC Verification",

                    reportNo:
                        inspection?.report_no_two || "-",

                    projectName:
                        projectDetails?.name || "-",

                    workOrderNo:
                        projectDetails?.work_order_no || "-",

                    accptedBy:
                        qcUser?.user_name || "-",

                    qcStatus,

                    accptanceDateTime,

                    remarks,

                    loginUrl:
                        process.env.ERP_URL

                });

            addEmailJob({

                to:user.email,

                subject:
                `Final Dimension QC Verification - ${inspection?.report_no_two}`,

                html

            });

        }
        catch(mailErr){

            console.log(
                mailErr.message
            );

        }

    }

}
catch(emailErr){

    console.log(
        "FD QC EMAIL ERROR:",
        emailErr
    );

}
                return sendResponse(
                    res,
                    200,
                    true,
                    {},
                    "Final Dimension verified successfully"
                );
            } catch (error) {
                return sendResponse(res, 500, false, {}, "Internal server error");
            }
        }
    } catch (error) {
        sendResponse(
            res,
            500,
            false,
            { error: error.message },
            "Something went wrong"
        );
    }
};

const getOneFD = async (report_no, report_no_two) => {
    try {
        let matchObj = { deleted: false };
        if (report_no) {
            matchObj = { ...matchObj, report_no: report_no };
        }
        if (report_no_two) {
            matchObj = { ...matchObj, report_no_two: report_no_two };
        }

        const requestData = await FinalDimension.aggregate([
            { $match: matchObj },
            { $unwind: "$items" },
            {
                $lookup: {
                    from: "users",
                    localField: "offered_by",
                    foreignField: "_id",
                    as: "offerDetails",
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "qc_name",
                    foreignField: "_id",
                    as: "qcDetails",
                },
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
                            },
                        },
                    ],
                },
            },
            {
                $lookup: {
                    from: "erp-drawing-grids",
                    localField: "items.grid_id",
                    foreignField: "_id",
                    as: "gridDetails",
                },
            },
            {
                $addFields: {
                    offer_name: { $arrayElemAt: ["$offerDetails.user_name", 0] },
                    qc_name: { $arrayElemAt: ["$qcDetails.user_name", 0] },
                    drawingDetails: { $arrayElemAt: ["$drawingDetails", 0] },
                    gridDetails: { $arrayElemAt: ["$gridDetails", 0] },
                },
            },
            {
                $addFields: {
                    projectDetails: {
                        $arrayElemAt: ["$drawingDetails.projectDetails", 0],
                    },
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
                    report_no: report_no ? "$report_no" : "$report_no_two",
                    client: "$clientDetails.name",
                    project_name: "$projectDetails.name",
                    wo_no: "$projectDetails.work_order_no",
                    project_po_no: "$projectDetails.work_order_no",
                    offer_name: "$offer_name",
                    qc_name: "$qc_name",
                    qc_date: "$qc_time",
                    date: "$createdAt",
                    items: {
                        _id: "$items._id",
                        drawing_no: "$drawingDetails.drawing_no",
                        rev: "$drawingDetails.rev",
                        sheet_no: "$drawingDetails.sheet_no",
                        assembly_no: "$drawingDetails.assembly_no",
                        assembly_quantity: "$drawingDetails.assembly_quantity",
                        grid_no: "$gridDetails.grid_no",
                        grid_qty: "$gridDetails.grid_qty",
                        used_grid_qty: "$items.fd_used_grid_qty",
                        required_dimension: "$items.required_dimension",
                        remarks: report_no ? "$items.remarks" : "$items.qc_remarks",
                        ...(report_no_two && {
                            actual_dimension: "$items.actual_dimension",
                            // accept: {
                            //     $cond: [
                            //         { $eq: ["$status", 1] },
                            //         "PEN",
                            //         {
                            //             $cond: [
                            //                 { $eq: ["$status", 2] },
                            //                 "ACC",
                            //                 {
                            //                     $cond: [{ $eq: ["$status", 3] }, "REJ", "--"],
                            //                 },
                            //             ],
                            //         },
                            //     ],
                            // },
                            accept: {
                                $cond: [
                                    { $eq: ["$items.is_accepted", true] },
                                    "ACC",
                                    {
                                        $cond: [
                                            { $eq: ["$items.is_accepted", false] },
                                            "REJ",
                                            "--"
                                        ]
                                    }
                                ]
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
                        qc_date: "$qc_date",
                        date: "$date",
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
                    date: "$_id.date",
                    qc_date: "$_id.qc_date",
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

exports.oneMultiFD = async (req, res) => {
    const { report_no, report_no_two } = req.body;
    if (req.user && !req.error) {
        try {
            const data = await getOneFD(report_no, report_no_two);
            let requestData = data.result;

            if (data.status === 1) {
                sendResponse(res, 200, true, requestData, "Final dimension data found");
            } else if (data.status === 0) {
                sendResponse(res, 200, false, [], `Final dimension data not found`);
            } else if (data.status === 2) {
                // console.log("error", data.result);
                sendResponse(res, 500, false, {}, "Something went wrong11");
            }
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
};

exports.downloadOneMultiFD = async (req, res) => {
    const { report_no, report_no_two, print_date } = req.body;
    if (req.user && !req.error) {
        try {
            const data = await getOneFD(report_no, report_no_two);
            let requestData = data.result[0];

            if (data.status === 1) {
                let headerInfo = {
                    client: requestData?.client,
                    project_name: requestData?.project_name,
                    report_no: requestData?.report_no,
                    wo_no: requestData?.wo_no,
                    project_po_no: requestData?.project_po_no,
                    date: requestData?.date,
                    qc_date: requestData?.qc_date,
                    qc_name: requestData?.qc_name,
                    offer_name: requestData?.offer_name,
                };
                const template = fs.readFileSync("templates/multiFD.html", "utf-8");
                const renderedHtml = ejs.render(template, {
                    headerInfo,
                    items: requestData?.items,
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

                const pdfBuffer = await generatePDFWithoutPrintDate(page, {
                    print_date,
                });

                await browser.close();

                const pdfsDir = path.join(__dirname, "../../../pdfs");
                if (!fs.existsSync(pdfsDir)) {
                    fs.mkdirSync(pdfsDir);
                }

                let lastInspection = "";

                if (requestData) {
                    const split = requestData.report_no.split("/");
                    lastInspection = split[split.length - 2];
                }

                let x = "";
                if (lastInspection === "OFFER") {
                    x = "offer";
                } else {
                    x = "inspection";
                }

                const filename = `FD_${x}_${Date.now()}.pdf`;
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
            } else if (data.status === 0) {
                sendResponse(res, 200, false, {}, `FD data not found`);
            } else if (data.status === 2) {
                sendResponse(res, 500, false, {}, "Something went wrong");
            }
        } catch (error) {
            console.log(error);
            sendResponse(res, 500, false, {}, "Something went wrong1111");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
};
