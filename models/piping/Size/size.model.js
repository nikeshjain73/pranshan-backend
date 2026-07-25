const mongoose = require('mongoose');
const { Schema } = mongoose;

const itemSizePipingSchema = new Schema({
    name: {
        type: String,
        unique: true,
        required: true,
    },
    size_mm: {
        type: String,
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

module.exports = mongoose.model('piping-item-size', itemSizePipingSchema);