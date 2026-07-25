const { sendResponse } = require("../../../../helper/response");
const ISOfferTable = require("../../../../models/erp/Multi/offer_table_data/dispatch_offer_table.model");
const InspectSummary = require("../../../../models/erp/Multi/inspect_summary/multi_inspect_summary.model");
const { default: mongoose } = require("mongoose");
const { Types: { ObjectId } } = require("mongoose");


exports.manageDispatchOfferTable = async (req, res) => {
    const { items } = req.body;

    if (!req.user || req.error) {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }

    const newItems = JSON.parse(items);
    // const newItems = items;

    let lastRecord = await ISOfferTable.findOne({})
        .sort({ dispatch_no: -1 })
        .select("dispatch_no")
        .exec();

    try {
        let dataAdded = false;
        let dataUpdated = false;

        for (const o of newItems) {
            const updated = await ISOfferTable.updateOne(
                {
                    "items.drawing_id": new ObjectId(o.drawing_id),
                    "items.grid_id": new ObjectId(o.grid_id),
                },
                {
                    $inc: {
                        "items.$.dispatch_used_grid_qty": o.dispatch_used_grid_qty,
                    }
                },
            );

            if (updated.modifiedCount > 0) {
                dataUpdated = true;
            }

            if (updated.modifiedCount === 0) {
                const newReportNo = lastRecord && lastRecord.dispatch_no ? lastRecord.dispatch_no + 1 : 1000;

                const newItem = await ISOfferTable.create(
                    {
                        dispatch_no: newReportNo,
                        items: [{
                            main_id: o.main_id,
                            drawing_id: o.drawing_id,
                            grid_id: o.grid_id,
                            dispatch_balance_grid_qty: o.dispatch_balance_grid_qty,
                            dispatch_used_grid_qty: o.dispatch_used_grid_qty,
                        }],
                    },
                );

                if (newItem) {
                    dataAdded = true;
                }

                lastRecord = await ISOfferTable.findOne({})
                    .sort({ dispatch_no: -1 })
                    .select("dispatch_no")
                    .exec();
            }
        }

        if (dataAdded && dataUpdated) {
            return sendResponse(res, 200, true, {}, "Dispatch Note data added and updated successfully");
        } else if (dataAdded) {
            return sendResponse(res, 200, true, {}, "Dispatch Note data added successfully");
        } else if (dataUpdated) {
            return sendResponse(res, 200, true, {}, "Dispatch Note updated successfully");
        } else {
            return sendResponse(res, 400, false, {}, "Dispatch Note data not added or updated");
        }

    } catch (error) {
        console.log("error", error)
        return sendResponse(res, 500, false, {}, "Internal server error");
    }

};

