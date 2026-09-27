import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { UserModel } from "../models/User.js";
import { sendError } from "../utils/apiError.js";
import { generateTotpQrCode, generateTotpSecret, verifyTotpCode } from "../utils/totp.js";
import { generateBackupCodes, hashBackupCodes } from "../utils/backupCodes.js";

export const confirmTwoFactorSchema = z.object({
  code: z.string().trim().min(6, "Codice non valido"),
});

export const disableTwoFactorSchema = z.object({
  password: z.string().min(1, "Password obbligatoria"),
});

export async function setupTwoFactor(req: Request, res: Response) {
  const user = req.user;
  if (!user) {
    sendError(res, 401, "Sessione non valida");
    return;
  }

  if (user.twoFactorEnabled) {
    sendError(res, 400, "La 2FA è già attiva");
    return;
  }

  const secret = generateTotpSecret();
  user.twoFactorTempSecret = secret;
  await user.save();

  const qrCodeDataUrl = await generateTotpQrCode(user.email, secret);
  res.json({ qrCodeDataUrl, secret });
}

export async function confirmTwoFactorSetup(req: Request, res: Response) {
  const { code } = req.body as z.infer<typeof confirmTwoFactorSchema>;
  const user = req.user;
  if (!user) {
    sendError(res, 401, "Sessione non valida");
    return;
  }

  if (!user.twoFactorTempSecret) {
    sendError(res, 400, "Nessun setup 2FA in corso");
    return;
  }

  if (!verifyTotpCode(code, user.twoFactorTempSecret)) {
    sendError(res, 400, "Codice non valido");
    return;
  }

  const backupCodes = generateBackupCodes();

  user.twoFactorSecret = user.twoFactorTempSecret;
  user.twoFactorTempSecret = null;
  user.twoFactorEnabled = true;
  user.twoFactorBackupCodeHashes = await hashBackupCodes(backupCodes);
  await user.save();

  // I codici in chiaro vengono restituiti solo qui: da questo momento in poi
  // sul server restano solo i loro hash, come per le password.
  res.json({ backupCodes });
}

export async function disableTwoFactor(req: Request, res: Response) {
  const { password } = req.body as z.infer<typeof disableTwoFactorSchema>;
  const user = req.user;
  if (!user) {
    sendError(res, 401, "Sessione non valida");
    return;
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    sendError(res, 401, "Password non corretta");
    return;
  }

  user.twoFactorEnabled = false;
  user.twoFactorSecret = null;
  user.twoFactorTempSecret = null;
  user.twoFactorBackupCodeHashes = [];
  await user.save();

  res.status(204).send();
}
