const mongoose = require("mongoose");
const { Schema } = mongoose;

const SalesOrderSchema = new Schema({
  firm_id: {
    type: Schema.Types.ObjectId,
    ref: "firm",
  },
  year_id: {
    type: Schema.Types.ObjectId,
    ref: "year",
  },
  voucherNo: {
    type: String,
    // unique: true,
    required: true,
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "store-customers",
    required: true,
  },
  orderDate: {
    type: Date,
    required: true,
    default: Date.now(),
  },
  items: [
    {
      item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "store-items",
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
      unitPrice: {
        type: Number,
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
  remarks: {
    type: String,
  },
  storeLocation: {
    type: Schema.Types.ObjectId,
    ref: "store-inventoryLocation",
    required: true,
  },
  paymentMode: {
    type: String,
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

module.exports = mongoose.model("store-salesOrder", SalesOrderSchema);
