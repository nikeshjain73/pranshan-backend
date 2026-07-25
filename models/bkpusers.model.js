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
    product: {
        type: String,
    },
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
    // erpRole: {
    //     type: Schema.Types.ObjectId,
    //     ref: 'erp-role',
    //     default: null,
    // },
    erpRole: {
        type: [
            {
                type: Schema.Types.ObjectId,
                ref: 'erp-role',
            }
        ],
        default: [],
    },
    deleted: {
        type: Boolean,
        default: false,
    }

}, { timestamps: true });

module.exports = mongoose.model('user', usersSchema)