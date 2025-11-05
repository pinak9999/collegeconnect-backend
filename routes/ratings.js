const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Booking = require('../models/Booking');
const Profile = require('../models/Profile');

/**
 * @route   POST /api/ratings/submit/:bookingId
 * @desc    Submit a rating/review for a booking
 * @access  Private (Student)
 */
router.post('/submit/:bookingId', auth, async (req, res) => {
    const { rating, review_text } = req.body;
    const { bookingId } = req.params;

    try {
        // 1. 'Booking' (बुकिंग) ढूँढें
        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ msg: 'Booking not found' });
        }
        // (पक्का करें कि 'Student' (छात्र) अपनी ही 'बुकिंग' (booking) को 'रेट' (rate) (मूल्यांकन) कर रहा है)
        if (booking.student.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }
        // (पक्का करें कि 'रेट' (rate) (मूल्यांकन) सिर्फ एक बार हो)
        if (booking.rating) {
            return res.status(400).json({ msg: 'Booking already rated' });
        }

        // 2. 'Booking' (बुकिंग) में 'Rating' (रेटिंग) 'सेव' (save) करें
        booking.rating = rating;
        booking.review_text = review_text;
        await booking.save();

        // 3. 'Senior' (सीनियर) की 'Average Rating' (औसत रेटिंग) (औसत रेटिंग) को 'री-कैलकुलेट' (re-calculate) (पुनर्गणना) करें
        const profile = await Profile.findOne({ user: booking.senior });
        if (profile) {
            const newTotalRatings = profile.total_ratings + 1;
            // ( (पुरानी 'एवरेज' (average) * पुराने 'टोटल' (total)) + 'नई' (new) 'रेटिंग' (rating) ) / 'नया' (new) 'टोटल' (total)
            profile.average_rating = ((profile.average_rating * profile.total_ratings) + rating) / newTotalRatings;
            profile.total_ratings = newTotalRatings;
            await profile.save();
        }

        res.json(booking);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;