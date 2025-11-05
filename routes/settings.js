const express = require('express');
const router = express.Router();
const isAdmin = require('../middleware/isAdmin');
const SiteSettings = require('../models/SiteSettings');

// 'सेटिंग्स' (Settings) 'ऑब्जेक्ट' (object) को 'ढूँढने' (find) या 'बनाने' (create) के 'लिए' (for) 'हेल्पर' (helper) (helper)
const getSettings = async () => {
    let settings = await SiteSettings.findOne();
    if (!settings) {
        // (अगर 'सेटिंग्स' (settings) 'पहली' (first) 'बार' (time) 'लोड' (load) हो 'रही' (being) 'हैं' (are), 'तो' (then) 'डिफ़ॉल्ट' (default) (डिफ़ॉल्ट) 'बनाएँ' (create))
        settings = new SiteSettings();
        await settings.save();
    }
    return settings;
};

/**
 * @route   GET /api/settings
 * @desc    Get current site settings
 * @access  Public (या 'Auth' (ऑथ) (auth))
 */
router.get('/', async (req, res) => {
    try {
        const settings = await getSettings();
        res.json(settings);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

/**
 * @route   PUT /api/settings
 * @desc    Update site settings (Admin Only)
 * @access  Private (isAdmin)
 */
router.put('/', isAdmin, async (req, res) => {
    const { platformFee } = req.body;
    try {
        const settings = await getSettings();
        
        if (platformFee) settings.platformFee = platformFee;
        
        await settings.save();
        res.json(settings);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

module.exports = router;