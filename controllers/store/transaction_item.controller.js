const { default: mongoose } = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const TransactionItem = require("../../models/store/transaction_item.model");
const ItemStock = require("../../models/store/item_stock.model");
const { sendResponse } = require("../../helper/response");

exports.getTransactionItem = async (req, res) => {
  const { tag, store_type } = req.body;
  if (req.user && !req.error) {
    try {
      const filter = { deleted: false, tag };
      if (store_type) {
        filter.store_type = store_type;
      }
      await TransactionItem.find(filter, { deleted: 0 })
        .sort({ createdAt: -1 })
        .populate("orderId", "orderNo")
        .populate("requestId", "requestNo")
        .populate("preffered_supplier.supId", "name email address phone")
        .populate("main_supplier", "name email address phone")
        .populate({ path: "itemName", select: "name unit", populate: { path: "unit", select: "name" } })
        .then((data) => {
          sendResponse(res, 200, true, data, "Transaction item list");
        });
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.manageTransactionItem = async (req, res) => {
  let {
    id,
    orderId,
    requestId,
    tag,
    itemName,
    quantity,
    pcs,
    store_type,
    rate,
    dsc_percent,
    dcs_amount,
    sp_dsc_percent,
    sp_dsc_amount,
    gst_percent,
    gst_amount,
    tax_amount,
    item_amount,
    amount,
    balance_qty,
    mcode,
    remarks,
    // net_amount,
    with_po,
    unit_rate,
    total_rate,
    preffered_supplier,
    main_supplier,
  } = req.body;

  if (req.user) {
    if (tag == 1 || tag == 2) {
      if (
        orderId &&
        tag &&
        itemName &&
        quantity &&
        store_type &&
        rate &&
        amount &&
        balance_qty &&
        mcode &&
        // net_amount &&
        with_po
      ) {
        if (!id) {
          try {
            if (with_po == "true") {
              const transaction_item = new TransactionItem({
                orderId: orderId,
                tag: tag,
                itemName: itemName,
                quantity: quantity,
                store_type: store_type,
                rate: rate,
                amount: amount,
                balance_qty: balance_qty,
                mcode: mcode,
                with_po: with_po,
                //net_amount: net_amount,
                dsc_percent: dsc_percent,
                dcs_amount: dcs_amount,
                sp_dsc_percent: sp_dsc_percent,
                sp_dsc_amount: sp_dsc_amount,
                gst_percent: gst_percent,
                gst_amount: gst_amount,
                tax_amount: tax_amount,
                item_amount: item_amount,
                remarks,
              });



              const isExistingMaterial = await TransactionItem.find({
                orderId: orderId,
                itemName: itemName,
                store_type: store_type,
                deleted: false,
              });
              if (isExistingMaterial.length > 0) {
                sendResponse(res, 200, false, {}, "Material already exist");
                return;
              }
              await transaction_item.save().then((data) => {
                sendResponse(res, 200, true, {}, "Transaction item added successfully");
              }).catch((err) => {
                console.error(err); // Log the error for debugging
                sendResponse(res, 500, false, {}, "Something went wrong");
              });
            } else if (with_po == "false") {
              const transaction_item = new TransactionItem({
                orderId: orderId,
                tag: tag,
                itemName: itemName,
                quantity: quantity,
                store_type: store_type,
                rate: rate,
                amount: amount,
                balance_qty: 0,
                mcode: mcode,
                with_po: with_po,
                dsc_percent: dsc_percent,
                dcs_amount: dcs_amount,
                sp_dsc_percent: sp_dsc_percent,
                sp_dsc_amount: sp_dsc_amount,
                gst_percent: gst_percent,
                gst_amount: gst_amount,
                tax_amount: tax_amount,
                item_amount: item_amount,
                remarks,
              });

              const isExistingMaterial = await TransactionItem.find({
                orderId: orderId,
                itemName: itemName,
                store_type: store_type,
                deleted: false,
              });
              if (isExistingMaterial.length > 0) {
                sendResponse(res, 200, false, {}, "Material already exist");
                return;
              }

              let isExistingItem = await ItemStock.find({
                item: itemName,
                store_type: store_type,
                deleted: false,
              });

              if (isExistingItem.length > 0 && tag == 1) {
                isExistingItem[0].quantity += parseFloat(quantity);
                await isExistingItem[0].save();
              } else if (isExistingItem.length > 0 && tag == 2) {
                if (!parseFloat(quantity) > isExistingItem[0].quantity) {
                  return;
                }
                isExistingItem[0].quantity -= parseFloat(quantity);
                await isExistingItem[0].save();
              } else {
                const stockObject = new ItemStock({
                  item: itemName,
                  quantity: quantity,
                  store_type: store_type,
                });
                await stockObject.save();
              }

              await transaction_item
                .save()
                .then((data) => {
                  sendResponse(
                    res,
                    200,
                    true,
                    {},
                    "Transaction item added successfully"
                  );
                })
                .catch((err) => {
                  console.error(err);
                  return sendResponse(
                    res,
                    500,
                    false,
                    {},
                    "Something went wrong"
                  );
                });
            }
          } catch (error) {
            console.error(error);
            sendResponse(res, 500, false, {}, "Something went wrong");
          }
        } else {
          await TransactionItem.findByIdAndUpdate(id, {
            tag,
            itemName,
            quantity,
            store_type,
            rate,
            amount,
            balance_qty,
            mcode,
            with_po,
            net_amount,
            remarks,
          })
            .then((data) => {
              sendResponse(
                res,
                200,
                true,
                {},
                "Transaction item updated successfully"
              );
            })
            .catch((err) => {
              console.error(err);
              return sendResponse(res, 500, false, {}, "Something went wrong");
            });
        }
      } else {
        sendResponse(res, 400, false, {}, "Missing parameters");
      }
    } else if (tag == 3 || tag == 4) {
      const supplierData = preffered_supplier && JSON.parse(preffered_supplier);
      if (requestId && tag && itemName && quantity && store_type && mcode) {
        if (!id) {
          if (!unit_rate || unit_rate < 0) {
            sendResponse(res, 400, false, {}, "Please enter a valid unit_rate");
            return;
          }

          try {
            const transaction_item = new TransactionItem({
              requestId: requestId,
              tag: tag,
              itemName: itemName,
              quantity: quantity,
              store_type: store_type,
              mcode: mcode,
              remarks: remarks,
              balance_qty: balance_qty,
              unit_rate: unit_rate,
              total_rate: total_rate,
              dsc_percent: dsc_percent,
              dcs_amount: dcs_amount,
              sp_dsc_percent: sp_dsc_percent,
              sp_dsc_amount: sp_dsc_amount,
              gst_percent: gst_percent,
              gst_amount: gst_amount,
              tax_amount: tax_amount,
              item_amount: item_amount,
              preffered_supplier: supplierData,
              main_supplier: main_supplier,
            });

            const isExistingMaterial = await TransactionItem.find({
              requestId: requestId,
              itemName: itemName,
              store_type: store_type,
              deleted: false,
            });
            if (isExistingMaterial.length > 0) {
              sendResponse(res, 200, false, {}, "Material already exist");
              return;
            }
            await transaction_item.save().then((data) => {
              sendResponse(
                res,
                200,
                true,
                {},
                "Transaction item added successfully"
              );
            });
          } catch (err) {
            console.error(err);
            return sendResponse(res, 500, false, {}, "Something went wrong");
          }
        } else {
          await TransactionItem.findByIdAndUpdate(id, {
            tag: tag,
            itemName: itemName,
            quantity: quantity,
            store_type: store_type,
            mcode: mcode,
            remarks: remarks,
            balance_qty,
            unit_rate: unit_rate,
            total_rate: total_rate,
            dsc_percent: dsc_percent,
            dcs_amount: dcs_amount,
            sp_dsc_percent: sp_dsc_percent,
            sp_dsc_amount: sp_dsc_amount,
            gst_percent: gst_percent,
            gst_amount: gst_amount,
            tax_amount: tax_amount,
            item_amount: item_amount,
            preffered_supplier: supplierData,
            main_supplier: main_supplier,
          })
            .then((data) => {
              sendResponse(
                res,
                200,
                true,
                {},
                "Transaction item updated successfully"
              );
            })
            .catch((err) => {
              console.error(err);
              sendResponse(res, 500, false, {}, "Something went wrong");
            });
        }
      } else {
        sendResponse(res, 400, false, {}, "Missing parameter");
      }
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.deleteTransactionItem = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error && id) {
    try {
      await TransactionItem.findByIdAndUpdate(id, { deleted: true }).then(
        (data) => {
          if (data) {
            sendResponse(
              res,
              200,
              true,
              {},
              "Transaction item deleted successfully"
            );
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

exports.manageDrawing = async (req, res) => {
  const {
    id,
    item_no,
    itemName,
    quantity,
    item_length,
    item_width,
    item_weight,
    assembly_weight,
    assembly_surface_area,
    grid_no,
    drawingId,
    grid_qty,
  } = req.body;

  if (req.user && !req.error) {
    try {
      if (!id) {
        if (drawingId && itemName && quantity) {
          const transactionObject = new TransactionItem({
            drawingId: drawingId,
            item_no: item_no,
            itemName: itemName,
            quantity: quantity,
            item_length: item_length,
            item_width: item_width,
            item_weight: item_weight,
            assembly_weight: assembly_weight,
            assembly_surface_area: assembly_surface_area,
            grid_no: grid_no,
            grid_qty: grid_qty,
          });

          await transactionObject.save().then((data) => {
            sendResponse(res, 200, true, {}, "Drawing item saved successfully");
          });
        } else {
          sendResponse(res, 400, false, {}, "Missing parameter");
        }
      } else {
        await TransactionItem.findByIdAndUpdate(id, {
          drawingId: drawingId,
          item_no: item_no,
          itemName: itemName,
          quantity: quantity,
          item_length: item_length,
          item_width: item_width,
          item_weight: item_weight,
          assembly_weight: assembly_weight,
          assembly_surface_area: assembly_surface_area,
          grid_no: grid_no,
          grid_qty: grid_qty,
        }).then((data) => {
          sendResponse(res, 200, true, {}, "Drawing item updated successfully");
        });
      }
    } catch (err) {
      sendResponse(res, 400, false, {}, "Something went wrong" + err);
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorised");
  }
};

exports.importDrawingItem = async (req, res) => {
  if (!req.user || req.error) {
    return sendResponse(res, 401, false, {}, 'Unauthorized');
  }

  upload(req, res, async (err) => {
    const { drawingId } = req.body;
    if (!drawingId) {
      return sendResponse(res, 400, false, {}, 'Drawing not found');
    }
    if (!req.file) {
      return sendResponse(res, 400, false, {}, 'Select an Excel file');
    }
    if (req.file.mimetype !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      fs.unlinkSync(req.file.path);
      return sendResponse(res, 400, false, {}, 'Invalid file type. Please upload an Excel file');
    }
    if (err) {
      return sendResponse(res, 400, false, {}, `File not uploaded: ${err.message}`);
    }

    try {

      const data = parser.parseXls2Json(req.file.path);
      const result = data.at(0);
      const entries = [];

    } catch (err) {
      sendResponse(res, 500, false, {}, 'Internal server error');
    } finally {
      fs.unlinkSync(req.file.path);
    }
  })
}

exports.getDrawingTransaction = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error) {
    try {
      if (!id) {
        sendResponse(res, 400, false, {}, "Drawing not found");
        return;
      }
      const filter = { drawingId: new mongoose.Types.ObjectId(id), deleted: false };
      await TransactionItem.find(filter, { deleted: 0 })
        .sort({ createdAt: -1 })
        .populate("drawingId")
        .populate("itemName", "name")
        .then((data) => {
          sendResponse(res, 200, true, data, "Transaction item list");
        });
    } catch (error) {
      sendResponse(res, 500, false, {}, "Something went wrong" + error);
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorized");
  }
};

exports.getAllItemByRequest = async (req, res) => {
  const { id } = req.body;
  if (req.user && !req.error) {
    if (id) {
      try {
        const itemList = await TransactionItem.find({ requestId: id }).populate(
          [
            {
              path: "itemName",
              select: "name qty unit",
              populate: {
                path: "unit",
                select: "name",
              },
            },
            { path: "preffered_supplier", select: "name" },
            { path: "requestId", select: "requestNo" },
          ]
        );

        if (itemList.length > 0) {
          sendResponse(res, 200, true, itemList, "Requested item list found");
        } else {
          sendResponse(res, 404, false, {}, "Requested item list not found");
        }
      } catch (err) {
        sendResponse(res, 500, false, {}, "Something went wrong");
      }
    } else {
      sendResponse(res, 400, false, {}, "Missing parameter");
    }
  } else {
    sendResponse(res, 401, false, {}, "Unauthorised");
  }
};
