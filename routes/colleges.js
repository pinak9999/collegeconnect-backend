const express = require('express');
const router = express.Router();
const isAdmin = require('../middleware/isAdmin');
const auth = require('../middleware/auth');
const College = require('../models/College');
const Profile = require('../models/Profile'); // 1. ('Profile' (प्रोफाइल) 'मॉडल' (model) (model) 'इम्पोर्ट' (import) (आयात) करें)

// (GET /api/colleges (वही है))
router.get('/', auth, async (req, res) => {
    try {
        const colleges = await College.find().sort({ name: 1 });
        res.json(colleges);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// (POST /api/colleges (वही है))
router.post('/', isAdmin, async (req, res) => {
    const { name } = req.body;
    try {
        let college = await College.findOne({ name: { $regex: new RegExp("^" + name + "$", "i") } });
        if (college) return res.status(400).json({ msg: 'College already exists' });
        college = new College({ name });
        await college.save();
        res.json(college);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

/**
 * @route   DELETE /api/colleges/:id
 * @desc    Delete a college (Admin Only) (FIXED)
 * @access  Private (isAdmin)
 */
router.delete('/:id', isAdmin, async (req, res) => {
    try {
        const collegeId = req.params.id;

        // 1. 'College' (कॉलेज) (कॉलेज) 'को' (to) 'डिलीट' (delete) (हटाएँ) 'करें' (Do)
        await College.findByIdAndDelete(collegeId);
        
        // 2. --- (यह रहा 'नया' (New) 'फिक्स' (Fix) (ठीक)) ---
        // ('सभी' (All) 'Profiles' (प्रोफाइल्स) (Profiles (प्रोफाइल)) 'में' (in) 'जाओ' (Go) 'और' (and) '`college`' (कॉलेज) (college) 'फील्ड' (field) (फ़ील्ड) 'को' (to) '`null`' (नल) (null (खाली)) 'सेट' (set) (सेट) 'कर' (do) 'दो' (it))
        await Profile.updateMany(
            { college: collegeId }, // ('सिर्फ' (Only) 'उन्हें' (them) 'ढूँढो' (find) 'जो' (which) 'इस्तेमाल' (use) 'कर' (doing) 'रहे' (are) 'हैं' (हैं))
            { $set: { college: null } } // ('उसे' (It) 'खाली' (blank) (ख़ाली) 'सेट' (set) (सेट) 'कर' (do) 'दो' (it))
        );
        // --- (अपडेट (Update) खत्म) ---

        res.json({ msg: 'College removed from database and all profiles.' });
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

module.exports = router;