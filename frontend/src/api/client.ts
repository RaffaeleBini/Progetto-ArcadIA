import axios from "axios";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

export interface ApiErrorBody {
  error: true;
  message: string;
}

export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError<ApiErrorBody>(err) && err.response?.data?.message) {
    return err.response.data.message;
  }
  return fallback;
}
