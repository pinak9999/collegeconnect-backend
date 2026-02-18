const mongoose = require('mongoose');

const DisputeReasonSchema = new mongoose.Schema({
  reason: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('DisputeReason', DisputeReasonSchema);