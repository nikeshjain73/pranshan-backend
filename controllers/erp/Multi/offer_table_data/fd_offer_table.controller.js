const FDOfferTable = require("../../../../models/erp/Multi/offer_table_data/fd_offer_table.model");
const { sendResponse } = require("../../../../helper/response");
const { default: mongoose } = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

exports.manageFDOfferTable = async (req, res) => {
  const { items, issue_acc_id, ndt_master_id } = req.body;
  if (!req.user || req.error) {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }
  const newItems = JSON.parse(items);
  if (!(issue_acc_id || ndt_master_id) || newItems.length === 0) {
    return sendResponse(res, 400, false, {}, "Missing Parameter");
  }
  const lastRecord = await FDOfferTable.findOne({})
    .sort({ fd_offer_no: -1 })
    .select("fd_offer_no")
    .exec();
  const newReportNo =
    lastRecord && lastRecord.fd_offer_no ? lastRecord.fd_offer_no + 1 : 1000;

  try {
    const ndt_master_ids = JSON.parse(ndt_master_id);
    const issue_acc_ids = JSON.parse(issue_acc_id);
    if (ndt_master_ids.length > 0) {
      const document = await FDOfferTable.findOne({
        ndt_master_id: { $in: ndt_master_ids },
        fd_master_id: { $not: { $exists: true }}
      });
      if (document) {
        const updatedItems = document.items.map((item) => {
          const matchIndex = newItems.findIndex(
            (check) =>
              item.drawing_id.toString() === check.drawing_id.toString() &&
              item.grid_id.toString() === check.grid_id.toString()
          );
          if (matchIndex !== -1) {
            const match = newItems[matchIndex];
            newItems.splice(matchIndex, 1);
            return {
              ...item,
              fd_balanced_grid_qty:
                parseInt(item.fd_balanced_grid_qty) +
                parseInt(match.fd_balanced_grid_qty),
              fd_used_grid_qty:
                parseInt(item.fd_used_grid_qty) +
                parseInt(match.fd_used_grid_qty),
            };
          }
          return item;
        });
        document.items = [...updatedItems, ...newItems];
        await document.save();
        return sendResponse(
          res,
          200,
          true,
          document,
          "Data updated successfully"
        );
      } else {
        const object = {
          items: newItems,
          fd_offer_no: newReportNo,
        };
        object["ndt_master_id"] = ndt_master_ids;
        const result = await new FDOfferTable(object).save();
        if (!result) {
          return sendResponse(res, 500, false, {}, "Failed to save data");
        }
        return sendResponse(res, 200, true, result, "Data saved successfully");
      }
    } else if (issue_acc_ids.length > 0) {
      const document = await FDOfferTable.findOne({
        issue_acc_id: { $in: issue_acc_ids },
        fd_master_id: { $not: { $exists: true }}
      });
      if (document) {
        const updatedItems = document.items.map((item) => {
          const matchIndex = newItems.findIndex(
            (check) =>
              item.drawing_id.toString() === check.drawing_id.toString() &&
              item.grid_id.toString() === check.grid_id.toString()
          );
          if (matchIndex !== -1) {
            const match = newItems[matchIndex];
            newItems.splice(matchIndex, 1);
            return {
              ...item,
              fd_balanced_grid_qty:
                parseInt(item.fd_balanced_grid_qty) +
                parseInt(match.fd_balanced_grid_qty),
              fd_used_grid_qty:
                parseInt(item.fd_used_grid_qty) +
                parseInt(match.fd_used_grid_qty),
            };
          }
          return item;
        });
        document.items = [...updatedItems, ...newItems];
        await document.save();
        return sendResponse(
          res,
          200,
          true,
          document,
          "Data updated successfully"
        );
      } else {
        const object = {
          items: newItems,
          fd_offer_no: newReportNo,
        };
        object["issue_acc_id"] = issue_acc_ids;
        const result = await new FDOfferTable(object).save();
        if (!result) {
          return sendResponse(res, 500, false, {}, "Failed to save data");
        }
        return sendResponse(res, 200, true, result, "Data saved successfully");
      }
    }
  } catch (error) {
    return sendResponse(res, 500, false, {}, "Failed to save data");
  }
};

