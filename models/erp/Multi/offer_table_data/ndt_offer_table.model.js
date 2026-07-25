const mongoose = require('mongoose');
const { Schema } = require('mongoose');

const OfferNDTTableData = new Schema({
    report_no: {
        type: Number,
        required: true,
    },
    weld_visual_id: {
      type: Schema.Types.ObjectId,
      ref: "multi-erp-weldvisual-inspection",
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
            ndt_requirements: {
                type:[{
                    ndt_type: {
                        type: Schema.Types.ObjectId,
                        ref: 'ndt',
                    }
                }]
            },
            ndt_balance_qty: {
                type: Number,
                required: true,
            },
            ndt_used_grid_qty: {
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
            },
        }],
    }
}, { timestamps: true });

module.exports = mongoose.model('multi-offer-ndt-table', OfferNDTTableData);