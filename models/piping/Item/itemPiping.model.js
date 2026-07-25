const mongoose = require("mongoose");
const { Schema } = mongoose;

const itemPipingSchema = new Schema(
  {
      project: {
      type: Schema.Types.ObjectId,
      ref: 'bussiness-projects',
      required:true
    },
   item_category: {
        type: Schema.Types.ObjectId,
        ref: 'piping-item-detail-category',
        required: true,
        
    },
    item_code:{
      type: String,
      required: true,
      trim: true,
      unique: true
    },
     uom: {
        type: Schema.Types.ObjectId,
        ref: 'piping-item-uom',
        required: true,
    },
    item_name: {
      type: String,
      required: true,
      trim: true
    },
    item_description: {
      type: String,
      required: true,
      trim: true
    },
    size1: {
      type: Schema.Types.ObjectId,
      ref: "piping-item-size",
      required: false
    },
    thickness1: {
      type: Schema.Types.ObjectId,
      ref: "piping-item-thickness",
      required: true
    },
    size2: {
      type: Schema.Types.ObjectId,
      ref: "piping-item-size",
      required: false
    },
    thickness2: {
      type: Schema.Types.ObjectId,
      ref: "piping-item-thickness",
      required: false
    },
    material_grade: {
      type: String,
      required: true,
      trim: true
    },
  
    status: {
      type: Boolean,
      default: true,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("piping-items", itemPipingSchema);
