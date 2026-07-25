const SalesOrder = require("../../models/store/sales_order.model");
const ItemStock = require('../../models/store/item_stock.model');
const { sendResponse } = require("../../helper/response");
const { Status } = require('../../utils/enum');


exports.getSalesOrder = async (req, res) => {
  if (req.user && !req.error) {
    try {
      await SalesOrder.find({ deleted: false }, { deleted: 0 })
        .populate('customer', 'name address stateName pinCode gstNumber')
        .populate('approvedBy', 'full_name')
        .populate('preparedBy', 'full_name')
        .populate('storeLocation', 'address')
        .populate('firm_id','name')
        .populate('year','start_year  end_year')
        .then((data) => {
          if (data) {
            sendResponse(res, 200, true, data, "Sales order List");
          } else {
            sendResponse(res, 200, true, data, "Sales order not found");
          }
        }
        );
    } catch (err) {
   sendResponse(res, 500, false, {}, "Something went wrong");    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorised");
  }
};

exports.manageSalesOrder = async (req, res) => {
  const {
    firm_id,
    year_id,
    customer,
    orderDate,
    voucherNo,
    items,
    approvedBy,
    preparedBy,
    remarks,
    storeLocation,
    paymentMode,
    id,
  } = req.body;

  if (req.user) {
    if (
      firm_id &&
      year_id &&
      customer &&
      orderDate &&
      voucherNo &&
      items &&
      approvedBy &&
      preparedBy &&
      storeLocation &&
      paymentMode
    ) {
      const SalesOrderObject = new SalesOrder({
        firm_id,
        year_id,
        customer: customer,
        voucherNo: voucherNo,
        orderDate: orderDate,
        items: items,
        approvedBy: approvedBy,
        preparedBy: preparedBy,
        storeLocation: storeLocation,
        paymentMode: paymentMode,
        remarks: remarks,
      });

      if (!id) {
        try {
          await SalesOrderObject.save(SalesOrderObject).then((data) => {
            sendResponse(res, 200, true, {}, "Sales order created successfully");
          }).catch((error) => {
            console.log(error)
          })
        } catch (error) {
          sendResponse(res, 500, false, {}, "Something went wrong" + error);
        }
      } else {
        await SalesOrder.findByIdAndUpdate(id, {
          firm_id,
          year_id,
          customer: customer,
          voucherNo: voucherNo,
          orderDate: orderDate,
          paymentMode: paymentMode,
          items: items,
          approvedBy: approvedBy,
          preparedBy: preparedBy,
          storeLocation: storeLocation,
          remarks: remarks,
        }).then((data) => {
          if (data) {
            sendResponse(res, 200, true, {}, "Sales order updated successfully");
          } else {
            sendResponse(res, 200, true, {}, "Sales order not found");
          }
        });
      }
    } else {
      sendResponse(res, 400, false, {}, "Missing parameters");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.deleteSalesOrder = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error && id) {
    try {
      await SalesOrder.findByIdAndUpdate(id, { deleted: true }).then(
        (data) => {
          if (data) {
            sendResponse(res, 200, true, {}, "Sales order deleted successfully");
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

exports.updateSalesOrderStatus = async (req, res) => {
  if (req.body && !req.error) {
    const { id, status } = req.body;

    if (id && status) {
      await SalesOrder.findByIdAndUpdate(id, { status }).then((data) => {
        if (data) {
          sendResponse(res, 200, true, {}, "Status changed successfully");
        } else {
          sendResponse(res, 200, true, {}, "Sales order not found");
        }
      }).catch((error) => {
        console.error(error);
        sendResponse(res, 500, false, {}, "Something went wrong");
      })
    } else {
      sendResponse(res, 400, false, {}, "Missing parameters");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
}

exports.updateSalesStocks = async (req, res) => {

  if (req.body && !req.error) {
    const { id, status } = req.body;

    if (parseInt(status) === parseInt(Status.Delivered)) {

      try {
        const SalesOrderObject = await SalesOrder.findByIdAndUpdate(id, { status: Status.Delivered }, { new: true }); // Update purchase order status and return updated doc
        if (!SalesOrderObject) {
          sendResponse(res, 404, false, {}, 'Purchase order not found');
        }

        for (const item of SalesOrderObject.items) {
          const locationId = SalesOrderObject.storeLocation._id;
          const itemStockObject = await ItemStock.findOneAndUpdate(
            { item: item.item, location: locationId },
            { $inc: { quantity: -item.quantity } },
            { new: true }
          );
          if (!itemStockObject) {
            sendResponse(res, 400, false, {}, 'Item inventory not found')
          }
        }

        sendResponse(res, 200, true, SalesOrderObject, 'Sales order');
      } catch (error) {
        console.error(error);
        sendResponse(res, 500, false, {}, 'Something went wrong');
      }
    } else {
      sendResponse(res, 400, false, {}, "Sales Order is in process..");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
}