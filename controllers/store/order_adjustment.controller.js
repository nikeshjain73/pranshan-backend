const { sendResponse } = require("../../helper/response");
const OrderAdjustment = require("../../models/store/order_adjustment.model");
const ItemStock = require("../../models/store/item_stock.model");
const TransactionItem = require("../../models/store/transaction_item.model");
const OrderModal = require("../../models/store/order.model");

const updatedTransactionItem = async (res, orderId, itemId, balanceQty, tag) => {
  try {
    const transactedItem = await TransactionItem.find({ itemName: itemId, orderId: orderId });
    const selectedItem = transactedItem[0];

    if (selectedItem) {
      if (parseInt(tag) === 2) {
        selectedItem.quantity = balanceQty;
        selectedItem.balance_qty = balanceQty;
      } else {
        selectedItem.balance_qty = balanceQty;
      }
      await transactedItem[0].save();
      return selectedItem;
    } else {
      sendResponse(res, 200, true, {}, "Item not found in the transaction");
      return;
    }
  } catch (error) {
    console.error("Error updating transaction item:", error);
    sendResponse(res, 500, false, {}, "Something went wrong");
  }
};
//   try {
//     if (!itemId || !purchaseQuantity || isNaN(parseFloat(purchaseQuantity))) {
//       sendResponse(res, 400, false, {}, "Invalid input parameters");
//     }

//     let stock = await ItemStock.find({ item: itemId });

//     if (stock?.length === 0) {
//       stock = new ItemStock({
//         item: itemId,
//         quantity: parseFloat(purchaseQuantity),
//       });
//       await stock.save();
//     } else {
//       const totalQuantity =
//         parseFloat(stock[0].quantity) + parseFloat(purchaseQuantity);
//       await ItemStock.findByIdAndUpdate(stock[0]._id, {
//         quantity: totalQuantity,
//       });
//     }
//   } catch (error) {
//     console.error(error);
//     sendResponse(res, 400, false, {}, "Failed to update item stock");
//   }
// };

const updateItemStock = async (res, itemId, inputQuantity, tag, store_type, order) => {
  try {
    if (!itemId || !inputQuantity || !store_type || isNaN(parseFloat(inputQuantity))) {
      sendResponse(res, 400, false, {}, "Invalid input parameters");
    }
    let stock = await ItemStock.find({ item: itemId, store_type });
    const OrderData = await OrderModal.findById(order);
    if (stock.length === 0) {
      stock = new ItemStock({
        item: itemId,
        store_type: store_type,
        quantity: parseFloat(inputQuantity),
      });
      if (store_type != 1) {
        stock.project = OrderData.project;
      }
      await stock.save();
    } else {
      const totalQuantity = parseInt(tag) === 1 ?
        (parseFloat(stock[0].quantity) + parseFloat(inputQuantity)) : (parseFloat(stock[0].quantity) - parseFloat(inputQuantity));
      await ItemStock.findByIdAndUpdate(stock[0]._id, {
        quantity: totalQuantity,
      });
    }
  } catch (error) {
    console.error(error);
    sendResponse(res, 400, false, {}, "Failed to update item stock");
  }
};

exports.getOrderAdujustment = async (req, res) => {
  const { store_type } = req.body;

  if (req.user && !req.error) {
    try {
      let filter = { deleted: false };
      if (store_type) {
        filter.store_type = store_type;
      } else {
        filter = { deleted: false }
      }
      await OrderAdjustment.find(filter, { deleted: 0 }).sort({ createdAt: -1 })
        .populate("order", "orderNo quantity")
        .populate("itemName", "name")
        .sort({ createdAt: -1 })
        .then((data) => {
          if (data) {
            sendResponse(res, 200, true, data, "Order adjustment List!");
          } else {
            sendResponse(res, 200, true, data, "No adjustment has been made!");
          }
        })
    } catch (err) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 400, false, "Unauthorized");
  }
};

exports.manageOrderAdjustment = async (req, res) => {
  const { order, itemName, balance_qty, receive_qty, tag, store_type } = req.body;
  if (req.user) {
    if (order && itemName && balance_qty && tag) {
      const adjustmentObj = new OrderAdjustment({
        order,
        itemName,
        balance_qty,
        receive_qty,
        tag,
        store_type
      });
      try {
        const savedAdjustment = await adjustmentObj.save();
        if (savedAdjustment) {
          await updateItemStock(res, itemName, receive_qty, tag, store_type, order);
          await updatedTransactionItem(res, order, itemName, balance_qty, tag);
          await checkAndUpdateOrderStatus(order);
          sendResponse(res, 200, true, {}, "Item adjusted successfully");
        } else {
          sendResponse(res, 500, false, {}, "Something went wrong");
        }
      } catch (error) {
        console.error(error);
        sendResponse(res, 500, false, {}, "Internal server error");
      }
    } else {
      sendResponse(res, 400, false, {}, "Missing parameters");
    }
  } else {
    sendResponse(res, 400, false, {}, "Unauthorized");
  }
};
async function checkAndUpdateOrderStatus(orderId) {
  const order = await OrderModal.findById(orderId);
  const finalData = await TransactionItem.find({ orderId: order?._id });
  const allZero = finalData.every(item => item.balance_qty === 0);
  // console.log(allZero);
  if (allZero) {
    order.status = 6;
    await order.save();
  }
}

exports.deleteOrderAdjustment = async (req, res) => {
  const { id } = req.body;

  if (req.user && !req.error && id) {
    try {
      await OrderAdjustment.findByIdAndUpdate(id, { deleted: true }).then(
        (data) => {
          if (data) {
            sendResponse(res, 200, true, {}, "Order adjustment deleted successfully");
          }
        }
      );
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};
