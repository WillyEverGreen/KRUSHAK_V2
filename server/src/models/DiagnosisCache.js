import mongoose from "mongoose";

const analysisSnapshotSchema = new mongoose.Schema(
  {
    crop: { type: String, required: true },
    disease: { type: String, required: true },
    confidence: { type: String, required: true },
    reasoning: { type: String, required: true },
    symptoms: { type: [String], default: [] },
    causes: { type: [String], default: [] },
    treatment: { type: [String], default: [] },
    prevention: { type: [String], default: [] },
  },
  { _id: false },
);

const diagnosisCacheSchema = new mongoose.Schema(
  {
    imageHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    mimeType: {
      type: String,
      default: "",
    },
    analysis: {
      type: analysisSnapshotSchema,
      required: true,
    },
    hitCount: {
      type: Number,
      default: 1,
      min: 1,
    },
    lastAccessedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

export const DiagnosisCache = mongoose.model(
  "DiagnosisCache",
  diagnosisCacheSchema,
);
