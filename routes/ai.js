require("dotenv").config();
const express = require("express");
const Groq = require("groq-sdk");

const router = express.Router();

console.log("🔑 GROQ KEY:", process.env.GROQ_API_KEY ? "LOADED" : "MISSING");

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

router.post("/chat", async (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ msg: "Query missing" });
    }

    const completion = await client.chat.completions.create({
      model: "llama3-8b-8192",
      messages: [
        {
          role: "system",
          content:
            "You are REAP assistant. Answer in Hindi-English mix related to Rajasthan REAP colleges, branches, fees, cut off, placement.",
        },
        { role: "user", content: query },
      ],
    });

    const answer = completion.choices[0].message.content;

    res.json({ answer });
  } catch (err) {
    console.error("AI ERROR:", err.message);
    res.status(500).json({ msg: "AI Error", error: err.message });
  }
});

module.exports = router;
