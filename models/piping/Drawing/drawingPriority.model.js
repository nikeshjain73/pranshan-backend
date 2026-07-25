const mongoose = require("mongoose");
const { Schema } = mongoose;

const drawingPrioritySchema = new Schema(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: "bussiness-projects",
      required: true,
    },

    drawing_id: {
      type: Schema.Types.ObjectId,
      ref: "piping-drawing",
      required: true,
    },

    priority_no: {
      type: String,
      required: true,
    },

    locked: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "drawing-priority",
  drawingPrioritySchema
);