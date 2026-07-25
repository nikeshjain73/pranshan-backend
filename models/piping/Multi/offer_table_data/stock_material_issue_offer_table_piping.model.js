const mongoose = require("mongoose");
const { Schema } = require("mongoose");

const StockIssueOfferTableDataPiping = new Schema(
  {
    report_no: {
      type: Number,
      required: true,
    },
    project_id:{
      type: Schema.Types.ObjectId,
      ref: "bussiness-projects",
      required: true,
    },
    
    category_id: {
      type: Schema.Types.ObjectId,
      ref: "piping-item-detail-category",
    },
    item_id: { type: Schema.Types.ObjectId, ref: "piping-items" },
        items: [
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
    }
  ],
        stock_qty: { type: Number},
        requested_qty: { type: Number },
        is_issue: { type: Boolean, default: false },
        remarks: { type: String },
     
    is_generate: { type: Boolean, default: false },
    
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "stock-material-offer-issue-table-piping",
  StockIssueOfferTableDataPiping
);
