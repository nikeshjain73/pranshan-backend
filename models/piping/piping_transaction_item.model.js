const mongoose = require("mongoose");
const { Schema } = mongoose;
const { Status } = require('../../utils/enum');

const transactionItemSchema = new Schema(
  {
    fimId:{
      type: Schema.Types.ObjectId,
      ref: 'piping-fim-packing-list',
    },
    requestId: {
      type: Schema.Types.ObjectId, // 
      ref: "piping-request",
    },
     orderPlacement: {
      type: Schema.Types.ObjectId,
      ref: "piping-material-order-placement"
    },
    tag: {
      type: Number, // 1-Purchase // 2- Sales // 3-Issues 
    },
    itemName: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "piping-items",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    pcs: {
      type: Number,
    },
    balance_qty: {
      type: Number,
    },
    mcode: {
      type: String,
    },
    with_po: {
      type: Boolean,
    },
    remarks: {
      type: String,
      default: "",
    },
    rate: {
      type: Number,
    },
    amount: {
      type: Number,
    },
    dsc_percent: {
      type: Number,
    },
    dsc_amount: {
      type: Number,
    },
    sp_dsc_percent: {
      type: Number,
    },
    sp_dsc_amount: {
      type: Number,
    },
    taxable_amount: {
      type: Number,
    },
    gst_percent: {
      type: Number,
    },
    gst_amount: {
      type: Number,
    },
    item_amount: {
      type: Number,
    },
    net_amount: {
      type: Number,
    },
    store_type: {
      type: Number,  // 1- Main store 2-Product store
    },
    unit_rate: {
      type: Number,
      default: 0,
    },
    total_rate: {
      type: Number,
      default: 0,
    },
    // supplier now used for manufacturer
    preffered_supplier: {
      type: [{
        supId: {
          type: Schema.Types.ObjectId,
          ref: 'store-party'
        }
      }],
      default: []
    },
    main_supplier: {
      type: Schema.Types.ObjectId,
      ref: 'store-party',
    },
    drawingId: {
      type: Schema.Types.ObjectId,
      ref: 'piping-drawings',
    },
    item_no: {
      type: String,
    },
    item_length: {
      type: Number,
    },
    item_width: {
      type: Number,
    },
    item_weight: {
      type: Number,
    },
    assembly_weight: {
      type: Number,
    },
    assembly_surface_area: {
      type: Number,
    },
    grid_no: {
      type: String,
    },
    grid_qty: {
      type: Number,
    },
    status: {
      type: Number,
      default: Status.Pending,  // 1-Pending 2-Approved By Admin 3-Rejected By Admin 4-Completed
    },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "piping-store-transaction-item",
  transactionItemSchema
);
