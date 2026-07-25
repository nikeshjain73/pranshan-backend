const MioInspection = require("../../../models/erp/Multi/multi_mio_inspection.model");
const MIOOfferTable = require("../../../models/erp/Multi/offer_table_data/Paint/mio_offer_table.model");
const { TitleFormat } = require("../../../utils/enum");
const { sendResponse } = require("../../../helper/response");
const { default: mongoose } = require("mongoose");
const {
  Types: { ObjectId },
} = require("mongoose");
const SurfaceInspection = require("../../../models/erp/Multi/multi_surface_inspection.model");
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
const {
  addMioReleaseNote,
} = require("../../../controllers/erp/Multi/release_note/multi_release_note.controller");
const DispatchNote = require("../../../models/erp/Multi/dispatch_note/multi_dispatch_note.model");
const User = require("../../../models/users.model");
const ErpRole = require("../../../models/erp/erp_role.model");
const Project = require("../../../models/project.model");
const addEmailJob = require("../../../utils/emailJob");
const sendEmail = require("../../../utils/sendEmail");
const commonStageOfferEmail = require("../../../utils/commonStageOfferEmail");
const commonStageAcceptanceEmail = require("../../../utils/commonStageAcceptanceEmail");

exports.generateMIOOffer = async (req, res) => {
  const {
    weather_condition,
    procedure_no,
    paint_system_id,
    mio_date,
    time,
    paint_batch_base,
    manufacture_date,
    shelf_life,
    paint_batch_hardner,
    offered_by,
    offer_notes,
    start_time,
    end_time,
    items,
    project,
    project_id,
  } = req.body;
  const isIrn = req.body.isIrn === "true" || req.body.isIrn === true;
  const isMio = req.body.isMio === "true" || req.body.isMio === true;

  console.log("isIrn:", isIrn);
  console.log("isMio:", isMio);
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
    let lastOffer = await MioInspection.findOne(
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
      TitleFormat.MIOOFFERNO.replace("/PROJECT/", `/${project}/`) + newOfferNo;

    const addMIOIoffer = await MioInspection.create({
      report_no: gen_voucher_no,
      project_id,
      offer_date: Date.now(),
      weather_condition: weatherCondition,
      procedure_no,
      paint_system_id,
      mio_date,
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
      isMio,
      items: itemArray,
    });

    if (addMIOIoffer) {
      // for (const item of itemArray) {
      //   const { mio_offer_id } = item;
      //   const deleteMIOOffer = await MIOOfferTable.deleteOne({
      //     _id: new ObjectId(mio_offer_id),
      //   });


        
      // }

     for (const item of itemArray) {
  // Use surface_offer_id if available, otherwise fallback to item._id
  const mioOfferId = item.mio_offer_id || item._id;

  if (mioOfferId && ObjectId.isValid(mioOfferId)) {
    await MIOOfferTable.deleteOne({ _id: new ObjectId(mioOfferId) });
  } else {
    console.warn("Invalid or missing surfaceOfferId for item:", item);
  }
}
 
      sendResponse(
        res,
        200,
        true,
        addMIOIoffer,
        "MIO paint added successfully"
      );
    } else {
      sendResponse(res, 400, false, {}, "MIO paint not added");
    }

     /* ----------------  MIO OFFER EMAIL NOTIFICATION ---------------- */
              
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
              
                const offerDateTime = addMIOIoffer?.createdAt
                  ? new Date(addMIOIoffer.createdAt)
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
              
                      stageName:" Mio Offer Inspection",
                 
              
                      offerNo:
                        addMIOIoffer?.report_no || "-",
              
                      projectName: project || "-",
              
                      workOrderNo:
                        projectDetails?.work_order_no || "-",
              
                      createdBy:
                        offeredUser?.user_name || "-",
              
                      offerDateTime,
              
                      remarks: ` Mio Offer Inspection offer has been generated by ${offeredUser?.user_name} and is ready for QC review.`,
              
                      loginUrl: process.env.ERP_URL
              
                    });
              
                    // await sendEmail({
                    //   to: user.email,
                    //   subject: `${isMio ? " Mio Offer Inspection" : " Mio Paint Offer Inspection"} - ${addMIOIoffer?.report_no}`,
                    //   html
                    // });
              
                     addEmailJob({
                      to: user.email,
                      subject: `${"Mio Offer Inspection"} - ${addMIOIoffer?.report_no}`,
                      html
                    });
              
                    console.log(
                      `MIO offer mail sent -> ${user.email}`
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
                  " MIO EMAIL ERROR:",
                  emailErr
                );
              
              }

  } catch (error) {
    console.log(error);
    sendResponse(res, 500, false, {}, "Something went wrong");
  }
};


