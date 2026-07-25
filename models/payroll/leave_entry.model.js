const mongoose = require('mongoose');
const { Schema} =  mongoose;

const leaveEntrySchema = new Schema({
    voucher_no: {
        type: String,
    },
    firm_id: {
        type: Schema.Types.ObjectId,
        ref: 'firm',
    },
    e_year: {
        type: Number,
        default: 0,
    },
    e_month: {
        type: Number,
        default: 0,
    },
    e_day: {
        type: Number,
        default: 0,
    },
    entry_date: {
        type: Date,
        required: true
    },
    employee: {
        type: Schema.Types.ObjectId,
        ref: 'employee'
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    duration: {
        type: Number,
        required: true
    },
    reason: {
        type: String
    },
    approvedBy: {
        type: Schema.Types.ObjectId,
        ref: 'Auth-Person'
    }, 
    deleted: {
        type: Boolean,
        default: false
    }
 
},{timestamps: true});

module.exports = mongoose.model('Leave-Entry', leaveEntrySchema);