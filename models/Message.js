const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MessageSchema = new Schema({
    booking: { // 'यह' (This) 'मैसेज' (message) (संदेश) 'किस' (which) 'बुकिंग' (booking) 'का' (of) 'है' (is)?
        type: Schema.Types.ObjectId,
        ref: 'booking'
    },
    sender: { // 'किसने' (Who) 'भेजा' (sent)? (Student (छात्र) / Senior (सीनियर))
        type: Schema.Types.ObjectId,
        ref: 'user'
    },
    receiver: { // 'किसे' (To whom) 'भेजा' (sent)?
        type: Schema.Types.ObjectId,
        ref: 'user'
    },
    text: { // 'क्या' (What) 'भेजा' (sent)?
        type: String,
        required: true
    },
    timestamp: { // 'कब' (When) 'भेजा' (sent)?
        type: Date,
        default: Date.now
    }
});

module.exports = Message = mongoose.model('message', MessageSchema);