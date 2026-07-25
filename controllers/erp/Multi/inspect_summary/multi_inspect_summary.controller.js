const FitupInspection = require("../../../../models/erp/Multi/multi_fitup_inspection.model");
const WeldVisualInspection = require("../../../../models/erp/Multi/multi_weld_inspection.model");
const UTInspection = require("../../../../models/erp/Multi/Testing/multi_ut_test.model");
const RTInspection = require("../../../../models/erp/Multi/Testing/multi_rt_test.model");
const MPTInspection = require("../../../../models/erp/Multi/Testing/multi_mpt_test.model");
const LPTInspection = require("../../../../models/erp/Multi/Testing/multi_lpt_test.model");
const FDInspection = require("../../../../models/erp/Multi/multi_fd_master.model");
const InspectSummary = require("../../../../models/erp/Multi/inspect_summary/multi_inspect_summary.model");
const { sendResponse } = require("../../../../helper/response");
const { default: mongoose } = require("mongoose");
const {
    Types: { ObjectId },
} = require("mongoose");
const { TitleFormat } = require("../../../../utils/enum");
const { generatePDFWithoutPrintDate } = require("../../../../utils/pdfUtils");
const ejs = require("ejs");
const fs = require("fs");
const XLSX = require("xlsx"); // for utility functions
const XLSXStyle = require("xlsx-style"); // for styling
const puppeteer = require("puppeteer");
const path = require("path");
const URI = process.env.PDF_URL;
const PATH = process.env.PDF_PATH;
const User = require("../../../../models/users.model");
const ErpRole = require("../../../../models/erp/erp_role.model");
const Project = require("../../../../models/project.model");
const addEmailJob = require("../../../../utils/emailJob");
const sendEmail = require("../../../../utils/sendEmail");
const commonStageOfferEmail = require("../../../../utils/commonStageOfferEmail");
const commonStageAcceptanceEmail = require("../../../../utils/commonStageAcceptanceEmail");

