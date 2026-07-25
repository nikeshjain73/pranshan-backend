const mongoose = require("mongoose");
const { Schema } = require("mongoose");

const OfferFdTableDataPiping = new Schema(
  {
    report_no: {
      type: Number,
      required: true,
      unique: true,
    },
    project_id: {
      type: Schema.Types.ObjectId,
      ref: "bussiness-projects",
    },
    ndt_master_id: {
      type: Schema.Types.ObjectId,
      ref: "piping_ndts",
      required: true,
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
          required_dimension: {
            type: String,
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
        },
      ],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model(
  "piping-fd-offer-table",
  OfferFdTableDataPiping,
);
