import type { LocalizedString } from "../models/shared/localized.js";

export type Locale = "it" | "es";

function otherLocale(locale: Locale): Locale {
  return locale === "it" ? "es" : "it";
}

// Risolve un campo bilingue nella lingua richiesta, con fallback sull'altra
// lingua se quella richiesta è vuota (contenuto non ancora tradotto) invece
// di mostrare un campo vuoto al client.
export function pickLocalized(field: LocalizedString | null | undefined, locale: Locale): string | null {
  if (!field) return null;
  return field[locale] || field[otherLocale(locale)] || null;
}
