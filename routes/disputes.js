const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Dispute = require('../models/Dispute');
// 🟢 FIX: Models ko sahi se import karna zaroori hai
const Booking = require('../models/Booking');
const User = require('../models/User'); 
// 🟢 EMAIL: Email helper import (agar aapke paas hai)
// Agar file nahi hai to ise comment kar dein filhal
const sendEmail = require('../config/email'); 

// 1. Raise a Dispute (Student Side)
router.post('/raise/:bookingId', auth, async (req, res) => {
    try {
        const { reason, description } = req.body;
        const bookingId = req.params.bookingId;

        console.log(`🔥 Raising Dispute for Booking: ${bookingId}`);
        console.log(`👤 User: ${req.user.id}`);

        // 1. Check if Booking exists
        // 🟢 FIX: 'mentor' populate karein ('senior' nahi)
        const booking = await Booking.findById(bookingId)
            .populate('student', 'name email')
            .populate('mentor', 'name email'); 

        if (!booking) {
            console.log("❌ Booking not found");
            return res.status(404).json({ msg: 'Booking not found' });
        }

        // 2. Check Permissions (Sirf wahi user dispute kar sakta hai jo booking mein hai)
        if (booking.student._id.toString() !== req.user.id && booking.mentor._id.toString() !== req.user.id) {
            console.log("❌ Unauthorized User");
            return res.status(401).json({ msg: 'Not authorized' });
        }

        // 3. Check if Dispute already exists
        const existingDispute = await Dispute.findOne({ booking: bookingId });
        if (existingDispute) {
            console.log("⚠️ Dispute already exists");
            return res.status(400).json({ msg: 'Dispute already raised for this booking' });
        }

        // 4. Create Dispute
        const newDispute = new Dispute({
            booking: bookingId,
            raisedBy: req.user.id,
            // Automatically determine raisedAgainst
            raisedAgainst: (booking.student._id.toString() === req.user.id) ? booking.mentor._id : booking.student._id,
            reason: reason || "Other",
            description: description || "No description provided",
            status: 'open'
        });

        await newDispute.save();
        console.log("✅ Dispute Raised Successfully");

        // 5. Send Email Notification (Optional & Safe)
        try {
            const ADMIN_EMAIL = 'admin@collegeconnect.com'; // Apna admin email yahan dalein
            if (sendEmail) {
                await sendEmail(
                    ADMIN_EMAIL,
                    '🚨 NEW DISPUTE RAISED',
                    `<h3>A new dispute has been raised.</h3>
                     <p><strong>Booking ID:</strong> ${booking._id}</p>
                     <p><strong>Raised By:</strong> ${req.user.id}</p>
                     <p><strong>Reason:</strong> ${reason}</p>
                     <p>Please check Admin Dashboard.</p>`
                );
                console.log("📧 Admin Notified via Email");
            }
        } catch (emailErr) {
            console.error("⚠️ Email Sending Failed (Non-critical):", emailErr.message);
        }

        res.json(newDispute);

    } catch (err) {
        console.error("❌ DISPUTE ERROR:", err.message);
        res.status(500).send('Server Error');
    }
});

// 2. Get My Disputes
router.get('/my', auth, async (req, res) => {
    try {
        const disputes = await Dispute.find({ raisedBy: req.user.id })
            .populate('booking')
            .sort({ createdAt: -1 });
        res.json(disputes);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;