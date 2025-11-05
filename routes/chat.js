const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Message = require('../models/Message');
const Booking = require('../models/Booking');

/**
 * @route   GET /api/chat/:bookingId
 * @desc    Get all messages for a specific booking
 * @access  Private (Auth)
 */
router.get('/:bookingId', auth, async (req, res) => {
    try {
        // 1. 'बुकिंग' (Booking) 'ढूँढें' (Find)
        const booking = await Booking.findById(req.params.bookingId);
        if (!booking) return res.status(404).json({ msg: 'Booking not found' });

        // 2. 'पक्का' (Ensure) 'करें' (do) 'कि' (that) 'यह' (this) 'यूज़र' (user) (उपयोगकर्ता) 'इस' (this) 'चैट' (chat) (चैट) 'का' (of) 'हिस्सा' (part) 'है' (is)
        if (booking.student.toString() !== req.user.id && booking.senior.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized for this chat' });
        }

        // 3. 'सारे' (All) 'मैसेज' (message) (संदेश) 'लाएँ' (Fetch)
        const messages = await Message.find({ booking: req.params.bookingId })
            .populate('sender', 'name')
            .sort({ timestamp: 1 }); // ('पुराने' (Old) 'पहले' (first))

        res.json(messages);

    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

module.exports = router;