const express = require('express');
const router = express.Router();
const isAdmin = require('../middleware/isAdmin');
const Booking = require('../models/Booking');
const SiteSettings = require('../models/SiteSettings');
const mongoose = require('mongoose');

// GET /api/payouts/admin
// GET /api/payouts/admin (Updated to exclude Promo Amount from Final Payout)
router.get('/admin', isAdmin, async (req, res) => {
    try {
        let settings = await SiteSettings.findOne();
        if (!settings) settings = new SiteSettings(); 
        const platformFee = settings.platformFee;

        const payouts = await Booking.aggregate([
            {
                $match: { 
                    payout_status: 'Unpaid', 
                    status: 'Completed',
                    dispute_status: { $ne: 'Pending' } 
                }
            },
            { $lookup: { from: 'profiles', localField: 'profile', foreignField: '_id', as: 'profileData' } },
            { $unwind: { path: '$profileData', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: '$senior', 
                    totalBookings: { $sum: 1 },
                    regularBookings: { $sum: { $cond: [{ $eq: ['$isPromotional', true] }, 0, 1] } },
                    promoBookings: { $sum: { $cond: [{ $eq: ['$isPromotional', true] }, 1, 0] } },
                    // 💰 Sirf Regular Bookings ka paisa total mein ginein
                    totalPaidByStudents: { 
                        $sum: { $cond: [{ $eq: ['$isPromotional', true] }, 0, '$amount_paid'] } 
                    }
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
                    regularBookings: 1, 
                    promoBookings: 1,   
                    totalPlatformFee: { $multiply: ['$regularBookings', platformFee] },
                    // ✅ FIXED: Final Payout sirf Paid sessions ka (Amount - Platform Fee)
                    // Promo sessions ka count dikhega par amount 0 rahega is calculation mein
                    finalPayoutAmount: { 
                        $subtract: ['$totalPaidByStudents', { $multiply: ['$regularBookings', platformFee] }] 
                    }
                }
            }
        ]);
        
        res.json(payouts);
    } catch (err) { 
        console.error(err.message); 
        res.status(500).send('Server Error'); 
    }
});
// (Mark as Paid (पेड (भुगतान) के रूप में मार्क (चिह्नित) करें) (वही है - PRESERVED))
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