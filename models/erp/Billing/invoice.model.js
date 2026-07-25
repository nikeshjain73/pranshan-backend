const mongoose = require('mongoose');
const { Schema } = mongoose;

const InvoiceTable = new Schema({
  firm_id: {
    type: Schema.Types.ObjectId,
    ref: "firm",
  },
  year_id: {
    type: Schema.Types.ObjectId,
    ref: "year",
  },
  party_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "store-party",
  },
  project_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "bussiness-projects",
  },
  invoice_no: {
    type: Number,
  },
  invoice_date: {
    type: Date,
    default: Date.now(),
  },
  vehicle_no: {
    type: String,
  },
  driver_name: {
    type: String,
  },
  transport_id: {
    type: Schema.Types.ObjectId,
    ref: "store-transport",
  },
  lr_no: {
    type: String,
  },
  lr_date: {
    type: Date,
    default: Date.now(),
  },
  tag_id: {
    type: Number,
  },
  items: [{
    item_id: {
      type: Schema.Types.ObjectId,
      ref: "store-items",
    },
    unit: { type: String, },
    m_code: { type: String, },
    hsn_code: { type: String, },
    quantity: { type: Number, default: 0.0 },
    rate: { type: Number, default: 0.0 },
    amount: { type: Number, default: 0.0 },
    gst: { type: Number, default: 0.0 },
    gst_amount: { type: Number, default: 0.0 },
    total_amount: { type: Number, default: 0.0 },
    remarks: { type: String, default: "" },
  }],
  packing_list: [
    {
      packing_id: {
        type: Schema.Types.ObjectId,
        ref: "erp-packing",
      },
    }
  ],
  deleted: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

module.exports = mongoose.model('erp-invoices', InvoiceTable);