exports.getMultiMIOInspectionOffer = async (req, res) => {
  const {
    project_id,
    paint_system_id,
    report_no,
    dispatch_site,
    is_accepted,
    page,
    limit,
    search,
  } = req.body;

  if (!(req.user && !req.error)) {
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

    // Search filter
    let searchFilter = {};
    if (search && search.trim() !== "") {
      const regex = new RegExp(search.trim(), "i");
      searchFilter = {
        $or: [
          { report_no: regex },
          { report_no_two: regex },
          {procedure_no: regex},
          {"items?.dispatch_report": regex}

        ],
      };
    }

    // Check if pagination is to be used
    const usePagination = page && limit;
    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    const pipeline = [
      { $match: { deleted: false } },
      { $unwind: "$items" },

      // Lookup stages
      {
        $lookup: {
          from: "erp-planner-drawings",
          localField: "items.drawing_id",
          foreignField: "_id",
          as: "drawingDetails",
        },
      },
      {
        $lookup: {
          from: "bussiness-projects",
          localField: "drawingDetails.project",
          foreignField: "_id",
          as: "projectDetails",
        },
      },
      {
        $lookup: {
          from: "store-parties",
          localField: "projectDetails.party",
          foreignField: "_id",
          as: "clientDetails",
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
          localField: "items.dispatch_id",
          foreignField: "_id",
          as: "dispatchDetails",
        },
      },
      {
        $lookup: {
          from: "multi-erp-surface-inspections",
          localField: "items.main_id",
          foreignField: "_id",
          as: "surfaceDetails",
        },
      },

      // Flatten arrays
      {
        $addFields: {
          drawingDetails: { $arrayElemAt: ["$drawingDetails", 0] },
          projectDetails: { $arrayElemAt: ["$projectDetails", 0] },
          clientDetails: { $arrayElemAt: ["$clientDetails", 0] },
          gridDetails: { $arrayElemAt: ["$gridDetails", 0] },
          offerDetails: { $arrayElemAt: ["$offerDetails", 0] },
          qcDetails: { $arrayElemAt: ["$qcDetails", 0] },
          procedureDetails: { $arrayElemAt: ["$procedureDetails", 0] },
          paintDetails: { $arrayElemAt: ["$paintDetails", 0] },
          dispatchDetails: { $arrayElemAt: ["$dispatchDetails", 0] },
          surfaceDetails: { $arrayElemAt: ["$surfaceDetails", 0] },
        },
      },

      {
        $match: {
          ...(project_id && { "projectDetails._id": new ObjectId(project_id) }),
          ...matchObj,
          ...searchFilter,
        },
      },

      {
        $project: {
          _id: 1,
          createdAt: 1,
          report_no: 1,
          report_no_two: 1,
          weather_condition: 1,
          procedure_id: "$procedureDetails._id",
          procedure_no: "$procedureDetails.vendor_doc_no",
          offer_date: 1,
          offer_name: "$offerDetails.user_name",
          offer_notes: 1,
          qc_date: 1,
          qc_name: "$qcDetails.user_name",
          qc_notes: 1,
          paint_system_no: "$paintDetails.paint_system_no",
          paint_system_id: "$paintDetails._id",
          start_time: 1,
          end_time: 1,
          mio_date: 1,
          time: 1,
          paint_batch_base: 1,
          manufacture_date: 1,
          shelf_life: 1,
          paint_batch_hardner: 1,
          status: 1,
          isIrn: 1,
          isFinalPaint: 1,
          client: "$clientDetails.name",
          project_name: "$projectDetails.name",
          wo_no: "$projectDetails.work_order_no",
          project_po_no: "$projectDetails.work_order_no",
          items: {
            _id: "$items._id",
            main_id: "$_id",
            surface_id: "$surfaceDetails._id",
            surface_offer_no: "$surfaceDetails.report_no",
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
            dispatch_id: "$dispatchDetails._id",
            dispatch_report: "$dispatchDetails.report_no",
            dispatch_site: "$dispatchDetails.dispatch_site",
            isSurface: "$dispatchDetails.isSurface",
            isMio: "$dispatchDetails.isMio",
            isFp: "$dispatchDetails.isFp",
            isIrn: "$dispatchDetails.isIrn",
            mio_balance_grid_qty: "$items.mio_balance_grid_qty",
            mio_used_grid_qty: "$items.mio_used_grid_qty",
            moved_next_step: "$items.moved_next_step",
            average_dft_mio: "$items.average_dft_mio",
            is_accepted: "$items.is_accepted",
            remarks: "$items.remarks",
          },
        },
      },

      {
        $group: {
          _id: {
            _id: "$_id",
            report_no: "$report_no",
            report_no_two: "$report_no_two",
            weather_condition: "$weather_condition",
            procedure_id: "$procedure_id",
            procedure_no: "$procedure_no",
            offer_date: "$offer_date",
            offer_name: "$offer_name",
            offer_notes: "$offer_notes",
            qc_date: "$qc_date",
            qc_name: "$qc_name",
            qc_notes: "$qc_notes",
            paint_system_no: "$paint_system_no",
            paint_system_id: "$paint_system_id",
            start_time: "$start_time",
            end_time: "$end_time",
            mio_date: "$mio_date",
            time: "$time",
            paint_batch_base: "$paint_batch_base",
            manufacture_date: "$manufacture_date",
            shelf_life: "$shelf_life",
            paint_batch_hardner: "$paint_batch_hardner",
            status: "$status",
            client: "$client",
            project_name: "$project_name",
            wo_no: "$wo_no",
            project_po_no: "$project_po_no",
            createdAt: "$createdAt",
            isIrn:"$isIrn",
            isFinalPaint:"$isFinalPaint",
          },
          items: { $push: "$items" },
        },
      },

      {
        $project: {
          _id: "$_id._id",
          report_no: "$_id.report_no",
          report_no_two: "$_id.report_no_two",
          weather_condition: "$_id.weather_condition",
          procedure_id: "$_id.procedure_id",
          procedure_no: "$_id.procedure_no",
          offer_date: "$_id.offer_date",
          offer_name: "$_id.offer_name",
          offer_notes: "$_id.offer_notes",
          qc_date: "$_id.qc_date",
          qc_name: "$_id.qc_name",
          qc_notes: "$_id.qc_notes",
          paint_system_no: "$_id.paint_system_no",
          paint_system_id: "$_id.paint_system_id",
          start_time: "$_id.start_time",
          end_time: "$_id.end_time",
          mio_date: "$_id.mio_date",
          time: "$_id.time",
          paint_batch_base: "$_id.paint_batch_base",
          manufacture_date: "$_id.manufacture_date",
          shelf_life: "$_id.shelf_life",
          paint_batch_hardner: "$_id.paint_batch_hardner",
          status: "$_id.status",
          client: "$_id.client",
          project_name: "$_id.project_name",
          wo_no: "$_id.wo_no",
          project_po_no: "$_id.project_po_no",
          createdAt: "$_id.createdAt",
          isIrn:"$_id.isIrn",
          isFinalPaint:"$_id.isFinalPaint",
          items: 1,
        },
      },
    ];

    let result;

    if (usePagination) {
      const aggregateWithPagination = [
        ...pipeline,
        { $sort: { createdAt: -1 } },
        {
          $facet: {
            data: [{ $skip: skip }, { $limit: limitNumber }],
            totalCount: [{ $count: "total" }],
          },
        },
      ];

      result = await MioInspection.aggregate(aggregateWithPagination);
      const requestData = result[0]?.data || [];
      const total = result[0]?.totalCount[0]?.total || 0;

      sendResponse(res, 200, true, {
        data: requestData,
        pagination: {
          total,
          page: pageNumber,
          limit: limitNumber,
          totalPages: Math.ceil(total / limitNumber),
        },
      }, `MIO data list`);

    } else {
      const allData = await MioInspection.aggregate([
        ...pipeline,
        { $sort: { createdAt: -1 } },
      ]);

      sendResponse(res, 200, true, {
        data: allData,
        pagination: null,
      }, `MIO data list (no pagination)`);
    }

  } catch (error) {
    console.error(error);
    sendResponse(res, 500, false, {}, "Something went wrong");
  }
};

exports.getMultiMIOInspectionOfferViewPage = async (req, res) => {
  const {
    project_id,
    paint_system_id,
    report_no,
    dispatch_site,
    is_accepted,
    page,
    limit,
    search,
  } = req.body;

  if (!(req.user && !req.error)) {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }

  try {
    const matchObj = { deleted: false };

    if (paint_system_id) matchObj.paint_system_id = new ObjectId(paint_system_id);
    if (report_no) matchObj.report_no = report_no;
    if (dispatch_site) matchObj["dispatchDetails.dispatch_site"] = dispatch_site;
    if (is_accepted !== undefined) matchObj["items.is_accepted"] = JSON.parse(is_accepted);

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const doPagination = pageNum > 0 && limitNum > 0;
    const skipNum = doPagination ? (pageNum - 1) * limitNum : 0;

    const pipeline = [
      { $match: matchObj },

      // Lookup drawings
      {
        $lookup: {
          from: "erp-planner-drawings",
          localField: "items.drawing_id",
          foreignField: "_id",
          as: "drawingDocs"
        }
      },

      // Project lookup through drawing.project
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

      // Main lookups
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
      {
        $lookup: {
          from: "procedure_and_specifications",
          localField: "procedure_no",
          foreignField: "_id",
          as: "procedureDetails"
        }
      },

      // Unwind items
      {
        $unwind: {
          path: "$items",
          preserveNullAndEmptyArrays: true
        }
      },

      // Item-level lookups
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
          localField: "items.dispatch_id",
          foreignField: "_id",
          as: "dispatchDetails"
        }
      },
      {
        $lookup: {
          from: "multi-erp-surface-inspections",
          localField: "items.main_id",
          foreignField: "_id",
          as: "surfaceDetails"
        }
      },

      // Add enriched fields
      {
        $addFields: {
          "items.drawing_no": {
            $cond: {
              if: { $ifNull: ["$items.drawing_no", false] },
              then: "$items.drawing_no",
              else: { $arrayElemAt: ["$drawingDetails.drawing_no", 0] }
            }
          },
          "items.rev": { $arrayElemAt: ["$drawingDetails.rev", 0] },
          "items.assembly_no": { $arrayElemAt: ["$drawingDetails.assembly_no", 0] },
          "items.assembly_quantity": { $arrayElemAt: ["$drawingDetails.assembly_quantity", 0] },
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
          "items.dispatch_site": { $arrayElemAt: ["$dispatchDetails.dispatch_site", 0] },
          "items.surface_offer_no": { $arrayElemAt: ["$surfaceDetails.report_no", 0] },
        }
      },

      // Group back documents
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

      // Flatten single doc arrays
      {
        $addFields: {
          offer_name: { $arrayElemAt: ["$offerDetails.user_name", 0] },
          qc_name: { $arrayElemAt: ["$qcDetails.user_name", 0] },
          paint_system_no: { $arrayElemAt: ["$paintDetails.paint_system_no", 0] },
          procedure_no: { $arrayElemAt: ["$procedureDetails.vendor_doc_no", 0] },
          procedure_id: { $arrayElemAt: ["$procedureDetails._id", 0] },
          procedure_revision: { $arrayElemAt: ["$procedureDetails.revision", 0] },
        }
      },

      // Search
      ...(search && search.trim()
        ? [{
            $match: {
              $or: [
                { report_no: new RegExp(search.trim(), "i") },
                { report_no_two: new RegExp(search.trim(), "i") },
                { procedure_no: new RegExp(search.trim(), "i") },
                { "items.dispatch_report": new RegExp(search.trim(), "i") }
              ]
            }
          }]
        : []),

      { $sort: { createdAt: -1 } }
    ];

    // Count total
    const countPipeline = [...pipeline, { $count: "total" }];
    const countResult = await MioInspection.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Apply pagination
    if (doPagination) {
      pipeline.push({ $skip: skipNum }, { $limit: limitNum });
    }

    const result = await MioInspection.aggregate(pipeline);

    return sendResponse(res, 200, true, {
      data: result,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    }, "MIO Inspection Offers");
  } catch (error) {
    console.error("Error in getMultiMIOInspectionOffer:", error);
    return sendResponse(res, 500, false, {}, "Something went wrong");
  }
};

