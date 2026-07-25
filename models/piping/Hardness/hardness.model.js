const mongoose = require("mongoose");
const { Schema } = mongoose;

const HardnessSchema = new Schema(
  {
    project:{
      type: Schema.Types.ObjectId,
      ref: 'bussiness-projects',
      required: true,
    },
    pipingClass: {
      type: Schema.Types.ObjectId,
      ref: 'piping-class-request',
      required: true,
    },
    service: {
      type: Schema.Types.ObjectId,
      ref: 'piping-class-request',
      required: true,
    },
    PipingMaterialSpecification: {
      type: String,
      required: true,
    },
    MaxAcceptableHardness: {
      type: String,
      required: true,
    },
    HardnessValue: {
      type: String,
      required: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Optional: helper method to soft delete
HardnessSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  return this.save();
};

// Optional: static method to find non-deleted documents
HardnessSchema.statics.findActive = function (filter = {}) {
  return this.find({ deletedAt: null, ...filter });
};

module.exports = mongoose.model("piping_hardness", HardnessSchema);
