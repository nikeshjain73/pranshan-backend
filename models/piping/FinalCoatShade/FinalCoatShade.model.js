const mongoose = require("mongoose");
const { Schema } = mongoose;

const FinalCoatshadeSchema = new Schema(
  {
    service: {
      type: Schema.Types.ObjectId,
      ref: 'piping-class-request',
      required: true,
    },
    shadeRalNo: {
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
FinalCoatshadeSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  return this.save();
};

// Optional: static method to find non-deleted documents
FinalCoatshadeSchema.statics.findActive = function(filter = {}) {
  return this.find({ deletedAt: null, ...filter });
};

module.exports = mongoose.model("piping_final_coat_shade", FinalCoatshadeSchema);