exports.getMultiMIOInspectionClearance = async (req, res) => {
  const {
    project_id,
    paint_system_id,
    report_no,
    dispatch_site,
    is_accepted,
    page,
    limit,
    search,
  } = req.body;

  if (!(req.user && !req.error)) {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }

  try {

    let matchObj = {
   status: { $ne: 1 } // status EQUAL to 1
};
    // const matchObj = { deleted: false };

    if (paint_system_id) matchObj.paint_system_id = new ObjectId(paint_system_id);
    if (report_no) matchObj.report_no = report_no;
    if (dispatch_site) matchObj["dispatchDetails.dispatch_site"] = dispatch_site;
    if (is_accepted !== undefined) matchObj["items.is_accepted"] = JSON.parse(is_accepted);

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const doPagination = pageNum > 0 && limitNum > 0;
    const skipNum = doPagination ? (pageNum - 1) * limitNum : 0;

    const pipeline = [
      { $match: matchObj },

      // Lookup drawings
      {
        $lookup: {
          from: "erp-planner-drawings",
          localField: "items.drawing_id",
          foreignField: "_id",
          as: "drawingDocs"
        }
      },

      // Project lookup through drawing.project
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


      // Main lookups
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
      {
        $lookup: {
          from: "procedure_and_specifications",
          localField: "procedure_no",
          foreignField: "_id",
          as: "procedureDetails"
        }
      },

      // Unwind items
      {
        $unwind: {
          path: "$items",
          preserveNullAndEmptyArrays: true
        }
      },

      // Item-level lookups
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
          localField: "items.dispatch_id",
          foreignField: "_id",
          as: "dispatchDetails"
        }
      },
      {
        $lookup: {
          from: "multi-erp-surface-inspections",
          localField: "items.main_id",
          foreignField: "_id",
          as: "surfaceDetails"
        }
      },

      // Add enriched fields
      {
        $addFields: {
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
          "items.dispatch_site": { $arrayElemAt: ["$dispatchDetails.dispatch_site", 0] },
          "items.surface_offer_no": { $arrayElemAt: ["$surfaceDetails.report_no", 0] },
        }
      },

      // Group back documents
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

      // Flatten single doc arrays
      {
        $addFields: {
          offer_name: { $arrayElemAt: ["$offerDetails.user_name", 0] },
          qc_name: { $arrayElemAt: ["$qcDetails.user_name", 0] },
          paint_system_no: { $arrayElemAt: ["$paintDetails.paint_system_no", 0] },
          procedure_no: { $arrayElemAt: ["$procedureDetails.vendor_doc_no", 0] },
          procedure_id: { $arrayElemAt: ["$procedureDetails._id", 0] },
          procedure_revision: { $arrayElemAt: ["$procedureDetails.revision", 0] },
        }
      },

      // Search
      ...(search && search.trim()
        ? [{
            $match: {
              $or: [
                { report_no: new RegExp(search.trim(), "i") },
                { report_no_two: new RegExp(search.trim(), "i") },
                { procedure_no: new RegExp(search.trim(), "i") },
                { "items.dispatch_report": new RegExp(search.trim(), "i") }
              ]
            }
          }]
        : []),

      { $sort: { createdAt: -1 } }
    ];

    // Count total
    const countPipeline = [...pipeline, { $count: "total" }];
    const countResult = await MioInspection.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Apply pagination
    if (doPagination) {
      pipeline.push({ $skip: skipNum }, { $limit: limitNum });
    }

    const result = await MioInspection.aggregate(pipeline);

    return sendResponse(res, 200, true, {
      data: result,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    }, "MIO Inspection Offers");
  } catch (error) {
    console.error("Error in getMultiMIOInspectionOffer:", error);
    return sendResponse(res, 500, false, {}, "Something went wrong");
  }
};
// exports.getMultiMIOInspectionClearance = async (req, res) => {
//   const {
//     project_id,
//     paint_system_id,
//     report_no,
//     dispatch_site,
//     is_accepted,
//     page,
//     limit,
//     search,
//   } = req.body;

//   if (!(req.user && !req.error)) {
//     return sendResponse(res, 401, false, {}, "Unauthorized");
//   }

//   try {

// let matchObj = {
//    status: { $ne: 1 } // status EQUAL to 1
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

//     // Search filter


//         let searchFilter = {};
//     if (search && search.trim() !== "") {
//       const regex = new RegExp(search.trim(), "i");
//       searchFilter = {
//         $or: [
        
//           { report_no_two: regex },
        

//         ],
//       };
//     }

//     // Check if pagination is to be used
//     const usePagination = page && limit;
//     const pageNumber = Number(page) || 1;
//     const limitNumber = Number(limit) || 10;
//     const skip = (pageNumber - 1) * limitNumber;

//     const pipeline = [
//       { $match: { deleted: false } },
//       { $unwind: "$items" },

//       // Lookup stages
//       {
//         $lookup: {
//           from: "erp-planner-drawings",
//           localField: "items.drawing_id",
//           foreignField: "_id",
//           as: "drawingDetails",
//         },
//       },
//       {
//         $lookup: {
//           from: "bussiness-projects",
//           localField: "drawingDetails.project",
//           foreignField: "_id",
//           as: "projectDetails",
//         },
//       },
//       {
//         $lookup: {
//           from: "store-parties",
//           localField: "projectDetails.party",
//           foreignField: "_id",
//           as: "clientDetails",
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
//           localField: "items.dispatch_id",
//           foreignField: "_id",
//           as: "dispatchDetails",
//         },
//       },
//       {
//         $lookup: {
//           from: "multi-erp-surface-inspections",
//           localField: "items.main_id",
//           foreignField: "_id",
//           as: "surfaceDetails",
//         },
//       },

//       // Flatten arrays
//       {
//         $addFields: {
//           drawingDetails: { $arrayElemAt: ["$drawingDetails", 0] },
//           projectDetails: { $arrayElemAt: ["$projectDetails", 0] },
//           clientDetails: { $arrayElemAt: ["$clientDetails", 0] },
//           gridDetails: { $arrayElemAt: ["$gridDetails", 0] },
//           offerDetails: { $arrayElemAt: ["$offerDetails", 0] },
//           qcDetails: { $arrayElemAt: ["$qcDetails", 0] },
//           procedureDetails: { $arrayElemAt: ["$procedureDetails", 0] },
//           paintDetails: { $arrayElemAt: ["$paintDetails", 0] },
//           dispatchDetails: { $arrayElemAt: ["$dispatchDetails", 0] },
//           surfaceDetails: { $arrayElemAt: ["$surfaceDetails", 0] },
//         },
//       },

