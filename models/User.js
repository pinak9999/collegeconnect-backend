const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    
    // --- (बदलाव 1) ---
    // Password ab 'required' nahi hai (Google login ke liye)
    password: { type: String }, 

    // --- (बदलाव 2) ---
    // MobileNumber ab 'required' nahi hai aur default 'null' hai
    mobileNumber: { 
        type: String, 
        default: null, 
        unique: true,
        sparse: true // Yeh 'unique' ko sirf non-null values par laagu karega
    },

    // --- (बदलाव 3) ---
    // Google profile photo ke liye naya field
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