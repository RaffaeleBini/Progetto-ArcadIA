import { Router } from "express";
import { verifyCertificate } from "../controllers/progress.controller.js";
import { verifyRateLimiter } from "../middleware/rateLimit.js";

const router = Router();

router.get("/:certificateId", verifyRateLimiter, verifyCertificate);

export default router;
