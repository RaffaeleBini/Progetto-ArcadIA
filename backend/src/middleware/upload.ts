import multer from "multer";
import type { NextFunction, Request, Response } from "express";
import { sendError } from "../utils/apiError.js";

const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      callback(new Error("Formato immagine non supportato (usa PNG, JPEG o WEBP)"));
      return;
    }
    callback(null, true);
  },
}).single("avatar");

export function uploadAvatarFile(req: Request, res: Response, next: NextFunction) {
  avatarUpload(req, res, (err: unknown) => {
    if (err instanceof Error) {
      sendError(res, 400, err.message);
      return;
    }
    next();
  });
}
