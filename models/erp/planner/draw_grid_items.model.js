const mongoose = require('mongoose');
const { Schema } = mongoose;

const drawingItemSchema = new Schema({
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
    item_name: {
        type: Schema.Types.ObjectId,
        ref: "store-items",
        required: true,
    },
    item_no: {
        type: String,
    },
    item_qty: {
        type: Number,
        default: 0,
    },
    item_length: {
        type: Number,
        default: 0,
    },
    item_width: {
        type: Number,
        default: 0,
    },
    item_weight: {
        type: Number,
        default: 0,
    },
    assembly_weight: {
        type: Number,
        default: 0,
    },
    assembly_surface_area: {
        type: Number,
        default: 0,
    },
    used_grid: {
        type: Number,
        default: 0,
    },
    balance_grid: {
        type: Number,
        default: 0,
    },
    joint_type: [
        {
            type: Schema.Types.ObjectId,
            ref: 'joint-type',
        },
    ],
    deleted: {
        type: Boolean,
        default: false,
    },
    status: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

drawingItemSchema.index({ drawing_id: 1, grid_id: 1, deleted: 1 });
drawingItemSchema.index({ drawing_id: 1, grid_id: 1 });
drawingItemSchema.index({ drawing_id: 1, });
drawingItemSchema.index({ grid_id: 1 });
drawingItemSchema.index({ deleted: 1 });


module.exports = mongoose.model('erp-drawing-grid-items', drawingItemSchema);
