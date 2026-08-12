import { Schema, model, type InferSchemaType } from "mongoose";

const progressSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
  completedLessons: [{ type: Schema.Types.ObjectId, ref: "Lesson" }],
  isCompleted: { type: Boolean, default: false },
  completedAt: { type: Date, default: null },
  certificateId: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

progressSchema.index({ user: 1, course: 1 }, { unique: true });

export type Progress = InferSchemaType<typeof progressSchema>;
export const ProgressModel = model("Progress", progressSchema);
