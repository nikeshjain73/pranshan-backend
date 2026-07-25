const Issue = require("../../../models/erp/material_controller/issue.model");
const RequestModal = require("../../../models/erp/planner/request.model");
const TransactionItem = require("../../../models/store/transaction_item.model");
const ItemStock = require("../../../models/store/item_stock.model");
const PurchaseOffer = require("../../../models/store/purchase_offer.model");
const { sendResponse } = require("../../../helper/response");
const { Status } = require("../../../utils/enum");

exports.getIssue = async (req, res) => {
  const { project } = req.body;

  if (req.user && !req.error) {
    const filter = { deleted: false };
    if (project) {
      filter.project = project;
    }
    try {
      await Issue.find(filter, { deleted: 0 })
        .populate("client", "name")
        .populate("project", "name")
        .populate("itemName", "name")
        .populate("issuedBy", "user_name")
        .populate("request_id", "requestNo")
        .populate({
          path: "drawingNo",
          select: "drawing_no rev assembly_no",
        })
        .sort({ createdAt: -1 })
        .then((data) => {
          sendResponse(res, 200, true, data, "Issue data found successfully");
        });
    } catch (err) {
      sendResponse(res, 500, false, {}, "Someting went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorised");
  }
};

exports.manageIssue = async (req, res) => {
  const {
    id,
    client,
    project,
    contractorName,
    drawingNo,
    unit,
    profile,
    requestedQty,
    issuedQty,
    issueDate,
    remarks,
    request_id,
    itemName,
    issuedBy,
    issued_length,
    issued_width,
    heat_no,
  } = req.body;

  if (req.user && !req.error) {
    if (
      client &&
      project &&
      requestedQty &&
      issuedQty &&
      drawingNo &&
      request_id &&
      itemName &&
      issuedBy
    ) {
      let lastIssue = await Issue.findOne(
        { deleted: false },
        { deleted: 0 },
        { sort: { createdAt: -1 } }
      );

      let miv_no = "1";
      if (lastIssue && lastIssue.miv_no) {
        const split = lastIssue.miv_no.split("/");
        const lastimivNo = parseInt(split[split.length - 1]);
        miv_no = lastimivNo + 1;
      }

      const gen_miv_no = `VE/MIV/${miv_no}`;

      const issueObject = new Issue({
        client: client,
        project: project,
        miv_no: gen_miv_no,
        contractorName: contractorName,
        drawingNo: drawingNo,
        unit: unit,
        requestedQty: requestedQty,
        issuedQty: issuedQty,
        profile: profile,
        issueDate: issueDate,
        remarks: remarks,
        request_id: request_id,
        itemName: itemName,
        issuedBy: issuedBy,
        issued_length: issued_length === "undefined" ? 0 : issued_length,
        issued_width: issued_width === "undefined" ? 0 : issued_width,
        heat_no: heat_no,
      });

      if (!id) {
        try {
          const requestObject = await RequestModal.findOne({ _id: request_id });
          const issuedItem = await TransactionItem.findOne({
            requestId: requestObject,
            itemName: itemName,
          });

          const purchaseOfferObject = await PurchaseOffer.findOne({
            transactionId: issuedItem?._id,
          });
          const availableStock = await getAvailableStock(
            issuedItem?.itemName,
            issuedItem?.store_type
          );

          if (!issuedItem || !purchaseOfferObject) {
            sendResponse(
              res,
              400,
              false,
              {},
              "Issued item or offered request is unavailable"
            );
            return;
          }

          if (
            !availableStock ||
            availableStock.quantity < issuedQty ||
            availableStock.quantity == 0
          ) {
            sendResponse(res, 400, false, {}, "Insufficient stock available");
            return;
          }
          issuedItem.status =
            issuedItem.balance_qty === 0 ? Status.Approved : Status.Pending;
          await issuedItem.save();

          availableStock.quantity -= parseFloat(issuedQty);
          await availableStock.save();

          purchaseOfferObject.status =
            issuedItem.status === Status.Approved && Status.Completed;
          await purchaseOfferObject.save();

          await checkRequestStatus(request_id);
          issueObject.status = Status.Completed;
          await issueObject.save();

          sendResponse(res, 200, true, {}, "Item issued successfully");
        } catch (err) {
          sendResponse(res, 500, false, {}, "Something went wrong");
          return;
        }
      } else {
        try {
          await Issue.findByIdAndUpdate(id, {
            client: client,
            project: project,
            contractorName: contractorName,
            drawingNo: drawingNo,
            unit: unit,
            requestedQty: requestedQty,
            issuedQty: issuedQty,
            profile: profile,
            issueDate: issueDate,
            remarks: remarks,
            issuedBy: issuedBy,
            issued_length: issued_length,
            heat_no: heat_no,
          }).then((data) => {
            sendResponse(res, 200, true, {}, "Issue updated successfully");
          });
        } catch (err) {
          sendResponse(res, 500, false, {}, "Something went wrong");
          return;
        }
      }
    } else {
      sendResponse(res, 400, false, {}, "Missing parameters");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorised");
  }
};

exports.deleteIssue = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error && id) {
    try {
      await Issue.findByIdAndUpdate(id, { deleted: true }).then((data) => {
        if (data) {
          sendResponse(res, 200, true, {}, "Issue deleted successfully");
        } else {
          sendResponse(res, 500, false, {}, "No issue with this id exist");
        }
      });
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

const checkRequestStatus = async (requestId) => {
  const requestObject = await RequestModal.findOne({ _id: requestId });
  const allTransactions = await TransactionItem.find({ requestId: requestId });
  const allDone = allTransactions.every(
    (item) => item.status === Status.Approved
  );

  if (allDone) {
    requestObject.status = Status.Completed;
    await requestObject.save();
  }
};

const getAvailableStock = async (item, store_type) => {
  const stockDetails = await ItemStock.findOne({
    item: item,
    store_type: store_type,
  });
  return stockDetails;
};
