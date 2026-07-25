const mongoose = require("mongoose");
// const { Status } = require('../../../utils/enum');
const { Status } = require("../../../utils/enumpiping");
const { Schema } = mongoose;

const IssueReturnAcceptancePiping = new Schema(
  {
    issue_return_accept_no: {
      type: String,
    },
    issue_return_id: {
      type: Schema.Types.ObjectId,
      ref: "material-drawing-issue-return-piping",
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
          item_id: {
            type: Schema.Types.ObjectId,
            ref: "piping-items",
            required: true,
          },
          total_issued_qty: {
            type: Number,
            default: 0,
          },
          return_qty: {
            type: Number,
            default: 0,
          },

          return_imir_no: {
            type: String,
            default: "",
          },
          return_heat_no: {
            type: String,
            default: "",
          },
          scrap_qty: {
            type: Number,
            default: 0,
          },
           scrap_imir_no: {
            type: String,
            default: "",
          },
          scrap_heat_no: {
            type: String,
            default: "",
          },
          return_received_qty: {
            type: Number,
            default: null,
          },
          scrap_received_qty: {
            type: Number,
            default: null,
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
  "issue-return-acceptance-piping",
  IssueReturnAcceptancePiping,
);
