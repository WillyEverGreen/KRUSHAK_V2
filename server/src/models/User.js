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
    role: { type: String, enum: ["user", "admin"], default: "user" },
    village: { type: String, default: "Village Name" },
    district: { type: String, default: "District" },
  },
  { timestamps: true },
);

export const User = mongoose.model("User", userSchema);
