const mongoose = require('mongoose');
const { Schema } = mongoose;

const BussinessClientSchema = new Schema({
    name: {
        type: String,
        unique: true,
        required: true,
    },
    address: {
        type: String,
        required: true,
    },
    phone: {
        type: Number,
        required: true,
    },
    email: {
        type: String,
    },
    gstNumber: {
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
}, { timestamps: true });

module.exports = mongoose.model('bussiness-clients', BussinessClientSchema);