const mongoose = require("mongoose");
const { Schema } = mongoose;

const MasterSchema = new Schema(
  {
    tag_id: {
      type: Schema.Types.ObjectId,
      ref: "tags",
      required: true,
    },
    name: {
      type: String,
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

module.exports = mongoose.model("master", MasterSchema);
