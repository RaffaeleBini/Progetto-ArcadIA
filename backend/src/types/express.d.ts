import "express";
import type { HydratedDocument } from "mongoose";
import type { User } from "../models/User.js";

declare module "express-serve-static-core" {
  interface Request {
    userId?: string;
    // Popolato da requireAuth (che deve già consultare il DB per verificare
    // tokenVersion): evita una seconda query identica in requireAdmin.
    user?: HydratedDocument<User>;
  }
}
