import { z } from "zod";
import { env } from "../config/env.js";

const promptSchema = z.object({
  message: z.string().min(2),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "bot"]),
        text: z.string().min(1),
      }),
    )
    .optional()
    .default([]),
});

const suggestions = [
  "How to prevent tomato blight?",
  "Best fertilizer for rice crops?",
  "When to harvest wheat?",
  "How to control aphids naturally?",
];

function getRuleBasedReply(message) {
  const text = message.toLowerCase();

  if (text.includes("blight") || text.includes("tomato")) {
    return "Inspect lower leaves daily, remove infected leaves immediately, avoid evening irrigation, and use a copper-based spray as advised by your local agronomist.";
  }

  if (text.includes("aphid") || text.includes("pest")) {
    return "Start with neem spray in early morning, monitor leaf undersides every two days, and avoid excessive nitrogen fertilizer that attracts soft-bodied pests.";
  }

  if (text.includes("fertilizer") || text.includes("nutrient")) {
    return "Use soil-test-based fertilization. Split nitrogen doses across growth stages and combine organic matter with NPK to improve moisture retention.";
  }

  if (text.includes("harvest") || text.includes("market")) {
    return "Track mandi modal price trend for 5-7 days, compare transport cost, and prioritize quality grading before dispatch to improve realized price.";
  }

  return "For today, prioritize water scheduling, early pest scouting, and market trend checks. If symptoms spread quickly, consult local extension officers with field photos.";
}

export async function getChatSuggestions(_req, res) {
  return res.status(200).json({ suggestions });
}

async function getGeminiReply(message, history = []) {
  const model = env.GEMINI_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;

  const contents = history
    .filter((item) => item && item.text)
    .slice(-8)
    .map((item) => ({
      role: item.role === "bot" ? "model" : "user",
      parts: [{ text: item.text }],
    }));

  contents.push({ role: "user", parts: [{ text: message }] });

  const body = {
    contents,
    generationConfig: {
      temperature: 0.6,
      topP: 0.9,
      maxOutputTokens: 400,
    },
    systemInstruction: {
      parts: [
        {
          text: "You are an agricultural assistant for Indian farmers. Give practical, concise steps with safe recommendations. If uncertain, advise consulting local agronomists.",
        },
      ],
    },
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await resp.json().catch(() => ({}));

  if (!resp.ok) {
    const errText =
      data?.error?.message || `Gemini request failed with status ${resp.status}`;
    throw new Error(errText);
  }

  let replyText = data?.candidates?.[0]?.content?.parts
    ?.map((part) => part?.text || "")
    .join("\n")
    .trim();

  // Clean up <br> tags
  if (replyText) {
    replyText = replyText.replace(/<br\s*\/?>/gi, "\n");
  }

  if (!replyText) {
    throw new Error("Gemini returned an empty response");
  }

  return replyText;
}

async function getGroqReply(message, history = []) {
  const url = "https://api.groq.com/openai/v1/chat/completions";
  const messages = [
    {
      role: "system",
      content: "You are an agricultural assistant for Indian farmers. Give practical, concise steps with safe recommendations. If uncertain, advise consulting local agronomists.",
    },
  ];

  for (const item of history) {
    if (!item || !item.text) continue;
    messages.push({
      role: item.role === "bot" ? "assistant" : "user",
      content: item.text,
    });
  }

  messages.push({ role: "user", content: message });

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages,
      temperature: 0.6,
      max_tokens: 400,
    }),
  });

  const data = await resp.json().catch(() => ({}));

  if (!resp.ok) {
    const errText = data?.error?.message || `Groq request failed with status ${resp.status}`;
    throw new Error(errText);
  }

  let replyText = data?.choices?.[0]?.message?.content?.trim();
  
  if (replyText) {
    replyText = replyText.replace(/<br\s*\/?>/gi, "\n");
  }

  if (!replyText) {
    throw new Error("Groq returned an empty response");
  }

  return replyText;
}

async function getPublicFallbackReply(message, history = []) {
  const convo = history
    .filter((item) => item && item.text)
    .slice(-4)
    .map((item) => `${item.role === "bot" ? "Assistant" : "Farmer"}: ${item.text}`)
    .join("\n");

  const prompt = [
    "You are an agricultural assistant for Indian farmers.",
    "Answer in short practical steps.",
    "Keep safety first and avoid harmful advice.",
    convo ? `Conversation so far:\n${convo}` : "",
    `Farmer question: ${message}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}`;
  const resp = await fetch(url, { method: "GET" });
  const text = await resp.text();

  if (!resp.ok) {
    throw new Error(`Public LLM fallback failed with status ${resp.status}`);
  }

  let replyText = String(text || "").trim();
  
  // Clean up <br> tags
  replyText = replyText.replace(/<br\s*\/?>/gi, "\n");
  
  // Strip Pollinations.AI advertisement
  const adMarkers = [
    "Support Pollinations.AI",
    "🌸 Ad 🌸",
    "Powered by Pollinations.AI"
  ];
  for (const marker of adMarkers) {
    const idx = replyText.indexOf(marker);
    if (idx !== -1) {
      // Find the start of the line or paragraph where the ad begins
      replyText = replyText.substring(0, idx).trim();
    }
  }
  
  // Remove markdown trailing empty lines or trailing horizontal rules often put before the ad
  replyText = replyText.replace(/(?:^|\n)-{3,}\s*$/, "").trim();

  if (!replyText) {
    throw new Error("Public LLM fallback returned empty response");
  }

  return replyText;
}

export async function sendChatMessage(req, res, next) {
  try {
    const payload = promptSchema.parse(req.body);
    // If a Gemini API key is configured, proxy the request server-side to Gemini
    if (env.GEMINI_API_KEY) {
      try {
        const reply = await getGeminiReply(payload.message, payload.history);
        return res.status(200).json({ reply, source: "gemini" });
      } catch (err) {
        // Log and fall back
        // eslint-disable-next-line no-console
        console.error("Gemini proxy error:", err.message);
      }
    }

    // Fallback to Groq if configured
    if (env.GROQ_API_KEY) {
      try {
        const reply = await getGroqReply(payload.message, payload.history);
        return res.status(200).json({ reply, source: "groq" });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Groq fallback error:", err.message);
      }
    }

    // Dynamic no-key fallback when Gemini/Groq is unavailable or quota-limited
    try {
      const reply = await getPublicFallbackReply(
        payload.message,
        payload.history,
      );
      return res.status(200).json({ reply, source: "public-fallback" });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Public fallback error:", err);
    }

    // Default rule-based reply when no key is configured or external call failed
    const reply = getRuleBasedReply(payload.message);
    return res.status(200).json({ reply, source: "fallback" });
  } catch (error) {
    return next(error);
  }
}
