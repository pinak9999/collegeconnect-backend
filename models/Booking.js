const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BookingSchema = new Schema({
    student: { type: Schema.Types.ObjectId, ref: 'user' },
    senior: { type: Schema.Types.ObjectId, ref: 'user' },
    profile: { type: Schema.Types.ObjectId, ref: 'profile' },
    slot_time: { type: Date, required: true },
    amount_paid: { type: Number, required: true },
    razorpay_payment_id: { type: String, required: true },
    status: { type: String, enum: ['Confirmed', 'Completed', 'Cancelled (Refunded)'], default: 'Confirmed' },
    rating: { type: Number, min: 1, max: 5 },
    review_text: { type: String },
    payout_status: { type: String, enum: ['Unpaid', 'Paid'], default: 'Unpaid' },
    dispute_status: { type: String, enum: ['None', 'Pending', 'Resolved'], default: 'None' },
    
    // --- (यह 'नया' (New) 'अपडेट' (Update) है) ---
    dispute_reason: { // (यह 'अब' (now) 'String' (स्ट्रिंग) (स्ट्रिंग) 'नहीं' (not) 'है' (is))
        type: Schema.Types.ObjectId,
        ref: 'disputereason' // (यह 'DisputeReason.js' (डिस्प्यूटरीज़न.जेएस) 'को' (to) 'लिंक' (link) (लिंक) 'करता' (does) 'है' (है))
    },
    // --- (अपडेट (Update) खत्म) ---
    
    date: { type: Date, default: Date.now }
});
module.exports = Booking = mongoose.model('booking', BookingSchema);