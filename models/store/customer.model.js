const mongoose = require('mongoose');
const { Schema } = mongoose;

const CustomerSchema = new Schema({
    
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
        unique: true,
        required: true,
    },
    address:{
        type: String,
        required: true,
    },
    stateName:{
        type: String,
        required: true,
    },
    pinCode:{
        type: Number,
        required: true,
    },
    phone:{
        type: Number,
    },  
    gstNumber: {
        type: Number,
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

module.exports = mongoose.model('store-customers', CustomerSchema);