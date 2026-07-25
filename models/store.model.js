const mongoose = require('mongoose');
const { Schema } = mongoose;

const storeSchema = new Schema({
    store_name: {
        type: String,
        required: true,
        unique: true,
    },
    store_email: {
        type: String,
        required: true,
        unique: true,
    },
    store_contact: {
        type: Number,
        required: true,
    },
    store_address: {
        type: String,
        required: true,
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

module.exports = mongoose.model('store', storeSchema)