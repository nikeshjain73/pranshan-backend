const mongoose = require("mongoose");
const { Status } = require("../../../utils/enum");
const { Schema } = mongoose;

const fitUpPipingSchema = new Schema(
  {
    report_no: {
      type: String,
    },
    report_no_two: {
      type: String,
    },
    project_id: {
      type: Schema.Types.ObjectId,
      ref: 'business-projects',
    },
    issue_id: {
      type: Schema.Types.ObjectId,
      ref: "material-drawing-issue-acceptance-pipings",
    },
    items: {
      type: [
        {
          drawing_id: {
            type: Schema.Types.ObjectId,
            ref: "piping-drawing",
            required: true,
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

          fitOff_used_qty: {
            type: Number,
            required: true,
          },
          fitOff_balance_qty: {
            type: Number,
            required: true,
          },
          imir_no_1: {
            type: String,
            // required: true
          },
          heat_no_1: {
            type: String,
            // required: true
          },
          imir_no_2: {
            type: String,
            // required: true
          },
          heat_no_2: {
            type: String,
            //  required:true
          },
          wps_no: {
            type: Schema.Types.ObjectId,
            ref: "wps",
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
          is_added_root_dpt: {
            type: Boolean,
            default: false,
          },
          is_added_weld_visual: {
            type: Boolean,
            default: false,
          },
            root_dpt: {
      type: Boolean,
      default: false,
    },
    weld_visual_offer: {
      type: Boolean,
      default: false,
    },
     is_generate_weld_visual: {
      type: Boolean,
      default: false,
    },
    is_generate_root_dpt: {
      type: Boolean,
      default: false,
    },
        },
      ],
    },
    offered_by: {
      type: Schema.Types.ObjectId,
      ref: "user",
    },
    // qc_status: {
    //     type: Boolean,
    // },
    // root_dpt: {
    //   type: Boolean,
    //   default: false,
    // },
    // weld_visual_offer: {
    //   type: Boolean,
    //   default: false,
    // },
    qc_time: {
      type: Date,
    },
    qc_name: {
      type: Schema.Types.ObjectId,
      ref: "user",
    },
    // is_generate_weld_visual: {
    //   type: Boolean,
    //   default: false,
    // },
    // is_generate_root_dpt: {
    //   type: Boolean,
    //   default: false,
    // },
    status: {
      type: Number, //1-Pending 2-Approved 3-Rejected
      default: Status.Pending,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

fitUpPipingSchema.index({
  deleted: 1,
  report_no_two: 1,
  createdAt: -1,
});

fitUpPipingSchema.index({
  report_no_two: "text",
});

module.exports = mongoose.model("piping-fitup-inspection", fitUpPipingSchema);
