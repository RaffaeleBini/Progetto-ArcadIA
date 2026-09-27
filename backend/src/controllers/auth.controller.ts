import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { UserModel } from "../models/User.js";
import { NotificationModel } from "../models/Notification.js";
import { sendError } from "../utils/apiError.js";
import {
  COOKIE_NAME,
  getAuthCookieOptions,
  getTwoFactorPendingCookieOptions,
  signToken,
  signTwoFactorPendingToken,
  TWO_FACTOR_PENDING_COOKIE_NAME,
  verifyTwoFactorPendingToken,
} from "../utils/jwt.js";
import { toPublicUser } from "../utils/publicUser.js";
import { findAndConsumeBackupCode } from "../utils/backupCodes.js";
import { verifyTotpCode } from "../utils/totp.js";

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Il nome è obbligatorio"),
  email: z.string().trim().toLowerCase().email("Email non valida"),
  password: z.string().min(8, "La password deve avere almeno 8 caratteri"),
  preferredLanguage: z.enum(["it", "es"]).optional(),
  theme: z.enum(["light", "dark"]).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email non valida"),
  password: z.string().min(1, "Password obbligatoria"),
});

export const verifyTwoFactorLoginSchema = z.object({
  code: z.string().trim().min(6, "Codice non valido"),
});

export async function register(req: Request, res: Response) {
  const { name, email, password, preferredLanguage, theme } = req.body as z.infer<typeof registerSchema>;

  const existing = await UserModel.findOne({ email });
  if (existing) {
    sendError(res, 400, "Email già registrata");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await UserModel.create({ name, email, passwordHash, preferredLanguage, theme });

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

  if (user.role === "admin" && user.twoFactorEnabled) {
    const pendingToken = signTwoFactorPendingToken(String(user._id));
    res.cookie(TWO_FACTOR_PENDING_COOKIE_NAME, pendingToken, getTwoFactorPendingCookieOptions());
    res.json({ requiresTwoFactor: true });
    return;
  }

  const token = signToken(String(user._id), user.tokenVersion);
  res.cookie(COOKIE_NAME, token, getAuthCookieOptions());
  res.json({ requiresTwoFactor: false, user: toPublicUser(user) });
}

export async function verifyTwoFactorLogin(req: Request, res: Response) {
  const { code } = req.body as z.infer<typeof verifyTwoFactorLoginSchema>;

  const pendingToken = req.cookies?.[TWO_FACTOR_PENDING_COOKIE_NAME];
  if (!pendingToken) {
    sendError(res, 401, "Verifica 2FA non richiesta o scaduta");
    return;
  }

  let userId: string;
  try {
    userId = verifyTwoFactorPendingToken(pendingToken).sub;
  } catch {
    sendError(res, 401, "Verifica 2FA non richiesta o scaduta");
    return;
  }

  const user = await UserModel.findById(userId);
  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    sendError(res, 401, "Verifica 2FA non richiesta o scaduta");
    return;
  }

  let verified = verifyTotpCode(code, user.twoFactorSecret);
  if (!verified) {
    const backupIndex = await findAndConsumeBackupCode(code, user.twoFactorBackupCodeHashes);
    if (backupIndex !== null) {
      user.twoFactorBackupCodeHashes.splice(backupIndex, 1);
      verified = true;
    }
  }

  if (!verified) {
    sendError(res, 401, "Codice non valido");
    return;
  }

  await user.save();

  res.clearCookie(TWO_FACTOR_PENDING_COOKIE_NAME, getTwoFactorPendingCookieOptions());
  const token = signToken(String(user._id), user.tokenVersion);
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
