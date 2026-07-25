const mongoose = require("mongoose");
const { Schema } = mongoose;

const lptNdtOffer = new Schema(
  {
    lpt_offer_no: {
      type: String,
    },
    ndt_master_id: {
      type: Schema.Types.ObjectId,
      ref: "piping_ndts",
      required: true,
    },
    project_id: {
      type: Schema.Types.ObjectId,
      ref: "bussiness-projects",
      required: true,
    },
    items: {
      type: [
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
           lpt_lot_book_id:{
             type: Schema.Types.ObjectId,
            ref: "piping-lpt-lots",
            required: true,
          },
          lpt_lot_book_item_id:{
             type: Schema.Types.ObjectId,
            ref: "piping-lpt-lots",
            required: true,
          },
          drawing_id: {
            type: Schema.Types.ObjectId,
            ref: "piping-drawings",
            required: true,
          },
          spool_no_id: {
            type: Schema.Types.ObjectId,
            ref: "piping-drawing-spool-no-joint-items",
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
          piping_class: {
            type: Schema.Types.ObjectId,
            ref: "piping-class-request",
            required: true,
          },
          piping_material_specification: {
            type: Schema.Types.ObjectId,
            ref: "piping-material-specification",
            required: true,
          },
             material_item_id_1: {
                type: Schema.Types.ObjectId,
                ref: "piping-drawing-material-items",
                required: true,
            },
            material_item_id_2: {
                type: Schema.Types.ObjectId,
                ref: "piping-drawing-material-items",
                required: true,
            },
           remarks: {
            type: String,
          },
        },
      ],
    },
    offered_by: {
      type: Schema.Types.ObjectId,
      ref: "user",
    },
    report_date: {
      type: Date,
    },
    status: {
      type: Number, //1-Pending 2-Approved 3-Rejected 4-Send to QC for approval 5-Completed
      default: 1,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("piping-lpt-ndt-offer", lptNdtOffer);
