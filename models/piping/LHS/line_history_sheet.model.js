const mongoose = require("mongoose");
const { Schema } = mongoose;

const stageReportSchema = new Schema({

  report_no: String,
  ref_id: {
    type: Schema.Types.ObjectId
  },
    wps_id: {
    type: Schema.Types.ObjectId
  },
    welder_id: {
    type: Schema.Types.ObjectId
  },
  qc_date: Date

}, { _id: false });

const lotReportSchema = new Schema({

  lot_no: String,
  ndt_percentage: Schema.Types.ObjectId,
  ref_id: Schema.Types.ObjectId,
  offer_date: Date

}, { _id: false });

const jointSchema = new Schema({

  joint_spool_item_id: {
    type: Schema.Types.ObjectId,
    ref: "piping-drawing-joint-items"
  },

  fitup: stageReportSchema,
  root_dpt: stageReportSchema,


  weld_visual: stageReportSchema,

  
  ferrite: stageReportSchema,
  
  bsrrt: stageReportSchema,
  pwht: stageReportSchema,
  
  rt_lot: lotReportSchema,

 rt: stageReportSchema,
  asrrt: stageReportSchema,

  lpt_lot: lotReportSchema,

  lpt: stageReportSchema,

  mpt_lot: lotReportSchema,

  mpt: stageReportSchema,

  hardness: stageReportSchema,

  pmi: stageReportSchema,

  pickling: stageReportSchema,

  final_dimension: stageReportSchema

}, { _id: false });

const spoolSchema = new Schema({

  spool_no_id: {
    type: Schema.Types.ObjectId,
    ref: "piping-drawing-spool-no-joint-items"
  },

  joints: [jointSchema]

}, { _id: false });

const drawingSchema = new Schema({

  drawing_id: {
    type: Schema.Types.ObjectId,
    ref: "piping-drawing"
  },

  spools: [spoolSchema]

}, { _id: false });

const LHSSummarySchema = new Schema({

  report_no: String,

 project_id: {
    type: Schema.Types.ObjectId,
    ref: "bussines-projects"
  },

  summary_date: Date,

  drawings: [drawingSchema],

  is_generate: {
    type: Boolean,
    default: false
  },

  deleted: {
    type: Boolean,
    default: false
  }

}, { timestamps: true });

module.exports = mongoose.model(
  "piping-line-history-sheet",
  LHSSummarySchema
);