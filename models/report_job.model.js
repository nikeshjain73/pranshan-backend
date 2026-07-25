const mongoose = require("mongoose");
const { Schema } = mongoose;

const ReportJobSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
        },
        type: {
            type: String,
            enum: ["PDF", "XLSX"],
            required: true
        },
        tagNumber: {
            type: Number
        },
        status: {
            type: String,
            enum: ["pending", "processing", "completed", "failed"],
            default: "pending"
        },
        fileUrl: {
            type: String,
            default: null
        },
        error: {
            type: String,
            default: null
        },
        progress: {
            type: Number,
            default: 0
        },
        metadata: {
            type: Object,
            default: {}
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("ReportJob", ReportJobSchema);
