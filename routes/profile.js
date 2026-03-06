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
// 1. ADMIN (एडमिन) API
// ----------------------------------------------

// (Admin: Get specific user's ALL profiles)
router.get('/user/:userId', isAdmin, async (req, res) => {
    try {
        // 🚀 UPDATE: findOne की जगह find() का इस्तेमाल किया गया है ताकि सभी प्रोफाइल आएं
        let profiles = await Profile.find({ user: req.params.userId })
            .populate([
                { path: 'user', select: 'name email' },
                { path: 'college', select: 'name' },
                { path: 'tags', select: 'name' }
            ]);
            
        if (!profiles || profiles.length === 0) return res.status(404).json({ msg: 'No profiles found for this user.' });
        res.json(profiles); // अब यह Array रिटर्न करेगा
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// (Admin: Create/Update profile for a specific college)
router.post('/admin/:userId', isAdmin, 
    parser.fields([
        { name: 'image', maxCount: 1 }, 
        { name: 'id_card', maxCount: 1 } 
    ]), 
    async (req, res) => {
    
    // 🚀 NEW: req.body में display_name को भी शामिल किया गया है
    const { college, branch, year, bio, price_per_session, session_duration_minutes, tags, display_name } = req.body;
    
    // 🚀 UPDATE: College ID होना ज़रूरी है ताकि पता चले किस कॉलेज का प्रोफाइल बन/अपडेट हो रहा है
    if (!college) {
        return res.status(400).json({ msg: 'College is required to create or update a profile.' });
    }

    try {
        const profileFields = { user: req.params.userId, college: college };
        
        // 🚀 NEW: अगर display_name भेजा गया है, तो उसे सेव करें (खाली छोड़ने पर हट जाएगा)
        if (display_name !== undefined) profileFields.display_name = display_name;
        
        if (branch) profileFields.branch = branch;
        if (year) profileFields.year = year;
        if (bio) profileFields.bio = bio;
        if (price_per_session) profileFields.price_per_session = price_per_session;
        if (session_duration_minutes) profileFields.session_duration_minutes = session_duration_minutes;
        
        // 🚀 UPDATE: अब हम User ID और College ID दोनों के कॉम्बिनेशन से प्रोफाइल ढूँढेंगे
        let profile = await Profile.findOne({ user: req.params.userId, college: college });
        
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

        // 🚀 UPDATE: अगर इस कॉलेज का प्रोफाइल है तो अपडेट होगा, नहीं है तो नया बन जाएगा
        profile = await Profile.findOneAndUpdate(
            { user: req.params.userId, college: college }, 
            { $set: profileFields }, 
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        res.json(profile);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// ----------------------------------------------
// 2. SENIOR (सीनियर) / STUDENT (छात्र) API
// ----------------------------------------------

// (GET /api/profile/all) (Student Dashboard)
router.get('/all', auth, async (req, res) => {
    try {
        const seniors = await User.find({ isSenior: true }).select('_id');
        const seniorIds = seniors.map(senior => senior._id);
        // यह पहले से ही Array रिटर्न करता है, तो यह बिल्कुल सही काम करेगा
        const profiles = await Profile.find({ user: { $in: seniorIds } })
                                    .populate('user', 'name _id')
                                    .populate('tags', 'name') 
                                    .populate('college', 'name'); 
        res.json(profiles);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// (GET /api/profile/me) (Senior Dashboard)
router.get('/me', auth, async (req, res) => {
    try {
        // 🚀 UPDATE: findOne की जगह find() ताकि सीनियर को अपने सभी कॉलेज दिखें
        const profiles = await Profile.find({ user: req.user.id })
                                    .populate('user', ['name', 'email'])
                                    .populate('college', 'name')
                                    .populate('tags', 'name'); 
        if (!profiles || profiles.length === 0) return res.status(404).json({ msg: 'No profile found for this user' });
        res.json(profiles); // Array रिटर्न होगा
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// (PUT /api/profile/availability) (Senior Dashboard)
router.put('/availability', auth, async (req, res) => {
    const { availability } = req.body; 
    try {
        // 🚀 UPDATE: updateMany का इस्तेमाल ताकि टाइमिंग सभी प्रोफाइल्स पर एक साथ लग जाए
        await Profile.updateMany(
            { user: req.user.id }, 
            { $set: { availability: availability } }
        );
        
        // अपडेटेड प्रोफाइल्स रिटर्न कर रहे हैं
        const updatedProfiles = await Profile.find({ user: req.user.id });
        res.json(updatedProfiles);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// 🚀 --- UPDATED STATS ROUTE (Free sessions earning se hata diye gaye) ---
router.get('/senior/stats', auth, async (req, res) => {
    try {
        const seniorId = req.user.id;
        let settings = await SiteSettings.findOne();
        if (!settings) settings = new SiteSettings(); 
        const platformFee = settings.platformFee;

        // यह बुकिंग्स वाला लॉजिक मल्टीपल प्रोफाइल्स के साथ भी परफेक्ट काम करेगा
        const allBookings = await Booking.find({ senior: seniorId });

        let totalCompleted = 0, totalPending = 0, unpaidAmount = 0, totalPaidAmount = 0; 
        
        allBookings.forEach(booking => {
            const isPromo = booking.isPromotional || booking.paymentMethod === 'Coupon_Free';

            if (booking.status === 'Completed') {
                totalCompleted++;

                if (!isPromo) {
                    const seniorEarning = booking.amount_paid - platformFee;
                    
                    if (booking.payout_status === 'Unpaid' && booking.dispute_status !== 'Pending') {
                        unpaidAmount += seniorEarning; 
                    }
                    if (booking.payout_status === 'Paid') {
                        totalPaidAmount += seniorEarning; 
                    }
                }
            } 
            else if (booking.status === 'Confirmed') {
                totalPending++; 
            }
        });
        
        res.json({ totalCompleted, totalPending, unpaidAmount, totalPaidAmount });
    } catch (err) { 
        console.error(err.message); 
        res.status(500).send('Server Error'); 
    }
});

// --- SENIOR PROFILE BY ID (For Student View) ---
router.get('/senior/:userId', auth, async (req, res) => {
    try {
        // 🚀 UPDATE: अगर स्टूडेंट ने किसी खास कॉलेज से क्लिक किया है, तो वही प्रोफाइल दिखाएं
        let query = { user: req.params.userId };
        if (req.query.college) {
            query.college = req.query.college;
        }

        const profile = await Profile.findOne(query)
                                .populate('user', ['name'])
                                .populate('tags', 'name') 
                                .populate('college', 'name'); 
                                
        if (!profile) return res.status(404).json({ msg: 'Senior profile not found' });
        res.json(profile);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// =========================================================
// 🚀 3. PUBLIC ROUTES 
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

module.exports = router;