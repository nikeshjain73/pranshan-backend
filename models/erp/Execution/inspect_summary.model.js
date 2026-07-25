const mongoose = require('mongoose');
const { Schema } = mongoose;

const inspectSummary = new Schema({
    report_no: {
        type: String,
    },
    summary_date: {
        type: Date,
    },
    drawing_id: {
        type: Schema.Types.ObjectId,
        ref: 'erp-planner-drawing',
    },
    fitup_inspection_report: {
        type: String,
        default: '',
    },
    weld_inspection_report: {
        type: String,
        default: '',
    },
    ut_report: {
        type: String,
        default: '',
    },
    rt_report: {
        type: String,
        default: '',
    },
    mpt_report: {
        type: String,
        default: '',
    },
    lpt_report: {
        type: String,
        default: '',
    },
    fd_report: {
        type: String,
        default: '',
    },
    remarks: {
        type: String,
        default: '',
    },
    deleted: {
        type: Boolean,
        default: false,
    }
},{ timestamps: true });


module.exports = mongoose.model('erp-inspect-summary', inspectSummary);