const mongoose = require('mongoose');
const { Schema } = require('mongoose');

const OfferPressureTestTableDataPiping = new Schema({
    report_no: {
        type: Number,
        required: true,
    },
    project_id:{
       type: Schema.Types.ObjectId,
        ref: 'bussiness-projects',
    },
   
    items: {
      type: [
        {
          drawing_id: {
            type: Schema.Types.ObjectId,
            ref: "piping-drawing",
            required: true,
          },
          spool_no_id: {
            type: Schema.Types.ObjectId,
            ref: "piping-drawing-spool-no-joint-items",
            required: true,
          },
          fd_id:{
             type: Schema.Types.ObjectId,
            ref: "piping-fd-inspection",
          },
          fd_item_id:{
             type: Schema.Types.ObjectId,
            ref: "piping-fd-inspection",
          },
          remarks: {
            type: String,
          },
        },
      ],
    },

}, { timestamps: true });

module.exports = mongoose.model('piping-pressure-test-offer-table', OfferPressureTestTableDataPiping);