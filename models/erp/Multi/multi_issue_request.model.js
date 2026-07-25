const mongoose = require('mongoose');
const { Status } = require('../../../utils/enum');
const { Schema } = mongoose;

const IssueRequest = new Schema({
    issue_req_no: {
        type: String,
    },
    isFd: {
        type: Boolean, // for true direct send to fd and false follow all steps
    },
    items: {
        type: [{
            drawing_id: {
                type: Schema.Types.ObjectId,
                ref: "erp-planner-drawing",
                required: true
            },
            grid_item_id: {
                type: Schema.Types.ObjectId,
                ref: "erp-drawing-grid-items",
                required: true,
            },
            requested_length: {
                type: Number,
            },
            requested_width: {
                type: Number,
            },
            requested_qty: {
                type: Number,
            },
            multiply_iss_qty: {
                type: Number,
            },
            used_grid_qty: {
                type: Number,
                default: 0,
            },
            balance_grid_qty: {
                type: Number,
                default: 0,
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

module.exports = mongoose.model('multi-drawing-issue_request', IssueRequest);