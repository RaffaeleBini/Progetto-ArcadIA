import type { Request, Response } from "express";
import { CommentModel } from "../models/Comment.js";
import { UserModel } from "../models/User.js";
import { sendError } from "../utils/apiError.js";

export async function deleteComment(req: Request, res: Response) {
  const [comment, currentUser] = await Promise.all([
    CommentModel.findById(req.params.id),
    UserModel.findById(req.userId),
  ]);

  if (!comment) {
    sendError(res, 404, "Commento non trovato");
    return;
  }
  if (!currentUser) {
    sendError(res, 401, "Sessione non valida");
    return;
  }
  if (String(comment.author) !== req.userId && currentUser.role !== "admin") {
    sendError(res, 403, "Non puoi eliminare questo commento");
    return;
  }

  await comment.deleteOne();
  res.status(204).send();
}
