const mongoose = require("mongoose");
const { Schema } = mongoose;

const PermissionSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      unique: true,
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

module.exports = mongoose.model("permissions", PermissionSchema);
