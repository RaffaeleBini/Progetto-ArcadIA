import { Router } from "express";
import {
  login,
  loginSchema,
  logout,
  me,
  register,
  registerSchema,
  verifyTwoFactorLogin,
  verifyTwoFactorLoginSchema,
} from "../controllers/auth.controller.js";
import {
  confirmTwoFactorSchema,
  confirmTwoFactorSetup,
  disableTwoFactor,
  disableTwoFactorSchema,
  setupTwoFactor,
} from "../controllers/twoFactor.controller.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { authRateLimiter } from "../middleware/rateLimit.js";

const router = Router();

router.post("/register", authRateLimiter, validateBody(registerSchema), register);
router.post("/login", authRateLimiter, validateBody(loginSchema), login);
router.post("/2fa/verify-login", authRateLimiter, validateBody(verifyTwoFactorLoginSchema), verifyTwoFactorLogin);
router.post("/logout", requireAuth, logout);
router.get("/me", requireAuth, me);

router.post("/2fa/setup", requireAuth, requireAdmin, authRateLimiter, setupTwoFactor);
router.post(
  "/2fa/confirm",
  requireAuth,
  requireAdmin,
  authRateLimiter,
  validateBody(confirmTwoFactorSchema),
  confirmTwoFactorSetup
);
router.post(
  "/2fa/disable",
  requireAuth,
  requireAdmin,
  authRateLimiter,
  validateBody(disableTwoFactorSchema),
  disableTwoFactor
);

export default router;
