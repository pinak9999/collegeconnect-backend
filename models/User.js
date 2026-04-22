const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    
    // --- (बदलाव 1) ---
    // Password अब 'required' नहीं है (Google login के लिए)
    password: { type: String }, 

    // --- (बदलाव 2) ---
    // 🔥 FIX: 'default: null' हटा दिया है।
    // अब अगर नंबर नहीं होगा, तो ये फील्ड बनेगी ही नहीं, और sparse एकदम सही काम करेगा।
    mobileNumber: { 
        type: String, 
        unique: true,
        sparse: true 
    },

    // --- (बदलाव 3) ---
    // Google profile photo के लिए नया फील्ड
    avatar: { type: String },

    wallet_balance: { type: Number, default: 0 },
    isSenior: { type: Boolean, default: false },
    role: { type: String, enum: ['Student', 'Admin'], default: 'Student' },
    
    // --- (Forgot Password) ---
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },

    register_date: { type: Date, default: Date.now }
});

module.exports = User = mongoose.model('user', UserSchema);