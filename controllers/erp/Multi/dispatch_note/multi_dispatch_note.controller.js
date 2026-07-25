const { sendResponse } = require("../../../../helper/response");
const ISOfferTable = require("../../../../models/erp/Multi/offer_table_data/dispatch_offer_table.model");
const DispatchNote = require("../../../../models/erp/Multi/dispatch_note/multi_dispatch_note.model");
const { TitleFormat } = require("../../../../utils/enum");
const { default: mongoose } = require("mongoose");
const {
  Types: { ObjectId },
} = require("mongoose");
const { generatePDF } = require("../../../../utils/pdfUtils");
const ejs = require("ejs");
const fs = require("fs");
const XLSX = require("xlsx"); // for utility functions
const XLSXStyle = require("xlsx-style"); // for styling
const puppeteer = require("puppeteer");
const path = require("path");
const URI = process.env.PDF_URL;
const PATH = process.env.PDF_PATH;
const {
  generateSurfaceOfferFromDispatch,
} = require("../../Multi/multi_surface_inspection.controller");
const User = require("../../../../models/users.model");
const ErpRole = require("../../../../models/erp/erp_role.model");
const Project = require("../../../../models/project.model");
const addEmailJob = require("../../../../utils/emailJob");
const sendEmail = require("../../../../utils/sendEmail");
const commonStageOfferEmail = require("../../../../utils/commonStageOfferEmail");
const commonStageAcceptanceEmail = require("../../../../utils/commonStageAcceptanceEmail");
const { addDispatchNoteReleaseNote } = require("../release_note/multi_release_note.controller");

// exports.manageMultiDispatchNote = async (req, res) => {
//     const {
//         items,
//         dispatch_site,
//         prepared_by,
//         project,
//         selectedProcedures
//     } = req.body;
//     if (!req.user || req.error) {
//         return sendResponse(res, 401, false, {}, "Unauthorized");
//     }
//     if (!items) {
//         return sendResponse(res, 400, false, {}, "Missing parameter");
//     }
//     const itemsArray = JSON.parse(items);
//     // const itemsArray = items;
//     try {
//         const lastDispatch = await DispatchNote.findOne(
//             { deleted: false, report_no: { $regex: `/${project}/` } },
//             {},
//             { sort: { createdAt: -1 } }
//         );

//         let dispatchNo = lastDispatch?.report_no
//             ? parseInt(lastDispatch.report_no.split("/").pop()) + 1
//             : 1;

//         const gen_report_no =
//             TitleFormat.DISPATCHLOTNO.replace("/PROJECT/", `/${project}/`) + dispatchNo;

//         const result = await DispatchNote.create({
//             report_no: gen_report_no,
//             dispatch_site,
//             items: itemsArray,
//             dispatch_date: Date.now(),
//             prepared_by,
//             selectedProcedures,
//             project
//         });
//         if (result) {
//             for (const item of itemsArray) {
//                 const { dis_offer_id } = item;
//                 const deleteDispatchOffer = await ISOfferTable.deleteOne({ _id: new ObjectId(dis_offer_id), });
//             }
//          result.project = project;
//             let selectedList = [];

// if (Array.isArray(selectedProcedures)) {
//     selectedList = selectedProcedures;
// } else if (typeof selectedProcedures === 'string') {
//     selectedList = [selectedProcedures];
// }

// const normalizedProcedures = selectedList.map(p => p.toLowerCase());
// console.log("normalizedProcedures",normalizedProcedures);

// if (normalizedProcedures.includes("surface primer") || normalizedProcedures.includes("surface_primer")) {
//     try {
//         console.log("✅ Surface Primer selected. Calling Surface API and QC...");
//         await generateSurfaceOfferFromDispatch(result);
//     } catch (err) {
//         console.error("❌ Error calling surface/qc functions:", err);
//     }
// }
//             return sendResponse(res, 200, true, result, "Dispatch Note data added successfully");
//         } else {
//             return sendResponse(res, 400, false, {}, "Dispatch Note data not added");
//         }
//     } catch (error) {
//         console.log(error);
//         sendResponse(res, 500, false, {}, "Something went wrong");
//     }
// };

