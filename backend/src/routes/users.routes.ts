import { Router } from "express";
import {
  changePassword,
  changePasswordSchema,
  getPublicProfile,
  updateMe,
  updateProfileSchema,
  uploadMyAvatar,
} from "../controllers/users.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { uploadAvatarFile } from "../middleware/upload.js";
import { authRateLimiter, uploadRateLimiter } from "../middleware/rateLimit.js";

const router = Router();

router.get("/:id", requireAuth, getPublicProfile);
router.put("/me", requireAuth, validateBody(updateProfileSchema), updateMe);
router.post("/me/avatar", requireAuth, uploadRateLimiter, uploadAvatarFile, uploadMyAvatar);
router.post("/me/password", requireAuth, authRateLimiter, validateBody(changePasswordSchema), changePassword);

export default router;
