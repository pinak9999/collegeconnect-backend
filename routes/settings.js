const express = require('express');
const router = express.Router();
const isAdmin = require('../middleware/isAdmin');
const SiteSettings = require('../models/SiteSettings');

// 'सेटिंग्स' (Settings) 'ऑब्जेक्ट' (object) को 'ढूँढने' (find) या 'बनाने' (create) के 'लिए' (for) 'हेल्पर' (helper)
const getSettings = async () => {
    let settings = await SiteSettings.findOne();
    if (!settings) {
        settings = new SiteSettings();
        await settings.save();
    }
    return settings;
};

/**
 * @route   GET /api/settings
 * @desc    Get current site settings
 * @access  Public
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

// PUT /api/settings/update-coupon (Admin Only)
router.put('/update-coupon', isAdmin, async (req, res) => {
    try {
        const { limit, isActive } = req.body;
        
        // 🔥 यहाँ हमने आपके बनाए हेल्पर फंक्शन का इस्तेमाल कर लिया
        let settings = await getSettings();
        
        if (limit !== undefined) settings.couponLimit = limit;
        if (isActive !== undefined) settings.isCouponActive = isActive;
        
        await settings.save();
        res.json({ msg: 'Coupon settings updated successfully', settings });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;