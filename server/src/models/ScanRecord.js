import mongoose from "mongoose";

const scanRecordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    diseaseName: { type: String, required: true },
    crop: { type: String, required: true },
    confidence: { type: Number, min: 0, max: 1, required: true },
    description: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
  },
  { timestamps: true },
);

export const ScanRecord = mongoose.model("ScanRecord", scanRecordSchema);
