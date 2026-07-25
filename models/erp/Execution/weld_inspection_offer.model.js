const mongoose = require('mongoose');
const { Status } = require('../../../utils/enum');
const { Schema } = mongoose;

const weldSchema = new Schema({
    weld_report_no: {
        type: String,
    },
    weld_report_qc_no: {
        type: String,
    },
    fitup_id: {
        type: Schema.Types.ObjectId,
        ref: 'erp-fitup-inspection',
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
            weldor_no: {
                type: Schema.Types.ObjectId,
                ref: 'qualified_welder_list',
            },
            // is_accepted: {
            //     type: Boolean,
            // },
            remarks: {
                type: String,
            },
            qc_remarks: {
                type: 'String',
            }
        }]
    },
    offered_by: {
        type: Schema.Types.ObjectId,
        ref: 'user',
    },
    status: {
        type: Number, // 1 pending 2 accepted 3 rejected
        default: Status.Pending,
    },
    qc_status: {
        type: Boolean
    },
    qc_name: {
        type: Schema.Types.ObjectId,
        ref: 'user',
    },
    qc_time: {
        type: Date,
    },
    deleted: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true });

module.exports = mongoose.model('erp-weld-inspection-offer', weldSchema);