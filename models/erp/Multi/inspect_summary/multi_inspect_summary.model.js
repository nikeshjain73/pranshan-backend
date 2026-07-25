const mongoose = require('mongoose');
const { Schema } = mongoose;

const multiInspectSummary = new Schema({
    report_no: {
        type: String,
        default: null,
    },
    summary_date: {
        type: Date,
    },
    items: {
        type: [
            {
                drawing_id: {
                    type: Schema.Types.ObjectId,
                    ref: 'erp-planner-drawing',
                    required: true,
                },
                grid_id: {
                    type: Schema.Types.ObjectId,
                    ref: 'erp-drawing-grid',
                    required: true,
                },
                is_grid_qty: {
                    type: Number,
                    required: true,
                },
                moved_next_step: {
                    type: Number,
                    default: 0
                },
                fitup_inspection_report: [
                    {
                        type: String,
                        default: null,
                    }
                ],
                weld_inspection_report: [
                    {
                        type: String,
                        default: null,
                    }
                ],
                ut_report: [
                    {
                        type: String,
                        default: null,
                    }
                ],
                rt_report: [
                    {
                        type: String,
                        default: null,
                    }
                ],
                mpt_report: [
                    {
                        type: String,
                        default: null,
                    }
                ],
                lpt_report: [
                    {
                        type: String,
                        default: null,
                    }
                ],
                fd_report: [
                    {
                        type: String,
                        default: null,
                    }
                ],
            },
        ],
    },
    is_generate: {
        type: Boolean,
        default: false,
    },
    batch_id: {
        type: Schema.Types.ObjectId,
        default: null,
    },
    deleted: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true });


module.exports = mongoose.model('multi-erp-inspect-summaries', multiInspectSummary);