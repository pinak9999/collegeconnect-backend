const express = require('express');
const router = express.Router();
const isAdmin = require('../middleware/isAdmin');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Booking = require('../models/Booking');
const { cloudinary } = require('../config/cloudinary'); // 1. (Cloudinary (क्लाउडिनरी) (Cloudinary (क्लाउडिनरी)) 'इम्पोर्ट' (import) (आयात) करें)

// (GET /api/users (Pagination (पेजिनेशन) (पृष्ठांकन) 'वाला' (wala) 'कोड' (code)))
router.get('/', isAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1');
    const limit = parseInt(req.query.limit || '10');
    const skip = (page - 1) * limit;
    const users = await User.find().select('-password').sort({ register_date: -1 }).limit(limit).skip(skip);
    const totalUsers = await User.countDocuments();
    res.json({
        users: users,
        totalUsers: totalUsers,
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit)
    });
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// (Make Senior (मेक सीनियर) (वही है))
router.put('/:id/make-senior', isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    user.isSenior = true;
    await user.save();
    let profile = await Profile.findOne({ user: req.params.id });
    if (!profile) {
        profile = new Profile({ user: req.params.id });
        await profile.save();
    }
    const updatedUser = await User.findById(req.params.id).select('-password');
    res.json(updatedUser);
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete a user and all related data (Admin Only) (FIXED)
 * @access  Private (isAdmin)
 */
router.delete('/:id', isAdmin, async (req, res) => {
    try {
        const userIdToDelete = req.params.id;
        const userCheck = await User.findById(userIdToDelete);
        if (!userCheck) return res.status(404).json({ msg: 'User not found' });
        if (userCheck.role === 'Admin') return res.status(403).json({ msg: 'Cannot delete an Admin account.' });
        
        // --- 2. (यह रहा 'नया' (New) 'Storage Leak' (स्टोरेज लीक) (भंडारण रिसाव) 'फिक्स' (Fix) (ठीक)) ---
        // ('चेक' (Check) (जाँच) 'करो' (do) 'अगर' (if) 'यह' (this) 'यूज़र' (user) (उपयोगकर्ता) 'Senior' (सीनियर) (सीनियर) 'था' (was))
        if (userCheck.isSenior) {
            const profile = await Profile.findOne({ user: userIdToDelete });
            if (profile) {
                // (अगर 'Avatar' (अवतार) (avatar) 'है' (is), 'तो' (then) 'Cloudinary' (क्लाउडिनरी) (Cloudinary (क्लाउडिनरी)) 'से' (from) 'डिलीट' (delete) (हटाएँ) 'करो' (do))
                if (profile.cloudinary_id) {
                    await cloudinary.uploader.destroy(profile.cloudinary_id);
                }
                // (अगर 'ID Card' (आईडी कार्ड) (पहचान पत्र) 'है' (is), 'तो' (then) 'उसे' (it) 'भी' (also) 'डिलीट' (delete) (हटाएँ) 'करो' (do))
                if (profile.id_card_cloudinary_id) {
                    await cloudinary.uploader.destroy(profile.id_card_cloudinary_id);
                }
            }
        }
        // --- (अपडेट (Update) खत्म) ---

        // 3. ('अब' (Now) 'डेटाबेस' (database) (Database (डेटाबेस)) 'से' (from) 'सब' (everything) 'डिलीट' (delete) (हटाएँ) 'करो' (do))
        await Profile.deleteMany({ user: userIdToDelete });
        await Booking.deleteMany({ $or: [{ student: userIdToDelete }, { senior: userIdToDelete }] });
        await User.findByIdAndDelete(userIdToDelete);

        res.json({ msg: 'User and associated data (including images) successfully deleted.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;