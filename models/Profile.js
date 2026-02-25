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
    
    id_card_url: { type: String },
    id_card_cloudinary_id: { type: String },

    // 🔗 Senior's Google Meet Link
    meet_link: { type: String, default: '' },

    // 📅 General Weekly Schedule
    availability: [ { day: String, startTime: String, endTime: String } ],

    // 🚀 NEW: Date-Specific Overrides
    overrides: [{
        date: String,         
        isUnavailable: { type: Boolean, default: false }, 
        startTime: String,    
        endTime: String
    }],
    
    date: { type: Date, default: Date.now }
});

// ✅ End of file (Yahan router ka koi code nahi hona chahiye)
module.exports = Profile = mongoose.model('profile', ProfileSchema);