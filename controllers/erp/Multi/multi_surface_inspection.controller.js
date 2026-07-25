const { sendResponse } = require("../../../helper/response");
const SurfaceInspection = require("../../../models/erp/Multi/multi_surface_inspection.model");
const SurfaceOfferTable = require("../../../models/erp/Multi/offer_table_data/Paint/surface_offer_table.model");
const { TitleFormat } = require("../../../utils/enum");
const { default: mongoose } = require("mongoose");
const {
  Types: { ObjectId },
} = require("mongoose");
const DispatchNote = require("../../../models/erp/Multi/dispatch_note/multi_dispatch_note.model");
const {
  generatePDF,
  generatePDFA4,
  generatePDFA4WithoutPrintDate,
} = require("../../../utils/pdfUtils");
const ejs = require("ejs");
const fs = require("fs");
const XLSX = require("xlsx"); // for utility functions
const XLSXStyle = require("xlsx-style"); // for styling
const puppeteer = require("puppeteer");
const path = require("path");
const URI = process.env.PDF_URL;
const PATH = process.env.PDF_PATH;
// const { addReleaseNote } = require("../../release_note/multi_release_note.controller");
const { addSurfaceReleaseNote} = require("../../../controllers/erp/Multi/release_note/multi_release_note.controller");
const User = require("../../../models/users.model");
const ErpRole = require("../../../models/erp/erp_role.model");
const Project = require("../../../models/project.model");
const addEmailJob = require("../../../utils/emailJob");
const sendEmail = require("../../../utils/sendEmail");
const commonStageOfferEmail = require("../../../utils/commonStageOfferEmail");
const commonStageAcceptanceEmail = require("../../../utils/commonStageAcceptanceEmail");

exports.generateSurfaceOffer = async (req, res) => {
  const {
    procedure_no,
    weather_condition,
    original_status,
    metal_condition,
    metal_rust_grade,
    paint_system_id,
    blasting_date,
    blasting_method,
    abrasive_type,
    dust_level,
    primer_date,
    time,
    paint_batch_base,
    manufacture_date,
    shelf_life,
    paint_batch_hardner,
    items,
    offered_by,
    offer_notes,
    start_time,
    end_time,
    project,
    project_id,
  } = req.body;

  // console.log('project_id: ', req.body);

const isIrn = req.body.isIrn === 'true' || req.body.isIrn === true;
const isSurface = req.body.isSurface === 'true' || req.body.isSurface === true;

  const itemArray = JSON.parse(items);
  const weatherCondition =
    typeof weather_condition !== "undefined" && weather_condition !== null
      ? JSON.parse(weather_condition)
      : [];
  // const itemArray = items;
  // const weatherCondition = weather_condition.length > 0 ? weather_condition : [];

  if (!req.user || req.error) {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }

  if (
    !paint_system_id ||
    !procedure_no ||
    !offered_by ||
    !project ||
    itemArray.length === 0
  ) {
    sendResponse(res, 400, false, {}, "Missing parameters!");
  }

  try {
    let lastOffer = await SurfaceInspection.findOne(
      { deleted: false, report_no: { $regex: `/${project}/` } },
      { deleted: 0 },
      { sort: { createdAt: -1 } }
    );
    let newOfferNo = "1";
    if (lastOffer && lastOffer.report_no) {
      const split = lastOffer.report_no.split("/");
      const lastOfferNo = parseInt(split[split.length - 1]);
      newOfferNo = lastOfferNo + 1;
    }
    const gen_voucher_no =
      TitleFormat.SURFACEOFFERNO.replace("/PROJECT/", `/${project}/`) +
      newOfferNo;

      console.log("Start submitting")

    const addSurfaceIoffer = await SurfaceInspection.create({
      report_no: gen_voucher_no,
      project_id,
      offer_date: Date.now(),
      weather_condition: weatherCondition,
      procedure_no,
      original_status,
      metal_condition,
      metal_rust_grade,
      paint_system_id,
      blasting_date,
      blasting_method,
      abrasive_type,
      dust_level,
      primer_date,
      time,
      paint_batch_base,
      manufacture_date,
      shelf_life,
      paint_batch_hardner,
      offered_by,
      offer_notes,
      start_time,
      end_time,
      isIrn,
      isSurface,
      items: itemArray,
    });

    console.log("addSurfaceIoffer",addSurfaceIoffer)

    if (addSurfaceIoffer) {
      // for (const item of itemArray) {
      //   const { surface_offer_id } = item;
      //   const deleteSurfaceOffer = await SurfaceOfferTable.deleteOne({
      //     _id: new ObjectId(surface_offer_id),
      //   });
      // }
for (const item of itemArray) {
  // Use surface_offer_id if available, otherwise fallback to item._id
  const surfaceOfferId = item.surface_offer_id || item._id;

  if (surfaceOfferId && ObjectId.isValid(surfaceOfferId)) {
    await SurfaceOfferTable.deleteOne({ _id: new ObjectId(surfaceOfferId) });
  } else {
    console.warn("Invalid or missing surfaceOfferId for item:", item);
  }
}  

/* ---------------- SURFACE OFFER EMAIL NOTIFICATION ---------------- */

try {

  // Offered user details
  const offeredUser = await User.findById(offered_by);

  // Project details
  const projectDetails = await Project.findById(project_id);

  // Send to QC Engineer
  const roles = await ErpRole.find({
    deleted: false,
    name: {
      $in: ["QC Engineer"]
    }
  });

  const roleIds = roles.map(role => role._id);

  const users = await User.find({
    deleted: false,
    status: true,
    structureRole: { $in: roleIds },
    email: { $exists: true, $ne: "" }
  });

  console.log("QC Engineers:", users.length);

  const offerDateTime = addSurfaceIoffer?.createdAt
    ? new Date(addSurfaceIoffer.createdAt)
        .toLocaleString("en-IN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true
        })
        .replace("am", "AM")
        .replace("pm", "PM")
    : "-";

  for (const user of users) {

    try {

      const html = commonStageOfferEmail({

        userName: user?.user_name || "-",

        module: "Structural",

        stageName:"Surface Offer Inspection",
        

        offerNo:
          addSurfaceIoffer?.report_no || "-",

        projectName:
          projectDetails?.name || project || "-",

        workOrderNo:
          projectDetails?.work_order_no || "-",

        createdBy:
          offeredUser?.user_name || "-",

        offerDateTime,

        remarks:`Surface Offer Inspection offer has been generated by ${offeredUser?.user_name} and is ready for QC verification.`,
       

        loginUrl: process.env.ERP_URL

      });

      // await sendEmail({
      //   to: user.email,
      //   subject: `${isSurface ? "Stock Surface Offer Inspection" : "Stock Primer Paint Offer Inspection"} - ${addSurfaceIoffer?.report_no}`,
      //   html
      // });
  addEmailJob({
        to: user.email,
        subject: `${"Surface Offer Inspection"} - ${addSurfaceIoffer?.report_no}`,
        html
      });
      console.log(
        `Surface offer mail sent -> ${user.email}`
      );

    } catch (mailErr) {

      console.log(
        `Mail failed for ${user.email}`,
        mailErr.message
      );

    }

  }

} catch (emailErr) {

  console.log(
    "SURFACE EMAIL ERROR:",
    emailErr
  );

}
      sendResponse(
        res,
        200,
        true,
        addSurfaceIoffer,
        "Surface/Primer Paint added successfully"
      );
    } else {
      sendResponse(res, 400, false, {}, "Surface/Primer Paint not added");
    }
  } catch (error) {
    sendResponse(res, 500, false, {}, "Something went wrong");
  }
};

