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

        // 🚀 BOLD: बग फिक्स यहीं से शुरू होता है
        // फ्रंटएंड `rated` (boolean) फ़ील्ड की उम्मीद कर रहा है।
        // हम Mongoose दस्तावेज़ों को सादे जावास्क्रिप्ट ऑब्जेक्ट में बदल देंगे
        // ताकि हम `rated` फ़ील्ड जोड़ सकें।
        const bookingsWithRatedStatus = bookings.map(b => {
            const bookingObject = b.toObject(); // .toObject() Mongoose दस्तावेज़ को JS ऑब्जेक्ट में बदलता है
            
            // अगर `rating` फ़ील्ड मौजूद है (undefined, null, या 0 नहीं है),
            // तो `rated: true` सेट करें, वरना `rated: false` सेट करें।
            bookingObject.rated = !!bookingObject.rating; 
            
            return bookingObject;
        });
        // 🚀 BOLD: बग फिक्स यहाँ खत्म होता है

        // मूल `bookings` ऐरे की जगह अपडेटेड ऐरे भेजें
        res.json(bookingsWithRatedStatus);
        // 🚀 BOLD: (पहले यह `res.json(bookings);` था)

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


// --- 🚀 NAYA CODE YAHAN ADD KIYA GAYA (STEP 2 & 4) ---

/**
 * @route   POST /api/bookings/propose-time/:id
 * @desc    Student proposes a time for the call
 * @access  Private (Student)
 */
router.post('/propose-time/:id', auth, async (req, res) => {
    try {
        const { time } = req.body; // time (Date)
        const bookingId = req.params.id;

        let booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ msg: "Booking not found" });
        }

        // 1. Auth check: Only the student of this booking can propose
        if (booking.student.toString() !== req.user.id) {
            return res.status(401).json({ msg: "Not authorized" });
        }
        
        // 2. Update time
        booking.proposed_time.student_time = time;
        booking.status_timing = "student_proposed";
        // Senior ke time ko null kar denge agar usne pehle propose kiya tha
        booking.proposed_time.senior_time = null; 

        await booking.save();

        const populatedBooking = await Booking.findById(bookingId).populate('student', 'name').populate('senior', 'name');

        // 3. Socket Emit: Senior ko alert bhejenge
        // (req.io hamare server.js middleware se aa raha hai)
        req.io.to(booking.senior.toString()).emit("student_time_proposed", populatedBooking);
        
        res.json(populatedBooking);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

/**
 * @route   POST /api/bookings/accept-time/:id
 * @desc    Senior accepts the proposed time
 * @access  Private (Senior)
 */
router.post('/accept-time/:id', auth, async (req, res) => {
    try {
        const bookingId = req.params.id;
        let booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ msg: "Booking not found" });
        }

        // 1. Auth check: Only the senior of this booking can accept
        if (booking.senior.toString() !== req.user.id) {
            return res.status(401).json({ msg: "Not authorized" });
        }

        // 2. Logic check: Student ne time propose kiya hona chahiye
        if (booking.status_timing !== 'student_proposed' || !booking.proposed_time.student_time) {
            return res.status(400).json({ msg: "No student time proposed to accept." });
        }

        // 3. Update time
        booking.final_time = booking.proposed_time.student_time; // Student ke time ko final_time me set karo
        booking.status_timing = "confirmed_time";
        
        await booking.save();
        
        const populatedBooking = await Booking.findById(bookingId).populate('student', 'name').populate('senior', 'name');

        // 4. Socket Emit: Student ko alert bhejenge
        req.io.to(booking.student.toString()).emit("time_confirmed", populatedBooking);

        res.json(populatedBooking);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

/**
 * @route   POST /api/bookings/reject-time/:id
 * @desc    Senior rejects the proposed time
 * @access  Private (Senior)
 */
router.post('/reject-time/:id', auth, async (req, res) => {
    try {
        const bookingId = req.params.id;
        let booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ msg: "Booking not found" });
        }

        // 1. Auth check: Only the senior of this booking can reject
        if (booking.senior.toString() !== req.user.id) {
            return res.status(401).json({ msg: "Not authorized" });
        }
        
        // 2. Logic check: Student ne time propose kiya hona chahiye
        if (booking.status_timing !== 'student_proposed') {
             return res.status(400).json({ msg: "No student time proposed to reject." });
        }

        // 3. Update time (Resetting)
        booking.proposed_time.student_time = null;
        booking.status_timing = "not_set"; // Wapas 'not_set' state me bhej denge

        await booking.save();
        
        const populatedBooking = await Booking.findById(bookingId).populate('student', 'name').populate('senior', 'name');

        // 4. Socket Emit: Student ko alert bhejenge
        req.io.to(booking.student.toString()).emit("time_rejected", populatedBooking);
        
        res.json(populatedBooking);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- 🚀 END NAYA CODE ---

// ... (आपका 'reject-time' वाला कोड)

/**
 * @route   GET /api/bookings/single/:id
 * @desc    Get single booking details (for guards/video page)
 * @access  Private
 */
router.get('/single/:id', auth, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('student', 'name')
            .populate('senior', 'name');

        if (!booking) {
            return res.status(404).json({ msg: "Booking not found" });
        }

        // Auth Check: Only the student or the senior of this booking can view it
        if (booking.student.toString() !== req.user.id && booking.senior.toString() !== req.user.id) {
            return res.status(401).json({ msg: "Not authorized" });
        }

        res.json(booking); // Booking details bhej do
        
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- 🚀 END NAYA CODE ---


module.exports = router;