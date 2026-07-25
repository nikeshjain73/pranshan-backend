const mongoose = require('mongoose');
const { Status } = require('../../../utils/enum');
const { Schema } = mongoose;

const IssueRequestPiping = new Schema({
    issue_req_no: {
        type: String,
    },
    project:{
        type:Schema.Types.ObjectId,
        ref:'bussiness-projects',
        required:true
    },
    isFitUp: {
        type: Boolean, // for true direct send to fitup and false follow all steps
        default: false
    },
    isPainting: {
        type: Boolean, // for true direct send to Painting and false follow all steps
         default: false
    },
    isDispatch: {
        type: Boolean, // for true direct send to dispatch and false follow all steps
         default: false
    },
    items: {
        type: [{
            drawing_id: {
                type: Schema.Types.ObjectId,
                ref: "piping-drawing",
                required: true
            }, 
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
            required_qty: {
                type: Number,
                default: 0
            },           
            extra_qty: {
                type: Number,
                default: 0
            },
            total_requested_qty: {
                type: Number,
                default: 0
            },           
            remarks: {
                type: String,
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

module.exports = mongoose.model('material-drawing-issue-request-piping', IssueRequestPiping);