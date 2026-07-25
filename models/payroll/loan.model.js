const mongoose = require('mongoose');
const { Schema } = mongoose;

const loanSchema = new Schema({
    firm_id: {
        type: Schema.Types.ObjectId,
        ref: 'firm',
    },
    year_id: {
        type: Schema.Types.ObjectId,
        ref: 'year',
    },
    date: {
        type: Date,
    },
    e_year: {
        type: Number,
        default: 0
    },
    e_day: {
        type: Number,
        default: 0
    },
    e_month: {
        type: Number,
        default: 0
    },
    voucher_no: {
        type: Number
    },
    employee: {
        type: Schema.Types.ObjectId,
        ref: 'employee',
    },
    loan_terms: {
        type: String,
    },
    interest_rate: {
        type: Number,
    },
    loan_amount: {
        type: Number,
    },
    installment_amount: {
        type: Number
    },
    auth_person: {
        type: Schema.Types.ObjectId,
        ref: 'Auth-Person',
    },
    remaining_balance: { type: Number },
    remark: {
        type: String
    },
    loan_status: {
        type: String,
        enum: ['open', 'closed'],
        default: 'open'
    },
    deleted: {
        type: Boolean,
        default: false,
    },
    status: {
        type: Boolean,
        default: true,
    },

}, { timestamps: true });

module.exports = mongoose.model('loan', loanSchema);