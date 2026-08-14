import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Award, BookOpen, MessageCircle, Sparkles } from "lucide-react";
import { useNotifications } from "../context/NotificationsContext";
import type { Notification, NotificationType } from "../types/notification";
import styles from "./NotificationsPage.module.css";

const ICONS: Record<NotificationType, typeof Sparkles> = {
  welcome: Sparkles,
  new_comment: MessageCircle,
  course_added: BookOpen,
  course_completed: Award,
};

function getLink(notification: Notification): string | null {
  switch (notification.type) {
    case "new_comment":
      return "/board";
    case "course_added":
    case "course_completed":
      return notification.relatedId ? `/courses/${notification.relatedId}` : null;
    default:
      return null;
  }
}

export default function NotificationsPage() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  function formatDate(value: string) {
    return new Date(value).toLocaleString(i18n.language === "es" ? "es-ES" : "it-IT");
  }

  async function handleClick(notification: Notification) {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    const link = getLink(notification);
    if (link) {
      navigate(link);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <h1 className={styles.title}>{t("notifications.title")}</h1>
        {unreadCount > 0 && (
          <button type="button" className={styles.markAllBtn} onClick={() => markAllAsRead()}>
            {t("notifications.markAllRead")}
          </button>
        )}
      </div>

      {notifications.length === 0 && <p className={styles.empty}>{t("notifications.empty")}</p>}

      <div className={styles.list}>
        {notifications.map((notification) => {
          const Icon = ICONS[notification.type];
          return (
            <button
              key={notification.id}
              type="button"
              className={`panel ${styles.item} ${!notification.read ? styles.itemUnread : ""}`}
              onClick={() => handleClick(notification)}
            >
              <Icon size={18} strokeWidth={1.5} className={styles.icon} />
              <div className={styles.body}>
                <p className={styles.message}>{notification.message}</p>
                <span className={styles.date}>{formatDate(notification.createdAt)}</span>
              </div>
              {!notification.read && <span className={styles.dot} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
