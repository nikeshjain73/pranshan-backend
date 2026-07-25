const mongoose = require("mongoose");
const { Schema } = mongoose;

const dailyMandaySchema = new Schema(
  {
    date: { type: Date, required: true },
    value: { type: Number, default: 0 }, // mandays for the given date
  },
  { _id: false }
);

const dmrSchema = new Schema(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: "bussiness-projects",
      required: true,
    },
    category: { 
      type: String, 
      required: true,
      ref: 'DMRCategory'
    },
    cumulative_mandays: { type: Number, default: 0 },
    daily_mandays: [dailyMandaySchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("DMR", dmrSchema);
