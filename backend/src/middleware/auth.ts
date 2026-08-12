import type { NextFunction, Request, Response } from "express";
import { sendError } from "../utils/apiError.js";
import { COOKIE_NAME, verifyToken } from "../utils/jwt.js";
import { UserModel } from "../models/User.js";

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

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = await UserModel.findById(req.userId);
  if (!user || user.role !== "admin") {
    sendError(res, 403, "Operazione riservata agli amministratori");
    return;
  }
  next();
}
