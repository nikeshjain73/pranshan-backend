const mongoose = require("mongoose");
const { Schema } = mongoose;

const RT_SChema = new Schema(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: "bussiness-projects",
      required: true,
    },
    contactor: {
      type: Schema.Types.ObjectId,
      ref: "piping-ndt-contactor",
      required: true,
    },
    offer_no: {
      type: String,
      // required: true,
      // unique: true,
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
    source: {
      type: String,
      default: null,
    },
    film: {
      type: String,
      default: null,
    },
    penetrameter: {
      type: String,
      default: null,
    },
    strenght: {
      type: String,
      default: null,
    },
    sensitivity: {
      type: String,
      default: null,
    },
    density: {
      type: String,
      default: null,
    },
    screen: {
      type: String,
      default: null,
    },
    acceptance_standard: {
      type: String,
      default: null,
    },
    front: {
      type: String,
      default: null,
    },
    back: {
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
        rt_type:
        {
          type: String,
          required: true,
          enum: ['BSRT', 'ASRT', 'RT']
        },
        rt_lot_id: {
          type: Schema.Types.ObjectId,
          ref: "piping-rt-lot",
          default: null,
        },
        rt_lot_item_id: {
          type: Schema.Types.ObjectId,
          ref: "piping-rt-lot-items",
          default: null,
        },
        thickness:{
          type: String,
          default: null,
        },
        old_status: {
          type: Number,
          enum: [0, 1, 2, 3, 4], // 0: Pending 1: Accepted 2: Repair(RP) 3:Re-take(RT) 4: Re-shoot(RS)
          default: 0,
        },
        status: {
          type: Number,
          enum: [0, 1, 2, 3, 4], // 0: Pending 1: Accepted 2: Repair(RP) 3:Re-take(RT) 4: Re-shoot(RS)
          default: 0,
        },
        old_test_type: {
          type: String,
          enum: ['Internal', 'External'],
          default: null,
        },
        test_type: {
          type: String,
          enum: ['Internal', 'External'],
          default: "External",
        },
        rt_location: {
          type: String,
          required: true,
        },
        sfd: {
          type: String,
          default: null,
        },
        expo_time: {
          type: String,
          default: null,
        },
        technique: {
          type: String,
          default: null,
        },
        segment: [{
          type: String,
          default: null,
        }],
        film_size: [{
          type: String,
          default: null,
        }],
        observation: [{
          type: String,
          default: null,
        }],
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


module.exports = mongoose.model("piping-rt-inspection", RT_SChema);
