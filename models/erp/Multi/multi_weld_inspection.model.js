const mongoose = require('mongoose');
const { Status } = require('../../../utils/enum');
const { Schema } = mongoose;

const weldVisualSchema = new Schema({
    report_no: {
        type: String,
    },
    report_no_two: {
        type: String,
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
            }
        }],
    },
    offered_by: {
        type: Schema.Types.ObjectId,
        ref: 'user',
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
    },
}, { timestamps: true });


module.exports = mongoose.model('multi-erp-weldvisual-inspection', weldVisualSchema);