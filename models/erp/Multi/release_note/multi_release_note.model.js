const mongoose = require('mongoose');
const { Schema } = mongoose;


const multiIRNSchema = new Schema({
    report_no: {
        type: String,
        default: null,
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
                fd_report: [
                    {
                        type: String,
                        default: null,
                    }
                ],
                dispatch_report: [
                    {
                        type: String,
                        default: null,
                    }
                ],
                surface_report: [
                    {
                        type: String,
                        default: null,
                    }
                ],
                mio_report: [
                    {
                        type: String,
                        default: null,
                    }
                ],
                final_coat_report: [
                    {
                        type: String,
                        default: null,
                    }
                ],
            }
        ]
    },
    is_generate: {
        type: Boolean,
        default: false,
    },
    release_date: {
        type: Date,
    },
    batch_id: {
        type: Schema.Types.ObjectId,
        default: null,
    },
    remarks: {
        type: String,
        default: '',
    },
    prepared_by: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        default: null,
    },
    deleted: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true });

module.exports = mongoose.model('multi-erp-ins-release-note', multiIRNSchema);