exports.manageMultiDispatchNote = async (req, res) => {
  const {
    items,
    dispatch_site,
    prepared_by,
    project,
    isSurface,
    isMio,
    isFp,
    isIrn,
    selectedProcedures,
  } = req.body;

  if (!req.user || req.error) {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }
  if (!items) {
    return sendResponse(res, 400, false, {}, "Missing parameter");
  }
  const itemsArray = JSON.parse(items);
  // const itemsArray = items;
  try {
    const lastDispatch = await DispatchNote.findOne(
      { deleted: false, report_no: { $regex: `/${project}/` } },
      {},
      { sort: { createdAt: -1 } }
    );

    let dispatchNo = lastDispatch?.report_no
      ? parseInt(lastDispatch.report_no.split("/").pop()) + 1
      : 1;

    const gen_report_no =
      TitleFormat.DISPATCHLOTNO.replace("/PROJECT/", `/${project}/`) +
      dispatchNo;

    const result = await DispatchNote.create({
      report_no: gen_report_no,
      dispatch_site,
      items: itemsArray,
      dispatch_date: Date.now(),
      prepared_by,
      isSurface,
      isMio,
      isFp,
      isIrn,
      selectedProcedures,
    });

    // console.log("result", result);


    if (
  (isIrn === 'true' || isIrn === true) &&
  (isSurface === 'false' || isSurface === false) &&
  (isMio === 'false' || isMio === false) &&
  (isFp === 'false' || isFp === false)
)
 {
   console.log("dispatch:: isIrn is true, generating release note");
   itemsArray.forEach(item => {
    item.is_accepted = 2; // Set is_accepted to 2 for all items
  });
 
  console.log("itemsArray for release note:", itemsArray[0]);
  const release_note = await addDispatchNoteReleaseNote({
    itemArray: itemsArray,
    id: result._id,
    isIrn,
    isSurface,
    isMio,
    isFp,
  });
  console.log(" dispatch::::::Release note added:", release_note);
}

    if (result) {
      for (const item of itemsArray) {
        const { dis_offer_id } = item;
        const deleteDispatchOffer = await ISOfferTable.deleteOne({
          _id: new ObjectId(dis_offer_id),
        });
      }
/* ================= DISPATCH NOTE EMAIL START ================= */

try {

    /* ==========================================
       PREPARED USER
    ========================================== */

    const requestUser =
        await User.findById(
            prepared_by
        );

    /* ==========================================
       PROJECT DETAILS
    ========================================== */

    const projectDetails =
        await Project.findOne({
            name: project
        }).select(
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

    const dispatchDateTime =

        result?.dispatch_date

        ? new Date(
            result.dispatch_date
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
                        "Dispatch Note",

                    offerNo:
                        result?.report_no || "-",

                    projectName:
                        projectDetails?.name || "-",

                    workOrderNo:
                        projectDetails?.work_order_no || "-",

                    offerDateTime:
                        dispatchDateTime,

                    createdBy:
                        requestUser?.user_name || "-",

                    remarks:
                        `Dispatch Note has been generated by ${requestUser?.user_name || "-"} and is ready for Surface for Painting process.`,

                    loginUrl:
                        process.env.ERP_URL

                });


            addEmailJob({

                to:
                    user.email,

                subject:
                    `Dispatch Note Generated - ${result?.report_no}`,

                html

            });

            console.log(
                `DISPATCH EMAIL QUEUED -> ${user.email}`
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

        "DISPATCH EMAIL ERROR:",

        emailErr

    );

}

/* ================= DISPATCH NOTE EMAIL END ================= */
      
      return sendResponse(
        res,
        200,
        true,
        result,
        "Dispatch Note data added successfully"
      );
    } else {
      return sendResponse(res, 400, false, {}, "Dispatch Note data not added");
    }
  } catch (error) {
    console.log(error);
    sendResponse(res, 500, false, {}, "Something went wrong");
  }
};

//original code 
// exports.getMultiDispatchNote = async (req, res) => {
//   const {
//     project_id,
//     paint_system_id,
//     report_no,
//     dispatch_site,
//     selectedProcedures,
//   } = req.body;
//   if (req.user && !req.error) {
//     try {
//       let matchObj = {};

//       if (paint_system_id) {
//         matchObj["paintDetails._id"] = new ObjectId(paint_system_id);
//       }

//       if (report_no) {
//         matchObj["report_no"] = report_no;
//       }

//       if (dispatch_site) {
//         matchObj["dispatch_site"] = dispatch_site;
//       }

//       if (selectedProcedures) {
//         matchObj["selectedProcedures"] = selectedProcedures;
//       }

//       let requestData = await DispatchNote.aggregate([
//         // {
//         //   $match: {
//         //     deleted: false,
//         //     isMio: true,
//         //   },
//         // },

