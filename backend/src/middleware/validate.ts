import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { sendError } from "../utils/apiError.js";

export function validateBody(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      sendError(res, 400, result.error.issues[0]?.message ?? "Dati non validi");
      return;
    }
    req.body = result.data;
    next();
  };
}
