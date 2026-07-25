const mongoose = require('mongoose');
const { Schema } = mongoose;

const LeaveSchema = new Schema({
    voucher_no: {
        type: String,
    },
    firm_id: {
        type: Schema.Types.ObjectId,
        ref: 'firm',
    },
    year: {
        type: Number,
        required: true,
    },
    date: {
        type: Date,
        required: true,
    },
    employee: {
        type: Schema.Types.ObjectId,
        ref: 'employee',
        required: true,
    },
    leave_days: {
        type: Number,
        default: 0.00,
        required: true,
    },
    jan:{
        type: Number,
        default: 0,  
    },
    feb:{
        type: Number,
        default: 0,  
    }, 
    march:{
        type: Number,
        default: 0,  
    }, 
    apr:{
        type: Number,
        default: 0,  
    }, 
    may:{
        type: Number,
        default: 0,  
    }, 
    june:{
        type: Number,
        default: 0,  
    }, 
    july:{
        type: Number,
        default: 0,  
    }, 
    aug:{
        type: Number,
        default: 0,  
    }, 
    sep:{
        type: Number,
        default: 0,  
    }, 
    oct:{
        type: Number,
        default: 0,  
    }, 
    nov:{
        type: Number,
        default: 0,  
    },
    dec:{
        type: Number,
        default: 0,  
    },
    total_leaves: {
        type: Number,
        default: 0.00,
        required: true,
    },
    remarks: {
        type: String,
        default: '',
    },
    deleted: {
        type: Boolean,
        default: false,
    }

}, {timestamps: true});

LeaveSchema.index({ firm_id: 1, year: 1, employee: 1 }, { unique: true });


module.exports = mongoose.model('employee-leaves', LeaveSchema);