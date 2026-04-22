import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ScanRecord } from "../models/ScanRecord.js";
import { env } from "../config/env.js";

const scanInputSchema = z.object({
  crop: z.string().min(2),
  diseaseName: z.string().min(2),
  confidence: z.number().min(0).max(1),
  description: z.string().default(""),
  imageUrl: z.string().url().optional(),
});

const analyzeImageSchema = z.object({
  imageBase64: z.string().min(100, "Image data is too small"),
  mimeType: z
    .string()
    .regex(/^image\/[a-zA-Z0-9.+-]+$/, "Invalid image mime type"),
});

const aiOutputSchema = z.object({
  crop: z.string().min(1),
  disease: z.string().min(1),
  confidence: z.enum(["Low", "Medium", "High"]),
  reasoning: z.string().min(1),
  symptoms: z.array(z.string()).default([]),
  causes: z.array(z.string()).default([]),
  treatment: z.array(z.string()).default([]),
  prevention: z.array(z.string()).default([]),
});

const fallbackUnknownResponse = {
  crop: "Unknown",
  disease: "Unknown",
  confidence: "Low",
  reasoning:
    "Visible evidence is insufficient to confidently identify a specific disease.",
  symptoms: [],
  causes: [],
  treatment: [],
  prevention: [],
};

let genAIClient = null;

function getGeminiClient() {
  if (!env.GEMINI_API_KEY) {
    return null;
  }

  if (!genAIClient) {
    genAIClient = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  }

  return genAIClient;
}

function getJsonCandidate(text) {
  const trimmed = (text || "").trim();
  if (!trimmed) {
    return "";
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  return trimmed;
}

function toConfidenceLabel(value) {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "high") return "High";
    if (normalized === "medium") return "Medium";
    if (normalized === "low") return "Low";
  }

  if (typeof value === "number") {
    if (value >= 0.8) return "High";
    if (value >= 0.5) return "Medium";
    return "Low";
  }

  return "Low";
}

function cleanStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeAiOutput(rawValue) {
  if (!rawValue || typeof rawValue !== "object") {
    return fallbackUnknownResponse;
  }

  const raw = rawValue;
  const normalized = {
    crop: typeof raw.crop === "string" ? raw.crop.trim() : "Unknown",
    disease:
      typeof raw.disease === "string"
        ? raw.disease.trim()
        : typeof raw.diseaseName === "string"
          ? raw.diseaseName.trim()
          : "Unknown",
    confidence: toConfidenceLabel(raw.confidence),
    reasoning:
      typeof raw.reasoning === "string" && raw.reasoning.trim()
        ? raw.reasoning.trim()
        : fallbackUnknownResponse.reasoning,
    symptoms: cleanStringArray(raw.symptoms),
    causes: cleanStringArray(raw.causes),
    treatment: cleanStringArray(raw.treatment),
    prevention: cleanStringArray(raw.prevention),
  };

  const parsed = aiOutputSchema.safeParse(normalized);
  if (!parsed.success) {
    return fallbackUnknownResponse;
  }

  return parsed.data;
}

function stripDataUrlPrefix(base64) {
  const parts = base64.split(",");
  return parts.length > 1 ? parts[1] : parts[0];
}

function confidenceLabelToScore(label) {
  if (label === "High") return 0.9;
  if (label === "Medium") return 0.7;
  return 0.4;
}

function isUnknownAnalysis(analysis) {
  return analysis.crop === "Unknown" || analysis.disease === "Unknown";
}

function isModelNotFoundError(error) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("not found") && message.includes("models/");
}

function isQuotaOrRateLimitError(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("429") ||
    message.includes("quota exceeded") ||
    message.includes("rate limit") ||
    message.includes("too many requests")
  );
}

