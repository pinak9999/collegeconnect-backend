const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); 
const isAdmin = require('../middleware/isAdmin');
const Profile = require('../models/Profile');
const User = require('../models/User'); 
const { cloudinary, parser } = require('../config/cloudinary'); 
const Booking = require('../models/Booking');
const SiteSettings = require('../models/SiteSettings');

// ----------------------------------------------
// 1. ADMIN (एडमिन) API (API)
// ----------------------------------------------

// (Admin: Get specific profile)
router.get('/user/:userId', isAdmin, async (req, res) => {
    try {
        let profile = await Profile.findOne({ user: req.params.userId });
        if (!profile) return res.status(404).json({ msg: 'Profile not found.' });
        profile = await profile.populate([
            { path: 'user', select: 'name email' },
            { path: 'college', select: 'name' },
            { path: 'tags', select: 'name' }
        ]);
        res.json(profile);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// (Admin: Create/Update profile)
router.post('/admin/:userId', isAdmin, 
    parser.fields([
        { name: 'image', maxCount: 1 }, 
        { name: 'id_card', maxCount: 1 } 
    ]), 
    async (req, res) => {
    
    const { college, branch, year, bio, price_per_session, session_duration_minutes, tags } = req.body;
    try {
        const profileFields = { user: req.params.userId };
        if (college) profileFields.college = college;
        if (branch) profileFields.branch = branch;
        if (year) profileFields.year = year;
        if (bio) profileFields.bio = bio;
        if (price_per_session) profileFields.price_per_session = price_per_session;
        if (session_duration_minutes) profileFields.session_duration_minutes = session_duration_minutes;
        
        let profile = await Profile.findOne({ user: req.params.userId });
        if (req.files && req.files['image']) {
            if (profile && profile.cloudinary_id) await cloudinary.uploader.destroy(profile.cloudinary_id);
            profileFields.avatar = req.files['image'][0].path;
            profileFields.cloudinary_id = req.files['image'][0].filename;
        }
        if (req.files && req.files['id_card']) {
            if (profile && profile.id_card_cloudinary_id) await cloudinary.uploader.destroy(profile.id_card_cloudinary_id);
            profileFields.id_card_url = req.files['id_card'][0].path;
            profileFields.id_card_cloudinary_id = req.files['id_card'][0].filename;
        }
        if (tags) {
            profileFields.tags = Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim());
        } else {
            profileFields.tags = [];
        }

        profile = await Profile.findOneAndUpdate(
            { user: req.params.userId }, { $set: profileFields }, { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        res.json(profile);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// ----------------------------------------------
// 2. SENIOR (सीनियर) / STUDENT (छात्र) API (API)
// ----------------------------------------------

// (GET /api/profile/all) (Student Dashboard) (छात्र डैशबोर्ड)
router.get('/all', auth, async (req, res) => {
    try {
        const seniors = await User.find({ isSenior: true }).select('_id');
        const seniorIds = seniors.map(senior => senior._id);
        const profiles = await Profile.find({ user: { $in: seniorIds } })
                                    .populate('user', 'name _id')
                                    .populate('tags', 'name') 
                                    .populate('college', 'name'); 
        res.json(profiles);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// (GET /api/profile/me) (Senior Dashboard) (सीनियर डैशबोर्ड)
router.get('/me', auth, async (req, res) => {
    try {
        const profile = await Profile.findOne({ user: req.user.id })
                                    .populate('user', ['name', 'email'])
                                    .populate('college', 'name')
                                    .populate('tags', 'name'); 
        if (!profile) return res.status(404).json({ msg: 'No profile found for this user' });
        res.json(profile);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// (PUT /api/profile/availability) (Weekly Schedule)
router.put('/availability', auth, async (req, res) => {
    const { availability } = req.body; 
    try {
        const profile = await Profile.findOneAndUpdate(
            { user: req.user.id }, { $set: { availability: availability } }, { new: true }
        );
        if (!profile) return res.status(404).json({ msg: 'Profile not found' });
        res.json(profile);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// --- STATS ROUTE ---
router.get('/senior/stats', auth, async (req, res) => {
    try {
        const seniorId = req.user.id;
        let settings = await SiteSettings.findOne();
        if (!settings) settings = new SiteSettings(); 
        const platformFee = settings.platformFee;
        const allBookings = await Booking.find({ senior: seniorId });

        let totalCompleted = 0, totalPending = 0, unpaidAmount = 0, totalPaidAmount = 0; 
        allBookings.forEach(booking => {
            const seniorEarning = booking.amount_paid - platformFee;
            if (booking.status === 'Completed') {
                totalCompleted++;
                if (booking.payout_status === 'Unpaid' && booking.dispute_status !== 'Pending') unpaidAmount += seniorEarning; 
                if (booking.payout_status === 'Paid') totalPaidAmount += seniorEarning; 
            } 
            else if (booking.status === 'Confirmed') totalPending++; 
        });
        res.json({ totalCompleted, totalPending, unpaidAmount, totalPaidAmount });
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// --- SENIOR PROFILE BY ID ---
router.get('/senior/:userId', auth, async (req, res) => {
    try {
        const profile = await Profile.findOne({ user: req.params.userId })
                                .populate('user', ['name'])
                                .populate('tags', 'name') 
                                .populate('college', 'name'); 
        if (!profile) return res.status(404).json({ msg: 'Senior profile not found' });
        res.json(profile);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// =========================================================
// 🚀 3. PUBLIC ROUTES (New Addition)
// =========================================================

// (GET /api/profile/public/top-rated) 
router.get('/public/top-rated', async (req, res) => {
    try {
        const profiles = await Profile.find()
            .populate('user', 'name avatar')
            .sort({ average_rating: -1 }) 
            .limit(5);

        res.json(profiles);
    } catch (err) { 
        console.error("Top Rated Error:", err.message); 
        res.status(500).send('Server Error'); 
    }
});

// =========================================================
// 🚀 4. NEW: AVAILABILITY OVERRIDE ROUTE (JO MISSING THA)
// =========================================================
router.put('/availability/override', auth, async (req, res) => {
    try {
        const { date, isUnavailable, startTime, endTime } = req.body;
        
        // 1. Profile find karo
        const profile = await Profile.findOne({ user: req.user.id });
        if (!profile) return res.status(404).json({ msg: "Profile not found" });

        // 2. Agar overrides array nahi hai to banao
        if (!profile.overrides) profile.overrides = [];

        // 3. Check karo agar date pehle se hai
        const existingIndex = profile.overrides.findIndex(o => o.date === date);

        if (existingIndex > -1) {
            // Update existing
            profile.overrides[existingIndex] = { date, isUnavailable, startTime, endTime };
        } else {
            // Add new
            profile.overrides.push({ date, isUnavailable, startTime, endTime });
        }

        // 4. Save karo
        await profile.save();
        res.json({ msg: "Date availability updated!", overrides: profile.overrides });

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;