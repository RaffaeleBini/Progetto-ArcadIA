import type { Types } from "mongoose";
import { ProgressModel } from "../models/Progress.js";

export async function ensureProgress(userId: string, courseId: Types.ObjectId) {
  return ProgressModel.findOneAndUpdate(
    { user: userId, course: courseId },
    { $setOnInsert: { user: userId, course: courseId, completedLessons: [], isCompleted: false } },
    { upsert: true, new: true }
  );
}
