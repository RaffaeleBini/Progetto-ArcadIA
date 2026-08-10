import { Router } from "express";
import { login, loginSchema, logout, me, register, registerSchema } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { authRateLimiter } from "../middleware/rateLimit.js";

const router = Router();

router.post("/register", authRateLimiter, validateBody(registerSchema), register);
router.post("/login", authRateLimiter, validateBody(loginSchema), login);
router.post("/logout", requireAuth, logout);
router.get("/me", requireAuth, me);

export default router;
