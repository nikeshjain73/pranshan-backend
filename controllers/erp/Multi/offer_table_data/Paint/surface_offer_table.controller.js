const { sendResponse } = require("../../../../../helper/response");
const { default: mongoose } = require("mongoose");
const { Types: { ObjectId } } = require("mongoose");
const SurfaceOfferTable = require("../../../../../models/erp/Multi/offer_table_data/Paint/surface_offer_table.model");
const DispatchNote = require("../../../../../models/erp/Multi/dispatch_note/multi_dispatch_note.model");


exports.manageSurfaceOfferTable = async (req, res) => {
    const { items, paint_system_id } = req.body;

    if (!req.user || req.error) {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }

    const newItems = JSON.parse(items);
    // const newItems = items;

    let lastRecord = await SurfaceOfferTable.findOne({})
        .sort({ surface_no: -1 })
        .select("surface_no")
        .exec();

    try {
        let dataAdded = false;
        let dataUpdated = false;

        for (const o of newItems) {
            const updated = await SurfaceOfferTable.updateOne(
                {
                    "items.drawing_id": new ObjectId(o.drawing_id),
                    "items.grid_id": new ObjectId(o.grid_id),
                },
                {
                    $set: {
                        "items.$.surface_balance_grid_qty": o.surface_balance_grid_qty,
                    }
                },
                {
                    $inc: {
                        "items.$.surface_used_grid_qty": o.surface_used_grid_qty,
                    }
                },
            );

            if (updated.modifiedCount > 0) {
                dataUpdated = true;
            }

            if (updated.modifiedCount === 0) {
                const newReportNo = lastRecord && lastRecord.surface_no ? lastRecord.surface_no + 1 : 1000;

                const newItem = await SurfaceOfferTable.create(
                    {
                        surface_no: newReportNo,
                        paint_system_id: paint_system_id,
                        items: [{
                            main_id: o.main_id,
                            drawing_id: o.drawing_id,
                            grid_id: o.grid_id,

                            surface_balance_grid_qty: o.surface_balance_grid_qty,
                            surface_used_grid_qty: o.surface_used_grid_qty,

                            item_name: o.item_name,
                            drawing_no: o.drawing_no,
                            grid_no: o.grid_no,
                            dispatch_no: o.dispatch_no,
                            unit_assembly_weight: o.unit_assembly_weight,
                            total_assembly_weight: o.total_assembly_weight,
                            remarks: o.remarks

                        }],

                          rawFormData: [
                        {
                            $match: {
                                $or: [
                                    { "items.drawing_id": { $exists: false } },
                                    { "items.drawing_id": { $not: { $type: "objectId" } } }
                                ]
                            }
                        },
                        {
                            $project: {
                                _id: 1,
                                packing_no: 1,
                                item_detail_id: "$items._id",
                                drawing_no: "$items.drawing_no",
                                grid_no: "$items.grid_no",
                                dispatch_no: "$items.dispatch_no",
                                remarks: "$items.remarks",
                                rn_balance_grid_qty: "$items.rn_balance_grid_qty",
                                rn_used_grid_qty: "$items.rn_used_grid_qty",
                                moved_next_step: "$items.moved_next_step",
                                unit_assembly_weight: "$items.unit_assembly_weight",
                                total_assembly_weight: "$items.total_assembly_weight",
                                item_name: "$items.item_name",
                                total_asm: null,
                                unit_asm: null,
                                drawing_id: null,
                                grid_id: null,
                                grid_qty: null,
                                rev: null,
                                sheet_no: null,
                                assembly_no: null,
                                assembly_quantity: null
                                
                            }
                        }
                    ]
                    },
                );

                if (newItem) {
                    dataAdded = true;
                }

                lastRecord = await SurfaceOfferTable.findOne({})
                    .sort({ surface_no: -1 })
                    .select("surface_no")
                    .exec();
            }
        }

        if (dataAdded && dataUpdated) {
            return sendResponse(res, 200, true, {}, "Surface paint data added and updated successfully");
        } else if (dataAdded) {
            return sendResponse(res, 200, true, {}, "Surface paint data added successfully");
        } else if (dataUpdated) {
            return sendResponse(res, 200, true, {}, "Surface paint data updated successfully");
        } else {
            return sendResponse(res, 400, false, {}, "Surface paint data not added or updated");
        }

    } catch (error) {
        console.log("error", error)
        return sendResponse(res, 500, false, {}, "Internal server error");
    }

};

