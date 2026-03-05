// models/Cutoff.js
const mongoose = require('mongoose');

const CutoffSchema = new mongoose.Schema({
  collegeName: { type: String, required: true },
  branch: { type: String, required: true },
  category: { type: String, required: true }, // 'GEN', 'OBC', 'SC', 'ST'
  mode: { type: String, required: true },     // '12th' या 'jee'
  closingScore: { type: Number, required: true } // पिछले साल की कटऑफ (जैसे 88.5)
});

module.exports = mongoose.model('Cutoff', CutoffSchema);