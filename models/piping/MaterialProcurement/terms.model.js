const mongoose = require("mongoose");

const TermsSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: true
    },
    status: {
      type: Boolean,
      default: true
    },
    firm_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Firm",
      required: true
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Piping-Terms-and-Conditions", TermsSchema);
