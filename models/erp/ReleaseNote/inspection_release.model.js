const mongoose = require('mongoose');
const {Schema} = mongoose;

const IRNSchema = new Schema({
    report_no: {
        type: String,
        unique: true,
    },
    drawing_id: {
        type: Schema.Types.ObjectId,
        ref: 'erp-planner-drawing',
        required: true,
    },
    release_date:{
        type: Date,
        default: Date.now(),
    },
    inspection_summary_id: {
        type: Schema.Types.ObjectId,
        ref: 'erp-inspect-summary',
        required: true,
    },
    surafce_primer_report_id: {
        type: Schema.Types.ObjectId,
        ref: 'erp-paint-surface',
        required: true,
    },
    mio_paint_report_id: {
        type: Schema.Types.ObjectId,
        ref: 'erp-paint-mio',
        required: true,
    },
    final_coat_paint_report_id: {
        type: Schema.Types.ObjectId,
        ref: 'erp-paint-final-coat',
        required: true,
    },
    remarks: {
        type: String,
        default: '',
    },
    prepared_by: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true,
    },
    deleted:{
        type: Boolean,
        default: false,
    }
},{timestamps: true});

module.exports = mongoose.model('erp-inspection-release-notes', IRNSchema);