const mongoose = require('mongoose');
const { Schema } = mongoose;

const partyTagSchema = new Schema({
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

module.exports = mongoose.model('store-party-tag', partyTagSchema);