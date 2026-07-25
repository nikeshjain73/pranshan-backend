const FCInspection = require("../../../models/erp/Multi/multi_final_coat_inspection.model");
const FCOfferTable = require("../../../models/erp/Multi/offer_table_data/Paint/final_coat_offer_table.model");
const { TitleFormat } = require("../../../utils/enum");
const { sendResponse } = require("../../../helper/response");
const { default: mongoose } = require("mongoose");
const { Types: { ObjectId }, } = require("mongoose");
const MIOInspection = require("../../../models/erp/Multi/multi_mio_inspection.model");
const { addReleaseNote } = require("./release_note/multi_release_note.controller");
const { generatePDF, generatePDFA4, generatePDFA4WithoutPrintDate } = require("../../../utils/pdfUtils");
const ejs = require("ejs");
const fs = require("fs");
const XLSX = require("xlsx"); // for utility functions
const XLSXStyle = require("xlsx-style"); // for styling
const puppeteer = require("puppeteer");
const path = require("path");
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

exports.generateFCOffer = async (req, res) => {
    const {
        weather_condition,
        procedure_no,
        paint_system_id,
        final_date,
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
        project_id
    } = req.body;

    const itemArray = JSON.parse(items);
    const weatherCondition = (typeof weather_condition !== 'undefined' && weather_condition !== null)
        ? JSON.parse(weather_condition)
        : [];
    // const itemArray = items;
    // const weatherCondition = weather_condition.length > 0 ? weather_condition : [];

    if (!req.user || req.error) {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }

    if (!paint_system_id || !procedure_no || !offered_by || !project || itemArray.length === 0) {
        sendResponse(res, 400, false, {}, "Missing parameters!");
    }

    try {
        let lastOffer = await FCInspection.findOne({ deleted: false, report_no: { $regex: `/${project}/` } }, { deleted: 0 }, { sort: { createdAt: -1 } });
        let newOfferNo = "1";
        if (lastOffer && lastOffer.report_no) {
            const split = lastOffer.report_no.split('/');
            const lastOfferNo = parseInt(split[split.length - 1]);
            newOfferNo = lastOfferNo + 1;
        }
        const gen_voucher_no = TitleFormat.FINALCOATOFFERNO.replace('/PROJECT/', `/${project}/`) + newOfferNo;

        const addFCIoffer = await FCInspection.create({
            report_no: gen_voucher_no,
            project_id,
            offer_date: Date.now(),
            weather_condition: weatherCondition,
            procedure_no,
            paint_system_id,
            final_date,
            time,
            paint_batch_base,
            manufacture_date,
            shelf_life,
            paint_batch_hardner,
            offered_by,
            offer_notes,
            start_time,
            end_time,
            items: itemArray,
        })

        if (addFCIoffer) {
            // for (const item of itemArray) {
            //     const { fc_offer_id } = item;
            //     const deleteFCOffer = await FCOfferTable.deleteOne({ _id: new ObjectId(fc_offer_id), });
            // }


                 for (const item of itemArray) {
  // Use surface_offer_id if available, otherwise fallback to item._id
  const finalCoatOfferId = item.fc_offer_id || item._id;

  if (finalCoatOfferId && ObjectId.isValid(finalCoatOfferId)) {
    await FCOfferTable.deleteOne({ _id: new ObjectId(finalCoatOfferId) });
  } else {
    console.warn("Invalid or missing surfaceOfferId for item:", item);
  }
}
            sendResponse(res, 200, true, addFCIoffer, "Final Coat added successfully");
        } else {
            sendResponse(res, 400, false, {}, "Final coatcoat not added");
        }

            /* ----------------  FINAL COAT OFFER EMAIL NOTIFICATION ---------------- */
                  
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
                  
                    const offerDateTime = addFCIoffer?.createdAt
                      ? new Date(addFCIoffer.createdAt)
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
                  
                          stageName:" Final Coat Offer Inspection",
                         
                  
                          offerNo:
                            addFCIoffer?.report_no || "-",
                  
                          projectName: project || "-",
                  
                          workOrderNo:
                            projectDetails?.work_order_no || "-",
                  
                          createdBy:
                            offeredUser?.user_name || "-",
                  
                          offerDateTime,
                  
                          remarks: ` Final Coat Offer Inspection offer has been generated by ${offeredUser?.user_name} and is ready for QC review.`,
                             
                  
                          loginUrl: process.env.ERP_URL
                  
                        });
                  
                        // await sendEmail({
                        //   to: user.email,
                        //   subject: `"Stock Final Coat Offer Inspection"  - ${addFCIoffer?.report_no}`,
                        //   html
                        // });
                     addEmailJob({
                          to: user.email,
                          subject: `" Final Coat Offer Inspection"  - ${addFCIoffer?.report_no}`,
                          html
                        });
                        console.log(
                          `Final Coat offer mail sent -> ${user.email}`
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
                      " FINAL COAT EMAIL ERROR:",
                      emailErr
                    );
                  
                  }
    } catch (error) {
        console.log(error);
        sendResponse(res, 500, false, {}, "Something went wrong");
    }
}

// exports.getMultiFCInspectionOffer = async (req, res) => {
//     const { project_id, paint_system_id, report_no, dispatch_site, is_accepted } = req.body;
//     if (req.user && !req.error) {
//         try {
//             let matchObj = {};

//             if (paint_system_id) {
//                 matchObj["paintDetails._id"] = new ObjectId(paint_system_id);
//             }

//             if (report_no) {
//                 matchObj["dispatchDetails.report_no"] = report_no;
//             }

//             if (dispatch_site) {
//                 matchObj["dispatchDetails.dispatch_site"] = dispatch_site;
//             }

//             if (is_accepted) {
//                 let acce = JSON.parse(is_accepted)
//                 matchObj["items.is_accepted"] = acce;
//             }

