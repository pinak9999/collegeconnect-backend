const express = require('express');
const router = express.Router();
const axios = require('axios'); // Google SDK हटा दिया, अब हम सीधा Axios यूज़ करेंगे
const Profile = require('../models/Profile'); 

router.post('/', async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ msg: "Please enter a query." });

        // 1. डेटाबेस से सीनियर्स का डेटा निकालें
        const profiles = await Profile.find()
            .populate('user', 'name')
            .populate('college', 'name')
            .populate('tags', 'name');

        if (!profiles || profiles.length === 0) {
            return res.status(404).json({ msg: "No mentors found in the database." });
        }

        const mentorsData = profiles.map(p => ({
            id: p._id,
            name: p.user?.name || "Unknown",
            college: p.college?.name || "Unknown",
            branch: p.branch || "General",
            bio: p.bio || "",
            tags: p.tags?.map(t => t.name).join(', ') || ""
        }));

        const prompt = `You are an expert college counseling AI. A student asked: "${query}".
        Here is the JSON list of available mentors: ${JSON.stringify(mentorsData)}.
        
        Task: Find the top 3 most relevant mentors for this student.
        CRITICAL RULE: Return ONLY a valid JSON array of objects. Do NOT add any markdown, backticks (\`\`\`), or extra conversational text.
        
        Format exactly like this:
        [
          { "profileId": "exact_id_here", "aiReason": "A short, 1-sentence personalized reason." }
        ]`;

        // 🚀 2. DIRECT API CALL (बिना किसी Google Package के)
        const API_KEY = process.env.GEMINI_API_KEY;
        // ✅ लेटेस्ट मॉडल (gemini-2.5-flash) लगा दिया है
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
        
        const response = await axios.post(url, {
            contents: [{ parts: [{ text: prompt }] }]
        }, {
            headers: { 'Content-Type': 'application/json' }
        });

        // 3. AI का जवाब निकालें
        let aiResponse = response.data.candidates[0].content.parts[0].text;

        // 4. Safely Parse JSON
        let recommendations = [];
        try {
            const cleanedResponse = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            const jsonStartIndex = cleanedResponse.indexOf('[');
            const jsonEndIndex = cleanedResponse.lastIndexOf(']');
            
            if (jsonStartIndex === -1 || jsonEndIndex === -1) throw new Error("Invalid JSON from AI");
            
            const validJsonString = cleanedResponse.substring(jsonStartIndex, jsonEndIndex + 1);
            recommendations = JSON.parse(validJsonString);
        } catch (parseError) {
            console.error("❌ JSON Parse Error:", aiResponse);
            return res.status(500).json({ msg: "AI returned an invalid format. Please try again." });
        }

        // 5. IDs को डेटाबेस के डेटा से मैच करें
        const finalResults = recommendations.map(rec => {
            const fullProfile = profiles.find(p => p._id.toString() === String(rec.profileId));
            if (!fullProfile) return null;
            return { ...fullProfile.toObject(), aiReason: rec.aiReason };
        }).filter(p => p !== null);

        if (finalResults.length === 0) {
            return res.status(200).json({ success: true, matches: [], msg: "No perfect match found." });
        }

        res.json({ success: true, matches: finalResults });

    } catch (err) {
        // 🔥 अब अगर एरर आएगा, तो Google का असली एरर टर्मिनल में छपेगा
        console.error("❌ Direct API Call Error:", err.response ? JSON.stringify(err.response.data, null, 2) : err.message);
        res.status(500).json({ msg: "Server error during AI match." });
    }
});

module.exports = router;