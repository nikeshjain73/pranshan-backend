const mongoose = require('mongoose');
const { Schema } = mongoose;

const ndtSchema = new Schema({
    name: {
        type: String,
        // unique: true,
        require: true
    },
    joint_type: [
        {
            type: Schema.Types.ObjectId,
            ref: 'joint-type',
        }
    ],
    examination: {
        type: Number,
        default: 0,
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
}, { timestamps: true });

module.exports = mongoose.model('ndt', ndtSchema);