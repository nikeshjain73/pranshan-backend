const mongoose = require('mongoose');
const { Schema } = mongoose;


const punchMachineSchema = new Schema(
    {
        employee_id: {
            type: Schema.Types.ObjectId,
            ref: "employee",
            index: true,
        },
        employee_code: {
            type: Number,
        },
        punch_time: {
            type: Date,
        },
        serial_number: {
            type: String,
        },
        punch_type: {
            type: String,
            default: null,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('punch-machine', punchMachineSchema);