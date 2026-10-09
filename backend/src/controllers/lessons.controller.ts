import type { Request, Response } from "express";
import { z } from "zod";
import { CourseModel } from "../models/Course.js";
import { LessonModel } from "../models/Lesson.js";
import { UserModel } from "../models/User.js";
import { sendError } from "../utils/apiError.js";
import { hasAccessToCourse } from "../utils/access.js";
import { ensureProgress } from "../utils/progress.js";
import { pickLocalized, type Locale } from "../utils/locale.js";
import { localizedOptional } from "../validation/shared.js";

const localizedUrl = z.object({
  it: z.string().trim().url("URL non valido").optional().or(z.literal("")),
  es: z.string().trim().url("URL non valido").optional().or(z.literal("")),
});

export const lessonSchema = z.object({
  order: z.coerce.number().int().min(0, "L'ordine deve essere un numero positivo"),
  title: localizedOptional,
  theoryContent: localizedOptional,
  videoUrl: localizedUrl,
  lessonNotebookUrl: localizedUrl,
  exerciseNotebookUrl: localizedUrl,
});

type LessonDoc = InstanceType<typeof LessonModel>;

function toLessonDto(lesson: LessonDoc, locale: Locale, options: { raw?: boolean } = {}) {
  const base = {
    id: String(lesson._id),
    course: String(lesson.course),
    order: lesson.order,
    createdAt: lesson.createdAt,
  };

  if (options.raw) {
    return {
      ...base,
      title: { it: lesson.title?.it ?? "", es: lesson.title?.es ?? "" },
      theoryContent: { it: lesson.theoryContent?.it ?? "", es: lesson.theoryContent?.es ?? "" },
      videoUrl: { it: lesson.videoUrl?.it ?? "", es: lesson.videoUrl?.es ?? "" },
      lessonNotebookUrl: { it: lesson.lessonNotebookUrl?.it ?? "", es: lesson.lessonNotebookUrl?.es ?? "" },
      exerciseNotebookUrl: { it: lesson.exerciseNotebookUrl?.it ?? "", es: lesson.exerciseNotebookUrl?.es ?? "" },
    };
  }

  return {
    ...base,
    title: pickLocalized(lesson.title, locale) ?? "",
    theoryContent: pickLocalized(lesson.theoryContent, locale),
    videoUrl: pickLocalized(lesson.videoUrl, locale),
    lessonNotebookUrl: pickLocalized(lesson.lessonNotebookUrl, locale),
    exerciseNotebookUrl: pickLocalized(lesson.exerciseNotebookUrl, locale),
  };
}

async function loadCourseAndCheckAccess(req: Request, res: Response) {
  const [course, user] = await Promise.all([
    CourseModel.findById(req.params.courseId),
    UserModel.findById(req.userId),
  ]);

  if (!course) {
    sendError(res, 404, "Corso non trovato");
    return null;
  }
  if (!user) {
    sendError(res, 401, "Sessione non valida");
    return null;
  }
  if (!hasAccessToCourse(user, course)) {
    sendError(res, 403, "Contenuto riservato agli abbonati", "subscription_required");
    return null;
  }

  return course;
}

export async function listLessons(req: Request, res: Response) {
  const course = await loadCourseAndCheckAccess(req, res);
  if (!course) return;

  const locale = req.user!.preferredLanguage as Locale;
  const lessons = await LessonModel.find({ course: course._id }).sort({ order: 1 });
  res.json({ lessons: lessons.map((lesson) => toLessonDto(lesson, locale)) });
}

export async function getLesson(req: Request, res: Response) {
  const course = await loadCourseAndCheckAccess(req, res);
  if (!course) return;

  const lesson = await LessonModel.findOne({ _id: req.params.id, course: course._id });
  if (!lesson) {
    sendError(res, 404, "Lezione non trovata");
    return;
  }

  await ensureProgress(req.userId!, course._id);

  const locale = req.user!.preferredLanguage as Locale;
  const raw = req.query.raw === "true" && req.user!.role === "admin";
  res.json({ lesson: toLessonDto(lesson, locale, { raw }) });
}

export async function createLesson(req: Request, res: Response) {
  const course = await CourseModel.findById(req.params.courseId);
  if (!course) {
    sendError(res, 404, "Corso non trovato");
    return;
  }

  const data = req.body as z.infer<typeof lessonSchema>;
  const lesson = await LessonModel.create({ ...data, course: course._id });
  const locale = req.user!.preferredLanguage as Locale;
  res.status(201).json({ lesson: toLessonDto(lesson, locale) });
}

export async function updateLesson(req: Request, res: Response) {
  const data = req.body as z.infer<typeof lessonSchema>;
  const lesson = await LessonModel.findOneAndUpdate(
    { _id: req.params.id, course: req.params.courseId },
    data,
    { new: true }
  );
  if (!lesson) {
    sendError(res, 404, "Lezione non trovata");
    return;
  }
  const locale = req.user!.preferredLanguage as Locale;
  res.json({ lesson: toLessonDto(lesson, locale) });
}

export async function deleteLesson(req: Request, res: Response) {
  const lesson = await LessonModel.findOneAndDelete({ _id: req.params.id, course: req.params.courseId });
  if (!lesson) {
    sendError(res, 404, "Lezione non trovata");
    return;
  }
  res.status(204).send();
}
