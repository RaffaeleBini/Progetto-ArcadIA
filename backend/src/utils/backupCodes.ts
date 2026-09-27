import { randomInt } from "crypto";
import bcrypt from "bcryptjs";

const BACKUP_CODE_COUNT = 10;

function generateBackupCode(): string {
  const part = () =>
    Array.from({ length: 4 }, () => randomInt(0, 36).toString(36)).join("").toUpperCase();
  return `${part()}-${part()}`;
}

export function generateBackupCodes(): string[] {
  return Array.from({ length: BACKUP_CODE_COUNT }, generateBackupCode);
}

export async function hashBackupCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map((code) => bcrypt.hash(code, 12)));
}

// Confronta il codice inserito con ogni hash; ritorna l'indice consumato
// così il chiamante può rimuoverlo dalla lista (uso singolo).
export async function findAndConsumeBackupCode(code: string, hashes: string[]): Promise<number | null> {
  for (let i = 0; i < hashes.length; i++) {
    if (await bcrypt.compare(code, hashes[i])) {
      return i;
    }
  }
  return null;
}
