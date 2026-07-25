const mongoose = require('mongoose');
const { Status } = require('../../../../utils/enum');
const { Schema } = mongoose;

const multiFinalDimensionOfferSchema = new Schema({
    fd_offer_no: {
        type: Number,
        required: true
    },
    fd_master_id: {
        type: Schema.Types.ObjectId,
        ref: 'multi-erp-fd-master',
    },
    ndt_master_id: [{
        type: Schema.Types.ObjectId,
        ref: 'multi-erp-ndt-master',
    }],
    issue_acc_id: [{
        type: Schema.Types.ObjectId,
        ref: 'multi-drawing-issue-acceptance',
    }],
    items: {
        type: [{
            drawing_id: {
                type: Schema.Types.ObjectId,
                ref: "erp-planner-drawing",
                required: true
            },
            grid_id: {
                type: Schema.Types.ObjectId,
                ref: 'erp-drawing-grid',
                required: true,
            },
            fd_balanced_grid_qty: {
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
            required_dimension: {
                type: String,
            },
            actual_dimension: {
                type: String,
            },
            remarks: {
                type: String,
            },
            qc_remarks: {
                type: String,
            },
            is_accepted: {
                type: Boolean,
            }
        }]
    },
    // offered_by: {
    //     type: Schema.Types.ObjectId,
    //     ref: 'user',
    // },
    // report_date: {
    //     type: Date,
    // },
    // status: {
    //     type: Number, //1-Pending 2-Offered 3-Completed 4-Rejected 5-Partially
    //     default: 1,
    // },
    // deleted: {
    //     type: Boolean,
    //     default: false,
    // }
}, { timestamps: true });

module.exports = mongoose.model('multi-erp-fd-offer', multiFinalDimensionOfferSchema);