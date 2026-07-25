const mongoose = require("mongoose");
// const { Status } = require('../../../utils/enum');
const { Status } = require("../../../utils/enumpiping");
const { Schema } = mongoose;

const StockIssueAcceptancePiping = new Schema(
  {
    stock_issue_accept_no: {
      type: String,
    },
    stock_issue_req_id: {
      type: Schema.Types.ObjectId,
      ref: "stock-issue-request-piping",
      required: true,
    },
    project_id: {
      type: Schema.Types.ObjectId,
      ref: "bussiness-projects",
      required: true,
    },
    isReleaseForPainting: {
      type: Boolean, // for true direct send to Painting and false follow all steps
      default: false,
    },
    isReleaseNoteForSiteDispatch: {
      type: Boolean, // for true direct send to dispatch and false follow all steps
      default: false,
    },
    items: {
      type: [
        {
          item_id: {
            type: Schema.Types.ObjectId,
            ref: "piping-items",
            required: true,
          },
          issued_stock_qty: {
            type: Number,
            default: 0,
          },
          issued_requested_qty: {
            type: Number,
            default: 0,
          },

          imir_no: {
            type: [String],
            default: "",
          },
          heat_no: {
            type: [String],
            default: "",
          },
          iss_used_qty: {
            type: Number,
            default: 0,
          },
          iss_balance_qty: {
            type: Number,
            default: 0,
          },
          moved_next_step: {
            type: Number,
            default: 0,
          },
          remarks: {
            type: String,
          },
          is_accepted: {
            type: Boolean,
            default: false,
          },
          is_added_for_dispatch: {
            type: Boolean,
            default: false,
          },
         is_added_for_painting_dispatch: {
            type: Boolean,
            default: false,
          },
          is_generate_dispatch: {
            type: Boolean, // for true direct send to dispatch and false follow all steps
            default: false,
          },
        },
      ],
    },
    issued_by: {
      type: Schema.Types.ObjectId,
      ref: "user",
    },
    status: {
      type: Number,
      default: Status.Pending, // 1-Pending  4-Completed // 3 rejected
    },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model(
  "stock-issue-acceptance-piping",
  StockIssueAcceptancePiping,
);
