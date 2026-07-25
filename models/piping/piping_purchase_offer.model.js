const mongoose = require('mongoose');
const { Schema } = mongoose;

const ItemSchema = new mongoose.Schema({
    transactionId: { type: Schema.Types.ObjectId, ref: 'piping-store-transaction-item', },
    item_category_id: { type: mongoose.Schema.Types.ObjectId, ref: "piping-item-detail-category"},   // Dropdown
    item_id: { type: mongoose.Schema.Types.ObjectId, ref: "piping-items", required: true  },   // Dropdown
    piping_material_specification: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "piping-material-specification",
       
    },
    fim_list_qty: { type: Number},
    hsn_sac: { type: String },
    rate: { type: Number, required: true, },
    gst: { type: Number, required: true, },
    total_amount: { type: Number, required: true, },
    make_manufacture:[ { type: String }],
    manufacture:{type: mongoose.Schema.Types.ObjectId, ref:"store-party",  trim: true },
    offeredQty: { type: Number, default: 0 },
    challan_qty: { type: Number, default: 0 },
    remarks: { type: String, default: '' },
    heat_rows: [
      {
        heat_lot_no: { type: String, required: false },
        tc_no: { type: String, required: false },
        acceptedQty: { type: Number, default: 0 },
        rejectedQty: { type: Number, default: 0 },
        inspected_nos: { type: Number, default: 0 },
        inspected_length: { type: String, default: "--" },
        inspected_width: { type: String, default: "--" },
      }
    ],
    
    acceptedRemarks: { type: String, default: '' },
    issued_qty: { type: Number, default: 0 },
    qcStatus: { type: Number, enum: [1, 2, 3, 4], default: 1 },  // 1: Pending, 2: Approved, 3: Rejected, 4: Partial
});

const offerSchema = new Schema({
    requestId: {
        type: Schema.Types.ObjectId,
        ref: 'piping-request',
    },
    fim_id:{
        type: Schema.Types.ObjectId,
        ref: 'Piping-Fim-Packing-List',
    },
    offer_no: {
        type: String,
    },
    imir_no: {
        type: String,
    },
    received_date: {
        type: Date,
        default: Date.now(),
    },
    invoice_no: {
        type: String,
    },
    offeredBy: {
        type: Schema.Types.ObjectId,
        ref: 'user',
    },
    items: [ItemSchema],
    acceptedBy: {
        type: Schema.Types.ObjectId,
        ref: "user",
    },
    qc_date: {
        type: Date,
    },
    send_qc_time: {
        type: Date,
    },
    rejectedBy: {
        type: Schema.Types.ObjectId,
        ref: "user",
    },
    is_fim:{
        type: Boolean,
        default: false
    },
    status: {
        type: Number,
        default: 1, // 1 - Pending, 2 - QC Inspection, 3 - Approved, 4 - Rejected, 5 - Partially-approved
    },
    deleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('piping-purchase-offer', offerSchema);
