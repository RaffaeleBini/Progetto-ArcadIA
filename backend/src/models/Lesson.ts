import { Schema, model, type InferSchemaType } from "mongoose";
import { localizedStringSchema } from "./shared/localized.js";

const lessonSchema = new Schema({
  course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
  order: { type: Number, required: true },
  title: localizedStringSchema,
  theoryContent: localizedStringSchema,
  videoUrl: localizedStringSchema,
  lessonNotebookUrl: localizedStringSchema,
  exerciseNotebookUrl: localizedStringSchema,
  createdAt: { type: Date, default: Date.now },
});

export type Lesson = InferSchemaType<typeof lessonSchema>;
export const LessonModel = model("Lesson", lessonSchema);
