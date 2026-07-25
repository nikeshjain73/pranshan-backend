const MultiIssueOfferTable = require('../../../../models/erp/Multi/offer_table_data/issue_offer_table.model');
const { sendResponse } = require("../../../../helper/response");


exports.getIssueOfferTable = async (req, res) => {
    const { contractor_id } = req.query;
    if (!req.user || req.error) {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }

    try {
        const query = {};
        if (contractor_id) query.contractor_id = contractor_id;

        let result = await MultiIssueOfferTable.find(query)
            .populate({
                path: "items",
                select: "drawing_id grid_id item_name used_grid_qty balance_grid_qty item_qty item_weight item_no item_width multiply_iss_qty assembly_surface_area item_length assembly_weight is_issue",
                populate: [
                    { path: "item_name", select: "name" },
                    { path: "grid_id", select: "grid_no grid_qty" },
                    // { path: "drawing_id", select: "drawing_no" },
                ],
            });

        if (result.length === 0) {
            return sendResponse(res, 200, true, [], "No records found");
        }

        const mergedItems = result.flatMap(entry =>
            entry.items.map(item => ({
                ...item.toObject(),
                report_no: entry.report_no,
            }))
        );

        const responseData = {
            contractor_id: contractor_id || result[0].contractor_id,
            items: mergedItems
        };

        return sendResponse(res, 200, true, responseData, "Records fetched successfully");

    } catch (error) {
        sendResponse(res, 500, false, {}, `Something went wrong: ${error}`);
    }
}

exports.manageIssueOfferTable = async (req, res) => {
    const { contractor_id, items } = req.body;
    if (!req.user || req.error) {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }
    const newItems = items ? JSON.parse(items) : [];

    if (!contractor_id || newItems.length === 0) {
        return sendResponse(res, 400, false, {}, "Missing Parameter");
    }

    const lastRecord = await MultiIssueOfferTable.findOne({})
        .sort({ report_no: -1 })
        .select("report_no")
        .exec();

    const newReportNo = lastRecord && lastRecord.report_no ? lastRecord.report_no + 1 : 1000;

    const object = new MultiIssueOfferTable({
        contractor_id,
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

exports.removeIssueOfferTable = async (req, res) => {
    const { contractor_id, items, report_no } = req.body;

    if (!req.user || req.error) {
        return sendResponse(res, 401, false, {}, "Unauthorized");
    }

    if (!contractor_id || !items || !report_no) {
        return sendResponse(res, 400, false, {}, "Missing Parameter");
    }

    const parsedItems = Array.isArray(items) ? items : JSON.parse(items);

    try {

        const document = await MultiIssueOfferTable.findOne({ contractor_id: contractor_id, report_no: parseInt(report_no) });

        if (!document) {
            return sendResponse(res, 404, false, {}, "Issue not found");
        }

        const updatedItems = document.items.filter(item => !parsedItems.some(
            parsedItem => parsedItem._id === item._id.toString()
        ));

        if (updatedItems.length === document.items.length) {
            return sendResponse(res, 400, false, {}, "No items matched for removal");
        }

        if (updatedItems.length === 0) {
            await MultiIssueOfferTable.deleteOne({ _id: document._id });
            return sendResponse(res, 200, true, {}, "Document deleted as all items were removed");
        }

        document.items = updatedItems;
        await document.save();

        return sendResponse(res, 200, true, document, "Item(s) removed successfully");
    } catch (error) {
        console.error("Error in removeFitupOfferTable:", error);
        return sendResponse(res, 500, false, {}, "Server Error");
    }
}

exports.updatedIssueOfferTable = async (req, res) => {
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


        if (!parsedItems || parsedItems.length === 0) {
            return sendResponse(res, 400, false, {}, "Missing or invalid parameter: items");
        }

        for (const item of parsedItems) {
            const {
                report_no,
                contractorId,
                grid_item_id,
                remarks,
                used_grid_qty,
                balance_grid_qty,
                is_issue,
            } = item;


            if (!report_no || !contractorId || !grid_item_id) {
                return sendResponse(res, 400, false, {}, "Missing required fields in item");
            }

            const issueEntry = await MultiIssueOfferTable.findOneAndUpdate(
                {
                    contractor_id: contractorId,
                    report_no: parseInt(report_no),
                    "items._id": grid_item_id,
                },
                {
                    $set: {
                        "items.$used_grid_qty": used_grid_qty,
                        "items.$balance_grid_qty": balance_grid_qty,
                        "items.$.remarks": remarks,
                        "items.$.is_issue": is_issue,
                    },
                },
                { new: true }
            );
            if (!issueEntry) {
                return sendResponse(res, 404, false, {}, `No matching entry found for report_no: ${report_no}, contractorId: ${contractorId}, grid_item_id: ${grid_item_id}`);
            }
        }
        return sendResponse(res, 200, true, {}, "Issue Offer Table updated successfully");
    } catch (error) {
        console.error("Error updating Fitup Offer Table:", error);
        return sendResponse(res, 500, false, {}, "Internal Server Error");
    }
}