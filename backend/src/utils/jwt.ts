import jwt from "jsonwebtoken";
import type { CookieOptions } from "express";

const COOKIE_NAME = "arcadia_token";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

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

export { COOKIE_NAME };
