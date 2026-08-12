import { Router } from "express";
import {
  createLesson,
  deleteLesson,
  getLesson,
  lessonSchema,
  listLessons,
  updateLesson,
} from "../controllers/lessons.controller.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

const router = Router({ mergeParams: true });

router.get("/", requireAuth, listLessons);
router.get("/:id", requireAuth, getLesson);
router.post("/", requireAuth, requireAdmin, validateBody(lessonSchema), createLesson);
router.put("/:id", requireAuth, requireAdmin, validateBody(lessonSchema), updateLesson);
router.delete("/:id", requireAuth, requireAdmin, deleteLesson);

export default router;