exports.addMultiInspectSummary = async (items, id) => {
    try {
        const filteredItems = items.filter((item) => item.is_accepted === true);

        if (!filteredItems.length) {
            return { status: 0, result: [] };
        }

        const getInspectionData = async (model, reportField, filteredItems) => {
            return await model.aggregate([
                { $unwind: "$items" },
                { $match: { deleted: false } },
                {
                    $lookup: {
                        from: "erp-drawing-grid-items",
                        let: { gridItemId: "$items.grid_item_id" },
                        pipeline: [
                            { $match: { deleted: false } },
                            { $match: { $expr: { $eq: ["$_id", "$$gridItemId"] } } },
                            { $project: { grid_id: 1 } },
                        ],
                        as: "grid_data",
                    },
                },
                {
                    $addFields: { grid_id: { $arrayElemAt: ["$grid_data.grid_id", 0] } },
                },
                {
                    $group: {
                        _id: { grid_id: "$grid_id", drawing_id: "$items.drawing_id" },
                        [reportField]: {
                            $addToSet: {
                                $cond: {
                                    if: {
                                        $in: [
                                            reportField,
                                            [
                                                "fitup_inspection_report",
                                                "weld_inspection_report",
                                            ],
                                        ],
                                    },
                                    then: "$report_no_two",
                                    else: "$test_inspect_no",
                                },
                            },
                        },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        grid_id: "$_id.grid_id",
                        drawing_id: "$_id.drawing_id",
                        [reportField]: 1,
                    },
                },
                {
                    $match: {
                        $or: filteredItems.map((item) => ({
                            drawing_id: new mongoose.Types.ObjectId(item.drawing_id),
                            grid_id: new mongoose.Types.ObjectId(item.grid_id),
                        })),
                    },
                },
            ]);
        };

        const [fitupData, weldvisualData, UTData, RTData, MPTData, LPTData] =
            await Promise.all([
                getInspectionData(
                    FitupInspection,
                    "fitup_inspection_report",
                    filteredItems
                ),
                getInspectionData(
                    WeldVisualInspection,
                    "weld_inspection_report",
                    filteredItems
                ),
                getInspectionData(UTInspection, "ut_report", filteredItems),
                getInspectionData(RTInspection, "rt_report", filteredItems),
                getInspectionData(MPTInspection, "mpt_report", filteredItems),
                getInspectionData(LPTInspection, "lpt_report", filteredItems),
            ]);

        const FDData = await FDInspection.aggregate([
            { $unwind: "$items" },
            { $match: { deleted: false, _id: new ObjectId(id) } },
            {
                $group: {
                    _id: { grid_id: "$items.grid_id", drawing_id: "$items.drawing_id" },
                    fd_report: { $addToSet: "$report_no_two" },
                    is_grid_qty: { $first: "$items.fd_used_grid_qty" },
                },
            },
            {
                $project: {
                    _id: 0,
                    grid_id: "$_id.grid_id",
                    drawing_id: "$_id.drawing_id",
                    is_grid_qty: 1,
                    fd_report: 1,
                },
            },
            {
                $match: {
                    $or: filteredItems.map((item) => ({
                        drawing_id: new mongoose.Types.ObjectId(item.drawing_id),
                        grid_id: new mongoose.Types.ObjectId(item.grid_id),
                    })),
                },
            },
        ]);

        const combinedData = [
            ...fitupData,
            ...weldvisualData,
            ...UTData,
            ...RTData,
            ...MPTData,
            ...LPTData,
            ...FDData,
        ];

        function mergeReports(data) {
            return Object.values(
                data.reduce(
                    (
                        acc,
                        {
                            drawing_id,
                            grid_id,
                            is_grid_qty = 0,
                            fitup_inspection_report = [],
                            weld_inspection_report = [],
                            ut_report = [],
                            rt_report = [],
                            mpt_report = [],
                            lpt_report = [],
                            fd_report = [],
                        }
                    ) => {
                        const key = `${drawing_id}_${grid_id}`;

                        if (!acc[key]) {
                            acc[key] = {
                                drawing_id,
                                grid_id,
                                is_grid_qty,
                                fitup_inspection_report: [],
                                weld_inspection_report: [],
                                ut_report: [],
                                rt_report: [],
                                mpt_report: [],
                                lpt_report: [],
                                fd_report: [],
                            };
                        } else {
                            acc[key].is_grid_qty += is_grid_qty;
                        }

                        acc[key].fitup_inspection_report.push(...fitup_inspection_report);
                        acc[key].weld_inspection_report.push(...weld_inspection_report);
                        acc[key].ut_report.push(...ut_report);
                        acc[key].rt_report.push(...rt_report);
                        acc[key].mpt_report.push(...mpt_report);
                        acc[key].lpt_report.push(...lpt_report);
                        acc[key].fd_report.push(...fd_report);

                        return acc;
                    },
                    {}
                )
            );
        }

        let requestData = {
            items: [],
        };
        requestData.items = mergeReports(combinedData);

        if (requestData.items.length && requestData.items.length > 0) {
            const addInspectSummary = await InspectSummary.create(requestData);
            return { status: 1, result: addInspectSummary };
        } else {
            return { status: 0, result: [] };
        }
    } catch (error) {
        console.log("error", error);
        return { status: 2, result: error };
    }
};

