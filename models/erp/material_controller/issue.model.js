const mongoose = require("mongoose");
const { Schema } = mongoose;

const IssueSchema = new Schema(
  {
    client: {
      type: Schema.Types.ObjectId,
      ref: "store-party",
      required: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: "bussiness-projects",
      required: true,
    },
    request_id: {
      type: Schema.Types.ObjectId,
      ref: "erp-request",
      required: true,
    },
    miv_no: {
      type: String,
    },
    itemName: {
      type: Schema.Types.ObjectId,
      ref: "store-items",
      required: true,
    },
    contractorName: {
      type: String,
    },
    issueDate: {
      type: Date,
    },
    drawingNo: {
      type: Schema.Types.ObjectId,
      ref: "erp-planner-drawing",
      required: true,
    },
    unit: {
      type: String,
    },
    profile: {
      type: String,
    },
    requestedQty: {
      type: Number,
      required: true,
    },
    issuedQty: {
      type: Number,
      required: true,
    },
    issued_length: {
      type: Number,
    },
    issued_width: {
      type: Number,
    },
    heat_no: {
      type: String,
    },
    remarks: {
      type: String,
    },
    status: {
      type: Number,
    },
    issuedBy: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("erp-issue", IssueSchema);
