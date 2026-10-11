import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { loadGoogleAnalytics, revokeGoogleAnalytics } from "../lib/analytics";

const STORAGE_KEY = "arcadia_cookie_consent";
const CONSENT_VERSION = 1;

interface ConsentPreferences {
  analytics: boolean;
}

interface StoredConsent extends ConsentPreferences {
  version: number;
}

interface ConsentContextValue {
  /** true finché l'utente non ha ancora preso una decisione: mostra il banner. */
  isPending: boolean;
  preferences: ConsentPreferences;
  isSettingsOpen: boolean;
  acceptAll: () => void;
  rejectAll: () => void;
  savePreferences: (preferences: ConsentPreferences) => void;
  openSettings: () => void;
  closeSettings: () => void;
}

const ConsentContext = createContext<ConsentContextValue | undefined>(undefined);

function readStoredConsent(): StoredConsent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredConsent;
    if (parsed.version !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<StoredConsent | null>(() => readStoredConsent());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    if (stored?.analytics) {
      loadGoogleAnalytics();
    } else {
      revokeGoogleAnalytics();
    }
  }, [stored?.analytics]);

  function persist(preferences: ConsentPreferences) {
    const next: StoredConsent = { ...preferences, version: CONSENT_VERSION };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setStored(next);
    setIsSettingsOpen(false);
  }

  const value: ConsentContextValue = {
    isPending: stored === null,
    preferences: { analytics: stored?.analytics ?? false },
    isSettingsOpen,
    acceptAll: () => persist({ analytics: true }),
    rejectAll: () => persist({ analytics: false }),
    savePreferences: persist,
    openSettings: () => setIsSettingsOpen(true),
    closeSettings: () => setIsSettingsOpen(false),
  };

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export function useConsent(): ConsentContextValue {
  const context = useContext(ConsentContext);
  if (!context) {
    throw new Error("useConsent deve essere usato dentro un ConsentProvider");
  }
  return context;
}
