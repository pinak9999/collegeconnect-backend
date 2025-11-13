require("dotenv").config();
const express = require("express");
const Groq = require("groq-sdk");

const router = express.Router();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

router.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message required" });
    }

    const chat = await groq.chat.completions.create({
      // ✅✅✅ यही है असली फिक्स ✅✅✅
      model: "llama3-8b-8192", // 'mixtral' को इससे बदल दिया गया है
      
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
    // अब अगर एरर आया तो यहाँ दिखेगा
    console.error("AI ERROR:", error);
    res.status(500).json({ error: "AI server error" });
  }
});

module.exports = router;