exports.removeFDOfferTable = async (req, res) => {
  const { issue_acc_id, ndt_master_id, items, fd_offer_no } = req.body;
  if (!req.user || req.error) {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }
  if (!(issue_acc_id || ndt_master_id) || !items || !fd_offer_no) {
    return sendResponse(res, 400, false, {}, "Missing Parameter");
  }
  const parsedItems = Array.isArray(items) ? items : JSON.parse(items);
  try {
    const query = { fd_offer_no: parseInt(fd_offer_no) };
    const ndt_master_ids = JSON.parse(ndt_master_id);
    const issue_acc_ids = JSON.parse(issue_acc_id);
    if (ndt_master_ids.length > 0)
      query.ndt_master_id = { $in: ndt_master_ids };
    else if (issue_acc_ids.length > 0)
      query.issue_acc_id = { $in: issue_acc_ids };

    const document = await FDOfferTable.findOne(query);
    if (!document) {
      return sendResponse(res, 404, false, {}, "FD not found");
    }

    const updatedItems = document.items.filter(
      (item) =>
        !parsedItems.some(
          (parsedItem) => parsedItem.grid_id === item.grid_id.toString()
        )
    );
    if (updatedItems.length === document.items.length) {
      return sendResponse(res, 400, false, {}, "No items matched for removal");
    }

    if (updatedItems.length === 0) {
      await FDOfferTable.deleteOne({ _id: document._id });
      return sendResponse(
        res,
        200,
        true,
        {},
        "Document deleted as all items were removed"
      );
    }
    document.items = updatedItems;
    await document.save();
    return sendResponse(
      res,
      200,
      true,
      document,
      "Item(s) removed successfully"
    );
  } catch (error) {
    return sendResponse(res, 500, false, {}, "Server Error");
  }
};

