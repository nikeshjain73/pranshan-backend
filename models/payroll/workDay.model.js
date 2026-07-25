const mongoose = require('mongoose');
const { Schema } = mongoose;

const workDaySchema = new Schema({

    department: {
        type: Schema.Types.ObjectId,
        ref: 'department',
    },
    firm_id: {
        type: Schema.Types.ObjectId,
        ref: 'firm',
    },
    year_id: {
        type: Schema.Types.ObjectId,
        ref: 'year',
    },

    working_day: {
        type: Number,
    },
    ot_hours: {
        type: Number,
    },
    ot_count: {
        type: Number
    },
    pf: {
        type: Number,
    },
    fpf: {
        type: Number,
    },
    esi: {
        type: Number,
    },
    lwf: {
        type: Number,
    },
    month: {
        type: Number,
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

module.exports = mongoose.model('workday', workDaySchema)


