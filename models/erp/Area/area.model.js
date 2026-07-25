const mongoose = require('mongoose');

const areaSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId, // assuming project_id references another collection
        ref: "bussiness-projects",
        required: true,
        index: true
    },
    area: {
        type: String,
        required: true
    },
    status: {
        type: Number,
        enum: [0, 1],
        default: 1

    },
     isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });
areaSchema.index({ project_id: 1, area: 1 }, { unique: true });

module.exports = mongoose.model('Area', areaSchema);
