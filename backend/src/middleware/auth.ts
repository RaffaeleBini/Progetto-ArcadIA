import type { NextFunction, Request, Response } from "express";
import { sendError } from "../utils/apiError.js";
import { COOKIE_NAME, verifyToken } from "../utils/jwt.js";
import { UserModel } from "../models/User.js";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    sendError(res, 401, "Autenticazione richiesta");
    return;
  }

  try {
    const payload = verifyToken(token);
    const user = await UserModel.findById(payload.sub);
    // tokenVersion diverso: la password è cambiata dopo che questo token è
    // stato firmato. Il token ha una firma valida, ma non è più utilizzabile.
    if (!user || user.tokenVersion !== payload.tokenVersion) {
      sendError(res, 401, "Sessione non valida o scaduta");
      return;
    }
    req.userId = payload.sub;
    req.user = user;
    next();
  } catch {
    sendError(res, 401, "Sessione non valida o scaduta");
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = req.user ?? (await UserModel.findById(req.userId));
  if (!user || user.role !== "admin") {
    sendError(res, 403, "Operazione riservata agli amministratori");
    return;
  }
  next();
}
