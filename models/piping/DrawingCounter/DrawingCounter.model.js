const mongoose = require("mongoose");

const drawingCounterSchema = new mongoose.Schema({
  project:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'bussiness-projects',
    required: true,
  },
  seq: {
    type: Number,
    default: 0
  }
});
drawingCounterSchema.index({ project: 1 }, { unique: true });
module.exports = mongoose.model("piping-drawing-counters", drawingCounterSchema);