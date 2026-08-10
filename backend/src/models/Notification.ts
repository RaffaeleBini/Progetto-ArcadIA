import { Schema, model, type InferSchemaType } from "mongoose";

const notificationSchema = new Schema({
  recipient: { type: Schema.Types.ObjectId, ref: "User", required: true },
  type: {
    type: String,
    enum: ["new_comment", "welcome", "course_added", "course_completed"],
    required: true,
  },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  relatedId: { type: Schema.Types.ObjectId },
  createdAt: { type: Date, default: Date.now },
});

export type Notification = InferSchemaType<typeof notificationSchema>;
export const NotificationModel = model("Notification", notificationSchema);
