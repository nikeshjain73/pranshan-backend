const PurchaseOrder = require("../../models/store/purchase_order.model");
const ItemStock = require('../../models/store/item_stock.model');
const { sendResponse } = require("../../helper/response");
const { Status } = require('../../utils/enum');


exports.getPurchaseOrder = async (req, res) => {
  if (req.user && !req.error) {
    try {
      await PurchaseOrder.find({ deleted: false }, { deleted: 0 })
        .populate('supplier', 'name')
        .populate('project', 'name')
        .populate('approvedBy', 'full_name')
        .populate('preparedBy', 'full_name')
        .populate('transport', 'name')
        .populate('firm_id','name')
        .populate('year_id','start_year  end_year')

        .then((data) => {
          if (data) {
            sendResponse(res, 200, true, data, "Purchase order List");
          } else {
            sendResponse(res, 200, true, data, "Purchase order not found");
          }
        }
        );
    } catch (err) {
   sendResponse(res, 500, false, {}, "Something went wrong");    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorised");
  }
};

exports.managePurchaseOrder = async (req, res) => {
  const {
    firm_id,
    year_id,
    supplier,
    orderDate,
    billNo,
    lrNo,
    items,
    transport,
    approvedBy,
    preparedBy,
    remarks,
    project,
    storeLocation,
    id,
  } = req.body;

  if (req.user) {
    if (
      firm_id &&
      year_id &&
      supplier &&
      orderDate &&
      lrNo &&
      items &&
      transport &&
      approvedBy &&
      preparedBy &&
      project &&
      storeLocation
    ) {
      const PurchaseOrderObject = new PurchaseOrder({
        firm_id,
        year_id,
        supplier: supplier,
        billNo: billNo,
        orderDate: orderDate,
        lrNo: lrNo,
        items: items,
        transport: transport,
        approvedBy: approvedBy,
        preparedBy: preparedBy,
        storeLocation: storeLocation,
        remarks: remarks,
        project: project,
      });

      if (!id) {
        try {
          await PurchaseOrderObject.save(PurchaseOrderObject).then((data) => {
            sendResponse(res, 200, true, {}, "Purchase order created successfully");
          });
        } catch (error) {
          sendResponse(res, 500, false, {}, "Something went wrong" + error);
        }
      } else {
        await PurchaseOrder.findByIdAndUpdate(id, {
          firm_id,
          year_id,
          supplier: supplier,
          billNo: billNo,
          orderDate: orderDate,
          lrNo: lrNo,
          items: items,
          storeLocation: storeLocation,
          transport: transport,
          approvedBy: approvedBy,
          preparedBy: preparedBy,
          remarks: remarks,
          project: project,
        }).then((data) => {
          if (data) {
            sendResponse(res, 200, true, {}, "Purchase order updated successfully");
          } else {
            sendResponse(res, 200, true, {}, "Purchase order not found");
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

exports.deletePurchaseOrder = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error && id) {
    try {
      await PurchaseOrder.findByIdAndUpdate(id, { deleted: true }).then(
        (data) => {
          if (data) {
            sendResponse(res, 200, true, {}, "Purchase order deleted successfully");
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

exports.updatePoStatus = async (req, res) => {
  if (req.body && !req.error) {
    const { id, status } = req.body;

    if (id && status) {
      await PurchaseOrder.findByIdAndUpdate(id, { status }).then((data) => {
        if (data) {
          sendResponse(res, 200, true, {}, "Status changed successfully");
        } else {
          sendResponse(res, 200, true, {}, "Purchase order not found");
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

exports.updateItemStocks = async (req, res) => {
  if (req.body && !req.error) {
    const { id, status } = req.body;

    if (status === Status.Delivered) {

      try {
        const purchaseOrder = await PurchaseOrder.findByIdAndUpdate(id, { status: Status.Delivered }, { new: true }); 
        if (!purchaseOrder) {
          sendResponse(res, 404, false, {}, 'Purchase order not found');
        }

        for (const item of purchaseOrder.items) {
          const locationId = purchaseOrder.storeLocation;

          const itemStockObject = await ItemStock.findOneAndUpdate(
            { item: item.item, location: locationId },
            { $inc: { quantity: item.quantity } },
            { new: true }
          );
          if (!itemStockObject) {
            sendResponse(res, 400, false, {}, 'Item inventory not found')
          }
        }

        sendResponse(res, 200, true, purchaseOrder, 'Purchase order');
      } catch (error) {
        console.error(error);
        sendResponse(res, 500, false, {}, 'Something went wrong');
      }
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
}