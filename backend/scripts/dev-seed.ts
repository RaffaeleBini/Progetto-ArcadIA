// Seed di sviluppo per i Percorsi formativi: NON è una migrazione (il
// progetto non ha dati di produzione da preservare per questa feature).
// Svuota Course/Lesson/Path/Progress e crea 2 corsi bilingue pubblicati con
// lezioni nei 3 blocchi (teoria/notebook lezione/notebook esercizi) più 1
// percorso che li referenzia in sequenza, per validare l'intera catena
// localmente senza popolare a mano via mongosh.
//
// Uso: npm run dev:seed (richiede MONGODB_URI nell'ambiente, come il server)
import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import { CourseModel } from "../src/models/Course.js";
import { LessonModel } from "../src/models/Lesson.js";
import { PathModel } from "../src/models/Path.js";
import { ProgressModel } from "../src/models/Progress.js";
import { UserModel } from "../src/models/User.js";

async function pickSeedOwner() {
  const admin = await UserModel.findOne({ role: "admin" });
  if (admin) return admin;
  throw new Error(
    "Nessun utente admin trovato: registra e promuovi un admin prima di lanciare il seed (vedi scripts/promote-admin se presente, o aggiornalo manualmente nel DB)."
  );
}

async function main() {
  await connectDB();

  const owner = await pickSeedOwner();

  await Promise.all([
    CourseModel.deleteMany({}),
    LessonModel.deleteMany({}),
    PathModel.deleteMany({}),
    ProgressModel.deleteMany({}),
  ]);

  const course1 = await CourseModel.create({
    code: "SEED-01",
    title: { it: "Fondamenti di IA", es: "Fundamentos de IA" },
    description: {
      it: "Introduzione ai concetti base dell'intelligenza artificiale.",
      es: "Introducción a los conceptos básicos de la inteligencia artificial.",
    },
    block: "Alfabetizzazione",
    accessLevel: "free",
    status: "published",
    estimatedHours: 6,
    catalogOrder: 1,
    createdBy: owner._id,
  });

  const course2 = await CourseModel.create({
    code: "SEED-02",
    title: { it: "Python per i dati", es: "Python para datos" },
    description: {
      it: "Le basi di Python applicate all'analisi dati.",
      es: "Los fundamentos de Python aplicados al análisis de datos.",
    },
    block: "Data literacy",
    accessLevel: "free",
    status: "published",
    estimatedHours: 10,
    catalogOrder: 2,
    prerequisites: [{ course: course1._id, note: "Consigliato prima di iniziare" }],
    createdBy: owner._id,
  });

  await LessonModel.insertMany([
    {
      course: course1._id,
      order: 1,
      title: { it: "Cos'è l'IA", es: "Qué es la IA" },
      theoryContent: {
        it: "# Cos'è l'IA\n\nL'intelligenza artificiale è...",
        es: "# Qué es la IA\n\nLa inteligencia artificial es...",
      },
      lessonNotebookUrl: { it: "https://github.com/example/seed/blob/main/01_lezione.ipynb", es: null },
      exerciseNotebookUrl: { it: "https://github.com/example/seed/blob/main/01_esercizi.ipynb", es: null },
    },
    {
      course: course1._id,
      order: 2,
      title: { it: "Machine Learning in breve", es: "Machine Learning en breve" },
      theoryContent: { it: "# Machine Learning\n\nUna panoramica...", es: null },
      lessonNotebookUrl: { it: "https://github.com/example/seed/blob/main/02_lezione.ipynb", es: null },
      exerciseNotebookUrl: { it: "https://github.com/example/seed/blob/main/02_esercizi.ipynb", es: null },
    },
    {
      course: course2._id,
      order: 1,
      title: { it: "Variabili e tipi", es: "Variables y tipos" },
      theoryContent: { it: "# Variabili\n\nIn Python...", es: "# Variables\n\nEn Python..." },
      lessonNotebookUrl: { it: "https://github.com/example/seed/blob/main/03_lezione.ipynb", es: null },
      exerciseNotebookUrl: { it: "https://github.com/example/seed/blob/main/03_esercizi.ipynb", es: null },
    },
  ]);

  await PathModel.create({
    code: "SEED-P1",
    title: { it: "Percorso di prova", es: "Ruta de prueba" },
    description: {
      it: "Percorso di sviluppo per validare lo schema Path end-to-end.",
      es: "Ruta de desarrollo para validar el esquema Path de extremo a extremo.",
    },
    audience: { it: "Chiunque voglia testare la feature", es: "Cualquiera que quiera probar la función" },
    estimatedHours: 16,
    estimatedWeeks: 2,
    accessLevel: "free",
    status: "published",
    steps: [
      { course: course1._id, order: 1, optional: false },
      { course: course2._id, order: 2, optional: false, note: "Richiede le basi del corso precedente" },
    ],
    createdBy: owner._id,
  });

  console.log("Seed completato: 2 corsi, 3 lezioni, 1 percorso.");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Seed fallito:", err);
  process.exit(1);
});
