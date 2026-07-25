const mongoose = require('mongoose');
const {Schema} = mongoose;

const packingSchema = new Schema({
    voucher_no: {
        type: String,
    },
    consignment_no: {
        type: String,
        required: true
    },
    drawing_id: {
        type: Schema.Types.ObjectId,
        ref: 'erp-planner-drawing',
        required: true,
    },
    release_note_id: {
        type: Schema.Types.ObjectId,
        ref: 'erp-inspection-release-notes',
        required: true,
    },
    destination: {
        type: String,
        required: true,
    },
    vehicle_no: {
        type: String,
        required: true,
    },
    driver_name: {
        type: String,
        required: true,
    },
    gst_no: {
        type: String,
        default: '',
    },
    e_way_bill_no: {
        type: String,
        default: '',
    },
    packing_date: {
        type: Date,
        default: Date.now,
    },
    remarks: {
        type: String,
        default: '',
    },
    packed_by: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true,
    },
    is_invoice_generated: {
        type: Boolean,
        default: false,
    },
    deleted: {
        type: Boolean,
        default: false,
    }
}, {timestamps: true});

module.exports = mongoose.model('erp-packing', packingSchema);