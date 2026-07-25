const PurchaseReturn = require("../../models/store/purchase_return.model");
const PurchaseOrder = require("../../models/store/purchase_order.model");

const ItemStock = require("../../models/store/item_stock.model");
const { sendResponse } = require("../../helper/response");
const { Status } = require("../../utils/enum");

exports.getPurchaseReturn = async (req, res) => {

  if (req.user && !req.error) {
    try {
      await PurchaseReturn.find({ deleted: false }, { deleted: 0 })
        .populate("purchaseOrder", "billNo supplier orderDate lrNo transport")
        .populate("approvedBy", "full_name")
        .populate("preparedBy", "full_name")
        .populate('firm_id','name')
        .populate('year','start_year  end_year')
        .then((data) => {
          if (data) {
            sendResponse(res, 200, true, data, "Purchase return list");
          } else {
            sendResponse(res, 200, true, data, "Purchase return not found");
          }
        });
    } catch (err) {
   sendResponse(res, 500, false, {}, "Something went wrong");    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorised");
  }
};

exports.managePurchaseReturn = async (req, res) => {
  const {
    firm_id,
    year_id,
    purchaseReturnNo,
    purchaseOrder,
    returnDate,
    approvedBy,
    preparedBy,
    reason,
    items,
    id,
  } = req.body;
  if (req.user) {
    if (
      firm_id &&
      year_id &&
      purchaseReturnNo &&
      purchaseOrder &&
      reason &&
      items &&
      returnDate &&
      approvedBy &&
      preparedBy
    ) {
      try {
        const purchaseOrderDoc = await PurchaseOrder.findById(purchaseOrder);
        if (!purchaseOrderDoc || purchaseOrderDoc.status !== Status.Delivered) {
          sendResponse(res, 400, false, {}, "Invalid purchase order or order not delivered");
          return;
        }

        for (const material of items) {
          const foundItem = purchaseOrderDoc.items.find(
            (orderedItem) => orderedItem.item.toString() === material.item.toString()
          );
          if (!foundItem) {
            sendResponse(res, 400, false, {}, "Item not found in the original purchase order");
            return;
          }
          if (material.quantity > foundItem.quantity) {
            sendResponse(res, 400, false, {}, "Return quantity cannot exceed ordered quantity");
            return;
          }
        }

        const PurchaseReturnObject = new PurchaseReturn({
          firm_id,
          year_id,
          purchaseReturnNo,
          purchaseOrder,
          returnDate,
          approvedBy,
          preparedBy,
          reason,
          items,
        });

        if (!id) {
          try {
            await PurchaseReturnObject.save().then((data) => {
              sendResponse(res, 200, true, {}, "Purchase return created successfully");
            });
          } catch (error) {
            console.error(error);
            sendResponse(res, 500, false, {}, "Failed to save purchase return: " + error.message);
          }
        } else {
          try {
            const updatedPurchaseReturn = await PurchaseReturn.findByIdAndUpdate(id, {
              firm_id,
              year_id,
              purchaseReturnNo,
              purchaseOrder,
              returnDate,
              approvedBy,
              preparedBy,
              reason,
              items,
            });
            if (updatedPurchaseReturn) {
              sendResponse(res, 200, true, data, "Purchase return updated successfully");
            } else {
              sendResponse(res, 200, true, {}, "Purchase return not found");
            }
          } catch (error) {
            console.error(error);
            sendResponse(res, 500, false, {}, "Failed to update purchase return: " + error.message);
          }
        }
      } catch (error) {
        console.error(error);
        sendResponse(res, 500, false, {}, "Error while processing purchase return");
      }
    } else {
      sendResponse(res, 400, false, {}, "Missing parameters");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};


exports.deletePurchaseReturn = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error && id) {
    try {
      await PurchaseReturn.findByIdAndUpdate(id, { deleted: true }).then((data) => {
        if (data) {
          sendResponse(res, 200, true, {}, "Purchase return deleted successfully");
        }
      });
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong" + error);
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.updatePrStatus = async (req, res) => {
  if (req.body && !req.error) {
    const { id, status } = req.body;

    if (id && status) {
      await PurchaseOrder.findByIdAndUpdate(id, { status }).then((data) => {
        if (data) {
          sendResponse(res, 200, true, {}, "Status changed successfully");
        } else {
          sendResponse(res, 200, true, {}, "Purchase return not found");
        }
      }).catch((error) => {
        sendResponse(res, 500, false, {}, "Something went wrong");
      })
    } else {
      sendResponse(res, 400, false, {}, "Missing parameters");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
}

exports.updatePurchaseReturnStocks = async (req, res) => {
  if (req.body && !req.error) {
    const { id, status } = req.body;

    if (status === Status.Completed) {
      try {
        const PurchaseReturnObject = await PurchaseReturn.findByIdAndUpdate(
          id,
          { status: Status.Completed },
          { new: true }
        );

        if (!PurchaseReturnObject) {
          sendResponse(res, 404, false, {}, "Purchase return not found!");
        }

        const purchaseOrderDoc = await PurchaseOrder.findById(
          PurchaseReturnObject.purchaseOrder
        );

        for (const item of PurchaseReturnObject.items) {
          const ItemInventory = await ItemStock.findOneAndUpdate(
            { item: item.item, location: purchaseOrderDoc.storeLocation },
            { $inc: { quantity: -item.quantity } },
            { new: true }
          );

          if (!ItemInventory) {
            sendResponse(res, 400, false, {}, "Inventory not found!");
          }
        }

        sendResponse(res, 200, true, {}, "Purchase order");
      } catch (error) {
        console.error(error);
        sendResponse(res, 500, false, {}, "Error while making purchase return");
      }
    }
  }
};
