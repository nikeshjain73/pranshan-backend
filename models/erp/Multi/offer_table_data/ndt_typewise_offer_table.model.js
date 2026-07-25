const mongoose = require('mongoose');
const { Schema } = require('mongoose');

const OfferNDTTypeWiseTableData = new Schema({
    ndt_master_id: {
        type: Schema.Types.ObjectId,
        ref: 'multi-erp-ndt-master',
        required: true,
    },
    ndt_type_id: {
        type: Schema.Types.ObjectId,
        ref: 'ndt',
    },
    ndt_offer_id: { //after generate offer it will assign new id
        type: Schema.Types.ObjectId,
        ref: 'multi-erp-ndt-offer',
    },
    ndt_main_offer_id:{ /// this will ref old offer id 
        type: Schema.Types.ObjectId,
        ref: 'multi-erp-ndt-offer',
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
            rt_use_qty: {
                type: Number,
            },
            rt_balance_qty: {
                type: Number,
            },
            mpt_use_qty: {
                type: Number,
            },
            mpt_balance_qty: {
                type: Number,
            },
            lpt_use_qty: {
                type: Number,
            },
            lpt_balance_qty: {
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
            remarks: {
                type: String,
            },
            offer_status: {
                type: Number, //1-Pending 2-Offered 3-Completed 4-Rejected 5-Partially 6-Merged
            },
            deleted: {
                type: Boolean,
                default: false,
            }      
        }],
    },
    deleted: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true });

module.exports = mongoose.model('multi-ndt-typewise-offer', OfferNDTTypeWiseTableData);