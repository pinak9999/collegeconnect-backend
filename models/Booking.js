const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BookingSchema = new Schema({
    // 🔥 Core Users
    student: { type: Schema.Types.ObjectId, ref: 'user', required: true },
    senior: { type: Schema.Types.ObjectId, ref: 'user', required: true },

    // Senior profile reference
    profile: { type: Schema.Types.ObjectId, ref: 'profile' },

    // 🔥 Meeting Time (IMPORTANT)
    slot_time: { type: Date, required: true },   // Meeting time

    // Payment Details
    amount_paid: { type: Number, required: true },
    razorpay_payment_id: { type: String, required: true },

    // 🔥 Status for Auto-Approved Meetings
    status: {
        type: String,
        enum: [
            'Confirmed',          // auto-approved
            'Completed',
            'Cancelled (Refunded)',
            'Missed',             // ⬅️ new for call scheduling
            'Rejected'            // ⬅️ future use
        ],
        default: 'Confirmed'
    },

    // Rating System
    rating: { type: Number, min: 1, max: 5 },
    review_text: { type: String },

    // Payment → senior payout
    payout_status: { type: String, enum: ['Unpaid', 'Paid'], default: 'Unpaid' },

    // Dispute Handling
    dispute_status: { type: String, enum: ['None', 'Pending', 'Resolved'], default: 'None' },
    dispute_reason: {
        type: Schema.Types.ObjectId,
        ref: 'disputereason'
    },

    // 🔥 Meeting Link (NEW)
    meeting_link: {
        type: String,
        default: ""
    },

    // 🔥 Meeting Join Info (NEW)
    join_status: {
        type: String,
        enum: ['NotJoined', 'Joined', 'LateJoined'],
        default: 'NotJoined'
    },

    // 🔥 Auto Meeting Time Tracking (NEW)
    auto_status: {
        type: Boolean,
        default: true  // Means auto-approved system
    },

    date: { type: Date, default: Date.now }
});

module.exports = Booking = mongoose.model('booking', BookingSchema);
