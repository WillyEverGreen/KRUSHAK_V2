import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ScanRecord } from "../models/ScanRecord.js";
import { env } from "../config/env.js";

const scanInputSchema = z.object({
  crop:        z.string().min(2),
  diseaseName: z.string().min(2),
  confidence:  z.number().min(0).max(1),
  description: z.string().default(""),
  imageUrl:    z.string().url().optional(),
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

/* ─── Expanded disease catalog (40+ entries) ────────────────────────────── */
const commonDiseases = [
  // Tomato
  { name: "Late Blight",         crop: "Tomato",    severity: "High",   season: "Kharif",  symptom: "Brown/dark spots on leaves with white mold on underside; spreads rapidly in humid weather." },
  { name: "Early Blight",        crop: "Tomato",    severity: "Medium", season: "Kharif",  symptom: "Dark concentric rings (target spots) on older leaves; yellowing around lesions." },
  { name: "Septoria Leaf Spot",  crop: "Tomato",    severity: "Medium", season: "Kharif",  symptom: "Small, circular spots with dark borders and grey centres on lower leaves." },
  { name: "Tomato Mosaic Virus", crop: "Tomato",    severity: "High",   season: "Rabi",    symptom: "Mottled yellow-green leaves, leaf curling, stunted growth; spread by aphids." },
  { name: "Fusarium Wilt",       crop: "Tomato",    severity: "High",   season: "Summer",  symptom: "Yellowing of lower leaves, wilting despite adequate water; brown vascular tissue." },
  // Wheat
  { name: "Powdery Mildew",      crop: "Wheat",     severity: "Medium", season: "Rabi",    symptom: "White powdery coating on leaves and stems; reduces photosynthesis significantly." },
  { name: "Yellow Rust",         crop: "Wheat",     severity: "High",   season: "Rabi",    symptom: "Yellow-orange stripe pustules along leaf veins; severe yield loss if untreated." },
  { name: "Brown Rust",          crop: "Wheat",     severity: "Medium", season: "Rabi",    symptom: "Oval orange-brown pustules scattered on leaf surface." },
  { name: "Karnal Bunt",         crop: "Wheat",     severity: "High",   season: "Rabi",    symptom: "Partial replacement of grain kernels with black smelly powder; fishy odour." },
  { name: "Loose Smut",          crop: "Wheat",     severity: "Medium", season: "Rabi",    symptom: "Ears replaced by black masses of smut spores; completely destroys the head." },
  // Rice
  { name: "Rice Blast",          crop: "Rice",      severity: "High",   season: "Kharif",  symptom: "Diamond-shaped lesions on leaves; can kill entire tillers (neck rot)." },
  { name: "Bacterial Leaf Blight",crop:"Rice",      severity: "High",   season: "Kharif",  symptom: "Water-soaked to yellow-white lesions along leaf margins from tips." },
  { name: "Sheath Blight",       crop: "Rice",      severity: "Medium", season: "Kharif",  symptom: "Oval or irregular greyish lesions on leaf sheaths near waterline." },
  { name: "Brown Spot",          crop: "Rice",      severity: "Medium", season: "Kharif",  symptom: "Oval brown spots with yellow halo on leaves; linked to nutrient deficiency." },
  // Cotton
  { name: "Root Rot",            crop: "Cotton",    severity: "Low",    season: "Kharif",  symptom: "Wilting despite adequate water; dark discolouration of root tissue." },
  { name: "Bollworm",            crop: "Cotton",    severity: "High",   season: "Kharif",  symptom: "Larvae bore into bolls; frass visible; premature boll opening." },
  { name: "Cotton Leaf Curl",    crop: "Cotton",    severity: "High",   season: "Kharif",  symptom: "Upward curling of leaves, dark-green enations on underside; whitefly-transmitted." },
  { name: "Alternaria Blight",   crop: "Cotton",    severity: "Medium", season: "Kharif",  symptom: "Dark brown spots with concentric rings on leaves; premature defoliation." },
  // Mustard
  { name: "Aphid Infestation",   crop: "Mustard",   severity: "Medium", season: "Rabi",    symptom: "Dense colonies of small green/black insects on growing tips and underside of leaves." },
  { name: "White Rust",          crop: "Mustard",   severity: "Medium", season: "Rabi",    symptom: "White chalky pustules on underside of leaves; distortion of flowering parts." },
  { name: "Alternaria Leaf Spot",crop: "Mustard",   severity: "Low",    season: "Rabi",    symptom: "Dark brown circular spots with concentric rings; premature leaf drop." },
  // Maize
  { name: "Fall Armyworm",       crop: "Maize",     severity: "High",   season: "Kharif",  symptom: "Ragged feeding on young leaves; caterpillars in whorls with frass; windowpane feeding." },
  { name: "Turcicum Leaf Blight",crop: "Maize",     severity: "Medium", season: "Kharif",  symptom: "Long, cigar-shaped grey-green lesions on leaves; starts from lower leaves." },
  { name: "Maize Streak Virus",  crop: "Maize",     severity: "High",   season: "Kharif",  symptom: "Yellow streaks along veins; stunted plants; spread by leafhoppers." },
  // Sugarcane
  { name: "Red Rot",             crop: "Sugarcane", severity: "High",   season: "Kharif",  symptom: "Red discolouration inside the stalk with white patches; sour smell." },
  { name: "Smut",                crop: "Sugarcane", severity: "High",   season: "Kharif",  symptom: "Long black whip-like structure emerging from growing point." },
  { name: "Ratoon Stunting",     crop: "Sugarcane", severity: "Medium", season: "Kharif",  symptom: "Stunted ratoon growth; orange/yellow discolouration of vascular bundles." },
  // Potato
  { name: "Late Blight",         crop: "Potato",    severity: "High",   season: "Rabi",    symptom: "Water-soaked dark lesions on leaves and tubers; white sporulation in humid conditions." },
  { name: "Common Scab",         crop: "Potato",    severity: "Low",    season: "Rabi",    symptom: "Rough, corky lesions on tuber surface; mainly cosmetic but reduces marketability." },
  { name: "Black Leg",           crop: "Potato",    severity: "Medium", season: "Rabi",    symptom: "Black rot at stem base; plants wilt and collapse; bacteria-spread in wet soils." },
  // Onion
  { name: "Purple Blotch",       crop: "Onion",     severity: "Medium", season: "Rabi",    symptom: "Purple lesions with yellow margins on leaves; severe in humid weather." },
  { name: "Basal Rot",           crop: "Onion",     severity: "High",   season: "Rabi",    symptom: "Bulb decays from base; pink/white fungal growth; post-harvest losses." },
  // Groundnut
  { name: "Early Leaf Spot",     crop: "Groundnut", severity: "Medium", season: "Kharif",  symptom: "Circular dark spots with yellow halo on upper surface; reduces photosynthesis." },
  { name: "Late Leaf Spot",      crop: "Groundnut", severity: "Medium", season: "Kharif",  symptom: "Dark spots with no yellow halo; predominantly on underside of leaves." },
  { name: "Stem Rot",            crop: "Groundnut", severity: "High",   season: "Kharif",  symptom: "White cottony mycelium at stem base; plants wilt and die; black sclerotia visible." },
  // Soybean
  { name: "Soybean Mosaic Virus",crop: "Soybean",   severity: "High",   season: "Kharif",  symptom: "Mottling, puckering and distortion of leaves; stunted plants; seed transmitted." },
  { name: "Pod Borer",           crop: "Soybean",   severity: "High",   season: "Kharif",  symptom: "Larvae bore into pods; damaged seeds; webbing and frass on pods." },
  // Chilli
  { name: "Anthracnose",         crop: "Chilli",    severity: "High",   season: "Kharif",  symptom: "Sunken dark lesions on fruits; in concentric rings; postharvest losses." },
  { name: "Leaf Curl Virus",     crop: "Chilli",    severity: "High",   season: "Kharif",  symptom: "Severe curling, puckering and stunting of leaves; whitefly-transmitted." },
  // Mango
  { name: "Powdery Mildew",      crop: "Mango",     severity: "High",   season: "Rabi",    symptom: "White powdery growth on inflorescence and young fruit; severe flower and fruit drop." },
  { name: "Anthracnose",         crop: "Mango",     severity: "Medium", season: "Kharif",  symptom: "Black lesions on leaves and fruits; postharvest rot in transit." },
];

/** Current season based on month */
function currentSeason() {
  const m = new Date().getMonth() + 1; // 1-12
  if (m >= 6 && m <= 10) return "Kharif";
  if (m >= 11 || m <= 3) return "Rabi";
  return "Summer";
}

export async function getDiseaseCatalog(req, res) {
  const q = (req.query.q || "").toString().trim().toLowerCase();
  const cropFilter = (req.query.crop || "").toString().trim().toLowerCase();
  const severityFilter = (req.query.severity || "").toString().trim();

  let filtered = commonDiseases;

  if (q) {
    filtered = filtered.filter((item) =>
      item.name.toLowerCase().includes(q) ||
      item.crop.toLowerCase().includes(q) ||
      item.symptom.toLowerCase().includes(q)
    );
  }
  if (cropFilter) {
    filtered = filtered.filter((item) => item.crop.toLowerCase().includes(cropFilter));
  }
  if (severityFilter) {
    filtered = filtered.filter((item) => item.severity === severityFilter);
  }

  return res.status(200).json({
    diseases:  filtered,
    total:     filtered.length,
    season:    currentSeason(),
    generatedAt: new Date().toISOString(),
  });
}

/** Current-season pest advisory */
export async function getDiseaseAdvisory(req, res) {
  const season = currentSeason();
  const seasonal = commonDiseases.filter(
    (d) => d.season === season && d.severity === "High"
  );

  const alerts = seasonal.slice(0, 6).map((d) => ({
    crop:     d.crop,
    disease:  d.name,
    severity: d.severity,
    symptom:  d.symptom,
    season,
  }));

  return res.status(200).json({
    season,
    alerts,
    generatedAt: new Date().toISOString(),
    message: `${season} season advisory — watch for these high-severity threats`,
  });
}

export async function getRecentDiagnoses(req, res, next) {
  try {
    if (!req.user) return res.status(200).json({ recent: [] });
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
    if (!req.user) return res.status(401).json({ message: "Login required to save diagnosis history" });
    const payload = scanInputSchema.parse(req.body);
    const record = await ScanRecord.create({
      userId:      req.user.sub,
      crop:        payload.crop,
      diseaseName: payload.diseaseName,
      confidence:  payload.confidence,
      description: payload.description,
      imageUrl:    payload.imageUrl || "",
    });
    return res.status(201).json({ record });
  } catch (error) {
    return next(error);
  }
}
