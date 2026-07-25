const mongoose = require("mongoose");
const { Schema } = mongoose;
const PurchaseReturnSchema = new Schema({
  firm_id: {
    type: Schema.Types.ObjectId,
    ref: "firm",
  },
  year_id: {
    type: Schema.Types.ObjectId,
    ref: "year",
  },
  purchaseReturnNo: {
    type: String,
    required: true,
  },
  purchaseOrder: {
    type: Schema.Types.ObjectId,
    ref: "store-purchaseOrder",
    required: true,
  },
  returnDate: {
    type: Date,
    required: true,
  },
  reason: {
    type: String,
    required: true,
  },
  items: [
    {
      item: {
        type: Schema.Types.ObjectId,
        ref: "store-items",
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
      reason: {
        type: String,
        required: true,
      },
    },
  ],
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: "employee",
    required: true,
  },
  preparedBy: {
    type: Schema.Types.ObjectId,
    ref: "employee",
    required: true,
  },
  status: {
    type: Number,
    default: 1,
  },
  deleted: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model("store-purchaseReturn", PurchaseReturnSchema);