//             let requestData = await FCInspection.aggregate([
//                 { $match: { deleted: false } },
//                 { $unwind: "$items" },
//                 {
//                     $lookup: {
//                         from: "erp-planner-drawings",
//                         localField: "items.drawing_id",
//                         foreignField: "_id",
//                         as: "drawingDetails",
//                         pipeline: [
//                             {
//                                 $lookup: {
//                                     from: "bussiness-projects",
//                                     localField: "project",
//                                     foreignField: "_id",
//                                     as: "projectDetails",
//                                     pipeline: [
//                                         {
//                                             $lookup: {
//                                                 from: "store-parties",
//                                                 localField: "party",
//                                                 foreignField: "_id",
//                                                 as: "clientDetails",
//                                             },
//                                         },
//                                     ],
//                                 },
//                             },
//                         ],
//                     },
//                 },
//                 {
//                     $lookup: {
//                         from: "erp-drawing-grids",
//                         localField: "items.grid_id",
//                         foreignField: "_id",
//                         as: "gridDetails",
//                     },
//                 },
//                 {
//                     $lookup: {
//                         from: "users",
//                         localField: "offered_by",
//                         foreignField: "_id",
//                         as: "offerDetails",
//                     },
//                 },
//                 {
//                     $lookup: {
//                         from: "users",
//                         localField: "qc_name",
//                         foreignField: "_id",
//                         as: "qcDetails",
//                     },
//                 },
//                 {
//                     $lookup: {
//                         from: "procedure_and_specifications",
//                         localField: "procedure_no",
//                         foreignField: "_id",
//                         as: "procedureDetails",
//                     },
//                 },
//                 {
//                     $lookup: {
//                         from: "painting-systems",
//                         localField: "paint_system_id",
//                         foreignField: "_id",
//                         as: "paintDetails",
//                     },
//                 },
//                 {
//                     $lookup: {
//                         from: "multi-erp-painting-dispatch-notes",
//                         localField: "items.dispatch_id",
//                         foreignField: "_id",
//                         as: "dispatchDetails",
//                     },
//                 },
//                 {
//                     $lookup: {
//                         from: "multi-erp-mio-inspections",
//                         localField: "items.main_id",
//                         foreignField: "_id",
//                         as: "mioDetails",
//                     },
//                 },
//                 {
//                     $addFields: {
//                         drawingDetails: { $arrayElemAt: ["$drawingDetails", 0] },
//                         gridDetails: { $arrayElemAt: ["$gridDetails", 0] },
//                         offerDetails: { $arrayElemAt: ["$offerDetails", 0] },
//                         qcDetails: { $arrayElemAt: ["$qcDetails", 0] },
//                         procedureDetails: { $arrayElemAt: ["$procedureDetails", 0] },
//                         paintDetails: { $arrayElemAt: ["$paintDetails", 0] },
//                         dispatchDetails: { $arrayElemAt: ["$dispatchDetails", 0] },
//                         mioDetails: { $arrayElemAt: ["$mioDetails", 0] },
//                     },
//                 },
//                 {
//                     $addFields: {
//                         projectDetails: {
//                             $arrayElemAt: ["$drawingDetails.projectDetails", 0],
//                         },
//                     },
//                 },
//                 {
//                     $addFields: {
//                         clientDetails: {
//                             $arrayElemAt: ["$projectDetails.clientDetails", 0],
//                         },
//                     },
//                 },
//                 {
//                     $match: { "projectDetails._id": new ObjectId(project_id) },
//                 },
//                 {
//                     $match: matchObj,
//                 },
//                 {
//                     $project: {
//                         _id: 1,
//                         report_no: "$report_no",
//                         report_no_two: "$report_no_two",
//                         weather_condition: "$weather_condition",
//                         procedure_id: "$procedureDetails._id",
//                         procedure_no: "$procedureDetails.vendor_doc_no",
//                         offer_date: "$offer_date",
//                         offer_name: "$offerDetails.user_name",
//                         offer_notes: "$offer_notes",
//                         qc_date: "$qc_date",
//                         qc_name: "$qcDetails.user_name",
//                         qc_notes: "$qc_notes",
//                         paint_system_no: "$paintDetails.paint_system_no",
//                         paint_system_id: "$paintDetails._id",
//                         start_time: "$start_time",
//                         end_time: "$end_time",
//                         final_date: "$final_date",
//                         time: "$time",
//                         paint_batch_base: "$paint_batch_base",
//                         manufacture_date: "$manufacture_date",
//                         shelf_life: "$shelf_life",
//                         paint_batch_hardner: "$paint_batch_hardner",
//                         status: "$status",
//                         client: "$clientDetails.name",
//                         project_name: "$projectDetails.name",
//                         wo_no: "$projectDetails.work_order_no",
//                         project_po_no: "$projectDetails.work_order_no",
//                         createdAt: "$createdAt",
//                         items: {
//                             _id: "$items._id",
//                             main_id: "$_id",
//                             mio_id: "$mioDetails._id",
//                             mio_offer_no: "$mioDetails.report_no",
//                             drawing_id: "$drawingDetails._id",
//                             drawing_no: "$drawingDetails.drawing_no",
//                             rev: "$drawingDetails.rev",
//                             sheet_no: "$drawingDetails.sheet_no",
//                             assembly_no: "$drawingDetails.assembly_no",
//                             assembly_quantity: "$drawingDetails.assembly_quantity",
//                             grid_id: "$gridDetails._id",
//                             grid_no: "$gridDetails.grid_no",
//                             grid_qty: "$gridDetails.grid_qty",
//                             dispatch_id: "$dispatchDetails._id",
//                             dispatch_report: "$dispatchDetails.report_no",
//                             dispatch_site: "$dispatchDetails.dispatch_site",
//                             isSurface: "$dispatchDetails.isSurface",
//                             isMio: "$dispatchDetails.isMio",
//                             isFp: "$dispatchDetails.isFp",
//                             isIrn: "$dispatchDetails.isIrn",
//                             fc_balance_grid_qty: "$items.fc_balance_grid_qty",
//                             fc_used_grid_qty: "$items.fc_used_grid_qty",
//                             moved_next_step: "$items.moved_next_step",
//                             average_dft_final_coat: "$items.average_dft_final_coat",
//                             is_accepted: "$items.is_accepted",
//                             remarks: "$items.remarks",
//                         },
//                     },
//                 },
//                 {
//                     $group: {
//                         _id: {
//                             _id: "$_id",
//                             report_no: "$report_no",
//                             report_no_two: "$report_no_two",
//                             weather_condition: "$weather_condition",
//                             procedure_id: "$procedure_id",
//                             procedure_no: "$procedure_no",
//                             offer_date: "$offer_date",
//                             offer_name: "$offer_name",
//                             offer_notes: "$offer_notes",
//                             qc_date: "$qc_date",
//                             qc_name: "$qc_name",
//                             qc_notes: "$qc_notes",
//                             paint_system_no: "$paint_system_no",
//                             paint_system_id: "$paint_system_id",
//                             start_time: "$start_time",
//                             end_time: "$end_time",
//                             final_date: "$final_date",
//                             time: "$time",
//                             paint_batch_base: "$paint_batch_base",
//                             manufacture_date: "$manufacture_date",
//                             shelf_life: "$shelf_life",
//                             paint_batch_hardner: "$paint_batch_hardner",
//                             status: "$status",
//                             client: "$client",
//                             project_name: "$project_name",
//                             wo_no: "$wo_no",
//                             project_po_no: "$project_po_no",
//                             createdAt: "$createdAt",
//                         },
//                         items: { $push: "$items" },
//                     },
//                 },
//                 {
//                     $project: {
//                         _id: "$_id._id",
//                         report_no: "$_id.report_no",
//                         report_no_two: "$_id.report_no_two",
//                         weather_condition: "$_id.weather_condition",
//                         procedure_id: "$_id.procedure_id",
//                         procedure_no: "$_id.procedure_no",
//                         offer_date: "$_id.offer_date",
//                         offer_name: "$_id.offer_name",
//                         offer_notes: "$_id.offer_notes",
//                         qc_date: "$_id.qc_date",
//                         qc_name: "$_id.qc_name",
//                         qc_notes: "$_id.qc_notes",
//                         paint_system_no: "$_id.paint_system_no",
//                         paint_system_id: "$_id.paint_system_id",
//                         start_time: "$_id.start_time",
//                         end_time: "$_id.end_time",
//                         final_date: "$_id.final_date",
//                         time: "$_id.time",
//                         paint_batch_base: "$_id.paint_batch_base",
//                         manufacture_date: "$_id.manufacture_date",
//                         shelf_life: "$_id.shelf_life",
//                         paint_batch_hardner: "$_id.paint_batch_hardner",
//                         status: "$_id.status",
//                         client: "$_id.client",
//                         project_name: "$_id.project_name",
//                         wo_no: "$_id.wo_no",
//                         project_po_no: "$_id.project_po_no",
//                         createdAt: "$_id.createdAt",
//                         items: 1,
//                     },
//                 },
//                 {
//                     $sort: { "createdAt": -1 }
//                 },
//             ]);

//             if (requestData.length && requestData.length > 0) {
//                 sendResponse(res, 200, true, requestData, `Final coat data list`);
//             } else {
//                 sendResponse(res, 200, true, [], `Final coat data not found`);
//             }
//         } catch (error) {
//             console.log(error);
//             sendResponse(res, 500, false, {}, "Something went wrong");
//         }
//     } else {
//         sendResponse(res, 401, false, {}, "Unauthorized");
//     }
// };

exports.getMultiFCInspectionOffer = async (req, res) => {
  const { project_id, paint_system_id, dispatch_site, is_accepted } = req.body;
  console.log("requested ",req.body);
  const search = req.body.search ? req.body.search.trim() : "";
  const page = req.query.page ? parseInt(req.query.page, 10) : null;
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;


  if (!(req.user && !req.error)) {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }

  try {
    let matchObj = {};

    // if(project_id){
    //     matchObj["projectDetails._id"] = new ObjectId(project_id);
    // }
    if (paint_system_id) {
      matchObj["paintDetails._id"] = new ObjectId(paint_system_id);
    }
    if (dispatch_site) {
      matchObj["dispatchDetails.dispatch_site"] = dispatch_site;
    }
    if (is_accepted) {
      matchObj["items.is_accepted"] = JSON.parse(is_accepted);
    }




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
          localField: "items.dispatch_id",
          foreignField: "_id",
          as: "dispatchDetails",
        },
      },
      {
        $lookup: {
          from: "multi-erp-mio-inspections",
          localField: "items.main_id",
          foreignField: "_id",
          as: "mioDetails",
        },
      },

      // --- Flatten arrays ---
      {
        $addFields: {
          drawingDetails: { $arrayElemAt: ["$drawingDetails", 0] },
          gridDetails: { $arrayElemAt: ["$gridDetails", 0] },
          offerDetails: { $arrayElemAt: ["$offerDetails", 0] },
          qcDetails: { $arrayElemAt: ["$qcDetails", 0] },
          procedureDetails: { $arrayElemAt: ["$procedureDetails", 0] },
          paintDetails: { $arrayElemAt: ["$paintDetails", 0] },
          dispatchDetails: { $arrayElemAt: ["$dispatchDetails", 0] },
          mioDetails: { $arrayElemAt: ["$mioDetails", 0] },
        },
      },
      {
        $addFields: {
          projectDetails: { $arrayElemAt: ["$drawingDetails.projectDetails", 0] },
        },
      },
      {
        $addFields: {
          clientDetails: { $arrayElemAt: ["$projectDetails.clientDetails", 0] },
        },
      },

      //  Add computed fields BEFORE search
      {
        $addFields: {
          dispatchReportNo: { $ifNull: ["$dispatchDetails.report_no", ""] },
          procedureDocNo: { $ifNull: ["$procedureDetails.vendor_doc_no", ""] },
          offerUserName: { $ifNull: ["$offerDetails.user_name", ""] },
        },
      },
    ];

      // Always filter by project
    if (project_id) {
      pipeline.push({ $match: { "projectDetails._id": new ObjectId(project_id) } });
    }

    //  Add search filter now (fields exist now)
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { report_no: { $regex: search, $options: "i" } },
            { report_no_two: { $regex: search, $options: "i" } },
            { dispatchReportNo: { $regex: search, $options: "i" } },
            { procedureDocNo: { $regex: search, $options: "i" } },
            { offerUserName: { $regex: search, $options: "i" } },
            { "projectDetails.name": { $regex: search, $options: "i" } },
            { "clientDetails.name": { $regex: search, $options: "i" } },
          ],
        },
      });
    }

  

    // Additional filters
    if (Object.keys(matchObj).length > 0) {
      pipeline.push({ $match: matchObj });
    }

    // --- Projection and Grouping ---
    pipeline.push(
      {
        $project: {
          _id: 1,
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
          final_date: 1,
          time: 1,
          paint_batch_base: 1,
          manufacture_date: 1,
          shelf_life: 1,
          paint_batch_hardner: 1,
          status: 1,
          client: "$clientDetails.name",
          project_name: "$projectDetails.name",
          wo_no: "$projectDetails.work_order_no",
          project_po_no: "$projectDetails.work_order_no",
          createdAt: 1,
          items: {
            _id: "$items._id",
            main_id: "$_id",
            mio_id: "$mioDetails._id",
            mio_offer_no: "$mioDetails.report_no",
            drawing_id: "$drawingDetails._id",
            drawing_no: "$drawingDetails.drawing_no",
            rev: "$drawingDetails.rev",
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
            fc_balance_grid_qty: "$items.fc_balance_grid_qty",
            fc_used_grid_qty: "$items.fc_used_grid_qty",
            moved_next_step: "$items.moved_next_step",
            average_dft_final_coat: "$items.average_dft_final_coat",
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
            final_date: "$final_date",
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
          final_date: "$_id.final_date",
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
          items: 1,
        },
      },
      { $sort: { createdAt: -1 } }
    );

    // --- Pagination ---
    const countPipeline = [...pipeline, { $count: "totalCount" }];
    const paginatedPipeline = [...pipeline];
    if (page && limit) {
      paginatedPipeline.push({ $skip: (page - 1) * limit }, { $limit: limit });
    }

    const requestData = await FCInspection.aggregate(paginatedPipeline);
    const countResult = await FCInspection.aggregate(countPipeline);
    const totalCount = countResult[0]?.totalCount || 0;

    return sendResponse(
      res,
      200,
      true,
      { data: requestData, pagination: { total: totalCount, page, limit } },
      "Final coat data list"
    );
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, false, {}, "Something went wrong");
  }
};