//         { $unwind: "$items" },
//         {
//           $lookup: {
//             from: "erp-planner-drawings",
//             localField: "items.drawing_id",
//             foreignField: "_id",
//             as: "drawingDetails",
//             pipeline: [
//               {
//                 $lookup: {
//                   from: "bussiness-projects",
//                   localField: "project",
//                   foreignField: "_id",
//                   as: "projectDetails",
//                   pipeline: [
//                     {
//                       $lookup: {
//                         from: "store-parties",
//                         localField: "party",
//                         foreignField: "_id",
//                         as: "clientDetails",
//                       },
//                     },
//                   ],
//                 },
//               },
//             ],
//           },
//         },
//         {
//           $lookup: {
//             from: "erp-drawing-grids",
//             localField: "items.grid_id",
//             foreignField: "_id",
//             as: "gridDetails",
//           },
//         },
//         {
//           $lookup: {
//             from: "users",
//             localField: "prepared_by",
//             foreignField: "_id",
//             as: "preparedDetails",
//           },
//         },
//         {
//           $lookup: {
//             from: "painting-systems",
//             localField: "items.paint_system",
//             foreignField: "_id",
//             as: "paintDetails",
//           },
//         },
//         {
//           $addFields: {
//             drawingDetails: { $arrayElemAt: ["$drawingDetails", 0] },
//             gridDetails: { $arrayElemAt: ["$gridDetails", 0] },
//             preparedDetails: { $arrayElemAt: ["$preparedDetails", 0] },
//             paintDetails: { $arrayElemAt: ["$paintDetails", 0] },
//           },
//         },
//         {
//           $addFields: {
//             projectDetails: {
//               $arrayElemAt: ["$drawingDetails.projectDetails", 0],
//             },
//             clientDetails: {
//               $arrayElemAt: [
//                 "$drawingDetails.projectDetails.0.clientDetails",
//                 0,
//               ],
//             },
//           },
//         },
//         {
//           $match: {
//             "projectDetails._id": new ObjectId(project_id),
//             ...matchObj,
//           },
//         },

//         {
//           $project: {
//             _id: 1,
//             report_no: "$report_no",
//             dispatch_date: "$dispatch_date",
//             dispatch_site: "$dispatch_site",
//             selectedProcedures: "$selectedProcedures",
//             prepared_by: "$preparedDetails.user_name",
//             client: "$clientDetails.name",
//             project_name: "$projectDetails.name",
//             wo_no: "$projectDetails.work_order_no",
//             project_po_no: "$projectDetails.work_order_no",
//             createdAt: 1,
//             isSurface: "$isSurface",
//             isMio: "$isMio",
//             isFp: "$isFp",
//             isIrn: "$isIrn",
//             items: {
//               _id: "$items._id",
//               main_id: "$_id",
//               drawing_id: "$drawingDetails._id",
//               drawing_no: "$drawingDetails.drawing_no",
//               rev: "$drawingDetails.rev",
//               unit_area: "$drawingDetails.unit",
//               sheet_no: "$drawingDetails.sheet_no",
//               assembly_no: "$drawingDetails.assembly_no",
//               assembly_quantity: "$drawingDetails.assembly_quantity",
//               grid_id: "$gridDetails._id",
//               grid_no: "$gridDetails.grid_no",
//               grid_qty: "$gridDetails.grid_qty",
//               dn_grid_balance_qty: "$items.dispatch_balance_grid_qty",
//               dn_grid_qty: "$items.dispatch_used_grid_qty",
//               dn_move_qty: "$items.moved_next_step",
//               ass_weight: "$items.ass_weight",
//               ass_area: "$items.ass_area",
//               paint_system_no: "$paintDetails.paint_system_no",
//               paint_system_id: "$paintDetails._id",
//               remarks: "$items.remarks",
//             },
//           },
//         },
//         {
//           $group: {
//             _id: {
//               _id: "$_id",
//               report_no: "$report_no",
//               dispatch_date: "$dispatch_date",
//               dispatch_site: "$dispatch_site",
//               selectedProcedures: "$selectedProcedures",
//               prepared_by: "$prepared_by",
//               client: "$client",
//               project_name: "$project_name",
//               wo_no: "$wo_no",
//               project_po_no: "$project_po_no",
//               isSurface: "$isSurface",
//               isMio: "$isMio",
//               isFp: "$isFp",
//               isIrn: "$isIrn",
//               createdAt: "$createdAt",
//             },
//             items: { $push: "$items" },
//           },
//         },
//         {
//           $project: {
//             _id: "$_id._id",
//             report_no: "$_id.report_no",
//             dispatch_date: "$_id.dispatch_date",
//             dispatch_site: "$_id.dispatch_site",
//             selectedProcedures: "$_id.selectedProcedures",
//             prepared_by: "$_id.prepared_by",
//             client: "$_id.client",
//             project_name: "$_id.project_name",
//             wo_no: "$_id.wo_no",
//             project_po_no: "$_id.project_po_no",
//             isSurface: "$_id.isSurface",
//             isMio: "$_id.isMio",
//             isFp: "$_id.isFp",
//             isIrn: "$_id.isIrn",
//             createdAt: "$_id.createdAt",
//             items: 1,
//           },
//         },
//         {
//           $sort: { createdAt: -1 },
//         },
//       ]);

