// Prepara la copia pubblica dei notebook (repo `arcadia-notebooks`) a partire dalla
// cartella sorgente `Formazione/`. Non modifica mai la sorgente.
//
//   npm run export:notebooks -- --src <Formazione>                  (dry-run, solo rapporto)
//   npm run export:notebooks -- --src <Formazione> --out <cartella>  (scrive la copia)
//
// Cosa fa:
//  - una cartella per corso, con nome ASCII (senza spazi, accenti, virgole): i link
//    Colab diventano semplici da costruire;
//  - esclude manuali, bozze, fonti di terzi e file di servizio;
//  - nei notebook che usano `cargar_datos()`, se il file non si trova in locale lo
//    scarica dai file raw del repo pubblico (in Colab la cartella datos/ non c'è);
//  - sostituisce l'email personale nei dati demo;
//  - aggiunge LICENSE (MIT) e un README.
import fs from "node:fs";
import path from "node:path";
import { courseSlug, safeName } from "./lib/formazione.js";

const args = process.argv.slice(2);
const arg = (name: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const SRC = arg("src");
const OUT = arg("out");
const REPO = arg("repo") ?? "RaffaeleBini/arcadia-notebooks";
const BRANCH = arg("branch") ?? "main";
const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/${BRANCH}`;

if (!SRC) {
  console.error("Uso: --src <cartella Formazione> [--out <cartella destinazione>] [--repo utente/nome]");
  process.exit(1);
}

const EXCLUDED_DIRS = new Set([
  "fonti_originali",
  "manual",
  "dispense",
  "dispensas",
  "Specs",
  ".ipynb_checkpoints",
  "__pycache__",
  ".git",
  "node_modules",
]);
const EXCLUDED_FILE = /^(\.DS_Store|TEMARIO.*|progress\.md|PROGRESS\.md|guida-accesso-repository.*|.*\.crdownload)$/i;

const EMAIL_FROM = "giulia.bini@gmail.com";
const EMAIL_TO = "pippo@email.com";
// Segnaposto didattici tipo "sk-proj-XXXX…": hanno il formato di una chiave OpenAI e fanno scattare
// il secret scanning di GitHub. Nella copia pubblica diventano un testo che non ricorda una chiave.
const FAKE_KEY = /sk-(?:proj-)?X{8,}/g;
const FAKE_KEY_TO = "<LA-TUA-CHIAVE>";
const TEXT_EXT = new Set([".ipynb", ".csv", ".json", ".txt", ".md", ".py", ".yml", ".yaml", ".toml"]);




interface CourseReport {
  code: string;
  slug: string;
  sourceDir: string;
  notebooks: number;
  files: number;
  excluded: string[];
  renamed: string[];
  emailReplaced: number;
  keysReplaced: number;
  datosPatched: number;
  datosUnpatched: string[];
  invalidNotebooks: string[];
}

// Inserisce, prima del `raise FileNotFoundError` di cargar_datos(), il download dai file raw.
// Restituisce null se il notebook non contiene la funzione nella forma attesa.
function patchCargarDatos(source: string, courseSlugName: string): string | null {
  if (!/def cargar_datos\(/.test(source)) return null;
  const re = /\n( {4})raise FileNotFoundError\(/;
  if (!re.test(source)) return null;
  const block =
    "\n    # Copia pubblica (Colab): se non c'è in locale, scarica il file dal repository dei notebook.\n" +
    "    try:\n" +
    "        import urllib.request\n" +
    "        destino = os.path.join(\"datos\", nombre)\n" +
    "        os.makedirs(os.path.dirname(destino), exist_ok=True)\n" +
    `        urllib.request.urlretrieve(f"${RAW_BASE}/${courseSlugName}/datos/{nombre}", destino)\n` +
    "        return destino\n" +
    "    except Exception:\n" +
    "        pass";
  return source.replace(re, (m) => `${block}${m}`);
}

function processNotebook(raw: string, slug: string, report: CourseReport, rel: string): string {
  const nb = JSON.parse(raw) as { cells?: { cell_type: string; source: string | string[] }[] };
  let patchedHere = false;
  let usesDatos = false;
  for (const cell of nb.cells ?? []) {
    if (cell.cell_type !== "code") continue;
    const text = Array.isArray(cell.source) ? cell.source.join("") : cell.source;
    if (/datos\//.test(text) || /cargar_datos/.test(text)) usesDatos = true;
    const patched = patchCargarDatos(text, slug);
    if (patched) {
      cell.source = patched.split(/(?<=\n)/);
      patchedHere = true;
    }
  }
  if (patchedHere) report.datosPatched++;
  else if (usesDatos) report.datosUnpatched.push(rel);
  // Se non c'è nulla da patchare si lascia il file identico all'originale.
  if (!patchedHere) return raw;
  // Stessa formattazione di Jupyter: indentazione a 1 spazio, newline finale.
  return JSON.stringify(nb, null, 1) + "\n";
}

function walk(
  srcDir: string,
  outDir: string | null,
  slug: string,
  rel: string,
  report: CourseReport,
): void {
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const relPath = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) {
        report.excluded.push(`${relPath}/`);
        continue;
      }
      const safe = safeName(entry.name);
      if (safe !== entry.name) report.renamed.push(`${relPath} → ${safe}`);
      walk(path.join(srcDir, entry.name), outDir && path.join(outDir, safe), slug, `${rel ? rel + "/" : ""}${safe}`, report);
      continue;
    }
    if (EXCLUDED_FILE.test(entry.name)) {
      report.excluded.push(relPath);
      continue;
    }
    const safe = safeName(entry.name);
    if (safe !== entry.name) report.renamed.push(`${relPath} → ${safe}`);
    const srcFile = path.join(srcDir, entry.name);
    const ext = path.extname(entry.name).toLowerCase();
    report.files++;
    let output: Buffer | string = "";
    if (ext === ".ipynb") {
      report.notebooks++;
      try {
        output = processNotebook(fs.readFileSync(srcFile, "utf-8"), slug, report, relPath);
      } catch {
        report.invalidNotebooks.push(relPath);
        continue;
      }
    } else if (TEXT_EXT.has(ext)) {
      output = fs.readFileSync(srcFile, "utf-8");
    } else {
      output = fs.readFileSync(srcFile);
    }
    if (typeof output === "string" && output.includes(EMAIL_FROM)) {
      report.emailReplaced++;
      output = output.split(EMAIL_FROM).join(EMAIL_TO);
    }
    if (typeof output === "string" && FAKE_KEY.test(output)) {
      report.keysReplaced++;
      output = output.replace(FAKE_KEY, FAKE_KEY_TO);
    }
    if (outDir) {
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, safe), output);
    }
  }
}

const LICENSE = `MIT License

Copyright (c) 2026 Raffaele Bini

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;

function main() {
  const src = path.resolve(SRC!);
  const out = OUT ? path.resolve(OUT) : null;
  if (!fs.statSync(src).isDirectory()) throw new Error(`Sorgente non trovata: ${src}`);
  if (out) {
    const inside = (a: string, b: string) => a === b || a.startsWith(b + path.sep);
    if (inside(out, src) || inside(src, out)) throw new Error("La destinazione non può stare dentro (o contenere) la sorgente.");
    if (inside(out, process.cwd()) || inside(process.cwd(), out)) {
      throw new Error("La destinazione deve stare fuori dal repo di ArcadIA (è un repo separato).");
    }
    if (fs.existsSync(out) && fs.readdirSync(out).length > 0) throw new Error(`La destinazione non è vuota: ${out}`);
  }

  const courses = fs
    .readdirSync(src, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^\d{2}[-_]/.test(e.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  const reports: CourseReport[] = [];
  for (const c of courses) {
    const slug = courseSlug(c.name);
    const report: CourseReport = {
      code: c.name.slice(0, 2),
      slug,
      sourceDir: c.name,
      notebooks: 0,
      files: 0,
      excluded: [],
      renamed: [],
      emailReplaced: 0,
      keysReplaced: 0,
      datosPatched: 0,
      datosUnpatched: [],
      invalidNotebooks: [],
    };
    walk(path.join(src, c.name), out && path.join(out, slug), slug, "", report);
    reports.push(report);
  }

  if (out) {
    fs.writeFileSync(path.join(out, "LICENSE"), LICENSE);
    const index = reports.map((r) => `- \`${r.slug}/\` (${r.notebooks} notebook)`).join("\n");
    fs.writeFileSync(
      path.join(out, "README.md"),
      `# arcadia-notebooks\n\nNotebook Jupyter dei corsi di [ArcadIA](https://arcadia-jet.vercel.app), da aprire in Google Colab.\nLicenza MIT.\n\n## Corsi\n\n${index}\n`,
    );
  }

  const tot = (f: (r: CourseReport) => number) => reports.reduce((s, r) => s + f(r), 0);
  console.log(`${out ? "SCRITTURA" : "DRY-RUN"}  sorgente: ${src}${out ? `\n          destinazione: ${out}` : ""}`);
  console.log(`Repo raw: ${RAW_BASE}\n`);
  for (const r of reports) {
    console.log(`${r.code}  ${r.slug}  — ${r.notebooks} notebook, ${r.files} file, esclusi ${r.excluded.length}, rinominati ${r.renamed.length}` +
      `${r.datosPatched ? `, datos patchati ${r.datosPatched}` : ""}${r.emailReplaced ? `, email sostituite ${r.emailReplaced}` : ""}${r.keysReplaced ? `, chiavi fittizie sostituite ${r.keysReplaced}` : ""}`);
    for (const x of r.invalidNotebooks) console.log(`     ! JSON non valido: ${x}`);
    for (const x of r.datosUnpatched) console.log(`     ? usa datos/ ma senza cargar_datos(): ${x}`);
  }
  console.log(`\nTotale: ${tot((r) => r.notebooks)} notebook, ${tot((r) => r.files)} file, ` +
    `${tot((r) => r.datosPatched)} notebook con download di datos/, ${tot((r) => r.emailReplaced)} email sostituite, ${tot((r) => r.keysReplaced)} file con chiavi fittizie sostituite, ` +
    `${tot((r) => r.excluded.length)} esclusioni, ${tot((r) => r.renamed.length)} rinomine.`);
  if (!out) console.log("\nNessun file scritto (dry-run). Aggiungi --out <cartella> per generare la copia.");
}

main();
