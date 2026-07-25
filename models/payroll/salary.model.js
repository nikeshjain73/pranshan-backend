const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const salarySchema = new Schema({
    employee: {
        type: Schema.Types.ObjectId,
        ref: 'employee',
        index: true
    },
    salary_type: {
        type: String,
        default: '',
    },
    work_day_id: {
        type: Schema.Types.ObjectId,
        ref: 'workday',
    },
    working_day: {
        type: Number,
        default: 0
    },
    working_hour: {
        type: Number,
        default: 0
    },
    perday_salary: {
        type: Number,
        default: 0
    },
    total_salary: {
        type: Number,
        default: 0
    },
    basic: {
        type: Number,
        default: 0
    },
    hra: {
        type: Number,
        default: 0
    },
    conveyance_allowance: {
        type: Number,
        default: 0
    },
    medical_allowance: {
        type: Number,
        default: 0
    },
    washing: {
        type: Number,
        default: 0
    },
    other: {
        type: Number,
        default: 0
    },
    month: {
        type: Number,
    },
    firm_id: {
        type: Schema.Types.ObjectId,
        ref: 'firm',
    },
    year_id: {
        type: Schema.Types.ObjectId,
        ref: 'year',
    },
    department: {
        type: Schema.Types.ObjectId,
        ref: 'department',
        index: true
    },
    e_year: {
        type: Number,
        default: 0,
    },
    e_day: {
        type: Number,
        default: 0,
    },
    // Bank Details
    bank_name: {
        type: Schema.Types.ObjectId,
        ref: 'bank',
    },
    bank_branch_name: {
        type: String,
        default: '',
    },
    bank_account_no: {
        type: String,
        default: '',
    },
    bank_account_ifsc: {
        type: String,
        default: '',
    },
    is_pf: {
        type: Boolean,
        default: false,
    },
    is_esi: {
        type: Boolean,
        default: false,
    },
    is_pt: {
        type: Boolean,
        default: true,
    },
    is_bonus: {
        type: Boolean,
        default: false,
    },
    tds: {
        type: Number
    },
    is_stop_salary: {
        type: Boolean,
        default: false,
    },
    remark: {
        type: String,
    },
    ot_hourly_salary: {
        type: Number,
        default: 0
    },
    perhour_ot_salary: {
        type: Number,
        default: 0
    },
    excel_net_salary: {
        type: Number,
        default: 0
    },
    net_difference: {
        type: Number,
        default: 0
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

salarySchema.index({ employee: 1, department: 1 });
salarySchema.index({ employee: 1 });
salarySchema.index({ employee: 1, month: 1 });

module.exports = mongoose.model('salary', salarySchema);