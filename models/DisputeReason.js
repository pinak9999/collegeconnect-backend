const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DisputeReasonSchema = new Schema({
    reason: {
        type: String,
        required: true,
        unique: true
    }
});

module.exports = DisputeReason = mongoose.model('disputereason', DisputeReasonSchema);