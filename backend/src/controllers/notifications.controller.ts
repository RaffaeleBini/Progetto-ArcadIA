import type { Request, Response } from "express";
import { NotificationModel } from "../models/Notification.js";
import { sendError } from "../utils/apiError.js";

function toNotificationDto(notification: InstanceType<typeof NotificationModel>) {
  return {
    id: String(notification._id),
    type: notification.type,
    message: notification.message,
    read: notification.read,
    relatedId: notification.relatedId ? String(notification.relatedId) : null,
    createdAt: notification.createdAt,
  };
}

export async function listNotifications(req: Request, res: Response) {
  const notifications = await NotificationModel.find({ recipient: req.userId }).sort({ createdAt: -1 });
  res.json({ notifications: notifications.map(toNotificationDto) });
}

export async function markNotificationRead(req: Request, res: Response) {
  const notification = await NotificationModel.findOneAndUpdate(
    { _id: req.params.id, recipient: req.userId },
    { read: true },
    { new: true }
  );

  if (!notification) {
    sendError(res, 404, "Notifica non trovata");
    return;
  }

  res.json({ notification: toNotificationDto(notification) });
}

export async function markAllNotificationsRead(req: Request, res: Response) {
  await NotificationModel.updateMany({ recipient: req.userId, read: false }, { read: true });
  res.status(204).send();
}
