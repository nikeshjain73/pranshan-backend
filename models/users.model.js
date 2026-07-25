const mongoose = require('mongoose');
const { Schema } = mongoose;
 
const usersSchema = new Schema({
    user_name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        unique: true,
        required: true,
    },
    password: {
        type: String,
    },
    type:{
        type: String,
        enum: ['User', 'Client'],
        default: 'User',
    },
    year: [{
        type: Schema.Types.ObjectId,
        ref: 'year'
    }],
    firm: [{
        type: Schema.Types.ObjectId,
        ref: 'firm',
    }],
    project: [{
        type: Schema.Types.ObjectId,
        ref: 'bussiness-projects',
    }],
    role: {
        type: Schema.Types.ObjectId,
        ref: 'user-role',
    },
    product: [{
        type: Schema.Types.ObjectId,
        ref: 'product',
    }],
    // piping_project:[{
    //     type: Schema.Types.ObjectId,
    //     ref: 'bussiness-projects',
    // }],
    pay_subUser: {
        type: Boolean,
        default: false
    },
    pay_bankDetail: {
        type: Boolean,
        default: false
    },
    status: {
        type: Boolean,
        default: true
    },
    erpRole: {
        type: [
            {
                type: Schema.Types.ObjectId,
                ref: 'erp-role',
            }
        ],
        default: [],
    },
    structureRole: {
        type: [
            {
                type: Schema.Types.ObjectId,
                ref: 'erp-role',
            }
        ],
        default: [],
    },
    pipingRole: {
        type: [
            {
                type: Schema.Types.ObjectId,
                ref: 'erp-role',
            }
        ],
        default: [],
    },
    procurementRole:{
        type: [
            {
                type: Schema.Types.ObjectId,
                ref: 'erp-role',
            }
        ],
    },
    signature:{
        type: String,
        default: null
    },
    deleted: {
        type: Boolean,
        default: false,
    }
 
}, { timestamps: true });
 
module.exports = mongoose.model('user', usersSchema)