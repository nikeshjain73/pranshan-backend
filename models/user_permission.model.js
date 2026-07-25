const mongoose = require("mongoose");
const { Schema } = mongoose;

const userPermissionSchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },  
    permission_id: [
      {
        type: Schema.Types.ObjectId,
        ref: "firm",
      },
    ],
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

module.exports = mongoose.model("user-permissions", userPermissionSchema);
