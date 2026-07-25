  const mongoose = require("mongoose");
  const { Schema } = mongoose;

  const RT_SChema = new Schema(
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
          rt_type: {
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
          inspection_type: {
            type: String,
            required: true,
            enum: ['Initial', 'Repair','Re-Take','Re-Shoot'],
            default: 'Initial'
          },
          test_type: {
            type: String,
            enum: ['Internal', 'External'],
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


  module.exports = mongoose.model("piping-rt-offer", RT_SChema);
