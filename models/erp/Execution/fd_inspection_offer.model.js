const mongoose = require('mongoose');
const { Status } = require('../../../utils/enum');
const { Schema } = mongoose;

const FDOfferSchema = new Schema({
    report_no: {
        type: String,
    },
    qc_report_no: {
        type: String,
    },
    report_date: {
        type: Date,
    },
    ndt_master_id: {
        type: Schema.Types.ObjectId,
        ref: 'erp-ndt-master',
    },
    drawing_id: {
        type: Schema.Types.ObjectId,
        ref: 'erp-planner-drawing',
    },
    required_dimension: {
        type: String,
    },
    actual_dimension: {
        type: String,
    },
    remarks: {
        type: String,
        default: '',
    },
    send_qc_time: {
        type: Date,
    },
    offered_by: {
        type: Schema.Types.ObjectId,
        ref: 'user',
    },
    qc_name: {
        type: Schema.Types.ObjectId,
        ref: 'user',
    },
    qc_time: {
        type: Date,
    },
    qc_status: {
        type: Boolean,
        default: false,
    },
    qc_remarks: {
        type: String,
    },
    status: {
        type: Number,
        default: Status.Pending, // 1-Pending 2-Approved 3-Rejected 4- Send to Qc
    },
    deleted: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true })

module.exports = mongoose.model('erp-fd-inspection-offer', FDOfferSchema);