exports.getMultiSurfaceInspectionOffer = async (req, res) => {
  const {
    project_id,
    paint_system_id,
    report_no,
    dispatch_site,
    is_accepted,
    search,
    page,
    limit,
  } = req.body;

  if (!req.user || req.error) {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }

  try {
    let matchObj = {};

    if (paint_system_id) {
      matchObj["paintDetails._id"] = new ObjectId(paint_system_id);
    }
    if (report_no) {
      matchObj["dispatchDetails.report_no"] = report_no;
    }
    if (dispatch_site) {
      matchObj["dispatchDetails.dispatch_site"] = dispatch_site;
    }
    if (is_accepted) {
      let acce = JSON.parse(is_accepted);
      matchObj["items.is_accepted"] = acce;
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const doPagination = pageNum > 0 && limitNum > 0;
    const skipNum = doPagination ? (pageNum - 1) * limitNum : 0;

    let pipeline = [
      { $match: { deleted: false } },
      { $unwind: "$items" },

      // --- Lookups ---
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
          from: "procedure_and_specifications",
          localField: "procedure_no",
          foreignField: "_id",
          as: "procedureDetails",
        },
      },
      {
        $lookup: {
          from: "painting-systems",
          localField: "paint_system_id",
          foreignField: "_id",
          as: "paintDetails",
        },
      },
      {
        $lookup: {
          from: "multi-erp-painting-dispatch-notes",
          localField: "items.main_id",
          foreignField: "_id",
          as: "dispatchDetails",
        },
      },

      // --- Flatten lookups ---
      {
        $addFields: {
          drawingDetails: { $arrayElemAt: ["$drawingDetails", 0] },
          gridDetails: { $arrayElemAt: ["$gridDetails", 0] },
          offerDetails: { $arrayElemAt: ["$offerDetails", 0] },
          qcDetails: { $arrayElemAt: ["$qcDetails", 0] },
          procedureDetails: { $arrayElemAt: ["$procedureDetails", 0] },
          paintDetails: { $arrayElemAt: ["$paintDetails", 0] },
          dispatchDetails: { $arrayElemAt: ["$dispatchDetails", 0] },
        },
      },
      {
        $addFields: {
          projectDetails: {
            $arrayElemAt: ["$drawingDetails.projectDetails", 0],
          },
          clientDetails: {
            $arrayElemAt: ["$drawingDetails.projectDetails.clientDetails", 0],
          },
        },
      },

      // --- Filters ---
      { $match: { "projectDetails._id": new ObjectId(project_id) } },
      { $match: matchObj },

      // --- Project with dispatch details per item ---
      {
        $project: {
          _id: 1,
          report_no: 1,
          report_no_two: 1,
          offer_date: 1,
          qc_date: 1,
          original_status: 1,
          weather_condition: 1,
          blasting_date: 1,
          blasting_method: 1,
          abrasive_type: 1,
          dust_level: 1,
          primer_date: 1,
          time: 1,
          paint_batch_base: 1,
          manufacture_date: 1,
          shelf_life: 1,
          paint_batch_hardner: 1,
          actual_surface_profile: 1,
          salt_test_reading: 1,
          offer_notes: 1,
          qc_notes: 1,
          status: 1,
          start_time: 1,
          end_time: 1,
          createdAt: 1,
          isMIO:1,
          isIrn:1,
          procedure_id: "$procedureDetails._id",
          procedure_no: "$procedureDetails.vendor_doc_no",
          offer_name: "$offerDetails.user_name",
          qc_name: "$qcDetails.user_name",
          paint_system_no: "$paintDetails.paint_system_no",
          paint_system_id: "$paintDetails._id",
              metal_condition: "$metal_condition",
                                       metal_rust_grade: "$metal_rust_grade",
          client: "$clientDetails.name",
          project_name: "$projectDetails.name",
          wo_no: "$projectDetails.work_order_no",
          project_po_no: "$projectDetails.work_order_no",

          items: {
            _id: "$items._id",
            main_id: "$_id",
            drawing_id: "$drawingDetails._id",
            drawing_no: "$drawingDetails.drawing_no",
            rev: "$drawingDetails.rev",
            sheet_no: "$drawingDetails.sheet_no",
            assembly_no: "$drawingDetails.assembly_no",
            assembly_quantity: "$drawingDetails.assembly_quantity",
            grid_id: "$gridDetails._id",
            grid_no: "$gridDetails.grid_no",
            grid_qty: "$gridDetails.grid_qty",
            // item_name: "$items.item_name",
            // drawing_no: "$items.drawing_no",
            // grid_no: "$items.grid_no",
            // dispatch_no: "$items.dispatch_no",
            
            //  Dispatch details bound correctly
            dispatch_id: "$dispatchDetails._id",
            dispatch_report: "$dispatchDetails.report_no",
            dispatch_site: "$dispatchDetails.dispatch_site",
            // isSurface: "$dispatchDetails.isSurface",
            // isMio: "$dispatchDetails.isMio",
            // isFp: "$dispatchDetails.isFp",
            // isIrn: "$dispatchDetails.isIrn",

            surface_balance_grid_qty: "$items.surface_balance_grid_qty",
            surface_used_grid_qty: "$items.surface_used_grid_qty",
            moved_next_step: "$items.moved_next_step",
            average_dft_primer: "$items.average_dft_primer",
            is_accepted: "$items.is_accepted",
            remarks: "$items.remarks",
          },

          
        },
      },

      // --- Group back by report ---
      {
        $group: {
          _id: {
            _id: "$_id",
            report_no: "$report_no",
            report_no_two: "$report_no_two",
            offer_date: "$offer_date",
            qc_date: "$qc_date",
            original_status: "$original_status",
            weather_condition: "$weather_condition",
            blasting_date: "$blasting_date",
            blasting_method: "$blasting_method",
            abrasive_type: "$abrasive_type",
            dust_level: "$dust_level",
            primer_date: "$primer_date",
            time: "$time",
            paint_batch_base: "$paint_batch_base",
            manufacture_date: "$manufacture_date",
            metal_condition: "$metal_condition",
            metal_rust_grade: "$metal_rust_grade",
            shelf_life: "$shelf_life",
            paint_batch_hardner: "$paint_batch_hardner",
            actual_surface_profile: "$actual_surface_profile",
            salt_test_reading: "$salt_test_reading",
            offer_notes: "$offer_notes",
            qc_notes: "$qc_notes",
            status: "$status",
            start_time: "$start_time",
            end_time: "$end_time",
            createdAt: "$createdAt",

            procedure_id: "$procedure_id",
            procedure_no: "$procedure_no",
            offer_name: "$offer_name",
            qc_name: "$qc_name",
            paint_system_no: "$paint_system_no",
            paint_system_id: "$paint_system_id",
            client: "$client",
            project_name: "$project_name",
            wo_no: "$wo_no",
            project_po_no: "$project_po_no",
            isMIO: "$isMIO",
            isIrn: "$isIrn",
          },
          items: { $push: "$items" },
        },
      },
      {
        $project: {
          _id: "$_id._id",
          report_no: "$_id.report_no",
          report_no_two: "$_id.report_no_two",
          offer_date: "$_id.offer_date",
          qc_date: "$_id.qc_date",
          original_status: "$_id.original_status",
          weather_condition: "$_id.weather_condition",
          blasting_date: "$_id.blasting_date",
          blasting_method: "$_id.blasting_method",
          abrasive_type: "$_id.abrasive_type",
          dust_level: "$_id.dust_level",
          primer_date: "$_id.primer_date",
          time: "$_id.time",
          paint_batch_base: "$_id.paint_batch_base",
          manufacture_date: "$_id.manufacture_date",
          metal_condition: "$_id.metal_condition",
          metal_rust_grade: "$_id.metal_rust_grade",
          shelf_life: "$_id.shelf_life",
          paint_batch_hardner: "$_id.paint_batch_hardner",
          actual_surface_profile: "$_id.actual_surface_profile",
          salt_test_reading: "$_id.salt_test_reading",
          offer_notes: "$_id.offer_notes",
          qc_notes: "$_id.qc_notes",
          status: "$_id.status",
          start_time: "$_id.start_time",
          end_time: "$_id.end_time",
          createdAt: "$_id.createdAt",

          procedure_id: "$_id.procedure_id",
          procedure_no: "$_id.procedure_no",
          offer_name: "$_id.offer_name",
          qc_name: "$_id.qc_name",
          paint_system_no: "$_id.paint_system_no",
          paint_system_id: "$_id.paint_system_id",
          client: "$_id.client",
          project_name: "$_id.project_name",
          wo_no: "$_id.wo_no",
          project_po_no: "$_id.project_po_no",
          isIRN: "$_id.isIrn",
          isMIO: "$_id.isMIO",

          items: 1,
        },
      }
    ];

    // --- Search filter ---
    if (search && search.trim() !== "") {
      const searchRegex = new RegExp(search.trim(), "i");
      pipeline.splice(pipeline.length - 0, 0, {
        $match: {
          $or: [
            { offer_name: searchRegex },
            { procedure_no: searchRegex },
            { report_no: searchRegex },
            { report_no_two: searchRegex },
            { "items.dispatch_report": searchRegex },
          ],
        },
      });
    }

    // --- Sort ---
    pipeline.push({ $sort: { createdAt: -1 } });

    // --- Count total ---
    const countPipeline = [...pipeline];
    // Remove $skip and $limit for count if pagination is enabled
    if (doPagination) {
      // Remove any skip/limit from countPipeline, but none added yet, so safe here
    }
    countPipeline.push({ $count: "total" });
    const countResult = await SurfaceInspection.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // --- Pagination ---
    if (doPagination) {
      pipeline.push({ $skip: skipNum });
      pipeline.push({ $limit: limitNum });
    }

    const requestData = await SurfaceInspection.aggregate(pipeline);

    sendResponse(res, 200, true, {
      data: requestData,
      pagination: {
        total,
        page: doPagination ? pageNum : 1,
        limit: doPagination ? limitNum : total,
      },
    }, "Surface data list");
  } catch (error) {
    console.log("Error in getMultiSurfaceInspectionOffer:", error);
    sendResponse(res, 500, false, {}, "Something went wrong");
  }
};

