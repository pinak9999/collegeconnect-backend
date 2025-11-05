const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// --- (!! ज़रूरी: अपनी 'Keys' (कीज़) (चाबियाँ) यहाँ डालें !!) ---
cloudinary.config({
  cloud_name: 'dun5iayt2', // (Cloudinary (क्लाउडिनरी) 'डैशबोर्ड' (dashboard) से)
  api_key: '358797724419418', // (Cloudinary (क्लाउडिनरी) 'डैशबोर्ड' (dashboard) से)
  api_secret: '1uIyvk4DfEgZDGbIJJXaomVFbjg' // (Cloudinary (क्लाउडिनरी) 'डैशबोर्ड' (dashboard) से)
});
// ---

// (यह 'Multer' (मल्टर) (multer) को 'बताता' (tells) 'है' (it) 'कि' (that) 'फाइल्स' (files) (files) 'सीधे' (directly) 'Cloudinary' (क्लाउडिनरी) (Cloudinary (क्लाउडिनरी)) 'पर' (on) 'अपलोड' (upload) (अपलोड) 'करो' (do))
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'collegeconnect_seniors', // (Cloudinary (क्लाउडिनरी) में 'इस' (this) 'फोल्डर' (folder) 'में' (in) 'सेव' (save) (सहेजें) 'करो' (do))
    allowed_formats: ['jpg', 'png', 'jpeg'] // ('सिर्फ' (Only) 'इन' (these) 'फॉर्मेट्स' (formats) (प्रारूपों) 'को' (to) 'अलाउ' (allow) (अनुमति) 'करो' (do))
  }
});

// (यह 'हमारा' (our) 'अपलोडर' (uploader) (अपलोडर) 'टूल' (tool) (उपकरण) है)
const parser = multer({ storage: storage });

module.exports = { cloudinary, parser };