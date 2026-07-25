const mongoose = require('mongoose');
const { Schema } = mongoose;

const adminSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  image: {
    type: String,
    default: null
  }

}, { timestamps: true });

module.exports = mongoose.model('admin', adminSchema);
