const mongoose = require('mongoose');
const { Schema } = mongoose;

const DispatcNoteOfferSchema = new Schema({
    dispatch_no: {
        type: Number,
    },
    items: {
        type: [
            {
                main_id: {
                    type: Schema.Types.ObjectId,
                    ref: 'multi-erp-inspect-summaries',
                    required: true,
                },
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
                    type: String,
                },
                paint_system: {
                    type: Schema.Types.ObjectId,
                    ref: 'painting-system',
                },
                remarks: {
                    type: String,
                },
            },
        ],
    },
}, { timestamps: true });


module.exports = mongoose.model('multi-erp-dispatch-note-offer', DispatcNoteOfferSchema);