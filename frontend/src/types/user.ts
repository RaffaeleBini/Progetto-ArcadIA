export interface User {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  avatarUrl: string | null;
  bio: string | null;
  preferredLanguage: "it" | "es";
  theme: "light" | "dark";
  subscriptionPlan: "free" | "premium";
  subscriptionExpiresAt: string | null;
}