exports.addMultiInspectioSummary = async (req, res) => {
    const { items, project } = req.body;
    if (req.user && !req.error) {
        try {
            const data = await this.addMultiInspectSummary(items, project);
            let requestData = data.result;

            if (data.status === 1) {
                sendResponse(
                    res,
                    200,
                    true,
                    requestData,
                    "Inspect summary data added successfully"
                );
            } else if (data.status === 0) {
                sendResponse(res, 200, false, {}, `Inspect summary data not added`);
            } else if (data.status === 2) {
                console.log("errr", data.result);
                sendResponse(res, 500, false, {}, "Something went wrong");
            }
        } catch (error) {
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
};

exports.getMultiInspectList = async (req, res) => {
    const { project_id } = req.body;
    if (req.user && !req.error) {
        try {
            let requestData = await InspectSummary.aggregate([
               
                { $match: { deleted: false, is_generate: false } },
                { $unwind: "$items" },
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
                    $match: { "projectDetails._id": new ObjectId(project_id) },
                },
                {
                    $project: {
                        _id: 1,
                        client: "$clientDetails.name",
                        project_name: "$projectDetails.name",
                        project_id: "$projectDetails._id",
                        wo_no: "$projectDetails.work_order_no",
                        project_po_no: "$projectDetails.work_order_no",
                        items: {
                            _id: "$items._id",
                            drawing_no: "$drawingDetails.drawing_no",
                            drawing_id: "$drawingDetails._id",
                            rev: "$drawingDetails.rev",
                            sheet_no: "$drawingDetails.sheet_no",
                            assembly_no: "$drawingDetails.assembly_no",
                            assembly_quantity: "$drawingDetails.assembly_quantity",
                            grid_no: "$gridDetails.grid_no",
                            grid_qty: "$gridDetails.grid_qty",
                            profile: "$itemDetails.name",
                            is_grid_qty: "$items.is_grid_qty",
                            fitup_inspection_report: "$items.fitup_inspection_report",
                            weld_inspection_report: "$items.weld_inspection_report",
                            ut_report: "$items.ut_report",
                            rt_report: "$items.rt_report",
                            mpt_report: "$items.mpt_report",
                            lpt_report: "$items.lpt_report",
                            fd_report: "$items.fd_report",
                        },
                    },
                },
                {
                    $group: {
                        _id: {
                            _id: "$_id",
                            project_name: "$project_name",
                            project_id: "$project_id",
                            wo_no: "$wo_no",
                            project_po_no: "$project_po_no",
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
                        project_id: "$_id.project_id",
                        wo_no: "$_id.wo_no",
                        project_po_no: "$_id.project_po_no",
                        items: 1,
                    },
                },
            ]);
// console.log("request data", requestData);
            if (requestData.length && requestData.length > 0) {
                sendResponse(res, 200, true, requestData, `Inspection Summary list`);
            } else {
                sendResponse(res, 200, true, [], `Inspection summary not found`);
            }
             
        } catch (error) {
            console.log("error", error);
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
};


// async function getLastInspection(project) {
//   try {
//     const pipeline = [
//       {
//         $match: {
//           deleted: false,
//           report_no_two: {
//             $regex: `^VE/${project}/STR/ISR/\\d+$`,
//             $options: 'i'
//           }
//         }
//       },
//       {
//         $addFields: {
//           inspectionNumber: {
//             $toInt: {
//               $arrayElemAt: [
//                 { $split: ["$report_no_two", "/"] },
//                 -1
//               ]
//             }
//           }
//         }
//       },
//       { $sort: { inspectionNumber: -1 } },
//       { $limit: 1 },
//       {
//         $project: {
//           _id: 1,
//           report_no_two: 1,
//           createdAt: 1,
//           inspectionNumber: 1
//         }
//       }
//     ];

//     const [lastInspection] = await InspectSummary.aggregate(pipeline);
//     console.log('Aggregation result:', lastInspection); // Debug log
//     return lastInspection || null;
//   } catch (error) {
//     console.error('Error fetching last inspection:', error);
//     throw error;
//   }
// }

// exports.generateInspect = async (req, res) => {
//     const { id, project } = req.body;

//     if (req.user && !req.error) {
//         try {
//             if (id.length > 0) {
//                 // const lastInspection = await InspectSummary.findOne(
//                 //     { deleted: false, report_no: { $regex: new RegExp(`/${project}/`) } },
//                 //     {},
//                 //     { sort: { createdAt: -1 } }
//                 // );
//                 const lastInspection = await getLastInspection(project);

//                 let inspectionNo = lastInspection?.report_no
//                     ? parseInt(lastInspection.report_no.split("/").pop(), 10) + 1
//                     : 1;

//                 const gen_report_no =
//                     TitleFormat.INSPECTSUMMARY.replace("/PROJECT/", `/${project}/`) +
//                     inspectionNo;
//                 const uniqueBatchId = new mongoose.Types.ObjectId();
//                 const updateInspect = await InspectSummary.updateMany(
//                     { _id: { $in: id } },
//                     { $set: { is_generate: true, batch_id: uniqueBatchId, report_no: gen_report_no, summary_date: new Date() } },
//                     { new: true }
//                 );
//                 if (updateInspect.modifiedCount > 0) {
//                     sendResponse(
//                         res,
//                         200,
//                         true,
//                         {},
//                         `Inspect summary generate successfully`
//                     );
//                 } else if (updateInspect.matchedCount == 0) {
//                     sendResponse(res, 400, false, {}, `Inspect summary not found`);
//                 }
//             } else {
//                 return sendResponse(res, 400, false, {}, "Missing parameters");
//             }
//         } catch (error) {
//             console.log(error);
//             sendResponse(res, 500, false, {}, "Something went wrong");
//         }
//     } else {
//         sendResponse(res, 400, false, {}, "Unauthorised");
//     }
// };

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function getLastInspection(project) {
  try {
    const escapedProject = escapeRegex(project);
    const pipeline = [
      {
        $match: {
          deleted: false,
          report_no: {
            $regex: `^VE/${escapedProject}/STR/ISR/\\d+$`,
            $options: 'i'
          }
        }
      },
      {
        $addFields: {
          inspectionNumber: {
            $toInt: {
              $arrayElemAt: [
                { $split: ["$report_no", "/"] },
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
          report_no: 1,
          createdAt: 1,
          inspectionNumber: 1
        }
      }
    ];

    const [lastInspection] = await InspectSummary.aggregate(pipeline);
    console.log('Aggregation result:', lastInspection); // Debug log
    return lastInspection || null;
  } catch (error) {
    console.error('Error fetching last inspection:', error);
    throw error;
  }
}

exports.generateInspect = async (req, res) => {
  const { id, project,project_id } = req.body;

  if (req.user && !req.error) {
    try {
      if (id.length > 0) {
        const lastInspection = await getLastInspection(project);

        let inspectionNo = lastInspection?.report_no
          ? parseInt(lastInspection.report_no.split("/").pop(), 10) + 1
          : 1;

        const gen_report_no =
          TitleFormat.INSPECTSUMMARY.replace("/PROJECT/", `/${project}/`) + inspectionNo;

        const uniqueBatchId = new mongoose.Types.ObjectId();

        const updateInspect = await InspectSummary.updateMany(
          { _id: { $in: id } },
          {
            $set: {
              is_generate: true,
              batch_id: uniqueBatchId,
              report_no: gen_report_no,
              summary_date: new Date()
            }
          },
          { new: true }
        );
 /* ================= INSPECTION SUMMARY EMAIL START ================= */

    try {

        /* ==========================================
           PROJECT DETAILS
        ========================================== */

        const projectDetails =
            await Project.findById(
                project_id
            ).select(
                "name work_order_no"
            );

        /* ==========================================
           ROLES
        ========================================== */

        const roles =
            await ErpRole.find({

                deleted:false,

                name:{
                    $in:[
                        "Dispatch",
                        "Planning Engineer"
                    ]
                }

            });

        const roleIds =
            roles.map(
                role => role._id
            );

        /* ==========================================
           USERS
        ========================================== */

        let users =
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
           REMOVE DUPLICATES
        ========================================== */

        users =
            users.filter(

                (
                    user,
                    index,
                    self
                ) =>

                index===

                self.findIndex(
                    u=>

                    String(
                        u._id
                    )

                    ===

                    String(
                        user._id
                    )
                )

            );

        /* ==========================================
           DATE TIME
        ========================================== */

        const summaryDateTime =
            new Date()
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
            .replace("pm","PM");


        /* ==========================================
           SEND EMAIL
        ========================================== */

        for(const user of users){

            try{

                const html =
                    commonStageOfferEmail({

                        module:
                            "Structural",

                        userName:
                            user?.user_name || "-",

                        stageName:
                            "Inspection Summary",

                        offerNo:
                            gen_report_no || "-",

                        projectName:
                            projectDetails?.name || "-",

                        workOrderNo:
                            projectDetails?.work_order_no || "-",

                        offerDateTime:
                            summaryDateTime,

                        createdBy:
                            req.user?.user_name || "System",

                        remarks:
                            `Inspection Summary ${gen_report_no} generated successfully and forwarded for Dispatch/Planning process.`,

                        loginUrl:
                            process.env.ERP_URL

                    });


                addEmailJob({

                    to:
                        user.email,

                    subject:
                        `Inspection Summary Generated - ${gen_report_no}`,

                    html

                });

                console.log(
                    `Inspection Summary EMAIL QUEUED -> ${user.email}`
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

            "INSPECTION SUMMARY EMAIL ERROR:",

            emailErr

        );

    }

    /* ================= INSPECTION SUMMARY EMAIL END ================= */

        if (updateInspect.modifiedCount > 0) {
          sendResponse(
            res,
            200,
            true,
            {},
            `Inspect summary generated successfully`
          );
        } else if (updateInspect.matchedCount == 0) {
          sendResponse(res, 400, false, {}, `Inspect summary not found`);
        }
      } else {
        return sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } catch (error) {
      console.error(error);
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorized");
  }
};


// const GenerateInspectList = async (project_id, batch_id, page , limit, search) => {
//     try {
//         let matchObj = { project_id: new ObjectId(project_id) };

//         if (batch_id) {
//             matchObj = { ...matchObj, batch_id: new ObjectId(batch_id) };
//         }

//         page = parseInt(page);
//         limit = parseInt(limit);
   
// // Apply pagination **only if limit is provided**

//         // if (isNaN(page) || page < 1) page = 1;
//         // if (isNaN(limit) || limit < 1) limit = 20;

//         const skip = (page - 1) * limit;


//         let basePipeline = [
//             { $match: { deleted: false, is_generate: true } },
//             { $unwind: "$items" },
//             {
//                 $lookup: {
//                     from: "erp-planner-drawings",
//                     localField: "items.drawing_id",
//                     foreignField: "_id",
//                     as: "drawingDetails",
//                     pipeline: [
//                         {
//                             $lookup: {
//                                 from: "bussiness-projects",
//                                 localField: "project",
//                                 foreignField: "_id",
//                                 as: "projectDetails",
//                                 pipeline: [
//                                     {
//                                         $lookup: {
//                                             from: "store-parties",
//                                             localField: "party",
//                                             foreignField: "_id",
//                                             as: "clientDetails",
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
//                     as: "gridDetails",
//                 },
//             },
//             {
//                 $addFields: {
//                     drawingDetails: { $arrayElemAt: ["$drawingDetails", 0] },
//                     gridDetails: { $arrayElemAt: ["$gridDetails", 0] },
//                 },
//             },
//             {
//                 $addFields: {
//                     projectDetails: {
//                         $arrayElemAt: ["$drawingDetails.projectDetails", 0],
//                     },
//                 },
//             },
//             {
//                 $addFields: {
//                     clientDetails: {
//                         $arrayElemAt: ["$projectDetails.clientDetails", 0],
//                     },
//                 },
//             },
//             {
//                 $project: {
//                     batch_id: 1,
//                     client: "$clientDetails.name",
//                     project_name: "$projectDetails.name",
//                     project_id: "$projectDetails._id",
//                     wo_no: "$projectDetails.work_order_no",
//                     project_po_no: "$projectDetails.work_order_no",
//                     report_no: "$report_no",
//                     summary_date: "$summary_date",
//                     items: {
//                         _id: "$items._id",
//                         main_id: "$_id",
//                         summary_date: "$summary_date",
//                         drawing_no: "$drawingDetails.drawing_no",
//                         drawing_id: "$drawingDetails._id",
//                         rev: "$drawingDetails.rev",
//                         sheet_no: "$drawingDetails.sheet_no",
//                         assembly_no: "$drawingDetails.assembly_no",
//                         assembly_quantity: "$drawingDetails.assembly_quantity",
//                         unit_area: "$drawingDetails.unit",
//                         grid_no: "$gridDetails.grid_no",
//                         grid_id: "$gridDetails._id",
//                         grid_qty: "$gridDetails.grid_qty",
//                         profile: "$itemDetails.name",
//                         is_grid_qty: "$items.is_grid_qty",
//                         moved_next_step: "$items.moved_next_step",
//                         fitup_inspection_report: "$items.fitup_inspection_report",
//                         weld_inspection_report: "$items.weld_inspection_report",
//                         ut_report: "$items.ut_report",
//                         rt_report: "$items.rt_report",
//                         mpt_report: "$items.mpt_report",
//                         lpt_report: "$items.lpt_report",
//                         fd_report: "$items.fd_report",
//                     },
//                 },
//             },
//             // {
//             //     $match: matchObj,
//             // },
//  {
//     $match: {
//       ...matchObj,
//       ...(search && {
//         $or: [
//           { report_no: { $regex: search, $options: "i" } },
//           { "drawingDetails.assembly_no": { $regex: search, $options: "i" } },
//           {"items.assembly_no" : {$regex:search, $options: "i"}}
          
//         ]
//       })
//     }
//   },

//             {
//                 $group: {
//                     _id: {
//                         batch_id: "$batch_id",
//                         project_name: "$project_name",
//                         project_id: "$project_id",
//                         wo_no: "$wo_no",
//                         project_po_no: "$project_po_no",
//                         client: "$client",
//                         report_no: "$report_no",
//                         summary_date: "$summary_date",
//                     },
//                     items: { $push: "$items" },
//                 },
//             },
//             {
//                 $sort: { "_id.summary_date": -1 },
//             }
//         ];
// if (limit && page) {
//     basePipeline.push({ $skip: skip }, { $limit: limit });
// }
//         // Step 1: Get total count before applying skip/limit
//         const totalData = await InspectSummary.aggregate([...basePipeline, { $count: "total" }]);
//         const totalCount = totalData.length > 0 ? totalData[0].total : 0;
//         const totalPages = Math.ceil(totalCount / limit);

//         // Step 2: Apply pagination
//         basePipeline.push(
//             { $skip: skip },
//             { $limit: limit },
//             {
//                 $project: {
//                     _id: 0,
//                     batch_id: "$_id.batch_id",
//                     client: "$_id.client",
//                     project_name: "$_id.project_name",
//                     project_id: "$_id.project_id",
//                     wo_no: "$_id.wo_no",
//                     project_po_no: "$_id.project_po_no",
//                     report_no: "$_id.report_no",
//                     summary_date: "$_id.summary_date",
//                     items: 1,
//                 },
//             }
//         );

//         const requestData = await InspectSummary.aggregate(basePipeline);

//         return {
//             status: 1,
//             result: requestData,
//             pagination: {
//                 totalCount,
//                 totalPages,
//                 currentPage: page,
//                 perPage: limit,
//             },
//         };

//     } catch (error) {
//         return { status: 2, result: error };
//     }
// };

const GenerateInspectList = async (project_id, batch_id, page, limit, search) => {
  try {
    let matchObj = { project_id: new ObjectId(project_id) };

    if (batch_id) {
      matchObj = { ...matchObj, batch_id: new ObjectId(batch_id) };
    }

    page = parseInt(page);
    limit = parseInt(limit);

    const isPagination = !isNaN(page) && page > 0 && !isNaN(limit) && limit > 0;
    const skip = isPagination ? (page - 1) * limit : 0;

    let basePipeline = [
      { $match: { deleted: false, is_generate: true } },
      { $unwind: "$items" },
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
          drawingDetails: { $arrayElemAt: ["$drawingDetails", 0] },
          gridDetails: { $arrayElemAt: ["$gridDetails", 0] },
        },
      },
      {
        $addFields: {
          projectDetails: { $arrayElemAt: ["$drawingDetails.projectDetails", 0] },
          clientDetails: { $arrayElemAt: ["$projectDetails.clientDetails", 0] },
        },
      },
      {
        $project: {
          batch_id: 1,
          client: "$clientDetails.name",
          project_name: "$projectDetails.name",
          project_id: "$projectDetails._id",
          wo_no: "$projectDetails.work_order_no",
          project_po_no: "$projectDetails.work_order_no",
          report_no: "$report_no",
          summary_date: "$summary_date",
          items: {
            _id: "$items._id",
            main_id: "$_id",
            summary_date: "$summary_date",
            drawing_no: "$drawingDetails.drawing_no",
            drawing_id: "$drawingDetails._id",
            rev: "$drawingDetails.rev",
            sheet_no: "$drawingDetails.sheet_no",
            assembly_no: "$drawingDetails.assembly_no",
            assembly_quantity: "$drawingDetails.assembly_quantity",
            unit_area: "$drawingDetails.unit",
            grid_no: "$gridDetails.grid_no",
            grid_id: "$gridDetails._id",
            grid_qty: "$gridDetails.grid_qty",
            profile: "$itemDetails.name",
            is_grid_qty: "$items.is_grid_qty",
            moved_next_step: "$items.moved_next_step",
            fitup_inspection_report: "$items.fitup_inspection_report",
            weld_inspection_report: "$items.weld_inspection_report",
            ut_report: "$items.ut_report",
            rt_report: "$items.rt_report",
            mpt_report: "$items.mpt_report",
            lpt_report: "$items.lpt_report",
            fd_report: "$items.fd_report",
          },
        },
      },
      {
        $match: {
          ...matchObj,
          ...(search && {
            $or: [
              { report_no: { $regex: search, $options: "i" } },
              { "drawingDetails.assembly_no": { $regex: search, $options: "i" } },
              { "items.assembly_no": { $regex: search, $options: "i" } },
            ],
          }),
        },
      },
      {
        $group: {
          _id: {
            batch_id: "$batch_id",
            project_name: "$project_name",
            project_id: "$project_id",
            wo_no: "$wo_no",
            project_po_no: "$project_po_no",
            client: "$client",
            report_no: "$report_no",
            summary_date: "$summary_date",
          },
          items: { $push: "$items" },
        },
      },
      { $sort: { "_id.summary_date": -1 } },
    ];

    // Step 1: Get total count (before pagination)
    const totalData = await InspectSummary.aggregate([...basePipeline, { $count: "total" }]);
    const totalCount = totalData.length > 0 ? totalData[0].total : 0;
    const totalPages = isPagination ? Math.ceil(totalCount / limit) : 1;

    // Step 2: Apply pagination only if page & limit are valid
    if (isPagination) {
      basePipeline.push({ $skip: skip }, { $limit: limit });
    }

    basePipeline.push({
      $project: {
        _id: 0,
        batch_id: "$_id.batch_id",
        client: "$_id.client",
        project_name: "$_id.project_name",
        project_id: "$_id.project_id",
        wo_no: "$_id.wo_no",
        project_po_no: "$_id.project_po_no",
        report_no: "$_id.report_no",
        summary_date: "$_id.summary_date",
        items: 1,
      },
    });

    const requestData = await InspectSummary.aggregate(basePipeline);

    return {
      status: 1,
      result: requestData,
      pagination: isPagination
        ? {
            totalCount,
            totalPages,
            currentPage: page,
            perPage: limit,
          }
        : {
            totalCount: requestData.length,
            totalPages: 1,
            currentPage: null,
            perPage: null,
          },
    };
  } catch (error) {
    return { status: 2, result: error.message };
  }
};

// const GenerateInspectList = async (project_id, batch_id) => {
//     try {
//         let matchObj = { project_id: new ObjectId(project_id) };

//         if (batch_id) {
//             matchObj = { ...matchObj, batch_id: new ObjectId(batch_id) };
//         }

//         let requestData = await InspectSummary.aggregate([
//             { $match: { deleted: false, is_generate: true } },
//             { $unwind: "$items" },
//             {
//                 $lookup: {
//                     from: "erp-planner-drawings",
//                     localField: "items.drawing_id",
//                     foreignField: "_id",
//                     as: "drawingDetails",
//                     pipeline: [
//                         {
//                             $lookup: {
//                                 from: "bussiness-projects",
//                                 localField: "project",
//                                 foreignField: "_id",
//                                 as: "projectDetails",
//                                 pipeline: [
//                                     {
//                                         $lookup: {
//                                             from: "store-parties",
//                                             localField: "party",
//                                             foreignField: "_id",
//                                             as: "clientDetails",
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
//                     as: "gridDetails",
//                 },
//             },
//             {
//                 $addFields: {
//                     drawingDetails: { $arrayElemAt: ["$drawingDetails", 0] },
//                     gridDetails: { $arrayElemAt: ["$gridDetails", 0] },
//                 },
//             },
//             {
//                 $addFields: {
//                     projectDetails: {
//                         $arrayElemAt: ["$drawingDetails.projectDetails", 0],
//                     },
//                 },
//             },
//             {
//                 $addFields: {
//                     clientDetails: {
//                         $arrayElemAt: ["$projectDetails.clientDetails", 0],
//                     },
//                 },
//             },
//             {
//                 $project: {
//                     batch_id: 1,
//                     client: "$clientDetails.name",
//                     project_name: "$projectDetails.name",
//                     project_id: "$projectDetails._id",
//                     wo_no: "$projectDetails.work_order_no",
//                     project_po_no: "$projectDetails.work_order_no",
//                     report_no: "$report_no",
//                     summary_date: "$summary_date",
//                     items: {
//                         _id: "$items._id",
//                         main_id: "$_id",
//                         summary_date: "$summary_date",
//                         drawing_no: "$drawingDetails.drawing_no",
//                         drawing_id: "$drawingDetails._id",
//                         rev: "$drawingDetails.rev",
//                         sheet_no: "$drawingDetails.sheet_no",
//                         assembly_no: "$drawingDetails.assembly_no",
//                         assembly_quantity: "$drawingDetails.assembly_quantity",
//                         unit_area: "$drawingDetails.unit",
//                         grid_no: "$gridDetails.grid_no",
//                         grid_id: "$gridDetails._id",
//                         grid_qty: "$gridDetails.grid_qty",
//                         profile: "$itemDetails.name",
//                         is_grid_qty: "$items.is_grid_qty",
//                         moved_next_step: "$items.moved_next_step",
//                         fitup_inspection_report: "$items.fitup_inspection_report",
//                         weld_inspection_report: "$items.weld_inspection_report",
//                         ut_report: "$items.ut_report",
//                         rt_report: "$items.rt_report",
//                         mpt_report: "$items.mpt_report",
//                         lpt_report: "$items.lpt_report",
//                         fd_report: "$items.fd_report",
//                     },
//                 },
//             },
//             {
//                 $match: matchObj,
//             },
//             {
//                 $group: {
//                     _id: {
//                         batch_id: "$batch_id",
//                         project_name: "$project_name",
//                         project_id: "$project_id",
//                         wo_no: "$wo_no",
//                         project_po_no: "$project_po_no",
//                         client: "$client",
//                         report_no: "$report_no",
//                         summary_date: "$summary_date",
//                     },
//                     items: { $push: "$items" },
//                 },
//             },
//             {
//                 $sort: { "_id.summary_date": -1 }
//             },
//             {
//                 $project: {
//                     _id: 0,
//                     batch_id: "$_id.batch_id",
//                     client: "$_id.client",
//                     project_name: "$_id.project_name",
//                     project_id: "$_id.project_id",
//                     wo_no: "$_id.wo_no",
//                     project_po_no: "$_id.project_po_no",
//                     report_no: "$_id.report_no",
//                     summary_date: "$_id.summary_date",
//                     items: 1,
//                 },
//             },
//         ]);

//         if (requestData.length && requestData.length > 0) {
//             return { status: 1, result: requestData };
//         } else {
//             return { status: 0, result: [] };
//         }
//     } catch (error) {
//         return { status: 2, result: error };
//     }
// };


exports.MultiGenerateInspectList = async (req, res) => {
    const { project_id, batch_id, page, limit, search } = req.body;

    if (req.user && !req.error) {
        try {
            const data = await GenerateInspectList(project_id, batch_id, page, limit,search);
            const requestData = data.result;
 if (data.status === 1) {
                sendResponse(res, 200, true, {
                    data: requestData,
                    pagination: data.pagination
                }, "Inspect summary data found");
            }
            // if (data.status === 1) {
            //     sendResponse(res, 200, true, requestData, "Inspect summary data found");
            // } 
            else if (data.status === 0) {
                sendResponse(res, 200, false, {}, `Inspect summary data not found`);
            } else if (data.status === 2) {
                console.log("error", data.result);
                sendResponse(res, 500, false, {}, "Something went wrong");
            }
        } catch (error) {
            console.log("error", error);
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 401, false, {}, "Unauthorized");
    }
};

// exports.MultiGenerateInspectList = async (req, res) => {
//     const { project_id } = req.body;
//     if (req.user && !req.error) {
//         try {
//             const data = await GenerateInspectList(project_id);
//             let requestData = data.result;

//             if (data.status === 1) {
//                 sendResponse(res, 200, true, requestData, "Inspect summary data found");
//             } else if (data.status === 0) {
//                 sendResponse(res, 200, false, {}, `Inspect summary data not found`);
//             } else if (data.status === 2) {
//                 console.log("errr", data.result);
//                 sendResponse(res, 500, false, {}, "Something went wrong");
//             }
//         } catch (error) {
//             console.log("error", error);
//             sendResponse(res, 500, false, {}, "Something went wrong");
//         }
//     } else {
//         sendResponse(res, 401, false, {}, "Unauthorized");
//     }
// };

exports.downloadGenerateInspect = async (req, res) => {
    const { project_id, batch_id } = req.body;
    if (req.user && !req.error) {
        try {
            const data = await GenerateInspectList(project_id, batch_id);
            let requestData = data.result[0];

            if (data.status === 1) {
                let headerInfo = {
                    client: requestData?.client,
                    project_name: requestData?.project_name,
                    wo_no: requestData?.wo_no,
                    report_no: requestData?.report_no,
                    summary_date: requestData?.summary_date,
                };
                const template = fs.readFileSync(
                    "templates/multiInspectGenerate.html",
                    "utf-8"
                );
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
                    print_date: true,
                });

                await browser.close();

                const pdfsDir = path.join(__dirname, "../../../../pdfs");
                if (!fs.existsSync(pdfsDir)) {
                    fs.mkdirSync(pdfsDir);
                }

                const filename = `inspection_summary_${Date.now()}.pdf`;
                const filePath = path.join(__dirname, "../../../../pdfs", filename);

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
                sendResponse(res, 200, false, {}, `Inspection summary data not found`);
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
