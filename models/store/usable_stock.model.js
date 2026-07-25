const mongoose = require('mongoose');
const { Schema } = mongoose;

const usableStockSchema = new Schema({
    project_id: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'bussiness-projects',
    },
    material_po_no: {
        type: String,
        required: true,
    },
    itemId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'store-items',
    },
    balance_qty: {
        type: Number,
        required: true,
        // default: 0.0,
    },
    manufacture_id: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'store-parties',
    },
    supplier_id: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'store-parties',
    },
    imir_no: {
        type: String,
        required: true,
    },
    accepted_lot_no: {
        type: String,
        required: true,
    },
    usableLength: {
        type: Number,
        default: null,
    },
    usableWidth: {
        type: Number,
        default: null,
    },
    usableNos: {
        type: Number,
        default: null,
    },
    usableQty: {
        type: Number,
        required: true,
    },
    issued:{
        type: Boolean,
        default: false,
    },
    remarks: {
        type: String,
        default: null,
    },
    deleted: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true })


module.exports = mongoose.model('usable-stocks', usableStockSchema);