const mongoose = require("mongoose");
const { Schema } = mongoose;

const PurchaseOrderSchema = new Schema({
  firm_id: {
    type: Schema.Types.ObjectId,
    ref: "firm",
  },
  year_id: {
    type: Schema.Types.ObjectId,
    ref: "year",
  },
  billNo: {
    type: String,
    required: true,
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "store-suppliers",
    required: true,
  },
  orderDate: {
    type: Date,
    required: true,
    default: Date.now(),
  },
  lrNo: {
    type: Number,
    required: true,
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
  transport: {
    type: Schema.Types.ObjectId,
    ref: "store-transport",
    required: true,
  },
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
  project: {
    type: Schema.Types.ObjectId,
    ref: "bussiness-projects",
    required: true,
  },
  storeLocation: {
    type: Schema.Types.ObjectId,
    ref: "store-inventoryLocation",
    required: true,
  },
  status: {
    type: Number,
    //enum: ["Pending", "Approved", "Rejected", "Delivered", "Cancelled"], // Possible order statuses
    default: 1,
  },
  deleted: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model("store-purchaseOrder", PurchaseOrderSchema);
