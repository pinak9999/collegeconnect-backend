// routes/predictor.js
const express = require('express');
const router = express.Router();
const Cutoff = require('../models/Cutoff');

router.post('/predict', async (req, res) => {
  try {
    const { score, category, mode, domicile, gender } = req.body;
    let userScore = parseFloat(score);

    if (!userScore || !category || !mode) {
      return res.status(400).json({ msg: "Incomplete data provided" });
    }

    // ==========================================
    // 🧠 REAP SMART ALGORITHM (CATEGORY BOOSTER)
    // ==========================================
    let effectiveScore = userScore;
    
    // Rule 1: Outside Rajasthan gets General Category (No Reservation)
    if (domicile === "Outside Rajasthan") {
      effectiveScore -= 1.0; // बाहरी छात्रों के लिए कॉम्पिटिशन ज्यादा है
    } else {
      // Rule 2: Category Boost (सिर्फ़ राजस्थान के छात्रों के लिए)
      // चूँकि डेटाबेस में GEN की कटऑफ है, हम रिज़र्व कैटेगरी वाले छात्रों 
      // के स्कोर को गणितीय रूप से बढ़ाकर GEN से मैच करेंगे।
      if (category === "OBC") effectiveScore += 2.5;
      else if (category === "EWS") effectiveScore += 3.0;
      else if (category === "MBC") effectiveScore += 4.0;
      else if (category === "SC") effectiveScore += 10.0;
      else if (category === "ST") effectiveScore += 12.0;
    }

    // Rule 3: Female Quota (Horizontal 25% Reservation)
    // लड़कियों को कटऑफ में थोड़ी छूट मिलती है
    if (gender === "Female" && domicile === "Rajasthan") {
      effectiveScore += 1.5; 
    }

    // Find colleges where closing score is reachable
    const maxCutoffAllowed = effectiveScore + 2.0;

    // 🎯 ध्यान दें: अब हम हमेशा डेटाबेस में "GEN" कैटेगरी ही ढूँढेंगे, 
    // क्योंकि हमने स्टूडेंट के नंबर उसकी कैटेगरी के हिसाब से बढ़ा दिए हैं!
    const cutoffs = await Cutoff.find({
      category: "GEN", 
      mode: mode,
      closingScore: { $lte: maxCutoffAllowed }
    }).sort({ closingScore: -1 });

    const predictions = cutoffs.map(item => {
      let chance = "Low";
      // effectiveScore से तुलना करेंगे
      const diff = effectiveScore - item.closingScore;

      if (diff >= 0) chance = "High"; 
      else if (diff >= -2.0) chance = "Medium"; 

      return {
        name: item.collegeName,
        branch: item.branch,
        chance: chance
      };
    });

    // सिर्फ़ High और Medium चांस वाले दिखाएं
    const realisticPredictions = predictions.filter(p => p.chance !== "Low");
    
    res.json(realisticPredictions);

  } catch (err) {
    console.error('Predictor Error:', err.message);
    res.status(500).json({ msg: "Server Error" });
  }
});

module.exports = router;