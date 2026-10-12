// Importa corsi, lezioni e percorsi dalla cartella sorgente `Formazione/` in MongoDB.
// Ripetibile (upsert), non cancella mai, tutto entra in `draft`, `videoUrl` non si tocca.
//
//   npm run import:formazione -- --src <Formazione>                    (dry-run: solo rapporto)
//   npm run import:formazione -- --src <Formazione> --apply            (scrive sul DB di MONGODB_URI)
//
// Opzioni: --only 02,07,P1   limita a certi corsi/percorsi (i percorsi richiedono i loro corsi già importati)
//          --show 02,10      elenca le lezioni (titolo, T=teoria N=notebook E=esercizi) per la revisione
//          --repo utente/nome --branch main   repo pubblico dei notebook (default come export-notebooks)
//          --allow-remote    necessario con --apply se MONGODB_URI non è localhost
//
// Mappa corsi/percorsi: scripts/formazione/catalog.json (rivedibile a mano).
//
// Come si costruisce una lezione:
//  - teoria: file `NN_slug.md` (es) e `NN_slug_IT.md` (it) → theoryContent; titolo = primo `#`;
//  - notebook della lezione e di esercizi → URL GitHub (il frontend li converte in link Colab);
//  - teoria e notebook si abbinano per slug (dopo il numero), o per numero (`match: "number"`),
//    o con `source.pairs` nel catalogo; indici e glossari non sono lezioni.
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import { CourseModel } from "../src/models/Course.js";
import { LessonModel } from "../src/models/Lesson.js";
import { PathModel } from "../src/models/Path.js";
import { UserModel } from "../src/models/User.js";
import { courseSlug, safeName, stripAccents } from "./lib/formazione.js";

type Lang = "it" | "es";
type Loc = Record<Lang, string | null>;
const LANGS: Lang[] = ["it", "es"];
const emptyLoc = (): Loc => ({ it: null, es: null });

interface CatalogCourse {
  code: string;
  folder: string;
  title: Loc;
  description?: Loc;
  block: string;
  accessLevel: "free" | "premium";
  estimatedHours: number;
  catalogOrder: number;
  prerequisites?: { course: string; note?: string }[];
  source: {
    theory?: string | null; // cartella della teoria ("." = radice del corso)
    lessons?: string | null; // cartella dei notebook di lezione
    exercises?: string | null; // cartella dei notebook di esercizi
    unsuffixed?: Lang; // lingua dei file senza _IT (default es)
    match?: "slug" | "number";
    modules?: string[]; // corso 00: prefissi delle cartelle Modulo_NN_*
    pairs?: Record<string, string | string[]>; // slug notebook → file di teoria
  };
}
interface CatalogPath {
  code: string;
  title: Loc;
  description?: Loc;
  audience: Loc;
  accessLevel: "free" | "premium";
  estimatedHours: number;
  estimatedWeeks: number;
  steps: {
    course: string;
    optional?: boolean;
    note?: string;
    lessonFilter?: { chapters?: number[]; modules?: string[] };
  }[];
}

const args = process.argv.slice(2);
const arg = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const flag = (name: string) => args.includes(`--${name}`);

const SRC = arg("src");
const REPO = arg("repo") ?? "RaffaeleBini/arcadia-notebooks";
const BRANCH = arg("branch") ?? "main";
const APPLY = flag("apply");
const SHOW = arg("show")?.split(",") ?? [];
const ONLY = arg("only")?.split(",").map((s) => s.trim()).filter(Boolean);
const CATALOG = path.resolve(import.meta.dirname, "formazione/catalog.json");

if (!SRC) {
  console.error("Uso: --src <cartella Formazione> [--apply] [--only 02,P1] [--repo utente/nome] [--allow-remote]");
  process.exit(1);
}

// ---------- lettura file ----------

interface Parsed {
  lang: Lang;
  base: string; // nome senza estensione né _IT
  slug: string;
  num: number | null;
  sortKey: number;
  module: string | null; // "M3" per il corso 10
  isExercise: boolean;
}

const NON_LESSON = /(^|_)(indice|glosario|glossario|glosarios)(_|$)|^(temario|progress|style|readme|guida|guida-accesso|test|prova)/i;

