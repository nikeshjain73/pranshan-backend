const mongoose = require('mongoose');
const { Schema } = mongoose;

const TransportSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String
    },
    phone: {
        type: Number,
        required: true,
    },
    address: {
        type: String,
        required: true,
    },
    project: {
        type: Schema.Types.ObjectId,
        ref: 'bussiness-projects',
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

module.exports = mongoose.model('store-transport', TransportSchema);