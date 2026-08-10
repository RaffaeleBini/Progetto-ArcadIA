import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { sendError } from "./utils/apiError.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.FRONTEND_URL,
      credentials: true,
    })
  );
  app.use(cookieParser());
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use((_req, res) => {
    sendError(res, 404, "Risorsa non trovata");
  });

  return app;
}
