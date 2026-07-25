const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSessionSchema = new Schema({
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true,
    },
    ip_address: {
        type: String,
        default: null,
    },
    device_info: {
        type: String,
        default: null,
    },
    token: {
        type: String,
        required: true,
    },
    is_active: {
        type: Boolean,
        default: true,
    }
}, { timestamps: true });

module.exports = mongoose.model('user-session', userSessionSchema);
