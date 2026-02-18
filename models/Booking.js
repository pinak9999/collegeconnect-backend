const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BookingSchema = new Schema({
    // 👤 Core Users
    // Student jisne book kiya hai
    student: { 
        type: Schema.Types.ObjectId, 
        ref: 'user', 
        required: true,
        index: true // Searching tez karne ke liye
    },
    // Senior jiske saath booking hui hai
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
    // Actual meeting ka samay
    slot_time: { 
        type: Date, 
        required: true 
    },

    // 💳 Payment Details
    amount_paid: { 
        type: Number, 
        required: true 
    },
    // Razorpay transaction tracking ke liye
    razorpay_payment_id: { 
        type: String, 
        required: true,
        unique: true // Duplicate payments rokne ke liye
    },
    razorpay_order_id: { 
        type: String 
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
        min: 1, 
        max: 5 
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
        default: true  // Auto-approved system
    },

    // Creation date
    date: { 
        type: Date, 
        default: Date.now 
    }
}, { timestamps: true }); // createdAt aur updatedAt apne aap handle honge

module.exports = mongoose.model('booking', BookingSchema);