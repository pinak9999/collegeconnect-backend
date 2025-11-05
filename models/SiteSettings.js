const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// (यह 'मॉडल' (model) 'पूरी' (entire) 'साइट' (site) में 'सिर्फ' (only) 'एक' (one) 'डॉक्यूमेंट' (document) (दस्तावेज़) 'रखेगा' (will hold))
const SiteSettingsSchema = new Schema({
    // (यह 'Admin' (एडमिन) 'सेट' (set) करेगा (जैसे, 20))
    platformFee: {
        type: Number,
        required: true,
        default: 20 // 'डिफ़ॉल्ट' (Default) (डिफ़ॉल्ट) ₹20
    }
});

module.exports = SiteSettings = mongoose.model('sitesettings', SiteSettingsSchema);