const mongoose = require('mongoose');
const { Schema } = mongoose;

const ndtContactorPipingSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    project: {
        type: Schema.Types.ObjectId,
        ref: "bussiness-projects",
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

module.exports = mongoose.model('piping-ndt-contactor', ndtContactorPipingSchema);