const mongoose = require('mongoose');
const { Status } = require('../../../utils/enum');
const { Schema } = mongoose;

const IssueReturnPiping = new Schema({
    issue_return_no: {
        type: String,
    },
    project:{
        type:Schema.Types.ObjectId,
        ref:'bussiness-projects',
        required:true
    },
   
    items: {
        type: [{
           
            issue_offer_id: {
                type: Schema.Types.ObjectId,
                ref: 'material-offer-issue-table-piping',
            },
            material_item_id: {
                type: Schema.Types.ObjectId,
                ref: "piping-drawing-material-items",
            },
            item_id: {
                type: Schema.Types.ObjectId,
                ref: "piping-items",
            },
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

        }]
    },
    requested_by: {
        type: Schema.Types.ObjectId,
        ref: 'user',
    },
    status: {
        type: Number,
        default: Status.Pending,
    },
    deleted: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true });

module.exports = mongoose.model('material-drawing-issue-return-piping', IssueReturnPiping);