const mongoose = require('mongoose');
const { Schema } = mongoose;

const ndtContactorPipingSchema = new Schema({
    piping_class: {
        type: Schema.Types.ObjectId,
        ref: "piping-class-request",
        required: true,
    },
    project: {
        type: Schema.Types.ObjectId,
        ref: "bussiness-projects",
        required: true,
    },
    rt_percentage: {
        type: Number,
        required: true,
    },
    lpt_percentage: {
        type: Number,
        required: true,
    },
    mpt_percentage: {
        type: Number,
        required: true,
    },
    status: {
        type: Boolean,
        default: true,
    },
    deleted: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true })

module.exports = mongoose.model('piping-ndt-percentage', ndtContactorPipingSchema);