const mongoose = require('mongoose');
const { Schema } = mongoose;

const dailyAttendanceSchema = new Schema({
    firm_id: {
        type: Schema.Types.ObjectId,
        ref: 'firm',
        index: true,
    },
    year_id: {
        type: Schema.Types.ObjectId,
        ref: 'year',
        index: true,
    },
    employee: {
        type: Schema.Types.ObjectId,
        ref: 'employee',
        index: true,
    },
    project: {
        type: Schema.Types.ObjectId,
        ref: 'bussiness-projects',
        index: true,
    },
    date: {
        type: Date,
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
        index: true,
    },
    voucher_no: {
        type: Number
    },
    in_time: {
        type: String,
        default: '',
    },
    out_time: {
        type: String,
        default: '',
    },
    shift: {
        type: Schema.Types.ObjectId,
        ref: 'shift'
    },
    work_department: {
        type: Schema.Types.ObjectId,
        ref: 'department',
    },
    total_work_hour: {
        type: Number,
        default: 0,
    },
    ot_hour: {
        type: Number,
        default: 0,
    },
    half_day: {
        type: Boolean,
        default: false,
    },
    present_day: {
        type: Number,
        default: 0,
    },
    late_hour: {
        type: Number,
        default: 0,
    },
    early_going: {
        type: Number,
        default: 0,
    },
    remark: {
        type: String,
        default: ''
    },
    is_present: {
        type: Boolean,
    },
    use_leave: {
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
    holiday_present: {
        type: Number,
        default: 0,
    },
    apchar: {
        type: String, // a = absent, p = present, cl = casual leave, hd = half day
        default: ''
    },
    other_Apchar: { // hp => holiday present, sp => sunday present, hd=> half day , h => holiday, fn => full night
        type: String,
        default: '',
    },
    sum_Apchar: {
        type: String,
        default: '',
    },
    import_tag: {
        type: Number,
        default: 3, // 1- Imported Data 2-Updated imported data 3-Manual Entry
    },
    status: {
        type: Boolean,
        default: true
    },
    deleted: {
        type: Boolean,
        default: false,
        index: true,
    }

}, { timestamps: true });

dailyAttendanceSchema.index({ employee: 1, year_id: 1, month: 1, project: 1, deleted: 1 });


module.exports = mongoose.model('daily-attendance', dailyAttendanceSchema) 