exports.getMultiFCInspectionOfferViewPage = async (req, res) => {


  // const {
  //      search,
  //   page,
  //   limit,
  //   project_id,
  //   paint_system_id,
  //   dispatch_site,
  //   is_accepted,
  //   id,
  // } = req.body;
  const {
    project_id,
    paint_system_id,
    dispatch_site,
    is_accepted,
    id,
  } = req.body;

  const {
    search,
    page,
    limit } = req.query;


  if (!(req.user && !req.error)) {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }

  try {
    const matchObj = { deleted: false };
    if (paint_system_id) matchObj.paint_system_id = new ObjectId(paint_system_id);
    if (dispatch_site) matchObj["dispatchDetails.dispatch_site"] = dispatch_site;
    if (is_accepted !== undefined)
      matchObj["items.is_accepted"] = JSON.parse(is_accepted);
    if (id) matchObj._id = new ObjectId(id);
  //  if(project_id){
  //       matchObj["projectDetails._id"] = new ObjectId(project_id);
  //   }
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const doPagination = pageNum > 0 && limitNum > 0;
    const skipNum = doPagination ? (pageNum - 1) * limitNum : 0;

    const pipeline = [
      { $match: matchObj },
      { $unwind: { path: "$items", preserveNullAndEmptyArrays: true } },

      // Lookup for possible ObjectId fields (may be null)
      // {
      //   $lookup: {
      //     from: "erp-planner-drawings",
      //     localField: "items.drawing_id",
      //     foreignField: "_id",
      //     as: "drawingDocs",
      //   },
      // },

        {
                    $lookup: {
                        from: "erp-planner-drawings",
                        localField: "items.drawing_id",
                        foreignField: "_id",
                        as: "drawingDocs",
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
          as: "gridDocs",
        },
      },
      {
        $lookup: {
          from: "multi-erp-painting-dispatch-notes",
          localField: "items.dispatch_id",
          foreignField: "_id",
          as: "dispatchDocs",
        },
      },
      {
        $lookup: {
          from: "multi-erp-mio-inspections",
          localField: "items.main_id",
          foreignField: "_id",
          as: "mioDocs",
        },
      },

      // Lookup project, offer, qc, etc.
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
          from: "painting-systems",
          localField: "paint_system_id",
          foreignField: "_id",
          as: "paintDetails",
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
...(project_id
  ? [
      {
        $match: {
          $or: [
            { "drawingDocs.projectDetails._id": new ObjectId(project_id) },
            { "items.drawing_id": { $in: [null, "", undefined] } },
          ],
        },
      },
    ]
  : []),

      // Rebuild final enriched item
      {
        $addFields: {
          "items": {
            $mergeObjects: [
              "$items",
              {
                drawing_no: {
                  $ifNull: [
                    "$items.drawing_no",
                    { $arrayElemAt: ["$drawingDocs.drawing_no", 0] },
                  ],
                },
                assembly_no: {
                  $ifNull: [
                    "$items.assembly_no",
                    { $arrayElemAt: ["$drawingDocs.assembly_no", 0] },
                  ],
                },
                assembly_quantity: {
                  $ifNull: [
                    "$items.assembly_quantity",
                    { $arrayElemAt: ["$drawingDocs.assembly_quantity", 0] },
                  ],
                },
                rev: { $arrayElemAt: ["$drawingDocs.rev", 0] },
                grid_no: {
                  $ifNull: [
                    "$items.grid_no",
                    { $arrayElemAt: ["$gridDocs.grid_no", 0] },
                  ],
                },
                grid_qty: {
                  $ifNull: [
                    "$items.grid_qty",
                    { $arrayElemAt: ["$gridDocs.grid_qty", 0] },
                  ],
                },
                dispatch_report: {
                  $ifNull: [
                    "$items.dispatch_report",
                    { $arrayElemAt: ["$dispatchDocs.report_no", 0] },
                  ],
                },
                dispatch_site: {
                  $ifNull: [
                    "$items.dispatch_site",
                    { $arrayElemAt: ["$dispatchDocs.dispatch_site", 0] },
                  ],
                },
                mio_offer_no: {
                  $ifNull: [
                    "$items.mio_offer_no",
                    { $arrayElemAt: ["$mioDocs.report_no", 0] },
                  ],
                },
              },
            ],
          },
        },
      },

      // Group by parent document
      {
        $group: {
          _id: "$_id",
          root: { $first: "$$ROOT" },
          items: { $push: "$items" },
        },
      },
      {
        $addFields: {
          "root.items": "$items",
        },
      },
      {
        $replaceRoot: { newRoot: "$root" },
      },

      // Single field flattening
      {
        $addFields: {
          offer_name: { $arrayElemAt: ["$offerDetails.user_name", 0] },
          qc_name: { $arrayElemAt: ["$qcDetails.user_name", 0] },
          paint_system_no: { $arrayElemAt: ["$paintDetails.paint_system_no", 0] },
          procedure_no: { $arrayElemAt: ["$procedureDetails.vendor_doc_no", 0] },
          procedure_id: { $arrayElemAt: ["$procedureDetails._id", 0] },
        },
      },

      ...(search?.trim()
        ? [
            {
              $match: {
                $or: [
                  { report_no: new RegExp(search.trim(), "i") },
                  { "items.drawing_no": new RegExp(search.trim(), "i") },
                  { "items.grid_no": new RegExp(search.trim(), "i") },
                  { "items.dispatch_report": new RegExp(search.trim(), "i") },
                ],
              },
            },
          ]
        : []),

      { $sort: { createdAt: -1 } },
    ];

    const countPipeline = [...pipeline, { $count: "total" }];
    const countResult = await FCInspection.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    if (doPagination) {
      pipeline.push({ $skip: skipNum }, { $limit: limitNum });
    }

    const result = await FCInspection.aggregate(pipeline);

    return sendResponse(
      res,
      200,
      true,
      {
        data: result,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
      "Final Coat Inspection Offers"
    );
  } catch (error) {
    console.error("Error in getMultiFCInspectionOfferViewPage:", error);
    return sendResponse(res, 500, false, {}, "Something went wrong");
  }
};

// exports.getMultiFCQcOffer = async (req, res) => {
//   const { project_id, paint_system_id, dispatch_site, is_accepted } = req.body;
//   console.log("requested ",req.body);
//   const search = req.body.search ? req.body.search.trim() : "";
//   const page = req.query.page ? parseInt(req.query.page, 10) : null;
//   const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;


//   if (!(req.user && !req.error)) {
//     return sendResponse(res, 401, false, {}, "Unauthorized");
//   }

//   try {
//    let matchObj = {
//                 status:{$eq:1}
//             };

//     // if(project_id){
//     //     matchObj["projectDetails._id"] = new ObjectId(project_id);
//     // }
//     if (paint_system_id) {
//       matchObj["paintDetails._id"] = new ObjectId(paint_system_id);
//     }
//     if (dispatch_site) {
//       matchObj["dispatchDetails.dispatch_site"] = dispatch_site;
//     }
//     if (is_accepted) {
//       matchObj["items.is_accepted"] = JSON.parse(is_accepted);
//     }




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
//           localField: "items.dispatch_id",
//           foreignField: "_id",
//           as: "dispatchDetails",
//         },
//       },
//       {
//         $lookup: {
//           from: "multi-erp-mio-inspections",
//           localField: "items.main_id",
//           foreignField: "_id",
//           as: "mioDetails",
//         },
//       },

//       // --- Flatten arrays ---
//       {
//         $addFields: {
//           drawingDetails: { $arrayElemAt: ["$drawingDetails", 0] },
//           gridDetails: { $arrayElemAt: ["$gridDetails", 0] },
//           offerDetails: { $arrayElemAt: ["$offerDetails", 0] },
//           qcDetails: { $arrayElemAt: ["$qcDetails", 0] },
//           procedureDetails: { $arrayElemAt: ["$procedureDetails", 0] },
//           paintDetails: { $arrayElemAt: ["$paintDetails", 0] },
//           dispatchDetails: { $arrayElemAt: ["$dispatchDetails", 0] },
//           mioDetails: { $arrayElemAt: ["$mioDetails", 0] },
//         },
//       },
//       {
//         $addFields: {
//           projectDetails: { $arrayElemAt: ["$drawingDetails.projectDetails", 0] },
//         },
//       },
//       {
//         $addFields: {
//           clientDetails: { $arrayElemAt: ["$projectDetails.clientDetails", 0] },
//         },
//       },

//       //  Add computed fields BEFORE search
//       {
//         $addFields: {
//           dispatchReportNo: { $ifNull: ["$dispatchDetails.report_no", ""] },
//           procedureDocNo: { $ifNull: ["$procedureDetails.vendor_doc_no", ""] },
//           offerUserName: { $ifNull: ["$offerDetails.user_name", ""] },
//         },
//       },
//     ];

//       // Always filter by project
//     if (project_id) {
//       pipeline.push({ $match: { "projectDetails._id": new ObjectId(project_id) } });
//     }

//     //  Add search filter now (fields exist now)
//     if (search) {
//       pipeline.push({
//         $match: {
//           $or: [
//             {drawing_no: { $regex: search, $options: "i" } },
//             { report_no: { $regex: search, $options: "i" } },
//             { report_no_two: { $regex: search, $options: "i" } },
//             { dispatchReportNo: { $regex: search, $options: "i" } },
//             { procedureDocNo: { $regex: search, $options: "i" } },
//             { offerUserName: { $regex: search, $options: "i" } },
//             { "projectDetails.name": { $regex: search, $options: "i" } },
//             { "clientDetails.name": { $regex: search, $options: "i" } },
//           ],
//         },
//       });
//     }

  

//     // Additional filters
//     if (Object.keys(matchObj).length > 0) {
//       pipeline.push({ $match: matchObj });
//     }

//     // --- Projection and Grouping ---
//     pipeline.push(
//       {
//         $project: {
//           _id: 1,
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
//           final_date: 1,
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
//           createdAt: 1,
//           items: {
//             _id: "$items._id",
//             main_id: "$_id",
//             mio_id: "$mioDetails._id",
//             mio_offer_no: "$mioDetails.report_no",
//             drawing_id: "$drawingDetails._id",
//             drawing_no: "$drawingDetails.drawing_no",
//             rev: "$drawingDetails.rev",
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
//             fc_balance_grid_qty: "$items.fc_balance_grid_qty",
//             fc_used_grid_qty: "$items.fc_used_grid_qty",
//             moved_next_step: "$items.moved_next_step",
//             average_dft_final_coat: "$items.average_dft_final_coat",
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
//             final_date: "$final_date",
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
//           final_date: "$_id.final_date",
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
//       { $sort: { createdAt: -1 } }
//     );

//     // --- Pagination ---
//     const countPipeline = [...pipeline, { $count: "totalCount" }];
//     const paginatedPipeline = [...pipeline];
//     if (page && limit) {
//       paginatedPipeline.push({ $skip: (page - 1) * limit }, { $limit: limit });
//     }

//     const requestData = await FCInspection.aggregate(paginatedPipeline);
//     const countResult = await FCInspection.aggregate(countPipeline);
//     const totalCount = countResult[0]?.totalCount || 0;

//     return sendResponse(
//       res,
//       200,
//       true,
//       { data: requestData, pagination: { total: totalCount, page, limit } },
//       "Final coat data list"
//     );
//   } catch (error) {
//     console.error(error);
//     sendResponse(res, 500, false, {}, "Something went wrong");
//   }
// };

exports.getMultiFCQcOffer = async (req, res) => {
  const {
    project_id,
    paint_system_id,
    dispatch_site,
    is_accepted,
    id,
    search,
    page,
    limit,
  } = req.body;

  if (!(req.user && !req.error)) {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }

  try {
    // const matchObj = { deleted: false };
     let matchObj = {
                status:{$eq:1}
            };
    if (paint_system_id) matchObj.paint_system_id = new ObjectId(paint_system_id);
    if (dispatch_site) matchObj["dispatchDetails.dispatch_site"] = dispatch_site;
    if (is_accepted !== undefined)
      matchObj["items.is_accepted"] = JSON.parse(is_accepted);
    if (id) matchObj._id = new ObjectId(id);

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const doPagination = pageNum > 0 && limitNum > 0;
    const skipNum = doPagination ? (pageNum - 1) * limitNum : 0;

    const pipeline = [
      { $match: matchObj },
      { $unwind: { path: "$items", preserveNullAndEmptyArrays: true } },

      // Lookup for possible ObjectId fields (may be null)
      {
        $lookup: {
          from: "erp-planner-drawings",
          localField: "items.drawing_id",
          foreignField: "_id",
          as: "drawingDocs",
        },
      },
      {
        $lookup: {
          from: "erp-drawing-grids",
          localField: "items.grid_id",
          foreignField: "_id",
          as: "gridDocs",
        },
      },
      {
        $lookup: {
          from: "multi-erp-painting-dispatch-notes",
          localField: "items.dispatch_id",
          foreignField: "_id",
          as: "dispatchDocs",
        },
      },
      {
        $lookup: {
          from: "multi-erp-mio-inspections",
          localField: "items.main_id",
          foreignField: "_id",
          as: "mioDocs",
        },
      },

      // Lookup project, offer, qc, etc.
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
          from: "painting-systems",
          localField: "paint_system_id",
          foreignField: "_id",
          as: "paintDetails",
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

      // Rebuild final enriched item
      {
        $addFields: {
          "items": {
            $mergeObjects: [
              "$items",
              {
                drawing_no: {
                  $ifNull: [
                    "$items.drawing_no",
                    { $arrayElemAt: ["$drawingDocs.drawing_no", 0] },
                  ],
                },
                assembly_no: {
                  $ifNull: [
                    "$items.assembly_no",
                    { $arrayElemAt: ["$drawingDocs.assembly_no", 0] },
                  ],
                },
                grid_no: {
                  $ifNull: [
                    "$items.grid_no",
                    { $arrayElemAt: ["$gridDocs.grid_no", 0] },
                  ],
                },
                   rev: { $arrayElemAt: ["$drawingDocs.rev", 0] },
                grid_qty: {
                  $ifNull: [
                    "$items.grid_qty",
                    { $arrayElemAt: ["$gridDocs.grid_qty", 0] },
                  ],
                },
                dispatch_report: {
                  $ifNull: [
                    "$items.dispatch_report",
                    { $arrayElemAt: ["$dispatchDocs.report_no", 0] },
                  ],
                },
                dispatch_site: {
                  $ifNull: [
                    "$items.dispatch_site",
                    { $arrayElemAt: ["$dispatchDocs.dispatch_site", 0] },
                  ],
                },
                mio_offer_no: {
                  $ifNull: [
                    "$items.mio_offer_no",
                    { $arrayElemAt: ["$mioDocs.report_no", 0] },
                  ],
                },
              },
            ],
          },
        },
      },

      // Group by parent document
      {
        $group: {
          _id: "$_id",
          root: { $first: "$$ROOT" },
          items: { $push: "$items" },
        },
      },
      {
        $addFields: {
          "root.items": "$items",
        },
      },
      {
        $replaceRoot: { newRoot: "$root" },
      },

      // Single field flattening
      {
        $addFields: {
          rev: { $arrayElemAt: ["$drawingDocs.rev", 0] },
          offer_name: { $arrayElemAt: ["$offerDetails.user_name", 0] },
          qc_name: { $arrayElemAt: ["$qcDetails.user_name", 0] },
          paint_system_no: { $arrayElemAt: ["$paintDetails.paint_system_no", 0] },
          procedure_no: { $arrayElemAt: ["$procedureDetails.vendor_doc_no", 0] },
          procedure_id: { $arrayElemAt: ["$procedureDetails._id", 0] },
        },
      },

      ...(search?.trim()
        ? [
            {
              $match: {
                $or: [
                  { report_no: new RegExp(search.trim(), "i") },
                  { "items.drawing_no": new RegExp(search.trim(), "i") },
                  { "items.grid_no": new RegExp(search.trim(), "i") },
                  { "items.dispatch_report": new RegExp(search.trim(), "i") },
                ],
              },
            },
          ]
        : []),

      { $sort: { createdAt: -1 } },
    ];

    const countPipeline = [...pipeline, { $count: "total" }];
    const countResult = await FCInspection.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    if (doPagination) {
      pipeline.push({ $skip: skipNum }, { $limit: limitNum });
    }

    const result = await FCInspection.aggregate(pipeline);

    return sendResponse(
      res,
      200,
      true,
      {
        data: result,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
      "Final Coat Inspection Offers"
    );
  } catch (error) {
    console.error("Error in getMultiFCInspectionOfferViewPage:", error);
    return sendResponse(res, 500, false, {}, "Something went wrong");
  }
};

// exports.getMultiFCInspectionClearance = async (req, res) => {
//     const { project_id, paint_system_id, dispatch_site, is_accepted } = req.body;
//     const search = req.query.search || "";

//     // Parse pagination from query
//     const page = req.query.page ? parseInt(req.query.page, 10) : '';
//     console.log("page: ",page)
//     const limit = req.query.limit ? parseInt(req.query.limit, 10) : '';
//     console.log("limit: ",limit)

//     if (req.user && !req.error) {
//         try {
//             let matchObj = {
//                 status:{$ne:1}
//             };

//             if (paint_system_id) {
//                 matchObj["paintDetails._id"] = new ObjectId(paint_system_id);
//             }
//             if (dispatch_site) {
//                 matchObj["dispatchDetails.dispatch_site"] = dispatch_site;
//             }
//             if (is_accepted) {
//                 let acce = JSON.parse(is_accepted);
//                 matchObj["items.is_accepted"] = acce;
//             }
//             // if (search) {
//             //     matchObj["dispatchDetails.report_no"] = { $regex: search, $options: "i" };
//             // }


//             if (search) {
//     matchObj.$or = [
//         { "report_no": { $regex: search, $options: "i" } },             // Final coat report number
//         { "report_no_two": { $regex: search, $options: "i" } },         // Second report no
//         { "dispatchDetails.report_no": { $regex: search, $options: "i" } }, // Dispatch note number
//         { "procedureDetails.vendor_doc_no": { $regex: search, $options: "i" } }, // Procedure number
//         { "offerDetails.user_name": { $regex: search, $options: "i" } } // Offer by user name
//     ];
// }

//             let pipeline = [
//                 { $match: { deleted: false } },
//                 { $unwind: "$items" },
//                 // --- All your lookups here (unchanged) ---
//                 {
//                     $lookup: {
//                         from: "erp-planner-drawings",
//                         localField: "items.drawing_id",
//                         foreignField: "_id",
//                         as: "drawingDetails",
//                         pipeline: [
//                             {
//                                 $lookup: {
//                                     from: "bussiness-projects",
//                                     localField: "project",
//                                     foreignField: "_id",
//                                     as: "projectDetails",
//                                     pipeline: [
//                                         {
//                                             $lookup: {
//                                                 from: "store-parties",
//                                                 localField: "party",
//                                                 foreignField: "_id",
//                                                 as: "clientDetails",
//                                             },
//                                         },
//                                     ],
//                                 },
//                             },
//                         ],
//                     },
//                 },
//                 {
//                     $lookup: {
//                         from: "erp-drawing-grids",
//                         localField: "items.grid_id",
//                         foreignField: "_id",
//                         as: "gridDetails",
//                     },
//                 },
//                 {
//                     $lookup: {
//                         from: "users",
//                         localField: "offered_by",
//                         foreignField: "_id",
//                         as: "offerDetails",
//                     },
//                 },
//                 {
//                     $lookup: {
//                         from: "users",
//                         localField: "qc_name",
//                         foreignField: "_id",
//                         as: "qcDetails",
//                     },
//                 },
//                 {
//                     $lookup: {
//                         from: "procedure_and_specifications",
//                         localField: "procedure_no",
//                         foreignField: "_id",
//                         as: "procedureDetails",
//                     },
//                 },
//                 {
//                     $lookup: {
//                         from: "painting-systems",
//                         localField: "paint_system_id",
//                         foreignField: "_id",
//                         as: "paintDetails",
//                     },
//                 },
//                 {
//                     $lookup: {
//                         from: "multi-erp-painting-dispatch-notes",
//                         localField: "items.dispatch_id",
//                         foreignField: "_id",
//                         as: "dispatchDetails",
//                     },
//                 },
//                 {
//                     $lookup: {
//                         from: "multi-erp-mio-inspections",
//                         localField: "items.main_id",
//                         foreignField: "_id",
//                         as: "mioDetails",
//                     },
//                 },
//                 {
//                     $addFields: {
//                         drawingDetails: { $arrayElemAt: ["$drawingDetails", 0] },
//                         gridDetails: { $arrayElemAt: ["$gridDetails", 0] },
//                         offerDetails: { $arrayElemAt: ["$offerDetails", 0] },
//                         qcDetails: { $arrayElemAt: ["$qcDetails", 0] },
//                         procedureDetails: { $arrayElemAt: ["$procedureDetails", 0] },
//                         paintDetails: { $arrayElemAt: ["$paintDetails", 0] },
//                         dispatchDetails: { $arrayElemAt: ["$dispatchDetails", 0] },
//                         mioDetails: { $arrayElemAt: ["$mioDetails", 0] },
//                     },
//                 },
//                 {
//                     $addFields: {
//                         projectDetails: {
//                             $arrayElemAt: ["$drawingDetails.projectDetails", 0],
//                         },
//                     },
//                 },
//                 {
//                     $addFields: {
//                         clientDetails: {
//                             $arrayElemAt: ["$projectDetails.clientDetails", 0],
//                         },
//                     },
//                 },
//                 {
//                     $match: { "projectDetails._id": new ObjectId(project_id) },
//                 },
//                 { $match: matchObj },
//                 {
//                     $project: {
//                         _id: 1,
//                         report_no: "$report_no",
//                         report_no_two: "$report_no_two",
//                         weather_condition: "$weather_condition",
//                         procedure_id: "$procedureDetails._id",
//                         procedure_no: "$procedureDetails.vendor_doc_no",
//                         offer_date: "$offer_date",
//                         offer_name: "$offerDetails.user_name",
//                         offer_notes: "$offer_notes",
//                         qc_date: "$qc_date",
//                         qc_name: "$qcDetails.user_name",
//                         qc_notes: "$qc_notes",
//                         paint_system_no: "$paintDetails.paint_system_no",
//                         paint_system_id: "$paintDetails._id",
//                         start_time: "$start_time",
//                         end_time: "$end_time",
//                         final_date: "$final_date",
//                         time: "$time",
//                         paint_batch_base: "$paint_batch_base",
//                         manufacture_date: "$manufacture_date",
//                         shelf_life: "$shelf_life",
//                         paint_batch_hardner: "$paint_batch_hardner",
//                         status: "$status",
//                         client: "$clientDetails.name",
//                         project_name: "$projectDetails.name",
//                         wo_no: "$projectDetails.work_order_no",
//                         project_po_no: "$projectDetails.work_order_no",
//                         createdAt: "$createdAt",
//                         items: {
//                             _id: "$items._id",
//                             main_id: "$_id",
//                             mio_id: "$mioDetails._id",
//                             mio_offer_no: "$mioDetails.report_no",
//                             drawing_id: "$drawingDetails._id",
//                             drawing_no: "$drawingDetails.drawing_no",
//                             rev: "$drawingDetails.rev",
//                             sheet_no: "$drawingDetails.sheet_no",
//                             assembly_no: "$drawingDetails.assembly_no",
//                             assembly_quantity: "$drawingDetails.assembly_quantity",
//                             grid_id: "$gridDetails._id",
//                             grid_no: "$gridDetails.grid_no",
//                             grid_qty: "$gridDetails.grid_qty",
//                             dispatch_id: "$dispatchDetails._id",
//                             dispatch_report: "$dispatchDetails.report_no",
//                             dispatch_site: "$dispatchDetails.dispatch_site",
//                             isSurface: "$dispatchDetails.isSurface",
//                             isMio: "$dispatchDetails.isMio",
//                             isFp: "$dispatchDetails.isFp",
//                             isIrn: "$dispatchDetails.isIrn",
//                             fc_balance_grid_qty: "$items.fc_balance_grid_qty",
//                             fc_used_grid_qty: "$items.fc_used_grid_qty",
//                             moved_next_step: "$items.moved_next_step",
//                             average_dft_final_coat: "$items.average_dft_final_coat",
//                             is_accepted: "$items.is_accepted",
//                             remarks: "$items.remarks",
//                         },
//                     },
//                 },
//                 {
//                     $group: {
//                         _id: {
//                             _id: "$_id",
//                             report_no: "$report_no",
//                             report_no_two: "$report_no_two",
//                             weather_condition: "$weather_condition",
//                             procedure_id: "$procedure_id",
//                             procedure_no: "$procedure_no",
//                             offer_date: "$offer_date",
//                             offer_name: "$offer_name",
//                             offer_notes: "$offer_notes",
//                             qc_date: "$qc_date",
//                             qc_name: "$qc_name",
//                             qc_notes: "$qc_notes",
//                             paint_system_no: "$paint_system_no",
//                             paint_system_id: "$paint_system_id",
//                             start_time: "$start_time",
//                             end_time: "$end_time",
//                             final_date: "$final_date",
//                             time: "$time",
//                             paint_batch_base: "$paint_batch_base",
//                             manufacture_date: "$manufacture_date",
//                             shelf_life: "$shelf_life",
//                             paint_batch_hardner: "$paint_batch_hardner",
//                             status: "$status",
//                             client: "$client",
//                             project_name: "$project_name",
//                             wo_no: "$wo_no",
//                             project_po_no: "$project_po_no",
//                             createdAt: "$createdAt",
//                         },
//                         items: { $push: "$items" },
//                     },
//                 },
//                 {
//                     $project: {
//                         _id: "$_id._id",
//                         report_no: "$_id.report_no",
//                         report_no_two: "$_id.report_no_two",
//                         weather_condition: "$_id.weather_condition",
//                         procedure_id: "$_id.procedure_id",
//                         procedure_no: "$_id.procedure_no",
//                         offer_date: "$_id.offer_date",
//                         offer_name: "$_id.offer_name",
//                         offer_notes: "$_id.offer_notes",
//                         qc_date: "$_id.qc_date",
//                         qc_name: "$_id.qc_name",
//                         qc_notes: "$_id.qc_notes",
//                         paint_system_no: "$_id.paint_system_no",
//                         paint_system_id: "$_id.paint_system_id",
//                         start_time: "$_id.start_time",
//                         end_time: "$_id.end_time",
//                         final_date: "$_id.final_date",
//                         time: "$_id.time",
//                         paint_batch_base: "$_id.paint_batch_base",
//                         manufacture_date: "$_id.manufacture_date",
//                         shelf_life: "$_id.shelf_life",
//                         paint_batch_hardner: "$_id.paint_batch_hardner",
//                         status: "$_id.status",
//                         client: "$_id.client",
//                         project_name: "$_id.project_name",
//                         wo_no: "$_id.wo_no",
//                         project_po_no: "$_id.project_po_no",
//                         createdAt: "$_id.createdAt",
//                         items: 1,
//                     },
//                 },
//                 { $sort: { createdAt: -1 } }
//             ];

//             // Count pipeline (clone without skip/limit)
//             const countPipeline = [...pipeline, { $count: "totalCount" }];

//             // Apply pagination
//             const paginatedPipeline = [...pipeline];
//             if (page && limit) {
//                 paginatedPipeline.push(
//                     { $skip: (page - 1) * limit },
//                     { $limit: limit }
//                 );
//             }

//             const requestData = await FCInspection.aggregate(paginatedPipeline);
//             const countResult = await FCInspection.aggregate(countPipeline);
//             const totalCount = countResult[0] ? countResult[0].totalCount : 0;

//             return sendResponse(res, 200, true, {
//                 data: requestData,
//                 pagination: {
//                     total: totalCount,
//                     page,
//                     limit
//                 }
//             }, "Final coat data list");

//         } catch (error) {
//             console.log(error);
//             sendResponse(res, 500, false, {}, "Something went wrong");
//         }
//     } else {
//         sendResponse(res, 401, false, {}, "Unauthorized");
//     }
// };



exports.getMultiFCInspectionClearance = async (req, res) => {
  const {
    project_id,
    paint_system_id,
    dispatch_site,
    is_accepted,
    id,
    search,
    page,
    limit,
  } = req.body;

  if (!(req.user && !req.error)) {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }

  try {
    // const matchObj = { deleted: false };
     let matchObj = {
                status:{$ne:1},
                deleted: false
            };
    if (paint_system_id) matchObj.paint_system_id = new ObjectId(paint_system_id);
    if (dispatch_site) matchObj["dispatchDetails.dispatch_site"] = dispatch_site;
    if (is_accepted !== undefined)
      matchObj["items.is_accepted"] = JSON.parse(is_accepted);
    if (id) matchObj._id = new ObjectId(id);

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const doPagination = pageNum > 0 && limitNum > 0;
    const skipNum = doPagination ? (pageNum - 1) * limitNum : 0;

    const pipeline = [
      { $match: matchObj },
      { $unwind: { path: "$items", preserveNullAndEmptyArrays: true } },

      // Lookup for possible ObjectId fields (may be null)
      {
        $lookup: {
          from: "erp-planner-drawings",
          localField: "items.drawing_id",
          foreignField: "_id",
          as: "drawingDocs",
        },
      },
      {
        $lookup: {
          from: "erp-drawing-grids",
          localField: "items.grid_id",
          foreignField: "_id",
          as: "gridDocs",
        },
      },
      {
        $lookup: {
          from: "multi-erp-painting-dispatch-notes",
          localField: "items.dispatch_id",
          foreignField: "_id",
          as: "dispatchDocs",
        },
      },
      {
        $lookup: {
          from: "multi-erp-mio-inspections",
          localField: "items.main_id",
          foreignField: "_id",
          as: "mioDocs",
        },
      },

      // Lookup project, offer, qc, etc.
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
          from: "painting-systems",
          localField: "paint_system_id",
          foreignField: "_id",
          as: "paintDetails",
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

      // Rebuild final enriched item
      {
        $addFields: {
          "items": {
            $mergeObjects: [
              "$items",
              {
                drawing_no: {
                  $ifNull: [
                    "$items.drawing_no",
                    { $arrayElemAt: ["$drawingDocs.drawing_no", 0] },
                  ],
                },
                assembly_no: {
                  $ifNull: [
                    "$items.assembly_no",
                    { $arrayElemAt: ["$drawingDocs.assembly_no", 0] },
                  ],
                },
                 rev: { $arrayElemAt: ["$drawingDocs.rev", 0] },
                grid_no: {
                  $ifNull: [
                    "$items.grid_no",
                    { $arrayElemAt: ["$gridDocs.grid_no", 0] },
                  ],
                },
                grid_qty: {
                  $ifNull: [
                    "$items.grid_qty",
                    { $arrayElemAt: ["$gridDocs.grid_qty", 0] },
                  ],
                },
                dispatch_report: {
                  $ifNull: [
                    "$items.dispatch_report",
                    { $arrayElemAt: ["$dispatchDocs.report_no", 0] },
                  ],
                },
                dispatch_site: {
                  $ifNull: [
                    "$items.dispatch_site",
                    { $arrayElemAt: ["$dispatchDocs.dispatch_site", 0] },
                  ],
                },
                mio_offer_no: {
                  $ifNull: [
                    "$items.mio_offer_no",
                    { $arrayElemAt: ["$mioDocs.report_no", 0] },
                  ],
                },
              },
            ],
          },
        },
      },

      // Group by parent document
      {
        $group: {
          _id: "$_id",
          root: { $first: "$$ROOT" },
          items: { $push: "$items" },
        },
      },
      {
        $addFields: {
          "root.items": "$items",
        },
      },
      {
        $replaceRoot: { newRoot: "$root" },
      },

      // Single field flattening
      {
        $addFields: {
          offer_name: { $arrayElemAt: ["$offerDetails.user_name", 0] },
          qc_name: { $arrayElemAt: ["$qcDetails.user_name", 0] },
          paint_system_no: { $arrayElemAt: ["$paintDetails.paint_system_no", 0] },
          procedure_no: { $arrayElemAt: ["$procedureDetails.vendor_doc_no", 0] },
          procedure_id: { $arrayElemAt: ["$procedureDetails._id", 0] },
        },
      },

      ...(search?.trim()
        ? [
            {
              $match: {
                $or: [
                  { report_no: new RegExp(search.trim(), "i") },
                  { "items.drawing_no": new RegExp(search.trim(), "i") },
                  { "items.grid_no": new RegExp(search.trim(), "i") },
                  { "items.dispatch_report": new RegExp(search.trim(), "i") },
                ],
              },
            },
          ]
        : []),

      { $sort: { createdAt: -1 } },
    ];

    const countPipeline = [...pipeline, { $count: "total" }];
    const countResult = await FCInspection.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    if (doPagination) {
      pipeline.push({ $skip: skipNum }, { $limit: limitNum });
    }

    const result = await FCInspection.aggregate(pipeline);

    return sendResponse(
      res,
      200,
      true,
      {
        data: result,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
      "Final Coat Inspection Offers"
    );
  } catch (error) {
    console.error("Error in getMultiFCInspectionOfferViewPage:", error);
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
            $regex: `^VE/${project}/STR/FINAL-PAINT/\\d+$`,
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

    const [lastInspection] = await FCInspection.aggregate(pipeline);
    console.log('Aggregation result:', lastInspection); // Debug log
    return lastInspection || null;
  } catch (error) {
    console.error('Error fetching last inspection:', error);
    throw error;
  }
}
exports.verifyFCQcDetails = async (req, res) => {
    const { id, items, qc_name, project,project_id, qc_notes } = req.body;

    if (!req.user || req.error) {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }

    const itemArray = JSON.parse(items);
    // const itemArray = items;

    if (!id || itemArray.length === 0 || !qc_name || !project) {
        return sendResponse(res, 400, false, {}, "Missing parameter");
    }

    try {
        // let lastInspection = await FCInspection.findOne(
        //     { deleted: false, report_no_two: { $regex: `/${project}/` } }, {}, { sort: { updatedAt: -1 } }
        // );
        const lastInspection = await getLastInspection(project);
        let inspectionNo = "1";
        if (lastInspection && lastInspection.report_no_two) {
            const split = lastInspection.report_no_two.split("/");
            const lastInspectionNo = parseInt(split[split.length - 1]);
            inspectionNo = lastInspectionNo + 1;
        }
        const gen_report_no =
            TitleFormat.FINALCOATINSPECTNO.replace("/PROJECT/", `/${project}/`) +
            inspectionNo;

        let fcInspection = await FCInspection.findById(id);
        if (!fcInspection) {
            return sendResponse(res, 404, false, {}, "FC inspection not found");
        }

        let status = 1;

        if (itemArray.length > 0) {
            if (itemArray.every(item => item.is_accepted === 2)) status = 3;
            else if (itemArray.every(item => item.is_accepted === 3)) status = 4;
            else if (itemArray.some(item => item.is_accepted === 2) && itemArray.some(item => item.is_accepted === 3)) status = 2;
        }

        const verifyFC = await FCInspection.findByIdAndUpdate(
            { _id: id },
            {
                report_no_two: gen_report_no,
                qc_name: qc_name,
                qc_date: new Date(),
                qc_notes: qc_notes,
                status: status,
            },
            { new: true }
        )

        let matchedCount = 0;
        let modifiedCount = 0;

        for (const item of itemArray) {
            const { _id, average_dft_final_coat, is_accepted } = item;
            const result = await FCInspection.updateOne(
                { _id: id, "items._id": _id },
                {
                    $set: {
                        "items.$.average_dft_final_coat": average_dft_final_coat,
                        "items.$.is_accepted": is_accepted,
                    },
                }
            );
            matchedCount += result.matchedCount;
            modifiedCount += result.modifiedCount;
        }

        if (verifyFC && matchedCount === modifiedCount && matchedCount === itemArray.length) {
            for (const item of itemArray) {
                const { mio_id, drawing_id, grid_id, fc_used_grid_qty, is_accepted } = item;

                if (is_accepted === 3) {
                    const result = await MIOInspection.updateOne(
                        { _id: mio_id, "items.drawing_id": drawing_id, "items.grid_id": grid_id },
                        {
                            $inc: {
                                "items.$.moved_next_step": -fc_used_grid_qty,
                            },
                        }
                    );
                }
            }
                 console.log("itemArray", itemArray[0]);

            const release_note = await addReleaseNote({
                itemArray, id
            })
                      /* ---------------- FINAL COAT QC EMAIL ---------------- */
                
                try {
                console.log("Preparing to send Final Coat QC email notifications");
                  const qcUser = await User.findById(qc_name);
                
                  const projectDetails = await Project.findById(
                    verifyFC.project_id
                  );
                
                  let users = [];
                
                  // Offer creator
                  const offeredUser = await User.findById(
                    verifyFC.offered_by
                  );
                
                  /* ---------------- ACCEPTED ---------------- */
                
                  if (verifyFC.status === 3) {
                
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
                
                  /* ---------------- REJECTED ---------------- */
                
                  else if (verifyFC.status === 4) {
                
                    if (offeredUser?.email) {
                      users = [offeredUser];
                    }
                
                  }
                
                  /* ---------------- PARTIAL ---------------- */
                
                  else if (verifyFC.status === 2) {
                
                    const roles = await ErpRole.find({
                      deleted: false,
                      name: {
                        $in: ["Production Engineer"]
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
                
                  /* ---------------- STATUS + REMARKS ---------------- */
                
                  let qcStatus = "-";
                  let remarks = "";
                
                  if (verifyFC.status === 3) {
                
                    qcStatus = "Accepted";
                
                    remarks =
                      `Final Coat QC Verification completed by ${qcUser?.user_name}. Released for Release Note For Site Dispatch List process.`;
                
                  }
                
                  else if (verifyFC.status === 4) {
                
                    qcStatus = "Rejected";
                
                    remarks =
                      `Final Coat QC Verification completed by ${qcUser?.user_name} and inspection has been rejected. Please check QC notes and reoffer.`;
                
                  }
                
                  else if (verifyFC.status === 2) {
                
                    qcStatus =
                      "Partially Accepted";
                
                    remarks =
                      `Final Coat QC Verification completed by ${qcUser?.user_name} and inspection is partially accepted.`;
                
                  }
                
                  const accptanceDateTime =
                    verifyFC?.createdAt
                      ? new Date(
                          verifyFC.createdAt
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
                            "Final Coat QC Verification ",
                
                          reportNo:
                            verifyFC?.report_no_two || "-",
                
                          projectName:
                            project || "-",
                
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
                      //     `Final Coat QC - ${verifyFC?.report_no_two}`,
                
                      //   html
                
                      // });
                
                       addEmailJob({
                
                        to: user.email,
                
                        subject:
                          `Final Coat QC Verification - ${verifyFC?.report_no_two}`,
                
                        html
                
                      });
                      console.log(
                        `Mail sent -> ${user.email}`
                      );
                
                    }
                    catch(mailErr){
                
                      console.log(
                        `Mail failed ${user.email}`,
                        mailErr.message
                      );
                
                    }
                
                  }
                
                }
                catch(error){
                
                  console.log(
                    "FINAL COAT EMAIL ERROR:",
                    error
                  );
                
                }
            return sendResponse(res, 200, true, {}, "Final coat verified successfully");
        } else {
            return sendResponse(res, 400, false, {}, "Final coat not verified");
        }
    } catch (error) {
        console.log(error)
        sendResponse(res, 500, false, {}, "Something went wrong");
    }
}

// const getFCInspectionOfferFunction = async (report_no, report_no_two) => {
//     try {
//         let matchObj = { deleted: false };
//         if (report_no) {
//             matchObj = { ...matchObj, report_no: report_no };
//         }
//         if (report_no_two) {
//             matchObj = { ...matchObj, report_no_two: report_no_two };
//         }

//         let requestData = await FCInspection.aggregate([
//             { $match: matchObj },
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
//                 $lookup: {
//                     from: "users",
//                     localField: "offered_by",
//                     foreignField: "_id",
//                     as: "offerDetails",
//                 },
//             },
//             {
//                 $lookup: {
//                     from: "users",
//                     localField: "qc_name",
//                     foreignField: "_id",
//                     as: "qcDetails",
//                 },
//             },
//             {
//                 $lookup: {
//                     from: "procedure_and_specifications",
//                     localField: "procedure_no",
//                     foreignField: "_id",
//                     as: "procedureDetails",
//                 },
//             },
//             {
//                 $lookup: {
//                     from: "painting-systems",
//                     localField: "paint_system_id",
//                     foreignField: "_id",
//                     as: "paintDetails",
//                     pipeline: [
//                         {
//                             $lookup: {
//                                 from: "paint-manufactures",
//                                 localField: "paint_manufacturer",
//                                 foreignField: "_id",
//                                 as: "paintManDetails",
//                             },
//                         },
//                     ],
//                 },
//             },
//             {
//                 $lookup: {
//                     from: "multi-erp-painting-dispatch-notes",
//                     localField: "items.dispatch_id",
//                     foreignField: "_id",
//                     as: "dispatchDetails",
//                 },
//             },
//             {
//                 $addFields: {
//                     drawingDetails: { $arrayElemAt: ["$drawingDetails", 0] },
//                     gridDetails: { $arrayElemAt: ["$gridDetails", 0] },
//                     offerDetails: { $arrayElemAt: ["$offerDetails", 0] },
//                     qcDetails: { $arrayElemAt: ["$qcDetails", 0] },
//                     procedureDetails: { $arrayElemAt: ["$procedureDetails", 0] },
//                     paintDetails: { $arrayElemAt: ["$paintDetails", 0] },
//                     dispatchDetails: { $arrayElemAt: ["$dispatchDetails", 0] },
//                 },
//             },
//             {
//                 $addFields: {
//                     projectDetails: {
//                         $arrayElemAt: ["$drawingDetails.projectDetails", 0],
//                     },
//                     paintManDetails: {
//                         $arrayElemAt: ["$paintDetails.paintManDetails", 0],
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
//                     _id: 1,
//                     report_no: report_no ? "$report_no" : "$report_no_two",
//                     weather_condition: "$weather_condition",
//                     procedure_no: "$procedureDetails.vendor_doc_no",
//                     offer_date: "$offer_date",
//                     offer_notes: "$offer_notes",
//                     offer_name: "$offerDetails.user_name",
//                     qc_date: "$qc_date",
//                     qc_notes: "$qc_notes",
//                     qc_name: "$qcDetails.user_name",
//                     start_time: "$start_time",
//                     end_time: "$end_time",
//                     paint_system_no: "$paintDetails.paint_system_no",
//                     paint_system_id: "$paintDetails._id",
//                     final_paint: "$paintDetails.final_paint",
//                     final_paint_app_method: "$paintDetails.final_paint_app_method",
//                     final_paint_dft_range: "$paintDetails.final_paint_dft_range",
//                     paint_manufacturer: "$paintManDetails.name",
//                     final_date: "$final_date",
//                     time: "$time",
//                     paint_batch_base: "$paint_batch_base",
//                     manufacture_date: "$manufacture_date",
//                     shelf_life: "$shelf_life",
//                     paint_batch_hardner: "$paint_batch_hardner",
//                     status: "$status",
//                     start_time: "$start_time",
//                     end_time: "$end_time",
//                     client: "$clientDetails.name",
//                     project_name: "$projectDetails.name",
//                     wo_no: "$projectDetails.work_order_no",
//                     project_po_no: "$projectDetails.work_order_no",
//                     items: {
//                         _id: "$items._id",
//                         drawing_no: "$drawingDetails.drawing_no",
//                         rev: "$drawingDetails.rev",
//                         sheet_no: "$drawingDetails.sheet_no",
//                         assembly_no: "$drawingDetails.assembly_no",
//                         assembly_quantity: "$drawingDetails.assembly_quantity",
//                         grid_no: "$gridDetails.grid_no",
//                         grid_qty: "$gridDetails.grid_qty",
//                         fc_used_grid_qty: "$items.fc_used_grid_qty",
//                         remarks: "$items.remarks",
//                         ...(report_no_two && {
//                             average_dft_final_coat: "$items.average_dft_final_coat",
//                             accept: {
//                                 $cond: [
//                                     { $eq: ["$items.is_accepted", 2] },
//                                     "ACC",
//                                     {
//                                         $cond: [
//                                             { $eq: ["$items.is_accepted", 3] },
//                                             "REJ", "--"]
//                                     }
//                                 ]
//                             }
//                         }),
//                     },
//                 },
//             },
//             {
//                 $group: {
//                     _id: {
//                         _id: "$_id",
//                         report_no: "$report_no",
//                         weather_condition: "$weather_condition",
//                         procedure_no: "$procedure_no",
//                         offer_date: "$offer_date",
//                         offer_notes: "$offer_notes",
//                         offer_name: "$offer_name",
//                         qc_date: "$qc_date",
//                         qc_notes: "$qc_notes",
//                         qc_name: "$qc_name",
//                         start_time: "$start_time",
//                         end_time: "$end_time",
//                         paint_system_no: "$paint_system_no",
//                         paint_system_id: "$paint_system_id",
//                         final_paint: "$final_paint",
//                         final_paint_app_method: "$final_paint_app_method",
//                         final_paint_dft_range: "$final_paint_dft_range",
//                         paint_manufacturer: "$paint_manufacturer",
//                         final_date: "$final_date",
//                         time: "$time",
//                         paint_batch_base: "$paint_batch_base",
//                         manufacture_date: "$manufacture_date",
//                         shelf_life: "$shelf_life",
//                         paint_batch_hardner: "$paint_batch_hardner",
//                         status: "$status",
//                         start_time: "$start_time",
//                         end_time: "$end_time",
//                         client: "$client",
//                         project_name: "$project_name",
//                         wo_no: "$wo_no",
//                         project_po_no: "$project_po_no",
//                     },
//                     items: { $push: "$items" },
//                 },
//             },
//             {
//                 $project: {
//                     _id: "$_id._id",
//                     report_no: "$_id.report_no",
//                     weather_condition: "$_id.weather_condition",
//                     procedure_no: "$_id.procedure_no",
//                     offer_date: "$_id.offer_date",
//                     offer_notes: "$_id.offer_notes",
//                     offer_name: "$_id.offer_name",
//                     qc_date: "$_id.qc_date",
//                     qc_notes: "$_id.qc_notes",
//                     qc_name: "$_id.qc_name",
//                     start_time: "$_id.start_time",
//                     end_time: "$_id.end_time",
//                     paint_system_no: "$_id.paint_system_no",
//                     paint_system_id: "$_id.paint_system_id",
//                     final_paint: "$_id.final_paint",
//                     final_paint_app_method: "$_id.final_paint_app_method",
//                     final_paint_dft_range: "$_id.final_paint_dft_range",
//                     paint_manufacturer: "$_id.paint_manufacturer",
//                     final_date: "$_id.final_date",
//                     time: "$_id.time",
//                     paint_batch_base: "$_id.paint_batch_base",
//                     manufacture_date: "$_id.manufacture_date",
//                     shelf_life: "$_id.shelf_life",
//                     paint_batch_hardner: "$_id.paint_batch_hardner",
//                     status: "$_id.status",
//                     start_time: "$_id.start_time",
//                     end_time: "$_id.end_time",
//                     client: "$_id.client",
//                     project_name: "$_id.project_name",
//                     wo_no: "$_id.wo_no",
//                     project_po_no: "$_id.project_po_no",
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
//         console.log(error);
//         return { status: 2, result: error };
//     }
// };


const getFCInspectionOfferFunction = async (report_no, report_no_two) => {
  try {
    let matchObj = { deleted: false };
    if (report_no) matchObj.report_no = report_no;
    if (report_no_two) matchObj.report_no_two = report_no_two;

    let requestData = await FCInspection.aggregate([
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
          localField: "items.dispatch_id",
          foreignField: "_id",
          as: "dispatchDetails",
        },
      },

      // Add first elements and project/client/paintMan
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

      // Merge manual fields if present, else fallback to lookup
      {
        $addFields: {
            projectDetails: { $arrayElemAt: ["$drawingDetails.projectDetails", 0] },
  paintManDetails: { $arrayElemAt: ["$paintDetails.paintManDetails", 0] },
  clientDetails: { $arrayElemAt: ["$projectDetails.clientDetails", 0] },
          "items.drawing_no": { $ifNull: ["$items.drawing_no", "$drawingDetails.drawing_no"] },
          "items.rev": { $ifNull: ["$drawingDetails.rev","-"] },
          "items.sheet_no": { $ifNull: ["$items.sheet_no", "$drawingDetails.sheet_no"] },
          "items.assembly_no": { $ifNull: ["$items.item_name", "$drawingDetails.assembly_no"] },
          "items.assembly_quantity": { $ifNull: ["$items.assembly_quantity", "$drawingDetails.assembly_quantity"] },
          "items.grid_no": { $ifNull: ["$items.grid_no", "$gridDetails.grid_no"] },
          "items.grid_qty": { $ifNull: ["$items.grid_qty", "$gridDetails.grid_qty"] },
          "items.dispatch_report": { $ifNull: ["$items.dispatch_report", "$dispatchDetails.report_no"] },
          "items.dispatch_site": { $ifNull: ["$items.dispatch_site", "$dispatchDetails.dispatch_site"] },
          "items.average_dft_final_coat": { $ifNull: ["$items.average_dft_final_coat", "$items.average_dft_final_coat"] },
          "items.accept": {
            $cond: [
              { $eq: ["$items.is_accepted", 2] },
              "ACC",
              { $cond: [{ $eq: ["$items.is_accepted", 3] }, "REJ", "--"] }
            ]
          },
        },
      },

      // Group back items
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
          paint_system_no: { $first: "$paintDetails.paint_system_no" },
          paint_system_id: { $first: "$paintDetails._id" },
          final_paint: { $first: "$paintDetails.final_paint" },
          final_paint_app_method: { $first: "$paintDetails.final_paint_app_method" },
          final_paint_dft_range: { $first: "$paintDetails.final_paint_dft_range" },
          paint_manufacturer: { $first: "$paintManDetails.name" },
          final_date: { $first: "$final_date" },
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


exports.oneFC = async (req, res) => {
    const { report_no, report_no_two } = req.body;
    if (req.user && !req.error) {
        try {
            const data = await getFCInspectionOfferFunction(report_no, report_no_two);
            let requestData = data.result;

            if (data.status === 1) {
                sendResponse(res, 200, true, requestData, `FC data list`);
            } else if (data.status === 0) {
                sendResponse(res, 200, true, [], `FC data not found`);
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

exports.downloadOneMultiFC = async (req, res) => {
    const { report_no, report_no_two, print_date } = req.body;
    if (req.user && !req.error) {
        try {
            const data = await getFCInspectionOfferFunction(report_no, report_no_two);
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
                    final_paint: requestData?.final_paint,
                    final_paint_app_method: requestData?.final_paint_app_method,
                    final_paint_dft_range: requestData?.final_paint_dft_range,
                    paint_manufacturer: requestData?.paint_manufacturer,
                    final_date: requestData?.final_date,
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

                const template = fs.readFileSync("templates/multiFC.html", "utf-8");
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

                const filename = `final_coat_${x}_${Date.now()}.pdf`;
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
                sendResponse(res, 200, false, {}, `FC data not found`);
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