exports.getMultiSurfaceInspectionOfferViewPage = async (req, res) => {
  const {
    project_id,
    paint_system_id,
    report_no,
    dispatch_site,
    is_accepted,
    search,
    page,
    limit,
  } = req.body;

  if (!req.user || req.error) {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }

  try {
    const matchObj = { deleted: false };
    if (paint_system_id) matchObj.paint_system_id = new ObjectId(paint_system_id);
    if (report_no) matchObj.report_no = report_no;
    if (is_accepted !== undefined) matchObj["items.is_accepted"] = JSON.parse(is_accepted);
 
    if (dispatch_site) {
      matchObj["dispatchDetails.dispatch_site"] = dispatch_site;
    }
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const doPagination = pageNum > 0 && limitNum > 0;
    const skipNum = doPagination ? (pageNum - 1) * limitNum : 0;

    const pipeline = [
      { $match: matchObj },

      // Optional: Filter based on project_id via drawing.project (deep lookup)
      {
        $lookup: {
          from: "erp-planner-drawings",
          localField: "items.drawing_id",
          foreignField: "_id",
          as: "drawingDocs"
        }
      },
      {
        $lookup: {
          from: "bussiness-projects",
          localField: "drawingDocs.project",
          foreignField: "_id",
          as: "projectDocs"
        }
      },
     ...(project_id
        ? [{
            $match: {
              $or: [
                { project_id: new ObjectId(project_id) },
                { "projectDocs._id": new ObjectId(project_id) }
              ]
            }
          }]
        : []
      ),


      // Lookups
      {
        $lookup: {
          from: "users",
          localField: "offered_by",
          foreignField: "_id",
          as: "offerDetails"
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "qc_name",
          foreignField: "_id",
          as: "qcDetails"
        }
      },
      {
        $lookup: {
          from: "painting-systems",
          localField: "paint_system_id",
          foreignField: "_id",
          as: "paintDetails"
        }
      },

      // Enrich items array individually
      {
        $unwind: {
          path: "$items",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "erp-planner-drawings",
          localField: "items.drawing_id",
          foreignField: "_id",
          as: "drawingDetails"
        }
      },
      {
        $lookup: {
          from: "erp-drawing-grids",
          localField: "items.grid_id",
          foreignField: "_id",
          as: "gridDetails"
        }
      },
      {
        $lookup: {
          from: "multi-erp-painting-dispatch-notes",
          localField: "items.main_id",
          foreignField: "_id",
          as: "dispatchDetails"
        }
      },
      {
  $lookup: {
    from: "procedure_and_specifications",
    localField: "procedure_no",
    foreignField: "_id",
    as: "procedureDetails"
  }
},

      {
        $addFields: {
          // "items.drawing_no": { $arrayElemAt: ["$drawingDetails.drawing_no", 0] },
           "items.drawing_no": {
      $cond: {
        if: { $ifNull: ["$items.drawing_no", false] },
        then: "$items.drawing_no",
        else: { $arrayElemAt: ["$drawingDetails.drawing_no", 0] }
      }
    },
           "items.assembly_no": { $arrayElemAt: ["$drawingDetails.assembly_no", 0] },
           "items.rev": { $arrayElemAt: ["$drawingDetails.rev", 0] },
          "items.assembly_quantity": { $arrayElemAt: ["$drawingDetails.assembly_quantity", 0] },
          // "items.grid_no": { $arrayElemAt: ["$gridDetails.grid_no", 0] },
              "items.grid_no": {
      $cond: {
        if: { $ifNull: ["$items.grid_no", false] },
        then: "$items.grid_no",
        else: { $arrayElemAt: ["$gridDetails.grid_no", 0] }
      }
    },
           "items.grid_qty": { $arrayElemAt: ["$gridDetails.grid_qty", 0] },
    //        "items.grid_qty": {
    //   $cond: {
    //     if: { $ifNull: ["$items.grid_qty", false] },
    //     then: "$items.grid_qty",
    //     else: { $arrayElemAt: ["$gridDetails.grid_qty", 0] }
    //   }
    // },
          "items.dispatch_report": { $arrayElemAt: ["$dispatchDetails.report_no", 0] },
          "items.dispatch_site": { $arrayElemAt: ["$dispatchDetails.dispatch_site", 0] }

        }
      },
      {
        $group: {
          _id: "$_id",
          doc: { $first: "$$ROOT" },
          items: { $push: "$items" }
        }
      },

      
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ["$doc", { items: "$items" }]
          }
        }
      },

      // Flatten offer, qc, paint system
      {
        $addFields: {
          offer_name: { $arrayElemAt: ["$offerDetails.user_name", 0] },
          qc_name: { $arrayElemAt: ["$qcDetails.user_name", 0] },
          paint_system_no: { $arrayElemAt: ["$paintDetails.paint_system_no", 0] },
           procedure_no: { $arrayElemAt: ["$procedureDetails.vendor_doc_no", 0] },
    procedure_id: { $arrayElemAt: ["$procedureDetails._id", 0] },
    procedure_revision: { $arrayElemAt: ["$procedureDetails.revision", 0] }
        }
      },




      // Search filter
      ...(search && search.trim()
        ? [{
            $match: {
              $or: [
                { offer_name: new RegExp(search.trim(), "i") },
                { report_no: new RegExp(search.trim(), "i") },
                { "items.dispatch_report": new RegExp(search.trim(), "i") },
              ]
            }
          }]
        : []),

      { $sort: { createdAt: -1 } }
    ];

    // Count
    const countPipeline = [...pipeline, { $count: "total" }];
    const countResult = await SurfaceInspection.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Pagination
    if (doPagination) {
      pipeline.push({ $skip: skipNum }, { $limit: limitNum });
    }

    const result = await SurfaceInspection.aggregate(pipeline);

    return sendResponse(res, 200, true, {
      data: result,
      pagination: {
        total,
        page: doPagination ? pageNum : 1,
        limit: doPagination ? limitNum : total,
      }
    }, "Surface inspections with items");
  } catch (error) {
    console.error("Error in getMultiSurfaceInspectionOffer:", error);
    return sendResponse(res, 500, false, {}, "Something went wrong");
  }
};

// exports.getMultiSurfaceInspectionOfferStatus = async (req, res) => {
//   const {
//     project_id,
//     paint_system_id,
//     report_no,
//     dispatch_site,
//     is_accepted,
//     search,
//     page,
//     limit,
//   } = req.body;

//   if (!req.user || req.error) {
//     return sendResponse(res, 401, false, {}, "Unauthorized");
//   }

//   try {
//     // let matchObj = {};
// let matchObj = {
//   status: { $ne: 1 } // status NOT EQUAL to 1
// };
//     if (paint_system_id) {
//       matchObj["paintDetails._id"] = new ObjectId(paint_system_id);
//     }
//     if (report_no) {
//       matchObj["dispatchDetails.report_no"] = report_no;
//     }
//     if (dispatch_site) {
//       matchObj["dispatchDetails.dispatch_site"] = dispatch_site;
//     }
//     if (is_accepted) {
//       let acce = JSON.parse(is_accepted);
//       matchObj["items.is_accepted"] = acce;
//     }

//     const pageNum = parseInt(page);
//     const limitNum = parseInt(limit);
//     const doPagination = pageNum > 0 && limitNum > 0;
//     const skipNum = doPagination ? (pageNum - 1) * limitNum : 0;

//     let pipeline = [
//       { $match: { deleted: false } },
       


//       { $unwind: "$items" },

//       // --- Lookups ---
//       {
//         $lookup: {
//           from: "erp-planner-drawings",
//           localField: "items.drawing_id",
//           foreignField: "_id",
//           as: "drawingDetails",
//           pipeline: [
//             {
//               $lookup: {
//                 from: "bussiness-projects",
//                 localField: "project",
//                 foreignField: "_id",
//                 as: "projectDetails",
//                 pipeline: [
//                   {
//                     $lookup: {
//                       from: "store-parties",
//                       localField: "party",
//                       foreignField: "_id",
//                       as: "clientDetails",
//                     },
//                   },
//                 ],
//               },
//             },
//           ],
//         },
//       },
//       {
//         $lookup: {
//           from: "erp-drawing-grids",
//           localField: "items.grid_id",
//           foreignField: "_id",
//           as: "gridDetails",
//         },
//       },
//       {
//         $lookup: {
//           from: "users",
//           localField: "offered_by",
//           foreignField: "_id",
//           as: "offerDetails",
//         },
//       },
//       {
//         $lookup: {
//           from: "users",
//           localField: "qc_name",
//           foreignField: "_id",
//           as: "qcDetails",
//         },
//       },
//       {
//         $lookup: {
//           from: "procedure_and_specifications",
//           localField: "procedure_no",
//           foreignField: "_id",
//           as: "procedureDetails",
//         },
//       },
//       {
//         $lookup: {
//           from: "painting-systems",
//           localField: "paint_system_id",
//           foreignField: "_id",
//           as: "paintDetails",
//         },
//       },
//       {
//         $lookup: {
//           from: "multi-erp-painting-dispatch-notes",
//           localField: "items.main_id",
//           foreignField: "_id",
//           as: "dispatchDetails",
//         },
//       },

//       // --- Flatten lookups ---
//       {
//         $addFields: {
//           drawingDetails: { $arrayElemAt: ["$drawingDetails", 0] },
//           gridDetails: { $arrayElemAt: ["$gridDetails", 0] },
//           offerDetails: { $arrayElemAt: ["$offerDetails", 0] },
//           qcDetails: { $arrayElemAt: ["$qcDetails", 0] },
//           procedureDetails: { $arrayElemAt: ["$procedureDetails", 0] },
//           paintDetails: { $arrayElemAt: ["$paintDetails", 0] },
//           dispatchDetails: { $arrayElemAt: ["$dispatchDetails", 0] },
//         },
//       },
//       {
//         $addFields: {
//           projectDetails: {
//             $arrayElemAt: ["$drawingDetails.projectDetails", 0],
//           },
//           clientDetails: {
//             $arrayElemAt: ["$drawingDetails.projectDetails.clientDetails", 0],
//           },
//         },
//       },

//       // --- Filters ---
//       { $match: { "projectDetails._id": new ObjectId(project_id) } },
//       { $match: matchObj },

//       // --- Project with dispatch details per item ---
//       {
//         $project: {
//           _id: 1,
//           report_no: 1,
//           report_no_two: 1,
//           offer_date: 1,
//           qc_date: 1,
//           original_status: 1,
//           weather_condition: 1,
//           blasting_date: 1,
//           blasting_method: 1,
//           abrasive_type: 1,
//           dust_level: 1,
//           primer_date: 1,
//           time: 1,
//           paint_batch_base: 1,
//           manufacture_date: 1,
//           shelf_life: 1,
//           paint_batch_hardner: 1,
//           actual_surface_profile: 1,
//           salt_test_reading: 1,
//           offer_notes: 1,
//           qc_notes: 1,
//           status: 1,
//           start_time: 1,
//           end_time: 1,
//           createdAt: 1,

//           procedure_id: "$procedureDetails._id",
//           procedure_no: "$procedureDetails.vendor_doc_no",
//           offer_name: "$offerDetails.user_name",
//           qc_name: "$qcDetails.user_name",
//           paint_system_no: "$paintDetails.paint_system_no",
//           paint_system_id: "$paintDetails._id",
//               metal_condition: "$metal_condition",
//                                        metal_rust_grade: "$metal_rust_grade",
//           client: "$clientDetails.name",
//           project_name: "$projectDetails.name",
//           wo_no: "$projectDetails.work_order_no",
//           project_po_no: "$projectDetails.work_order_no",

//           items: {
//             _id: "$items._id",
//             main_id: "$_id",
//             drawing_id: "$drawingDetails._id",
//             drawing_no: "$drawingDetails.drawing_no",
//             rev: "$drawingDetails.rev",
//             sheet_no: "$drawingDetails.sheet_no",
//             assembly_no: "$drawingDetails.assembly_no",
//             assembly_quantity: "$drawingDetails.assembly_quantity",
//             grid_id: "$gridDetails._id",
//             grid_no: "$gridDetails.grid_no",
//             grid_qty: "$gridDetails.grid_qty",

//             //  Dispatch details bound correctly
//             dispatch_id: "$dispatchDetails._id",
//             dispatch_report: "$dispatchDetails.report_no",
//             dispatch_site: "$dispatchDetails.dispatch_site",
//             // isSurface: "$dispatchDetails.isSurface",
//             // isMio: "$dispatchDetails.isMio",
//             // isFp: "$dispatchDetails.isFp",
//             // isIrn: "$dispatchDetails.isIrn",

