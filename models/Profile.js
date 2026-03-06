const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProfileSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'user' },
    college: { type: Schema.Types.ObjectId, ref: 'college' }, 
    
    // 🚀 NEW: यह वो नाम है जो स्टूडेंट को दिखेगा (Alias / Fake Name)
    display_name: { type: String }, 

    branch: { type: String, default: 'Not Set' },
    year: { type: String, default: 'Not Set' },
    bio: { type: String, default: 'Please ask Admin to update this profile.' },
    price_per_session: { type: Number, default: 0 },
    session_duration_minutes: { type: Number, default: 20 },
    average_rating: { type: Number, default: 0 },
    total_ratings: { type: Number, default: 0 },
    tags: [{ type: Schema.Types.ObjectId, ref: 'tag' }],
    avatar: { type: String, default: 'https://via.placeholder.com/100' },
    cloudinary_id: { type: String },
    
    // --- (यह रहा 'नया' (New) 'अपडेट' (Update) #3) ---
    id_card_url: { // (यह 'ID Card' (आईडी कार्ड) (पहचान पत्र) 'URL' (यूआरएल) (URL (यूआरएल)) 'रखेगा' (will keep))
        type: String 
    },
    id_card_cloudinary_id: { // (इसे 'डिलीट' (delete) (हटाने) 'करने' (do) 'के लिए' (for))
        type: String 
    },
    // --- (अपडेट (Update) खत्म) ---

    availability: [ { day: String, startTime: String, endTime: String } ],
    date: { type: Date, default: Date.now }
});

// 🚀 NEW LOGIC: एक सीनियर के कई कॉलेज हो सकते हैं, लेकिन एक ही कॉलेज के 2 प्रोफाइल नहीं हो सकते।
ProfileSchema.index({ user: 1, college: 1 }, { unique: true });

module.exports = Profile = mongoose.model('profile', ProfileSchema);