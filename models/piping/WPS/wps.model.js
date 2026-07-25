const mongoose = require("mongoose");
const { Schema } = mongoose;

const wpsSchema = new Schema(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: "bussiness-projects",
      required: true,
    },
    jointType: {
        type: [{
            jointId: {
                type: Schema.Types.ObjectId,
                ref: 'piping-joint-type',
            }
        }],
        default: []
    },
    wpsNo: { 
      type: String, 
      required: true 
    },
    // PipingMaterialSpecification: { 
    //   type: String, 
    //   required: true 
    // },
    PipingMaterialSpecification:{
      type: Schema.Types.ObjectId,
      ref: "piping-material-specification",
      required: true
    },
    
    weldingProcess: { 
      type: String, 
      required: true 
    },
    MinimumThickness: { 
      type: Number, 
      required: true 
    },
    MaximumThickness: { 
      type: Number, 
      required: true 
    },
    PreHeat: { 
      type: String, 
      required: true 
    },
    PWHT: { 
      type: String, 
      required: true 
    },
    pdf: { 
      type: String, 
      required: true 
    }, // store file path or URL
    deletedAt: { 
      type: Date, 
      default: null 
    }, // null means not deleted
  },
  { timestamps: true }
);

// Optional: helper method to soft delete
wpsSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  return this.save();
};

// Optional: static method to find non-deleted documents
wpsSchema.statics.findActive = function(filter = {}) {
  return this.find({ deletedAt: null, ...filter });
};

module.exports = mongoose.model("WPS", wpsSchema);
