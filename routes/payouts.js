const express = require('express');
const router = express.Router();
const isAdmin = require('../middleware/isAdmin');
const Booking = require('../models/Booking');
const SiteSettings = require('../models/SiteSettings');

// Get Admin Payouts
router.get('/admin', isAdmin, async (req, res) => {
    try {
        let settings = await SiteSettings.findOne();
        if (!settings) settings = new SiteSettings();
        const platformFee = settings.platformFee || 20;

        // Logic Fix: Strictly filter out pending disputes
        const payouts = await Booking.aggregate([
            {
                $match: { 
                    payout_status: 'Unpaid', 
                    status: 'Completed',
                    dispute_status: { $ne: 'Pending' } // Ensure no pending disputes
                }
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
                    // Calculate final payout: Total Collected - (Bookings * Fee)
                    finalPayoutAmount: { $subtract: ['$totalAmountPaidByStudents', { $multiply: ['$totalBookings', platformFee] }] }
                }
            }
        ]);
        
        res.json(payouts);
    } catch (err) { 
        console.error("Payout Error:", err.message); 
        res.status(500).send('Server Error'); 
    }
});

// Mark as Paid
router.put('/mark-paid/:seniorId', isAdmin, async (req, res) => {
    try {
        const seniorId = req.params.seniorId;
        
        // Update only eligible bookings
        const updateResult = await Booking.updateMany(
            { 
                senior: seniorId, 
                payout_status: 'Unpaid', 
                status: 'Completed', 
                dispute_status: { $ne: 'Pending' } 
            },
            { $set: { payout_status: 'Paid' } }
        );

        if (updateResult.modifiedCount === 0) {
            return res.status(404).json({ msg: 'No eligible bookings found to pay.' });
        }
        
        res.json({ msg: `${updateResult.modifiedCount} bookings marked as Paid.` });
    } catch (err) { 
        console.error("Mark Paid Error:", err.message); 
        res.status(500).send('Server Error'); 
    }
});

module.exports = router;