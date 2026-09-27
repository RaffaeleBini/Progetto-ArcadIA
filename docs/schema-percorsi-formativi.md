# Schema dati: Percorsi formativi in ArcadIA

Basato sulla ricognizione di `Formazione/` (25 cartelle corso) e di `Formazione/Percorsi.md` (catalogo, 12 percorsi P1–P12, blocchi del corso 00 Matematica). Decisioni prese insieme al 27/09/2026:

1. Un **Percorso** è un'entità propria nel DB (`PathModel`), non solo un tag.
2. Contenuti **IT ed ES fin da subito**, per lezione.
3. Ogni lezione ha **tre materiali distinti**: teoria, notebook della lezione, notebook di esercizi.
4. Il corso 00 (Matematica) diventa **4 Course separati** (00A–00D), uno per blocco.

Questo documento non tocca ancora codice: è la base per la migrazione dei modelli Mongoose e per il piano di popolamento contenuti.

---

## 1. Perché il modello attuale non basta

`Course`/`Lesson` oggi (`backend/src/models/`):

```ts
Course: { title, description, coverImageUrl, accessLevel, createdBy, createdAt }
Lesson: { course, title, order, videoUrl, description, notebookGithubUrl, createdAt }
```

Limiti rispetto al materiale reale in `Formazione/`:
- Nessun concetto di **percorso** (sequenza di più corsi con un pubblico e un obiettivo).
- Nessuna **lingua**: i tuoi corsi hanno manuale/notebook in IT, ES, o entrambi a seconda del corso.
- Una lezione ha *un* link notebook, ma tu hai sempre **due notebook distinti** (lezione + esercizi) più un **manuale teorico** (i file `01_...md`, `02_...md` di ogni corso, non solo un campo `description`).
- Nessun **prerequisito** tra corsi, mentre `Percorsi.md` §4 ne definisce esplicitamente (es. 18 richiede 04, 10 M2–M5, 13).
- Nessuno **stato di pubblicazione**: non tutti i 25 corsi sono pronti per essere mostrati agli studenti nello stesso momento.

---

## 2. Modello `Course` (esteso)

```ts
const courseSchema = new Schema({
  code: { type: String, required: true, unique: true, trim: true }, // "07", "00B", "11"
  title: {
    it: { type: String, trim: true },
    es: { type: String, trim: true },
  },
  description: {
    it: { type: String, trim: true },
    es: { type: String, trim: true },
  },
  block: { type: String, trim: true }, // "Data literacy", "Deep learning", "Trasversale"...
  coverImageUrl: { type: String },
  accessLevel: { type: String, enum: ["free", "premium"], default: "free" },
  status: { type: String, enum: ["draft", "published"], default: "draft" },
  estimatedHours: { type: Number },
  catalogOrder: { type: Number, required: true }, // ordine di §1 di Percorsi.md, per liste "tutti i corsi"
  prerequisites: [
    {
      course: { type: Schema.Types.ObjectId, ref: "Course" },
      note: { type: String }, // es. "richiesto solo per il capitolo 3"
    },
  ],
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
});
```

**Nota sui prerequisiti:** solo informativi (mostrati come "consigliato prima: ..." nella pagina corso), **non bloccano l'accesso**. Applicare un blocco reale è una decisione a sé, da valutare quando i percorsi saranno popolati e testati — coerente con l'approccio "basso sforzo, si estende dopo" già usato per la 2FA.

**Nota su `title`/`description` bilingue:** un campo può restare vuoto se quel corso non ha ancora la traduzione (es. i corsi "_2026" sono nativi IT/ES insieme, i corsi con nome tipo `13_Machine Learning Python` sono oggi solo ES — vedi tabella §5). La UI mostra la lingua disponibile e, se manca, può fare fallback all'altra invece di un campo vuoto.

---

## 3. Modello `Lesson` (esteso)

```ts
const lessonSchema = new Schema({
  course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
  order: { type: Number, required: true },
  title: {
    it: { type: String, trim: true },
    es: { type: String, trim: true },
  },
  theoryContent: {
    it: { type: String }, // markdown del capitolo di manuale corrispondente
    es: { type: String },
  },
  videoUrl: {
    it: { type: String, default: null }, // non ancora disponibili, campo pronto
    es: { type: String, default: null },
  },
  lessonNotebookUrl: {
    it: { type: String, default: null }, // link GitHub al notebook della lezione
    es: { type: String, default: null },
  },
  exerciseNotebookUrl: {
    it: { type: String, default: null }, // link GitHub al notebook di esercizi
    es: { type: String, default: null },
  },
  createdAt: { type: Date, default: Date.now },
});
```

