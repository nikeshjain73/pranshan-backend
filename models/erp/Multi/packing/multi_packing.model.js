const mongoose = require('mongoose');
const { Schema } = mongoose;

const MultiPackingSchema = new Schema({
    voucher_no: {
        type: String,
    },
    consignment_no: {
        type: String,
        required: true
    },
    destination: {
        type: String,
        required: true,
    },
    vehicle_no: {
        type: String,
        required: true,
    },
    driver_name: {
        type: String,
        required: true,
    },
    gst_no: {
        type: String,
        default: '',
    },
    e_way_bill_no: {
        type: String,
        default: '',
    },
    packing_date: {
        type: Date,
        default: Date.now(),
    },
    remarks: {
        type: String,
        default: '',
    },
    packed_by: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true,
    },
    is_invoice_generated: {
        type: Boolean,
        default: false,
    },
    physical_weight: {
        type: Number,
        default: 0,
    },
    items: {
        type: [{
            drawing_id: {
                type: Schema.Types.ObjectId,
                ref: "erp-planner-drawing",
                required: false,
            },
            project_id: {
  type: Schema.Types.ObjectId,
  ref: "bussiness-projects", 
},

            item_name:{
                    type: String,
                    required:false
                },
            drawing_no:{
                 type: String,
                required:false
                },
            grid_no:{
                  type: String,
                required: false
                },
            irn_no:{
                type: String,
                required: false
                },
            grid_id: {
                type: Schema.Types.ObjectId,
                ref: 'erp-drawing-grid',
                required: false,
            },
            rn_id: {
                type: Schema.Types.ObjectId,
                ref: 'multi-erp-ins-release-note',
            },
            rn_balance_grid_qty: {
                type: Number,
                default: 0
            },
            rn_used_grid_qty: {
                type: Number,
                default: 0
            },
            moved_next_step: {
                type: Number,
                default: 0
            },
            unit_assembly_weight: {
                type: Number,
                default: 0
            },
            total_assembly_weight: {
                type: Number,
                default: 0
            },
            remarks: {
                type: String,
                default: '',
            },
        }]
    },
    deleted: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true });

module.exports = mongoose.model('multi-erp-packing-inspection', MultiPackingSchema);