const mongoose = require('mongoose');
const { Schema } = mongoose;

const testOffer = new Schema({
    ndt_offer_no: {
        type: String,
    },
    ndt_master_id: {
        type: Schema.Types.ObjectId,
        ref: 'erp-ndt-master',
        required: true,
    },
    ndt_type_id: {
        type: Schema.Types.ObjectId,
        ref: 'ndt',
       // required: true,
    },
    drawing_id: {
        type: Schema.Types.ObjectId,
        ref: "erp-planner-drawing",
        required: true
    },
    items: {
        type: [{
            weldor_no: {
                type: Schema.Types.ObjectId,
                ref: 'qualified_welder_list',
                required: true,
            },
            thickness: {
                type: String,
            },
            profile_size: {
                type: String,
            },
            item_status: {
                type: Number,  //1-Pending 2-Approved 3-Rejected
                default: 1,
            },
            transaction_id: {
                type: Schema.Types.ObjectId,
                ref: 'store_transaction_item',
                required: true,
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
        type: Number, //1-Pending 2-Approved 3-Rejected 4-Send to QC for approval 5-Completed
        default: 1,
    },
    deleted: {
        type: Boolean,
        default: false,
    }

}, { timestamps: true });

module.exports = mongoose.model('erp-ndt-offer', testOffer);