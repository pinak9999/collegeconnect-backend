// routes/predictor.js
const express = require('express');
const router = express.Router();
const Cutoff = require('../models/Cutoff');

router.post('/predict', async (req, res) => {
  try {
    const { score, category, mode } = req.body;
    const userScore = parseFloat(score);

    if (!userScore || !category || !mode) {
      return res.status(400).json({ msg: "Please provide score, category, and mode" });
    }

    // 🚀 स्मार्ट एल्गोरिदम: हम डेटाबेस से वो कॉलेज निकालेंगे जिनकी कटऑफ 
    // यूज़र के स्कोर से अधिकतम 2% ज्यादा हो (ताकि काउंसलिंग के 2nd/3rd राउंड में मिलने वाले कॉलेज भी दिखें)
    const maxCutoffAllowed = userScore + 2.0;

    const cutoffs = await Cutoff.find({
      category: category,
      mode: mode,
      closingScore: { $lte: maxCutoffAllowed }
    }).sort({ closingScore: -1 }); // सबसे हाई कटऑफ वाले (बेस्ट कॉलेज) सबसे ऊपर दिखेंगे

    // 🎯 High / Medium Chance कैलकुलेट करना
    const predictions = cutoffs.map(item => {
      let chance = "Low";
      const diff = userScore - item.closingScore;

      if (diff >= 0) {
        chance = "High"; // स्कोर कटऑफ से ज्यादा या बराबर है (पक्का मिलेगा)
      } else if (diff >= -1.5) {
        chance = "Medium"; // स्कोर थोड़ा सा कम है (Spot round में मिल सकता है)
      } else {
        chance = "Low"; // बहुत मुश्किल है
      }

      return {
        name: item.collegeName,
        branch: item.branch,
        chance: chance,
        cutoff: item.closingScore // चाहो तो आप फ्रंटएंड पर दिखा सकते हो कि पिछले साल कटऑफ क्या थी
      };
    });

    // सिर्फ़ High और Medium चांस वाले कॉलेज ही फ़िल्टर करें
    const realisticPredictions = predictions.filter(p => p.chance !== "Low");

    res.json(realisticPredictions);

  } catch (err) {
    console.error('Predictor Error:', err.message);
    res.status(500).json({ msg: "Server Error" });
  }
});

module.exports = router;