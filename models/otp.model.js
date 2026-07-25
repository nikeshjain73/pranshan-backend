const mongoose = require('mongoose');
const { Schema } = mongoose;

const otpSchema = new Schema({
  otp: {
    type: Number,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  expire_time: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    default: null
  }

}, { timestamps: true });
module.exports = mongoose.model('otp', otpSchema);
