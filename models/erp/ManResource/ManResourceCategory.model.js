
const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  project_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'bussiness-projects',
    required: true
  }
}, { timestamps: true });
// Ensure unique category names per project
CategorySchema.index({ name: 1, project_id: 1 }, { unique: true });

module.exports = mongoose.model('DMRCategory', CategorySchema);
