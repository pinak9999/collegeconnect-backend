// routes/aiRoutes.js (नया कोड)
require("dotenv").config();
const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message required" });
    }

    // ✅✅✅ यही है असली फिक्स ✅✅✅
    // 'gemini-1.5-flash' को 'gemini-pro' से बदल दिया गया है
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Gemini के लिए प्रॉम्प्ट
    const systemPrompt = "You are REAP Admission Assistant. Answer questions about colleges, branches, fees, placements and REAP counselling. Answer in Hindi-English mix.";
    const fullPrompt = `${systemPrompt}\n\nUSER QUESTION: ${message}`;

    // API कॉल करें
    const result = await model.generateContent(fullPrompt);
    const response = result.response;
    const text = response.text();

    // जवाब "reply" के तौर पर भेजें
    res.json({ reply: text });

  } catch (error) {
    console.error("AI ERROR (Gemini):", error);
    res.status(500).json({ error: "AI server error" });
  }
});

module.exports = router;