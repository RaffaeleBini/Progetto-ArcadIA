import type { Request, Response } from "express";
import { z } from "zod";
import { CourseModel } from "../models/Course.js";
import { LessonModel } from "../models/Lesson.js";
import { UserModel } from "../models/User.js";
import { sendError } from "../utils/apiError.js";
import { hasAccessToCourse } from "../utils/access.js";
import { ensureProgress } from "../utils/progress.js";

export const lessonSchema = z.object({
  title: z.string().trim().min(1, "Il titolo è obbligatorio"),
  order: z.coerce.number().int().min(0, "L'ordine deve essere un numero positivo"),
  videoUrl: z.string().trim().url("URL video non valido").optional().or(z.literal("")),
  description: z.string().trim().optional().or(z.literal("")),
  notebookGithubUrl: z.string().trim().url("URL notebook non valido").optional().or(z.literal("")),
});

function toLessonDto(lesson: InstanceType<typeof LessonModel>) {
  return {
    id: String(lesson._id),
    course: String(lesson.course),
    title: lesson.title,
    order: lesson.order,
    videoUrl: lesson.videoUrl || null,
    description: lesson.description || null,
    notebookGithubUrl: lesson.notebookGithubUrl || null,
    createdAt: lesson.createdAt,
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

  const lessons = await LessonModel.find({ course: course._id }).sort({ order: 1 });
  res.json({ lessons: lessons.map(toLessonDto) });
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

  res.json({ lesson: toLessonDto(lesson) });
}

export async function createLesson(req: Request, res: Response) {
  const course = await CourseModel.findById(req.params.courseId);
  if (!course) {
    sendError(res, 404, "Corso non trovato");
    return;
  }

  const data = req.body as z.infer<typeof lessonSchema>;
  const lesson = await LessonModel.create({ ...data, course: course._id });
  res.status(201).json({ lesson: toLessonDto(lesson) });
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
  res.json({ lesson: toLessonDto(lesson) });
}

export async function deleteLesson(req: Request, res: Response) {
  const lesson = await LessonModel.findOneAndDelete({ _id: req.params.id, course: req.params.courseId });
  if (!lesson) {
    sendError(res, 404, "Lezione non trovata");
    return;
  }
  res.status(204).send();
}