Questa struttura ricalca 1:1 quello che hai già sul filesystem in quasi tutti i corsi: un file `NN_argomento.md` (teoria) più gli stessi indici in `notebooks_clase/` (lezione) e `notebooks_practica/` (esercizi). La UI lato studente mostrerebbe tre blocchi per lezione (Teoria / Notebook lezione / Esercizi) invece del generico "video+descrizione" attuale.

---

## 4. Nuovo modello `Path` (percorso)

```ts
const pathSchema = new Schema({
  code: { type: String, required: true, unique: true, trim: true }, // "P1".."P12"
  title: {
    it: { type: String, trim: true },
    es: { type: String, trim: true },
  },
  description: {
    it: { type: String, trim: true },
    es: { type: String, trim: true },
  },
  audience: {
    it: { type: String, trim: true }, // "pubblico obiettivo" di Percorsi.md §2
    es: { type: String, trim: true },
  },
  estimatedHours: { type: Number },
  estimatedWeeks: { type: Number },
  accessLevel: { type: String, enum: ["free", "premium"], default: "premium" },
  status: { type: String, enum: ["draft", "published"], default: "draft" },
  steps: [
    {
      course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
      order: { type: Number, required: true },
      optional: { type: Boolean, default: false }, // es. corso 17 in P6 ("opzionale")
      lessonFilter: [{ type: Number }], // opzionale: solo alcuni "order" di Lesson di quel corso
      note: { type: String }, // es. "solo moduli M1–M5, M9" per il corso 10 in P4
    },
  ],
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
});
```

**Nota su `lessonFilter`:** alcuni percorsi (P4, P5, P12) usano solo una parte del corso 10 (moduli M1–M5, M9 su 9 moduli totali). Invece di spezzare anche il corso 10 in sotto-corsi come fatto per la Matematica, uno step di percorso può referenziare un sottoinsieme di lezioni tramite `lessonFilter` (gli `order` delle lezioni da includere), con `note` per spiegare perché. Se in futuro capiterà spesso, si può rivalutare e spezzare anche 10 in blocchi, come per 00.

**Nota sul progress:** niente nuovo modello di tracking. Il completamento di un percorso si calcola leggendo i `Progress` (già esistenti, per corso) di tutti i corsi nei suoi `steps` — evita di duplicare uno stato che è già derivabile.

---

## 5. Mappatura cartelle → `Course` proposti

