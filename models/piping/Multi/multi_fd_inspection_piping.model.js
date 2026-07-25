const mongoose = require("mongoose");
const { Schema } = require("mongoose");
const { Status } = require("../../../utils/enumpiping");
const FdInspectionPiping = new Schema(
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
            required: true,
          },
          weld_visual_id_data: [
                    {
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
                    }
                  ],
         
          moved_next_step: {
            type: Number,
            default: 0,
          },
          actual_dimension: {
            type: String,
          },
           required_dimension: {
            type: String,
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
          is_added_pressure_test: {
            type: Boolean,
            default: false,
          },
          is_generated_pressure_test: {
            type: Boolean,
            default: false,
          },
        },
      ],
    },
    isHydroTesting: {
  type: Boolean,
  default: false
},
isBlastingPainting: {
  type: Boolean,
  default: false
},
isSiteDispatch: {
  type: Boolean,
  default: false
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
      type: Number,
      default: Status.Pending,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("piping-fd-inspection", FdInspectionPiping);
