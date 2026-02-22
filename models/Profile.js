const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProfileSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'user' },
    college: { type: Schema.Types.ObjectId, ref: 'college' }, 
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

    // 🚀 BOLD NEW UPDATE: Senior का Permanent Google Meet Link
    meet_link: { 
        type: String, 
        default: '' 
    },

    // 📅 Senior's Weekly Availability (किस दिन, कितने बजे से कितने बजे तक)
    availability: [ { day: String, startTime: String, endTime: String } ],
    
    date: { type: Date, default: Date.now }
});

module.exports = Profile = mongoose.model('profile', ProfileSchema);