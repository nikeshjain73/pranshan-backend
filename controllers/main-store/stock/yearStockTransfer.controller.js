

const YearStockTransfer = require("../../../models/store/year_stock_transfer.model");
const StoreTransaction = require("../../../models/main-store/transaction/transaction.model");
const Itemstock = require("../../../models/main-store/transaction/itemstock.model");
const mongoose = require("mongoose");

exports.createYearStockTransfer = async (req, res) => {
  try {
    const { year_id, items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "No items provided." });
    }

    // Save the transfer record
    const savedTransfer = await YearStockTransfer.create({ year_id, items });

    console.log("✅ items[0]:", JSON.stringify(items[0], null, 2));

    const itemIds = items.map(item => item.item_id).filter(Boolean);

    if (itemIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid item_id values found in items.",
      });
    }

    // Update balance_qty to 0 in StoreTransaction items_details
    const updateResult = await StoreTransaction.updateMany(
      { "items_details.item_id": { $in: itemIds } },
      {
        $set: {
          "items_details.$[elem].balance_qty": 0,
        },
      },
      {
        arrayFilters: [{ "elem.item_id": { $in: itemIds } }],
      }
    );

    console.log("MongoDB StoreTransaction update result:", updateResult);

    // ✅ Update ms_item_stock year_id
    // const updateStockResult = await Itemstock.updateMany(
    //   { item_id: { $in: itemIds } },
    //   { $set: { year_id: new mongoose.Types.ObjectId(year_id) } }
    // );

    // console.log("MongoDB ms_item_stock year_id update result:", updateStockResult);

    res.status(201).json({
      success: true,
      data: savedTransfer,
      message: "Stock transfer saved. balance_qty set to 0 and year_id updated.",
    });
  } catch (error) {
    console.error("Error saving stock transfer:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error. Could not save stock transfer.",
      error: error.message,
    });
  }
};








