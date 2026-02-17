const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const Booking = require('../models/Booking');

// 1. GET STUDENT BOOKINGS (Student Dashboard के लिए)
router.get('/student/my', auth, async (req, res) => {
    try {
        // 🟢 FIX: 'mentor' को पॉप्युलेट करें, 'senior' को नहीं
        const bookings = await Booking.find({ student: req.user.id })
            .populate('mentor', 'name email avatar mobileNumber') 
            .sort({ scheduledDate: -1, startTime: -1 }); // 🟢 FIX: सही सॉर्टिंग

        // 🚀 बग फिक्स: फ्रंटएंड के लिए 'rated' स्टेटस जोड़ना
        const bookingsWithRatedStatus = bookings.map(b => {
            const bookingObject = b.toObject();
            // अगर रेटिंग मौजूद है, तो rated: true, वरना false
            bookingObject.rated = !!bookingObject.rating; 
            return bookingObject;
        });

        res.json(bookingsWithRatedStatus);

    } catch (err) { 
        console.error("Fetch Error:", err.message); 
        res.status(500).json({ msg: 'Server Error loading bookings' }); 
    }
});

// 2. GET MENTOR BOOKINGS (Senior Dashboard के लिए)
router.get('/senior/my', auth, async (req, res) => {
    try {
        // 🟢 FIX: 'mentor' फील्ड में यूज़र की ID चेक करें
        const bookings = await Booking.find({ mentor: req.user.id })
            .populate('student', 'name email mobileNumber avatar')
            .sort({ scheduledDate: -1, startTime: -1 });

        res.json(bookings);
    } catch (err) { 
        console.error(err.message); 
        res.status(500).send('Server Error'); 
    }
});

// 3. GET ALL BOOKINGS (Admin Dashboard के लिए)
router.get('/admin/all', isAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page || '1');
        const limit = parseInt(req.query.limit || '10');
        const skip = (page - 1) * limit;

        const bookings = await Booking.find()
            .populate('student', 'name mobileNumber') 
            .populate('mentor', 'name mobileNumber') 
            .sort({ scheduledDate: -1 })
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

module.exports = router;