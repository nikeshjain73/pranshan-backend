const mongoose = require("mongoose");
const { Schema } = require("mongoose");
const { Status } = require("../../../utils/enumpiping");
const DptInspectionPiping = new Schema(
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
    procedure_no: {
      type: Schema.Types.ObjectId,
      ref: "piping_procedure_and_specifications",
    },

    test_date: {
      type: Date,
    },
    acceptance_code: {
      type: String,
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
          fitUp_id: {
            type: Schema.Types.ObjectId,
            ref: "piping-fitup-inspections",
          },
          fitUp_item_id: {
            type: Schema.Types.ObjectId,
            ref: "piping-fitup-inspections",
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
            required: true,
          },
          material_item_id_2: {
            type: Schema.Types.ObjectId,
            ref: "piping-drawing-material-items",
            required: true,
          },
          item_id_2: {
            type: Schema.Types.ObjectId,
            ref: "piping-items",
            required: true,
          },
          wps_no: {
            type: Schema.Types.ObjectId,
            ref: "wps",
          },
          welder_no: {
            type: Schema.Types.ObjectId,
            ref: "piping_welders",
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
          observation: {
            type: String,
          },

          // test_result: {
          //   type: String, // Accept / Reject / NA
          // },
          // is_accepted: {
          //   type: Boolean,
          //   default: false,
          // },
          is_accepted: {
            type: String,
            enum: ["Acc", "Rej", "NA",],
            default: "NA",
          },
          is_added_weld_visual: {
            type: Boolean,
            default: false,
          },
        },
      ],
    },
    test_details: {
      surface_condition: {
        type: String,
      },
      surface_temperature: {
        type: String,
      },
      examination_stage: {
        type: String,
      },
      technique: {
        type: String,
      },
      lighting_equipment: {
        type: String,
      },
      lighting_intensity: {
        type: String,
      },
      extent_examination: {
        type: String,
      },
      penetrant: {
        type: {
          type: String,
          default: "Solvent Removable",
        },
        make: String,
        model: String,
        batch_no: String,
        validity: String,
      },

      cleaner: {
        type: {
          type: String,
          default: "Solvent Removable",
        },
        make: String,
        model: String,
        batch_no: String,
        validity: String,
      },

      developer: {
        type: {
          type: String,
          default: "Solvent Removable",
        },
        make: String,
        model: String,
        batch_no: String,
        validity: String,
      },
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
    is_generate_weld_visual: {
      type: Boolean,
      default: false,
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
  { timestamps: true }
);

module.exports = mongoose.model("piping-dpt-inspection", DptInspectionPiping);
