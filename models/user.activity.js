const mongoose = require('mongoose');
const { Schema } = mongoose;

const activitySchema = new Schema({

    user_id: {
        type: String
    },

    activity_message: {
        type: String,
    },

    deleted: {
        type: Boolean,
        default: false,
    }


}, { timestamps: true });

module.exports = mongoose.model('activity', activitySchema)