//             surface_balance_grid_qty: "$items.surface_balance_grid_qty",
//             surface_used_grid_qty: "$items.surface_used_grid_qty",
//             moved_next_step: "$items.moved_next_step",
//             average_dft_primer: "$items.average_dft_primer",
//             is_accepted: "$items.is_accepted",
//             remarks: "$items.remarks",
//           },
//         },
//       },

//       // --- Group back by report ---
//       {
//         $group: {
//           _id: {
//             _id: "$_id",
//             report_no: "$report_no",
//             report_no_two: "$report_no_two",
//             offer_date: "$offer_date",
//             qc_date: "$qc_date",
//             original_status: "$original_status",
//             weather_condition: "$weather_condition",
//             blasting_date: "$blasting_date",
//             blasting_method: "$blasting_method",
//             abrasive_type: "$abrasive_type",
//             dust_level: "$dust_level",
//             primer_date: "$primer_date",
//             time: "$time",
//             paint_batch_base: "$paint_batch_base",
//             manufacture_date: "$manufacture_date",
//             metal_condition: "$metal_condition",
//             metal_rust_grade: "$metal_rust_grade",
//             shelf_life: "$shelf_life",
//             paint_batch_hardner: "$paint_batch_hardner",
//             actual_surface_profile: "$actual_surface_profile",
//             salt_test_reading: "$salt_test_reading",
//             offer_notes: "$offer_notes",
//             qc_notes: "$qc_notes",
//             status: "$status",
//             start_time: "$start_time",
//             end_time: "$end_time",
//             createdAt: "$createdAt",

//             procedure_id: "$procedure_id",
//             procedure_no: "$procedure_no",
//             offer_name: "$offer_name",
//             qc_name: "$qc_name",
//             paint_system_no: "$paint_system_no",
//             paint_system_id: "$paint_system_id",
//             client: "$client",
//             project_name: "$project_name",
//             wo_no: "$wo_no",
//             project_po_no: "$project_po_no",
//           },
//           items: { $push: "$items" },
//         },
//       },
//       {
//         $project: {
//           _id: "$_id._id",
//           report_no: "$_id.report_no",
//           report_no_two: "$_id.report_no_two",
//           offer_date: "$_id.offer_date",
//           qc_date: "$_id.qc_date",
//           original_status: "$_id.original_status",
//           weather_condition: "$_id.weather_condition",
//           blasting_date: "$_id.blasting_date",
//           blasting_method: "$_id.blasting_method",
//           abrasive_type: "$_id.abrasive_type",
//           dust_level: "$_id.dust_level",
//           primer_date: "$_id.primer_date",
//           time: "$_id.time",
//           paint_batch_base: "$_id.paint_batch_base",
//           manufacture_date: "$_id.manufacture_date",
//           metal_condition: "$_id.metal_condition",
//           metal_rust_grade: "$_id.metal_rust_grade",
//           shelf_life: "$_id.shelf_life",
//           paint_batch_hardner: "$_id.paint_batch_hardner",
//           actual_surface_profile: "$_id.actual_surface_profile",
//           salt_test_reading: "$_id.salt_test_reading",
//           offer_notes: "$_id.offer_notes",
//           qc_notes: "$_id.qc_notes",
//           status: "$_id.status",
//           start_time: "$_id.start_time",
//           end_time: "$_id.end_time",
//           createdAt: "$_id.createdAt",

//           procedure_id: "$_id.procedure_id",
//           procedure_no: "$_id.procedure_no",
//           offer_name: "$_id.offer_name",
//           qc_name: "$_id.qc_name",
//           paint_system_no: "$_id.paint_system_no",
//           paint_system_id: "$_id.paint_system_id",
//           client: "$_id.client",
//           project_name: "$_id.project_name",
//           wo_no: "$_id.wo_no",
//           project_po_no: "$_id.project_po_no",

//           items: 1,
//         },
//       }
//     ];

//     // --- Search filter ---
//     if (search && search.trim() !== "") {
//       const searchRegex = new RegExp(search.trim(), "i");
//       pipeline.splice(pipeline.length - 0, 0, {
//        $match: {
//   $or: [
//     { report_no: searchRegex },
//     { report_no_two: searchRegex },
//     { paint_system_no: searchRegex },
//     { qc_name: searchRegex },
//     { offer_name: searchRegex },
//     { "items.dispatch_report": searchRegex },
//     { "items.dispatch_site": searchRegex },
//   ]
// }

//       });
//     }

//     // --- Sort ---
//     pipeline.push({ $sort: { createdAt: -1 } });

//     // --- Count total ---
//     const countPipeline = [...pipeline];
//     // Remove $skip and $limit for count if pagination is enabled
//     if (doPagination) {
//       // Remove any skip/limit from countPipeline, but none added yet, so safe here
//     }
//     countPipeline.push({ $count: "total" });
//     const countResult = await SurfaceInspection.aggregate(countPipeline);
//     const total = countResult[0]?.total || 0;

//     // --- Pagination ---
//     if (doPagination) {
//       pipeline.push({ $skip: skipNum });
//       pipeline.push({ $limit: limitNum });
//     }

//     const requestData = await SurfaceInspection.aggregate(pipeline);

//     sendResponse(res, 200, true, {
//       data: requestData,
//       pagination: {
//         total,
//         page: doPagination ? pageNum : 1,
//         limit: doPagination ? limitNum : total,
//       },
//     }, "Surface data list");
//   } catch (error) {
//     console.log("Error in getMultiSurfaceInspectionOffer:", error);
//     sendResponse(res, 500, false, {}, "Something went wrong");
//   }
// };

exports.getMultiSurfaceInspectionOfferStatus = async (req, res) => {
  const {
    project_id,
    paint_system_id,
    report_no,
    dispatch_site,
    is_accepted,
    search,
    page,
    limit,
  } = req.body;

  if (!req.user || req.error) {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }

  try {
    let matchObj = {
      deleted: false,
  status: { $ne: 1 } // status NOT EQUAL to 1
};
    // const matchObj = { deleted: false };
    if (paint_system_id) matchObj.paint_system_id = new ObjectId(paint_system_id);
    if (report_no) matchObj.report_no = report_no;
    if (is_accepted !== undefined) matchObj["items.is_accepted"] = JSON.parse(is_accepted);
 if (dispatch_site) {
      matchObj["dispatchDetails.dispatch_site"] = dispatch_site;
    }
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const doPagination = pageNum > 0 && limitNum > 0;
    const skipNum = doPagination ? (pageNum - 1) * limitNum : 0;

    const pipeline = [
      { $match: matchObj },

      // Optional: Filter based on project_id via drawing.project (deep lookup)
      {
        $lookup: {
          from: "erp-planner-drawings",
          localField: "items.drawing_id",
          foreignField: "_id",
          as: "drawingDocs"
        }
      },
      {
        $lookup: {
          from: "bussiness-projects",
          localField: "drawingDocs.project",
          foreignField: "_id",
          as: "projectDocs"
        }
      },
      ...(project_id
        ? [{
            $match: {
              $or: [
                { project_id: new ObjectId(project_id) },
                { "projectDocs._id": new ObjectId(project_id) }
              ]
            }
          }]
        : []
      ),
      // Lookups
      {
        $lookup: {
          from: "users",
          localField: "offered_by",
          foreignField: "_id",
          as: "offerDetails"
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "qc_name",
          foreignField: "_id",
          as: "qcDetails"
        }
      },
      {
        $lookup: {
          from: "painting-systems",
          localField: "paint_system_id",
          foreignField: "_id",
          as: "paintDetails"
        }
      },

      // Enrich items array individually
      {
        $unwind: {
          path: "$items",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "erp-planner-drawings",
          localField: "items.drawing_id",
          foreignField: "_id",
          as: "drawingDetails"
        }
      },
      {
        $lookup: {
          from: "erp-drawing-grids",
          localField: "items.grid_id",
          foreignField: "_id",
          as: "gridDetails"
        }
      },
      {
        $lookup: {
          from: "multi-erp-painting-dispatch-notes",
          localField: "items.main_id",
          foreignField: "_id",
          as: "dispatchDetails"
        }
      },
      {
  $lookup: {
    from: "procedure_and_specifications",
    localField: "procedure_no",
    foreignField: "_id",
    as: "procedureDetails"
  }
},

      {
        $addFields: {
          // "items.drawing_no": { $arrayElemAt: ["$drawingDetails.drawing_no", 0] },
           "items.drawing_no": {
      $cond: {
        if: { $ifNull: ["$items.drawing_no", false] },
        then: "$items.drawing_no",
        else: { $arrayElemAt: ["$drawingDetails.drawing_no", 0] }
      }
    },
          "items.assembly_no": { $arrayElemAt: ["$drawingDetails.assembly_no", 0] },
          "items.assembly_quantity": { $arrayElemAt: ["$drawingDetails.assembly_quantity", 0] },
          "items.rev": { $arrayElemAt: ["$drawingDetails.rev", 0] },
          // "items.grid_no": { $arrayElemAt: ["$gridDetails.grid_no", 0] },
              "items.grid_no": {
      $cond: {
        if: { $ifNull: ["$items.grid_no", false] },
        then: "$items.grid_no",
        else: { $arrayElemAt: ["$gridDetails.grid_no", 0] }
      }
    },
      "items.grid_qty": {
      $cond: {
        if: { $ifNull: ["$items.grid_qty", false] },
        then: "$items.grid_qty",
        else: { $arrayElemAt: ["$gridDetails.grid_qty", 0] }
      }
    },
          "items.dispatch_report": { $arrayElemAt: ["$dispatchDetails.report_no", 0] },
          "items.dispatch_site": { $arrayElemAt: ["$dispatchDetails.dispatch_site", 0] }
        }
      },

      
      {
        $group: {
          _id: "$_id",
          doc: { $first: "$$ROOT" },
          items: { $push: "$items" }
        }
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ["$doc", { items: "$items" }]
          }
        }
      },

      // Flatten offer, qc, paint system
      {
        $addFields: {
          offer_name: { $arrayElemAt: ["$offerDetails.user_name", 0] },
          qc_name: { $arrayElemAt: ["$qcDetails.user_name", 0] },
          paint_system_no: { $arrayElemAt: ["$paintDetails.paint_system_no", 0] },
           procedure_no: { $arrayElemAt: ["$procedureDetails.vendor_doc_no", 0] },
    procedure_id: { $arrayElemAt: ["$procedureDetails._id", 0] },
    procedure_revision: { $arrayElemAt: ["$procedureDetails.revision", 0] }
        }
      },




      // Search filter
      ...(search && search.trim()
        ? [{
            $match: {
              $or: [
                { offer_name: new RegExp(search.trim(), "i") },
                { report_no: new RegExp(search.trim(), "i") },
                { "items.dispatch_report": new RegExp(search.trim(), "i") },
              ]
            }
          }]
        : []),

      { $sort: { createdAt: -1 } }
    ];

    // Count
    const countPipeline = [...pipeline, { $count: "total" }];
    const countResult = await SurfaceInspection.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Pagination
    if (doPagination) {
      pipeline.push({ $skip: skipNum }, { $limit: limitNum });
    }

    const result = await SurfaceInspection.aggregate(pipeline);

    return sendResponse(res, 200, true, {
      data: result,
      pagination: {
        total,
        page: doPagination ? pageNum : 1,
        limit: doPagination ? limitNum : total,
      }
    }, "Surface inspections with items");
  } catch (error) {
    console.error("Error in getMultiSurfaceInspectionOffer:", error);
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
            $regex: `^VE/${project}/STR/SP/\\d+$`,
            $options: "i",
          },
        },
      },
      {
        $addFields: {
          inspectionNumber: {
            $toInt: {
              $arrayElemAt: [{ $split: ["$report_no_two", "/"] }, -1],
            },
          },
        },
      },
      { $sort: { inspectionNumber: -1 } },
      { $limit: 1 },
      {
        $project: {
          _id: 1,
          report_no_two: 1,
          createdAt: 1,
          inspectionNumber: 1,
        },
      },
    ];

    const [lastInspection] = await SurfaceInspection.aggregate(pipeline);
    // console.log('Aggregation result:', lastInspection);
    return lastInspection || null;
  } catch (error) {
    console.error("Error fetching last inspection:", error);
    throw error;
  }
}

