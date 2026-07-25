const mongoose = require("mongoose");
const { Schema } = mongoose;

const LPT_SChema = new Schema(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: "bussiness-projects",
      required: true,
    },
    // contactor: {
    //   type: Schema.Types.ObjectId,
    //   ref: "piping-ndt-contactor",
    //   required: true,
    // },
    offer_date: {
      type: Date,
      required: true,
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
           weld_visual_report_no: {
          type: String,
          default: null,
        },
          welder_id: {
          type: Schema.Types.ObjectId,
          ref: "piping_welder",
          required: true,
        },
        ndt_percentage:{
            type: Schema.Types.ObjectId,
            ref: "piping-ndt-percentage",
        },
        // is_covered:{
        //     type: Boolean,
        //     default: false,
        // },
      }
    ],
    status: {
      type: Number,
      enum: [0, 1, 2],
      default: 1,
      required: true
    },
    offered_by:{
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    lot_id: {
      type: Schema.Types.ObjectId,
      ref: "piping-lpt-lot",
      default: null,
    },
    lot_generated: {
      type: Boolean,
      default: false,
    }
  },
  { timestamps: true }
);


module.exports = mongoose.model("piping-lpt-lot-offer", LPT_SChema);
