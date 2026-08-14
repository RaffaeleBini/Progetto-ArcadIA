import { Router } from "express";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../controllers/notifications.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, listNotifications);
router.put("/read-all", requireAuth, markAllNotificationsRead);
router.put("/:id/read", requireAuth, markNotificationRead);

export default router;
