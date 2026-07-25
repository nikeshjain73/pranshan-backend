const mongoose = require('mongoose');
const { Schema } = mongoose;

const monthAttendanceSchema = new Schema({
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
    month: {
        type: Number,
    },
    e_year: {
        type: Number,
        default: 0,
    },
    e_day: {
        type: Number,
        default: 0,
    },
    present_day: {
        type: Number,
        default: 0,
    },
    cl_day: {
        type: Number,
        default: 0,
    },
    ph_day: {
        type: Number,
        default: 0,
    },
    sunday_present: {
        type: Number,
        default: 0,
    },
    full_night_present: {
        type: Number,
        default: 0,
    },
    bonus_percent: {
        type: Number,
        default: 0,
    },
    actual_present_day: {
        type: Number,
        default: 0,
    },
    ot_day: {
        type: Number,
        default: 0,
    },
    ot_hour: {
        type: Number,
        default: 0,
    },
    use_leave: {
        type: Number
    },
    week_off_present: {
        type: Number,
        default: 0,
    },
    remark: {
        type: String,
        default: ''
    },
    voucher_no: {
        type: Number
    },
    holiday_present: {
        type: Number,
        default: 0,
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

module.exports = mongoose.model('monthly-attendance', monthAttendanceSchema) 