//       if (requestData.length > 0) {
//         sendResponse(res, 200, true, requestData, "Dispatch note data list");
//       } else {
//         sendResponse(res, 200, true, [], "Dispatch note data not found");
//       }
//     } catch (error) {
//       console.log(error);
//       sendResponse(res, 500, false, {}, "Something went wrong");
//     }
//   } else {
//     sendResponse(res, 401, false, {}, "Unauthorized");
//   }
// };


exports.getMultiDispatchNote = async (req, res) => {
  const {
    project_id,
    paint_system_id,
    report_no,
    dispatch_site,
    selectedProcedures,
    page,
    limit,
    search, // 🔍 Search param
  } = req.body;

  console.log("req.body", req.body);

  if (req.user && !req.error) {
    try {
      let matchObj = {};

      if (paint_system_id && ObjectId.isValid(paint_system_id)) {
        matchObj["paintDetails._id"] = new ObjectId(paint_system_id);
      }

      if (report_no) {
        matchObj["report_no"] = report_no;
      }

      if (dispatch_site) {
        matchObj["dispatch_site"] = dispatch_site;
      }

      if (selectedProcedures) {
        matchObj["selectedProcedures"] = selectedProcedures;
      }

      if (!project_id || !ObjectId.isValid(project_id)) {
        return sendResponse(res, 400, false, {}, "Invalid project_id");
      }

      // Pagination
      const shouldPaginate = page && limit;
      const parsedPage = parseInt(page) || 1;
      const parsedLimit = parseInt(limit) || 10;
      const skip = (parsedPage - 1) * parsedLimit;

      let aggregationPipeline = [
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
          $lookup: {
            from: "users",
            localField: "prepared_by",
            foreignField: "_id",
            as: "preparedDetails",
          },
        },

        {
          $lookup: {
            from: "painting-systems",
            localField: "items.paint_system",
            foreignField: "_id",
            as: "paintDetails",
          },
        },

        {
          $addFields: {
            drawingDetails: { $arrayElemAt: ["$drawingDetails", 0] },
            gridDetails: { $arrayElemAt: ["$gridDetails", 0] },
            preparedDetails: { $arrayElemAt: ["$preparedDetails", 0] },
            paintDetails: { $arrayElemAt: ["$paintDetails", 0] },
          },
        },

        {
          $addFields: {
            projectDetails: { $arrayElemAt: ["$drawingDetails.projectDetails", 0] },
            clientDetails: {
              $arrayElemAt: ["$drawingDetails.projectDetails.0.clientDetails", 0],
            },
          },
        },

        {
          $match: {
            "projectDetails._id": new ObjectId(project_id),
            ...matchObj,
          },
        },
      ];

      // 🔍 Apply search on Lot No. & Assembly No.
      if (search && search.trim() !== "") {
        aggregationPipeline.push({
          $match: {
            $or: [
              { "report_no": { $regex: search, $options: "i" } },
              { "drawingDetails.assembly_no": { $regex: search, $options: "i" } },
            ],
          },
        });
      }

      aggregationPipeline.push(
        {
          $project: {
            _id: 1,
            report_no: 1,
            dispatch_date: 1,
            dispatch_site: 1,
            selectedProcedures: 1,
            prepared_by: "$preparedDetails.user_name",
            client: "$clientDetails.name",
            project_name: "$projectDetails.name",
            wo_no: "$projectDetails.work_order_no",
            project_po_no: "$projectDetails.work_order_no",
            createdAt: 1,
            isSurface: 1,
            isMio: 1,
            isFp: 1,
            isIrn: 1,
            items: {
              _id: "$items._id",
              main_id: "$_id",
              lot_no: "$items.lot_no", // ✅ Include Lot No.
              drawing_id: "$drawingDetails._id",
              drawing_no: "$drawingDetails.drawing_no",
              rev: "$drawingDetails.rev",
              unit_area: "$drawingDetails.unit",
              sheet_no: "$drawingDetails.sheet_no",
              assembly_no: "$drawingDetails.assembly_no",
              assembly_quantity: "$drawingDetails.assembly_quantity",
              grid_id: "$gridDetails._id",
              grid_no: "$gridDetails.grid_no",
              grid_qty: "$gridDetails.grid_qty",
              dn_grid_balance_qty: "$items.dispatch_balance_grid_qty",
              dn_grid_qty: "$items.dispatch_used_grid_qty",
              dn_move_qty: "$items.moved_next_step",
              ass_weight: "$items.ass_weight",
              ass_area: "$items.ass_area",
              paint_system_no: "$paintDetails.paint_system_no",
              paint_system_id: "$paintDetails._id",
              remarks: "$items.remarks",
            },
          },
        },

        {
          $group: {
            _id: {
              _id: "$_id",
              report_no: "$report_no",
              dispatch_date: "$dispatch_date",
              dispatch_site: "$dispatch_site",
              selectedProcedures: "$selectedProcedures",
              prepared_by: "$prepared_by",
              client: "$client",
              project_name: "$project_name",
              wo_no: "$wo_no",
              project_po_no: "$project_po_no",
              isSurface: "$isSurface",
              isMio: "$isMio",
              isFp: "$isFp",
              isIrn: "$isIrn",
              createdAt: "$createdAt",
            },
            items: { $push: "$items" },
          },
        },

        {
          $project: {
            _id: "$_id._id",
            report_no: "$_id.report_no",
            dispatch_date: "$_id.dispatch_date",
            dispatch_site: "$_id.dispatch_site",
            selectedProcedures: "$_id.selectedProcedures",
            prepared_by: "$_id.prepared_by",
            client: "$_id.client",
            project_name: "$_id.project_name",
            wo_no: "$_id.wo_no",
            project_po_no: "$_id.project_po_no",
            isSurface: "$_id.isSurface",
            isMio: "$_id.isMio",
            isFp: "$_id.isFp",
            isIrn: "$_id.isIrn",
            createdAt: "$_id.createdAt",
            items: 1,
          },
        },

        { $sort: { createdAt: -1 } }
      );

      if (shouldPaginate) {
        aggregationPipeline.push({
          $facet: {
            data: [{ $skip: skip }, { $limit: parsedLimit }],
            totalCount: [{ $count: "count" }],
          },
        });
      } else {
        aggregationPipeline.push({
          $facet: {
            data: [],
            totalCount: [{ $count: "count" }],
          },
        });
      }

      const requestData = await DispatchNote.aggregate(aggregationPipeline);

      const resultData = requestData[0]?.data || [];
      const totalItems =
        requestData[0]?.totalCount[0]?.count || resultData.length;

      return sendResponse(
        res,
        200,
        true,
        {
          data: resultData,
          pagination: shouldPaginate
            ? {
                total: totalItems,
                currentPage: parsedPage,
                limit: parsedLimit,
              }
            : {
                total: totalItems,
              },
        },
        "Dispatch note data list"
      );
    } catch (error) {
      console.error("Error in getMultiDispatchNote:", error);
      return sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }
};


