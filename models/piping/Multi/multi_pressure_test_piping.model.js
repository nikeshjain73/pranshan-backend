
const mongoose = require("mongoose");
const { Schema } = mongoose;
const { Status } = require("../../../utils/enumpiping");

const GaugeReadingSchema = new Schema({
  time: Date,
  pressure: String,
}, { _id: false });

const GaugeSchema = new Schema({
  serial_number: String,
  validity: Date,
  range: String,
  readings: [GaugeReadingSchema],
}, { _id: false });

const ChecklistSchema = new Schema({
  description: {
    type: String,
    required: true
  },
  is_accepted: {
    type: Number,
    enum: [0, 1, 2, 3], // 0= Pending, 1 = Accepted, 2 = Rejected, 3 = Not Applicable
    default: 0
  },
  qc_remarks: String,
}, { _id: false });

const PressureTestInspectionSchema = new Schema({
  report_no: {
    type: String,
    required: true,
    unique: true
  },
  report_no_two: String,

  project_id: {
    type: Schema.Types.ObjectId,
    ref: "bussiness-projects",
  },

  // ===============================
  // BASIC DETAILS
  // ===============================
  procedure_no: {
    type: Schema.Types.ObjectId,
    ref: 'procedure_and_specification',
    required: true
  },
  pid_reference_drawing: String,
  test_date: {
    type: Date,
    required: true
  },
  location: String,
  test_loop_no: String,

  // ===============================
  // TEST PARAMETERS
  // ===============================
  working_pressure: String,
  working_temperature: String,
  design_pressure: String,
  design_temperature: String,
  test_pressure: String,
  test_medium: String,
  test_duration: String,
  start_time: {
    type: Date,
    required: true
  },
  finish_time: {
    type: Date,
    required: true
  },


  // ===============================
  // PRE TEST CHECKLIST
  // ===============================
  pre_test_checks: [ChecklistSchema],

  // ===============================
  // GAUGES
  // ===============================
  pressure_gauges: [GaugeSchema], // gauge 1, gauge 2, etc.

  // ===============================
  // POST TEST CHECKLIST
  // ===============================
  post_test_checks: [ChecklistSchema],

  // ===============================
  // EXISTING ITEMS (Spool/Drawing)
  // ===============================
  items: [
    {
      drawing_id: {
        type: Schema.Types.ObjectId,
        ref: "piping-drawing",
        required: true,
      },
      spool_no_id: {
        type: Schema.Types.ObjectId,
        ref: "piping-drawing-spool-no-joint-items",
        required: true,
      },
      fd_id: {
        type: Schema.Types.ObjectId,
        ref: "piping-fd-inspection",
      },
      fd_item_id: {
        type: Schema.Types.ObjectId,
        ref: "piping-fd-inspection",
      },
      remarks: String,
      qc_remarks: String,
      is_accepted: {
        type: Number,
        enum: [0, 1, 2, 3], //  1 = Accepted, 2 = Rejected, 3 = Not Applicable
        default: 0
      },
      is_added_for_dispatch: {
        type: Boolean,
        default: false,
      },
      is_added_painting: {
        type: Boolean,
        default: false,
      },
      is_generated_painting: {
        type: Boolean,
        default: false,
      },
    },
  ],

  // ===============================
  // STATUS & APPROVAL
  // ===============================
  isBlastingPainting: {
    type: Boolean,
    default: false,
  },
  isSiteDispatch: {
    type: Boolean,
    default: false,
  },

  offered_by: {
    type: Schema.Types.ObjectId,
    ref: "user",
  },

  qc_time: Date,

  qc_name: {
    type: Schema.Types.ObjectId,
    ref: "user",
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

module.exports = mongoose.model(
  "piping-pressure-test-inspection",
  PressureTestInspectionSchema
);


// const mongoose = require("mongoose");
// const { Schema } = mongoose;
// const { Status } = require("../../../utils/enumpiping");

// const GaugeReadingSchema = new Schema({
//   time: { type: Date, required: true },
//   pressure: { type: String, required: true, trim: true },
// }, { _id: false });

// const GaugeSchema = new Schema({
//   serial_number: { type: String, required: true, trim: true },
//   validity: { type: Date, required: true },
//   range: { type: String, required: true, trim: true },
//   readings: { type: [GaugeReadingSchema], required: true },
// }, { _id: false });

// const ChecklistSchema = new Schema({
//   description: { type: String, required: true, trim: true },
//   is_accepted: { type: Boolean, required: true },
//   qc_remarks: { type: String },
// }, { _id: false });

// const PressureTestInspectionSchema = new Schema({
//   report_no: {
//     type: String,
//     required: true,
//     unique: true,
//     trim: true
//   },

//   report_no_two: { type: String, trim: true },

//   project_id: {
//     type: Schema.Types.ObjectId,
//     ref: "bussiness-projects",
//     required: true,
//   },

//   procedure_no: {
//     type: Schema.Types.ObjectId,
//     ref: "procedure_and_specification",
//     required: true
//   },

//   pid_reference_drawing: { type: String, required: true, trim: true },

//   test_date: { type: Date, required: true },

//   location: { type: String, required: true, trim: true },

//   test_loop_no: { type: String, required: true, trim: true },

//   working_pressure: { type: String, required: true, trim: true },
//   working_temperature: { type: String, required: true, trim: true },
//   design_pressure: { type: String, required: true, trim: true },
//   design_temperature: { type: String, required: true, trim: true },
//   test_pressure: { type: String, required: true, trim: true },
//   test_medium: { type: String, required: true, trim: true },
//   test_duration: { type: String, required: true, trim: true },

//   start_time: { type: Date, required: true },
//   finish_time: { type: Date, required: true },

//   pre_test_checks: {
//     type: [ChecklistSchema],
//     required: true
//   },

//   pressure_gauges: {
//     type: [GaugeSchema],
//     required: true
//   },

//   post_test_checks: {
//     type: [ChecklistSchema],
//     required: true
//   },

//   items: [{
//     drawing_id: {
//       type: Schema.Types.ObjectId,
//       ref: "piping-drawing",
//       required: true,
//     },
//     spool_no_id: {
//       type: Schema.Types.ObjectId,
//       ref: "piping-drawing-spool-no-joint-items",
//       required: true,
//     },
//     fd_id: {
//       type: Schema.Types.ObjectId,
//       ref: "piping-fd-inspection",
//       required: true,
//     },
//     fd_item_id: {
//       type: Schema.Types.ObjectId,
//       ref: "piping-fd-inspection",
//       required: true,
//     },
//     remarks: { type: String },
//     qc_remarks: { type: String },
//     is_accepted: { type: Boolean, required: true },
//   }],

//   isBlastingPainting: { type: Boolean, required: true },
//   isSiteDispatch: { type: Boolean, required: true },

//   offered_by: {
//     type: Schema.Types.ObjectId,
//     ref: "user",
//     required: true,
//   },

//   qc_time: { type: Date},

//   qc_name: {
//     type: Schema.Types.ObjectId,
//     ref: "user",
//   },

//   status: {
//     type: Number,
//     default: Status.Pending,
//   },

//   deleted: {
//     type: Boolean,
//   }

// }, { timestamps: true });

// module.exports = mongoose.model(
//   "piping-pressure-test-inspection",
//   PressureTestInspectionSchema
// );