// exports.verifySurfaceQcDetails = async (req, res) => {
//   const {
//     id,
//     items,
//     qc_name,
//     project,
//     actual_surface_profile,
//     salt_test_reading,
//     qc_notes,
//     isMIO,
//     isIrn,

//   } = req.body;
//   if (!req.user || req.error) {
//     return sendResponse(res, 401, false, {}, "Unauthorized");
//   }

//   const itemArray = JSON.parse(items);
  

//   if (!id || itemArray.length === 0 || !qc_name || !project) {
//     return sendResponse(res, 400, false, {}, "Missing parameter");
//   }

//   if (isMIO === undefined && isIrn === undefined) {
//     return sendResponse(res, 400, false, {}, "Release type is required");
//   }

//   const isMIOBool = isMIO === 'true' || isMIO === true;
//   const isIrnBool = isIrn === 'true' || isIrn === true;


//   try {
//     const lastInspection = await getLastInspection(project);
//     let inspectionNo = "1";
//     if (lastInspection && lastInspection.report_no_two) {
//       const split = lastInspection.report_no_two.split("/");
//       const lastInspectionNo = parseInt(split[split.length - 1]);
//       inspectionNo = lastInspectionNo + 1;
//     }
//     const gen_report_no =
//       TitleFormat.SURFACEINSPECTNO.replace("/PROJECT/", `/${project}/`) +
//       inspectionNo;

//     let surfaceInspection = await SurfaceInspection.findById(id);

//     if (!surfaceInspection) {
//       return sendResponse(
//         res,
//         404,
//         false,
//         {},
//         "Surface/paint inspection not found"
//       );
//     }

//     let status = 1;
//     if (itemArray.length > 0) {
//       if (itemArray.every((item) => item.is_accepted === 2)) status = 3;
//       else if (itemArray.every((item) => item.is_accepted === 3)) status = 4;
//       else if (
//         itemArray.some((item) => item.is_accepted === 2) &&
//         itemArray.some((item) => item.is_accepted === 3)
//       )
//         status = 2;
//     }

//     const verifySurface = await SurfaceInspection.findByIdAndUpdate(
//       { _id: id },
//       {
//         report_no_two: gen_report_no,
//         qc_name: qc_name,
//         qc_date: new Date(),
//         actual_surface_profile: actual_surface_profile,
//         salt_test_reading: salt_test_reading,
//         qc_notes: qc_notes,
//         status: status,
//         isMIO: isMIOBool,
//         isIrn: isIrnBool,
//       },
//       { new: true }
//     );

//     let matchedCount = 0;
//     let modifiedCount = 0;

//     for (const item of itemArray) {
//       const { _id, average_dft_primer, is_accepted } = item;
//       const result = await SurfaceInspection.updateOne(
//         { _id: id, "items._id": _id },
//         {
//           $set: {
//             "items.$.average_dft_primer": average_dft_primer,
//             "items.$.is_accepted": is_accepted,
//             // "items.$.surface_used_grid_qty": surface_used_grid_qty,
//           },
//         }
//       );
//       matchedCount += result.matchedCount;
//       modifiedCount += result.modifiedCount;
//     }

//     if (
//       verifySurface &&
//       matchedCount === modifiedCount &&
//       matchedCount === itemArray.length
//     ) {
//       for (const item of itemArray) {
//         const {
//           dispatch_id,
//           drawing_id,
//           grid_id,
//           surface_used_grid_qty,
//           is_accepted,
//         } = item;

//       if (is_accepted === 2) {

//   if (
//     (surfaceInspection.isIrn === true || surfaceInspection.isIrn === "true") ||
//     (surfaceInspection.isMIO === true || surfaceInspection.isMIO === "true")
//   ) {
//  {
 
//    const usedQty = Number(surface_used_grid_qty) || 0;
//       const result = await DispatchNote.updateOne(
//             {
//               _id: dispatch_id,
//               "items.drawing_id": drawing_id,
//               "items.grid_id": grid_id,
//             },
//             {
//               $inc: {
//                 "items.$.moved_next_step": -usedQty,
//               },
//             }
//           );
//             const modifiedItemArray = itemArray.map(item => ({
//     ...item,
//     fc_used_grid_qty: surface_used_grid_qty
//   }));

//     const release_note = await addSurfaceReleaseNote({
//       itemArray: modifiedItemArray,
//       id: result._id,
//       isIrn: surfaceInspection.isIrn,
//       isMIO: surfaceInspection.isMIO,
//     });
   
   
//   }
// }

//         else if (is_accepted === 3) {
//           // ✅ Case 2: Accepted = 3 → Only Dispatch update
//           console.log("surface::: is_accepted is 3, updating dispatch note");

//           const result = await DispatchNote.updateOne(
//             {
//               _id: dispatch_id,
//               "items.drawing_id": drawing_id,
//               "items.grid_id": grid_id,
//             },
//             {
//               $inc: {
//                 "items.$.moved_next_step": -surface_used_grid_qty,
//               },
//             }
//           );

//           console.log("Dispatch note update result:", result);
//         }
//         // else → do nothing
//       }

//       return sendResponse(
//         res,
//         200,
//         true,
//         {},
//         "Surface/paint verified successfully"
//       );
//     } else {
//       return sendResponse(res, 400, false, {}, "Surface/paint not verified");
//     }
//   } catch (error) {
//     console.error("Error in verifySurfaceQcDetails:", error);
//     sendResponse(res, 500, false, {}, "Something went wrong");
//   }
// };

// exports.verifySurfaceQcDetails = async (req, res) => {
//   try {
//     const {
//       id,
//       items,
//       qc_name,
//       project,
//       actual_surface_profile,
//       salt_test_reading,
//       qc_notes,
//       isMIO,
//       isIrn,
//     } = req.body;

//     if (!req.user || req.error) {
//       return sendResponse(res, 401, false, {}, "Unauthorized");
//     }

//     if (!id || !items || !qc_name || !project) {
//       return sendResponse(res, 400, false, {}, "Missing parameter");
//     }

//     const itemArray = JSON.parse(items);
//     if (!itemArray.length) {
//       return sendResponse(res, 400, false, {}, "Items required");
//     }

//     // Convert to boolean
//     const isMIOBool = isMIO === true || isMIO === "true";
//     const isIrnBool = isIrn === true || isIrn === "true";

//     // Only one allowed
//     if (isMIOBool && isIrnBool) {
//       return sendResponse(res, 400, false, {}, "Only one release type allowed");
//     }

//     if (!isMIOBool && !isIrnBool) {
//       return sendResponse(res, 400, false, {}, "Release type is required");
//     }

//     // Get inspection
//     const surfaceInspection = await SurfaceInspection.findById(id);
//     if (!surfaceInspection) {
//       return sendResponse(res, 404, false, {}, "Surface inspection not found");
//     }

//     // Generate report number
//     const lastInspection = await getLastInspection(project);
//     let inspectionNo = 1;
//     if (lastInspection?.report_no_two) {
//       const split = lastInspection.report_no_two.split("/");
//       inspectionNo = parseInt(split[split.length - 1]) + 1;
//     }

//     const gen_report_no =
//       TitleFormat.SURFACEINSPECTNO.replace("/PROJECT/", `/${project}/`) +
//       inspectionNo;

//     // Status calculation
//     let status = 1;
//     if (itemArray.every(i => i.is_accepted === 2)) status = 3;
//     else if (itemArray.every(i => i.is_accepted === 3)) status = 4;
//     else if (
//       itemArray.some(i => i.is_accepted === 2) &&
//       itemArray.some(i => i.is_accepted === 3)
//     ) status = 2;

//     // Update main inspection
//     const verifySurface = await SurfaceInspection.findByIdAndUpdate(
//       id,
//       {
//         report_no_two: gen_report_no,
//         qc_name,
//         qc_date: new Date(),
//         actual_surface_profile,
//         salt_test_reading,
//         qc_notes,
//         status,
//         isMIO: isMIOBool,
//         isIrn: isIrnBool,
//       },
//       { new: true }
//     );

