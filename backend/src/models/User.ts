import { Schema, model, type InferSchemaType } from "mongoose";

const userSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  avatarUrl: { type: String },
  bio: { type: String },
  preferredLanguage: { type: String, enum: ["it", "es"], default: "it" },
  theme: { type: String, enum: ["light", "dark"], default: "dark" },
  subscriptionPlan: { type: String, enum: ["free", "premium"], default: "free" },
  subscriptionExpiresAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

export type User = InferSchemaType<typeof userSchema>;
export const UserModel = model("User", userSchema);
