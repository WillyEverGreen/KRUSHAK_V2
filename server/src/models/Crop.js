import mongoose from "mongoose";

const STAGES = ["Sowing", "Germination", "Vegetative", "Flowering", "Fruiting", "Harvest"];

const cropSchema = new mongoose.Schema(
  {
    userId:        { type: String, required: true, index: true },
    name:          { type: String, required: true, trim: true },
    variety:       { type: String, default: "" },
    stage:         { type: String, enum: STAGES, default: "Sowing" },
    sowingDate:    { type: Date, default: null },
    fieldSizeAcres:{ type: Number, default: 1 },
    notes:         { type: String, default: "" },
  },
  { timestamps: true }
);

export const Crop = mongoose.model("Crop", cropSchema);
export { STAGES };
