const express = require('express');
const router = express.Router();
const isAdmin = require('../middleware/isAdmin');
const auth = require('../middleware/auth');
const College = require('../models/College');
const Profile = require('../models/Profile'); 

// (GET /api/colleges)
router.get('/', auth, async (req, res) => {
    try {
        const colleges = await College.find().sort({ name: 1 });
        res.json(colleges);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// (POST /api/colleges)
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
 * @desc    Delete a college (Admin Only)
 * @access  Private (isAdmin)
 */
router.delete('/:id', isAdmin, async (req, res) => {
    try {
        const collegeId = req.params.id;

        // 1. College को डिलीट करें
        await College.findByIdAndDelete(collegeId);
        
        // 2. 🚀 NEW FIX: चूँकि अब हर कॉलेज का एक अलग प्रोफाइल डॉक्युमेंट है, 
        // इसलिए अगर कॉलेज डिलीट होता है, तो उस कॉलेज के प्रोफाइल डॉक्युमेंट्स को भी हटा दें।
        await Profile.deleteMany({ college: collegeId });

        res.json({ msg: 'College removed from database and all related profiles deleted.' });
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

module.exports = router;