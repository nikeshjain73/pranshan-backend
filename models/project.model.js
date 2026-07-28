const mongoose = require('mongoose');
const { Schema } = mongoose;

const ProjectSchema = new Schema({
    firm_id: {
        type: Schema.Types.ObjectId,
        ref: 'firm',
    },
    year_id: {
        type: Schema.Types.ObjectId,
        ref: 'year',
    },
    voucher_no: {
        type: Number,
    },
    work_order_no: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    details: {
        type: String,
    },
// location: {
    //     // type: String,
    //     type: Schema.Types.ObjectId,
    //     ref: 'erp-project-location',
    //     required: true,
    // },
// label: {
    //     type: [{
    //         labelId: {
    //             type: Schema.Types.ObjectId,
    //             ref: 'project-type',
    //         }
    //     }],
    //     default: []
    // },
    startDate: {
        type: Date,
    },
    endDate: {
        type: Date,
    },
    po_date: {
        type: Date,
    },
    // projectManager: {
    //     type: Schema.Types.ObjectId,
    //     ref: 'Auth-Person',
    //     required: true,
    // },
    // department: {
    //     type: Schema.Types.ObjectId,
    //     // required: true,
    //     ref: 'department',
    // },
    // party: {
    //     type: Schema.Types.ObjectId,
    //     required: true,
    //     ref: 'store-party',
    // },
    // contractor: {
    //     type: [{
    //         conId: {
    //             type: Schema.Types.ObjectId,
    //             ref: 'Contractor',
    //         }
    //     }],
    //     default: []
    // },
    company_logo: {
        type: String,
        default: null,
    },
    status: {
        type: Boolean,
        default: true,
    },
    deleted: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true });

module.exports = mongoose.model('bussiness-projects', ProjectSchema);