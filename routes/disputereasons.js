const express = require('express');
const router = express.Router();
const isAdmin = require('../middleware/isAdmin');
const auth = require('../middleware/auth');
const DisputeReason = require('../models/DisputeReason');
const Booking = require('../models/Booking');

// GET /api/disputereasons (Get all reasons) (Auth)
router.get('/', auth, async (req, res) => {
    try {
        const reasons = await DisputeReason.find().sort({ reason: 1 });
        res.json(reasons);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// POST /api/disputereasons (Create a reason) (Admin Only)
router.post('/', isAdmin, async (req, res) => {
    const { reason } = req.body;
    try {
        let disputeReason = await DisputeReason.findOne({ reason: { $regex: new RegExp("^" + reason + "$", "i") } });
        if (disputeReason) return res.status(400).json({ msg: 'Dispute reason already exists' });
        
        disputeReason = new DisputeReason({ reason });
        await disputeReason.save();
        res.json(disputeReason);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// DELETE /api/disputereasons/:id (Delete a reason) (Admin Only)
router.delete('/:id', isAdmin, async (req, res) => {
    try {
        const reasonInUse = await Booking.findOne({ dispute_reason: req.params.id });
        if (reasonInUse) {
            return res.status(400).json({ msg: 'Cannot delete: Reason is in use by a Booking.' });
        }
        
        await DisputeReason.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Dispute reason removed' });
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

module.exports = router;