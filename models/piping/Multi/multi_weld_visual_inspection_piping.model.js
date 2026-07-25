const mongoose = require("mongoose");
const { Schema } = require("mongoose");
const { Status } = require("../../../utils/enumpiping");
const WeldVisualInspectionPiping = new Schema(
  {
    report_no: {
      type: String,
      required: true,
    },
    report_no_two: {
        type: String,
    },
    project_id: {
      type: Schema.Types.ObjectId,
      ref: "bussiness-projects",
    },
 
    items: {
        type: [{
            drawing_id: {
                type: Schema.Types.ObjectId,
                ref: "piping-drawing",
                required: true
            },
            spool_no_id: {
                type: Schema.Types.ObjectId,
                ref: "piping-drawing-spool-no-joint-items",
                required: true
            },
            joint_spool_item_id: {
                type: Schema.Types.ObjectId,
                ref: "piping-drawing-joint-items",
                required: true,
            },
            joint_type_id: {
                type: Schema.Types.ObjectId,
                ref: "piping-drawing-joint-types",
                required: true,
            },
            fitUp_id: {
                type: Schema.Types.ObjectId,
                ref: 'piping-fitup-inspections',
            },
            fitUp_item_id: {
                type: Schema.Types.ObjectId,
                ref: "piping-fitup-inspections",
                // required: true
            },
            rootDpt_id: {
                type: Schema.Types.ObjectId,
                ref: 'piping-dpt-inspection',
            },
            rootDpt_item_id: {
                type: Schema.Types.ObjectId,
                ref: 'piping-dpt-inspection',
            },
            material_item_id_1: {
                type: Schema.Types.ObjectId,
                ref: "piping-drawing-material-items",
                required: true,
            },
            item_id_1: {
                type: Schema.Types.ObjectId,
                ref: "piping-items",
                // required: true,
            },
            material_item_id_2: {
                type: Schema.Types.ObjectId,
                ref: "piping-drawing-material-items",
                required: true,
            },
            item_id_2: {
                type: Schema.Types.ObjectId,
                ref: "piping-items",
                // required: true,
            },
            wps_no: {
                type: Schema.Types.ObjectId,
                ref: "wps",
            },
            welder_no: {
                type: Schema.Types.ObjectId,
                ref: 'piping_welders',
            },
            moved_next_step: {
                type: Number,
                default: 0,
            },
            remarks: {
                type: String,
            },
            qc_remarks: {
                type: String,
            },
            is_accepted: {
                type: Boolean,
                default: false,
            },
            is_added_bsrt:{
                type: Boolean,
                default: false,
            },
            is_bsrt_generated:{
                type: Boolean,
                default: false,
            },
            is_added_asrt:{
                type: Boolean,
                default: false,
            },
            is_asrt_generated:{
                type: Boolean,
                default: false,
            },
            is_added_rt:{
                type: Boolean,
                default: false,
            },
            is_rt_generated:{
                type: Boolean,
                default: false,
            },
            is_added_rt_lot:{
                type: Boolean,
                default: false,
            },
            is_generated_rt_lot:{
                type: Boolean,
                default: false,
            },
            is_added_mpt_lot:{
                type: Boolean,
                default: false,
            },
            is_generated_mpt_lot:{
                type: Boolean,
                default: false,
            },
            is_added_mpt:{
                type: Boolean,
                default: false,
            },
            is_mpt_generated:{
                type: Boolean,
                default: false,
            },
            is_added_lpt:{
                type: Boolean,
                default: false,
            },
            is_lpt_generated:{
                type: Boolean,
                default: false,
            },
            is_added_lpt_lot:{
                type: Boolean,
                default: false,
            },
            is_generated_lpt_lot:{
                type: Boolean,
                default: false,
            },
            isFt: {
                type: Boolean,
                default: false,
            },
            is_generated_ft:{
                type: Boolean,
                default: false,
            },
            isHardness: {
                type: Boolean,
                default: false,
            },
            is_generated_hardness:{
                type: Boolean,
                default: false,
            },
            is_added_pwht: {
                type: Boolean,
                default: false,
            },
            is_generated_pwht: {
                type: Boolean,
                default: false,
            },
            is_added_Fd: {
                type: Boolean,
                default: false,
            },
            is_generated_Fd: {
                type: Boolean,
                default: false,
            },
            isPmi: {
                type: Boolean,
                default: false,
            },
            is_generated_pmi: {
                type: Boolean,
                default: false,
            },
            isPickling: {
                type: Boolean,
                default: false,
            },
            is_generated_pickling: {
                type: Boolean,
                default: false,
            },
        }]
    },
    offered_by: {
        type: Schema.Types.ObjectId,
        ref: "user",
    },
    qc_time: {
      type: Date,
    },
    qc_name: {
        type: Schema.Types.ObjectId,
        ref: "user",
    },
    status: {
        type: Number, //1-Pending 2-Approved 3-Rejected
        default: Status.Pending,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model(
  "piping-weld-visual-inspection",
  WeldVisualInspectionPiping,
);
