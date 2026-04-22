import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    role:         { type: String, enum: ["user", "admin"], default: "user" },
    village:      { type: String, default: "" },
    district:     { type: String, default: "" },
    /* Ready for future fields when MongoDB Atlas is connected: */
    // phone:     { type: String, default: "" },
    // state:     { type: String, default: "" },
    // landAcres: { type: Number, default: 0 },
    // avatarUrl: { type: String, default: "" },
  },
  { timestamps: true },
);

export const User = mongoose.model("User", userSchema);
