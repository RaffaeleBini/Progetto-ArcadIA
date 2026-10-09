import { Schema, model, type InferSchemaType } from "mongoose";
import { localizedStringSchema } from "./shared/localized.js";

const courseSchema = new Schema({
  code: { type: String, required: true, unique: true, trim: true },
  title: localizedStringSchema,
  description: localizedStringSchema,
  block: { type: String, trim: true, default: null },
  coverImageUrl: { type: String },
  accessLevel: { type: String, enum: ["free", "premium"], default: "free" },
  status: { type: String, enum: ["draft", "published"], default: "draft" },
  estimatedHours: { type: Number, default: null },
  catalogOrder: { type: Number, required: true },
  prerequisites: [
    {
      course: { type: Schema.Types.ObjectId, ref: "Course" },
      note: { type: String, default: null },
    },
  ],
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
});

courseSchema.index({ status: 1, catalogOrder: 1 });

export type Course = InferSchemaType<typeof courseSchema>;
export const CourseModel = model("Course", courseSchema);
