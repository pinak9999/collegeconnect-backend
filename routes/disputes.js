const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Booking = require('../models/Booking');
const DisputeReason = require('../models/DisputeReason');

// Get all dispute reasons
router.get('/reasons', auth, async (req, res) => {
    try {
        const count = await DisputeReason.countDocuments();
        if (count === 0) {
             await DisputeReason.insertMany([
                 { reason: "Senior didn't show up" },
                 { reason: "Senior was rude/unprofessional" },
                 { reason: "Session ended too early" },
                 { reason: "Technical issues prevented session" },
                 { reason: "Other" }
             ]);
        }
        const reasons = await DisputeReason.find();
        res.json(reasons);
    } catch (err) {
        console.error("Fetch Reasons Error:", err.message);
        res.status(500).json({ msg: "Server Error" });
    }
});

// Raise a dispute
router.post('/raise/:bookingId', auth, async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { reasonId, comment } = req.body;

        if (!reasonId) {
            return res.status(400).json({ msg: "Please select a reason." });
        }

        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ msg: "Booking not found." });
        }

        // Logic Fix: Strictly check user ID matching
        if (booking.student.toString() !== req.user.id) {
            return res.status(401).json({ msg: "Not authorized." });
        }

        if (booking.dispute_status !== 'None') {
             return res.status(400).json({ msg: "Dispute already exists." });
        }

        // Update fields
        booking.dispute_status = 'Pending';
        booking.dispute_reason = reasonId; 
        booking.dispute_comment = comment || "";
        
        await booking.save();
        
        // Return populated booking for immediate UI update
        const updatedBooking = await Booking.findById(bookingId).populate('dispute_reason');

        res.json({ success: true, msg: "Dispute raised successfully", booking: updatedBooking });

    } catch (err) {
        console.error("Raise Dispute Error:", err.message);
        res.status(500).json({ msg: "Server Error", error: err.message });
    }
});

module.exports = router;