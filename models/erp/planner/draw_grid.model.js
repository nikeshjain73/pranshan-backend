const mongoose = require('mongoose');
const { Schema } = mongoose;

const gridSchema = new Schema({
    drawing_id: {
        type: Schema.Types.ObjectId,
        ref: 'erp-planner-drawing',
        required: true,
    },
    grid_no: {
        type: String,
        default: '',
    },
    grid_qty: {
        type: Number,
        default: 0,
    },
    deleted: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true });

gridSchema.index({ drawing_id: 1, deleted: 1 });
gridSchema.index({ drawing_id: 1 });
gridSchema.index({ deleted: 1 });


module.exports = mongoose.model('erp-drawing-grid', gridSchema);