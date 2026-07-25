
const mongoose = require('mongoose');
const { Status } = require('../../../utils/enum');
const { Schema } = mongoose;

const spoolNoJointWiseEntrySchema = new Schema({
   drawing_id: {
    type: Schema.Types.ObjectId,
    ref: 'piping-drawing',
  },
  project_id: {
    type: Schema.Types.ObjectId,
    ref: 'bussiness-projects',
  },
  spool_no:{
    type: String,
    required: true,
  },
  deleted: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });


// Unique per project 
spoolNoJointWiseEntrySchema.index(
  { spool_no: 1, project_id: 1, drawing_id: 1 },
  { unique: true }
);

// Other indexes
spoolNoJointWiseEntrySchema.index({ project_id: 1, deleted: 1 });
spoolNoJointWiseEntrySchema.index({ project_id: 1 });
spoolNoJointWiseEntrySchema.index({ spool_no: 'text' });

module.exports = mongoose.model('piping-drawing-spool-no-joint-items', spoolNoJointWiseEntrySchema);