exports.getFdOfferTable = async (req, res) => {
  const { issue_acc_id, ndt_master_id, project } = req.body;
  if (!req.user || req.error) {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }

  if (!project) {
    return sendResponse(res, 400, false, {}, "Missing Parameter");
  }

  const parseIssue = issue_acc_id
    ? JSON.parse(issue_acc_id).map((id) => new ObjectId(id))
    : [];
  const parseNdt = ndt_master_id
    ? JSON.parse(ndt_master_id).map((id) => new ObjectId(id))
    : [];

  try {
    const pipeline = [
      {
        $match: {
          $or: [
            { issue_acc_id: { $in: parseIssue } },
            { ndt_master_id: { $in: parseNdt } },
          ],
        },
      },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "erp-planner-drawings",
          localField: "items.drawing_id",
          foreignField: "_id",
          as: "drawing_id",
          pipeline: [
            {
              $lookup: {
                from: "bussiness-projects",
                localField: "project",
                foreignField: "_id",
                as: "project",
                pipeline: [
                  {
                    $lookup: {
                      from: "store-parties",
                      localField: "party",
                      foreignField: "_id",
                      as: "client",
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
          as: "grid_id",
        },
      },
      {
        $addFields: {
          grid_id: { $arrayElemAt: ["$grid_id", 0] },
          drawing_id: { $arrayElemAt: ["$drawing_id", 0] },
        },
      },
      {
        $addFields: {
          "drawing_id.project": { $arrayElemAt: ["$drawing_id.project", 0] },
        },
      },
      {
        $addFields: {
          "drawing_id.project.client": {
            $arrayElemAt: ["$drawing_id.project.client", 0],
          },
        },
      },
      {
        $project: {
          _id: 1,
          fd_offer_no: 1,
          fd_master_id: 1,
          issue_acc_id: 1,
          ndt_master_id: 1,
          createdAt: 1,
          items: {
            _id: "$items._id",
            grid_id: {
              _id: "$grid_id._id",
              grid_no: "$grid_id.grid_no",
              grid_qty: "$grid_id.grid_qty",
            },
            drawing_id: {
              _id: "$drawing_id._id",
              drawing_no: "$drawing_id.drawing_no",
              rev: "$drawing_id.rev",
              assembly_no: "$drawing_id.assembly_no",
              assembly_quantity: "$drawing_id.assembly_quantity",
              project: {
                _id: "$drawing_id.project._id",
                name: "$drawing_id.project.name",
                client: {
                  _id: "$drawing_id.project.client._id",
                  name: "$drawing_id.project.client.name",
                },
              },
            },
            required_dimension: "$items.required_dimension",
            actual_dimension: "$items.actual_dimension",
            fd_balanced_grid_qty: "$items.fd_balanced_grid_qty",
            fd_used_grid_qty: "$items.fd_used_grid_qty",
            moved_next_step: "$items.moved_next_step",
            ndt_master_id: "$ndt_master_id",
            issue_acc_id: "$issue_acc_id",
            qc_remarks: "$items.qc_remarks",
            remarks: "$items.remarks",
          },
        },
      },
      {
        $group: {
          _id: {
            _id: "$_id",
            fd_offer_no: "$fd_offer_no",
            issue_acc_id: "$issue_acc_id",
            ndt_master_id: "$ndt_master_id",
            fd_master_id: "$fd_master_id",
            createdAt: "$createdAt",
          },
          items: { $push: "$items" },
        },
      },
      {
        $project: {
          _id: "$_id._id",
          fd_offer_no: "$_id.fd_offer_no",
          issue_acc_id: "$_id.issue_acc_id",
          ndt_master_id: "$_id.ndt_master_id",
          createdAt: "$_id.createdAt",
          fd_master_id: "$_id.fd_master_id",
          items: 1,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ];

    const result = await FDOfferTable.aggregate(pipeline);

    if (!result || result.length === 0) {
      return sendResponse(res, 200, true, [], "No records found");
    }

    const mergedItems = result.reduce((acc, currentItem) => {
      currentItem.items.forEach((item) => {
        acc.push({
          ...item,
          fd_offer_no: currentItem.fd_offer_no,
          fd_master_id: currentItem.fd_master_id,
        });
      });
      return acc;
    }, []);

    const responseData = {
      items: mergedItems,
    };

    return sendResponse(
      res,
      200,
      true,
      responseData,
      "Records fetched successfully"
    );
  } catch (error) {
    sendResponse(res, 500, false, {}, `Something went wrong: ${error}`);
  }
};

exports.updateFDOfferTable = async (req, res) => {
  const { items, fd_master_id } = req.body;
  if (!req.user || req.error) {
    return sendResponse(res, 401, false, {}, "Unauthorized");
  }
  const newItems = JSON.parse(items);
  if (newItems.length === 0) {
    return sendResponse(res, 400, false, {}, "Missing Parameter");
  }
  try {
    for (const item of newItems) {
      const query = { fd_offer_no: parseInt(item.fd_offer_no) };
      const ndt_master_ids = item.ndt_master_id;
      const issue_acc_ids = item.issue_acc_id;
      if (ndt_master_ids.length > 0)
        query.ndt_master_id = { $in: ndt_master_ids };
      else if (issue_acc_ids.length > 0)
        query.issue_acc_id = { $in: issue_acc_ids };

      const document = await FDOfferTable.findOne(query);
      if (!document) {
        return sendResponse(res, 404, false, {}, "FD Offer not found");
      }
      document.fd_master_id = fd_master_id;
      const updatedItem = document.items.find(
        (ditem) => ditem._id.toString() === item._id.toString()
      );
      if (updatedItem) {
        if (item.required_dimension)
          updatedItem.required_dimension = item.required_dimension;
        if (item.actual_dimension)
          updatedItem.actual_dimension = item.actual_dimension;
        if (item.remarks) updatedItem.remarks = item.remarks;
      }
      await document.save();
    }
    return sendResponse(res, 200, true, {}, "Item(s) updated successfully");
  } catch (error) {
    return sendResponse(res, 500, false, {}, "Failed to save data");
  }
};
