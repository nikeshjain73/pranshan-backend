const mongoose = require('mongoose');
const { Schema } = mongoose;

const unitLocationSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    status: {
        type: Boolean,
        default: true
    },
    deleted: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true });

module.exports = mongoose.model('unit-location', unitLocationSchema);