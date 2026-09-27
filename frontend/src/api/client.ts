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

// Endpoint dove un 401 è un esito normale del flusso (credenziali errate,
// controllo di sessione), non un logout forzato da propagare globalmente.
const AUTH_ENDPOINTS_EXCLUDED_FROM_LOGOUT = [
  "/auth/login",
  "/auth/register",
  "/auth/me",
  "/auth/2fa/verify-login",
];

type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

// Sottoscrizione a "sessione scaduta durante l'uso": chiamata da AuthContext,
// che vive dentro l'albero React e può quindi svuotare lo stato utente e
// navigare — cosa che l'interceptor, fuori da React, non può fare da solo.
export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const url = axios.isAxiosError(error) ? error.config?.url ?? "" : "";
    const isExcluded = AUTH_ENDPOINTS_EXCLUDED_FROM_LOGOUT.some((path) => url.includes(path));

    if (axios.isAxiosError(error) && error.response?.status === 401 && !isExcluded) {
      unauthorizedListeners.forEach((listener) => listener());
    }

    return Promise.reject(error);
  }
);
