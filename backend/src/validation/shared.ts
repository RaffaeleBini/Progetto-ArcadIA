import { z } from "zod";

// Un campo bilingue è opzionale lato validazione: una lingua può restare
// vuota se non ancora tradotta (vedi utils/locale.ts per il fallback in lettura).
export const localizedOptional = z.object({
  it: z.string().trim().optional().or(z.literal("")),
  es: z.string().trim().optional().or(z.literal("")),
});

export type LocalizedInput = z.infer<typeof localizedOptional>;
