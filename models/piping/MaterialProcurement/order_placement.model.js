const { string } = require("joi");
const mongoose = require("mongoose");
const { Schema } = mongoose;

const OrderPlacementSchema = new mongoose.Schema(
    {
        project:{
            type: mongoose.Schema.Types.ObjectId, 
            ref: "bussiness-projects",
            required: true,
            trim: true,

        },
        po_no:{
            type: String,
            required: true,
            trim: true,
        },
        vendor:{
            type: mongoose.Schema.Types.ObjectId, 
            ref:"store-party", 
            required:true, 
        },
        rev_no:{
            type: Number,
            default: 0,
        },
        po_date:{
            type: Date,
            required: true,
        },
        kind_atten:{
            type: String,
            required: true,
            trim: true,

        },
        buyer:{
            type: String,
            required: true,
            trim: true,
        },
        ref_no:{
            type: String,
            required: true,
            trim: true,
        },
        purchase_order:{
            type: String,
            required: true,
        },
        buyer_number:{
            type: String,
            required: true,
        },
        items: [{
            inquiryId: {type: mongoose.Schema.Types.ObjectId, ref: "piping-material-inquiry", required: true, trim: true },
            inquiryItem: { type: mongoose.Schema.Types.ObjectId, ref: "piping-items" },
            item: {type: mongoose.Schema.Types.ObjectId, ref: "piping-items", required: true, trim: true },
            manufacture:[{type: mongoose.Schema.Types.ObjectId, ref:"store-party", required:true, trim: true }],
            qty: {type: Number, required: true, trim: true, },
            rates: {type: Number, required: true, trim: true, },
            cgst: {type: Number, required: false, trim: true, },
            sgst: {type: Number, required: false, trim: true, },
            igst: {type: Number, required: false, trim: true, },
            amount: {type: Number, required: true, trim: true, },
            remarks: {type: String, required: false, trim: true, },
        }],

        total_qty:{
            type:Number,
            trim: true,
        },
        total_amount:{
            type:Number,
            trim: true,
        },
        total_cgst:{
            type:Number,
            trim: true,
        },
        total_sgst:{
            type:Number,
            trim: true,
        },
        total_igst:{
            type:Number,
            trim: true,
        },
        remarks: { 
            type: String, 
            trim: true, 
            required: false, 
        },
        terms_and_conditions: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Piping-Terms-and-Conditions",
            trim: true,
        }
        ],
        terms: [
        {
            type: String,
            trim: true,
        }
        ],
        otherTerms: [
            {
                type: String,
                trim: true,
            }
        ],
        send_to_material:{
            type:Boolean,
            default:false,
        },
        createdby:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"user",
            required:true
        },
        deletedAt:{
            type:Date,
            default:null
        },
        deleted:{
            type:Boolean,
            default:false
        },
    },
    { timestamps: true }
)


module.exports = mongoose.model("piping-material-order-placement", OrderPlacementSchema);