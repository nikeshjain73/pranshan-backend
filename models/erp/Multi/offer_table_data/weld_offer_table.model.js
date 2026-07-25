const mongoose = require('mongoose');
const { Schema } = require('mongoose');

const OfferWeldTableData = new Schema({
    report_no: {
        type: Number,
        required: true,
    },
    fitup_id: {
        type: Schema.Types.ObjectId,
        ref: 'multi-erp-fitup-inspection',
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
            weldor_no: {
                type: Schema.Types.ObjectId,
                ref: 'qualified_welder_list',
                default: null,
            },
            weld_balance_qty: {
                type: Number,
                required: true,
            },
            weld_used_grid_qty: {
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
            qc_remarks: {
                type: String,
            },
            is_accepted: {
                type: Boolean,
                default: false,
            }
        }],
    }
}, { timestamps: true });

module.exports = mongoose.model('multi-offer-weldvisual-table', OfferWeldTableData);