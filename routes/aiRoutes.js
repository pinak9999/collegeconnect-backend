// routes/aiRoutes.js (नया कोड)
require("dotenv").config();
const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai"); // 1. नई लाइब्रेरी
const router = express.Router();

// 2. अपना Gemini API Key यहाँ डालें (Render.com पर)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message required" });
    }

    // 3. Gemini का मॉडल चुनें
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 4. Gemini के लिए प्रॉम्प्ट
    const systemPrompt = "You are REAP Admission Assistant. Answer questions about colleges, branches, fees, placements and REAP counselling. Answer in Hindi-English mix.";
    const fullPrompt = `${systemPrompt}\n\nUSER QUESTION: ${message}`;

    // 5. API कॉल करें
    const result = await model.generateContent(fullPrompt);
    const response = result.response;
    const text = response.text();

    // 6. जवाब "reply" के तौर पर भेजें (यह पहले जैसा ही है)
    res.json({ reply: text });

  } catch (error) {
    console.error("AI ERROR (Gemini):", error);
    res.status(500).json({ error: "AI server error" });
  }
});

module.exports = router;