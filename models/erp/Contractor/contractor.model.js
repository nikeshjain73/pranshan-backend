const mongoose = require("mongoose");

const contractorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    mobile: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    site_incharge: [
        {
            name: {
                type: String,
                require: true,
            },
            mobile: {
                type: String,
                require: true,
            },
            email: {
                type: String,
                require: true,
            },
        },
    ],
    site_supervisor: [
        {
            name: {
                type: String,
                require: true,
            },
            mobile: {
                type: String,
                require: true,
            },
            email: {
                type: String,
                require: true,
            },
        },
    ],
    status: {
        type: Boolean,
        default: true,
    },
    deleted: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true });

module.exports = mongoose.model("Contractor", contractorSchema);
