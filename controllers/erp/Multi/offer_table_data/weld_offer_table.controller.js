const WeldVisualOfferTable = require('../../../../models/erp/Multi/offer_table_data/weld_offer_table.model');
const { sendResponse } = require("../../../../helper/response");
const { default: mongoose } = require('mongoose');

exports.getWeldVisualTableOffer = async (req, res) => {
    const { fitup_id } = req.query;
    console.log("test")
    if (!req.user || req.error) {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }

    if (!fitup_id) {
        return sendResponse(res, 200, true, [], "Please select fitup");
    }
    try {
        const pipeline = [
            { $match: { fitup_id: new mongoose.Types.ObjectId(fitup_id) } },
            {
                $lookup: {
                    from: 'multi-erp-fitup-inspections',
                    localField: 'fitup_id',
                    foreignField: '_id',
                    as: 'fitup_info',
                },
            },
            { $unwind: { path: '$fitup_info', preserveNullAndEmptyArrays: true } },
            {
                $unwind: {
                    path: '$items',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $addFields: {
                    fitup_item: {
                        $arrayElemAt: [
                            {
                                $filter: {
                                    input: '$fitup_info.items',
                                    as: 'fitup_item',
                                    cond: { $eq: ['$$fitup_item.grid_item_id', '$items.grid_item_id'] }
                                },
                            },
                            0,
                        ],
                    },
                },
            },
            {
                $lookup: {
                    from: 'qualified_welder_lists',
                    localField: 'items.weldor_no',
                    foreignField: '_id',
                    as: 'weldor_no',
                }
            },
            { $unwind: { path: '$weldor_no', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'erp-drawing-grid-items',
                    localField: 'items.grid_item_id',
                    foreignField: '_id',
                    as: 'grid_item',
                },
            },
            { $unwind: { path: '$grid_item', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'store-items',
                    localField: 'grid_item.item_name',
                    foreignField: '_id',
                    as: 'item_name',
                }
            },
            { $unwind: { path: '$item_name', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'erp-drawing-grids',
                    localField: 'grid_item.grid_id',
                    foreignField: '_id',
                    as: 'grid_id',
                },
            },
            { $unwind: { path: '$grid_id', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'erp-planner-drawings',
                    localField: 'items.drawing_id',
                    foreignField: '_id',
                    as: 'drawing',
                },
            },
            { $unwind: { path: '$drawing', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'qualified_welder_lists',
                    localField: 'items.weldor_no',
                    foreignField: '_id',
                    as: 'welder',
                },
            },
            { $unwind: { path: '$welder', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'joint-types',
                    localField: 'fitup_item.joint_type',
                    foreignField: '_id',
                    as: 'joint_types',
                },
            },
            {
                $lookup: {
                    from: 'store-wps-masters',
                    localField: 'fitup_item.wps_no',
                    foreignField: '_id',
                    as: 'wps',
                },
            },
            {
                $addFields: {
                    joint_types: {
                        $map: {
                            input: '$joint_types',
                            as: 'joint_type',
                            in: { name: '$$joint_type.name' },
                        },
                    },
                    wps_no: {
                        $cond: {
                            if: { $gt: [{ $size: '$wps' }, 0] },
                            then: {
                                wpsNo: { $arrayElemAt: ['$wps.wpsNo', 0] },
                                _id: { $arrayElemAt: ['$wps._id', 0] },
                                weldingProcess: { $arrayElemAt: ['$wps.weldingProcess', 0] }
                            },
                            else: { wpsNo: '', _id: '', weldingProcess: '' },
                        },
                    },
                },
            },
            {
                $project: {
                    fitup_id: 1,
                    report_no: 1,
                    items: {
                        _id: '$items._id',
                        grid_item_id: {
                            _id: '$grid_item._id',
                            grid_id: {
                                _id: '$grid_id._id',
                                grid_no: '$grid_id.grid_no',
                                grid_qty: '$grid_id.grid_qty',
                                drawing_id: '$grid_id.drawing_id'
                            },
                            item_name: {
                                _id: '$item_name._id',
                                name: '$item_name.name',
                            },
                            item_no: '$grid_item.item_no',
                        },
                        drawing_id: '$items.drawing_id',
                        weldor_no: '$welder._id',
                        weld_balance_qty: '$items.weld_balance_qty',
                        weld_used_grid_qty: '$items.weld_used_grid_qty',
                        moved_next_step: '$items.moved_next_step',
                        remarks: '$items.remarks',
                        qc_remarks: '$items.qc_remarks',
                        is_accepted: '$items.is_accepted',
                        weldor_no: '$items.weldor_no',
                        joint_type: '$joint_types',
                        wps_no: '$wps_no',
                    },
                },
            },
        ];

        const result = await WeldVisualOfferTable.aggregate(pipeline);
        console.log("result ", result);
        
        if (!result || result.length === 0) {
            return sendResponse(res, 200, true, [], "No records found");
        }

        const responseData = {
            fitup_id,
            items: result.map((item) => ({
                ...item.items,
                report_no: item.report_no,
            })),
        };

        console.log("responseData ",responseData);

        return sendResponse(res, 200, true, responseData, "Records fetched successfully");

    } catch (error) {
        sendResponse(res, 500, false, {}, `Something went wrong: ${error}`);
    }
}

exports.manageWeldVisualOfferTable = async (req, res) => {
    const { fitup_id, items } = req.body;
    if (!req.user || req.error) {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }
    const newItems = JSON.parse(items);

    if (!fitup_id || newItems.length === 0) {
        return sendResponse(res, 400, false, {}, "Missing Parameter");
    }
    const lastRecord = await WeldVisualOfferTable.findOne({})
        .sort({ report_no: -1 })
        .select("report_no")
        .exec();

    const newReportNo = lastRecord && lastRecord.report_no ? lastRecord.report_no + 1 : 1000;
    const object = new WeldVisualOfferTable({
        fitup_id,
        items: newItems,
        report_no: newReportNo,
    });
    try {
        const result = await object.save();
        if (!result) {
            return sendResponse(res, 500, false, {}, "Failed to save data");
        }
        return sendResponse(res, 200, true, result, "Data saved successfully");

    } catch (error) {
        return sendResponse(res, 500, false, {}, "Failed to save data");
    }
}

exports.removeWeldVisualOfferTable = async (req, res) => {
    const { fitup_id, items, report_no } = req.body;
    if (!req.user || req.error) {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }
    if (!fitup_id || !items || !report_no) {
        return sendResponse(res, 400, false, {}, "Missing Parameter");
    }
    const parsedItems = Array.isArray(items) ? items : JSON.parse(items);
    try {
        const document = await WeldVisualOfferTable.findOne({ fitup_id: fitup_id, report_no: parseInt(report_no) });

        if (!document) {
            return sendResponse(res, 404, false, {}, "Fitup not found");
        }
        const updatedItems = document.items.filter(item => !parsedItems.some(
            parsedItem => parsedItem._id === item._id.toString()
        ));
        if (updatedItems.length === document.items.length) {
            return sendResponse(res, 400, false, {}, "No items matched for removal");
        }

        if (updatedItems.length === 0) {
            await WeldVisualOfferTable.deleteOne({ _id: document._id });
            return sendResponse(res, 200, true, {}, "Document deleted as all items were removed");
        }
        document.items = updatedItems;
        await document.save();
        return sendResponse(res, 200, true, document, "Item(s) removed successfully");
    } catch (error) {
        return sendResponse(res, 500, false, {}, "Server Error");
    }
};

exports.updatedWeldVisualOfferTable = async (req, res) => {
    try {
        const { items } = req.body;
        if (!req.user || req.error) {
            return sendResponse(res, 401, false, {}, "Unauthorized");
        }

        let parsedItems;
        try {
            parsedItems = JSON.parse(items);
        } catch (error) {
            return sendResponse(res, 400, false, {}, "Invalid JSON format for items");
        }

        if (!parsedItems || !Array.isArray(parsedItems) || parsedItems.length === 0) {
            return sendResponse(res, 400, false, {}, "Missing or invalid parameter: items");
        }

        for (const item of parsedItems) {
            const {
                report_no,
                fitupId,
                off_item_id,
                drawing_id,
                weld_balance_qty,
                weld_used_grid_qty,
                grid_item_id,
                weldor_no,
                remarks,
            } = item;

            if (!report_no || !fitupId || !off_item_id) {
                return sendResponse(res, 400, false, {}, "Missing required fields in item");
            }

            const weldVisualEntry = await WeldVisualOfferTable.findOneAndUpdate(
                {
                    report_no,
                    fitup_id: fitupId,
                    "items._id": off_item_id
                },
                {
                    $set: {
                        "items.$.drawing_id": drawing_id,
                        "items.$.weld_balance_qty": weld_balance_qty,
                        "items.$.weld_used_grid_qty": weld_used_grid_qty,
                        "items.$.grid_item_id": grid_item_id,
                        "items.$.weldor_no": weldor_no,
                        "items.$.remarks": remarks
                    }
                },
                { new: true }
            );

            if (!weldVisualEntry) {
                return sendResponse(res, 404, false, {}, `No matching entry found for report_no: ${report_no}, fitupId: ${fitupId}, off_item_id: ${off_item_id}`);
            }
        }

        return sendResponse(res, 200, true, {}, "Weld Visual Offer Table updated successfully");
    } catch (error) {
        console.error("Error updating Weld Visual Offer Table:", error);
        return sendResponse(res, 500, false, {}, "Internal Server Error");
    }
};