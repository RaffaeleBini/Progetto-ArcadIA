import { Router } from "express";
import { setSubscription, subscriptionSchema } from "../controllers/admin.controller.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

const router = Router();

router.put("/:id/subscription", requireAuth, requireAdmin, validateBody(subscriptionSchema), setSubscription);

export default router;
