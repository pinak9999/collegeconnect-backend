require("dotenv").config();
const express = require("express");
const Groq = require("groq-sdk");

const router = express.Router();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// 🔥 Frontend calls /api/ai/chat → so keep same route
router.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message required" });
    }

    const chat = await groq.chat.completions.create({
      model: "llama3-8b-8192",
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

    res.json({ reply: chat.choices[0].message.content });

  } catch (error) {
    console.error("AI ERROR:", error);
    res.status(500).json({ error: "AI server error" });
  }
});

module.exports = router;
