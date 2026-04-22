import mongoose from "mongoose";

export const LIVESTOCK_TYPES = [
  "Cow",
  "Buffalo",
  "Goat",
  "Sheep",
  "Chicken",
  "Duck",
  "Pig",
  "Horse",
  "Rabbit",
];

const livestockSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    type: { type: String, enum: LIVESTOCK_TYPES, required: true },
    name: { type: String, default: "", trim: true },
    count: { type: Number, min: 1, default: 1 },
    healthScore: { type: Number, min: 0, max: 1, default: 0.8 },
    lastFedAtLabel: { type: String, default: "" },
    feedIntervalHours: { type: Number, min: 1, max: 48, default: 12 },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

export const Livestock = mongoose.model("Livestock", livestockSchema);
