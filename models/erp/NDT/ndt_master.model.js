const mongoose = require('mongoose');
const { Schema } = mongoose;

const ndtMasterSchema = new Schema({
    ndt_voucher_no: {
        type: String,
    },
    weld_inspection_id: {
        type: Schema.Types.ObjectId,
        ref: 'erp-weld-inspection-offer',
        required: true,
    }, 
    drawing_id: {
        type: Schema.Types.ObjectId,
        ref: "erp-planner-drawing",
        required: true
    },
    items: {
        type:[{
            weldor_no: {
                type: Schema.Types.ObjectId,
                ref: 'qualified_welder_list',
             },
            transaction_id:{
                type: Schema.Types.ObjectId,
                ref: "store_transaction_item",
            },
            ndt_requirements: {
                type:[{
                    ndt_type: {
                        type: Schema.Types.ObjectId,
                        ref: 'ndt',
                    }
                }]
            },
            item_status: {
                type: Number,  //1-Pending 2-Approved 3-Rejected
                default: 1,
            },
        }]
    },
    status: {
        type: Number,  //1-Pending 2-Approved 3-Rejected
        default: 1,
    },
    deleted: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true });

module.exports = mongoose.model('erp-ndt-master', ndtMasterSchema);