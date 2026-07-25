const mongoose = require("mongoose");
const { Status } = require("../../../utils/enum");
const { Schema } = mongoose;

const ndtDetailSchema = new Schema(
  {
    report_no: {
      type: String,
    },
    report_no_two: {
      type: String,
    },
    weld_visual_id: {
      type: Schema.Types.ObjectId,
      ref: "multi-erp-weldvisual-inspection",
    },
    items: {
      type: [
        {
          grid_item_id: {
            type: Schema.Types.ObjectId,
            ref: "erp-drawing-grid-items",
            required: true,
          },
          drawing_id: {
            type: Schema.Types.ObjectId,
            ref: "erp-planner-drawing",
            required: true,
          },
          ndt_balance_qty: {
            type: Number,
            required: true,
          },
          ndt_used_grid_qty: {
            type: Number,
            required: true,
          },
          moved_next_step: {
            type: Number,
            default: 0,
          }
        },
      ],
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
      type: Number, //1-Pending 3-Completed
      default: Status.Pending,
    },
    ut_status: {
      type: Number, //1-Pending 2-Offered 3-Completed
      default: Status.Pending,
    },
    rt_status: {
      type: Number, //1-Pending 2-Offered 3-Completed
      default: Status.Pending,
    },
    mpt_status: {
      type: Number, //1-Pending 2-Offered 3-Completed
      default: Status.Pending,
    },
    lpt_status: {
      type: Number, //1-Pending 2-Offered 3-Completed
      default: Status.Pending,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("multi-erp-ndt-master", ndtDetailSchema);
