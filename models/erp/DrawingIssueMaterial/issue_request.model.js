const mongoose = require('mongoose');
const { Status } = require('../../../utils/enum');
const { Schema } = mongoose;

const IssueRequest = new Schema({
    issue_req_no: {
        type: String,
    },
    drawing_id: {
        type: Schema.Types.ObjectId,
        ref: "erp-planner-drawing",
        required: true
    },
    items:{
        type: [{
            transaction_id:{
                type: Schema.Types.ObjectId,
                ref: "store_transaction_item",
                required: true,
            },
            requested_length:{
                type: Number,
            },
            requested_width:{
                type: Number,
            },
            requested_qty:{
                type: Number,
            },
            remarks: {
                type: String,
            },
           
        }]
    },
    requested_by:{
        type: Schema.Types.ObjectId,
        ref:'user',
    },
    status:{
        type: Number,
        default: Status.Pending,
    },
    deleted: {
        type: Boolean,
        default: false,
    }
},{timestamps: true});

module.exports = mongoose.model('drawing-issue_request',IssueRequest);