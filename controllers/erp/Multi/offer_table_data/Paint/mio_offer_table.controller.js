const { sendResponse } = require("../../../../../helper/response");
const { default: mongoose } = require("mongoose");
const { Types: { ObjectId } } = require("mongoose");
const MioOfferTable = require("../../../../../models/erp/Multi/offer_table_data/Paint/mio_offer_table.model");
const SurfaceInspection = require("../../../../../models/erp/Multi/multi_surface_inspection.model");
const DispatchNote = require("../../../../../models/erp/Multi/dispatch_note/multi_dispatch_note.model"); 
 
exports.manageMioOfferTable = async (req, res) => {
    const { items, paint_system_id } = req.body;
 
    if (!req.user || req.error) {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }
 
    const newItems = JSON.parse(items);
    // const newItems = items;
 
    let lastRecord = await MioOfferTable.findOne({})
        .sort({ mio_no: -1 })
        .select("mio_no")
        .exec();
 
    try {
        let dataAdded = false;
        let dataUpdated = false;
 
        for (const o of newItems) {
            const updated = await MioOfferTable.updateOne(
                {
                    "items.drawing_id": new ObjectId(o.drawing_id),
                    "items.grid_id": new ObjectId(o.grid_id),
                },
                {
                    $set: {
                        "items.$.mio_balance_grid_qty": o.mio_balance_grid_qty,
                    }
                },
                {
                    $inc: {
                        "items.$.mio_used_grid_qty": o.mio_used_grid_qty,
                    }
                },
            );
 
            if (updated.modifiedCount > 0) {
                dataUpdated = true;
            }
 
            if (updated.modifiedCount === 0) {
                const newReportNo = lastRecord && lastRecord.mio_no ? lastRecord.mio_no + 1 : 1000;
 
                const newItem = await MioOfferTable.create(
                    {
                        mio_no: newReportNo,
                        paint_system_id: paint_system_id,
                        items: [{
                            main_id: o.main_id,
                            dispatch_id: o.dispatch_id,
                            drawing_id: o.drawing_id,
                            grid_id: o.grid_id,
                            mio_balance_grid_qty: o.mio_balance_grid_qty,
                            mio_used_grid_qty: o.mio_used_grid_qty,


                            item_name: o.item_name,
                            drawing_no: o.drawing_no,
                            grid_no: o.grid_no,
                            dispatch_no: o.dispatch_no,
                            unit_assembly_weight: o.unit_assembly_weight,
                            total_assembly_weight: o.total_assembly_weight,
                            remarks: o.remarks
                        }],
                    },
                );
 
                if (newItem) {
                    dataAdded = true;
                }
 
                lastRecord = await MioOfferTable.findOne({})
                    .sort({ mio_no: -1 })
                    .select("mio_no")
                    .exec();
            }
        }
 
        if (dataAdded && dataUpdated) {
            return sendResponse(res, 200, true, {}, "MIO paint data added and updated successfully");
        } else if (dataAdded) {
            return sendResponse(res, 200, true, {}, "MIO paint data added successfully");
        } else if (dataUpdated) {
            return sendResponse(res, 200, true, {}, "MIO paint data updated successfully");
        } else {
            return sendResponse(res, 400, false, {}, "MIO paint data not added or updated");
        }
 
    } catch (error) {
        console.log("error", error)
        return sendResponse(res, 500, false, {}, "Internal server error");
    }
};
 
exports.updateMioOffer = async (req, res) => {
    const {
        id,
        item_detail_id,   // item object id
        items
    } = req.body;
 
    if (req.user && !req.error) {
        try {
            if (id) {
                const updateMioOffer = await MioOfferTable.updateOne(
                    { _id: id, "items._id": item_detail_id },
                    {
                        $set: {
                            "items.$.remarks": items.remarks,
                        },
                    }
                )
 
                if (updateMioOffer.modifiedCount > 0) {
                    sendResponse(res, 200, true, {}, `MIO offer update successfully`);
                } else {
                    sendResponse(res, 400, false, {}, `MIO offer not update`);
                }
            } else {
                return sendResponse(res, 400, false, {}, "Missing parameters");
            }
        } catch (error) {
            console.log(error);
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 400, false, {}, "Unauthorised");
    }
};
 
