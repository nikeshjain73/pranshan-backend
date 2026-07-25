
const mongoose = require('mongoose');
const { Status } = require('../../../utils/enum');
const { Schema } = mongoose;


const drawingSchema = new Schema({
  project: {
    type: Schema.Types.ObjectId,
    ref: 'bussiness-projects',
  },
  piping_class: {
    type: Schema.Types.ObjectId,
    ref: 'piping-class-request',
  },
service_id: {
  type: Schema.Types.ObjectId,
  required: true,
  ref: "piping-class-request.Items", // optional
},

  area_unit: {
    type: Schema.Types.ObjectId,
    ref: 'piping-areas',
  },
  master_updation_date: {
    type: Date,
    default: Date.now(),
  },
  drawing_no: {
    type: String,
    required: true,
     trim: true,
  },
  unique_no: {
    type: Number,
    required: true,
     trim: true,
  },
  drawing_received_lot_no: {
    type: String,
    required: true,
     trim: true,
  },
  drawing_receive_date: {
    type: Date,
  },
  p_id_drawing_no: {
    type: String,
    required: true,
     trim: true,
  },
  // sheet_no: {
  //   type: String,
  //   default: '',
  // },
  rev: {
    type: String,
    default: 0,
     trim: true,
  },
  drawing_pdf: {
    type: String,
    default: '',
  },
  drawing_pdf_name: {
    type: String,
    required: true,
     trim: true,
    default: '',
  },
  issued_date: {
    type: Date,
  },
  issued_person: {
    type: Schema.Types.ObjectId,
    ref: 'Contractor',
  },
  status: {
    type: Number,
    default: Status.Pending,
  },
  deleted: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

drawingSchema.index({ project: 1, deleted: 1 });
drawingSchema.index({ project: 1 });
drawingSchema.index({
  drawing_no: 'text',
  p_id_drawing_no: 'text',
  assembly_no: 'text',
  drawing_received_lot_no: 'text',
  area_unit: 'text',
  piping_class: 'text'
});
drawingSchema.index({ project: 1, unique_no: 1 }, { unique: true });

module.exports = mongoose.model('piping-drawing', drawingSchema);
