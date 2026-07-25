const mongoose = require("mongoose");
const { Schema } = mongoose;

const TagSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    tag_number: {
      type: Number,
      required: true,
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

module.exports = mongoose.model("tag", TagSchema);
