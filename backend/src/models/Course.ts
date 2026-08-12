import { Schema, model, type InferSchemaType } from "mongoose";

const courseSchema = new Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  coverImageUrl: { type: String },
  accessLevel: { type: String, enum: ["free", "premium"], default: "free" },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
});

export type Course = InferSchemaType<typeof courseSchema>;
export const CourseModel = model("Course", courseSchema);
