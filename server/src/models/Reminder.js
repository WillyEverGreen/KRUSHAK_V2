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
    done: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Reminder = mongoose.model("Reminder", reminderSchema);
