const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    mobileNumber: { type: String, required: true, unique: true },
    wallet_balance: { type: Number, default: 0 },
    isSenior: { type: Boolean, default: false },
    role: { type: String, enum: ['Student', 'Admin'], default: 'Student' },
    
    // --- (यह 'नया' (New) 'अपडेट' (Update) है: 'Forgot Password' (पासवर्ड भूल गए)) ---
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    // --- (अपडेट (Update) खत्म) ---

    register_date: { type: Date, default: Date.now }
});
module.exports = User = mongoose.model('user', UserSchema);