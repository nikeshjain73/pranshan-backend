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
        ref: 'drawing-issue-acceptance',
        required: true,
    },
    drawing_id: {
        type: Schema.Types.ObjectId,
        ref: "erp-planner-drawing",
        required: true
    },
    items: {
        type: [{
            transaction_id: {
                type: Schema.Types.ObjectId,
                ref: "store_transaction_item",
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
            // is_accepted: {
            //     type: Boolean,
            // },
            remarks: {
                type: String,
            },
            qc_remarks: {
                type: String,
            },
        }]
    },
    offered_by: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true,
    },
    qc_status: {
        type: Boolean,
    },
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

module.exports = mongoose.model('erp-fitup-inspection', fitUpSchema);