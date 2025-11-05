const express = require('express');
const router = express.Router();
const isAdmin = require('../middleware/isAdmin');
const auth = require('../middleware/auth');
const Tag = require('../models/Tag');
const Profile = require('../models/Profile'); // 1. ('Profile' (प्रोफाइल) 'मॉडल' (model) (model) 'इम्पोर्ट' (import) (आयात) करें)

// (GET /api/tags (वही है))
router.get('/', auth, async (req, res) => {
    try {
        const tags = await Tag.find().sort({ name: 1 });
        res.json(tags);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// (POST /api/tags (वही है))
router.post('/', isAdmin, async (req, res) => {
    const { name } = req.body;
    try {
        let tag = await Tag.findOne({ name: { $regex: new RegExp("^" + name + "$", "i") } });
        if (tag) return res.status(400).json({ msg: 'Tag already exists' });
        tag = new Tag({ name });
        await tag.save();
        res.json(tag);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

/**
 * @route   DELETE /api/tags/:id
 * @desc    Delete a tag (Admin Only) (FIXED)
 * @access  Private (isAdmin)
 */
router.delete('/:id', isAdmin, async (req, res) => {
    try {
        const tagId = req.params.id;

        // 1. 'Tag' (टैग) (टैग) 'को' (to) 'डिलीट' (delete) (हटाएँ) 'करें' (Do)
        await Tag.findByIdAndDelete(tagId);
        
        // 2. --- (यह रहा 'नया' (New) 'फिक्स' (Fix) (ठीक)) ---
        // ('सभी' (All) 'Profiles' (प्रोफाइल्स) (Profiles (प्रोफाइल)) 'में' (in) 'जाओ' (Go) 'और' (and) 'इस' (this) '`tagId`' (टैगआईडी) (tagId) 'को' (to) '`tags`' (टैग्स) (tags) 'Array' (ऐरे) (सरणी) 'से' (from) '`$pull`' (पुल) (pull (खींच)) 'करो' (do))
        await Profile.updateMany(
            { tags: tagId }, // ('सिर्फ' (Only) 'उन्हें' (them) 'ढूँढो' (find) 'जो' (which) 'इस्तेमाल' (use) 'कर' (doing) 'रहे' (are) 'हैं' (हैं))
            { $pull: { tags: tagId } } // ('उसे' (It) 'हटा' (Remove) 'दो' (it))
        );
        // --- (अपडेट (Update) खत्म) ---

        res.json({ msg: 'Tag removed from database and all profiles.' });
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

module.exports = router;