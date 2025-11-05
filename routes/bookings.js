const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const Booking = require('../models/Booking');

// (GET /student/my) (वही है, 'populate' (पॉप्युलेट) (आबाद) 'फिक्स' (fix) (ठीक) 'के' (of) 'साथ' (with))
router.get('/student/my', auth, async (req, res) => {
    try {
        const bookings = await Booking.find({ student: req.user.id })
            .populate('senior', 'name email') 
            .populate('dispute_reason', 'reason') 
            .populate({
                path: 'profile', select: 'college tags year', 
                populate: [ { path: 'college', select: 'name' }, { path: 'tags', select: 'name' } ]
            })
            .sort({ slot_time: -1 });
        res.json(bookings);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// (GET /senior/my) (वही है, 'populate' (पॉप्युलेट) (आबाद) 'फिक्स' (fix) (ठीक) 'के' (of) 'साथ' (with))
router.get('/senior/my', auth, async (req, res) => {
    try {
        const bookings = await Booking.find({ senior: req.user.id })
            .populate('student', 'name email mobileNumber _id')
            .populate('dispute_reason', 'reason')
            .populate({
                path: 'profile', select: 'college tags year',
                populate: [ { path: 'college', select: 'name' }, { path: 'tags', select: 'name' } ]
            })
            .sort({ slot_time: -1 });
        res.json(bookings);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

/**
 * @route   GET /api/bookings/admin/all
 * @desc    Get *ALL* bookings (Admin Only) (WITH PAGINATION)
 * @access  Private (isAdmin)
 */
// --- (यह 'नया' (New) 'अपडेट' (Update) है: 'Pagination' (पेजिनेशन) (पृष्ठांकन)) ---
router.get('/admin/all', isAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page || '1');
        const limit = parseInt(req.query.limit || '10');
        const skip = (page - 1) * limit;

        const bookings = await Booking.find()
            .populate('student', 'name mobileNumber _id') 
            .populate('senior', 'name mobileNumber') 
            .populate('dispute_reason', 'reason') 
            .populate({
                path: 'profile', select: 'college tags year',
                populate: [ { path: 'college', select: 'name' }, { path: 'tags', select: 'name' } ]
            })
            .sort({ date: -1 })
            .limit(limit)
            .skip(skip);
        
        const totalBookings = await Booking.countDocuments();
        
        res.json({
            bookings: bookings,
            totalBookings: totalBookings,
            currentPage: page,
            totalPages: Math.ceil(totalBookings / limit)
        });
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});
// --- (अपडेट (Update) खत्म) ---

// (Mark Complete (मार्क कंप्लीट) (वही है))
router.put('/mark-complete/:bookingId', auth, async (req, res) => {
    try {
        let booking = await Booking.findById(req.params.bookingId);
        if (!booking) return res.status(404).json({ msg: 'Booking not found' });
        if (booking.senior.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });
        booking.status = 'Completed';
        await booking.save();
        
        const updatedBooking = await Booking.findById(req.params.bookingId)
            .populate('student', 'name email mobileNumber _id')
            .populate('dispute_reason', 'reason')
            .populate({
                path: 'profile', select: 'college tags year',
                populate: [ { path: 'college', select: 'name' }, { path: 'tags', select: 'name' } ]
            });
        res.json(updatedBooking);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

module.exports = router;