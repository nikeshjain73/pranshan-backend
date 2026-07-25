const mongoose = require('mongoose');
const { Schema } = require('mongoose');


const OfferIssueTableData = new Schema({
    report_no: {
        type: Number,
        required: true,
    },
    contractor_id: {
        type: Schema.Types.ObjectId,
        ref: 'Contractor',
    },
    items: {
        type: [{
            grid_id: {
                type: Schema.Types.ObjectId,
                ref: "erp-drawing-grid",
                required: true,
            },
            drawing_id: {
                type: Schema.Types.ObjectId,
                ref: "erp-planner-drawing",
                required: true
            },
            item_name: {
                type: Schema.Types.ObjectId,
                ref: "store-items",
            },
            issue_id: {
                type: Schema.Types.ObjectId,
                ref: 'multi-drawing-issue_request',
            },
            used_grid_qty: {
                type: Number,
            },
            item_no: {
                type: String,
            },
            balance_grid_qty: {
                type: Number,
            },
            item_qty: {
                type: Number,
            },
            item_weight: {
                type: Number,
            },
            item_width: {
                type: Number,
            },
            item_length: {
                type: Number,
            },
            multiply_iss_qty: {
                type: Number,
            },
            assembly_surface_area: {
                type: Number,
            },
            assembly_weight: {
                type: Number,
            },
            is_issue: {
                type: Boolean,
                default: false,
            },
            remarks: {
                type: String,
            },
        }]
    }
}, { timestamps: true });

module.exports = mongoose.model('multi-offer-issue-table', OfferIssueTableData);