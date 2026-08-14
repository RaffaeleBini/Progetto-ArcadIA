import type { Request, Response } from "express";
import { z } from "zod";
import { PostModel } from "../models/Post.js";
import { CommentModel } from "../models/Comment.js";
import { UserModel } from "../models/User.js";
import { NotificationModel } from "../models/Notification.js";
import { sendError } from "../utils/apiError.js";

export const postSchema = z.object({
  text: z.string().trim().min(1, "Il testo è obbligatorio").max(2000, "Testo troppo lungo (max 2000 caratteri)"),
});

export const commentSchema = z.object({
  text: z.string().trim().min(1, "Il testo è obbligatorio").max(1000, "Testo troppo lungo (max 1000 caratteri)"),
});

interface PopulatedAuthor {
  _id: unknown;
  name: string;
  avatarUrl?: string | null;
}

function toAuthorDto(author: PopulatedAuthor) {
  return { id: String(author._id), name: author.name, avatarUrl: author.avatarUrl ?? null };
}

function toPostDto(
  post: { _id: unknown; text: string; createdAt: Date; author: PopulatedAuthor },
  currentUserId: string,
  isAdmin: boolean
) {
  return {
    id: String(post._id),
    text: post.text,
    createdAt: post.createdAt,
    author: toAuthorDto(post.author),
    canDelete: String(post.author._id) === currentUserId || isAdmin,
  };
}

function toCommentDto(
  comment: { _id: unknown; text: string; createdAt: Date; author: PopulatedAuthor },
  currentUserId: string,
  isAdmin: boolean
) {
  return {
    id: String(comment._id),
    text: comment.text,
    createdAt: comment.createdAt,
    author: toAuthorDto(comment.author),
    canDelete: String(comment.author._id) === currentUserId || isAdmin,
  };
}

export async function listPosts(req: Request, res: Response) {
  const currentUser = await UserModel.findById(req.userId);
  if (!currentUser) {
    sendError(res, 401, "Sessione non valida");
    return;
  }

  const posts = await PostModel.find()
    .sort({ createdAt: -1 })
    .populate<{ author: PopulatedAuthor }>("author", "name avatarUrl");

  const isAdmin = currentUser.role === "admin";
  res.json({ posts: posts.map((post) => toPostDto(post, req.userId!, isAdmin)) });
}

export async function createPost(req: Request, res: Response) {
  const { text } = req.body as z.infer<typeof postSchema>;

  const post = await PostModel.create({ author: req.userId, text });
  const populated = await post.populate<{ author: PopulatedAuthor }>("author", "name avatarUrl");

  res.status(201).json({ post: toPostDto(populated, req.userId!, false) });
}

export async function deletePost(req: Request, res: Response) {
  const [post, currentUser] = await Promise.all([
    PostModel.findById(req.params.id),
    UserModel.findById(req.userId),
  ]);

  if (!post) {
    sendError(res, 404, "Post non trovato");
    return;
  }
  if (!currentUser) {
    sendError(res, 401, "Sessione non valida");
    return;
  }
  if (String(post.author) !== req.userId && currentUser.role !== "admin") {
    sendError(res, 403, "Non puoi eliminare questo post");
    return;
  }

  await Promise.all([CommentModel.deleteMany({ post: post._id }), post.deleteOne()]);

  res.status(204).send();
}

export async function listComments(req: Request, res: Response) {
  const [post, currentUser] = await Promise.all([
    PostModel.findById(req.params.id),
    UserModel.findById(req.userId),
  ]);

  if (!post) {
    sendError(res, 404, "Post non trovato");
    return;
  }
  if (!currentUser) {
    sendError(res, 401, "Sessione non valida");
    return;
  }

  const comments = await CommentModel.find({ post: post._id })
    .sort({ createdAt: 1 })
    .populate<{ author: PopulatedAuthor }>("author", "name avatarUrl");

  const isAdmin = currentUser.role === "admin";
  res.json({ comments: comments.map((comment) => toCommentDto(comment, req.userId!, isAdmin)) });
}

export async function createComment(req: Request, res: Response) {
  const { text } = req.body as z.infer<typeof commentSchema>;

  const [post, currentUser] = await Promise.all([
    PostModel.findById(req.params.id),
    UserModel.findById(req.userId),
  ]);

  if (!post) {
    sendError(res, 404, "Post non trovato");
    return;
  }
  if (!currentUser) {
    sendError(res, 401, "Sessione non valida");
    return;
  }

  const comment = await CommentModel.create({ post: post._id, author: req.userId, text });

  if (String(post.author) !== req.userId) {
    await NotificationModel.create({
      recipient: post.author,
      type: "new_comment",
      message: `${currentUser.name} ha commentato il tuo post`,
      relatedId: post._id,
    });
  }

  const populated = await comment.populate<{ author: PopulatedAuthor }>("author", "name avatarUrl");
  res.status(201).json({ comment: toCommentDto(populated, req.userId!, false) });
}
