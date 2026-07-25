const mongoose = require('mongoose');
const { Schema } = mongoose;

const multiDispatcNoteSchema = new Schema({
    report_no: {
        type: String,
    },
    dispatch_date: {
        type: Date,
        // default: Date.now(),
    },
    dispatch_site: {
        type: String,
    },
    selectedProcedures: {
        type: [String],
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
                dispatch_balance_grid_qty: {
                    type: Number,
                    default: 0
                },
                dispatch_used_grid_qty: {
                    type: Number,
                    default: 0
                },
                moved_next_step: {
                    type: Number,
                    default: 0
                },
                ass_weight: {
                    type: Number,
                },
                ass_area: {
                    type: Number,
                },
                paint_system: {
                    type: Schema.Types.ObjectId,
                    ref: 'painting-system',
                    default: null
                },
                remarks: {
                    type: String,
                },
            },
        ],
    },
    prepared_by: {
        type: Schema.Types.ObjectId,
        ref: 'user',
    },
    deleted: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true });


module.exports = mongoose.model('multi-erp-painting-dispatch-note', multiDispatcNoteSchema);