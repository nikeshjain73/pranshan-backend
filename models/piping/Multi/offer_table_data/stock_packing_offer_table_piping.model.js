const mongoose = require('mongoose');
const { Schema } = mongoose;


const StockPackingOfferSchema = new Schema(
  {
    packing_no: {
      type: Number,
    },
    project_id: {
      type: Schema.Types.ObjectId,
      ref: "bussiness-project"
    },
     item_id: {
            type: Schema.Types.ObjectId,
            ref: "piping-items",
            required: false,
          },
           source_type: {
      type: String,
      enum: ["RELEASE_NOTE", "STOCK_ISSUE_ACCEPTANCE"],
      // required: true
    },
    items: {
      type: [
        {

          irn_id:{
                type: Schema.Types.ObjectId,
                ref: "piping-stock-ins-release-notes", 
                required:false
            },
           irn_item_id:{
                type: Schema.Types.ObjectId,
                ref: "piping-stock-ins-release-notes", 
                required:false
            },
          stock_issue_acceptance_id:{
                type: Schema.Types.ObjectId,
                ref: "stock-issue-acceptance-pipings", 
                // required:true 
            },
         
          stock_issue_acceptance_item_id:{
                type: Schema.Types.ObjectId,
                ref: "stock-issue-acceptance-pipings", 
                // required:true 
            },
         irn_no: {
            type: String,
            required: false,
          },
          imir_no: [{
            type: String,
            required: false,
          }],
           packaged_qty: {
            type: Number,
            default: 0,
          },
        }
        ],
    },
          rn_balance_grid_qty: {
            type: Number,
            default: 0,
          },
          rn_used_grid_qty: {
            type: Number,
            default: 0,
          },
           merged_imir_no: [{
            type: String,
            required: false,
          }],
          total_packaged_qty: {
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
       
      
  },
  { timestamps: true }
);


module.exports = mongoose.model('piping-stock-packing-offer', StockPackingOfferSchema);