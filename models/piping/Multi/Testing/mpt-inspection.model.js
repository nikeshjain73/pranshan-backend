const mongoose = require("mongoose");
const { Schema } = mongoose;

const MPT_INSPECTION_SChema = new Schema(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: "bussiness-projects",
      required: true,
    },
    offer_no: {
      type: String,
      required: true,
      unique: true,
    },
    offer_date: {
      type: Date,
      required: true,
    },
    report_no: {
      type: String,
      default: null,
    },
    report_date: {
      type: Date,
      default: null,
    },
    procedure_no: {
      type: Schema.Types.ObjectId,
      ref: "piping_procedure_and_specification",
      default: null,
    },
    test_date: {
      type: Date,
      default: null,
    },
    acceptance_standard: {
      type: String,
      default: null,
    },
    surface_condition: {
      type: String,
      default: null,
    },
    extent_of_examination: {
      type: String,
      default: null,
    },
    examination_stage: {
      type: String,
      default: null,
    },
    post_cleaning: {
      type: String,
      default: null,
    },
    technique: {
      type: String,
      default: null,
    },
    magnetization: {
      type: String,
      default: null,
    },
    lightening_equipment: {
      type: String,
      default: null,
    },
    medium: {
      type: String,
      default: null,
    },
    lightening_intensity: {
      type: String,
      default: null,
    },
    yoke_spacing: {
      type: String,
      default: null,
    },
    yoke_model_make: {
      type: String,
      default: null,
    },
    yoke_sr_no: {
      type: String,
      default: null,
    },
    particle: {
      type: String,
      default: null,
    },
    particle_batch_no: {
      type: String,
      default: null,
    },
    contrast: {
      type: String,
      default: null,
    },
    contrast_batch_no: {
      type: String,
      default: null,
    },
    items: [
      {
        drawing_id: {
          type: Schema.Types.ObjectId,
          ref: "piping-drawing",
        },
        spool_id: {
          type: Schema.Types.ObjectId,
          ref: "piping-drawing-spool-no-joint-items",
        },
        weld_visual_id: {
          type: Schema.Types.ObjectId,
          ref: "piping-weld-visual-inspection",
        },
        weld_visual_item_id: {
          type: Schema.Types.ObjectId,
          ref: "piping-weld-visual-inspection-items",
        },
        joint_id: {
          type: Schema.Types.ObjectId,
          ref: "piping-drawing-joint-items",
        },
        mpt_lot_id: {
          type: Schema.Types.ObjectId,
          ref: "piping-mpt-lot",
          default: null,
        },
        mpt_lot_item_id: {
          type: Schema.Types.ObjectId,
          ref: "piping-rt-lot-items",
          default: null,
        },
        observation: {
          type: String,
          default: null,
        },
        status: {
          type: Number,
          enum: [0, 1, 2, 3, 4], // 0: Pending 1: Accepted 2: Repair 3: Re-take 4: Re-shoot
          default: 0,
        },
        test_type: {
          type: String,
          enum: ['Internal', 'External'],
          default: "External",
        },
        observation: {
          type: String,
          default: null,
        },
        remarks: {
          type: String,
          default: null,
        },
        qc_remarks: {
          type: String,
          default: null,
        },
      }
    ],
    status: {
      type: Number,
      enum: [0, 1, 2, 3], // 0: pending 1: Accepeted 2: Rejected 3: Partially Accepted
      default: 0,
      required: true
    },
    offered_by: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    qc_by: {
      type: Schema.Types.ObjectId,
      ref: "users",
    },
    qc_date: {
      type: Date,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);


module.exports = mongoose.model("piping-mpt-inspection", MPT_INSPECTION_SChema);
