const mongoose = require("mongoose");
const { Schema } = mongoose;

const pwhtSchema = new Schema(
  {
     project: {
      type: Schema.Types.ObjectId,
      ref: "bussiness-projects",
      required: true,
    },
    // pipingClass: { type: String, required: true },
    pipingClass: {
      type: Schema.Types.ObjectId,
      ref: "piping-class-request",
      required: true,
    },
    // service: { type: String, required: true },
    service:[{
      type: Schema.Types.ObjectId,
      ref: "piping-class-request",
      required: true,
    }],
    // PipingMaterialSpecification: { type: String, required: true },
      PipingMaterialSpecification: {
      type: Schema.Types.ObjectId,
      ref:"piping-material-specification",
      required: true,
    },
    pwhtType: { type: String, required: true },
    LoadingTemp: { type: Number, required: true },
    rateofHeating: { type: Number, required: true },
    soakingTemp: { type: Number, required: true },
    soakingPeriod: { type: Number, required: true },
    rateofCooling: { type: Number, required: true },
    unloadingTemp: { type: Number, required: true },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Optional: helper method to soft delete
pwhtSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  return this.save();
};

// Optional: static method to find non-deleted documents
pwhtSchema.statics.findActive = function(filter = {}) {
  return this.find({ deletedAt: null, ...filter });
};

module.exports = mongoose.model("piping_pwht", pwhtSchema);
