// Convenzioni di naming condivise tra export-notebooks (crea il repo pubblico dei
// notebook) e import-formazione (costruisce gli URL verso quel repo): devono restare
// identiche, altrimenti i link puntano a file che non esistono.
export const stripAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

export function courseSlug(dirName: string): string {
  return stripAccents(dirName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-2026$/, "");
}

export function safeName(name: string): string {
  if (/^[A-Za-z0-9._-]+$/.test(name)) return name;
  return stripAccents(name).replace(/[^A-Za-z0-9._-]+/g, "_");
}
