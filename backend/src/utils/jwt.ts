import jwt from "jsonwebtoken";
import type { CookieOptions } from "express";

const COOKIE_NAME = "arcadia_token";
const TWO_FACTOR_PENDING_COOKIE_NAME = "arcadia_2fa_pending";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const FIVE_MINUTES_MS = 5 * 60 * 1000;

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET non è definita nelle variabili d'ambiente");
  }
  return secret;
}

export function signToken(userId: string, tokenVersion: number): string {
  return jwt.sign({ sub: userId, tokenVersion }, getSecret(), { expiresIn: "7d" });
}

export function verifyToken(token: string): { sub: string; tokenVersion: number } {
  return jwt.verify(token, getSecret()) as { sub: string; tokenVersion: number };
}

export function getAuthCookieOptions(): CookieOptions {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: SEVEN_DAYS_MS,
  };
}

// Token intermedio emesso dopo password corretta quando serve un secondo
// fattore: prova solo che la password era giusta, non basta da solo ad
// autenticare una richiesta (verifyToken/requireAuth lo rifiutano perché
// privo di tokenVersion).
export function signTwoFactorPendingToken(userId: string): string {
  return jwt.sign({ sub: userId, scope: "2fa-pending" }, getSecret(), { expiresIn: "5m" });
}

export function verifyTwoFactorPendingToken(token: string): { sub: string } {
  const payload = jwt.verify(token, getSecret()) as { sub: string; scope?: string };
  if (payload.scope !== "2fa-pending") {
    throw new Error("Token non valido per la verifica 2FA");
  }
  return { sub: payload.sub };
}

export function getTwoFactorPendingCookieOptions(): CookieOptions {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: FIVE_MINUTES_MS,
  };
}

export { COOKIE_NAME, TWO_FACTOR_PENDING_COOKIE_NAME };
