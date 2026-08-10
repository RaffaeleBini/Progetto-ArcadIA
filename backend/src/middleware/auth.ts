import type { NextFunction, Request, Response } from "express";
import { sendError } from "../utils/apiError.js";
import { COOKIE_NAME, verifyToken } from "../utils/jwt.js";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    sendError(res, 401, "Autenticazione richiesta");
    return;
  }

  try {
    const payload = verifyToken(token);
    req.userId = payload.sub;
    next();
  } catch {
    sendError(res, 401, "Sessione non valida o scaduta");
  }
}
