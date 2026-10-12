// Controlli di qualità sui contenuti importati (Fase 2). Sola lettura sul DB di MONGODB_URI.
//
//   npm run validate:formazione -- --notebooks <cartella arcadia-notebooks>
//
// Per ogni corso segnala, sulla teoria (it/es):
//  - blocchi di codice non chiusi e link interni (file .md, ancore a capitoli inesistenti);
//  - immagini con percorso relativo (non si vedrebbero sul sito);
//  - elementi che react-markdown senza plugin non rende: tabelle GFM, formule LaTeX, HTML grezzo;
//  - URL dei notebook che non corrispondono a un file nella copia pubblica.
// Esce con codice 2 se trova errori (blocchi non chiusi, link interni rotti, notebook mancanti).
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import { CourseModel } from "../src/models/Course.js";
import { LessonModel } from "../src/models/Lesson.js";

const args = process.argv.slice(2);
const arg = (n: string) => (args.indexOf(`--${n}`) >= 0 ? args[args.indexOf(`--${n}`) + 1] : undefined);
const NB_DIR = arg("notebooks");
const REPO = arg("repo") ?? "RaffaeleBini/arcadia-notebooks";
const BRANCH = arg("branch") ?? "main";
const URL_PREFIX = `https://github.com/${REPO}/blob/${BRANCH}/`;

interface Stats {
  lessons: number;
  unclosedFences: string[];
  internalLinks: string[];
  relativeImages: string[];
  tables: number;
  math: number;
  html: number;
  missingNotebooks: string[];
}
const newStats = (): Stats => ({ lessons: 0, unclosedFences: [], internalLinks: [], relativeImages: [], tables: 0, math: 0, html: 0, missingNotebooks: [] });

// toglie i blocchi di codice, dove tabelle/formule/HTML sono testo letterale
const stripCode = (md: string) => md.replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[ \t]*$/gm, "").replace(/`[^`\n]*`/g, "");

function checkMarkdown(md: string, label: string, st: Stats) {
  const fences = md.split("\n").filter((l) => /^\s*(```|~~~)/.test(l)).length;
  if (fences % 2) st.unclosedFences.push(label);
  const text = stripCode(md);
  for (const m of text.matchAll(/(!?)\[[^\]]*\]\(([^)\s]+)[^)]*\)/g)) {
    const [, bang, target] = m;
    if (/^(https?:|mailto:|data:|\/)/.test(target)) continue;
    if (bang) st.relativeImages.push(`${label}: ${target}`);
    else if (target.startsWith("#")) {
      const slug = target.slice(1).toLowerCase();
      const ok = text.split("\n").some((l) => /^#{1,6}\s/.test(l) && l.replace(/^#+\s*/, "").toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, "").trim().replace(/\s/g, "-") === slug);
      if (!ok) st.internalLinks.push(`${label}: ${target}`);
    } else st.internalLinks.push(`${label}: ${target}`);
  }
  if (/^\s*\|.*\|\s*\n\s*\|?\s*:?-{3,}/m.test(text)) st.tables++;
  if (/\$\$[\s\S]+?\$\$|\\\(.+?\\\)|\\\[[\s\S]+?\\\]|(?<![\\$\w])\$[^\s$][^$\n]*[^\s$\\]\$(?![\w$])/.test(text)) st.math++;
  if (/<\/?(div|span|table|img|br|details|summary|sup|sub|p|a|b|i|center|iframe|video)\b[^>]*>/i.test(text)) st.html++;
}

async function main() {
  await connectDB();
  const courses = await CourseModel.find().sort({ catalogOrder: 1 });
  let errors = 0;
  const tot = newStats();
  console.log("corso  lezioni  tabelle  formule  html  note");
  for (const c of courses) {
    const st = newStats();
    const lessons = await LessonModel.find({ course: c._id }).sort({ order: 1 });
    for (const l of lessons) {
      st.lessons++;
      for (const lang of ["it", "es"] as const) {
        const md = l.theoryContent?.[lang];
        if (md) checkMarkdown(md, `${c.code} L${l.order} ${lang}`, st);
        for (const f of ["lessonNotebookUrl", "exerciseNotebookUrl"] as const) {
          const url = l[f]?.[lang];
          if (!url) continue;
          if (!url.startsWith(URL_PREFIX)) st.missingNotebooks.push(`${c.code} L${l.order}: URL fuori dal repo atteso`);
          else if (NB_DIR && !fs.existsSync(path.join(NB_DIR, decodeURIComponent(url.slice(URL_PREFIX.length))))) {
            st.missingNotebooks.push(`${c.code} L${l.order} ${lang}: ${url.slice(URL_PREFIX.length)}`);
          }
        }
      }
    }
    const bad = st.unclosedFences.length + st.internalLinks.length + st.missingNotebooks.length;
    errors += bad;
    console.log(`${c.code.padEnd(5)} ${String(st.lessons).padStart(7)} ${String(st.tables).padStart(8)} ${String(st.math).padStart(8)} ${String(st.html).padStart(5)}  ${st.relativeImages.length ? `immagini relative ${st.relativeImages.length}; ` : ""}${bad ? `ERRORI ${bad}` : ""}`);
    for (const x of st.unclosedFences) console.log(`       ! blocco di codice non chiuso: ${x}`);
    const mdLinks = st.internalLinks.filter((x) => /\.md$/.test(x));
    if (mdLinks.length) console.log(`       ! ${mdLinks.length} link a file .md (navigazione tra capitoli, es. ${mdLinks[0]})`);
    for (const x of st.internalLinks.filter((y) => !/\.md$/.test(y)).slice(0, 5)) console.log(`       ! ancora senza intestazione: ${x}`);
    for (const x of st.missingNotebooks) console.log(`       ! notebook mancante: ${x}`);
    for (const x of st.relativeImages.slice(0, 3)) console.log(`       ? immagine relativa: ${x}`);
    tot.lessons += st.lessons;
    tot.tables += st.tables;
    tot.math += st.math;
    tot.html += st.html;
  }
  console.log(`\nTotale: ${tot.lessons} lezioni (per lingua, le colonne contano i capitoli) — tabelle ${tot.tables}, formule ${tot.math}, html ${tot.html}`);
  if (!NB_DIR) console.log("Nota: senza --notebooks non verifico che i file dei notebook esistano.");
  console.log(errors ? `${errors} errori.` : "Nessun errore.");
  await mongoose.disconnect();
  process.exit(errors ? 2 : 0);
}
main().catch(async (e) => {
  console.error(e instanceof Error ? e.message : e);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
