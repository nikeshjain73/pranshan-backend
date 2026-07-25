const mongoose = require('mongoose');
const { Status } = require('../../../utils/enum');
const { Schema } = mongoose;

const fitUpSchema = new Schema({
    report_no: {
        type: String,
    },
    report_no_two: {
        type: String,
    },
    issue_id: {
        type: Schema.Types.ObjectId,
        ref: 'multi-drawing-issue-acceptance',
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
            fitOff_used_grid_qty: {
                type: Number,
                required: true,
            },
            fitOff_balance_qty: {
                type: Number,
                required: true,
            },
            joint_type: [
                {
                    type: Schema.Types.ObjectId,
                    ref: 'joint-type',
                }
            ],
            wps_no: {
                type: Schema.Types.ObjectId,
                ref: 'store-wps-master',
            },
            moved_next_step: {
                type: Number,
                default: 0,
            },
            remarks: {
                type: String,
            },
            qc_remarks: {
                type: String,
            },
            is_accepted: {
                type: Boolean,
                default: false,
            }
        }]
    },
    offered_by: {
        type: Schema.Types.ObjectId,
        ref: 'user',
    },
    // qc_status: {
    //     type: Boolean,
    // },
    qc_time: {
        type: Date,
    },
    qc_name: {
        type: Schema.Types.ObjectId,
        ref: 'user',
    },
    status: {
        type: Number, //1-Pending 2-Approved 3-Rejected 
        default: Status.Pending,
    },
    deleted: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true });

fitUpSchema.index({
    deleted: 1,
    report_no_two: 1,
    createdAt: -1
});

fitUpSchema.index({
    report_no_two: "text"
});

module.exports = mongoose.model('multi-erp-fitup-inspection', fitUpSchema);