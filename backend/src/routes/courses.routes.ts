import { Router } from "express";
import {
  courseSchema,
  createCourse,
  deleteCourse,
  getCourse,
  listCourses,
  updateCourse,
} from "../controllers/courses.controller.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { uploadCourseCoverFile } from "../middleware/upload.js";
import lessonsRoutes from "./lessons.routes.js";

const router = Router();

router.get("/", requireAuth, listCourses);
router.get("/:id", requireAuth, getCourse);
router.post("/", requireAuth, requireAdmin, uploadCourseCoverFile, validateBody(courseSchema), createCourse);
router.put("/:id", requireAuth, requireAdmin, uploadCourseCoverFile, validateBody(courseSchema), updateCourse);
router.delete("/:id", requireAuth, requireAdmin, deleteCourse);

router.use("/:courseId/lessons", lessonsRoutes);

export default router;
