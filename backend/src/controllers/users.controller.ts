import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { UserModel } from "../models/User.js";
import { sendError } from "../utils/apiError.js";
import { toPublicProfile, toPublicUser } from "../utils/publicUser.js";
import { isCloudinaryConfigured, uploadAvatar } from "../config/cloudinary.js";
import { COOKIE_NAME, getAuthCookieOptions, signToken } from "../utils/jwt.js";

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, "Il nome è obbligatorio"),
  bio: z.string().trim().max(500, "La bio può avere al massimo 500 caratteri").optional().default(""),
  preferredLanguage: z.enum(["it", "es"]),
  theme: z.enum(["light", "dark"]),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Password attuale obbligatoria"),
  newPassword: z.string().min(8, "La nuova password deve avere almeno 8 caratteri"),
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

export async function changePassword(req: Request, res: Response) {
  const { currentPassword, newPassword } = req.body as z.infer<typeof changePasswordSchema>;

  const user = await UserModel.findById(req.userId);
  if (!user) {
    sendError(res, 401, "Sessione non valida");
    return;
  }

  const passwordMatches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!passwordMatches) {
    sendError(res, 401, "Password attuale non corretta");
    return;
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.tokenVersion += 1;
  await user.save();

  // Rifirma un token con il nuovo tokenVersion: la sessione corrente resta
  // valida, solo le altre copie del vecchio token (altri dispositivi/tab)
  // vengono invalidate alla prossima richiesta.
  const token = signToken(String(user._id), user.tokenVersion);
  res.cookie(COOKIE_NAME, token, getAuthCookieOptions());
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
