import { Router } from "express";
import {
  courseSchema,
  createCourse,
  deleteCourse,
  getCourse,
  listCourses,
  updateCourse,
  uploadCourseCoverImage,
} from "../controllers/courses.controller.js";
import { downloadCertificate, getProgress } from "../controllers/progress.controller.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { uploadCourseCoverFile } from "../middleware/upload.js";
import { uploadRateLimiter } from "../middleware/rateLimit.js";
import lessonsRoutes from "./lessons.routes.js";

const router = Router();

router.get("/", requireAuth, listCourses);
router.get("/:id", requireAuth, getCourse);
router.post("/", requireAuth, requireAdmin, validateBody(courseSchema), createCourse);
router.put("/:id", requireAuth, requireAdmin, validateBody(courseSchema), updateCourse);
router.post(
  "/:id/cover",
  requireAuth,
  requireAdmin,
  uploadRateLimiter,
  uploadCourseCoverFile,
  uploadCourseCoverImage
);
router.delete("/:id", requireAuth, requireAdmin, deleteCourse);

router.get("/:courseId/progress", requireAuth, getProgress);
router.get("/:courseId/certificate", requireAuth, downloadCertificate);

router.use("/:courseId/lessons", lessonsRoutes);

export default router;
