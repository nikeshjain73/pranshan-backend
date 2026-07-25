const mongoose = require("mongoose");
const { Schema } = mongoose;

const itemStockSchema = new Schema(
  {
     year_id: {
      type: Schema.Types.ObjectId,
      ref: "years",
      required: true,
    },
    item_id: {
      type: Schema.Types.ObjectId,
      ref: "store-items",
      required: true,
    },
    transaction_id: {
      type: Schema.Types.ObjectId,
      ref: "ms_trans_details",
      required: true,
    },
    tag_id: {
      type: Schema.Types.ObjectId,
      ref: "tags",
      required: true,
    },
    in: {
      type: Number,
      default: 0.0,
    },
    out: {
      type: Number,
      default: 0.0,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ms_item_stock", itemStockSchema);