// exports.getMultiDispatchNote = async (req, res) => {
//   const {
//     project_id,
//     paint_system_id,
//     report_no,
//     dispatch_site,
//     selectedProcedures,
//     page,
//     limit,
//   } = req.body;

//   console.log('req.body', req.body);

//   if (req.user && !req.error) {
//     try {
//       let matchObj = {};

//       if (paint_system_id && ObjectId.isValid(paint_system_id)) {
//         matchObj["paintDetails._id"] = new ObjectId(paint_system_id);
//       }

//       if (report_no) {
//         matchObj["report_no"] = report_no;
//       }

//       if (dispatch_site) {
//         matchObj["dispatch_site"] = dispatch_site;
//       }

//       if (selectedProcedures) {
//         matchObj["selectedProcedures"] = selectedProcedures;
//       }

//       if (!project_id || !ObjectId.isValid(project_id)) {
//         return sendResponse(res, 400, false, {}, "Invalid project_id");
//       }

//       // Determine if pagination is requested
//       const shouldPaginate = page && limit;
//       const parsedPage = parseInt(page) || 1;
//       const parsedLimit = parseInt(limit) || 10;
//       const skip = (parsedPage - 1) * parsedLimit;

//       let aggregationPipeline = [
//         { $unwind: "$items" },

//         {
//           $lookup: {
//             from: "erp-planner-drawings",
//             localField: "items.drawing_id",
//             foreignField: "_id",
//             as: "drawingDetails",
//             pipeline: [
//               {
//                 $lookup: {
//                   from: "bussiness-projects",
//                   localField: "project",
//                   foreignField: "_id",
//                   as: "projectDetails",
//                   pipeline: [
//                     {
//                       $lookup: {
//                         from: "store-parties",
//                         localField: "party",
//                         foreignField: "_id",
//                         as: "clientDetails",
//                       },
//                     },
//                   ],
//                 },
//               },
//             ],
//           },
//         },

//         {
//           $lookup: {
//             from: "erp-drawing-grids",
//             localField: "items.grid_id",
//             foreignField: "_id",
//             as: "gridDetails",
//           },
//         },

//         {
//           $lookup: {
//             from: "users",
//             localField: "prepared_by",
//             foreignField: "_id",
//             as: "preparedDetails",
//           },
//         },

//         {
//           $lookup: {
//             from: "painting-systems",
//             localField: "items.paint_system",
//             foreignField: "_id",
//             as: "paintDetails",
//           },
//         },

