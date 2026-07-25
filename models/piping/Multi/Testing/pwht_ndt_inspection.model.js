const mongoose = require("mongoose");
const { Schema } = mongoose;
const { PWHTStatus } = require("../../../../utils/enumpiping");
const pwhtNdtInspectionPiping = new Schema(
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
      required: true,
    },
    test_date: {
      type: Date,
    },
    items: {
      type: [
        {
          ndt_master_id: {
            type: Schema.Types.ObjectId,
            ref: "piping_ndts",
            required: true,
          },
          pwht_offer_item_id: {
            type: Schema.Types.ObjectId,
            ref: "piping-pwht-ndt-offers",
            required: true,
          },
          weld_visual_id: {
            type: Schema.Types.ObjectId,
            ref: "piping-weld-visual-inspections",
            required: true,
          },
          weld_visual_item_id: {
            type: Schema.Types.ObjectId,
            ref: "piping-weld-visual-inspections",
            required: true,
          },
          pwht_master_id: {
            type: Schema.Types.ObjectId,
            ref: "piping_pwht",
            required: true,
          },
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
          piping_class: {
            type: Schema.Types.ObjectId,
            ref: "piping-class-request",
            required: true,
          },
          piping_material_specification: {
            type: Schema.Types.ObjectId,
            ref: "piping-material-specification",
            required: true,
          },
          material_item_id_1: {
            type: Schema.Types.ObjectId,
            ref: "piping-drawing-material-items",
            required: true,
          },
          material_item_id_2: {
            type: Schema.Types.ObjectId,
            ref: "piping-drawing-material-items",
            required: true,
          },
          thickness:{
            type: String,
            default: null,
          },
     loading_temp: { type: Number },   // ✅ fix here
rate_of_heating: { type: Number },
soaking_temp: { type: Number },
soaking_period: { type: Number },
rate_of_cooling: { type: Number },
unloading_temp: { type: Number },
          no_of_thermocouple: {
            type: String,
          },
          temperature_recorder_sr_no: {
            type: String,
          },
          temperature_recorder_validity: {
            type: String,
          },
          thermocouple_le_no_validity: {
            type: String,
          },
          start_date: {
            type: Date,
          },
          end_date: {
            type: Date,
          },
          chart_no: {
            type: String,
          },
          is_accepted: {
            type: Boolean,
            // default: false,
          },
          qc_remarks: {
            type: String,
          },
          remarks: {
            type: String,
          },
        },
      ],
    },
    offered_by: {
      type: Schema.Types.ObjectId,
      ref: "user",
    },
    report_date: {
      type: Date,
    },
    qc_name: {
      type: Schema.Types.ObjectId,
      ref: "user",
    },
    qc_time: {
      type: Date,
    },
is_main_offer: {
  type: Boolean,
  default: false,
},

    status: {
      type: Number, //1-Pending 2-Approved 3-Rejected 4-Send to QC for approval 5-Completed
      default: PWHTStatus.Pending,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model(
  "piping-pwht-ndt-inspection",
  pwhtNdtInspectionPiping,
);
