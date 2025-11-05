const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// (यह 'Tag' (टैग) (टैग) 'मॉडल' (model) (model) 'Admin' (एडमिन) 'मैनेज' (manage) (प्रबंधित) करेगा)
const TagSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true // (हर 'टैग' (tag) (टैग) 'यूनिक' (unique) (अनोखा) होगा)
    }
});

module.exports = Tag = mongoose.model('tag', TagSchema);