//         {
//           $addFields: {
//             drawingDetails: { $arrayElemAt: ["$drawingDetails", 0] },
//             gridDetails: { $arrayElemAt: ["$gridDetails", 0] },
//             preparedDetails: { $arrayElemAt: ["$preparedDetails", 0] },
//             paintDetails: { $arrayElemAt: ["$paintDetails", 0] },
//           },
//         },

//         {
//           $addFields: {
//             projectDetails: { $arrayElemAt: ["$drawingDetails.projectDetails", 0] },
//             clientDetails: {
//               $arrayElemAt: ["$drawingDetails.projectDetails.0.clientDetails", 0],
//             },
//           },
//         },

//         {
//           $match: {
//             "projectDetails._id": new ObjectId(project_id),
//             ...matchObj,
//           },
//         },

//         {
//           $project: {
//             _id: 1,
//             report_no: 1,
//             dispatch_date: 1,
//             dispatch_site: 1,
//             selectedProcedures: 1,
//             prepared_by: "$preparedDetails.user_name",
//             client: "$clientDetails.name",
//             project_name: "$projectDetails.name",
//             wo_no: "$projectDetails.work_order_no",
//             project_po_no: "$projectDetails.work_order_no",
//             createdAt: 1,
//             isSurface: 1,
//             isMio: 1,
//             isFp: 1,
//             isIrn: 1,
//             items: {
//               _id: "$items._id",
//               main_id: "$_id",
//               drawing_id: "$drawingDetails._id",
//               drawing_no: "$drawingDetails.drawing_no",
//               rev: "$drawingDetails.rev",
//               unit_area: "$drawingDetails.unit",
//               sheet_no: "$drawingDetails.sheet_no",
//               assembly_no: "$drawingDetails.assembly_no",
//               assembly_quantity: "$drawingDetails.assembly_quantity",
//               grid_id: "$gridDetails._id",
//               grid_no: "$gridDetails.grid_no",
//               grid_qty: "$gridDetails.grid_qty",
//               dn_grid_balance_qty: "$items.dispatch_balance_grid_qty",
//               dn_grid_qty: "$items.dispatch_used_grid_qty",
//               dn_move_qty: "$items.moved_next_step",
//               ass_weight: "$items.ass_weight",
//               ass_area: "$items.ass_area",
//               paint_system_no: "$paintDetails.paint_system_no",
//               paint_system_id: "$paintDetails._id",
//               remarks: "$items.remarks",
//             },
//           },
//         },

//         {
//           $group: {
//             _id: {
//               _id: "$_id",
//               report_no: "$report_no",
//               dispatch_date: "$dispatch_date",
//               dispatch_site: "$dispatch_site",
//               selectedProcedures: "$selectedProcedures",
//               prepared_by: "$prepared_by",
//               client: "$client",
//               project_name: "$project_name",
//               wo_no: "$wo_no",
//               project_po_no: "$project_po_no",
//               isSurface: "$isSurface",
//               isMio: "$isMio",
//               isFp: "$isFp",
//               isIrn: "$isIrn",
//               createdAt: "$createdAt",
//             },
//             items: { $push: "$items" },
//           },
//         },

//         {
//           $project: {
//             _id: "$_id._id",
//             report_no: "$_id.report_no",
//             dispatch_date: "$_id.dispatch_date",
//             dispatch_site: "$_id.dispatch_site",
//             selectedProcedures: "$_id.selectedProcedures",
//             prepared_by: "$_id.prepared_by",
//             client: "$_id.client",
//             project_name: "$_id.project_name",
//             wo_no: "$_id.wo_no",
//             project_po_no: "$_id.project_po_no",
//             isSurface: "$_id.isSurface",
//             isMio: "$_id.isMio",
//             isFp: "$_id.isFp",
//             isIrn: "$_id.isIrn",
//             createdAt: "$_id.createdAt",
//             items: 1,
//           },
//         },

//         { $sort: { createdAt: -1 } },
//       ];

//       // Handle pagination dynamically
//       if (shouldPaginate) {
//         aggregationPipeline.push({
//           $facet: {
//             data: [{ $skip: skip }, { $limit: parsedLimit }],
//             totalCount: [{ $count: "count" }],
//           },
//         });
//       } else {
//         aggregationPipeline.push({
//           $facet: {
//             data: [], // No pagination, return all data
//             totalCount: [{ $count: "count" }],
//           },
//         });
//       }

//       const requestData = await DispatchNote.aggregate(aggregationPipeline);

//       const resultData = requestData[0]?.data || [];
//       const totalItems = requestData[0]?.totalCount[0]?.count || resultData.length;

