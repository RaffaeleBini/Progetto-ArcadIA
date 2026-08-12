import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import i18n from "../i18n";
import { useAuth } from "./AuthContext";
import { updateProfile } from "../api/users";

type Theme = "light" | "dark";
type Language = "it" | "es";

const THEME_STORAGE_KEY = "arcadia_theme";
const LANGUAGE_STORAGE_KEY = "arcadia_language";

interface PreferencesContextValue {
  theme: Theme;
  language: Language;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

function applyTheme(theme: Theme) {
  if (theme === "light") {
    document.documentElement.setAttribute("data-theme", "light");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { user, setUser } = useAuth();
  const [theme, setThemeState] = useState<Theme>(() => {
    return localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : "dark";
  });
  const [language, setLanguageState] = useState<Language>(() => {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY) === "es" ? "es" : "it";
  });

  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language]);

  useEffect(() => {
    if (user) {
      setThemeState(user.theme);
      setLanguageState(user.preferredLanguage);
    }
  }, [user]);

  async function persist(next: { theme?: Theme; language?: Language }) {
    if (!user) return;
    const updated = await updateProfile({
      name: user.name,
      bio: user.bio ?? "",
      preferredLanguage: next.language ?? language,
      theme: next.theme ?? theme,
    });
    setUser(updated);
  }

  function setTheme(next: Theme) {
    setThemeState(next);
    if (user) {
      void persist({ theme: next });
    } else {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    }
  }

  function setLanguage(next: Language) {
    setLanguageState(next);
    if (user) {
      void persist({ language: next });
    } else {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    }
  }

  return (
    <PreferencesContext.Provider value={{ theme, language, setTheme, setLanguage }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences deve essere usato dentro un PreferencesProvider");
  }
  return context;
}
