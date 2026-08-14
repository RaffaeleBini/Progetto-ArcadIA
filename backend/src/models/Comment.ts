import { Schema, model, type InferSchemaType } from "mongoose";

const commentSchema = new Schema({
  post: { type: Schema.Types.ObjectId, ref: "Post", required: true },
  author: { type: Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
});

export type Comment = InferSchemaType<typeof commentSchema>;
export const CommentModel = model("Comment", commentSchema);
