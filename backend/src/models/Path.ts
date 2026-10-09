import { Schema, model, type InferSchemaType } from "mongoose";
import { localizedStringSchema } from "./shared/localized.js";

const pathSchema = new Schema({
  code: { type: String, required: true, unique: true, trim: true },
  title: localizedStringSchema,
  description: localizedStringSchema,
  audience: localizedStringSchema,
  estimatedHours: { type: Number, default: null },
  estimatedWeeks: { type: Number, default: null },
  accessLevel: { type: String, enum: ["free", "premium"], default: "premium" },
  status: { type: String, enum: ["draft", "published"], default: "draft" },
  steps: [
    {
      course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
      order: { type: Number, required: true },
      optional: { type: Boolean, default: false },
      lessonFilter: { type: [Number], default: [] },
      note: { type: String, default: null },
    },
  ],
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
});

export type Path = InferSchemaType<typeof pathSchema>;
export const PathModel = model("Path", pathSchema);
