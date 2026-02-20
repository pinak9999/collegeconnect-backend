const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Booking = require('../models/Booking');
const DisputeReason = require('../models/DisputeReason');

// @route   GET /api/disputes/reasons
// @desc    Get all dispute reasons
router.get('/reasons', auth, async (req, res) => {
    try {
        // Seed default reasons if none exist
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

// @route   POST /api/disputes/raise/:bookingId
// @desc    Raise a dispute for a booking
router.post('/raise/:bookingId', auth, async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { reasonId, comment } = req.body;

        // 1. Validation
        if (!reasonId) {
            return res.status(400).json({ msg: "Please select a reason for the dispute." });
        }

        // 2. Find Booking
        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ msg: "Booking not found." });
        }

        // 3. Ownership Check (Only the student can raise a dispute)
        // Ensure req.user.id matches the student ID on the booking
        if (booking.student.toString() !== req.user.id) {
            return res.status(401).json({ msg: "Not authorized to dispute this booking." });
        }

        // 4. State Check (Prevent double disputes)
        if (booking.dispute_status !== 'None') {
             return res.status(400).json({ msg: "Dispute already raised or resolved." });
        }

        // 5. Update Booking
        booking.dispute_status = 'Pending';
        booking.dispute_reason = reasonId; // Saves the ObjectId
        booking.dispute_comment = comment || "";
        
        await booking.save();

        res.json({ success: true, msg: "Dispute raised successfully", booking });

    } catch (err) {
        console.error("Raise Dispute Error:", err.message);
        
        // Handle Invalid ObjectId error (e.g. malformed reasonId or bookingId)
        if (err.kind === 'ObjectId') {
            return res.status(400).json({ msg: "Invalid ID format provided." });
        }

        res.status(500).json({ msg: "Server Error", error: err.message });
    }
});
// @route   PUT /api/disputes/resolve/:bookingId
// @desc    Admin resolves a dispute
// Note: Ensure you import 'isAdmin' middleware at the top if you want to restrict this to admins
router.put('/resolve/:bookingId', auth, async (req, res) => {
    try {
        const { bookingId } = req.params;

        // 1. Find Booking
        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ msg: "Booking not found." });
        }

        // 2. Check if dispute exists
        if (booking.dispute_status !== 'Pending') {
            return res.status(400).json({ msg: "No pending dispute found for this booking." });
        }

        // 3. Update Status to Resolved
        booking.dispute_status = 'Resolved';
        await booking.save();

        res.json({ success: true, msg: "Dispute resolved successfully", booking });

    } catch (err) {
        console.error("Resolve Dispute Error:", err.message);
        if (err.kind === 'ObjectId') {
            return res.status(400).json({ msg: "Invalid Booking ID format." });
        }
        res.status(500).json({ msg: "Server Error", error: err.message });
    }
});
module.exports = router;