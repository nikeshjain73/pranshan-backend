const mongoose = require("mongoose");
const { Schema } = mongoose;

const RT_SChema = new Schema(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: "bussiness-projects",
      required: true,
    },
    offer_date: {
      type: Date,
      required: true,
    },
    lot_number: {
      type: String,
      required: true,
    },
    items: [
      {
        drawing_id: {
          type: Schema.Types.ObjectId,
          ref: "piping-drawing",
          default: null,
        },
        spool_id: {
          type: Schema.Types.ObjectId,
          ref: "piping-drawing-spool-no-joint-items",
          default: null,
        },
        weld_visual_id: {
          type: Schema.Types.ObjectId,
          ref: "piping-weld-visual-inspection",
          default: null,
        },
        weld_visual_item_id: {
          type: Schema.Types.ObjectId,
          ref: "piping-weld-visual-inspection-items",
          default: null,
        },
        joint_id: {
          type: Schema.Types.ObjectId,
          ref: "piping-drawing-joint-items",
          default: null,
        },
        welder_no: {
          type: Schema.Types.ObjectId,
          ref: "piping_welder",
          default: null,
        },
        weld_visual_report_no: {
          type: String,
          default: null,
        },
        ndt_percentage: {
          type: Schema.Types.ObjectId,
          ref: "piping-ndt-percentage",
          default: null,
        },
        is_covered: {
          type: Boolean,
          default: false,
        },
        rt_report:[{
          type: String,
          default: null,
        }],
        is_accepted: {
          type: Boolean,
          default: false,
        },
        remark:{
          type: String,
          default: null,
        }
      }
    ],
    status: {
      type: Number,
      enum: [0, 1, 2],
      default: 1,
      required: true
    },
    offered_by: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);


module.exports = mongoose.model("piping-rt-lot", RT_SChema);
