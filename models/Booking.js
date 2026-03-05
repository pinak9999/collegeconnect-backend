const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BookingSchema = new Schema({
    // 👤 Core Users
    student: { 
        type: Schema.Types.ObjectId, 
        ref: 'user', 
        required: true,
        index: true 
    },
    senior: { 
        type: Schema.Types.ObjectId, 
        ref: 'user', 
        required: true,
        index: true 
    },

    // Senior profile reference
    profile: { 
        type: Schema.Types.ObjectId, 
        ref: 'profile' 
    },

    // ⏰ Meeting Time
    slot_time: { 
        type: Date, 
        required: true 
    },

    // 💳 Payment Details
    amount_paid: { 
        type: Number, 
        required: true 
    },
    // 🔥 UPDATE: Isse required: false kar diya hai, kyunki FREE booking me ye nahi hoga
    razorpay_payment_id: { 
        type: String, 
        required: false, 
        unique: true,
        sparse: true // Taaki null values unique error na dein
    },
    razorpay_order_id: { 
        type: String 
    },

    // 🚀 NEW: Coupon Track karne ke liye
    couponUsed: { 
        type: String, 
        default: null 
    },
    paymentMethod: {
        type: String,
        enum: ['Razorpay', 'Coupon_Free'],
        default: 'Razorpay'
    },

    // 🚀 Booking Status
    status: {
        type: String,
        enum: [
            'Confirmed',           // Auto-approved meeting
            'Completed',           // Meeting khatam ho gayi
            'Cancelled (Refunded)', // Refund ke saath cancel
            'Missed',              // User ya Senior nahi aaya
            'Rejected'             // Future use ke liye
        ],
        default: 'Confirmed'
    },

    // ⭐ Rating System
    rating: { 
        type: Number, 
        min: 0,
        max: 5,
        default: 0 
    },
    review_text: { 
        type: String 
    },

    // 💰 Payout Management
    payout_status: { 
        type: String, 
        enum: ['Unpaid', 'Paid'], 
        default: 'Unpaid' 
    },

    // ⚠️ Dispute Handling
    dispute_status: { 
        type: String, 
        enum: ['None', 'Pending', 'Resolved'], 
        default: 'None' 
    },
    dispute_reason: {
        type: Schema.Types.ObjectId,
        ref: 'disputereason' 
    },
    dispute_comment: {
        type: String
    },

    // 🔗 Meeting Info
    meeting_link: {
        type: String,
        default: ""
    },
    join_status: {
        type: String,
        enum: ['NotJoined', 'Joined', 'LateJoined'],
        default: 'NotJoined'
    },

    // ⚙️ System Flags
    auto_status: {
        type: Boolean,
        default: true
    },

    // Creation date
    date: { 
        type: Date, 
        default: Date.now 
    }
}, { timestamps: true });

module.exports = mongoose.model('booking', BookingSchema);