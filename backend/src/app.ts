import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { sendError } from "./utils/apiError.js";
import authRoutes from "./routes/auth.routes.js";

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

  app.use("/api/auth", authRoutes);

  app.use((_req, res) => {
    sendError(res, 404, "Risorsa non trovata");
  });

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    sendError(res, 500, "Errore interno del server");
  });

  return app;
}
