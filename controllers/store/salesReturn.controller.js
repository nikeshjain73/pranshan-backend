const SalesReturn = require("../../models/store/sales_return.model");
const SalesOrder = require("../../models/store/sales_order.model");

const ItemStock = require("../../models/store/item_stock.model");
const { sendResponse } = require("../../helper/response");
const { Status } = require("../../utils/enum");

exports.getSalesReturn = async (req, res) => {

  if (req.user && !req.error) {
    try {
      await SalesReturn.find({ deleted: false }, { deleted: 0 })
        .populate("salesOrder", "voucherNo customner orderDate")
        .populate("approvedBy", "full_name")
        .populate("preparedBy", "full_name")
        .populate('firm_id','name')
        .populate('year','start_year  end_year')
        .then((data) => {
          if (data) {
            sendResponse(res, 200, true, data, "Sales return list");
          } else {
            sendResponse(res, 200, true, data, "Sales return not found");
          }
        });
    } catch (err) {
   sendResponse(res, 500, false, {}, "Something went wrong");    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorised");
  }
};

exports.manageSalesReturn = async (req, res) => {
  const {
    firm_id,
    year_id,
    salesReturnNo,
    salesOrder,
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
      salesReturnNo &&
      salesOrder &&
      reason &&
      items &&
      returnDate &&
      approvedBy &&
      preparedBy
    ) {
      try {
        const salesOrderDoc = await SalesOrder.findById(salesOrder);
        if (!salesOrderDoc || salesOrderDoc.status !== Status.Delivered) {
          sendResponse(res, 400, false, {}, "Invalid sales order or order not delivered");
          return;
        }

        for (const material of items) {
          const foundItem = salesOrderDoc.items.find(
            (orderedItem) => orderedItem.item.toString() === material.item.toString()
          );
          if (!foundItem) {
            sendResponse(res, 400, false, {}, "Item not found in the original sales order");
            return;
          }
          if (material.quantity > foundItem.quantity) {
            sendResponse(res, 400, false, {}, "Return quantity cannot exceed ordered quantity");
            return;
          }
        }

        const SalesReturnObject = new SalesReturn({
          firm_id,
          year_id,
          salesReturnNo,
          salesOrder,
          returnDate,
          approvedBy,
          preparedBy,
          reason,
          items,
        });

        if (!id) {
          try {
            await SalesReturnObject.save().then((data) => {
              sendResponse(res, 200, true, {}, "Sales return created successfully");
            });
          } catch (error) {
            console.error(error);
            sendResponse(res, 500, false, {}, "Failed to save sales return: " + error.message);
          }
        } else {
          try {
            const updatedSalesReturn = await SalesReturn.findByIdAndUpdate(id, {
              firm_id,
              year_id,
              salesReturnNo,
              salesOrder,
              returnDate,
              approvedBy,
              preparedBy,
              reason,
              items,
            });
            if (updatedSalesReturn) {
              sendResponse(res, 200, true, data, "Sales return updated successfully");
            } else {
              sendResponse(res, 200, true, {}, "Sales return not found");
            }
          } catch (error) {
            console.error(error);
            sendResponse(res, 500, false, {}, "Failed to update sales return: " + error.message);
          }
        }
      } catch (error) {
        console.error(error);
        sendResponse(res, 500, false, {}, "Error while processing sales return");
      }
    } else {
      sendResponse(res, 400, false, {}, "Missing parameters");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};


exports.deleteSalesReturn = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error && id) {
    try {
      await SalesReturn.findByIdAndUpdate(id, { deleted: true }).then((data) => {
        if (data) {
          sendResponse(res, 200, true, {}, "Sales return deleted successfully");
        }
      });
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong" + error);
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.updateSalesReturnStatus = async (req, res) => {
  if (req.body && !req.error) {
    const { id, status } = req.body;

    if (id && status) {
      await SalesReturn.findByIdAndUpdate(id, { status }).then((data) => {
        if (data) {
          sendResponse(res, 200, true, {}, "Status changed successfully");
        } else {
          sendResponse(res, 200, true, {}, "Sales return not found");
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

exports.updateSalesReturnStocks = async (req, res) => {
  if (req.body && !req.error) {
    const { id, status } = req.body;

    if (parseInt(status) == Status.Completed) {
      try {
        const SalesReturnObject = await SalesReturn.findByIdAndUpdate(
          id,
          { status: Status.Completed },
          { new: true }
        );

        if (!SalesReturnObject) {
          sendResponse(res, 404, false, {}, "Sales return not found!");
        }

        const salesOrderDoc = await SalesOrder.findById(
          SalesReturnObject.salesOrder
        );

        for (const item of SalesReturnObject.items) {
          const ItemInventory = await ItemStock.findOneAndUpdate(
            { item: item.item, location: salesOrderDoc.storeLocation },
            { $inc: { quantity: +item.quantity } },
            { new: true }
          );

          if (!ItemInventory) {
            sendResponse(res, 400, false, {}, "Inventory not found!");
          }
        }

        sendResponse(res, 200, true, SalesReturnObject, "Sales order");
      } catch (error) {
        console.error(error);
        sendResponse(res, 500, false, {}, "Error while making purchase return");
      }
    } else {
      sendResponse(res, 400, false, {}, 'Sales Return order is in process..')
    }
  }
};
