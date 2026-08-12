import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import it from "./locales/it.json";
import es from "./locales/es.json";

export const LANGUAGE_STORAGE_KEY = "arcadia_language";

i18n.use(initReactI18next).init({
  resources: {
    it: { translation: it },
    es: { translation: es },
  },
  lng: "it",
  fallbackLng: "it",
  interpolation: { escapeValue: false },
});

export default i18n;
