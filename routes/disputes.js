const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Dispute = require('../models/Dispute'); // स्टेप 1 वाली फाइल
const Booking = require('../models/Booking'); // आपका बुकिंग मॉडल
const User = require('../models/User'); 

// 1. Raise a Dispute
router.post('/raise/:bookingId', auth, async (req, res) => {
    try {
        // फ्रंटएंड से reason या description लें
        const { reason, description } = req.body;
        const bookingId = req.params.bookingId;

        console.log(`🔥 Raising Dispute for Booking: ${bookingId}`);

        // 1. बुकिंग ढूँढें (populate हटा दिया है ताकि क्रैश न हो)
        const booking = await Booking.findById(bookingId);

        if (!booking) {
            return res.status(404).json({ msg: 'Booking not found' });
        }

        // 2. परमिशन चेक करें (सिर्फ Student या Mentor ही डिस्प्यूट कर सकते हैं)
        const studentId = booking.student.toString();
        const mentorId = booking.mentor.toString();
        const userId = req.user.id;

        if (userId !== studentId && userId !== mentorId) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        // 3. चेक करें कि पहले से डिस्प्यूट तो नहीं है
        const existingDispute = await Dispute.findOne({ booking: bookingId });
        if (existingDispute) {
            return res.status(400).json({ msg: 'Dispute already raised for this booking' });
        }

        // 4. टारगेट सेट करें (किसके खिलाफ शिकायत है?)
        const targetUser = (userId === studentId) ? mentorId : studentId;

        // 5. डिस्प्यूट सेव करें
        const newDispute = new Dispute({
            booking: bookingId,
            raisedBy: userId,
            raisedAgainst: targetUser,
            reason: reason || "General Issue", // अगर रीज़न खाली हो तो डिफ़ॉल्ट
            description: description || "",
            status: 'open'
        });

        await newDispute.save();
        console.log("✅ Dispute Raised Successfully");

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
            .populate('booking') // बुकिंग डिटेल्स दिखाएं
            .sort({ createdAt: -1 });
        res.json(disputes);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;