function parseName(file: string, unsuffixed: Lang): Parsed {
  const ext = path.extname(file);
  let base = file.slice(0, -ext.length);
  let lang: Lang = unsuffixed;
  if (/_IT$/.test(base)) {
    lang = "it";
    base = base.slice(0, -3);
  }
  const norm = (s: string) => stripAccents(s).toLowerCase();
  let m: RegExpMatchArray | null;
  if ((m = base.match(/^clase(\d+)_(practica_)?(.+)$/))) {
    return { lang, base, slug: norm(m[3]), num: +m[1], sortKey: +m[1], module: null, isExercise: !!m[2] };
  }
  if ((m = base.match(/^Sesion_(\d+)_(.+)$/))) {
    return { lang, base, slug: norm(`sesion_${m[1]}_${m[2]}`), num: +m[1], sortKey: +m[1], module: null, isExercise: false };
  }
  if ((m = base.match(/^M(\d+)_C(\d+)_(.+)$/))) {
    return { lang, base, slug: norm(m[3]), num: +m[2], sortKey: +m[1] * 1000 + +m[2], module: `M${m[1]}`, isExercise: false };
  }
  if ((m = base.match(/^(\d+)\.(\d+)_(.+)$/))) {
    return { lang, base, slug: norm(m[3]), num: +m[2], sortKey: +m[1] * 1000 + +m[2], module: null, isExercise: false };
  }
  if ((m = base.match(/^(\d+)_(.+)$/))) {
    return { lang, base, slug: norm(m[2]), num: +m[1], sortKey: +m[1], module: null, isExercise: false };
  }
  return { lang, base, slug: norm(base), num: null, sortKey: -1, module: null, isExercise: false };
}

interface Doc {
  parsed: Parsed;
  rel: string; // percorso relativo alla cartella del corso (posix)
  abs: string;
}

function listDocs(courseDir: string, subdir: string, ext: string, unsuffixed: Lang): Doc[] {
  const dir = path.join(courseDir, subdir);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && path.extname(e.name) === ext)
    .map((e) => ({
      parsed: parseName(e.name, unsuffixed),
      rel: subdir === "." ? e.name : `${subdir}/${e.name}`,
      abs: path.join(dir, e.name),
    }))
    .filter((d) => !NON_LESSON.test(d.parsed.base) && !NON_LESSON.test(d.parsed.slug));
}

