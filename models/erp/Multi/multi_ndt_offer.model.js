const mongoose = require('mongoose');
const { Schema } = mongoose;

const multiNDTOffer = new Schema({
    ndt_offer_no: {
        type: String,
    },
    ndt_master_id: {
        type: Schema.Types.ObjectId,
        ref: 'multi-erp-ndt-master',
        // required: true,
    },
    ndt_master_ids: [{
        type: Schema.Types.ObjectId,
        ref: 'multi-erp-ndt-master',
        required: true,
    }],
    ndt_type_id: {
        type: Schema.Types.ObjectId,
        ref: 'ndt',
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
                required: true,
            },
            ndt_master_id: {
                type: Schema.Types.ObjectId,
                ref: 'multi-erp-ndt-master'
            },
            offer_balance_qty: {
                type: Number,
                // required: true,
            },
            offer_used_grid_qty: {
                type: Number,
                // required: true,
            },
            ut_use_qty: {
                type: Number,
            },
            ut_balance_qty: {
                type: Number,
            },
            ut_moved_next_qty: {
                type: Number,
                default: 0,
            },
            rt_use_qty: {
                type: Number,
            },
            rt_balance_qty: {
                type: Number,
            },
            rt_moved_next_qty: {
                type: Number,
                default: 0,
            },
            mpt_use_qty: {
                type: Number,
            },
            mpt_balance_qty: {
                type: Number,
            },
            mpt_moved_next_qty: {
                type: Number,
                default: 0,
            },
            lpt_use_qty: {
                type: Number,
            },
            lpt_balance_qty: {
                type: Number,
            },
            lpt_moved_next_qty: {
                type: Number,
                default: 0,
            },
            grid_use_qty: {
                type: Number,
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
            weldor_no: {
                type: Schema.Types.ObjectId,
                ref: 'qualified_welder_list',
            },
            thickness: {
                type: String,
            },
            is_cover: {
                type: Boolean,
                default: 0,
            },
            is_accepted: {
                type: Boolean,
            },
            remarks: {
                type: String,
            }
        }],
    },
    offered_by: {
        type: Schema.Types.ObjectId,
        ref: 'user',
    },
    report_date: {
        type: Date,
    },
    status: {
        type: Number, //1-Pending 2-Offered 3-Completed 4-Rejected 5-Partially 6-Merged
        default: 1,
    },
    is_reoffer: {
        type: Boolean,
        default: false,
    },
    deleted: {
        type: Boolean,
        default: false,
    }

}, { timestamps: true });

module.exports = mongoose.model('multi-erp-ndt-offer', multiNDTOffer);