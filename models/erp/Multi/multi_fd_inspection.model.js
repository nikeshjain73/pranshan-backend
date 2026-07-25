const mongoose = require('mongoose');
const { Status } = require('../../../utils/enum');
const { Schema } = mongoose;

const multiFinalDimensionSchema = new Schema({
    report_no: {
        type: String,
    },
    report_no_two: {
        type: String,
    },
    items: {
        type: [{
            drawing_id: {
                type: Schema.Types.ObjectId,
                ref: "erp-planner-drawing",
                required: true
            },
            ndt_master_id: {
                type: Schema.Types.ObjectId,
                ref: '',
            },
            required_dimension: {
                type: String,
            },
            actual_dimension: {
                type: String,
            },
            fd_balance_qty: {
                type: Number,
                required: true,
            },
            fd_used_grid_qty: {
                type: Number,
                required: true,
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
        }],
    },
    offered_by: {
        type: Schema.Types.ObjectId,
        ref: 'user',
    },
    qc_name: {
        type: Schema.Types.ObjectId,
        ref: 'user',
    },
    qc_time: {
        type: Date,
    },
    status: {
        type: Number,
        default: Status.Pending, // 1-Pending 2-Approved 3-Rejected 4- Send to Qc
    },
    deleted: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true });

module.exports = mongoose.model('multi-erp-fd-inspection-offer', multiFinalDimensionSchema);