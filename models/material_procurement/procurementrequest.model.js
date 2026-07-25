const mongoose = require('mongoose');
const { Schema } = mongoose;

const procurementRequestSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "bussiness-projects", // reference to your project table
      required: true,
      trim: true,
    },
    
    prNo: {
      type: String,
      required: true,
      trim: true,
    },
    revNo: {
      type: String,
      required: false,
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    items: [
      {
        mto: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "material-mto",
          required: true,
          trim: true,
        },
        item: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "store-items", // instead of separate sectionDetail, materialGrade, uom
          required: true,
        },
        prQty: { type: Number, required: true }, // 11800, 4350, etc
        balance_qty: { type:Number,default:0 },
        sectionLengthOrDimensions: { type: String, trim: true }, // Section length / plate dimensions
        deliveryDaysRequirement: { type: String, trim: true }, // Delivery requirement
        remarks: { type: String, trim: true }, // Remarks if any
      },
    ],
    totalQty: {
      type: Number,
      required: true,
    },
    remarks:{ type:String, trim:true },
    preparedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    reviewedBy: {  type: mongoose.Schema.Types.ObjectId, ref: "user"  },
    sendInquiry: { type: Boolean, default: false },
    inquiryGenrated: { type: Boolean, default: false },
    deleteatedAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false },
    approvedmake: [{ type: mongoose.Schema.Types.ObjectId, ref:"store-party", trim:true }],
    mtc: { type:String, trim:true },  
    delivery_location: { type:String, trim:true },
    other_note:[ { type:String, trim:true }],
  },
  { timestamps: true },

);

module.exports = mongoose.model("material-procurement-request", procurementRequestSchema);