exports.updateSurfaceOffer = async (req, res) => {
    const {
        id,
        item_detail_id,   // item object id
        items
    } = req.body;

    if (req.user && !req.error) {
        try {
            if (id) {
                const updateSurfaceOffer = await SurfaceOfferTable.updateOne(
                    { _id: id, "items._id": item_detail_id },
                    {
                        $set: {
                            "items.$.remarks": items.remarks,
                        },
                    }
                )

                if (updateSurfaceOffer.modifiedCount > 0) {
                    sendResponse(res, 200, true, {}, `Surfase offer update successfully`);
                } else {
                    sendResponse(res, 400, false, {}, `Surface offer not update`);
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

exports.deleteSurfaceOffer = async (req, res) => {
    const { id } = req.body;
    if (req.user && !req.error) {
        try {
            if (id) {
                const deleteSurfaceOffer = await SurfaceOfferTable.deleteOne({ _id: new ObjectId(id), });

                if (deleteSurfaceOffer.deletedCount > 0) {
                    sendResponse(res, 200, true, {}, `Surface offer deleted successfully`);
                } else {
                    sendResponse(res, 400, false, {}, `Surface offer not delete`);
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

// exports.getSurfaceOffer = async (req, res) => {
//     const { project_id, paint_system_id } = req.body;
//     if (!req.user || req.error) {
//         return sendResponse(res, 401, false, {}, "Unauthorized");
//     }
//     if (!project_id) {
//         return sendResponse(res, 400, false, {}, "Missing Parameter");
//     }
//     try {

//         const requestData = await SurfaceOfferTable.aggregate([
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
//                     from: "multi-erp-painting-dispatch-notes",
//                     localField: "items.main_id",
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
//                     surface_no: 1,
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
//                     surface_balance_grid_qty: "$items.surface_balance_grid_qty",
//                     surface_used_grid_qty: "$items.surface_used_grid_qty",
//                     moved_next_step: "$items.moved_next_step",
//                     remarks: "$items.remarks",
//                     item_name: "$items.item_name",
//                 }
//             }
//         ]);

//         if (requestData.length && requestData.length > 0) {
//             sendResponse(res, 200, true, requestData, "Surface offer data found");
//         } else {
//             sendResponse(res, 200, false, [], `Surface offer data not found`);
//         }
//     } catch (error) {
//         console.log("error", error)
//         sendResponse(res, 500, false, {}, "Something went wrong11");
//     }
// };



exports.getSurfaceOffer = async (req, res) => {
    const { project_id, paint_system_id } = req.body;
    if (!req.user || req.error) {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }
    if (!project_id) {
        return sendResponse(res, 400, false, {}, "Missing Parameter");
    }

    try {
        const requestData = await SurfaceOfferTable.aggregate([
            { $match: { paint_system_id: new ObjectId(paint_system_id) } },
            { $unwind: "$items" },

            {
                $facet: {
                    // CASE 1: Linked data (with ObjectIds)
                    linkedData: [
                        {
                            $match: {
                                "items.drawing_id": { $type: "objectId" },
                                "items.grid_id": { $type: "objectId" },
                                "items.main_id": { $type: "objectId" }
                            }
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
                                localField: "items.main_id",
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
                                surface_no: 1,
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
                                surface_balance_grid_qty: "$items.surface_balance_grid_qty",
                                surface_used_grid_qty: "$items.surface_used_grid_qty",
                                moved_next_step: "$items.moved_next_step",
                                remarks: "$items.remarks",
                                item_name: "$items.item_name",
                            },
                        },
                    ],

                    //  CASE 2: Raw form data (no ObjectIds)
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
                                surface_no: 1,
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
                                surface_balance_grid_qty: "$items.surface_balance_grid_qty",
                                surface_used_grid_qty: "$items.surface_used_grid_qty",
                                moved_next_step: "$items.moved_next_step",
                                remarks: "$items.remarks",
                                item_name: "$items.item_name",
                            },
                        },
                    ],
                },
            },
        ]);

        //  Combine both sets of data
        const combinedData = [
            ...(requestData[0]?.linkedData || []),
            ...(requestData[0]?.rawFormData || []),
        ];

        if (combinedData.length > 0) {
            sendResponse(res, 200, true, combinedData, "Surface offer data found");
        } else {
            sendResponse(res, 200, false, [], "Surface offer data not found");
        }
    } catch (error) {
        console.error("getSurfaceOffer error:", error);
        sendResponse(res, 500, false, {}, "Something went wrong");
    }
};


exports.updateDNPGridBalance = async (req, res) => {
    console.log("updateDNPGridBalance called");
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
                const { main_id, drawing_id, grid_id, surface_used_grid_qty } = item;

                const result = await DispatchNote.updateOne(
                    { _id: main_id, "items.drawing_id": drawing_id, "items.grid_id": grid_id },
                    {
                        $inc: {
                            "items.$.moved_next_step": -surface_used_grid_qty,
                        },
                    }
                );
            console.log("if part result", result);
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
                const { main_id, drawing_id, grid_id, surface_used_grid_qty } = item;

                const result = await DispatchNote.updateOne(
                    { _id: main_id, "items.drawing_id": drawing_id, "items.grid_id": grid_id },
                    {
                        $inc: {
                            "items.$.moved_next_step": surface_used_grid_qty,
                        },
                    }
                );
console.log("else part result", result);
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