//     // Update items
//     for (const item of itemArray) {
//       await SurfaceInspection.updateOne(
//         { _id: id, "items._id": item._id },
//         {
//           $set: {
//             "items.$.average_dft_primer": item.average_dft_primer,
//             "items.$.is_accepted": item.is_accepted,
//           },
//         }
//       );
//     }

//     // Dispatch & Release Note logic
//     for (const item of itemArray) {
//       const {
//         dispatch_id,
//         drawing_id,
//         grid_id,
//         surface_used_grid_qty,
//         is_accepted,
//       } = item;

//       const usedQty = Number(surface_used_grid_qty) || 0;

//       if (is_accepted === 2) {
//         await DispatchNote.updateOne(
//           {
//             _id: dispatch_id,
//             "items.drawing_id": drawing_id,
//             "items.grid_id": grid_id,
//           },
//           {
//             $inc: {
//               "items.$.moved_next_step": -usedQty,
//             },
//           }
//         );
//       if (verifySurface.isIrn === true) {
//         await addSurfaceReleaseNote({
//           itemArray: itemArray.map(i => ({
//             ...i,
//             fc_used_grid_qty: surface_used_grid_qty,
//           })),
//           id: dispatch_id,
//           isIrn: verifySurface.isIrn,
//           isMIO: verifySurface.isMIO,
//         });
//       }
//     }

//       if (is_accepted === 3) {
//         await DispatchNote.updateOne(
//           {
//             _id: dispatch_id,
//             "items.drawing_id": drawing_id,
//             "items.grid_id": grid_id,
//           },
//           {
//             $inc: {
//               "items.$.moved_next_step": -usedQty,
//             },
//           }
//         );
//       }
//     }

//     return sendResponse(
//       res,
//       200,
//       true,
//       {},
//       "Surface / Primer verified successfully"
//     );
//   } catch (error) {
//     console.error("verifySurfaceQcDetails error:", error);
//     return sendResponse(res, 500, false, {}, "Something went wrong");
//   }
// };


// const getSurfaceInspectionOfferFunction = async (report_no, report_no_two) => {
//   try {
//     let matchObj = { deleted: false };
//     if (report_no) {
//       matchObj = { ...matchObj, report_no: report_no };
//     }
//     if (report_no_two) {
//       matchObj = { ...matchObj, report_no_two: report_no_two };
//     }

//     let requestData = await SurfaceInspection.aggregate([
//       { $match: matchObj },
//       { $unwind: "$items" },
//       {
//         $lookup: {
//           from: "erp-planner-drawings",
//           localField: "items.drawing_id",
//           foreignField: "_id",
//           as: "drawingDetails",
//           pipeline: [
//             {
//               $lookup: {
//                 from: "bussiness-projects",
//                 localField: "project",
//                 foreignField: "_id",
//                 as: "projectDetails",
//                 pipeline: [
//                   {
//                     $lookup: {
//                       from: "store-parties",
//                       localField: "party",
//                       foreignField: "_id",
//                       as: "clientDetails",
//                     },
//                   },
//                 ],
//               },
//             },
//           ],
//         },
//       },
//       {
//         $lookup: {
//           from: "erp-drawing-grids",
//           localField: "items.grid_id",
//           foreignField: "_id",
//           as: "gridDetails",
//         },
//       },
//       {
//         $lookup: {
//           from: "users",
//           localField: "offered_by",
//           foreignField: "_id",
//           as: "offerDetails",
//         },
//       },
//       {
//         $lookup: {
//           from: "users",
//           localField: "qc_name",
//           foreignField: "_id",
//           as: "qcDetails",
//         },
//       },
//       {
//         $lookup: {
//           from: "procedure_and_specifications",
//           localField: "procedure_no",
//           foreignField: "_id",
//           as: "procedureDetails",
//         },
//       },
//       {
//         $lookup: {
//           from: "painting-systems",
//           localField: "paint_system_id",
//           foreignField: "_id",
//           as: "paintDetails",
//           pipeline: [
//             {
//               $lookup: {
//                 from: "paint-manufactures",
//                 localField: "paint_manufacturer",
//                 foreignField: "_id",
//                 as: "paintManDetails",
//               },
//             },
//           ],
//         },
//       },
//       {
//         $lookup: {
//           from: "multi-erp-painting-dispatch-notes",
//           localField: "items.main_id",
//           foreignField: "_id",
//           as: "dispatchDetails",
//         },
//       },
//       {
//         $addFields: {
//           drawingDetails: { $arrayElemAt: ["$drawingDetails", 0] },
//           gridDetails: { $arrayElemAt: ["$gridDetails", 0] },
//           offerDetails: { $arrayElemAt: ["$offerDetails", 0] },
//           qcDetails: { $arrayElemAt: ["$qcDetails", 0] },
//           procedureDetails: { $arrayElemAt: ["$procedureDetails", 0] },
//           paintDetails: { $arrayElemAt: ["$paintDetails", 0] },
//           dispatchDetails: { $arrayElemAt: ["$dispatchDetails", 0] },
//         },
//       },
      
//       {
//         $addFields: {
//           projectDetails: {
//             $arrayElemAt: ["$drawingDetails.projectDetails", 0],
//           },
//           paintManDetails: {
//             $arrayElemAt: ["$paintDetails.paintManDetails", 0],
//           },
//         },
//       },
//       {
//         $addFields: {
//           clientDetails: {
//             $arrayElemAt: ["$projectDetails.clientDetails", 0],
//           },
//         },
//       },

      
//       {
//         $project: {
//           _id: 1,
//           report_no: report_no ? "$report_no" : "$report_no_two",
//           weather_condition: "$weather_condition",
//           procedure_no: "$procedureDetails.vendor_doc_no",
//           offer_date: "$offer_date",
//           offer_name: "$offerDetails.user_name",
//           qc_date: "$qc_date",
//           qc_name: "$qcDetails.user_name",
//           original_status: "$original_status",
//           metal_condition: "$metal_condition",
//           metal_rust_grade: "$metal_rust_grade",
//           paint_system_no: "$paintDetails.paint_system_no",
//           paint_system_id: "$paintDetails._id",
//           prep_standard: "$paintDetails.surface_preparation",
//           profile_requirement: "$paintDetails.profile_requirement",
//           salt_test: "$paintDetails.salt_test",
//           prime_paint: "$paintDetails.prime_paint",
//           primer_app_method: "$paintDetails.primer_app_method",
//           primer_dft_range: "$paintDetails.primer_dft_range",
//           paint_manufacturer: "$paintManDetails.name",
//           blasting_date: "$blasting_date",
//           blasting_method: "$blasting_method",
//           abrasive_type: "$abrasive_type",
//           dust_level: "$dust_level",
//           primer_date: "$primer_date",
//           time: "$time",
//           paint_batch_base: "$paint_batch_base",
//           manufacture_date: "$manufacture_date",
//           shelf_life: "$shelf_life",
//           paint_batch_hardner: "$paint_batch_hardner",
//           actual_surface_profile: "$actual_surface_profile",
//           salt_test_reading: "$salt_test_reading",
//           offer_notes: "$offer_notes",
//           qc_notes: "$qc_notes",
//           status: "$status",
//           start_time: "$start_time",
//           end_time: "$end_time",
//           client: "$clientDetails.name",
//           project_name: "$projectDetails.name",
//           wo_no: "$projectDetails.work_order_no",
//           project_po_no: "$projectDetails.work_order_no",
//           items: {
//             _id: "$items._id",
//             drawing_no: "$drawingDetails.drawing_no",
//             rev: "$drawingDetails.rev",
//             sheet_no: "$drawingDetails.sheet_no",
//             assembly_no: "$drawingDetails.assembly_no",
//             assembly_quantity: "$drawingDetails.assembly_quantity",
//             grid_no: "$gridDetails.grid_no",
//             grid_qty: "$gridDetails.grid_qty",
//             surface_used_grid_qty: "$items.surface_used_grid_qty",
//             remarks: "$items.remarks",
//             ...(report_no_two && {
//               average_dft_primer: "$items.average_dft_primer",
//               accept: {
//                 $cond: [
//                   { $eq: ["$items.is_accepted", 2] },
//                   "ACC",
//                   {
//                     $cond: [{ $eq: ["$items.is_accepted", 3] }, "REJ", "--"],
//                   },
//                 ],
//               },
//             }),
//           },
//         },
//       },
//       {
//         $group: {
//           _id: {
//             _id: "$_id",
//             report_no: "$report_no",
//             weather_condition: "$weather_condition",
//             procedure_id: "$procedure_id",
//             procedure_no: "$procedure_no",
//             offer_date: "$offer_date",
//             offer_name: "$offer_name",
//             qc_date: "$qc_date",
//             qc_name: "$qc_name",
//             original_status: "$original_status",
//             metal_condition: "$metal_condition",
//             metal_rust_grade: "$metal_rust_grade",
//             paint_system_no: "$paint_system_no",
//             paint_system_id: "$paint_system_id",
//             prep_standard: "$prep_standard",
//             profile_requirement: "$profile_requirement",
//             salt_test: "$salt_test",
//             prime_paint: "$prime_paint",
//             primer_app_method: "$primer_app_method",
//             primer_dft_range: "$primer_dft_range",
//             paint_manufacturer: "$paint_manufacturer",
//             blasting_date: "$blasting_date",
//             blasting_method: "$blasting_method",
//             abrasive_type: "$abrasive_type",
//             dust_level: "$dust_level",
//             primer_date: "$primer_date",
//             time: "$time",
//             paint_batch_base: "$paint_batch_base",
//             manufacture_date: "$manufacture_date",
//             shelf_life: "$shelf_life",
//             paint_batch_hardner: "$paint_batch_hardner",
//             actual_surface_profile: "$actual_surface_profile",
//             salt_test_reading: "$salt_test_reading",
//             offer_notes: "$offer_notes",
//             qc_notes: "$qc_notes",
//             status: "$status",
//             start_time: "$start_time",
//             end_time: "$end_time",
//             client: "$client",
//             project_name: "$project_name",
//             wo_no: "$wo_no",
//             project_po_no: "$project_po_no",
//           },
//           items: { $push: "$items" },
//         },
//       },
//       {
//         $project: {
//           _id: "$_id._id",
//           report_no: "$_id.report_no",
//           weather_condition: "$_id.weather_condition",
//           procedure_id: "$_id.procedure_id",
//           procedure_no: "$_id.procedure_no",
//           offer_date: "$_id.offer_date",
//           offer_name: "$_id.offer_name",
//           qc_date: "$_id.qc_date",
//           qc_name: "$_id.qc_name",
//           original_status: "$_id.original_status",
//           metal_condition: "$_id.metal_condition",
//           metal_rust_grade: "$_id.metal_rust_grade",
//           paint_system_no: "$_id.paint_system_no",
//           paint_system_id: "$_id.paint_system_id",
//           prep_standard: "$_id.prep_standard",
//           profile_requirement: "$_id.profile_requirement",
//           salt_test: "$_id.salt_test",
//           prime_paint: "$_id.prime_paint",
//           primer_app_method: "$_id.primer_app_method",
//           primer_dft_range: "$_id.primer_dft_range",
//           paint_manufacturer: "$_id.paint_manufacturer",
//           blasting_date: "$_id.blasting_date",
//           blasting_method: "$_id.blasting_method",
//           abrasive_type: "$_id.abrasive_type",
//           dust_level: "$_id.dust_level",
//           primer_date: "$_id.primer_date",
//           time: "$_id.time",
//           paint_batch_base: "$_id.paint_batch_base",
//           manufacture_date: "$_id.manufacture_date",
//           shelf_life: "$_id.shelf_life",
//           paint_batch_hardner: "$_id.paint_batch_hardner",
//           actual_surface_profile: "$_id.actual_surface_profile",
//           salt_test_reading: "$_id.salt_test_reading",
//           offer_notes: "$_id.offer_notes",
//           qc_notes: "$_id.qc_notes",
//           status: "$_id.status",
//           start_time: "$_id.start_time",
//           end_time: "$_id.end_time",
//           client: "$_id.client",
//           project_name: "$_id.project_name",
//           wo_no: "$_id.wo_no",
//           project_po_no: "$_id.project_po_no",
//           items: 1,
//         },
//       },
//     ]);
// console.log("requestdata",requestData[0]);
//     if (requestData.length && requestData.length > 0) {
//       return { status: 1, result: requestData };
//     } else {
//       return { status: 0, result: [] };
//     }
//   } catch (error) {
//     return { status: 2, result: error };
//   }
// };

