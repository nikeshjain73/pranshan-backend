const mongoose = require('mongoose');
const { Schema } = mongoose;

const ItemSchema = new mongoose.Schema({
    transactionId: { type: Schema.Types.ObjectId, ref: 'store_transaction_item', required: true },
    offeredQty: { type: Number, default: 0 },
    offerNos: { type: Number, default: 0 },
    offerLength: { type: Number, default: 0 },
    offerWidth: { type: Number, default: 0 },
    offer_topbottom_thickness: { type: String, default: '' },
    offer_width_thickness: { type: String, default: '' },
    offer_normal_thickness: { type: String, default: '' },
    lotNo: { type: String, default: '' },
    remarks: { type: String, default: '' },
    offer_uom: { type: Schema.Types.ObjectId, ref: 'store-item-unit', },
    acceptedQty: { type: Number, default: 0 },
    acceptedNos: { type: Number, default: 0 },
    acceptedLength: { type: Number, default: 0 },
    acceptedWidth: { type: Number, default: 0 },
    item_assembly_weight: { type: Number, default: 0 },
    accepted_topbottom_thickness: { type: String, default: '' },
    accepted_width_thickness: { type: String, default: '' },
    accepted_normal_thickness: { type: String, default: '' },
    accepted_lot_no: { type: String, default: '' },
    tcNo: { type: String, default: '' },
    heat_no_data: [
        {
            heat_no: { type: String, default: "" },
            inspected_nos: { type: Number, default: 0.0 },
            inspected_length: { type: String, default: "" },
            inspected_width: { type: String, default: "" },
            tc_no: { type: String, default: "" },
        },
    ],
    rejectedQty: { type: Number, default: 0 },
    challan_qty: { type: Number, default: 0 },
    rejected_length: { type: Number, default: 0 },
    rejected_width: { type: Number, default: 0 },
    manufacture: { type: Schema.Types.ObjectId, ref: 'store-party' },
    acceptedRemarks: { type: String, default: '' },
    balance_qty: { type: Number, default: 0 },
    qcStatus: { type: Number, enum: [1, 2, 3, 4], default: 1 },  // 1: Pending, 2: Approved, 3: Rejected, 4: Partial
    selected: { type: Boolean, default: false },
});

const offerSchema = new Schema({
    requestId: {
        type: Schema.Types.ObjectId,
        ref: 'erp-request',
    },
    fim_id:{
        type: Schema.Types.ObjectId,
        ref: 'FimPackingList',
    },
    orderPlacement: {
      type: Schema.Types.ObjectId,
      ref: "material-order-placement"
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
    status_type: {
        type: String,
        enum: ['REVIEWED', 'WITNESSED', 'RANDOM WITNESSED'],
        default: null,
    },
    client_status: {
        type: Number,
        default: 0, // 0 - Pending, 1 - Approved, 2 - Rejected, 3 - Partially-approved
    },
    client_date:{
        type: Date,
    },
    client_user:{
        type: Schema.Types.ObjectId,
        ref: "user",
    },
    deleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('erp-purchase-offer', offerSchema);
