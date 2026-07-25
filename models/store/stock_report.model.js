// models/ReportModel.js
const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
    requestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'erp-request',
        required: true
    },
    material_po_no: {
        type: String,
        required: true
    },
    requestDate: {
        type: Date,
    },
    items: [{
        requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'erp-request' },
        transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'store_transaction_item' },
        name: String,
        itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'store-items' },
        unit: String,
        po_qty: Number,
        mcode: String,
        tag: String,
        store_type: String,
        offeredQty: Number,
        receiving_date: Date,
        offer_uom: String,
        offerNos: String,
        offerLength: Number,
        offerWidth: Number,
        acceptedQty: Number,
        acceptedLength: Number,
        acceptedWidth: Number,
        accepted_lot_no: String,
        tcNo: String,
        rejectedQty: Number,
        challan_qty: Number,
        acceptedRemarks: String,
        imir_no: String,
        lot_no: String
    }],
    offeredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    }
});

const ReportModel = mongoose.model('stock-report', ReportSchema);

module.exports = ReportModel;
