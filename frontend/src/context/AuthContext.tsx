import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import type { User } from "../types/user";
import { fetchMe, loginRequest, logoutRequest, registerRequest } from "../api/auth";
import { onUnauthorized } from "../api/client";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  authError: boolean;
  retryAuth: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    preferredLanguage: "it" | "es",
    theme: "light" | "dark"
  ) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(false);

  const checkAuth = useCallback(() => {
    setIsLoading(true);
    setAuthError(false);
    fetchMe()
      .then(setUser)
      .catch(() => setAuthError(true))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Sessione scaduta durante la navigazione (401 su una chiamata qualunque,
  // non sul controllo iniziale): pulisce lo stato e riporta al login, senza
  // bisogno che l'utente ricarichi manualmente la pagina.
  useEffect(() => {
    return onUnauthorized(() => {
      setUser(null);
      navigate("/login");
    });
  }, [navigate]);

  const login = useCallback(async (email: string, password: string) => {
    const loggedInUser = await loginRequest(email, password);
    setUser(loggedInUser);
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string, preferredLanguage: "it" | "es", theme: "light" | "dark") => {
      await registerRequest(name, email, password, preferredLanguage, theme);
    },
    []
  );

  const logout = useCallback(async () => {
    await logoutRequest();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, authError, retryAuth: checkAuth, login, register, logout, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve essere usato dentro un AuthProvider");
  }
  return context;
}
