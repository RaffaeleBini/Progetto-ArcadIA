import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { UserModel } from "../models/User.js";
import { NotificationModel } from "../models/Notification.js";
import { sendError } from "../utils/apiError.js";
import { COOKIE_NAME, getAuthCookieOptions, signToken } from "../utils/jwt.js";
import { toPublicUser } from "../utils/publicUser.js";

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Il nome è obbligatorio"),
  email: z.string().trim().toLowerCase().email("Email non valida"),
  password: z.string().min(8, "La password deve avere almeno 8 caratteri"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email non valida"),
  password: z.string().min(1, "Password obbligatoria"),
});

export async function register(req: Request, res: Response) {
  const { name, email, password } = req.body as z.infer<typeof registerSchema>;

  const existing = await UserModel.findOne({ email });
  if (existing) {
    sendError(res, 400, "Email già registrata");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await UserModel.create({ name, email, passwordHash });

  await NotificationModel.create({
    recipient: user._id,
    type: "welcome",
    message: `Benvenuto su ArcadIA, ${user.name}!`,
  });

  res.status(201).json({ user: toPublicUser(user) });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as z.infer<typeof loginSchema>;

  const user = await UserModel.findOne({ email });
  if (!user) {
    sendError(res, 401, "Credenziali non valide");
    return;
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    sendError(res, 401, "Credenziali non valide");
    return;
  }

  const token = signToken(String(user._id));
  res.cookie(COOKIE_NAME, token, getAuthCookieOptions());
  res.json({ user: toPublicUser(user) });
}

export function logout(_req: Request, res: Response) {
  res.clearCookie(COOKIE_NAME, getAuthCookieOptions());
  res.status(204).send();
}

export async function me(req: Request, res: Response) {
  const user = await UserModel.findById(req.userId);
  if (!user) {
    sendError(res, 401, "Sessione non valida");
    return;
  }
  res.json({ user: toPublicUser(user) });
}