exports.updateDispatchOffer = async (req, res) => {
    const {
        id,
        item_detail_id,   // item object id
        items
    } = req.body;

    if (req.user && !req.error) {
        try {
            if (id) {
                const updateDispatchOffer = await ISOfferTable.updateOne(
                    { _id: id, "items._id": item_detail_id },
                    {
                        $set: {
                            "items.$.ass_weight": items.ass_weight,
                            "items.$.ass_area": items.ass_area,
                            "items.$.paint_system": items.paint_system,
                            "items.$.remarks": items.remarks,
                        },
                    }
                )

                if (updateDispatchOffer.modifiedCount > 0) {
                    sendResponse(res, 200, true, {}, `Dispatch note update successfully`);
                } else {
                    sendResponse(res, 400, false, {}, `Dispatch note not update`);
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

exports.deleteDispatchOffer = async (req, res) => {
    const { id } = req.body;
    if (req.user && !req.error) {
        try {
            if (id) {
                const deleteDispatchOffer = await ISOfferTable.deleteOne({ _id: new ObjectId(id), });

                if (deleteDispatchOffer.deletedCount > 0) {
                    sendResponse(res, 200, true, {}, `Dispatch offer deleted successfully`);
                } else {
                    sendResponse(res, 400, false, {}, `Dispatch offer not delete`);
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

exports.getDispatchOffer = async (req, res) => {
    const { project_id } = req.body;
    if (!req.user || req.error) {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }
    if (!project_id) {
        return sendResponse(res, 400, false, {}, "Missing Parameter");
    }
    try {

        const requestData = await ISOfferTable.aggregate([
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
                    from: "painting-systems",
                    localField: "items.paint_system",
                    foreignField: "_id",
                    as: "paintDetails",
                },
            },
            {
                $lookup: {
                    from: "erp-drawing-grid-items",
                    let: { drawingId: "$items.drawing_id", gridId: "$items.grid_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$drawing_id", "$$drawingId"] },
                                        { $eq: ["$grid_id", "$$gridId"] }
                                    ]
                                }
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                totalAssemblyWeight: { $sum: "$assembly_weight" },
                                totalAssemblySurfaceArea: { $sum: "$assembly_surface_area" }
                            }
                        }
                    ],
                    as: "gridItemDetails"
                }
            },
            {
                $addFields: {
                    drawingDetails: { $arrayElemAt: ["$drawingDetails", 0] },
                    gridDetails: { $arrayElemAt: ["$gridDetails", 0] },
                    gridItemDetails: { $arrayElemAt: ["$gridItemDetails", 0] },
                    paintDetails: { $arrayElemAt: ["$paintDetails", 0] },
                },
            },
            {
                $addFields: {
                    projectDetails: {
                        $arrayElemAt: ["$drawingDetails.projectDetails", 0],
                    },
                    ass_weight: {
                        $multiply: ["$gridItemDetails.totalAssemblyWeight", "$items.dispatch_used_grid_qty"]
                    },
                    ass_area: {
                        $multiply: ["$gridItemDetails.totalAssemblySurfaceArea", "$items.dispatch_used_grid_qty"]
                    }
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
                $match: {
                    "projectDetails._id": new ObjectId(project_id)
                }
            },
            {
                $project: {
                    _id: 1,
                    main_id: "$items.main_id",
                    item_detail_id: "$items._id",
                    dispatch_no: 1,
                    drawing_no: "$drawingDetails.drawing_no",
                    drawing_id: "$drawingDetails._id",
                    rev: "$drawingDetails.rev",
                    sheet_no: "$drawingDetails.sheet_no",
                    assembly_no: "$drawingDetails.assembly_no",
                    assembly_quantity: "$drawingDetails.assembly_quantity",
                    grid_no: "$gridDetails.grid_no",
                    grid_id: "$gridDetails._id",
                    grid_qty: "$gridDetails.grid_qty",
                    dispatch_balance_grid_qty: "$items.dispatch_balance_grid_qty",
                    dispatch_used_grid_qty: "$items.dispatch_used_grid_qty",
                    moved_next_step: "$items.moved_next_step",
                    ass_weight: "$ass_weight",
                    ass_area: "$ass_area",
                    paint_system_no: "$paintDetails.paint_system_no",
                    paint_system_id: "$paintDetails._id",
                    remarks: "$items.remarks",
                }
            }
        ]);

        if (requestData.length && requestData.length > 0) {
            sendResponse(res, 200, true, requestData, "Dispatch offer data found");
        } else {
            sendResponse(res, 200, false, [], `Dispatch offer data not found`);
        }
    } catch (error) {
        console.log("error", error)
        sendResponse(res, 500, false, {}, "Something went wrong11");
    }
};

exports.updateISGridBalance = async (req, res) => {
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
                const { main_id, drawing_id, grid_id, dispatch_used_grid_qty } = item;

                const result = await InspectSummary.updateOne(
                    { _id: main_id, "items.drawing_id": drawing_id, "items.grid_id": grid_id },
                    {
                        $inc: {
                            "items.$.moved_next_step": -dispatch_used_grid_qty,
                        },
                    }
                );

                matchedCount += result.matchedCount;
                modifiedCount += result.modifiedCount;
            }

            if (matchedCount === 0) {
                return sendResponse(res, 404, false, {}, "No inspection summary record found");
            } else if (modifiedCount > 0) {
                return sendResponse(res, 200, true, {}, "Grid balance updated successfully");
            } else {
                return sendResponse(res, 400, false, {}, "Grid balance not updated");
            }
        } else {
            for (const item of itemArray) {
                const { main_id, drawing_id, grid_id, dispatch_used_grid_qty } = item;

                const result = await InspectSummary.updateOne(
                    { _id: main_id, "items.drawing_id": drawing_id, "items.grid_id": grid_id },
                    {
                        $inc: {
                            "items.$.moved_next_step": dispatch_used_grid_qty,
                        },
                    }
                );

                matchedCount += result.matchedCount;
                modifiedCount += result.modifiedCount;
            }

            if (matchedCount === 0) {
                return sendResponse(res, 404, false, {}, "No inspection summary record found");
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
