import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { sendError } from "./utils/apiError.js";
import authRoutes from "./routes/auth.routes.js";
import usersRoutes from "./routes/users.routes.js";
import coursesRoutes from "./routes/courses.routes.js";
import adminRoutes from "./routes/admin.routes.js";

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
  app.use("/api/users", usersRoutes);
  app.use("/api/courses", coursesRoutes);
  app.use("/api/admin/users", adminRoutes);

  app.use((_req, res) => {
    sendError(res, 404, "Risorsa non trovata");
  });

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    sendError(res, 500, "Errore interno del server");
  });

  return app;
}
