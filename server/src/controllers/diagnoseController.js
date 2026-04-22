import { z } from "zod";
import { ScanRecord } from "../models/ScanRecord.js";

const scanInputSchema = z.object({
  crop: z.string().min(2),
  diseaseName: z.string().min(2),
  confidence: z.number().min(0).max(1),
  description: z.string().default(""),
  imageUrl: z.string().url().optional(),
});

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

    const recent = await ScanRecord.find({ userId: req.user.sub }).sort({ createdAt: -1 }).limit(5);

    return res.status(200).json({ recent });
  } catch (error) {
    return next(error);
  }
}

export async function createScanRecord(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Login required to save diagnosis history" });
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
