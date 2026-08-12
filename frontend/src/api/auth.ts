import { apiClient } from "./client";
import type { User } from "../types/user";

export async function registerRequest(
  name: string,
  email: string,
  password: string,
  preferredLanguage: "it" | "es",
  theme: "light" | "dark"
): Promise<User> {
  const { data } = await apiClient.post<{ user: User }>("/api/auth/register", {
    name,
    email,
    password,
    preferredLanguage,
    theme,
  });
  return data.user;
}

export async function loginRequest(email: string, password: string): Promise<User> {
  const { data } = await apiClient.post<{ user: User }>("/api/auth/login", { email, password });
  return data.user;
}

export async function logoutRequest(): Promise<void> {
  await apiClient.post("/api/auth/logout");
}

export async function fetchMe(): Promise<User | null> {
  try {
    const { data } = await apiClient.get<{ user: User }>("/api/auth/me");
    return data.user;
  } catch {
    return null;
  }
}
