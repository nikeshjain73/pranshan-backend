const mongoose = require('mongoose');
const { Schema } = mongoose;

const paintManufactureSchema = new Schema({
    name: {
        type: String,
        required: true,
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

module.exports = mongoose.model('paint-manufacture', paintManufactureSchema);