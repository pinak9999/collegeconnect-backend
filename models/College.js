const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CollegeSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true
    }
});

module.exports = College = mongoose.model('college', CollegeSchema);