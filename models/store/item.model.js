const mongoose = require("mongoose");
const { Schema } = mongoose;

const itemSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    ItemId: {
      type: Number,
      unique: true,
    },
    sr_no: {
      type: Number,
    },
    detail: {
      type: String,
      default: "",
    },
    material_grade: {
      type: String,
      default: "",
      // required: true,
    },
    unit: {
      type: Schema.Types.ObjectId,
      ref: "store-item-unit",
      required: true,
    },
    hsn_code: {
      type: Number,
      default: 0,
      // required: true,
    },
    gst_percentage: {
      type: Number,
      default: 0,
      // required: true,
    },
    mcode: {
      type: String,
      default: "",
    },
    purchase_rate: {
      type: Number,
      default: 0,
    },
    sale_rate: {
      type: Number,
      default: 0,
    },
    cost_rate: {
      type: Number,
      default: 0,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "store-item-category",
      required: true,
    },
    location: {
      type: Schema.Types.ObjectId,
      ref: "store-inventoryLocation",
      default: null,
      // required: true,
    },
    reorder_quantity: {
      type: Number,
      default: 0.0,
      // required: true,
    },
    is_main: {                   // Verify that Main store item or not
      type: Boolean,
      default: false,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: 'bussiness-projects',
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

module.exports = mongoose.model("store-items", itemSchema);
