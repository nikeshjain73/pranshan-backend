const mongoose = require('mongoose');
const { Schema } = mongoose;

const yearSchema = new Schema({

    start_year: {
        type: Date,
    },
    end_year: {
        type: Date,
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

module.exports = mongoose.model('year', yearSchema)