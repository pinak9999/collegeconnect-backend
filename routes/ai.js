// routes/ai.js
require("dotenv").config();
const express = require("express");
const Groq = require("groq-sdk");

const router = express.Router();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// फ्रंटएंड /api/ai/chat पर कॉल करेगा
router.post("/chat", async (req, res) => {
  try {
    // ✅ हम 'message' की उम्मीद कर रहे हैं
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message required" });
    }

    const chat = await groq.chat.completions.create({
      model: "mixtral-8x7b-32768",
      messages: [
        {
          role: "system",
          content:
            "You are REAP Admission Assistant. Answer questions about colleges, branches, fees, placements and REAP counselling.",
        },
        { role: "user", content: message }
      ],
      max_tokens: 300
    });

    // ✅ हम 'reply' वापस भेज रहे हैं
    res.json({ reply: chat.choices[0].message.content });

  } catch (error) {
    console.error("AI ERROR:", error);
    res.status(500).json({ error: "AI server error" });
  }
});

module.exports = router;