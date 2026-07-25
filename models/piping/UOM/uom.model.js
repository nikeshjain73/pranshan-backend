const mongoose = require('mongoose');
const { Schema } = mongoose;

const itemUomPipingSchema = new Schema({
    name: {
        type: String,
        unique: true,
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

module.exports = mongoose.model('piping-item-uom', itemUomPipingSchema);