import axios from "axios";
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

export interface LoginResult {
  requiresTwoFactor: boolean;
  user: User | null;
}

export async function loginRequest(email: string, password: string): Promise<LoginResult> {
  const { data } = await apiClient.post<{ requiresTwoFactor: boolean; user?: User }>("/api/auth/login", {
    email,
    password,
  });
  return { requiresTwoFactor: data.requiresTwoFactor, user: data.user ?? null };
}

export async function verifyTwoFactorLoginRequest(code: string): Promise<User> {
  const { data } = await apiClient.post<{ user: User }>("/api/auth/2fa/verify-login", { code });
  return data.user;
}

export async function setupTwoFactorRequest(): Promise<{ qrCodeDataUrl: string; secret: string }> {
  const { data } = await apiClient.post<{ qrCodeDataUrl: string; secret: string }>("/api/auth/2fa/setup");
  return data;
}

export async function confirmTwoFactorSetupRequest(code: string): Promise<{ backupCodes: string[] }> {
  const { data } = await apiClient.post<{ backupCodes: string[] }>("/api/auth/2fa/confirm", { code });
  return data;
}

export async function disableTwoFactorRequest(password: string): Promise<void> {
  await apiClient.post("/api/auth/2fa/disable", { password });
}

export async function logoutRequest(): Promise<void> {
  await apiClient.post("/api/auth/logout");
}

export async function fetchMe(): Promise<User | null> {
  try {
    const { data } = await apiClient.get<{ user: User }>("/api/auth/me");
    return data.user;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      // Nessuna sessione valida: non è un errore, è lo stato "non autenticato".
      return null;
    }
    // Backend irraggiungibile, 500, timeout, ecc.: il chiamante deve saperlo,
    // non va confuso con l'assenza di sessione.
    throw err;
  }
}
