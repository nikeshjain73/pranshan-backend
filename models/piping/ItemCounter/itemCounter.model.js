const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema({
  project:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'bussiness-projects',
    required: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
     ref: 'piping-item-detail-category',
    required: true,
  },
  seq: {
    type: Number,
    default: 0
  },
  type: {
  type: String,
  default: "DEFAULT"
}
});
counterSchema.index({ category: 1, project: 1, type: 1 }, { unique: true });
module.exports = mongoose.model("piping-item-counters", counterSchema);