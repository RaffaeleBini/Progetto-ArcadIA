import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from "../api/notifications";
import type { Notification } from "../types/notification";

const POLL_INTERVAL_MS = 30_000;

interface NotificationsContextValue {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const refresh = useCallback(() => {
    fetchNotifications().then(setNotifications);
  }, []);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    window.addEventListener("focus", refresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", refresh);
    };
  }, [user, refresh]);

  const markAsRead = useCallback(async (id: string) => {
    await markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllAsRead = useCallback(async () => {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications deve essere usato dentro un NotificationsProvider");
  }
  return context;
}
