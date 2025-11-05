const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const Booking = require('../models/Booking');
const User = require('../models/User');
const sendEmail = require('../config/email'); // 1. ('Email' (ईमेल) (ईमेल) 'हेल्पर' (helper) (helper) 'इम्पोर्ट' (import) (आयात) करें)

// (Student: Raise Dispute)
router.post('/raise/:bookingId', auth, async (req, res) => {
    const { reasonId } = req.body;
    try {
        const booking = await Booking.findById(req.params.bookingId)
            .populate('student', 'name email')
            .populate('senior', 'name email');
            
        if (!booking) return res.status(404).json({ msg: 'Booking not found' });
        if (booking.student._id.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });

        booking.dispute_status = 'Pending';
        booking.dispute_reason = reasonId; 
        await booking.save();
        
        // --- (2. 'नया' (New) 'अपडेट' (Update): 'Admin' (एडमिन) (एडमिन) 'को' (to) 'Email' (ईमेल) (ईमेल) 'भेजें' (Send)!) ---
        try {
            // (हम 'मान' (assuming) 'रहे' (are) 'हैं' (हैं) 'कि' (that) 'Admin' (एडमिन) (एडमिन) 'ईमेल' (email) (ईमेल) 'यह' (this) 'है' (is))
            const ADMIN_EMAIL = 'YOUR_ADMIN_EMAIL@gmail.com'; // (!! इसे 'बदलें' (Change) !!)
            await sendEmail(
                ADMIN_EMAIL,
                'NEW DISPUTE RAISED!',
                `<h3>A new dispute has been raised.</h3>
                 <p>Student: ${booking.student.name} (${booking.student.email})</p>
                 <p>Senior: ${booking.senior.name} (${booking.senior.email})</p>
                 <p>Booking ID: ${booking._id}</p>
                 <p>Reason: (Reason ID: ${reasonId})</p>
                 <p>Please login to your Admin Dashboard to resolve.</p>`
            );
        } catch (emailErr) { console.error("Dispute (विवाद) 'ईमेल' (email) (ईमेल) 'एरर' (error) (त्रुटि):", emailErr); }
        // --- (अपडेट (Update) खत्म) ---
        
        res.json(booking);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// (Admin: Resolve Dispute)
router.put('/resolve/:bookingId', isAdmin, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.bookingId)
            .populate('student', 'email'); // (हमें 'Student' (छात्र) (छात्र) 'का' (of) 'ईमेल' (email) (ईमेल) 'चाहिए' (need))
            
        if (!booking) return res.status(404).json({ msg: 'Booking not found' });
        
        booking.dispute_status = 'Resolved';
        await booking.save();
        
        // --- (3. 'नया' (New) 'अपडेट' (Update): 'Student' (छात्र) (छात्र) 'को' (to) 'Email' (ईमेल) (ईमेल) 'भेजें' (Send)!) ---
        try {
            await sendEmail(
                booking.student.email,
                'Your Dispute has been Resolved',
                `<h3>Your Dispute is Resolved</h3>
                 <p>Your dispute for Booking ID ${booking._id} has been reviewed and marked as 'Resolved' by the Admin.</p>
                 <p>If you still have issues, please contact support.</p>`
            );
        } catch (emailErr) { console.error("Resolve (सुलझाएँ) 'ईमेल' (email) (ईमेल) 'एरर' (error) (त्रुटि):", emailErr); }
        // --- (अपडेट (Update) खत्म) ---

        const updatedBooking = await Booking.findById(req.params.bookingId).populate('dispute_reason', 'reason');
        res.json({ msg: 'Dispute marked as Resolved.', booking: updatedBooking });
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

module.exports = router;