const mongoose = require('mongoose');
const { Status } = require('../../../utils/enum');
const { Schema } = mongoose;

const issueAcceptance = new Schema({
    issue_accept_no:{
        type: String,
    },
    issue_req_id: {
        type: Schema.Types.ObjectId,
        ref: 'drawing-issue_request',
        required: true,
    },
    drawing_id: {
        type: Schema.Types.ObjectId,
        ref: "erp-planner-drawing",
        required: true
    },
    items: {
        type: [{
            transaction_id:{
                type: Schema.Types.ObjectId,
                ref: "store_transaction_item",
            },
            issued_length: {
                type: Number,
            },
            issued_width:{
                type: Number,
            },
            issued_qty:{
                type: Number,
            },
            imir_no:{
                type: String,
            },
            heat_no: {
                type: String,
            },
            remarks: {
                type: String,
            },
        }]
    },
    issued_by: {
        type: Schema.Types.ObjectId,
        ref: 'user',
    },
    status: {
        type: Number,
        default: Status.Pending,  // 1-Pending  4-Completed
    },
    deleted: {
         type: Boolean,
         default: false,
    }
},{timestamps: true});

module.exports = mongoose.model('drawing-issue-acceptance', issueAcceptance);