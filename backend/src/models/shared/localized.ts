// Sotto-schema riusato da Course/Lesson/Path per i campi di contenuto
// bilingue (IT/ES). Un campo può restare vuoto se la traduzione non è
// ancora pronta: la risoluzione/fallback avviene in utils/locale.ts.
export const localizedStringSchema = {
  it: { type: String, trim: true, default: null },
  es: { type: String, trim: true, default: null },
};

export interface LocalizedString {
  it?: string | null;
  es?: string | null;
}
