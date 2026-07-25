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
    project_id: {
        type: Schema.Types.ObjectId,
        ref: "bussiness-projects", 
    },
    dispatch_date:{
        type: Date,
        default: null,
    },
    // physical_weight: {
    //     type: Number,
    //     default: 0,
    // },
    items: {
        type: [{
            drawing_id: {
                type: Schema.Types.ObjectId,
                ref: "piping-drawings",
                required: false,
            },
            item_id:{
                type: Schema.Types.ObjectId,
                ref: "piping-items", 
                required:false
            },
            issue_acceptance_id:{
                type: Schema.Types.ObjectId,
                ref: "piping-issue-acceptance", 
                required:false 
            },
            fd_inspection_id: {
                type: Schema.Types.ObjectId,
                ref: "piping-fd-inspection",
                required: false,
            },
            pressure_test_id: {
                type: Schema.Types.ObjectId,
                ref: "piping-pressure-test-inspection",
                required: false,
            },
            piping_material_Specfication_id:{
                type: Schema.Types.ObjectId,
                ref: "piping-material-specifications", 
                required:false
            },
            irn_id:{
                type: Schema.Types.ObjectId,
                ref: "piping-erp-ins-release-notes", 
                required:false
            },
            drawing_no:{
                 type: String,
                required:false
                },
            irn_no:{
                type: String,
                required: false
                },
            spool_id: {
                type: Schema.Types.ObjectId,
                ref: 'piping-drawing-spool-no-joint-items',
                required: false,
            },
            imir_no:[{
                     type:String,
                    required: false
            }],      
            rn_balance_grid_qty: {
                type: Number,
                default: 0
            },
            rn_used_grid_qty: {
                type: Number,
                default: 0
            },
            packaged_qty: {
                type: Number,
                default: 0,
            },
            moved_next_step: {
                type: Number,
                default: 0
            },
             isManual: {
            type: Boolean,
            default: false,
          },
          is_added_spool_break_up:{
            type: Boolean,
            default: false,
          },
            remarks: {
                type: String,
                default: '',
            },
        }]
    },
      is_generated_spool_break_up:{
            type: Boolean,
            default: false,
          },
    sum_of_meter:{
        type: Number,
        default: 0,
    },
    sum_of_nos:{
        type: Number,
        default: 0,
    },
    deleted: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true });

module.exports = mongoose.model('piping-erp-packing-inspection', MultiPackingSchema);