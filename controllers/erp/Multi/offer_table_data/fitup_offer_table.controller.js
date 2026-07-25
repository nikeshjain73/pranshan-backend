const FitupOfferTable = require('../../../../models/erp/Multi/offer_table_data/fitup_offer_table.model');
const { sendResponse } = require("../../../../helper/response");

exports.getFitupTableOff = async (req, res) => {
    const { issue_id, fitup_id } = req.query;
    if (!req.user || req.error) {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }
    try {
        const query = {};
        if (issue_id) query.issue_id = issue_id;
        if (fitup_id) query.fitup_id = fitup_id;

        let result = await FitupOfferTable.find(query)
            .populate({
                path: "items.grid_item_id",
                select: "drawingId grid_id item_name grid_no item_no",
                populate: [
                    { path: "item_name", select: "name" },
                    { path: "grid_id", select: "grid_no grid_qty" },
                ],
            })
            .populate({
                path: "items.joint_type",
                select: "name",
            })
        if (result.length === 0) {
            return sendResponse(res, 200, true, [], "No records found");
        }

        const mergedItems = result.reduce((acc, currentItem) => {
            if (currentItem.issue_id.toString() === issue_id.toString()) {
                currentItem.items.forEach((item) => {
                    acc.push({
                        ...item.toObject(),
                        report_no: currentItem.report_no,
                    });
                });
            }
            return acc;
        }, []);

        const responseData = { issue_id: issue_id, items: mergedItems };

        return sendResponse(res, 200, true, responseData, "Records fetched successfully");
    } catch (error) {
        sendResponse(res, 500, false, {}, `Something went wrong: ${error}`);
    }
}

exports.manageFitupOfferTable = async (req, res) => {
    const { issue_id, items } = req.body;

    if (!req.user || req.error) {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }

    const newItems = JSON.parse(items);

    if (!issue_id || newItems.length === 0) {
        return sendResponse(res, 400, false, {}, "Missing Parameter");
    }

    const lastRecord = await FitupOfferTable.findOne({})
        .sort({ report_no: -1 })
        .select("report_no")
        .exec();

    const newReportNo = lastRecord && lastRecord.report_no ? lastRecord.report_no + 1 : 1000;

    const object = new FitupOfferTable({
        issue_id,
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

exports.removeFitupOfferTable = async (req, res) => {
    const { issue_id, items, report_no } = req.body;

    if (!req.user || req.error) {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }

    if (!issue_id || !items || !report_no) {
        return sendResponse(res, 400, false, {}, "Missing Parameter");
    }

    const parsedItems = Array.isArray(items) ? items : JSON.parse(items);

    try {
        const document = await FitupOfferTable.findOne({ issue_id: issue_id, report_no: parseInt(report_no) });

        if (!document) {
            return sendResponse(res, 404, false, {}, "Issue not found");
        }

        // Filter out the item(s) to be removed
        const updatedItems = document.items.filter(item => !parsedItems.some(
            parsedItem => parsedItem._id === item._id.toString()
        ));

        if (updatedItems.length === document.items.length) {
            return sendResponse(res, 400, false, {}, "No items matched for removal");
        }

        // Check if the updated items array is empty
        if (updatedItems.length === 0) {
            await FitupOfferTable.deleteOne({ _id: document._id });
            return sendResponse(res, 200, true, {}, "Document deleted as all items were removed");
        }

        document.items = updatedItems;
        await document.save();

        return sendResponse(res, 200, true, document, "Item(s) removed successfully");
    } catch (error) {
        console.error("Error in removeFitupOfferTable:", error);
        return sendResponse(res, 500, false, {}, "Server Error");
    }
};


exports.updatedFitupOfferTable = async (req, res) => {
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
                issueId,
                off_item_id,
                drawing_id,
                fitOff_used_grid_qty,
                fitOff_balance_qty,
                grid_item_id,
                joint_type,
                remarks
            } = item;

            if (!report_no || !issueId || !off_item_id) {
                return sendResponse(res, 400, false, {}, "Missing required fields in item");
            }

            const fitupEntry = await FitupOfferTable.findOneAndUpdate(
                {
                    report_no,
                    issue_id: issueId,
                    "items._id": off_item_id
                },
                {
                    $set: {
                        "items.$.drawing_id": drawing_id,
                        "items.$.fitOff_used_grid_qty": fitOff_used_grid_qty,
                        "items.$.fitOff_balance_qty": fitOff_balance_qty,
                        "items.$.grid_item_id": grid_item_id,
                        "items.$.joint_type": joint_type,
                        "items.$.remarks": remarks
                    }
                },
                { new: true }
            );

            if (!fitupEntry) {
                return sendResponse(res, 404, false, {}, `No matching entry found for report_no: ${report_no}, issueId: ${issueId}, off_item_id: ${off_item_id}`);
            }
        }

        return sendResponse(res, 200, true, {}, "Fitup Offer Table updated successfully");
    } catch (error) {
        console.error("Error updating Fitup Offer Table:", error);
        return sendResponse(res, 500, false, {}, "Internal Server Error");
    }
};