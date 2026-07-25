const mongoose = require("mongoose");
const { Status } = require("../../../utils/enum");
const { Schema } = mongoose;

const StockIssueRequestPiping = new Schema(
  {
    stock_issue_req_no: {
      type: String,
    },
    project: {
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
          stock_issue_offer_id: {
            type: Schema.Types.ObjectId,
            ref: "stock-material-offer-issue-table-piping",
          },
          category_id: {
            type: Schema.Types.ObjectId,
            ref: "piping-item-detail-category",
            required: true,
          },
          item_id: {
            type: Schema.Types.ObjectId,
            ref: "piping-items",
          },
          data: [
            {
              purchase_offer_id: {
                type: Schema.Types.ObjectId,
                ref: "piping-purchase-offer",
                required: true,
              },
              purchase_offer_item_id: {
                type: Schema.Types.ObjectId,
                ref: "piping-purchase-offer",
                required: true,
              },
              fim_id: {
                type: Schema.Types.ObjectId,
                ref: "Piping-Fim-Packing-List",
                required: true,
              },
            },
          ],

          stock_qty: {
            type: Number,
          },
          requested_qty: {
            type: Number,
            required: true,
          },
          remarks: {
            type: String,
          },
        },
      ],
    },
    requested_by: {
      type: Schema.Types.ObjectId,
      ref: "user",
    },
    status: {
      type: Number,
      default: Status.Pending,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model(
  "stock-issue-request-piping",
  StockIssueRequestPiping,
);
