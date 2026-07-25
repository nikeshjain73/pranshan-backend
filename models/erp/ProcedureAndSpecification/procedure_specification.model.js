const mongoose = require('mongoose');
const { Schema } = mongoose;

const ProcedureAndSpecificationSchema = new Schema({
    voucher_no: {
        type: String,
    },
    client_doc_no: {
        type: String,
    },
    vendor_doc_no: {
        type: String,
    },
    ducument_no: {
        type: String,
    },
    issue_no: {
        type: String,
    },
    pdf: {
        type: String,
    },
    project: {
        type: Schema.Types.ObjectId,
        ref: 'bussiness-projects',
    },
    status: {
        type: Number, // 1 submitted, 2 approved, 3 commented, 4 superseded, 5 reviewed, 6 rejected
    },
    deleted: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true });

module.exports = mongoose.model('procedure_and_specification', ProcedureAndSpecificationSchema);