//       return sendResponse(
//         res,
//         200,
//         true,
//         {
//           data: resultData,
//           pagination: shouldPaginate
//             ? {
//                 total: totalItems,
//                 currentPage: parsedPage,
//                 limit: parsedLimit,
//               }
//             : {
//                 total: totalItems,
//               },
//         },
//         "Dispatch note data list"
//       );
//     } catch (error) {
//       console.error("Error in getMultiDispatchNote:", error);
//       return sendResponse(res, 500, false, {}, "Something went wrong");
//     }
//   } else {
//     return sendResponse(res, 401, false, {}, "Unauthorized");
//   }
// };


const getOneDispatch = async (report_no) => {
  try {
    let matchObj = { deleted: false, report_no: report_no };

    const requestData = await DispatchNote.aggregate([
      { $match: matchObj },
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
        $lookup: {
          from: "users",
          localField: "prepared_by",
          foreignField: "_id",
          as: "preparedDetails",
        },
      },
      {
        $lookup: {
          from: "painting-systems",
          localField: "items.paint_system",
          foreignField: "_id",
          as: "paintDetails",
          pipeline: [
            {
              $lookup: {
                from: "paint-manufactures",
                localField: "paint_manufacturer",
                foreignField: "_id",
                as: "paintManDetails",
              },
            },
          ],
        },
      },
      // {
      //     $lookup: {
      //         from: "painting-systems",
      //         localField: "items.paint_system",
      //         foreignField: "_id",
      //         as: "paintDetails",
      //     },
      // },
      {
        $addFields: {
          drawingDetails: { $arrayElemAt: ["$drawingDetails", 0] },
          gridDetails: { $arrayElemAt: ["$gridDetails", 0] },
          preparedDetails: { $arrayElemAt: ["$preparedDetails", 0] },
          paintDetails: { $arrayElemAt: ["$paintDetails", 0] },
        },
      },
      {
        $addFields: {
          projectDetails: {
            $arrayElemAt: ["$drawingDetails.projectDetails", 0],
          },
          paintManDetails: {
            $arrayElemAt: ["$paintDetails.paintManDetails", 0],
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
          report_no: "$report_no",
          dispatch_date: "$dispatch_date",
          dispatch_site: "$dispatch_site",
          prepared_by: "$preparedDetails.user_name",
          client: "$clientDetails.name",
          project_name: "$projectDetails.name",
          wo_no: "$projectDetails.work_order_no",
          project_po_no: "$projectDetails.work_order_no",
          paint_system_no: "$paintDetails.paint_system_no",
          paint_system_id: "$paintDetails._id",
          paint_surface_preparation: "$paintDetails.surface_preparation",
          paint_profile_requirement: "$paintDetails.profile_requirement",
          paint_salt_test: "$paintDetails.salt_test",
          paint_prime_paint: "$paintDetails.prime_paint",
          paint_primer_app_method: "$paintDetails.primer_app_method",
          paint_primer_dft_range: "$paintDetails.primer_dft_range",
          paint_mio_paint: "$paintDetails.mio_paint",
          paint_mio_app_method: "$paintDetails.mio_app_method",
          paint_mio_dft_range: "$paintDetails.mio_dft_range",
          paint_final_paint: "$paintDetails.final_paint",
          paint_final_paint_app_method: "$paintDetails.final_paint_app_method",
          paint_final_paint_dft_range: "$paintDetails.final_paint_dft_range",
          paint_total_dft_requirement: "$paintDetails.total_dft_requirement",
          paintman_name: "$paintManDetails.name",
          items: {
            _id: "$items._id",
            drawing_id: "$drawingDetails._id",
            drawing_no: "$drawingDetails.drawing_no",
            rev: "$drawingDetails.rev",
            sheet_no: "$drawingDetails.sheet_no",
            assembly_no: "$drawingDetails.assembly_no",
            assembly_quantity: "$drawingDetails.assembly_quantity",
            grid_id: "$gridDetails._id",
            grid_no: "$gridDetails.grid_no",
            grid_qty: "$gridDetails.grid_qty",
            dn_grid_balance_qty: "$items.dispatch_balance_grid_qty",
            dn_grid_qty: "$items.dispatch_used_grid_qty",
            dn_move_qty: "$items.moved_next_step",
            ass_weight: "$items.ass_weight",
            ass_area: "$items.ass_area",
            paint_system_no: "$paintDetails.paint_system_no",
            remarks: "$items.remarks",
          },
        },
      },
      {
        $group: {
          _id: {
            _id: "$_id",
            report_no: "$report_no",
            dispatch_date: "$dispatch_date",
            dispatch_site: "$dispatch_site",
            prepared_by: "$prepared_by",
            client: "$client",
            project_name: "$project_name",
            wo_no: "$wo_no",
            project_po_no: "$project_po_no",
            paint_system_no: "$paint_system_no",
            paint_system_id: "$paint_system_id",
            paint_surface_preparation: "$paint_surface_preparation",
            paint_profile_requirement: "$paint_profile_requirement",
            paint_salt_test: "$paint_salt_test",
            paint_prime_paint: "$paint_prime_paint",
            paint_primer_app_method: "$paint_primer_app_method",
            paint_primer_dft_range: "$paint_primer_dft_range",
            paint_mio_paint: "$paint_mio_paint",
            paint_mio_app_method: "$paint_mio_app_method",
            paint_mio_dft_range: "$paint_mio_dft_range",
            paint_final_paint: "$paint_final_paint",
            paint_final_paint_app_method: "$paint_final_paint_app_method",
            paint_final_paint_dft_range: "$paint_final_paint_dft_range",
            paint_total_dft_requirement: "$paint_total_dft_requirement",
            paintman_name: "$paintman_name",
          },
          items: { $push: "$items" },
        },
      },
      {
        $project: {
          _id: "$_id._id",
          report_no: "$_id.report_no",
          dispatch_date: "$_id.dispatch_date",
          dispatch_site: "$_id.dispatch_site",
          prepared_by: "$_id.prepared_by",
          client: "$_id.client",
          project_name: "$_id.project_name",
          wo_no: "$_id.wo_no",
          project_po_no: "$_id.project_po_no",
          paint_system_no: "$_id.paint_system_no",
          paint_system_id: "$_id.paint_system_id",
          paint_surface_preparation: "$_id.paint_surface_preparation",
          paint_profile_requirement: "$_id.paint_profile_requirement",
          paint_salt_test: "$_id.paint_salt_test",
          paint_prime_paint: "$_id.paint_prime_paint",
          paint_primer_app_method: "$_id.paint_primer_app_method",
          paint_primer_dft_range: "$_id.paint_primer_dft_range",
          paint_mio_paint: "$_id.paint_mio_paint",
          paint_mio_app_method: "$_id.paint_mio_app_method",
          paint_mio_dft_range: "$_id.paint_mio_dft_range",
          paint_final_paint: "$_id.paint_final_paint",
          paint_final_paint_app_method: "$_id.paint_final_paint_app_method",
          paint_final_paint_dft_range: "$_id.paint_final_paint_dft_range",
          paint_total_dft_requirement: "$_id.paint_total_dft_requirement",
          paintman_name: "$_id.paintman_name",
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

exports.oneDispatchNote = async (req, res) => {
  const { report_no } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await getOneDispatch(report_no);
      let requestData = data.result;

      if (data.status === 1) {
        sendResponse(res, 200, true, requestData, "Dispatch note data found");
      } else if (data.status === 0) {
        sendResponse(res, 200, false, [], `Dispatch note data not found`);
      } else if (data.status === 2) {
        console.log("error", data.result);
        sendResponse(res, 500, false, {}, "Something went wrong11");
      }
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.downloadOneMultiDispatch = async (req, res) => {
  const { report_no, print_date } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await getOneDispatch(report_no);
      let requestData = data.result[0];

      if (data.status === 1) {
        let headerInfo = {
          report_no: requestData?.report_no,
          dispatch_date: requestData?.dispatch_date,
          dispatch_site: requestData?.dispatch_site,
          prepared_by: requestData?.prepared_by,
          client: requestData?.client,
          project_name: requestData?.project_name,
          wo_no: requestData?.wo_no,
          project_po_no: requestData?.project_po_no,
          paint_system_no: requestData?.paint_system_no,
          paint_system_id: requestData?.paint_system_id,
          paint_surface_preparation: requestData?.paint_surface_preparation,
          paint_profile_requirement: requestData?.paint_profile_requirement,
          paint_salt_test: requestData?.paint_salt_test,
          paint_prime_paint: requestData?.paint_prime_paint,
          paint_primer_app_method: requestData?.paint_primer_app_method,
          paint_primer_dft_range: requestData?.paint_primer_dft_range,
          paint_mio_paint: requestData?.paint_mio_paint,
          paint_mio_app_method: requestData?.paint_mio_app_method,
          paint_mio_dft_range: requestData?.paint_mio_dft_range,
          paint_final_paint: requestData?.paint_final_paint,
          paint_final_paint_app_method:
            requestData?.paint_final_paint_app_method,
          paint_final_paint_dft_range: requestData?.paint_final_paint_dft_range,
          paint_total_dft_requirement: requestData?.paint_total_dft_requirement,
          paintman_name: requestData?.paintman_name,
        };
        const template = fs.readFileSync(
          "templates/multiDispatchNote.html",
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

        const pdfBuffer = await generatePDF(page, { print_date });

        await browser.close();

        const pdfsDir = path.join(__dirname, "../../../../pdfs");
        if (!fs.existsSync(pdfsDir)) {
          fs.mkdirSync(pdfsDir);
        }

        const filename = `dispatch_note_${Date.now()}.pdf`;
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
        sendResponse(res, 200, false, {}, `Dispatch note data not found`);
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
