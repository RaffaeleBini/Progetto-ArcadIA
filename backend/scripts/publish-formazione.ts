// Pubblica (draft → published) corsi e percorsi già importati con `import:formazione`.
// Cambia solo il campo `status`, non cancella nulla ed è reversibile con --draft.
//
//   npm run publish:formazione -- --wave 1                         (dry-run: solo rapporto)
//   npm run publish:formazione -- --wave 1 --apply --allow-remote  (scrive sul DB di MONGODB_URI)
//
// Opzioni: --wave 1            ondata 1 del piano: corsi 01–08 e 11, percorsi P1 e P2
//          --wave 2             corsi 10, 12, 13, 14, 18, 20, percorsi P4, P11 e P12
//          --wave dl           corsi 00B, 09, 13, 15, 16, 17, 19, 22, percorsi P6 e P7
//          --courses 01,02     elenco esplicito di corsi (per `code`)
//          --paths P1,P2       elenco esplicito di percorsi (per `code`)
//          --draft             riporta in draft invece di pubblicare
//          --allow-remote      necessario con --apply se MONGODB_URI non è localhost
//
// Controlli prima di scrivere: ogni corso deve esistere e avere lezioni; un percorso si
// pubblica solo se tutti i suoi corsi sono pubblicati (o lo diventano in questa stessa
// esecuzione). Il corso legacy senza `code` non viene mai toccato.
import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import { CourseModel } from "../src/models/Course.js";
import { LessonModel } from "../src/models/Lesson.js";
import { PathModel } from "../src/models/Path.js";

const args = process.argv.slice(2);
const arg = (name: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const flag = (name: string): boolean => args.includes(`--${name}`);
const list = (name: string): string[] =>
  arg(name)?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];

const WAVES: Record<string, { courses: string[]; paths: string[] }> = {
  "1": { courses: ["01", "02", "03", "04", "05", "06", "07", "08", "11"], paths: ["P1", "P2"] },
  // Ondata 2 del piano: AI Engineer, NLP e MLOps (il 13 è già pubblicato con `dl`).
  "2": { courses: ["10", "12", "13", "14", "18", "20"], paths: ["P4", "P11", "P12"] },
  // Deep learning e visione artificiale: corsi già importati in draft (il 22 è già pubblicato).
  dl: { courses: ["00B", "09", "13", "15", "16", "17", "19", "22"], paths: ["P6", "P7"] },
};

const wave = arg("wave");
if (wave && !WAVES[wave]) {
  console.error(`Ondata sconosciuta: ${wave}. Disponibili: ${Object.keys(WAVES).join(", ")}`);
  process.exit(1);
}
const courseCodes = [...new Set([...(wave ? WAVES[wave].courses : []), ...list("courses")])];
const pathCodes = [...new Set([...(wave ? WAVES[wave].paths : []), ...list("paths")])];
if (!courseCodes.length && !pathCodes.length) {
  console.error("Uso: --wave 1|2|dl | --courses 01,02 | --paths P1 [--draft] [--apply] [--allow-remote]");
  process.exit(1);
}

const target = flag("draft") ? "draft" : "published";
const APPLY = flag("apply");

async function main() {
  const uri = process.env.MONGODB_URI ?? "";
  const host = uri.replace(/^mongodb(\+srv)?:\/\/([^@/]*@)?/, "").split(/[/?]/)[0];
  console.log(`${APPLY ? "SCRITTURA" : "DRY-RUN"}  stato di destinazione: ${target}`);
  console.log(`Database: ${host}\n`);
  if (APPLY && !/^(localhost|127\.0\.0\.1)(:|$)/.test(host) && !flag("allow-remote")) {
    throw new Error("MONGODB_URI non è locale: ricontrolla di avere il backup e aggiungi --allow-remote.");
  }
  await connectDB();

  let errors = 0;
  const courses = await CourseModel.find({ code: { $in: courseCodes } });
  const byCode = new Map(courses.map((c) => [c.code, c]));
  const lessonCounts = new Map<string, number>();
  for (const c of courses) lessonCounts.set(c.code, await LessonModel.countDocuments({ course: c._id }));

  console.log("Corsi:");
  for (const code of courseCodes) {
    const c = byCode.get(code);
    if (!c) {
      console.log(`  ${code}  ✗ non trovato nel DB`);
      errors++;
      continue;
    }
    const n = lessonCounts.get(code) ?? 0;
    const empty = target === "published" && n === 0;
    if (empty) errors++;
    console.log(
      `  ${code}  ${c.status} → ${target}  ${n} lezioni  accesso ${c.accessLevel}${empty ? "  ✗ nessuna lezione" : ""}`,
    );
  }

  // Corsi che risulteranno pubblicati dopo questa esecuzione (per il controllo dei percorsi).
  const willBePublished = (code: string, current: string | undefined): boolean =>
    courseCodes.includes(code) ? target === "published" : current === "published";

  console.log("\nPercorsi:");
  const paths = await PathModel.find({ code: { $in: pathCodes } }).populate("steps.course", "code status");
  const pathByCode = new Map(paths.map((p) => [p.code, p]));
  for (const code of pathCodes) {
    const p = pathByCode.get(code);
    if (!p) {
      console.log(`  ${code}  ✗ non trovato nel DB`);
      errors++;
      continue;
    }
    const missing: string[] = [];
    for (const s of p.steps) {
      const c = s.course as unknown as { code: string; status: string } | null;
      if (!c) missing.push("(corso mancante)");
      else if (target === "published" && !s.optional && !willBePublished(c.code, c.status)) missing.push(c.code);
    }
    if (missing.length) errors++;
    console.log(
      `  ${code}  ${p.status} → ${target}  ${p.steps.length} corsi  accesso ${p.accessLevel}` +
        (missing.length ? `  ✗ corsi non pubblicati: ${missing.join(", ")}` : ""),
    );
  }

  if (errors) throw new Error(`\n${errors} problemi nel rapporto: nessuna scrittura.`);
  if (!APPLY) {
    console.log("\nNessuna scrittura (dry-run). Nessun errore. Aggiungi --apply per scrivere.");
    await mongoose.disconnect();
    return;
  }

  const c = await CourseModel.updateMany({ code: { $in: courseCodes } }, { $set: { status: target } });
  const p = await PathModel.updateMany({ code: { $in: pathCodes } }, { $set: { status: target } });
  console.log(`\nFatto: ${c.modifiedCount} corsi e ${p.modifiedCount} percorsi aggiornati a ${target}.`);
  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error(e instanceof Error ? e.message : e);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
