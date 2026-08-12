import { Schema, model, type InferSchemaType } from "mongoose";

const lessonSchema = new Schema({
  course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
  title: { type: String, required: true, trim: true },
  order: { type: Number, required: true },
  videoUrl: { type: String },
  description: { type: String },
  notebookGithubUrl: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export type Lesson = InferSchemaType<typeof lessonSchema>;
export const LessonModel = model("Lesson", lessonSchema);
