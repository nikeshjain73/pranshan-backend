const mongoose = require("mongoose");
const { Schema } = mongoose;

const ndtSchema = new Schema(
  {
    piping_class: {
      type: Schema.Types.ObjectId,
      ref: "piping-class-request",
      required: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: "bussiness-projects",
      required: true,
    },
    service: [{
      type: Schema.Types.ObjectId,
      ref: "piping-class-request",
      required: true,
    }],
    piping_material_specifiation: {
      type: Schema.Types.ObjectId,
      ref: "piping-material-specification",
      required: true,
    },
    jointType: {
      type: Schema.Types.ObjectId,
      ref: 'piping-joint-type',
    },
    BSRRT: {
      type: Boolean,
      required: true,
    },
    Ferrite: {
     type: Boolean,
      required: true,
    },
    PWHT: {
      type: Boolean,
      required: true,
    },
    ASRRT: {
      type: Boolean,
      required: true,
    },
    RT: {
     type: Boolean,
      required: true,
    },
    MPL: {
      type: Boolean,
      required: true,
    },
    LPT: {
     type: Boolean,
      required: true,
    },
    Hardness: {
      type: Boolean,
      required: true,
    },
    PMI: {
      type: Boolean,
      required: true,
    },
    PicklingPassivation: {
      type: Boolean,
      required: true,
    },
    status: {
      type: Number,
      enum: [0, 1],
      default: 1,
      required: true
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Optional: helper method to soft delete
ndtSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  return this.save();
};

// Optional: static method to find non-deleted documents
ndtSchema.statics.findActive = function (filter = {}) {
  return this.find({ deletedAt: null, ...filter });
};

module.exports = mongoose.model("piping_ndt", ndtSchema);
