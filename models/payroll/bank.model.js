const mongoose = require('mongoose');
const { Schema } = mongoose;

const bankSchema = new Schema({
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

module.exports = mongoose.model('bank', bankSchema)