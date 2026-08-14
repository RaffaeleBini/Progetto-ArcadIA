export type NotificationType = "welcome" | "new_comment" | "course_added" | "course_completed";

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  read: boolean;
  relatedId: string | null;
  createdAt: string;
}