| Cartella | `code` | Titolo IT (da manuale/Percorsi.md) | Lingua materiale oggi |
|---|---|---|---|
| `00-Corso-Matematica-2026` (Modulo_00–04) | `00A` | Matematica — Fondamenti | IT |
| `00-Corso-Matematica-2026` (Modulo_05,06,07,17) | `00B` | Matematica per il Machine Learning | IT |
| `00-Corso-Matematica-2026` (Modulo_08,09,15) | `00C` | Matematica applicata avanzata | IT |
| `00-Corso-Matematica-2026` (Modulo_10–14,16,18) | `00D` | Matematica pura | IT |
| `01-Corso-Base-IA-2026` | `01` | Base IA | IT + ES |
| `02-Corso-Introducción-Ciencia-Datos-2026` | `02` | Introduzione alla Scienza dei Dati | IT + ES |
| `03_Python Fundamentals` | `03` | Python Fundamentals | ES (da tradurre) |
| `04-Python-Ciencia-Datos-2026` | `04` | Python per la Scienza dei Dati | IT + ES |
| `05-Corso-Herramienta-Ciancia-Datos-2026` | `05` | Strumenti per la Scienza dei Dati | IT + ES |
| `06-Python-Visualización-Datos-2026` | `06` | Visualizzazione dei Dati con Python | IT + ES |
| `07-Statistica-Applicata-2026` | `07` | Statistica Applicata con Python | IT + ES |
| `08_Corso-Metodologia-Ciencias-Datos-2026` | `08` | Metodologia della Scienza dei Dati | IT + ES |
| `09_Google Vision API` | `09` | Google Vision API | ES (da tradurre) |
| `10-Corso-Avanzato-IA-2026` | `10` | Avanzato IA (bootcamp ingegneria) | IT + ES (parziale, ~metà notebook) |
| `11-Corso-IA-Generativa-Fondamenti-2026` | `11` | IA Generativa — Fondamenti | ES (da tradurre) |
| `12-Corso-IA-Engineering-2026` | `12` | IA Engineering | IT + ES (parziale, ~metà) |
| `13_Machine Learning Python` | `13` | Machine Learning con Python | ES (da tradurre) |
| `14-NLP-Classico-2026` | `14` | NLP Classico con Python | IT + ES |
| `15_Deep Learning Python, TensorFlow, Keras` | `15` | Deep Learning con Python, TensorFlow, Keras | ES (da tradurre) |
| `16_TensorFlow Fundamentals` | `16` | TensorFlow Fundamentals | ES (da tradurre) |
| `17_Deep Learning TensorFlow` | `17` | Deep Learning con TensorFlow (casi d'uso) | ES (da tradurre) |
| `18-MLOps-Monitoraggio-2026` | `18` | MLOps e Monitoraggio con Python | IT + ES |
| `19_Deep Learning Python PyTorch` | `19` | Deep Learning con PyTorch | ES (da tradurre) |
| `20-Corso-IA-Generativa-Python-2026` | `20` | Costruire Applicazioni di IA Generativa con Python | IT + ES |
| `21-Corso-IA-Generativa-Avanzata-2026` | `21` | IA Generativa — Avanzato | ES (da tradurre) |
| `22_Advanced Deep Learning` | `22` | Advanced Deep Learning | ES (da tradurre) |
| `23_Advancer Reinforcement Learning` | `23` | Advanced Reinforcement Learning | ES (da tradurre) |
| `24_TensorFlow Quantum Machine Learning` | `24` | TensorFlow Quantum Machine Learning | ES (da tradurre) |

**28 `Course` totali** (25 cartelle, con la Matematica spezzata in 4 → +3).

I corsi con nome cartella `NN_Nome` (underscore, senza "-2026") sono materiale di origine spagnola (certificazioni EITC/DIH DATAlife) non ancora tradotto in italiano; quelli `NN-Corso-...-2026` sono stati creati direttamente in IT+ES per questo progetto. Non è un blocco per lo schema — il campo `title.it`/`theoryContent.it` resta vuoto finché non tradotto — ma influisce sull'ordine con cui conviene popolare ArcadIA (i corsi già bilingue sono pronti subito).

---

## 6. I 12 `Path` da `Percorsi.md` §2

| `code` | Titolo | Corsi in `steps` (in ordine) |
|---|---|---|
| P1 | Alfabetizzazione IA | 01 → 02 → 11 |
| P2 | Data Analyst / Fondamenti di Data Science | 02 → 03 → 04 → 05 → 06 → 07 → 08 |
| P3 | Data Scientist / Machine Learning | *(P2)* → 00B → 13 → 15 |
| P4 | AI Engineer (applicazioni con LLM) | 01 → 03 → 10 *(solo M1–M5, M9)* → 11 → 12 → 20 |
| P5 | AI Engineer Bootcamp (intensivo) | 01 → 10 → 12 |
| P6 | Deep Learning Specialist | 00B → 13 → 15 → 16 → 19 → 22 *(17 opzionale)* |
| P7 | Computer Vision | 09 → 15 → 16 *(cap. 3–4)* → 17 *(cap. specifici)* → 19 → 22 *(cap. 3–4)* |
| P8 | Generative AI / LLM Specialist | 11 → 12 → 15 → 20 → 21 *(cap. 9–13)* |
| P9 | Frontiere: RL e Quantum ML | 00B + 00C → 15 *(o 19)* → 23 → 24 |
| P10 | Matematica per l'IA | 00A → 00B → 00C |
| P11 | NLP Specialist | 04 → 06 → 13 → 14 → 20 |
| P12 | MLOps Engineer | 04 → 10 *(M2–M5)* → 13 → 18 |

Le note in corsivo (*"solo M1–M5"*, *"cap. 3–4"*, *"opzionale"*) sono esattamente il caso d'uso di `lessonFilter`/`optional`/`note` sullo step. P3 "eredita" P2: nello schema si esplicita comunque la sequenza intera (nessuna "eredità" tra Path, per tenere ogni percorso auto-contenuto e query semplici).

---

## 7. Cosa NON è ancora deciso (da affrontare quando si passa all'implementazione)

- **Migrazione dei dati esistenti**: se ci sono già `Course`/`Lesson` in produzione con lo schema vecchio, serve uno script di migrazione (aggiungere `code`, spostare `title` in `title.it`, ecc.) — non affrontato qui, è un piano a parte.
- **Enforcement dei prerequisiti**: per ora solo informativo, come detto in §2.
- **Certificato di percorso**: oggi il certificato (`certificateId` in `Progress`) è per singolo corso. Un certificato "hai completato il percorso P4" è una feature a sé, non inclusa in questo schema.
- **Popolamento**: quali corsi portare per primi su ArcadIA (bilingue e pronti vs. da tradurre) è una decisione di prodotto, non di schema.
