  const mongoose = require("mongoose");
  const { Schema } = mongoose;

  const MPT_SChema = new Schema(
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
          mpt_lot_id: {
            type: Schema.Types.ObjectId,
            ref: "piping-rt-lot",
            default: null,
          },
          mpt_lot_item_id: {
            type: Schema.Types.ObjectId,
            ref: "piping-rt-lot-items",
            default: null,
          },
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


  module.exports = mongoose.model("piping-mpt-offer", MPT_SChema);
