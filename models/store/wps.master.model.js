const mongoose = require('mongoose');
const { Schema } = mongoose;

const wpsMasterSchema = new Schema({
    jointType: {
        type: [{
            jointId: {
                type: Schema.Types.ObjectId,
                ref: 'joint-type',
            }
        }],
        default: []
    },
    wpsNo: {
        type: String,
    },
    weldingProcess: {
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
        type: Boolean,
        default: true,
    },
    deleted: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true })

module.exports = mongoose.model('store-wps-master', wpsMasterSchema);