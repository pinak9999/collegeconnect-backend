const express = require('express');
const router = express.Router();
const isAdmin = require('../middleware/isAdmin');
const Booking = require('../models/Booking');
const SiteSettings = require('../models/SiteSettings');
const mongoose = require('mongoose');

// ---------------------------------------------------
// 💰 GET /api/payouts/admin
// ---------------------------------------------------
router.get('/admin', isAdmin, async (req, res) => {
    try {
        let settings = await SiteSettings.findOne();
        if (!settings) settings = new SiteSettings(); 
        const platformFee = settings.platformFee;

        const payouts = await Booking.aggregate([
            {
                // 1. Sirf wahi bookings jo completed hain aur unpaid hain
                $match: { 
                    payout_status: 'Unpaid', 
                    status: 'Completed',
                    dispute_status: { $ne: 'Pending' } 
                }
            },
            // 2. Profile data fetch karein (zaroorat padne par future use ke liye)
            { $lookup: { from: 'profiles', localField: 'profile', foreignField: '_id', as: 'profileData' } },
            { $unwind: { path: '$profileData', preserveNullAndEmptyArrays: true } },
            
                // 3. Senior ke hisaab से ग्रुपिंग और कैलकुलेशन
      {
                $group: {
                    _id: '$senior', 
                    totalBookings: { $sum: 1 },
                    
                    // ✅ NEW LOGIC: Agar amount_paid 0 se zyada hai, tabhi use Regular maano
                    regularBookings: { 
                        $sum: { 
                            $cond: [
                                { $gt: ['$amount_paid', 0] }, // Kya amount 0 se bada hai?
                                1,                            // Haan -> Regular
                                0                             // Nahi -> Promo
                            ] 
                        } 
                    },

                    // ✅ NEW LOGIC: Agar amount_paid 0 hai, to wo Promo hai
                    promoBookings: { 
                        $sum: { 
                            $cond: [
                                { $eq: ['$amount_paid', 0] }, // Kya amount 0 hai?
                                1,                            // Haan -> Promo
                                0                             // Nahi -> Regular
                            ] 
                        } 
                    },

                    // 💰 Payout Calculation: Sirf wahi paisa jo students ne diya
                    totalPaidByStudents: { 
                        $sum: { $cond: [{ $gt: ['$amount_paid', 0] }, '$amount_paid', 0] } 
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
                    // Platform Fee sirf Regular sessions par calculate hogi
                    totalPlatformFee: { $multiply: ['$regularBookings', platformFee] },
                    // Final Payout logic
                    finalPayoutAmount: { 
                        $subtract: ['$totalPaidByStudents', { $multiply: ['$regularBookings', platformFee] }] 
                    }
                }
            }
        ]);
        
        res.json(payouts);
    } catch (err) { 
        console.error("Payout Admin Error:", err.message); 
        res.status(500).send('Server Error'); 
    }
});

// ---------------------------------------------------
// ✅ PUT /api/payouts/mark-paid/:seniorId
// ---------------------------------------------------
router.put('/mark-paid/:seniorId', isAdmin, async (req, res) => {
    try {
        const seniorId = req.params.seniorId;
        // Payout status ko 'Paid' karein sabhi eligible bookings ke liye
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
            return res.status(404).json({ msg: 'No completed unpaid bookings found.' });
        }
        
        res.json({ msg: `${updateResult.modifiedCount} bookings marked as 'Paid'.` });
    } catch (err) { 
        console.error("Mark Paid Error:", err.message); 
        res.status(500).send('Server Error'); 
    }
});

module.exports = router;