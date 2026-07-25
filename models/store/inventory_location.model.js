const mongoose = require("mongoose");
const { Schema } = mongoose;

const inventoryLocationSchema = new Schema(
  {
    name: {
      type: String,
      unique: true,
      required: true,
    },
    address: {
      type: String,
      default: "",
      // required: true,
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

module.exports = mongoose.model(
  "store-inventoryLocation",
  inventoryLocationSchema
);
