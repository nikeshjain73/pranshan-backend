const mongoose = require('mongoose');
const { Schema } = require('mongoose');

const OfferFitupTableData = new Schema({
    report_no: {
        type: Number,
        required: true,
    },
    fitup_id: {
        type: Schema.Types.ObjectId,
        ref: 'multi-erp-fitup-inspection',
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
    }

}, { timestamps: true });

module.exports = mongoose.model('multi-offer-fitup-table', OfferFitupTableData);