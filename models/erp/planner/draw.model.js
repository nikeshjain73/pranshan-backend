const mongoose = require('mongoose');
const { Status } = require('../../../utils/enum');
const { Schema } = mongoose;

const drawSchema = new Schema({
    project: {
        type: Schema.Types.ObjectId,
        ref: 'bussiness-projects',
    },
    master_updation_date: {
        type: Date,
        default: Date.now(),
    },
    drawing_no: {
        type: String,
        required: true,
    },
    draw_receive_date: {
        type: Date
    },
    unit: {
        type: String,
        default: '',
    },
    sheet_no: {
        type: String,
        default: '',
    },
    rev: {
        type: Number,
        default: 0,
    },
    assembly_no: {
        type: String,
        default: '',
    },
    assembly_quantity: {
        type: Number,
        default: 0,
    },
    drawing_pdf: {
        type: String,
        // required: true,
        default: '',
    },
    drawing_pdf_name: {
        type: String,
        required: true,
        default: '',
    },
    issued_date: {
        type: Date,
    },
    issued_person: {
        type: Schema.Types.ObjectId,
        ref: 'Contractor',
    },
    status: {
        type: Number,
        default: Status.Pending, //1-Pending 2-approved 3-Rejected
    },
    deleted: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true });

drawSchema.index({ project: 1, deleted: 1 });
drawSchema.index({ project: 1 });

drawSchema.virtual("grid_items", {
  ref: "erp-drawing-grid-items",
  localField: "_id",
  foreignField: "drawing_id"
});

drawSchema.set("toObject", { virtuals: true });
drawSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model('erp-planner-drawing', drawSchema);