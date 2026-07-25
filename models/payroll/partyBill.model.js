const mongoose = require('mongoose');
const { Schema } = mongoose;

const PartyBillSchema = new Schema({
   
    project_id: {
        type: Schema.Types.ObjectId,
        ref: 'bussiness-projects',
        required: true
    },
    party_id: {
        type: Schema.Types.ObjectId,
        ref: 'store-party',
        required: true
    },
    firm_id:{
        type: Schema.Types.ObjectId,
        ref: 'firm',
        required: false
    },
    site:{
          type: String,
        required:false
    },
    invoice_no:{
        type: String,
        required:false
    },
    invoice_date:{
        type: Date,
        required:false
    },
    amount_with_gst:{
        type: Number,
        required:false
    },
    amount_with_out_gst:{
        type: Number,
        required:false
    },
    gst:{
        type: Number,
        required:false
    },
    tax_type:{
        type: String,
        required:false
    },      
    cgst:{
        type: Number,
        required:false
    },
    sgst:{
        type: Number,
        required:false
    },
    igst:{
        type: Number,
        required:false
    },
    amount_with_gst:{
        type: Number,
        required:false
    },

    category:{
        type: String,
        required:false
    },

    description:{
        type: String,
        required:false
    },
    po_no:{
        type: String,
        required:false
    },
    receiving_date:{
        type: Date,
        required:false
    },

    receiving_by:{
        type: String,
        required:false
    },

    receiving_from:{
        type: String,
        required:false
    },
    mail_status: {
        type: Boolean,
         required: true
    },
    payment_status: {
        type: Boolean,
        required: true
    },
    balance_amount: {
        type: Number,
        required:false
    },
    file: {
      type: String,
      required: false
    },
    remark:{
        type: String,
        required:false
    },
    deleted: {
        type: Boolean,
        default: false,
    }

}, { timestamps: true });

module.exports = mongoose.model('party-bills', PartyBillSchema);