import type { Request, Response } from "express";
import { z } from "zod";
import { UserModel } from "../models/User.js";
import { sendError } from "../utils/apiError.js";
import { toPublicProfile, toPublicUser } from "../utils/publicUser.js";
import { isCloudinaryConfigured, uploadAvatar } from "../config/cloudinary.js";

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, "Il nome è obbligatorio"),
  bio: z.string().trim().max(500, "La bio può avere al massimo 500 caratteri").optional().default(""),
  preferredLanguage: z.enum(["it", "es"]),
  theme: z.enum(["light", "dark"]),
});

export async function getPublicProfile(req: Request, res: Response) {
  const user = await UserModel.findById(req.params.id);
  if (!user) {
    sendError(res, 404, "Utente non trovato");
    return;
  }
  res.json({ user: toPublicProfile(user) });
}

export async function updateMe(req: Request, res: Response) {
  const update = req.body as z.infer<typeof updateProfileSchema>;

  const user = await UserModel.findByIdAndUpdate(req.userId, update, { new: true });
  if (!user) {
    sendError(res, 401, "Sessione non valida");
    return;
  }
  res.json({ user: toPublicUser(user) });
}

export async function uploadMyAvatar(req: Request, res: Response) {
  if (!isCloudinaryConfigured()) {
    sendError(res, 500, "Upload avatar non configurato sul server");
    return;
  }

  const file = req.file;
  if (!file) {
    sendError(res, 400, "Nessun file caricato");
    return;
  }

  const avatarUrl = await uploadAvatar(file.buffer, String(req.userId));

  const user = await UserModel.findByIdAndUpdate(req.userId, { avatarUrl }, { new: true });
  if (!user) {
    sendError(res, 401, "Sessione non valida");
    return;
  }
  res.json({ user: toPublicUser(user) });
}
