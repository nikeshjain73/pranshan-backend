const mongoose = require("mongoose");
const { Schema } = mongoose;

const InquirySchema = new mongoose.Schema(
    {
        project: {
            type: mongoose.Schema.Types.ObjectId, 
            ref: "bussiness-projects",
            required: true,
            trim: true,
        },
        InquiryNo: {
            type:String,
            required:true,
            trim:true,
        },
        InquiryDate: {
            type:Date,
            required:true,
        },
        revno: {
            type:Number,
            required:true,
        },
        purchase_order:{
            type: String,
            required: true,
        },
        items:[{
            prid: {type: mongoose.Schema.Types.ObjectId, ref: "material-procurement-request", required: true, },
            item: {type: mongoose.Schema.Types.ObjectId, ref: "store-items", required: true, },
            requiredSize: {type: String, required: true, },
            manufacture:[{type: mongoose.Schema.Types.ObjectId, ref:"store-party", required:true }],
            qty: {type: Number, required: true, },
            remarks: {type:String,  },
            balance_to_order: {type:Number, required: true, default:0 },
        }],
        total_qty:{
            type:Number,
        },
        deletedAt:{
            type:Date,
            default:null
        },
        deleted:{
            type:Boolean,
            default:false
        },
        // status: { type: Number, enum: [0, 1, 2], default: 0 }, // 0: Pending, 1: Approved, 2: Rejected
        remarks: { type: String, trim: true
        },
        sendPO:{
            type:Boolean,
            default:false
        },
        genratePO:{
            type:Boolean,
            default:false
        },
        terms_and_conditions: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Terms-and-Conditions",
                    trim: true,
                }
        ],
        otherTerms: [
            {
                type: String,
                trim: true,
            }
        ],
        createdby:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"user",
            required:true
        },
        
    },
    { timestamps: true }
)

module.exports = mongoose.model("material-inquiry", InquirySchema);
