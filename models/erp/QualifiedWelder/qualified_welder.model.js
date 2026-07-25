const mongoose = require('mongoose');
const { Schema } = mongoose;

const qualifiedWelderSchema = new Schema({
    wpsNo: {
        type: Schema.Types.ObjectId,
        ref: 'store-wps-master',
    },
    welderNo: {
        type: String,
    },
    jointType: {
        type: [{
            jointId: {
                type: Schema.Types.ObjectId,
                ref: 'joint-type',
            }
        }],
        default: []
    },
    due_date: {
        type: Date,
    },
    position: {
        type: String,
        default: '',
    },
    thickness: {
        type: String,
        default: '',
    },
    name: {
        type: String,
        default: '',
    },
    is_epxpired: {
        type: Boolean,
        default: false
    },
    pdf: {
        type: String,
    },
    project: {
        type: Schema.Types.ObjectId,
        ref: 'bussiness-projects',
    },
    status: {
        type: Boolean,
        default: true
    },
    deleted: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true });

module.exports = mongoose.model('qualified_welder_list', qualifiedWelderSchema);