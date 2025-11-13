import express from "express";
import Groq from "groq-sdk";

const router = express.Router();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.post("/ask", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) return res.status(400).json({ error: "Message required" });

    const chat = await groq.chat.completions.create({
      model: "mixtral-8x7b-32768",
      messages: [
        {
          role: "system",
          content:
            "You are REAP Admission Assistant. Answer questions about colleges, branches, placements, fees, cutoffs & counselling.",
        },
        { role: "user", content: message },
      ],
      max_tokens: 300,
    });

    res.json({ reply: chat.choices[0].message.content });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "AI error" });
  }
});

export default router;
