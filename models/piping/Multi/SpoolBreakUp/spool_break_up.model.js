const mongoose = require('mongoose');
const { Schema } = mongoose;


const SpoolBreakUpSummarySchema = new Schema(
  {
    voucher_no:{
        type:String,
        required:true
    },
    project_id: {
      type: Schema.Types.ObjectId,
      ref: "bussiness-project"
    },
    packing_id:{
         type: Schema.Types.ObjectId,
            ref: "piping-erp-packing-inspections",
            required: true,
    },
    items: {
      type: [
        {
          packing_item_id:{
              type: Schema.Types.ObjectId,
            ref: "piping-erp-packing-inspections",
            required: true,
          },
          drawing_id: {
            type: Schema.Types.ObjectId,
            ref: "piping-drawings",
            required: false,
          },
          spool_no_id: {
            type: Schema.Types.ObjectId,
            ref: "piping-drawing-spool-no-joint-items",
            required: false,
          },
          item_id:{
             type: Schema.Types.ObjectId,
            ref: "piping-items",
            required: true,
          },       
          qty: {
            type: Number,
            required: true
          },
          remarks: {
            type: String,
            
          },
        },
      ],
    },
     deleted:{
            type:Boolean,
            default:false
          }
  },
  { timestamps: true }
);


module.exports = mongoose.model('piping-spool-break-up-summary', SpoolBreakUpSummarySchema);