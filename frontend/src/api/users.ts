import { apiClient } from "./client";
import type { User } from "../types/user";

export interface ProfileUpdate {
  name: string;
  bio: string;
  preferredLanguage: "it" | "es";
  theme: "light" | "dark";
}

export async function updateProfile(update: ProfileUpdate): Promise<User> {
  const { data } = await apiClient.put<{ user: User }>("/api/users/me", update);
  return data.user;
}

export async function uploadAvatar(file: File): Promise<User> {
  const formData = new FormData();
  formData.append("avatar", file);
  const { data } = await apiClient.post<{ user: User }>("/api/users/me/avatar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.user;
}