const heading = (md: string) => {
  const line = md.split("\n").find((l) => /^#\s+\S/.test(l));
  return line ? line.replace(/^#\s+/, "").trim() : null;
};
// "2. Regressione…", "Modulo 03 — Prompt…", "Modulo 1 · Lezione 10 — …" → solo il titolo
function cleanTitle(raw: string | null): string | null {
  if (!raw) return null;
  let t = raw.replace(/[`*_]/g, "").trim();
  for (let i = 0; i < 3; i++) {
    t = t
      .replace(/^\d+(\.\d+)?[.)]?\s+(?=\S)/, "")
      .replace(/^(Modulo|Módulo|Settimana|Semana|Capitolo|Capítulo|Sessione|Sesión|Lezione|Lección|Notebook|Clase|Classe)\s+\d+(\.\d+)?\s*[—–:·.-]\s*/i, "");
  }
  return t.trim() || null;
}
function notebookTitle(abs: string): string | null {
  try {
    const nb = JSON.parse(fs.readFileSync(abs, "utf-8")) as { cells?: { cell_type: string; source: string | string[] }[] };
    for (const c of nb.cells ?? []) {
      if (c.cell_type !== "markdown") continue;
      const text = Array.isArray(c.source) ? c.source.join("") : c.source;
      const h = heading(text);
      if (h) return cleanTitle(h);
    }
  } catch {
    // notebook non valido: lo segnala export-notebooks
  }
  return null;
}
const prettify = (slug: string) => {
  const s = slug.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
};


// ---------- pulizia del markdown ----------

// Sul sito non esistono i file .md del manuale: le righe di navigazione tra capitoli
// ("← Precedente · Indice · Successivo →") si tolgono, i link inline (es. al glossario)
// restano come testo semplice. I blocchi di codice non si toccano.
const MD_LINK = /\[([^\]]*)\]\(([^)\s]+?\.md(?:#[^)\s]*)?)\)/g;
const NAV_WORDS = /precedente|successivo|prossimo|capitolo|indice|torna|all'indice|anterior|siguiente|volver|índice|previo|next|previous|index|back/gi;

function cleanMdLinks(md: string, stats: { navLines: number; inlineLinks: number }): string {
  let inFence = false;
  const out: string[] = [];
  for (const line of md.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    if (inFence || !MD_LINK.test(line)) {
      MD_LINK.lastIndex = 0;
      out.push(line);
      continue;
    }
    MD_LINK.lastIndex = 0;
    const rest = line.replace(MD_LINK, "").replace(NAV_WORDS, "").replace(/[\s\[\]()*·|←→⬅➡⟵⟶:—–\-_]/g, "");
    if (!rest) {
      stats.navLines++;
      continue;
    }
    out.push(line.replace(MD_LINK, (_m, text: string) => (stats.inlineLinks++, text)));
  }
  return out.join("\n").replace(/^(\s*---\s*\n)+/, "").replace(/(\n\s*---\s*)+\s*$/, "\n").replace(/\n{3,}/g, "\n\n");
}

// ---------- costruzione lezioni ----------

interface LessonDraft {
  order: number;
  chapterNum: number | null;
  module: string | null;
  title: Loc;
  theoryContent: Loc;
  lessonNotebookUrl: Loc;
  exerciseNotebookUrl: Loc;
}

interface Unit {
  chapter: Map<Lang, Doc> | null; // teoria per lingua
  chapterSlug: string | null;
  chapterBase: string | null;
  lesson: Map<Lang, Doc> | null;
  exercise: Map<Lang, Doc> | null;
  sortKey: number;
  num: number | null;
  module: string | null;
  slug: string;
}

interface CourseReport {
  code: string;
  lessons: LessonDraft[];
  warnings: string[];
  errors: string[];
  relativeImages: number;
  cleaned: { navLines: number; inlineLinks: number };
}

const byLang = (docs: Doc[]) => {
  const groups = new Map<string, Map<Lang, Doc>>();
  for (const d of docs) {
    const key = `${d.parsed.module ?? ""}|${d.parsed.base}`;
    const g = groups.get(key) ?? new Map<Lang, Doc>();
    g.set(d.parsed.lang, d);
    groups.set(key, g);
  }
  return [...groups.values()];
};
const anyDoc = (g: Map<Lang, Doc>) => (g.get("it") ?? g.get("es"))!;

function notebookUrl(slug: string, rel: string): string {
  const safe = rel.split("/").map(safeName).join("/");
  return `https://github.com/${REPO}/blob/${BRANCH}/${slug}/${safe}`;
}

function buildCourse(c: CatalogCourse, srcRoot: string): CourseReport {
  const report: CourseReport = { code: c.code, lessons: [], warnings: [], errors: [], relativeImages: 0, cleaned: { navLines: 0, inlineLinks: 0 } };
  const courseDir = path.join(srcRoot, c.folder);
  if (!fs.existsSync(courseDir)) {
    report.errors.push(`cartella non trovata: ${c.folder}`);
    return report;
  }
  const s = c.source;
  const unsuffixed: Lang = s.unsuffixed ?? "es";
  const slugName = courseSlug(c.folder);
  const units: Unit[] = [];

  // --- corso 00: una lezione per notebook, moduli in ordine di catalogo
  if (s.modules) {
    const modDirs = fs.readdirSync(courseDir, { withFileTypes: true }).filter((e) => e.isDirectory());
    let n = 0;
    for (const prefix of s.modules) {
      const dir = modDirs.find((e) => e.name.startsWith(`Modulo_${prefix}_`));
      if (!dir) {
        report.errors.push(`modulo ${prefix} non trovato`);
        continue;
      }
      for (const g of byLang(listDocs(courseDir, dir.name, ".ipynb", unsuffixed)).sort(
        (a, b) => anyDoc(a).parsed.sortKey - anyDoc(b).parsed.sortKey,
      )) {
        units.push({ chapter: null, chapterSlug: null, chapterBase: null, lesson: g, exercise: null, sortKey: ++n, num: anyDoc(g).parsed.num, module: prefix, slug: anyDoc(g).parsed.slug });
      }
    }
  } else {
    const chapters = s.theory ? byLang(listDocs(courseDir, s.theory, ".md", unsuffixed)) : [];
    chapters.sort((a, b) => anyDoc(a).parsed.sortKey - anyDoc(b).parsed.sortKey || anyDoc(a).parsed.base.localeCompare(anyDoc(b).parsed.base));
    const lessonNbs = s.lessons ? byLang(listDocs(courseDir, s.lessons, ".ipynb", unsuffixed)) : [];
    lessonNbs.sort((a, b) => anyDoc(a).parsed.sortKey - anyDoc(b).parsed.sortKey);
    const exerciseNbs = s.exercises ? byLang(listDocs(courseDir, s.exercises, ".ipynb", unsuffixed)) : [];

    const chapterUnits: Unit[] = chapters.map((g) => {
      const p = anyDoc(g).parsed;
      return { chapter: g, chapterSlug: p.slug, chapterBase: stripAccents(p.base).toLowerCase(), lesson: null, exercise: null, sortKey: p.sortKey, num: p.num, module: null, slug: p.slug };
    });
    const pairs = Object.fromEntries(Object.entries(s.pairs ?? {}).map(([k, v]) => [k.toLowerCase(), ([] as string[]).concat(v).map((x) => x.toLowerCase())]));
    const used = new Set<Unit>();
    let lastIndex = -1;
    const ordered: Unit[] = [...chapterUnits];
    for (const g of lessonNbs) {
      const p = anyDoc(g).parsed;
      let target: Unit | undefined;
      const paired = pairs[p.slug];
      if (paired) target = chapterUnits.find((u) => paired.includes(u.chapterSlug!) || paired.includes(u.chapterBase!));
      else if (s.match === "number") target = chapterUnits.find((u) => u.num === p.num && !used.has(u));
      else target = chapterUnits.find((u) => u.chapterSlug === p.slug && !used.has(u));
      if (paired && !target) report.errors.push(`pairs: nessuna teoria per ${p.slug} → ${paired.join(", ")}`);
      if (target) {
        target.lesson = g;
        target.module = p.module;
        used.add(target);
        lastIndex = ordered.indexOf(target);
      } else {
        // un notebook senza teoria propria continua il capitolo precedente (conta per lessonFilter)
        const prevNum = lastIndex >= 0 && chapters.length ? ordered[lastIndex].num : p.num;
        const u: Unit = { chapter: null, chapterSlug: null, chapterBase: null, lesson: g, exercise: null, sortKey: p.sortKey, num: prevNum, module: p.module, slug: p.slug };
        ordered.splice(lastIndex + 1, 0, u);
        lastIndex++;
      }
    }
    for (const g of exerciseNbs) {
      const p = anyDoc(g).parsed;
      const u = ordered.find((x) => x.lesson && anyDoc(x.lesson).parsed.num === p.num && anyDoc(x.lesson).parsed.module === p.module && !x.exercise);
      if (u) u.exercise = g;
      else report.warnings.push(`notebook di esercizi senza lezione: ${anyDoc(g).rel}`);
    }
    units.push(...ordered);
  }

  units.forEach((u, i) => {
    const l: LessonDraft = {
      order: i + 1,
      chapterNum: u.chapter ? anyDoc(u.chapter).parsed.num : u.num,
      module: u.module,
      title: emptyLoc(),
      theoryContent: emptyLoc(),
      lessonNotebookUrl: emptyLoc(),
      exerciseNotebookUrl: emptyLoc(),
    };
    for (const lang of LANGS) {
      const md = u.chapter?.get(lang);
      const nb = u.lesson?.get(lang);
      const ex = u.exercise?.get(lang);
      if (md) {
        const text = fs.readFileSync(md.abs, "utf-8");
        l.theoryContent[lang] = cleanMdLinks(text, report.cleaned);
        l.title[lang] = cleanTitle(heading(text));
        report.relativeImages += (text.match(/!\[[^\]]*\]\((?!https?:|data:|\/)/g) ?? []).length;
      }
      if (nb) {
        l.lessonNotebookUrl[lang] = notebookUrl(slugName, nb.rel);
        l.title[lang] ??= notebookTitle(nb.abs);
      }
      if (ex) l.exerciseNotebookUrl[lang] = notebookUrl(slugName, ex.rel);
      if ((md || nb || ex) && !l.title[lang]) l.title[lang] = prettify(u.slug);
    }
    if (!u.chapter && !u.lesson) report.errors.push(`lezione ${i + 1} senza contenuto`);
    report.lessons.push(l);
  });
  if (!report.lessons.length) report.errors.push("nessuna lezione trovata");
  return report;
}

// ---------- percorsi ----------

function resolveFilter(
  step: CatalogPath["steps"][number],
  lessons: LessonDraft[],
): { orders: number[]; error: string | null } {
  const f = step.lessonFilter;
  if (!f) return { orders: [], error: null };
  const orders = lessons
    .filter((l) => (f.chapters && l.chapterNum !== null && f.chapters.includes(l.chapterNum)) || (f.modules && l.module && f.modules.includes(l.module)))
    .map((l) => l.order);
  return { orders, error: orders.length ? null : `lessonFilter senza lezioni (${JSON.stringify(f)})` };
}

// ---------- main ----------

const dotted = (prefix: string, loc: Loc | undefined) =>
  Object.fromEntries(LANGS.filter((l) => loc?.[l]).map((l) => [`${prefix}.${l}`, loc![l]]));

async function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf-8")) as { courses: CatalogCourse[]; paths: CatalogPath[] };
  const src = path.resolve(SRC!);
  const wanted = (code: string) => !ONLY || ONLY.includes(code);
  const courses = catalog.courses.filter((c) => wanted(c.code));
  const reports = new Map<string, CourseReport>();
  for (const c of courses) reports.set(c.code, buildCourse(c, src));
  const allReports = new Map(reports);
  // i percorsi hanno bisogno delle lezioni di tutti i loro corsi (per lessonFilter), anche se non importati
  for (const c of catalog.courses) if (!allReports.has(c.code)) allReports.set(c.code, buildCourse(c, src));
  const paths = catalog.paths.filter((p) => wanted(p.code));

  console.log(`${APPLY ? "SCRITTURA" : "DRY-RUN"}  sorgente: ${src}\nRepo notebook: https://github.com/${REPO} (${BRANCH})\n`);
  let errors = 0;
  let totalLessons = 0;
  for (const c of courses) {
    const r = reports.get(c.code)!;
    const n = r.lessons.length;
    totalLessons += n;
    const has = (get: (l: LessonDraft) => Loc, lang: Lang) => r.lessons.filter((l) => get(l)[lang]).length;
    const col = (get: (l: LessonDraft) => Loc) => `${has(get, "it")}/${has(get, "es")}`;
    console.log(
      `${c.code.padEnd(4)} ${String(n).padStart(3)} lezioni  teoria it/es ${col((l) => l.theoryContent).padEnd(7)} notebook ${col((l) => l.lessonNotebookUrl).padEnd(7)} esercizi ${col((l) => l.exerciseNotebookUrl).padEnd(7)} ${c.folder}`,
    );
    const noTheory = r.lessons.filter((l) => !l.theoryContent.it && !l.theoryContent.es).length;
    const noNb = r.lessons.filter((l) => !l.lessonNotebookUrl.it && !l.lessonNotebookUrl.es).length;
    if (noTheory && noTheory < n) r.warnings.push(`${noTheory} lezioni senza teoria`);
    if (noNb && noNb < n) r.warnings.push(`${noNb} lezioni senza notebook`);
    if (r.cleaned.navLines || r.cleaned.inlineLinks) r.warnings.push(`link a file .md: ${r.cleaned.navLines} righe di navigazione tolte, ${r.cleaned.inlineLinks} link trasformati in testo`);
    if (r.relativeImages) r.warnings.push(`${r.relativeImages} immagini con percorso relativo nel markdown (da gestire in Fase 2)`);
    for (const lang of LANGS) {
      const missing = r.lessons.filter((l) => !l.title[lang]).length;
      if (missing && missing < n) r.warnings.push(`${missing} lezioni senza contenuto in ${lang}`);
    }
    for (const w of r.warnings) console.log(`       ? ${w}`);
    if (SHOW.includes(c.code)) {
      for (const l of r.lessons) {
        const flags = `${l.theoryContent.it || l.theoryContent.es ? "T" : "-"}${l.lessonNotebookUrl.it || l.lessonNotebookUrl.es ? "N" : "-"}${l.exerciseNotebookUrl.it || l.exerciseNotebookUrl.es ? "E" : "-"}`;
        console.log(`       ${String(l.order).padStart(3)} ${flags} cap.${String(l.chapterNum ?? "-").padEnd(3)} ${l.title.it ?? "—"}${l.title.es ? `  |  ${l.title.es}` : ""}`);
      }
      const first = r.lessons.find((l) => l.lessonNotebookUrl.it);
      if (first) console.log(`       es. link: ${first.lessonNotebookUrl.it}`);
    }
    for (const e of r.errors) console.log(`       ! ${e}`);
    errors += r.errors.length;
  }
  console.log(`\nTotale: ${courses.length} corsi, ${totalLessons} lezioni`);

  console.log("\nPercorsi:");
  for (const p of paths) {
    const probs: string[] = [];
    for (const st of p.steps) {
      const rep = allReports.get(st.course);
      if (!rep) probs.push(`corso ${st.course} non in catalogo`);
      else if (st.lessonFilter) {
        const { orders, error } = resolveFilter(st, rep.lessons);
        if (error) probs.push(`${st.course}: ${error}`);
        else console.log(`       ${p.code} → ${st.course}: filtro ${JSON.stringify(st.lessonFilter)} = lezioni ${orders.join(",")}`);
      }
    }
    console.log(`${p.code.padEnd(4)} ${p.steps.length} corsi: ${p.steps.map((s) => s.course + (s.optional ? "*" : "")).join(" → ")}`);
    for (const x of probs) console.log(`       ! ${x}`);
    errors += probs.length;
  }

  if (!APPLY) {
    console.log(`\nNessuna scrittura (dry-run). ${errors ? `${errors} problemi da risolvere.` : "Nessun errore."} Aggiungi --apply per importare.`);
    process.exit(errors ? 2 : 0);
  }
  if (errors) throw new Error(`${errors} errori nel rapporto: correggi il catalogo prima di importare.`);

  const uri = process.env.MONGODB_URI ?? "";
  const host = uri.replace(/^mongodb(\+srv)?:\/\/([^@/]*@)?/, "").split(/[/?]/)[0];
  console.log(`\nDatabase: ${host}`);
  if (!/^(localhost|127\.0\.0\.1)(:|$)/.test(host) && !flag("allow-remote")) {
    throw new Error("MONGODB_URI non è locale: ricontrolla di avere il backup e aggiungi --allow-remote.");
  }
  await connectDB();
  const admin = await UserModel.findOne({ role: "admin" });
  if (!admin) throw new Error("Nessun utente admin trovato: serve come createdBy.");

  const ids = new Map<string, mongoose.Types.ObjectId>();
  const existing = await CourseModel.find({ code: { $in: catalog.courses.map((c) => c.code) } }, { code: 1 });
  for (const e of existing) ids.set(e.code, e._id);

  for (const c of courses) {
    const doc = await CourseModel.findOneAndUpdate(
      { code: c.code },
      {
        $set: { ...dotted("title", c.title), ...dotted("description", c.description), block: c.block, estimatedHours: c.estimatedHours, catalogOrder: c.catalogOrder },
        $setOnInsert: { status: "draft", accessLevel: c.accessLevel, createdBy: admin._id, createdAt: new Date() },
      },
      { upsert: true, returnDocument: "after" },
    );
    ids.set(c.code, doc._id);
    const ops = reports.get(c.code)!.lessons.map((l) => ({
      updateOne: {
        filter: { course: doc._id, order: l.order },
        update: {
          $set: { ...dotted("title", l.title), ...dotted("theoryContent", l.theoryContent), ...dotted("lessonNotebookUrl", l.lessonNotebookUrl), ...dotted("exerciseNotebookUrl", l.exerciseNotebookUrl) },
          $setOnInsert: { createdAt: new Date() },
        },
        upsert: true,
      },
    }));
    const res = await LessonModel.bulkWrite(ops);
    console.log(`  corso ${c.code}: ${res.upsertedCount} lezioni create, ${res.modifiedCount} aggiornate`);
  }
  for (const c of courses) {
    const prereq = (c.prerequisites ?? []).map((p) => ({ course: ids.get(p.course), note: p.note ?? null })).filter((p) => p.course);
    await CourseModel.updateOne({ code: c.code }, { $set: { prerequisites: prereq } });
  }
  for (const p of paths) {
    const steps = p.steps.map((st, i) => {
      const course = ids.get(st.course);
      if (!course) throw new Error(`${p.code}: il corso ${st.course} non è nel DB (importalo prima).`);
      return { course, order: i + 1, optional: !!st.optional, lessonFilter: resolveFilter(st, allReports.get(st.course)!.lessons).orders, note: st.note ?? null };
    });
    await PathModel.updateOne(
      { code: p.code },
      {
        $set: { ...dotted("title", p.title), ...dotted("description", p.description), ...dotted("audience", p.audience), estimatedHours: p.estimatedHours, estimatedWeeks: p.estimatedWeeks, steps },
        $setOnInsert: { status: "draft", accessLevel: p.accessLevel, createdBy: admin._id, createdAt: new Date() },
      },
      { upsert: true },
    );
    console.log(`  percorso ${p.code}: ${steps.length} corsi`);
  }
  await mongoose.disconnect();
  console.log("\nImportazione completata (tutto in draft).");
}

main().catch(async (e) => {
  console.error(e instanceof Error ? e.message : e);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
