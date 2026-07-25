const mongoose = require('mongoose');
const { Schema } = mongoose;

const dispatcNoteSchema = new Schema({
    lot_no: {
        type: String,
    },
    dispatch_date: {
        type: Date,
        default: Date.now(),
    },
    drawing_id: {
        type: Schema.Types.ObjectId,
        ref: 'erp-planner-drawing',
    },
    grid_no: {
        type: String,
        default: "",
    },
    dispatch_site: {
        type: String,
    },
    qty: {
        type: Number,
    },
    paint_system: {
        type: Schema.Types.ObjectId,
        ref: 'painting-system',
    },
    remarks: {
        type: String,
        default: '',
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


module.exports = mongoose.model('erp-painting-dispatch-note', dispatcNoteSchema);