import { apiClient } from "./client";
import type { Notification } from "../types/notification";

export async function fetchNotifications(): Promise<Notification[]> {
  const { data } = await apiClient.get<{ notifications: Notification[] }>("/api/notifications");
  return data.notifications;
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.put(`/api/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.put("/api/notifications/read-all");
}
