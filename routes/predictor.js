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
    // 🧠 REAP REAL ALGORITHM (RULES APPLIED)
    // ==========================================
    let effectiveCategory = category;
    
    // Rule 1: Outside Rajasthan gets General Category (No Reservation)
    if (domicile === "Outside Rajasthan") {
      effectiveCategory = "GEN";
      userScore -= 1.0; // Competition for 15% seats is higher, so effectively their score holds slightly less weight
    }

    // Rule 2: Female Quota (Horizontal 25% Reservation)
    // Girls get colleges at slightly lower cutoffs, so we mathematically boost their score for prediction
    if (gender === "Female" && domicile === "Rajasthan") {
      userScore += 1.5; 
    }

    // If EWS or MBC is selected but not in DB yet, map to closest equivalent for prediction
    // (You can add real EWS data in DB later, for now we map EWS->GEN with lower cutoff, MBC->OBC)
    let searchCategory = effectiveCategory;
    if (effectiveCategory === "EWS") {
       searchCategory = "GEN";
       userScore += 1.0; // EWS cutoff is lower than GEN
    }
    if (effectiveCategory === "MBC") {
       searchCategory = "OBC"; 
       userScore += 0.5; // MBC is close to OBC
    }

    // Find colleges where closing score is reachable (max +2% tolerance)
    const maxCutoffAllowed = userScore + 2.0;

    const cutoffs = await Cutoff.find({
      category: searchCategory,
      mode: mode,
      closingScore: { $lte: maxCutoffAllowed }
    }).sort({ closingScore: -1 });

    const predictions = cutoffs.map(item => {
      let chance = "Low";
      const diff = userScore - item.closingScore;

      if (diff >= 0) chance = "High"; 
      else if (diff >= -1.5) chance = "Medium"; 

      return {
        name: item.collegeName,
        branch: item.branch,
        chance: chance
      };
    });

    const realisticPredictions = predictions.filter(p => p.chance !== "Low");
    res.json(realisticPredictions);

  } catch (err) {
    console.error('Predictor Error:', err.message);
    res.status(500).json({ msg: "Server Error" });
  }
});

module.exports = router;