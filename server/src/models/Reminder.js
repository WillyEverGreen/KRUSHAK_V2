import mongoose from "mongoose";

const reminderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    task: { type: String, required: true },
    dueAtLabel: { type: String, required: true },
    category: {
      type: String,
      enum: [
        "general",
        "crop",
        "irrigation",
        "spray",
        "harvest",
        "livestock-feed",
        "livestock-health",
      ],
      default: "general",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    targetType: { type: String, default: "" },
    targetId: { type: String, default: "" },
    done: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Reminder = mongoose.model("Reminder", reminderSchema);
