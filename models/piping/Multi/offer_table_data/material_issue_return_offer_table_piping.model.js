const mongoose = require("mongoose");
const { Schema } = mongoose;

const OfferIssueReturnTableDataPiping = new Schema(
  {
    report_no: {
      type: Number,
      required: true,
    },

    project_id: {
      type: Schema.Types.ObjectId,
      ref: "bussiness-projects",
      required: true,
    },

    item_id: {
      type: Schema.Types.ObjectId,
      ref: "piping-items",
      required: true,
    },

    category_id: {
      type: Schema.Types.ObjectId,
      ref: "piping-item-category",
      required: true,
    },

    items: [
      {
        purchase_offer_id: {
          type: Schema.Types.ObjectId,
          ref: "purchase-offer",
        },

        purchase_offer_item_id: {
          type: Schema.Types.ObjectId,
          ref: "purchase-offer-item",
        },

        fim_id: {
          type: Schema.Types.ObjectId,
          ref: "final-inspection-material",
        },

        package_list_no: String,
        heat_no: String,
        stock_qty: Number,
        issued_qty: Number,

        make_manufacture: [String],
      },
    ],

    total_issued_qty: {
      type: Number,
      default: 0,
    },

    return_qty: {
      type: Number,
      default: 0,
    },

    scrap_qty: {
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

    scrap_imir_no: {
      type: String,
      default: "",
    },

    scrap_heat_no: {
      type: String,
      default: "",
    },

    remarks: {
      type: String,
      default: "",
    },

    is_generate: {
      type: Boolean,
      default: false,
    },

    is_issue: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "material-issue-return-offer-table-piping",
  OfferIssueReturnTableDataPiping
);