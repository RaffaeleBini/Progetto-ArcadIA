import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import PDFDocument from "pdfkit";
import { CourseModel } from "../models/Course.js";
import { LessonModel } from "../models/Lesson.js";
import { UserModel } from "../models/User.js";
import { ProgressModel } from "../models/Progress.js";
import { NotificationModel } from "../models/Notification.js";
import { sendError } from "../utils/apiError.js";
import { hasAccessToCourse } from "../utils/access.js";
import { ensureProgress } from "../utils/progress.js";

function toProgressDto(
  progress: InstanceType<typeof ProgressModel> | null,
  totalLessons: number
) {
  const completedLessons = progress?.completedLessons.map((id) => String(id)) ?? [];
  const percentage = totalLessons > 0 ? Math.round((completedLessons.length / totalLessons) * 100) : 0;

  return {
    completedLessons,
    totalLessons,
    percentage,
    isCompleted: progress?.isCompleted ?? false,
    completedAt: progress?.completedAt ?? null,
    certificateId: progress?.certificateId ?? null,
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

export async function getProgress(req: Request, res: Response) {
  const course = await loadCourseAndCheckAccess(req, res);
  if (!course) return;

  const [progress, totalLessons] = await Promise.all([
    ProgressModel.findOne({ user: req.userId, course: course._id }),
    LessonModel.countDocuments({ course: course._id }),
  ]);

  res.json({ progress: toProgressDto(progress, totalLessons) });
}

export async function completeLesson(req: Request, res: Response) {
  const course = await loadCourseAndCheckAccess(req, res);
  if (!course) return;

  const lesson = await LessonModel.findOne({ _id: req.params.lessonId, course: course._id });
  if (!lesson) {
    sendError(res, 404, "Lezione non trovata");
    return;
  }

  const progress = await ensureProgress(req.userId!, course._id);
  const alreadyCompleted = progress.completedLessons.some((id) => String(id) === String(lesson._id));
  if (!alreadyCompleted) {
    progress.completedLessons.push(lesson._id);
  }

  const totalLessons = await LessonModel.countDocuments({ course: course._id });
  const justCompletedCourse = !progress.isCompleted && progress.completedLessons.length === totalLessons;

  if (justCompletedCourse) {
    progress.isCompleted = true;
    progress.completedAt = new Date();
    progress.certificateId = randomUUID();

    await NotificationModel.create({
      recipient: req.userId,
      type: "course_completed",
      message: `Hai completato il corso "${course.title}"! Il certificato è pronto per il download.`,
      relatedId: course._id,
    });
  }

  await progress.save();

  res.json({ progress: toProgressDto(progress, totalLessons) });
}

export async function uncompleteLesson(req: Request, res: Response) {
  const course = await loadCourseAndCheckAccess(req, res);
  if (!course) return;

  const progress = await ProgressModel.findOne({ user: req.userId, course: course._id });
  if (!progress) {
    sendError(res, 404, "Avanzamento non trovato");
    return;
  }

  progress.completedLessons = progress.completedLessons.filter(
    (id) => String(id) !== req.params.lessonId
  );

  const totalLessons = await LessonModel.countDocuments({ course: course._id });
  if (progress.isCompleted && progress.completedLessons.length < totalLessons) {
    progress.isCompleted = false;
    progress.completedAt = null;
    progress.certificateId = null;
  }

  await progress.save();

  res.json({ progress: toProgressDto(progress, totalLessons) });
}

export async function downloadCertificate(req: Request, res: Response) {
  const [course, user, progress] = await Promise.all([
    CourseModel.findById(req.params.courseId),
    UserModel.findById(req.userId),
    ProgressModel.findOne({ user: req.userId, course: req.params.courseId }),
  ]);

  if (!course || !user) {
    sendError(res, 404, "Corso non trovato");
    return;
  }
  if (!progress || !progress.isCompleted || !progress.certificateId) {
    sendError(res, 400, "Il corso non è ancora stato completato al 100%");
    return;
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="certificato-${course.title}.pdf"`);

  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 50 });
  doc.pipe(res);

  doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).stroke("#d4af37");

  doc
    .fontSize(28)
    .fillColor("#111111")
    .text("Certificato di Completamento", { align: "center" })
    .moveDown(2);

  doc.fontSize(14).fillColor("#444444").text("Rilasciato a", { align: "center" }).moveDown(0.3);

  doc.fontSize(24).fillColor("#111111").text(user.name, { align: "center" }).moveDown(1);

  doc
    .fontSize(14)
    .fillColor("#444444")
    .text("per il completamento del corso", { align: "center" })
    .moveDown(0.3);

  doc.fontSize(20).fillColor("#111111").text(course.title, { align: "center" }).moveDown(1.5);

  const completedAt = progress.completedAt ? new Date(progress.completedAt) : new Date();
  doc
    .fontSize(12)
    .fillColor("#444444")
    .text(`Data di completamento: ${completedAt.toLocaleDateString("it-IT")}`, { align: "center" })
    .moveDown(0.3);

  doc.fontSize(10).fillColor("#888888").text(`Codice di verifica: ${progress.certificateId}`, {
    align: "center",
  });

  doc.end();
}

export async function verifyCertificate(req: Request, res: Response) {
  const progress = await ProgressModel.findOne({
    certificateId: req.params.certificateId,
    isCompleted: true,
  });

  if (!progress) {
    sendError(res, 404, "Certificato non trovato o non valido");
    return;
  }

  const [user, course] = await Promise.all([
    UserModel.findById(progress.user),
    CourseModel.findById(progress.course),
  ]);

  if (!user || !course) {
    sendError(res, 404, "Certificato non trovato o non valido");
    return;
  }

  res.json({
    userName: user.name,
    courseTitle: course.title,
    completedAt: progress.completedAt,
    certificateId: progress.certificateId,
  });
}
