import { Schema, model, type InferSchemaType } from "mongoose";

const postSchema = new Schema({
  author: { type: Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
});

export type Post = InferSchemaType<typeof postSchema>;
export const PostModel = model("Post", postSchema);
