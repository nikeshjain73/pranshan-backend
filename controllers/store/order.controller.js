const Order = require("../../models/store/order.model");
const { sendResponse } = require("../../helper/response");
const { OrderTypes } = require("../../utils/enum");
const TransactionItems = require('../../models/store/transaction_item.model');

exports.getOrder = async (req, res) => {
  const { tag, store_type } = req.body;

  if (req.user && !req.error) {
    try {
      const filter = { deleted: false, tag};
      if(store_type) {
        filter.store_type = store_type;
      }
      const data = await Order.find(filter, { deleted: 0 }).sort({ createdAt: -1 })
        .populate("party", "name")
        .populate("project", "name")
        .populate("approvedBy", "full_name")
        .populate("preparedBy", "full_name")
        .populate('storeLocation', 'address')
        .populate("transport", "name")
        .populate("firm_id", "name")
        .populate("year_id", "start_year end_year")
        .populate("items", 'orderId tag items')

      const finalData = await Promise.all(data.map(async (elem, index) => {
        const items = await TransactionItems.find({ deleted: false, orderId: elem._id }, { deleted: 0 }).populate('preffered_supplier','name email address phone')
        return { ...elem.toObject(), items }
      }))


      if (finalData) {
        const message =
          parseInt(tag) === OrderTypes["Purchase Order"]
            ? "Purchase order List"
            : "Sales order List";
        sendResponse(res, 200, true, finalData, message);
      } else {
        const message =
          parseInt(tag) === OrderTypes["Purchase Order"]
            ? "Purchase order not found"
            : "Sale order not found";
        sendResponse(res, 200, true, finalData, message);
      }
    } catch (err) {
   sendResponse(res, 500, false, {}, "Something went wrong");    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};


exports.updateTransactionItem = async (req, res) => {
  const { id, item } = req.body;

  if (req.user && !req.error) {
    const orderData = await Order.findByIdAndUpdate(id, { items: item });
    if (orderData) {
      sendResponse(res, 200, true, orderData, "Items added successfully");
    } else {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }

}

exports.manageOrder = async (req, res) => {
  const { id, ...orderData } = req.body;
  if (req.user) {
    const requiredFields = [
      "firm_id",
      "year_id",
      "party",
      "orderDate",
      ...(parseInt(orderData.tag) === OrderTypes["Purchase Order"]
        ? ["transport"] // for purchase
        : ["paymentMode"]), // sales
      "approvedBy",
      "preparedBy",
      "storeLocation",
      "tag",
      "store_type"
    ];

    if (
      !requiredFields.every((field) => {
        return orderData[field];
      })
    ) {
      return sendResponse(res, 400, false, {}, "Missing parameters");
    }

    try {
      let lastOrder = await Order.findOne({ deleted: false }, { deleted: 0 }, { sort: { createdAt: -1 } });
      let orderNo = "1000";
      if (lastOrder && lastOrder.orderNo) {
        const lastOrderId = parseInt(lastOrder.orderNo);
        orderNo = `${lastOrderId + 1}`;
      }
      if (!id) {
        orderData["orderNo"] = orderNo;

        const finalItemData = orderData.items === undefined ? null : orderData.items;
        const orderObject = new Order(orderData);

        await orderObject.save().then((data) => {
          const message =
            parseInt(orderData.tag) === OrderTypes["Purchase Order"]
              ? "Purchase order created successfully"
              : "Sales order created successfully";
          sendResponse(res, 200, true, data, message);
        });
      } else {
        const existingOrder = await Order.findById(id);
        orderData["orderNo"] = existingOrder.orderNo;
        orderData["items"] = orderData["items"] === undefined ? null : orderData["items"];
        await Order.findByIdAndUpdate(id, orderData).then((data) => {
          const message = data
            ? parseInt(orderData.tag) === OrderTypes["Purchase Order"]
              ? "Purchase order updated successfully"
              : "Sales order updated successfully"
            : parseInt(orderData.tag) === OrderTypes["Purchase Order"]
              ? "Purchase order not found"
              : "Sales order not found";
          sendResponse(res, 200, true, data, message);
        });
      }
    } catch (error) {
      console.log(error);
      sendResponse(res, 500, false, {}, "Something went wrong" + error);
    }
    //}
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.deleteOrder = async (req, res) => {
  const { id } = req.body;

  try {
    const deletedOrder = await Order.findByIdAndUpdate(id, { deleted: true });

    if (deletedOrder) {
      sendResponse(res, 200, true, {}, "Order deleted successfully");
    } else {
      sendResponse(res, 404, false, {}, "Order not found");
    }
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, false, {}, "Something went wrong");
  }
};
