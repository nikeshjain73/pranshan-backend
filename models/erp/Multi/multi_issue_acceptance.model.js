const mongoose = require('mongoose');
const { Status } = require('../../../utils/enum');
const { Schema } = mongoose;

const issueAcceptance = new Schema({
    issue_accept_no: {
        type: String,
    },
    issue_req_id: {
        type: Schema.Types.ObjectId,
        ref: 'multi-drawing-issue_request',
        required: true,
    },
    isFd: {
        type: Boolean,  // for true direct send to fd and false follow all steps
    },
    items: {
        type: [{
            grid_item_id: {
                type: Schema.Types.ObjectId,
                ref: "erp-drawing-grid-items",
                required: true,
            },
            drawing_id: {
                type: Schema.Types.ObjectId,
                ref: "erp-planner-drawing",
                required: true
            },
            issued_length: {
                type: Number,
                default: 0,
            },
            issued_width: {
                type: Number,
                default: 0,
            },
            issued_qty: {
                type: Number,
                default: 0,
            },
            multiply_iss_qty: {
                type: Number,
            },
            imir_no: {
                type: [String],
                default: '',
            },
            heat_no: {
                type: [String],
                default: '',
            },
            iss_used_grid_qty: {
                type: Number,
                default: 0,
            },
            iss_balance_grid_qty: {
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
            is_accepted: {
                type: Boolean,
                default: false,
            }
        }]
    },
    issued_by: {
        type: Schema.Types.ObjectId,
        ref: 'user',
    },
    status: {
        type: Number,
        default: Status.Pending,  // 1-Pending  4-Completed // 3 rejected
    },
    deleted: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true });

module.exports = mongoose.model('multi-drawing-issue-acceptance', issueAcceptance);