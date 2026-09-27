import { Schema, model, type InferSchemaType } from "mongoose";

const loginAttemptSchema = new Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  ip: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Query più frequente: contare i tentativi recenti per una email.
loginAttemptSchema.index({ email: 1, createdAt: -1 });

export type LoginAttempt = InferSchemaType<typeof loginAttemptSchema>;
export const LoginAttemptModel = model("LoginAttempt", loginAttemptSchema);
