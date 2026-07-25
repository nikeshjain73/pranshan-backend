const mongoose = require("mongoose");
const { Schema } = mongoose;
const { Status } = require('../../utils/enum');

const OrderSchema = new Schema({
  firm_id: {
    type: Schema.Types.ObjectId,
    ref: "firm",
  },
  year_id: {
    type: Schema.Types.ObjectId,
    ref: "year",
  },
  orderNo: {
    type: Number,
  },
  party: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "store-party",
    required: true,
  },
  orderDate: {
    type: Date,
    required: true,
    default: Date.now(),
  },
  lrNo: {
    type: Number,
  },
  lrDate: {
    type: Date,
  },
  items: {
    type: Schema.Types.ObjectId,
    ref: 'store_transaction_item',
  },
  transport: {
    type: Schema.Types.ObjectId,
    ref: "store-transport",
  },
  store_type: { 
    type: Number, //1-Main Store 2-Product-store
    required: true,
  },
  project: {
    type: Schema.Types.ObjectId,
    ref: "bussiness-projects",
  },
  storeLocation: {
    type: Schema.Types.ObjectId,
    ref: "store-inventoryLocation",
    required: true,
  },
  paymentMode: {
    type: String,
  },
  tag: {
    type: Number, // 1-Purchase // 2- Sales
    required: true,
  },
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: "Auth-Person",
    required: true,
  },
  preparedBy: {
    type: Schema.Types.ObjectId,
    ref: "Auth-Person",
    required: true,
  },
  prNo: {
    type: String,
  },
  gross_amount: {
    type: Number,
  },
  difference_amount: {
    type: Number,
  },
  net_amount: {
    type: Number,
  },
  remarks: {
    type: String,
  },
  status: {
    type: Number,
    //enum: ["Pending", "Approved", "Rejected", "Delivered", "Cancelled"], // Possible order statuses
    default: Status.Pending,
  },
  deleted: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

module.exports = mongoose.model("store-orders", OrderSchema);
