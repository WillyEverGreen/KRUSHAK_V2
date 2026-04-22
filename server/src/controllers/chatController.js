import { z } from "zod";

const promptSchema = z.object({
  message: z.string().min(2),
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

export async function sendChatMessage(req, res, next) {
  try {
    const payload = promptSchema.parse(req.body);
    const reply = getRuleBasedReply(payload.message);
    return res.status(200).json({ reply });
  } catch (error) {
    return next(error);
  }
}
