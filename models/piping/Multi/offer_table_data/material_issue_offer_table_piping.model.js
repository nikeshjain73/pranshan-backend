const mongoose = require("mongoose");
const { Schema } = require("mongoose");

const OfferIssueTableDataPiping = new Schema(
  {
    report_no: {
      type: Number,
      required: true,
    },
    contractor_id: {
      type: Schema.Types.ObjectId,
      ref: "Contractor",
    },
    drawing_id: {
      type: Schema.Types.ObjectId,
      ref: "piping-drawing",
      required: true,
    },
    project_id:{
       type: Schema.Types.ObjectId,
      ref: "bussiness-projects",
      required: true,
    },
    issue_id: {
      type: Schema.Types.ObjectId,
      ref: "multi-drawing-issue-request-piping",
    },
    manual_items: [
      {
        material_item_id: { type: Schema.Types.ObjectId, ref: "piping-drawing-material-items" },
        item_id: { type: Schema.Types.ObjectId, ref: "piping-items" },
        required_qty: { type: Number, default: 0 },
        extra_qty: { type: Number, default: 0 },
        total_requested_qty: { type: Number, default: 0 },
        is_issue: { type: Boolean, default: false },
        remarks: { type: String, default: "" },
      },
    ],
    is_generate: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "material-offer-issue-table-piping",
  OfferIssueTableDataPiping
);