//       {
//         $match: {
//           ...(project_id && { "projectDetails._id": new ObjectId(project_id) }),
//           ...matchObj,
//           ...searchFilter,
//         },
//       },

//       {
//         $project: {
//           _id: 1,
//           createdAt: 1,
//           report_no: 1,
//           report_no_two: 1,
//           weather_condition: 1,
//           procedure_id: "$procedureDetails._id",
//           procedure_no: "$procedureDetails.vendor_doc_no",
//           offer_date: 1,
//           offer_name: "$offerDetails.user_name",
//           offer_notes: 1,
//           qc_date: 1,
//           qc_name: "$qcDetails.user_name",
//           qc_notes: 1,
//           paint_system_no: "$paintDetails.paint_system_no",
//           paint_system_id: "$paintDetails._id",
//           start_time: 1,
//           end_time: 1,
//           mio_date: 1,
//           time: 1,
//           paint_batch_base: 1,
//           manufacture_date: 1,
//           shelf_life: 1,
//           paint_batch_hardner: 1,
//           status: 1,
//           client: "$clientDetails.name",
//           project_name: "$projectDetails.name",
//           wo_no: "$projectDetails.work_order_no",
//           project_po_no: "$projectDetails.work_order_no",
//           items: {
//             _id: "$items._id",
//             main_id: "$_id",
//             surface_id: "$surfaceDetails._id",
//             surface_offer_no: "$surfaceDetails.report_no",
//             drawing_id: "$drawingDetails._id",
//             drawing_no: "$drawingDetails.drawing_no",
//             rev: "$drawingDetails.rev",
//             unit_area: "$drawingDetails.unit",
//             sheet_no: "$drawingDetails.sheet_no",
//             assembly_no: "$drawingDetails.assembly_no",
//             assembly_quantity: "$drawingDetails.assembly_quantity",
//             grid_id: "$gridDetails._id",
//             grid_no: "$gridDetails.grid_no",
//             grid_qty: "$gridDetails.grid_qty",
//             dispatch_id: "$dispatchDetails._id",
//             dispatch_report: "$dispatchDetails.report_no",
//             dispatch_site: "$dispatchDetails.dispatch_site",
//             isSurface: "$dispatchDetails.isSurface",
//             isMio: "$dispatchDetails.isMio",
//             isFp: "$dispatchDetails.isFp",
//             isIrn: "$dispatchDetails.isIrn",
//             mio_balance_grid_qty: "$items.mio_balance_grid_qty",
//             mio_used_grid_qty: "$items.mio_used_grid_qty",
//             moved_next_step: "$items.moved_next_step",
//             average_dft_mio: "$items.average_dft_mio",
//             is_accepted: "$items.is_accepted",
//             remarks: "$items.remarks",
//           },
//         },
//       },

//       {
//         $group: {
//           _id: {
//             _id: "$_id",
//             report_no: "$report_no",
//             report_no_two: "$report_no_two",
//             weather_condition: "$weather_condition",
//             procedure_id: "$procedure_id",
//             procedure_no: "$procedure_no",
//             offer_date: "$offer_date",
//             offer_name: "$offer_name",
//             offer_notes: "$offer_notes",
//             qc_date: "$qc_date",
//             qc_name: "$qc_name",
//             qc_notes: "$qc_notes",
//             paint_system_no: "$paint_system_no",
//             paint_system_id: "$paint_system_id",
//             start_time: "$start_time",
//             end_time: "$end_time",
//             mio_date: "$mio_date",
//             time: "$time",
//             paint_batch_base: "$paint_batch_base",
//             manufacture_date: "$manufacture_date",
//             shelf_life: "$shelf_life",
//             paint_batch_hardner: "$paint_batch_hardner",
//             status: "$status",
//             client: "$client",
//             project_name: "$project_name",
//             wo_no: "$wo_no",
//             project_po_no: "$project_po_no",
//             createdAt: "$createdAt",
//           },
//           items: { $push: "$items" },
//         },
//       },

//       {
//         $project: {
//           _id: "$_id._id",
//           report_no: "$_id.report_no",
//           report_no_two: "$_id.report_no_two",
//           weather_condition: "$_id.weather_condition",
//           procedure_id: "$_id.procedure_id",
//           procedure_no: "$_id.procedure_no",
//           offer_date: "$_id.offer_date",
//           offer_name: "$_id.offer_name",
//           offer_notes: "$_id.offer_notes",
//           qc_date: "$_id.qc_date",
//           qc_name: "$_id.qc_name",
//           qc_notes: "$_id.qc_notes",
//           paint_system_no: "$_id.paint_system_no",
//           paint_system_id: "$_id.paint_system_id",
//           start_time: "$_id.start_time",
//           end_time: "$_id.end_time",
//           mio_date: "$_id.mio_date",
//           time: "$_id.time",
//           paint_batch_base: "$_id.paint_batch_base",
//           manufacture_date: "$_id.manufacture_date",
//           shelf_life: "$_id.shelf_life",
//           paint_batch_hardner: "$_id.paint_batch_hardner",
//           status: "$_id.status",
//           client: "$_id.client",
//           project_name: "$_id.project_name",
//           wo_no: "$_id.wo_no",
//           project_po_no: "$_id.project_po_no",
//           createdAt: "$_id.createdAt",
//           items: 1,
//         },
//       },
//     ];

//     let result;

//     if (usePagination) {
//       const aggregateWithPagination = [
//         ...pipeline,
//         { $sort: { createdAt: -1 } },
//         {
//           $facet: {
//             data: [{ $skip: skip }, { $limit: limitNumber }],
//             totalCount: [{ $count: "total" }],
//           },
//         },
//       ];

//       result = await MioInspection.aggregate(aggregateWithPagination);
//       const requestData = result[0]?.data || [];
//       const total = result[0]?.totalCount[0]?.total || 0;

//       sendResponse(res, 200, true, {
//         data: requestData,
//         pagination: {
//           total,
//           page: pageNumber,
//           limit: limitNumber,
//           totalPages: Math.ceil(total / limitNumber),
//         },
//       }, `MIO data list`);

//     } else {
//       const allData = await MioInspection.aggregate([
//         ...pipeline,
//         { $sort: { createdAt: -1 } },
//       ]);

//       sendResponse(res, 200, true, {
//         data: allData,
//         pagination: null,
//       }, `MIO data list (no pagination)`);
//     }

//   } catch (error) {
//     console.error(error);
//     sendResponse(res, 500, false, {}, "Something went wrong");
//   }
// };

