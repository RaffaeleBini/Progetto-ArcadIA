import { Router } from "express";
import {
  createPath,
  deletePath,
  getPath,
  getPathProgress,
  listPaths,
  pathSchema,
  updatePath,
} from "../controllers/paths.controller.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

const router = Router();

router.get("/", requireAuth, listPaths);
router.get("/:id", requireAuth, getPath);
router.get("/:id/progress", requireAuth, getPathProgress);
router.post("/", requireAuth, requireAdmin, validateBody(pathSchema), createPath);
router.put("/:id", requireAuth, requireAdmin, validateBody(pathSchema), updatePath);
router.delete("/:id", requireAuth, requireAdmin, deletePath);

export default router;
