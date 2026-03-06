const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// 🚀 Helper functions for random fake data
const getRandomRating = () => (Math.random() * (5.0 - 4.2) + 4.2).toFixed(1); 
const getRandomTotal = () => Math.floor(Math.random() * (85 - 15 + 1)) + 15;

const ProfileSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'user' },
    college: { type: Schema.Types.ObjectId, ref: 'college' }, 
    
    display_name: { type: String }, 

    branch: { type: String, default: 'Not Set' },
    year: { type: String, default: 'Not Set' },
    bio: { type: String, default: 'Please ask Admin to update this profile.' },
    price_per_session: { type: Number, default: 0 },
    session_duration_minutes: { type: Number, default: 20 },
    
    // 🚀 NEW: 0 की जगह रैंडम डिफ़ॉल्ट वैल्यू जनरेट होगी
    average_rating: { type: Number, default: getRandomRating },
    total_ratings: { type: Number, default: getRandomTotal },
    
    tags: [{ type: Schema.Types.ObjectId, ref: 'tag' }],
    avatar: { type: String, default: 'https://via.placeholder.com/100' },
    cloudinary_id: { type: String },
    
    id_card_url: { type: String },
    id_card_cloudinary_id: { type: String },

    availability: [ { day: String, startTime: String, endTime: String } ],
    date: { type: Date, default: Date.now }
});

ProfileSchema.index({ user: 1, college: 1 }, { unique: true });

module.exports = Profile = mongoose.model('profile', ProfileSchema);