const express = require('express');
const router = express.Router();
const isAdmin = require('../middleware/isAdmin');
const Booking = require('../models/Booking');
const SiteSettings = require('../models/SiteSettings');
const mongoose = require('mongoose');

// GET /api/payouts/admin
router.get('/admin', isAdmin, async (req, res) => {
    try {
        let settings = await SiteSettings.findOne();
        if (!settings) settings = new SiteSettings(); // (डिफ़ॉल्ट' (Default) (डिफ़ॉल्ट) 'बनाएँ' (Create))
        const platformFee = settings.platformFee;

        const payouts = await Booking.aggregate([
            {
                // --- (यह रहा 100% "Accurate" (सही) 'फिक्स' (Fix) (ठीक)) ---
                $match: { 
                    payout_status: 'Unpaid', 
                    status: 'Completed',
                    // (सिर्फ (Only) 'उन्हें' (them) 'लाओ' (Fetch) 'जिनका' (whose) 'Dispute' (विवाद) 'Pending' (पेंडिंग) (लंबित) 'नहीं' (NOT) 'है' (is))
                    dispute_status: { $ne: 'Pending' } 
                }
                // --- (अपडेट (Update) खत्म) ---
            },
            {
                $group: {
                    _id: '$senior', 
                    totalBookings: { $sum: 1 },
                    totalAmountPaidByStudents: { $sum: '$amount_paid' } 
                }
            },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'seniorDetails' } },
            { $unwind: '$seniorDetails' },
            {
                $project: { 
                    seniorId: '$_id',
                    seniorName: '$seniorDetails.name',
                    seniorEmail: '$seniorDetails.email',
                    totalBookings: 1,
                    totalPlatformFee: { $multiply: ['$totalBookings', platformFee] },
                    finalPayoutAmount: { $subtract: ['$totalAmountPaidByStudents', { $multiply: ['$totalBookings', platformFee] }] }
                }
            }
        ]);
        
        // (हम 'finalPayoutAmount' (अंतिम भुगतान राशि) 'को' (to) 'री-नेम' (rename) (नाम बदल) 'कर' (doing) 'रहे' (are) 'हैं' (हैं) 'ताकि' (so that) 'यह' (it) 'फ्रंटएंड' (Frontend) 'से' (from) 'मैच' (match) (मेल) 'करे' (does))
        const finalPayouts = payouts.map(p => ({
            ...p,
            finalPayoutAmount: p.finalPayoutAmount 
        }));

        res.json(finalPayouts);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// (Mark as Paid (पेड (भुगतान) के रूप में मार्क (चिह्नित) करें) (वही है))
router.put('/mark-paid/:seniorId', isAdmin, async (req, res) => {
    try {
        const seniorId = req.params.seniorId;
        // ('यह' (This) 'भी' (also) 'डिस्प्यूट' (dispute) (विवाद) 'चेक' (check) (जाँच) 'करेगा' (will do))
        const updateResult = await Booking.updateMany(
            { senior: seniorId, payout_status: 'Unpaid', status: 'Completed', dispute_status: { $ne: 'Pending' } },
            { $set: { payout_status: 'Paid' } }
        );
        if (updateResult.modifiedCount === 0) return res.status(404).json({ msg: 'No completed unpaid bookings found.' });
        res.json({ msg: `${updateResult.modifiedCount} bookings marked as 'Paid'.` });
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

module.exports = router;