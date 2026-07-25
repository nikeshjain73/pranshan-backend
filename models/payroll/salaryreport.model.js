const mongoose = require('mongoose');
const { number } = require('zod');
const Schema = mongoose.Schema;

const salaryReportSchema = new Schema({
    employee_id: {
        type: String
    },
    employee: {
        type: Schema.Types.ObjectId,
        ref: 'employee',
    },
    adhar_no: {
        type: Number
    },
    name: {
        type: String,
    },
    father_name: {
        type: String
    },
    dob: {
        type: Date,
    },
    mobile_number: {
        type: Number,
    },
    uan_no: {
        type: String,
    },
    year_id: {
        type: Schema.Types.ObjectId,
        ref: 'year',
    },
    month: {
        type: Number
    },
    joining_date: {
        type: Date
    },
    designation: {
        type: Schema.Types.ObjectId,
        ref: 'designation',
    },
    shift: {
        type: Schema.Types.ObjectId,
        ref: 'shift',
    },
    firm_id: {
        type: Schema.Types.ObjectId,
        ref: 'firm',
    },
    department: {
        type: Schema.Types.ObjectId,
        ref: 'department',
    },
    bank_name: {
        type: Schema.Types.ObjectId,
        ref: 'bank',
    },
    card_no: {
        type: String,
    },
    bank_account_no: {
        type: String,
    },
    bank_account_ifsc: {
        type: String,
    },
    is_stop_salary: {
        type: Boolean,
        default: false,
    },
    total_salary: {
        type: Number
    },
    perday_salary: {
        type: Number
    },
    working_day: {
        type: Number
    },
    basic_salary: {
        type: Number
    },
    hra_salary: {
        type: Number
    },
    conveyance_allowance_salary: {
        type: Number
    },
    medical_allowance_salary: {
        type: Number
    },
    other_salary: {
        type: Number
    },
    working_hour: {
        type: Number
    },
    total_present_Day: {
        type: Number
    },
    total_ot_Day: {
        type: Number
    },
    total_days: {
        type: Number
    },
    present_day_salary: {
        type: Number
    },
    ot_salary: {
        type: Number
    },
    total_extra_earning: {
        type: Number
    },
    isBonus_salary: {
        type: Number
    },
    gross_salary: {
        type: Number
    },
    loan_deduction: {
        type: Number
    },
    mess_deduction: {
        type: Number
    },
    penalty_deduction: {
        type: Number
    },
    advance_deduction: {
        type: Number
    },
    total_other_deduction: {
        type: Number
    },
    pf: {
        type: Number
    },
    esi: {
        type: Number
    },
    pt: {
        type: Number
    },
    tds: {
        type: Number
    },
    is_bonus: {
        type: Boolean,
        default: false,
    },
    totalP: {
        type: Number
    },
    totalFN: {
        type: Number
    },
    totalSP: {
        type: Number
    },
    totalH: {
        type: Number
    },
    totalCL: {
        type: Number
    },
    totalPFN: {
        type: Number
    },
    lwf: {
        type: Number
    },
    total_deduction: {
        type: Number
    },
    net_salary: {
        type: Number
    },
    total_ot_hour: {
        type: Number,
    },
    per_hour_ot_salary: {
        type: Number,
    },
    excel_net_salary: {
        type: Number,
    },
    net_difference: {
        type: Number,
    },
}, { timestamps: true })

module.exports = mongoose.model('salary-report', salaryReportSchema)