exports.deleteMioOffer = async (req, res) => {
    const { id } = req.body;
    if (req.user && !req.error) {
        try {
            if (id) {
                const deleteMioOffer = await MioOfferTable.deleteOne({ _id: new ObjectId(id), });
 
                if (deleteMioOffer.deletedCount > 0) {
                    sendResponse(res, 200, true, {}, `MIO offer deleted successfully`);
                } else {
                    sendResponse(res, 400, false, {}, `MIO offer not delete`);
                }
            } else {
                return sendResponse(res, 400, false, {}, "Missing parameters");
            }
        } catch (error) {
            console.log(error);
            sendResponse(res, 500, false, {}, "Something went wrong");
        }
    } else {
        sendResponse(res, 400, false, {}, "Unauthorised");
    }
};
 
// exports.getMioOffer = async (req, res) => {
//     const { project_id, paint_system_id } = req.body;
//     if (!req.user || req.error) {
//         return sendResponse(res, 401, false, {}, "Unauthorized");
//     }
//     if (!project_id) {
//         return sendResponse(res, 400, false, {}, "Missing Parameter");
//     }
//     try {
 
//         const requestData = await MioOfferTable.aggregate([
//             { $match: { paint_system_id: new ObjectId(paint_system_id) } },
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
//                     from: "erp-drawing-grids",
//                     localField: "items.grid_id",
//                     foreignField: "_id",
//                     as: "gridDetails",
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
//                     paintDetails: { $arrayElemAt: ["$paintDetails", 0] },
//                     dispatchDetails: { $arrayElemAt: ["$dispatchDetails", 0] },
//                 },
//             },
//             {
//                 $addFields: {
//                     projectDetails: {
//                         $arrayElemAt: ["$drawingDetails.projectDetails", 0],
//                     }
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
//                 $match: {
//                     "projectDetails._id": new ObjectId(project_id)
//                 }
//             },
//             {
//                 $project: {
//                     _id: 1,
//                     main_id: "$items.main_id",
//                     item_detail_id: "$items._id",
//                     mio_no: 1,
//                     dispatch_no: "$dispatchDetails.report_no",
//                     dispatch_site: "$dispatchDetails.dispatch_site",
//                     dispatch_id: "$dispatchDetails._id",
//                     drawing_no: "$drawingDetails.drawing_no",
//                     drawing_id: "$drawingDetails._id",
//                     rev: "$drawingDetails.rev",
//                     sheet_no: "$drawingDetails.sheet_no",
//                     assembly_no: "$drawingDetails.assembly_no",
//                     assembly_quantity: "$drawingDetails.assembly_quantity",
//                     grid_no: "$gridDetails.grid_no",
//                     grid_id: "$gridDetails._id",
//                     grid_qty: "$gridDetails.grid_qty",
//                     mio_balance_grid_qty: "$items.mio_balance_grid_qty",
//                     mio_used_grid_qty: "$items.mio_used_grid_qty",
//                     moved_next_step: "$items.moved_next_step",
//                     remarks: "$items.remarks",
//                 }
//             }
//         ]);
 
//         if (requestData.length && requestData.length > 0) {
//             sendResponse(res, 200, true, requestData, "MIO offer data found");
//         } else {
//             sendResponse(res, 200, false, [], `MIO offer data not found`);
//         }
//     } catch (error) {
//         console.log("error", error)
//         sendResponse(res, 500, false, {}, "Something went wrong11");
//     }
// };

