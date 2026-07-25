const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const holidaySchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    date: {
        type: Date
    },
    day: {
        type: String
    },
    month: {
        type: Number,
        default: 0
    },

    firm_id: {
        type: Schema.Types.ObjectId,
        ref: 'firm',
    },

    // year_id: {
    //     type: Schema.Types.ObjectId,
    //     ref: 'year',
    // },

    status: {
        type: Boolean,
        default: true
    },
    deleted: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true });

module.exports = mongoose.model('holiday', holidaySchema);
