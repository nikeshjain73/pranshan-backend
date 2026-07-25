const mongoose = require("mongoose");
const { Schema } = mongoose;

// Define sub-schema for each joint entry inside material_items
const jointMaterialItemSchema = new Schema({
  material_item_id: [
    {
      type: Schema.Types.ObjectId,
      ref: "piping-drawing-material-items",
      required: true,
    },
  ],
  selected_size_id:{
     type: Schema.Types.ObjectId,
      ref: "piping-item-size",
      required: true,
  },
    selected_thickness_id:{
     type: Schema.Types.ObjectId,
      ref: "piping-item-thickness",
      required: true,
  },

  joint_no: {
    type: String,
    required: true,
    trim: true,
  },
  sheet_no: {
    type: String,
    required: true,
    trim: true,
  },
  joint_type: {
    type: Schema.Types.ObjectId,
    ref: "piping-joint-type",
    required: true,
  },
   length: {
      type: Number,
      // required: true,
      trim: true,
    },
    area: {
      type: Number,
      // required: true,
       trim: true,
    },
    inch_meter: {
      type: Number,
      // required: true,
       trim: true,
    },

  is_added_fitUp_table:{
       type: Boolean,
      default: false,
  }
});

const jointWiseEntrySchema = new Schema(
  {
    drawing_id: {
      type: Schema.Types.ObjectId,
      ref: "piping-drawing",
      required: true,
    },
    project_id: {
      type: Schema.Types.ObjectId,
      ref: "bussiness-projects",
      required: true,
    },
    spool_no_id: {
      type: Schema.Types.ObjectId,
      ref: "piping-drawing-spool-no-joint-items",
      required: true,
    },

    // Array of material + joint details
    material_items: [jointMaterialItemSchema],
   
    spool_wise_sum_length:{
       type: Number,
      // required: true,
       trim: true,
    },
    spool_wise_sum_area:{
       type: Number,
      // required: true,
       trim: true,
    },
    spool_wise_sum_inch_meter:{
       type: Number,
      // required: true,
       trim: true,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
 
    is_generate_fitUp_offer:{
      type: Boolean,
      default: false,
    },
    status: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Useful indexes
jointWiseEntrySchema.index({ project_id: 1, deleted: 1 });
jointWiseEntrySchema.index({ drawing_id: 1, spool_no_id: 1 });

//Prevent duplicate joint_no per drawing + spool
jointWiseEntrySchema.index(
  { drawing_id: 1, spool_no_id: 1, "material_items.joint_no": 1 },
  { unique: true, sparse: true }
);

module.exports = mongoose.model(
  "piping-drawing-joint-items",
  jointWiseEntrySchema
);