exports.getMioOffer = async (req, res) => {
    const { project_id, paint_system_id } = req.body;
    if (!req.user || req.error) {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }
    if (!project_id) {
        return sendResponse(res, 400, false, {}, "Missing Parameter");
    }

    try {
        const requestData = await MioOfferTable.aggregate([
            { $match: { paint_system_id: new ObjectId(paint_system_id) } },
            { $unwind: "$items" },

            {
                $facet: {
                    // CASE 1: Linked Data (valid ObjectIds)
                    linkedData: [
                        {
                            $match: {
                                "items.drawing_id": { $type: "objectId" },
                                "items.grid_id": { $type: "objectId" },
                                "items.main_id": { $type: "objectId" },
                                "items.dispatch_id": { $type: "objectId" },
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
                            $lookup: {
                                from: "multi-erp-painting-dispatch-notes",
                                localField: "items.dispatch_id",
                                foreignField: "_id",
                                as: "dispatchDetails",
                            },
                        },
                        {
                            $addFields: {
                                drawingDetails: { $arrayElemAt: ["$drawingDetails", 0] },
                                gridDetails: { $arrayElemAt: ["$gridDetails", 0] },
                                dispatchDetails: { $arrayElemAt: ["$dispatchDetails", 0] },
                                projectDetails: { $arrayElemAt: ["$drawingDetails.projectDetails", 0] },
                                clientDetails: { $arrayElemAt: ["$drawingDetails.projectDetails.0.clientDetails", 0] },
                            },
                        },
                        {
                            $match: {
                                "projectDetails._id": new ObjectId(project_id),
                            },
                        },
                        {
                            $project: {
                                _id: 1,
                                mio_no: 1,
                                main_id: "$items.main_id",
                                item_detail_id: "$items._id",
                                dispatch_no: "$dispatchDetails.report_no",
                                dispatch_site: "$dispatchDetails.dispatch_site",
                                dispatch_id: "$dispatchDetails._id",
                                drawing_no: "$drawingDetails.drawing_no",
                                drawing_id: "$drawingDetails._id",
                                rev: "$drawingDetails.rev",
                                sheet_no: "$drawingDetails.sheet_no",
                                assembly_no: "$drawingDetails.assembly_no",
                                assembly_quantity: "$drawingDetails.assembly_quantity",
                                grid_no: "$gridDetails.grid_no",
                                grid_id: "$gridDetails._id",
                                grid_qty: "$gridDetails.grid_qty",
                                mio_balance_grid_qty: "$items.mio_balance_grid_qty",
                                mio_used_grid_qty: "$items.mio_used_grid_qty",
                                moved_next_step: "$items.moved_next_step",
                                remarks: "$items.remarks",
                                item_name: "$items.item_name",
                            },
                        },
                    ],

                    // CASE 2: Raw Form Data (no ObjectIds)
                    rawFormData: [
                        {
                            $match: {
                                $or: [
                                    { "items.drawing_id": { $exists: false } },
                                    { "items.drawing_id": { $not: { $type: "objectId" } } },
                                ],
                            },
                        },
                        {
                            $project: {
                                _id: 1,
                                mio_no: 1,
                                main_id: null,
                                item_detail_id: "$items._id",
                                dispatch_no: "$items.dispatch_no",
                                dispatch_site: null,
                                dispatch_id: null,
                                drawing_no: "$items.drawing_no",
                                drawing_id: null,
                                rev: null,
                                sheet_no: null,
                                assembly_no: null,
                                assembly_quantity: null,
                                grid_no: "$items.grid_no",
                                grid_id: null,
                                grid_qty: null,
                                mio_balance_grid_qty: "$items.mio_balance_grid_qty",
                                mio_used_grid_qty: "$items.mio_used_grid_qty",
                                moved_next_step: "$items.moved_next_step",
                                remarks: "$items.remarks",
                                item_name: "$items.item_name",
                            },
                        },
                    ],
                },
            },
        ]);

        // Combine both linked and raw data
        const combinedData = [
            ...(requestData[0]?.linkedData || []),
            ...(requestData[0]?.rawFormData || []),
        ];

        if (combinedData.length > 0) {
            sendResponse(res, 200, true, combinedData, "MIO offer data found");
        } else {
            sendResponse(res, 200, false, [], "MIO offer data not found");
        }
    } catch (error) {
        console.error("getMioOffer error:", error);
        sendResponse(res, 500, false, {}, "Something went wrong");
    }
};

exports.updateSurfaceGridBalance = async (req, res) => {
    const { items, is_delete } = req.body;
    if (!req.user || req.error) {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }
    if (!items) {
        return sendResponse(res, 400, false, {}, "Missing parameter");
    }
 
    const itemArray = JSON.parse(items);
    const is_del = JSON.parse(is_delete);
    // const itemArray = items;
    // const is_del = is_delete;
 
    try {
        let matchedCount = 0;
        let modifiedCount = 0;
 
        if (is_del) {
            for (const item of itemArray) {
                const { main_id, drawing_id, grid_id, mio_used_grid_qty } = item;
 
                const result = await SurfaceInspection.updateOne(
                    { _id: main_id, "items.drawing_id": drawing_id, "items.grid_id": grid_id },
                    {
                        $inc: {
                            "items.$.moved_next_step": -mio_used_grid_qty,
                        },
                    }
                );
             console.log("if result", result);
                matchedCount += result.matchedCount;
                modifiedCount += result.modifiedCount;
            }
 
            if (matchedCount === 0) {
                return sendResponse(res, 404, false, {}, "No Surface record found");
            } else if (modifiedCount > 0) {
                return sendResponse(res, 200, true, {}, "Grid balance updated successfully");
            } else {
                return sendResponse(res, 400, false, {}, "Grid balance not updated");
            }
        } else {
            for (const item of itemArray) {
                const { main_id, drawing_id, grid_id, mio_used_grid_qty } = item;
 
                const result = await SurfaceInspection.updateOne(
                    { _id: main_id, "items.drawing_id": drawing_id, "items.grid_id": grid_id },
                    {
                        $inc: {
                            "items.$.moved_next_step": mio_used_grid_qty,
                        },
                    }
                );
                console.log("else result", result);
                matchedCount += result.matchedCount;
                modifiedCount += result.modifiedCount;
            }
 
            if (matchedCount === 0) {
                return sendResponse(res, 404, false, {}, "No Surface record found");
            } else if (modifiedCount > 0) {
                return sendResponse(res, 200, true, {}, "Grid balance updated successfully");
            } else {
                return sendResponse(res, 400, false, {}, "Grid balance not updated");
            }
        }
 
    } catch (error) {
        console.log("error", error)
        return sendResponse(res, 500, false, {}, "Something went wrong");
    }
};

exports.updateDNPGridBalanceMio = async (req, res) => {

    const { items, is_delete } = req.body;
    if (!req.user || req.error) {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }
    if (!items) {
        return sendResponse(res, 400, false, {}, "Missing parameter");
    }

    const itemArray = JSON.parse(items);
    const is_del = JSON.parse(is_delete);
    // const itemArray = items;
    // const is_del = is_delete;

    try {
        let matchedCount = 0;
        let modifiedCount = 0;

        if (is_del) {
            for (const item of itemArray) {
                const { main_id, drawing_id, grid_id, mio_used_grid_qty } = item;

                const result = await DispatchNote.updateOne(
                    { _id: main_id, "items.drawing_id": drawing_id, "items.grid_id": grid_id },
                    {
                        $inc: {
                            "items.$.moved_next_step": -mio_used_grid_qty,
                        },
                    }
                );
      
                matchedCount += result.matchedCount;
                modifiedCount += result.modifiedCount;
            }

            if (matchedCount === 0) {
                return sendResponse(res, 404, false, {}, "No dispatch note record found");
            } else if (modifiedCount > 0) {
                return sendResponse(res, 200, true, {}, "Grid balance updated successfully");
            } else {
                return sendResponse(res, 400, false, {}, "Grid balance not updated");
            }
        } else {
            for (const item of itemArray) {
                const { main_id, drawing_id, grid_id, mio_used_grid_qty } = item;

                const result = await DispatchNote.updateOne(
                    { _id: main_id, "items.drawing_id": drawing_id, "items.grid_id": grid_id },
                    {
                        $inc: {
                            "items.$.moved_next_step": mio_used_grid_qty,
                        },
                    }
                );
            
                matchedCount += result.matchedCount;
                modifiedCount += result.modifiedCount;
            }

            if (matchedCount === 0) {
                return sendResponse(res, 404, false, {}, "No dispatch note record found");
            } else if (modifiedCount > 0) {
                return sendResponse(res, 200, true, {}, "Grid balance updated successfully");
            } else {
                return sendResponse(res, 400, false, {}, "Grid balance not updated");
            }
        }

    } catch (error) {
        console.log("error", error)
        return sendResponse(res, 500, false, {}, "Something went wrong");
    }
};