async function getLastInspection(project) {
  try {
    const pipeline = [
      {
        $match: {
          deleted: false,
          report_no_two: {
            $regex: `^VE/${project}/STR/MIO/\\d+$`,
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

    const [lastInspection] = await MioInspection.aggregate(pipeline);
    console.log("Aggregation result:", lastInspection); // Debug log
    return lastInspection || null;
  } catch (error) {
    console.error("Error fetching last inspection:", error);
    throw error;
  }
}

// exports.verifyMIOQcDetails = async (req, res) => {
//   const { id, items,dispatch_id, dispatch_used_grid_qty, qc_name, project, qc_notes, isFinalPaint, isIrn } = req.body;

//   if (!req.user || req.error) {
//     return sendResponse(res, 401, false, {}, "Unauthorized");
//   }

//   const itemArray = JSON.parse(items);
//   // const itemArray = items;

//   if (!id || itemArray.length === 0 || !qc_name || !project) {
//     return sendResponse(res, 400, false, {}, "Missing parameter");
//   }

//    // Convert to boolean
//     const isFinalPaintBooL = isFinalPaint === true || isFinalPaint === "true";
//     const isIrnBool = isIrn === true || isIrn === "true";

//     // Only one allowed
//     if (isFinalPaintBooL && isIrnBool) {
//       return sendResponse(res, 400, false, {}, "Only one release type allowed");
//     }

//     if (!isFinalPaintBooL && !isIrnBool) {
//       return sendResponse(res, 400, false, {}, "Release type is required");
//     }

//   try {
//     // let lastInspection = await MioInspection.findOne(
//     //     { deleted: false, report_no_two: { $regex: `/${project}/` } }, {}, { sort: { updatedAt: -1 } }
//     // );
//     const lastInspection = await getLastInspection(project);
//     let inspectionNo = "1";
//     if (lastInspection && lastInspection.report_no_two) {
//       const split = lastInspection.report_no_two.split("/");
//       const lastInspectionNo = parseInt(split[split.length - 1]);
//       inspectionNo = lastInspectionNo + 1;
//     }
//     const gen_report_no =
//       TitleFormat.MIOINSPECTNO.replace("/PROJECT/", `/${project}/`) +
//       inspectionNo;

//     let mioInspection = await MioInspection.findById(id);
//     if (!mioInspection) {
//       return sendResponse(res, 404, false, {}, "MIO inspection not found");
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

//     const verifyMIO = await MioInspection.findByIdAndUpdate(
//       { _id: id },
//       {
//         report_no_two: gen_report_no,
//         qc_name: qc_name,
//         qc_date: new Date(),
//         qc_notes: qc_notes,
//         status: status,
//         isFinalPaint: isFinalPaintBooL,
//         isIrn: isIrnBool,
//       },
//       { new: true }
//     );
//     console.log("verifyMIO:", verifyMIO);
//     let matchedCount = 0;
//     let modifiedCount = 0;

//     for (const item of itemArray) {
//       const { _id, average_dft_mio, is_accepted } = item;
//       const result = await MioInspection.updateOne(
//         { _id: id, "items._id": _id },
//         {
//           $set: {
//             "items.$.average_dft_mio": average_dft_mio,
//             "items.$.is_accepted": is_accepted,
//           },
//         }
//       );
//       matchedCount += result.matchedCount;
//       modifiedCount += result.modifiedCount;
//     }

//     if (
//       verifyMIO &&
//       matchedCount === modifiedCount &&
//       matchedCount === itemArray.length
//     ) {
//       for (const item of itemArray) {
//         const {
//           surface_id,
//           drawing_id,
//           grid_id,
//           mio_used_grid_qty,
//           is_accepted,
//         } = item;
//         console.log("item",item);
//         console.log("surface_id",surface_id);
//         console.log("is_accepted:", is_accepted);
//         if (is_accepted === 3 || is_accepted === 2) {
//           console.log("checking in surfACE ")
//           const result = await SurfaceInspection.updateOne(
//             {
//               _id: surface_id,
//               "items.drawing_id": drawing_id,
//               "items.grid_id": grid_id,
//             },
//             {
//               $inc: {
//                 "items.$.moved_next_step": -mio_used_grid_qty,
//               },
//             }
//           );
//           console.log("result in surfACE ", result)

//         } else if (is_accepted === 2) {
//           if (
//             (mioInspection.isIrn === "true" || mioInspection.isIrn === true) &&
//             (mioInspection.isMio === "true" || mioInspection.isMio === true)
//           ) {
//             console.log("Dispatch note working")

//                 const result = await DispatchNote.updateOne(
//             {
//              _id: dispatch_id,
//               "items.drawing_id": drawing_id,
//               "items.grid_id": grid_id,
//             },
//             {
//               $inc: {
//                 // "items.$.moved_next_step": -mio_used_grid_qty,
//                 "items.$.dispatch_used_grid_qty": mio_used_grid_qty,
//                 "items.$.mio_balance_grid_qty": -mio_used_grid_qty,
//               },
//             }
//           );
//           console.log("moved_next_step updated in Dispatch Note:", items.moved_next_step);
//             console.log("Dispatch Note updated:", result);
//           //  console.log("result:", result);
//             console.log("itemArray",itemArray[0]);
       
//             const release_note = await addMioReleaseNote({
//               itemArray: itemArray,
//               //   id: result._id,
//               id: id,
//               isMio: mioInspection.isMio,
//               isIrn: mioInspection.isIrn,
//             });
//             console.log(
//               "Mio:::::::::::::::::Release note added:",
//               release_note
//             );
//           }
//         }
//       }
//       return sendResponse(res, 200, true, {}, "MIO verified successfully");
//     } else {
//       return sendResponse(res, 400, false, {}, "MIO not verified");
//     }
//   } catch (error) {
//     console.log(error);
//     sendResponse(res, 500, false, {}, "Something went wrong");
//   }
// };

// const getMIOInspectionOfferFunction = async (report_no, report_no_two) => {
//   try {
//     let matchObj = { deleted: false };
//     if (report_no) {
//       matchObj = { ...matchObj, report_no: report_no };
//     }
//     if (report_no_two) {
//       matchObj = { ...matchObj, report_no_two: report_no_two };
//     }

//     let requestData = await MioInspection.aggregate([
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
//           localField: "items.dispatch_id",
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
//           offer_notes: "$offer_notes",
//           offer_name: "$offerDetails.user_name",
//           qc_date: "$qc_date",
//           qc_notes: "$qc_notes",
//           qc_name: "$qcDetails.user_name",
//           start_time: "$start_time",
//           end_time: "$end_time",
//           paint_system_no: "$paintDetails.paint_system_no",
//           paint_system_id: "$paintDetails._id",
//           mio_paint: "$paintDetails.mio_paint",
//           mio_app_method: "$paintDetails.mio_app_method",
//           mio_dft_range: "$paintDetails.mio_dft_range",
//           paint_manufacturer: "$paintManDetails.name",
//           mio_date: "$mio_date",
//           time: "$time",
//           paint_batch_base: "$paint_batch_base",
//           manufacture_date: "$manufacture_date",
//           shelf_life: "$shelf_life",
//           paint_batch_hardner: "$paint_batch_hardner",
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
//             mio_used_grid_qty: "$items.mio_used_grid_qty",
//             remarks: "$items.remarks",
//             ...(report_no_two && {
//               average_dft_mio: "$items.average_dft_mio",
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
//             procedure_no: "$procedure_no",
//             offer_date: "$offer_date",
//             offer_notes: "$offer_notes",
//             offer_name: "$offer_name",
//             qc_date: "$qc_date",
//             qc_notes: "$qc_notes",
//             qc_name: "$qc_name",
//             start_time: "$start_time",
//             end_time: "$end_time",
//             paint_system_no: "$paint_system_no",
//             paint_system_id: "$paint_system_id",
//             mio_paint: "$mio_paint",
//             mio_app_method: "$mio_app_method",
//             mio_dft_range: "$mio_dft_range",
//             paint_manufacturer: "$paint_manufacturer",
//             mio_date: "$mio_date",
//             time: "$time",
//             paint_batch_base: "$paint_batch_base",
//             manufacture_date: "$manufacture_date",
//             shelf_life: "$shelf_life",
//             paint_batch_hardner: "$paint_batch_hardner",
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
//           procedure_no: "$_id.procedure_no",
//           offer_date: "$_id.offer_date",
//           offer_notes: "$_id.offer_notes",
//           offer_name: "$_id.offer_name",
//           qc_date: "$_id.qc_date",
//           qc_notes: "$_id.qc_notes",
//           qc_name: "$_id.qc_name",
//           start_time: "$_id.start_time",
//           end_time: "$_id.end_time",
//           paint_system_no: "$_id.paint_system_no",
//           paint_system_id: "$_id.paint_system_id",
//           mio_paint: "$_id.mio_paint",
//           mio_app_method: "$_id.mio_app_method",
//           mio_dft_range: "$_id.mio_dft_range",
//           paint_manufacturer: "$_id.paint_manufacturer",
//           mio_date: "$_id.mio_date",
//           time: "$_id.time",
//           paint_batch_base: "$_id.paint_batch_base",
//           manufacture_date: "$_id.manufacture_date",
//           shelf_life: "$_id.shelf_life",
//           paint_batch_hardner: "$_id.paint_batch_hardner",
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

//     if (requestData.length && requestData.length > 0) {
//       return { status: 1, result: requestData };
//     } else {
//       return { status: 0, result: [] };
//     }
//   } catch (error) {
//     console.log(error);
//     return { status: 2, result: error };
//   }
// };


// const getMIOInspectionOfferFunction = async (report_no, report_no_two) => {
//   try {
//     let matchObj = { deleted: false };
//     if (report_no) matchObj.report_no = report_no;
//     if (report_no_two) matchObj.report_no_two = report_no_two;

//     let requestData = await MioInspection.aggregate([
//       { $match: matchObj },
//       { $unwind: "$items" },

//       // Lookup drawings with nested project and client
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

//       // Lookup grids
//       {
//         $lookup: {
//           from: "erp-drawing-grids",
//           localField: "items.grid_id",
//           foreignField: "_id",
//           as: "gridDetails",
//         },
//       },

//       // Lookup users
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

//       // Lookup procedure
//       {
//         $lookup: {
//           from: "procedure_and_specifications",
//           localField: "procedure_no",
//           foreignField: "_id",
//           as: "procedureDetails",
//         },
//       },

//       // Lookup painting system with manufacturer
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

//       // Lookup dispatch
//       {
//         $lookup: {
//           from: "multi-erp-painting-dispatch-notes",
//           localField: "items.dispatch_id",
//           foreignField: "_id",
//           as: "dispatchDetails",
//         },
//       },

//       // Add first elements
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
//           projectDetails: { $arrayElemAt: ["$drawingDetails.projectDetails", 0] },
//           paintManDetails: { $arrayElemAt: ["$paintDetails.paintManDetails", 0] },
//           clientDetails: { $arrayElemAt: ["$projectDetails.clientDetails", 0] },
//         },
//       },
      

//       // Merge manual fields if present, else fallback to lookup
//       {
//         $addFields: {
//             projectDetails: { $arrayElemAt: ["$drawingDetails.projectDetails", 0] },
//   paintManDetails: { $arrayElemAt: ["$paintDetails.paintManDetails", 0] },
//   clientDetails: { $arrayElemAt: ["$projectDetails.clientDetails", 0] },
//           "items.drawing_no": { $ifNull: ["$items.drawing_no", "$drawingDetails.drawing_no"] },
//           "items.rev": { $ifNull: ["$items.rev", "$drawingDetails.rev", "-"] },
//           "items.sheet_no": { $ifNull: ["$items.sheet_no", "$drawingDetails.sheet_no"] },
//           "items.assembly_no": { $ifNull: ["$items.item_name", "$drawingDetails.assembly_no"] },
//           "items.assembly_quantity": { $ifNull: ["$items.assembly_quantity", "$drawingDetails.assembly_quantity"] },
//           "items.grid_no": { $ifNull: ["$items.grid_no", "$gridDetails.grid_no"] },
//           "items.grid_qty": { $ifNull: ["$items.grid_qty", "$gridDetails.grid_qty"] },
//           "items.dispatch_report": { $ifNull: ["$items.dispatch_report", "$dispatchDetails.report_no"] },
//           "items.dispatch_site": { $ifNull: ["$items.dispatch_site", "$dispatchDetails.dispatch_site"] },
//           "items.average_dft_mio": { $ifNull: ["$items.average_dft_mio", "$items.average_dft_mio"] },
//           "items.accept": {
//             $cond: [
//               { $eq: ["$items.is_accepted", 2] },
//               "ACC",
//               { $cond: [{ $eq: ["$items.is_accepted", 3] }, "REJ", "--"] },
//             ],
//           },
//         },
//       },

//       // Group back items
//       {
//         $group: {
//           _id: "$_id",
//           report_no: { $first: "$report_no" },
//           weather_condition: { $first: "$weather_condition" },
//           procedure_no: { $first: "$procedureDetails.vendor_doc_no" },
//           offer_date: { $first: "$offer_date" },
//           offer_notes: { $first: "$offer_notes" },
//           offer_name: { $first: "$offerDetails.user_name" },
//           qc_date: { $first: "$qc_date" },
//           qc_notes: { $first: "$qc_notes" },
//           qc_name: { $first: "$qcDetails.user_name" },
//           start_time: { $first: "$start_time" },
//           end_time: { $first: "$end_time" },
//           mio_paint: { $first: "$paintDetails.mio_paint" },
//           mio_app_method: { $first: "$paintDetails.mio_app_method" },
//           mio_dft_range: { $first: "$paintDetails.mio_dft_range" },
//           paint_manufacturer: { $first: "$paintManDetails.name" },
//           mio_date: { $first: "$mio_date" },
//           time: { $first: "$time" },
//           paint_batch_base: { $first: "$paint_batch_base" },
//           manufacture_date: { $first: "$manufacture_date" },
//           shelf_life: { $first: "$shelf_life" },
//           paint_batch_hardner: { $first: "$paint_batch_hardner" },
//           status: { $first: "$status" },
//           client: { $first: "$clientDetails.name" },
//           project_name: { $first: "$projectDetails.name" },
//           wo_no: { $first: "$projectDetails.work_order_no" },
//           project_po_no: { $first: "$projectDetails.work_order_no" },
//           items: { $push: "$items" },
//         },
//       },

//       { $sort: { createdAt: -1 } },
//     ]);

//     if (requestData.length > 0) {
//       return { status: 1, result: requestData };
//     } else {
//       return { status: 0, result: [] };
//     }
//   } catch (error) {
//     console.log(error);
//     return { status: 2, result: error };
//   }
// };

exports.verifyMIOQcDetails = async (req, res) => {
  const {
    id,
    items,
    dispatch_id,
    qc_name,
    project,
    project_id,
    qc_notes,
    isFinalPaint,
    isIrn,
  } = req.body;

  if (!req.user || req.error) {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }

  const itemArray = JSON.parse(items);

  if (!id || itemArray.length === 0 || !qc_name || !project) {
    return sendResponse(res, 400, false, {}, "Missing parameter");
  }

  // Convert to boolean
  const isFinalPaintBool = isFinalPaint === true || isFinalPaint === "true";
  const isIrnBool = isIrn === true || isIrn === "true";

  // Only one allowed
  if (isFinalPaintBool && isIrnBool) {
    return sendResponse(res, 400, false, {}, "Only one release type allowed");
  }

  if (!isFinalPaintBool && !isIrnBool) {
    return sendResponse(res, 400, false, {}, "Release type is required");
  }

  try {
    // Generate report number
    const lastInspection = await getLastInspection(project);
    let inspectionNo = 1;
    if (lastInspection?.report_no_two) {
      const split = lastInspection.report_no_two.split("/");
      inspectionNo = parseInt(split[split.length - 1]) + 1;
    }

    const gen_report_no =
      TitleFormat.MIOINSPECTNO.replace("/PROJECT/", `/${project}/`) +
      inspectionNo;

    const mioInspection = await MioInspection.findById(id);
    if (!mioInspection) {
      return sendResponse(res, 404, false, {}, "MIO inspection not found");
    }

    // Determine status
    let status = 1; // Pending
    if (itemArray.every((item) => item.is_accepted === 2)) status = 3; // Approved
    else if (itemArray.every((item) => item.is_accepted === 3)) status = 4; // Rejected
    else if (
      itemArray.some((item) => item.is_accepted === 2) &&
      itemArray.some((item) => item.is_accepted === 3)
    )
      status = 2; // Partially Accepted

    // Update main inspection
    const verifyMIO = await MioInspection.findByIdAndUpdate(
      id,
      {
        report_no_two: gen_report_no,
        qc_name,
        qc_date: new Date(),
        qc_notes,
        status,
        isFinalPaint: isFinalPaintBool,
        isIrn: isIrnBool,
      },
      { new: true }
    );

    // Update items in MioInspection
    for (const item of itemArray) {
      await MioInspection.updateOne(
        { _id: id, "items._id": item._id },
        {
          $set: {
            "items.$.average_dft_mio": item.average_dft_mio,
            "items.$.is_accepted": item.is_accepted,
          },
        }
      );
    }

    // Update SurfaceInspection and DispatchNote
    for (const item of itemArray) {
      const { surface_id, drawing_id, grid_id, mio_used_grid_qty, is_accepted } = item;

      // Surface update for Accepted or Rejected
      if (is_accepted === 2 || is_accepted === 3) {
        await SurfaceInspection.updateOne(
          { _id: surface_id, "items.drawing_id": drawing_id, "items.grid_id": grid_id },
          { $inc: { "items.$.moved_next_step": -mio_used_grid_qty } }
        );
      }

      // Dispatch update ONLY for Accepted items AND IRN = true
      if (is_accepted === 2 ) {
        await DispatchNote.updateOne(
          { _id: dispatch_id, "items.drawing_id": drawing_id, "items.grid_id": grid_id },
          {
            $inc: {
              "items.$.dispatch_used_grid_qty": mio_used_grid_qty,
              "items.$.mio_balance_grid_qty": -mio_used_grid_qty,
            },
          }
        );
      }
    }

    // Add Release Note if IRN = true, status = 3, and at least one accepted item
    const hasAcceptedItem = itemArray.some((i) => i.is_accepted === 2);

    if (verifyMIO.isIrn === true && verifyMIO.status === 3 && hasAcceptedItem) {
    //  
        await addMioReleaseNote({
          itemArray,
          id: verifyMIO._id,
          isIrn: true,
          isFinalPaint: false,
        });
    }

        /* ----------------  MIO QC EMAIL ---------------- */
        
        try {
        
          const qcUser = await User.findById(qc_name);
        
          const projectDetails = await Project.findById(
            verifyMIO.project_id
          );
        
          let users = [];
        
          // surface offer creator
          const offeredUser = await User.findById(
            verifyMIO.offered_by
          );
        
          /* ---------------- ACCEPTED ---------------- */
          if (verifyMIO.status === 3) {
        
            // Only send to production if MIO process
            if (verifyMIO.isFinalPaint) {
        
              const roles = await ErpRole.find({
                deleted: false,
                name: {
                  $in: ["Production Engineer"]
                }
              });
        
              const roleIds = roles.map(
                role => role._id
              );
        
              users = await User.find({
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
        
            // If IRN true → planning
            else if (verifyMIO.isIrn) {
        
              const roles = await ErpRole.find({
                deleted: false,
                name: {
                  $in: ["QC Engineer"]
                }
              });
        
              const roleIds = roles.map(
                role => role._id
              );
        
              users = await User.find({
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
        
          }
        
          /* ---------------- REJECTED ---------------- */
        
          else if (verifyMIO.status === 4) {
        
            if (offeredUser?.email) {
              users = [offeredUser];
            }
        
          }
        
          /* ---------------- PARTIAL ---------------- */
        
          else if (verifyMIO.status === 2) {
        
            let roleName = "";
        
            if (verifyMIO.isFinalPaint) {
              roleName = "Production Engineer";
            }
        
            if (verifyMIO.isIrn) {
              roleName = "QC Engineer";
            }
        
            if (roleName) {
        
              const roles = await ErpRole.find({
                deleted: false,
                name: {
                  $in: [roleName]
                }
              });
        
              const roleIds = roles.map(
                role => role._id
              );
        
              const roleUsers =
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
        
              users = [...roleUsers];
        
            }
        
            // add offer creator also
            if (
              offeredUser?.email &&
              !users.some(
                u =>
                  String(u._id) ===
                  String(offeredUser._id)
              )
            ) {
        
              users.push(
                offeredUser
              );
        
            }
        
          }
        
          /* ---------------- QC STATUS ---------------- */
        
          let qcStatus = "-";
          let remarks = "";
        
          if (
            verifyMIO.status === 3
          ) {
        
            qcStatus = "Accepted";
        
            remarks =
              verifyMIO.isFinalPaint
                ? ` MIO QC Verification completed by ${qcUser?.user_name}. Released for  Final Coat  process.`
                : verifyMIO.isIrn
                ? ` MIO QC Verification completed by ${qcUser?.user_name}. Released for  IRN  process.`
                : ` MIO QC Verification completed by ${qcUser?.user_name}.`;
        
          }
        
          else if (
            verifyMIO.status === 4
          ) {
        
            qcStatus = "Rejected";
        
            remarks =
              ` MIO QC Verification completed by ${qcUser?.user_name} and  MIO Inspection has been rejected. Please check the QC notes and reoffer.`;
        
          }
        
          else if (
            verifyMIO.status === 2
          ) {
        
            qcStatus =
              "Partially Accepted";
        
            remarks =
              `MIO QC Verification completed by ${qcUser?.user_name} and  MIO Inspection is partially accepted.`;
        
          }
        
          const accptanceDateTime =
            verifyMIO?.createdAt
              ? new Date(
                  verifyMIO.createdAt
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
        
          /* ---------------- SEND EMAIL ---------------- */
        
          for (const user of users) {
        
            try {
        
              const html =
                commonStageAcceptanceEmail({
        
                  userName:
                    user?.user_name || "-",
        
                  module:
                    "Structural",
        
                  stageName:
                    "MIO QC Verification",
        
                  reportNo:
                    verifyMIO?.report_no_two || "-",
        
                  projectName: project || "-",
        
                  workOrderNo:
                    projectDetails?.work_order_no || "-",
        
                  accptedBy:
                    qcUser?.user_name || "-",
        
                  accptanceDateTime,
        
                  qcStatus,
        
                  remarks,
        
                  loginUrl:
                    process.env.ERP_URL
        
                });
        
              // await sendEmail({
        
              //   to: user.email,
        
              //   subject:
              //     ` MIO QC - ${verifyMIO?.report_no_two}`,
        
              //   html
        
              // });
         addEmailJob({
        
                to: user.email,
        
                subject:
                  ` MIO QC Verification - ${verifyMIO?.report_no_two}`,
        
                html
        
              });
              console.log(
                `Mail sent -> ${user.email}`
              );
        
            } catch (mailErr) {
        
              console.log(
                `Mail failed ${user.email}`,
                mailErr.message
              );
        
            }
        
          }
        
        }
        catch(error){
        
          console.log(
            "EMAIL ERROR",
            error
          );
        
        }
    return sendResponse(res, 200, true, {}, "MIO verified successfully");
  } catch (error) {
    console.error("verifyMIOQcDetails error:", error);
    return sendResponse(res, 500, false, {}, "Something went wrong");
  }
};


const getMIOInspectionOfferFunction = async (report_no, report_no_two, project_id) => {
  try {
    let matchObj = { deleted: false };
    if (report_no) matchObj.report_no = report_no;
    if (report_no_two) matchObj.report_no_two = report_no_two;

    let pipeline = [
      { $match: matchObj },
      { $unwind: "$items" },

      // 🔹 Lookup drawings (nested project + client)
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
      // 🔹 Direct project lookup (fallback if no drawing_id)
      {
        $lookup: {
          from: "bussiness-projects",
          localField: "project_id",
          foreignField: "_id",
          as: "directProjectDetails",
          pipeline: [
            {
              $lookup: {
                from: "store-parties",
                localField: "party",
                foreignField: "_id",
                as: "directClientDetails",
              },
            },
          ],
        },
      },

      //  Merge project/client from either drawing or direct project
      {
        $addFields: {
          drawingDetails: { $arrayElemAt: ["$drawingDetails", 0] },
         projectDetails: {
            $cond: {
              if: { $gt: [{ $size: "$drawingDetails.projectDetails" }, 0] },
              then: { $arrayElemAt: ["$drawingDetails.projectDetails", 0] },
              else: { $arrayElemAt: ["$directProjectDetails", 0] },
            },
          },
          clientDetails:  {
            $cond: {
              if: { $gt: [{ $size: { $ifNull: ["$drawingDetails.projectDetails.clientDetails", []] } }, 0] },
              then: { $arrayElemAt: ["$drawingDetails.projectDetails.clientDetails", 0] },
              else: { $arrayElemAt: ["$directProjectDetails.directClientDetails", 0] },
            },
          },
        },
      },
      // 🔹 Filter by project (works for both direct + drawing-based)
      ...(project_id
        ? [{
            $match: {
              $or: [
                { project_id: new ObjectId(project_id) },
                { "projectDetails._id": new ObjectId(project_id) }
              ]
            }
          }]
        : []),
      // 🔹 Lookup remaining collections
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
      {
        $lookup: {
          from: "multi-erp-painting-dispatch-notes",
          localField: "items.dispatch_id",
          foreignField: "_id",
          as: "dispatchDetails",
        },
      },
      // 🔹 Add all lookup results as first elements
      {
        $addFields: {
          gridDetails: { $arrayElemAt: ["$gridDetails", 0] },
          offerDetails: { $arrayElemAt: ["$offerDetails", 0] },
          qcDetails: { $arrayElemAt: ["$qcDetails", 0] },
          procedureDetails: { $arrayElemAt: ["$procedureDetails", 0] },
          paintDetails: { $arrayElemAt: ["$paintDetails", 0] },
          paintManDetails: { $arrayElemAt: ["$paintDetails.paintManDetails", 0] },
          dispatchDetails: { $arrayElemAt: ["$dispatchDetails", 0] },
        },
      },

      // 🔹 Merge fields (prefer manual fields, fallback to lookup)
      {
        $addFields: {
          "items.drawing_no": { $ifNull: ["$items.drawing_no", "$drawingDetails.drawing_no"] },
          "items.rev": { $ifNull: ["$items.rev", "$drawingDetails.rev", "-"] },
          "items.sheet_no": { $ifNull: ["$items.sheet_no", "$drawingDetails.sheet_no"] },
          "items.assembly_no": { $ifNull: ["$items.item_name", "$drawingDetails.assembly_no"] },
          "items.assembly_quantity": { $ifNull: ["$items.assembly_quantity", "$drawingDetails.assembly_quantity"] },
          "items.grid_no": { $ifNull: ["$items.grid_no", "$gridDetails.grid_no"] },
          "items.grid_qty": { $ifNull: ["$items.grid_qty", "$gridDetails.grid_qty"] },
          "items.dispatch_report": { $ifNull: ["$items.dispatch_report", "$dispatchDetails.report_no"] },
          "items.dispatch_site": { $ifNull: ["$items.dispatch_site", "$dispatchDetails.dispatch_site"] },
          "items.average_dft_mio": { $ifNull: ["$items.average_dft_mio", "$items.average_dft_mio"] },
          "items.accept": {
            $cond: [
              { $eq: ["$items.is_accepted", 2] },
              "ACC",
              { $cond: [{ $eq: ["$items.is_accepted", 3] }, "REJ", "--"] },
            ],
          },
        },
      },

      // 🔹 Group items back
      {
        $group: {
          _id: "$_id",
          report_no: { $first: "$report_no" },
          weather_condition: { $first: "$weather_condition" },
          procedure_no: { $first: "$procedureDetails.vendor_doc_no" },
          offer_date: { $first: "$offer_date" },
          offer_notes: { $first: "$offer_notes" },
          offer_name: { $first: "$offerDetails.user_name" },
          qc_date: { $first: "$qc_date" },
          qc_notes: { $first: "$qc_notes" },
          qc_name: { $first: "$qcDetails.user_name" },
          start_time: { $first: "$start_time" },
          end_time: { $first: "$end_time" },
          mio_paint: { $first: "$paintDetails.mio_paint" },
          mio_app_method: { $first: "$paintDetails.mio_app_method" },
          mio_dft_range: { $first: "$paintDetails.mio_dft_range" },
          paint_manufacturer: { $first: "$paintManDetails.name" },
          mio_date: { $first: "$mio_date" },
          time: { $first: "$time" },
          paint_batch_base: { $first: "$paint_batch_base" },
          manufacture_date: { $first: "$manufacture_date" },
          shelf_life: { $first: "$shelf_life" },
          paint_batch_hardner: { $first: "$paint_batch_hardner" },
          status: { $first: "$status" },
          client: { $first: "$clientDetails.name" },
          project_name: { $first: "$projectDetails.name" },
          wo_no: { $first: "$projectDetails.work_order_no" },
          project_po_no: { $first: "$projectDetails.work_order_no" },
          items: { $push: "$items" },
        },
      },

      { $sort: { createdAt: -1 } },
    ];

    const requestData = await MioInspection.aggregate(pipeline);

    console.log("MIO :",requestData)

    if (requestData.length > 0) {
      return { status: 1, result: requestData };
    } else {
      return { status: 0, result: [] };
    }
  } catch (error) {
    console.error("Error in getMIOInspectionOfferFunction:", error);
    return { status: 2, result: error };
  }
};




exports.oneMIO = async (req, res) => {
  const { report_no, report_no_two } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await getMIOInspectionOfferFunction(
        report_no,
        report_no_two
      );
      let requestData = data.result;

      if (data.status === 1) {
        sendResponse(res, 200, true, requestData, `MIO data list`);
      } else if (data.status === 0) {
        sendResponse(res, 200, true, [], `MIO data not found`);
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

exports.downloadOneMultiMIO = async (req, res) => {
  const { report_no, report_no_two, print_date } = req.body;
  if (req.user && !req.error) {
    try {
      const data = await getMIOInspectionOfferFunction(
        report_no,
        report_no_two
      );
      let requestData = data.result[0];

      if (data.status === 1) {
        let headerInfo = {
          report_no: requestData?.report_no,
          weather_condition: requestData?.weather_condition,
          procedure_no: requestData?.procedure_no,
          offer_date: requestData?.offer_date,
          offer_name: requestData?.offer_name,
          offer_notes: requestData?.offer_notes,
          qc_date: requestData?.qc_date,
          qc_name: requestData?.qc_name,
          qc_notes: requestData?.qc_notes,
          start_time: requestData?.start_time,
          end_time: requestData?.end_time,
          paint_system_no: requestData?.paint_system_no,
          paint_system_id: requestData?.paint_system_id,
          mio_paint: requestData?.mio_paint,
          mio_app_method: requestData?.mio_app_method,
          mio_date: requestData?.mio_date,
          paint_manufacturer: requestData?.paint_manufacturer,
          mio_dft_range: requestData?.mio_dft_range,
          time: requestData?.time,
          paint_batch_base: requestData?.paint_batch_base,
          manufacture_date: requestData?.manufacture_date,
          shelf_life: requestData?.shelf_life,
          paint_batch_hardner: requestData?.paint_batch_hardner,
          status: requestData?.status,
          start_time: requestData?.start_time,
          end_time: requestData?.end_time,
          client: requestData?.client,
          project_name: requestData?.project_name,
          wo_no: requestData?.wo_no,
          project_po_no: requestData?.project_po_no,
        };

        const template = fs.readFileSync("templates/multiMIO.html", "utf-8");
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

        const filename = `mio_${x}_${Date.now()}.pdf`;
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
        sendResponse(res, 200, false, {}, `MIO data not found`);
      } else if (data.status === 2) {
        sendResponse(res, 500, false, {}, "Something went wrong");
      }
    } catch (error) {
      console.log("error", error);
      sendResponse(res, 500, false, {}, "Something went wrong1111");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};
