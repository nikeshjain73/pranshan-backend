
const mongoose = require('mongoose');
const { Status } = require('../../../utils/enum');
const { Schema } = mongoose;

const materialWiseItemSchema = new Schema({
  drawing_id: {
    type: Schema.Types.ObjectId,
    ref: 'piping-drawing',
  },
  project_id: {
    type: Schema.Types.ObjectId,
    ref: 'bussiness-projects',
  },
  item: {
    type: Schema.Types.ObjectId,
    ref: 'piping-items',
  },
  qty: {
    type: Number,
    required: true,
     trim: true,
  },
  // extra_qty: {
  //   type: Number,
  //   default: 0, //  default
  // },
  // total_requested_qty: {
  //   type: Number,
  //   default: 0,
  // },
  moved_next_step: {
    type: Number,
    default: 0, //  default
  },
  balance_qty: {
    type: Number,
    default: 0,
  },
  deleted: {
      type: Boolean,
      default: false,
  },
  status: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true }); 

materialWiseItemSchema.index({ project_id: 1, deleted: 1 });
materialWiseItemSchema.index({ deleted_id: 1 });
materialWiseItemSchema.index({ project_id: 1 });
materialWiseItemSchema.index({
  item: 'text',
});

module.exports = mongoose.model('piping-drawing-material-items', materialWiseItemSchema);