exports.verifySurfaceQcDetails = async (req, res) => {
  try {
    const {
      id,
      items,
      qc_name,
      project,
      project_id,
      actual_surface_profile,
      salt_test_reading,
      qc_notes,
      isMIO,
      isIrn,
    } = req.body;

    if (!req.user || req.error) {
      return sendResponse(res, 401, false, {}, "Unauthorized");
    }

    if (!id || !items || !qc_name || !project) {
      return sendResponse(res, 400, false, {}, "Missing parameter");
    }

    const itemArray = JSON.parse(items);
    if (!itemArray.length) {
      return sendResponse(res, 400, false, {}, "Items required");
    }

    const isMIOBool = isMIO === true || isMIO === "true";
    const isIrnBool = isIrn === true || isIrn === "true";

    if (isMIOBool && isIrnBool) {
      return sendResponse(res, 400, false, {}, "Only one release type allowed");
    }

    if (!isMIOBool && !isIrnBool) {
      return sendResponse(res, 400, false, {}, "Release type is required");
    }

    const surfaceInspection = await SurfaceInspection.findById(id);
    if (!surfaceInspection) {
      return sendResponse(res, 404, false, {}, "Surface inspection not found");
    }

    // Generate report number
    const lastInspection = await getLastInspection(project);
    let inspectionNo = 1;
    if (lastInspection?.report_no_two) {
      const split = lastInspection.report_no_two.split("/");
      inspectionNo = parseInt(split[split.length - 1]) + 1;
    }

    const gen_report_no =
      TitleFormat.SURFACEINSPECTNO.replace("/PROJECT/", `/${project}/`) +
      inspectionNo;

    // Status calculation
    let status = 1;
    if (itemArray.every(i => i.is_accepted === 2)) status = 3;
    else if (itemArray.every(i => i.is_accepted === 3)) status = 4;
    else if (
      itemArray.some(i => i.is_accepted === 2) &&
      itemArray.some(i => i.is_accepted === 3)
    ) status = 2;

    const verifySurface = await SurfaceInspection.findByIdAndUpdate(
      id,
      {
        report_no_two: gen_report_no,
        qc_name,
        qc_date: new Date(),
        actual_surface_profile,
        salt_test_reading,
        qc_notes,
        status,
        isMIO: isMIOBool,
        isIrn: isIrnBool,
      },
      { new: true }
    );

    // Update inspection items
    for (const item of itemArray) {
      await SurfaceInspection.updateOne(
        { _id: id, "items._id": item._id },
        {
          $set: {
            "items.$.average_dft_primer": item.average_dft_primer,
            "items.$.is_accepted": item.is_accepted,
          },
        }
      );
    }

    // Dispatch update (per item)
    for (const item of itemArray) {
      if (![2, 3].includes(item.is_accepted)) continue;

      const usedQty = Number(item.surface_used_grid_qty) || 0;

      await DispatchNote.updateOne(
        {
          _id: item.dispatch_id,
          "items.drawing_id": item.drawing_id,
          "items.grid_id": item.grid_id,
        },
        {
          $inc: {
            "items.$.moved_next_step": -usedQty,
          },
        }
      );
    }

    // ✅ RELEASE NOTE — ONLY ONCE, ONLY IF IRN TRUE
    const hasAcceptedItem = itemArray.some(i => i.is_accepted === 2);

    if (hasAcceptedItem && verifySurface.isIrn === true) {
      await addSurfaceReleaseNote({
        itemArray: itemArray.map(i => ({
          ...i,
          fc_used_grid_qty: i.surface_used_grid_qty,
        })),
        id: verifySurface._id,
        isIrn: true,
        isMIO: false,
      });
    }
/* =========================================================
    SURFACE QC EMAIL
========================================================= */

try {

    const inspection = verifySurface;

    const qcUser =
        await User.findById(
            qc_name
        );

    const projectDetails =
        await Project.findById(
            inspection.project_id
        );

    /* ==========================================
       NEXT STAGE ROLE
    ========================================== */

    let nextStageRole = "";
    let nextStageText = "";

    // MIO stage
    if (
        inspection.isMIO === true &&
        inspection.isIrn === false
    ) {

        nextStageRole =
            "Production Engineer";

        nextStageText =
            "MIO Process";

    }

    // IRN stage
    else if (
        inspection.isIrn === true &&
        inspection.isMIO === false
    ) {

        nextStageRole =
            "QC Engineer";

        nextStageText =
            "IRN Process";

    }


    /* ==========================================
       NEXT STAGE USERS
    ========================================== */

    let nextStageUsers = [];

    if (nextStageRole) {

        const roles =
            await ErpRole.find({

                deleted: false,

                name: {
                    $in: [nextStageRole]
                }

            });

        const roleIds =
            roles.map(
                role => role._id
            );

        nextStageUsers =
            await User.find({

                deleted: false,

                status: true,

                structureRole: {
                    $in: roleIds
                },

                email: {
                    $exists: true,
                    $ne: ""
                }

            });

    }


    /* ==========================================
       OFFER CREATOR
    ========================================== */

    let offerUsers = [];

    if (
        inspection?.offered_by
    ) {

        const offeredUser =
            await User.findOne({

                _id:
                    inspection.offered_by,

                deleted: false,

                status: true,

                email: {
                    $exists: true,
                    $ne: ""
                }

            });

        if (offeredUser) {
            offerUsers = [offeredUser];
        }

    }


    /* ==========================================
       QC STATUS
    ========================================== */

    let qcStatus = "";

    if (
        inspection.status === 3
    ) {

        qcStatus = "Accepted";

    }

    else if (
        inspection.status === 4
    ) {

        qcStatus = "Rejected";

    }

    else {

        qcStatus = "Partially Accepted";

    }


    /* ==========================================
       RECIPIENTS
    ========================================== */

    let recipients = [];

    // Accepted -> next stage users

    if (
        inspection.status === 3
    ) {

        recipients =
            nextStageUsers;

    }

    // Rejected -> offer creator

    else if (
        inspection.status === 4
    ) {

        recipients =
            offerUsers;

    }

    // Partial -> both

    else if (
        inspection.status === 2
    ) {

        recipients = [

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

                index ===
                self.findIndex(

                    u =>

                        String(
                            u._id
                        ) ===

                        String(
                            user._id
                        )

                )

        );


    /* ==========================================
       REMARKS
    ========================================== */

    let remarks = "";

    if (
        inspection.status === 3
    ) {

        remarks =
            `Surface QC completed by ${
                qcUser?.user_name || "-"
            } with status ${qcStatus}. Ready for ${nextStageText}.`;

    }

    else if (
        inspection.status === 4
    ) {

        remarks =
            `Surface QC completed by ${
                qcUser?.user_name || "-"
            } with status ${qcStatus}. Action required for correction and reoffering.`;

    }

    else {

        remarks =
            `Surface QC completed by ${
                qcUser?.user_name || "-"
            } with status ${qcStatus}. Accepted items moved to ${nextStageText} and rejected items require reoffering.`;

    }


    /* ==========================================
       DATE
    ========================================== */

    const accptanceDateTime =

        inspection?.qc_date

            ? new Date(
                inspection.qc_date
            )
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
                .replace("pm", "PM")

            : "-";


    /* ==========================================
       SEND EMAIL
    ========================================== */

    for (const user of recipients) {

        try {

            const html =
                commonStageAcceptanceEmail({

                    userName:
                        user?.user_name || "-",

                    module:
                        "Piping",

                    stageName:
                        "Surface QC Verification",

                    reportNo:
                        inspection?.report_no_two || "-",

                    projectName:
                        project || "-",

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

                to:
                    user.email,

                subject:
                    `Surface QC Verification - ${inspection?.report_no_two}`,

                html

            });

            console.log(
                `MAIL QUEUED -> ${user.email}`
            );

        }
        catch (mailErr) {

            console.log(
                `MAIL ERROR ${user.email}`,
                mailErr.message
            );

        }

    }

}
catch (emailErr) {

    console.log(
        "SURFACE QC EMAIL ERROR:",
        emailErr
    );

}
    return sendResponse(
      res,
      200,
      true,
      {},
      "Surface / Primer verified successfully"
    );
  } catch (error) {
    console.error("verifySurfaceQcDetails error:", error);
    return sendResponse(res, 500, false, {}, "Something went wrong");
  }
};

const getSurfaceInspectionOfferFunction = async (report_no, report_no_two) => {
  try {
    let matchObj = { deleted: false };
    if (report_no) matchObj.report_no = report_no;
    if (report_no_two) matchObj.report_no_two = report_no_two;

    let requestData = await SurfaceInspection.aggregate([
      { $match: matchObj },
      { $unwind: "$items" },

      // Lookup drawings with nested project and client
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

      // Lookup grids
      {
        $lookup: {
          from: "erp-drawing-grids",
          localField: "items.grid_id",
          foreignField: "_id",
          as: "gridDetails",
        },
      },

      // Lookup users
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

      // Lookup procedure
      {
        $lookup: {
          from: "procedure_and_specifications",
          localField: "procedure_no",
          foreignField: "_id",
          as: "procedureDetails",
        },
      },

      // Lookup painting system with manufacturer
      {
        $lookup: {
          from: "painting-systems",
          localField: "paint_system_id",
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

      // Lookup dispatch
      {
        $lookup: {
          from: "multi-erp-painting-dispatch-notes",
          localField: "items.main_id",
          foreignField: "_id",
          as: "dispatchDetails",
        },
      },

      // Add first elements from arrays
      {
        $addFields: {
          drawingDetails: { $arrayElemAt: ["$drawingDetails", 0] },
          gridDetails: { $arrayElemAt: ["$gridDetails", 0] },
          offerDetails: { $arrayElemAt: ["$offerDetails", 0] },
          qcDetails: { $arrayElemAt: ["$qcDetails", 0] },
          procedureDetails: { $arrayElemAt: ["$procedureDetails", 0] },
          paintDetails: { $arrayElemAt: ["$paintDetails", 0] },
          dispatchDetails: { $arrayElemAt: ["$dispatchDetails", 0] },
        },
      },
      {
        $addFields: {
          projectDetails: { $arrayElemAt: ["$drawingDetails.projectDetails", 0] },
          paintManDetails: { $arrayElemAt: ["$paintDetails.paintManDetails", 0] },
          clientDetails: { $arrayElemAt: ["$projectDetails.clientDetails", 0] },
        },
      },

      // Merge manual fields with lookup fallback & compute accept
      {
        $addFields: {
          projectDetails: { $arrayElemAt: ["$drawingDetails.projectDetails", 0] },
          paintManDetails: { $arrayElemAt: ["$paintDetails.paintManDetails", 0] },
          clientDetails: { $arrayElemAt: ["$projectDetails.clientDetails", 0] },
          "items.drawing_no": { $ifNull: ["$items.drawing_no", "$drawingDetails.drawing_no"] },
          "items.rev": { $ifNull: ["$items.rev", "$drawingDetails.rev", "-"] },
          "items.sheet_no": { $ifNull: ["$items.sheet_no", "$drawingDetails.sheet_no"] },
          "items.assembly_no": { $ifNull: ["$items.item_name", "$drawingDetails.assembly_no"] },
          "items.assembly_quantity": { $ifNull: ["$items.assembly_quantity", "$drawingDetails.assembly_quantity"] },
          "items.grid_no": { $ifNull: ["$items.grid_no", "$gridDetails.grid_no"] },
          "items.grid_qty": { $ifNull: ["$items.grid_qty", "$gridDetails.grid_qty"] },
          "items.surface_used_grid_qty": { $ifNull: ["$items.surface_used_grid_qty", "$items.surface_used_grid_qty"] },
          "items.dispatch_report": { $ifNull: ["$items.dispatch_report", "$dispatchDetails.report_no"] },
          "items.dispatch_site": { $ifNull: ["$items.dispatch_site", "$dispatchDetails.dispatch_site"] },
          "items.average_dft_primer": { $ifNull: ["$items.average_dft_primer", "$items.average_dft_primer"] },
          "items.accept": {
            $cond: [
              { $eq: ["$items.is_accepted", 2] },
              "ACC",
              { $cond: [{ $eq: ["$items.is_accepted", 3] }, "REJ", "--"] },
            ],
          },
        },
      },

      // Group items back to report level
      {
        $group: {
          _id: "$_id",
          report_no: { $first: "$report_no" },
          weather_condition: { $first: "$weather_condition" },
          procedure_no: { $first: "$procedureDetails.vendor_doc_no" },
          offer_date: { $first: "$offer_date" },
          offer_name: { $first: "$offerDetails.user_name" },
          qc_date: { $first: "$qc_date" },
          qc_name: { $first: "$qcDetails.user_name" },
          original_status: { $first: "$original_status" },
          metal_condition: { $first: "$metal_condition" },
          metal_rust_grade: { $first: "$metal_rust_grade" },
          paint_system_no: { $first: "$paintDetails.paint_system_no" },
          paint_system_id: { $first: "$paintDetails._id" },
          prep_standard: { $first: "$paintDetails.surface_preparation" },
          profile_requirement: { $first: "$paintDetails.profile_requirement" },
          salt_test: { $first: "$paintDetails.salt_test" },
          prime_paint: { $first: "$paintDetails.prime_paint" },
          primer_app_method: { $first: "$paintDetails.primer_app_method" },
          primer_dft_range: { $first: "$paintDetails.primer_dft_range" },
          paint_manufacturer: { $first: "$paintManDetails.name" },
          blasting_date: { $first: "$blasting_date" },
          blasting_method: { $first: "$blasting_method" },
          abrasive_type: { $first: "$abrasive_type" },
          dust_level: { $first: "$dust_level" },
          primer_date: { $first: "$primer_date" },
          time: { $first: "$time" },
          paint_batch_base: { $first: "$paint_batch_base" },
          manufacture_date: { $first: "$manufacture_date" },
          shelf_life: { $first: "$shelf_life" },
          paint_batch_hardner: { $first: "$paint_batch_hardner" },
          actual_surface_profile: { $first: "$actual_surface_profile" },
          salt_test_reading: { $first: "$salt_test_reading" },
          offer_notes: { $first: "$offer_notes" },
          qc_notes: { $first: "$qc_notes" },
          status: { $first: "$status" },
          start_time: { $first: "$start_time" },
          end_time: { $first: "$end_time" },
          client: { $first: "$clientDetails.name" },
          project_name: { $first: "$projectDetails.name" },
          wo_no: { $first: "$projectDetails.work_order_no" },
          project_po_no: { $first: "$projectDetails.work_order_no" },
          items: { $push: "$items" },
        },
      },

      { $sort: { createdAt: -1 } },
    ]);

    if (requestData.length > 0) {
      return { status: 1, result: requestData };
    } else {
      return { status: 0, result: [] };
    }
  } catch (error) {
    console.log(error);
    return { status: 2, result: error };
  }
};


exports.oneSurface = async (req, res) => {
  const { report_no, report_no_two } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await getSurfaceInspectionOfferFunction(
        report_no,
        report_no_two
      );
      let requestData = data.result;

      if (data.status === 1) {
        sendResponse(res, 200, true, requestData, `Surface data list`);
      } else if (data.status === 0) {
        sendResponse(res, 200, true, [], `Surface data not found`);
      } else if (data.status === 2) {
        sendResponse(res, 500, false, {}, "Something went wrong11");
      }
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.downloadOneMultiSurface = async (req, res) => {
  const { report_no, report_no_two, print_date } = req.body;

  if (req.user && !req.error) {
    try {
      const data = await getSurfaceInspectionOfferFunction(
        report_no,
        report_no_two
      );

      let requestData = data.result[0];

      if (data.status === 1) {
        let headerInfo = {
          report_no: requestData?.report_no,
          weather_condition: requestData?.weather_condition,
          procedure_id: requestData?.procedure_id,
          procedure_no: requestData?.procedure_no,
          offer_date: requestData?.offer_date,
          offer_name: requestData?.offer_name,
          qc_date: requestData?.qc_date,
          qc_name: requestData?.qc_name,
          original_status: requestData?.original_status,
          metal_condition: requestData?.metal_condition,
          metal_rust_grade: requestData?.metal_rust_grade,
          paint_system_no: requestData?.paint_system_no,
          paint_system_id: requestData?.paint_system_id,
          prep_standard: requestData?.prep_standard,
          profile_requirement: requestData?.profile_requirement,
          salt_test: requestData?.salt_test,
          prime_paint: requestData?.prime_paint,
          primer_app_method: requestData?.primer_app_method,
          primer_dft_range: requestData?.primer_dft_range,
          paint_manufacturer: requestData?.paint_manufacturer,
          blasting_date: requestData?.blasting_date,
          blasting_method: requestData?.blasting_method,
          abrasive_type: requestData?.abrasive_type,
          dust_level: requestData?.dust_level,
          primer_date: requestData?.primer_date,
          time: requestData?.time,
          paint_batch_base: requestData?.paint_batch_base,
          manufacture_date: requestData?.manufacture_date,
          shelf_life: requestData?.shelf_life,
          paint_batch_hardner: requestData?.paint_batch_hardner,
          actual_surface_profile: requestData?.actual_surface_profile,
          salt_test_reading: requestData?.salt_test_reading,
          offer_notes: requestData?.offer_notes,
          qc_notes: requestData?.qc_notes,
          status: requestData?.status,
          start_time: requestData?.start_time,
          end_time: requestData?.end_time,
          client: requestData?.client,
          project_name: requestData?.project_name,
          wo_no: requestData?.wo_no,
          project_po_no: requestData?.project_po_no,
        };

        const template = fs.readFileSync(
          "templates/multiSurface.html",
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

        const pdfBuffer = await generatePDFA4WithoutPrintDate(page, {
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

        const filename = `surface_${x}_${Date.now()}.pdf`;
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
        sendResponse(res, 200, false, {}, `Surface data not found`);
      } else if (data.status === 2) {
        sendResponse(res, 500, false, {}, "Something went wrong");
      }
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong1111");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};
