const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const deductionSchema = new Schema({
    firm_id: {
        type: Schema.Types.ObjectId,
        ref: 'firm',
    },
    year_id: {
        type: Schema.Types.ObjectId,
        ref: 'year',
    },
    employee: {
        type: Schema.Types.ObjectId,
        ref: 'employee',
    },
    date: {
        type: Date
    },
    e_year: {
       type: Number,
       default: 0,
    },
    e_day: {
        type: Number,
        default: 0,
    },
    month: {
        type: Number,
    },
    voucher_no: {
        type: Number,
    },
    other_voucher_no: {
        type: String
    },
    type: {
        type: String, // type of deduction (e.g., loan, advance, etc.)
    },
    remark: {
        type: String
    },
    other_remark: {
        type: String
    },
    amount: {
        type: Number
    },
    deleted: {
        type: Boolean,
        default: false,
    },
    status: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true })

module.exports = mongoose.model('deduction', deductionSchema);