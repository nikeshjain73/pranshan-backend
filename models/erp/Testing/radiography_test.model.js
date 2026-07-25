const mongoose = require('mongoose');
const { Schema } = mongoose;

const rtTestOffer = new Schema({
    rt_test_offer_no: {
        type: String,
    },
    weld_report_no: {
        type: Schema.Types.ObjectId,
        ref: 'erp-weld-inspection-offer',
        required: true,
    },
    items: {
        type:[{
            weldor_no: {
                type: String,
            },
            thickness: {
                type: Number,
            },
            profile_size: {
                type: Number,
            }
        }],
    },
    offered_by: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true,
    },
    report_date: {
        type: Date,
    },
    status: {
        type: Number, //1-Pending 2-Approved 3-Rejected
        default: 1,
    },
    deleted: {
        type: Boolean,
        default: false,
    }
    
},{ timestamps: true });

module.exports = mongoose.model('erp-rt-test-offer', rtTestOffer);