function normalizeModelName(modelName) {
  const raw = String(modelName || "").trim();
  if (!raw) return "";

  const withoutPrefix = raw.replace(/^models\//i, "");
  const aliases = {
    "gemini-3.1-pro": "gemini-3.1-pro-preview",
    "gemini-3-pro": "gemini-3-pro-preview",
  };

  return aliases[withoutPrefix] || withoutPrefix;
}

async function generateContentWithModelFallback(geminiClient, payload, prompt) {
  const modelCandidates = [
    normalizeModelName(env.GEMINI_MODEL),
    "gemini-2.5-flash-image",
    "gemini-3.1-flash-image-preview",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-flash-lite-latest",
    "gemini-flash-latest",
    "gemini-pro-latest",
  ].filter(Boolean);

  const tried = new Set();
  let lastError = null;

  for (const modelName of modelCandidates) {
    if (tried.has(modelName)) continue;
    tried.add(modelName);

    try {
      const model = geminiClient.getGenerativeModel({ model: modelName });
      return await model.generateContent([
        {
          inlineData: {
            data: stripDataUrlPrefix(payload.imageBase64),
            mimeType: payload.mimeType,
          },
        },
        { text: prompt },
      ]);
    } catch (error) {
      lastError = error;
      if (isModelNotFoundError(error) || isQuotaOrRateLimitError(error)) {
        continue;
      }
      throw error;
    }
  }

  const error = new Error(lastError?.message || "All Gemini model attempts failed.");
  error.statusCode = 502;
  throw error;
}

const commonDiseases = [
  {
    name: "Late Blight",
    crop: "Tomato",
    severity: "High",
    symptom: "Brown spots on leaves with white mold underneath",
  },
  {
    name: "Powdery Mildew",
    crop: "Wheat",
    severity: "Medium",
    symptom: "White powdery coating on leaf surface",
  },
  {
    name: "Rice Blast",
    crop: "Rice",
    severity: "High",
    symptom: "Diamond-shaped lesions on leaves",
  },
  {
    name: "Aphid Infestation",
    crop: "Mustard",
    severity: "Medium",
    symptom: "Small green insects on underside of leaves",
  },
  {
    name: "Root Rot",
    crop: "Cotton",
    severity: "Low",
    symptom: "Wilting despite adequate water supply",
  },
];

export async function getDiseaseCatalog(req, res) {
  const q = (req.query.q || "").toString().trim().toLowerCase();

  const filtered = !q
    ? commonDiseases
    : commonDiseases.filter((item) => {
        return (
          item.name.toLowerCase().includes(q) ||
          item.crop.toLowerCase().includes(q) ||
          item.symptom.toLowerCase().includes(q)
        );
      });

  return res.status(200).json({ diseases: filtered });
}

export async function getRecentDiagnoses(req, res, next) {
  try {
    if (!req.user) {
      return res.status(200).json({ recent: [] });
    }

    const recent = await ScanRecord.find({ userId: req.user.sub })
      .sort({ createdAt: -1 })
      .limit(5);

    return res.status(200).json({ recent });
  } catch (error) {
    return res.status(200).json({ recent: [] });
  }
}

export async function analyzePlantImage(req, res, next) {
  try {
    const parsedPayload = analyzeImageSchema.safeParse(req.body);
    if (!parsedPayload.success) {
      return res.status(400).json({
        message: parsedPayload.error.issues[0]?.message || "Invalid image payload",
      });
    }

    const payload = parsedPayload.data;

    const geminiClient = getGeminiClient();
    if (!geminiClient) {
      return res.status(503).json({
        message:
          "Gemini API key is not configured. Set GEMINI_API_KEY in server env.",
      });
    }

    const prompt = `You are a highly skilled plant pathologist with deep expertise in crop diseases.

Analyze the given plant image using a step-by-step reasoning approach.

Internally perform these steps:
1. Identify the plant/crop type (if possible)
2. Observe visual patterns (spots, discoloration, texture, edges, lesions)
3. Compare with known plant disease characteristics
4. Eliminate unlikely diseases
5. Select the most probable condition

IMPORTANT:
- Do NOT guess randomly
- If the image is truly unclear or no plant is visible, return "Unknown"
- Base your answer strictly on visible symptoms
- If symptoms are visible, choose the most probable condition with conservative confidence instead of defaulting to Unknown

Return ONLY valid JSON:

{
  "crop": "",
  "disease": "",
  "confidence": "Low | Medium | High",
  "reasoning": "brief explanation of why this disease was chosen",
  "symptoms": [],
  "causes": [],
  "treatment": [],
  "prevention": []
}

Constraints:
- Keep reasoning concise (2-3 lines max)
- Do not output anything outside JSON
- Prefer accuracy over completeness`;

  const retryPrompt = `Re-check the same plant image carefully.

Focus on these clues: lesion shape, spot color, edge burn, chlorosis pattern, mold/powder presence, vein pattern, and distribution on the leaf.

Rules:
- Do not hallucinate unseen details.
- If symptoms are visible, return the best probable disease with Low or Medium confidence.
- Return Unknown only if image quality/content is genuinely insufficient.

Return ONLY valid JSON with fields: crop, disease, confidence, reasoning, symptoms, causes, treatment, prevention.`;

    let result;
    try {
      result = await generateContentWithModelFallback(
        geminiClient,
        payload,
        prompt,
      );
    } catch (modelError) {
      return res.status(200).json({
        analysis: fallbackUnknownResponse,
      });
    }

    const modelText = result?.response?.text() || "";
    const jsonCandidate = getJsonCandidate(modelText);

    let parsedJson;
    try {
      parsedJson = JSON.parse(jsonCandidate);
    } catch {
      parsedJson = fallbackUnknownResponse;
    }

    let analysis = normalizeAiOutput(parsedJson);

    if (isUnknownAnalysis(analysis)) {
      try {
        const retryResult = await generateContentWithModelFallback(
          geminiClient,
          payload,
          retryPrompt,
        );

        const retryText = retryResult?.response?.text() || "";
        const retryCandidate = getJsonCandidate(retryText);
        const retryJson = JSON.parse(retryCandidate);
        const retryAnalysis = normalizeAiOutput(retryJson);

        if (!isUnknownAnalysis(retryAnalysis)) {
          analysis = retryAnalysis;
        }
      } catch {
        // Keep first-pass analysis if retry fails.
      }
    }

    if (
      req.user &&
      analysis.crop !== "Unknown" &&
      analysis.disease !== "Unknown"
    ) {
      try {
        await ScanRecord.create({
          userId: req.user.sub,
          crop: analysis.crop,
          diseaseName: analysis.disease,
          confidence: confidenceLabelToScore(analysis.confidence),
          description: analysis.reasoning,
          imageUrl: "",
        });
      } catch {
        // Keep analysis response successful even when history persistence fails.
      }
    }

    return res.status(200).json({ analysis });
  } catch (error) {
    return res.status(200).json({ analysis: fallbackUnknownResponse });
  }
}

export async function createScanRecord(req, res, next) {
  try {
    if (!req.user) {
      return res
        .status(401)
        .json({ message: "Login required to save diagnosis history" });
    }

    const payload = scanInputSchema.parse(req.body);

    const record = await ScanRecord.create({
      userId: req.user.sub,
      crop: payload.crop,
      diseaseName: payload.diseaseName,
      confidence: payload.confidence,
      description: payload.description,
      imageUrl: payload.imageUrl || "",
    });

    return res.status(201).json({ record });
  } catch (error) {
    return next(error);
  }
}
