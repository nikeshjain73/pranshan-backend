const { text } = require('body-parser');
const mongoose = require('mongoose');
const { Schema } = mongoose;

const partySchema = new Schema({
    firm_id: {
        type: Schema.Types.ObjectId,
        ref: 'firm',
    },
    year_id: {
        type: Schema.Types.ObjectId,
        ref: 'year',
    },
    name: {
        type: String,
        // unique: true,
        required: true,
    },
    address: {
        type: String,
        default: '',
        // required: true,
    },
    address_two: {
        type: String,
        default: '',
    },
    address_three: {
        type: String,
        default: '',
    },
    city: {
        type: String,
        default: '',
    },
    state: {
        type: String,
        default: '',
    },
    pincode: {
        type: Number,
        default: 0,
    },
    pancard_no: {
        type: String,
        default: '',
    },
    party_tag_id: {
        type: Schema.Types.ObjectId,
        ref: 'store-party-tag'
    },
    auth_person_id: {
        type: Schema.Types.ObjectId,
        ref: 'Auth-Person',
    },
    phone: {
        type: Number,
        default: 0,
    },
    email: {
        type: String,
        default: '',
    },
    // Password added at 09-12-2025
    password:{
        type:String,
        default:''
    },
    gstNumber: {
        type: String,
        default: '',
    },
    partyGroup: {
        type: Schema.Types.ObjectId,
        ref: 'store-party-group',
    },
    req_no: {
        type: String,
        default: '',
    },
    store_type: {
        type: Number, //1-Main Store 2-Product store 
    },
    is_admin: {
        type: Boolean,
        default: false,
    },
    ifsc_code: {
        type: String,
        default: '',
    },
    bank_name: {
        type: String,
        default: '',
    },
    bank_acc_no: {
        type: Number,
        default: 0,
    },
    udyam_no: {
        type: String,
        default: '',
    },
    logo: {
        type: String,
        default: '',
    },
    project: {
        type: Schema.Types.ObjectId,
        ref: 'bussiness-projects',
    },
     signature:{
        type: String,
        default: null
    },
    status: {
        type: Boolean,
        default: true,
    },
    deleted: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true })

module.exports = mongoose.model('store-party', partySchema);