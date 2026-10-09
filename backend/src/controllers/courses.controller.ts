import type { Request, Response } from "express";
import { z } from "zod";
import { CourseModel } from "../models/Course.js";
import { LessonModel } from "../models/Lesson.js";
import { PathModel } from "../models/Path.js";
import { UserModel } from "../models/User.js";
import { ProgressModel } from "../models/Progress.js";
import { NotificationModel } from "../models/Notification.js";
import { sendError } from "../utils/apiError.js";
import { hasAccessToCourse } from "../utils/access.js";
import { pickLocalized, type Locale } from "../utils/locale.js";
import { localizedOptional } from "../validation/shared.js";
import { isCloudinaryConfigured, uploadCourseCover } from "../config/cloudinary.js";

export const courseSchema = z.object({
  code: z.string().trim().min(1, "Il codice è obbligatorio"),
  title: localizedOptional,
  description: localizedOptional,
  block: z.string().trim().optional().or(z.literal("")),
  accessLevel: z.enum(["free", "premium"]).default("free"),
  status: z.enum(["draft", "published"]).default("draft"),
  estimatedHours: z.coerce.number().positive().optional(),
  catalogOrder: z.coerce.number().int().min(0),
  prerequisites: z
    .array(z.object({ course: z.string(), note: z.string().optional() }))
    .optional()
    .default([]),
});

type CourseDoc = InstanceType<typeof CourseModel>;

// Forma minima richiesta da toCourseDto: sia il Course "piatto" sia il
// risultato di populate("prerequisites.course") la soddisfano, evitando
// conflitti tra i tipi generati da Mongoose per i due casi.
interface CourseLike {
  _id: unknown;
  code: string;
  title?: { it?: string | null; es?: string | null } | null;
  description?: { it?: string | null; es?: string | null } | null;
  block?: string | null;
  coverImageUrl?: string | null;
  accessLevel: string;
  status: string;
  estimatedHours?: number | null;
  catalogOrder: number;
  createdAt?: Date;
  prerequisites: { course?: unknown; note?: string | null }[];
}

interface PopulatedCourseRef {
  _id: unknown;
  title?: { it?: string | null; es?: string | null } | null;
}

function toCourseDto(
  course: CourseLike,
  hasAccess: boolean,
  locale: Locale,
  progressInfo: { percentage: number; isCompleted: boolean } = { percentage: 0, isCompleted: false },
  options: { raw?: boolean; prerequisites?: { course: PopulatedCourseRef | null; note?: string | null }[] } = {}
) {
  const base = {
    id: String(course._id),
    code: course.code,
    block: course.block ?? null,
    coverImageUrl: course.coverImageUrl ?? null,
    accessLevel: course.accessLevel,
    status: course.status,
    estimatedHours: course.estimatedHours ?? null,
    catalogOrder: course.catalogOrder,
    hasAccess,
    percentage: progressInfo.percentage,
    isCompleted: progressInfo.isCompleted,
    createdAt: course.createdAt,
  };

  if (options.raw) {
    return {
      ...base,
      title: { it: course.title?.it ?? "", es: course.title?.es ?? "" },
      description: { it: course.description?.it ?? "", es: course.description?.es ?? "" },
      prerequisites: course.prerequisites.map((p) => ({
        course: p.course ? String(p.course) : null,
        note: p.note ?? null,
      })),
    };
  }

  return {
    ...base,
    title: pickLocalized(course.title, locale) ?? "",
    description: pickLocalized(course.description, locale) ?? "",
    prerequisites: (options.prerequisites ?? []).map((p) => ({
      courseId: p.course ? String(p.course._id) : null,
      title: p.course ? pickLocalized(p.course.title, locale) : null,
      note: p.note,
    })),
  };
}

export async function listCourses(req: Request, res: Response) {
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const locale = req.user!.preferredLanguage as Locale;
  const isAdmin = req.user!.role === "admin";

  const filter: Record<string, unknown> = isAdmin ? {} : { status: "published" };
  if (search) {
    filter.$or = [
      { "title.it": { $regex: search, $options: "i" } },
      { "title.es": { $regex: search, $options: "i" } },
      { "description.it": { $regex: search, $options: "i" } },
      { "description.es": { $regex: search, $options: "i" } },
    ];
  }

  const [courses, user] = await Promise.all([
    CourseModel.find(filter).sort({ catalogOrder: 1 }),
    UserModel.findById(req.userId),
  ]);

  if (!user) {
    sendError(res, 401, "Sessione non valida");
    return;
  }

  const courseIds = courses.map((course) => course._id);
  const [lessonCounts, progresses] = await Promise.all([
    LessonModel.aggregate<{ _id: unknown; count: number }>([
      { $match: { course: { $in: courseIds } } },
      { $group: { _id: "$course", count: { $sum: 1 } } },
    ]),
    ProgressModel.find({ user: req.userId, course: { $in: courseIds } }),
  ]);

  const lessonCountByCourse = new Map(lessonCounts.map((entry) => [String(entry._id), entry.count]));
  const progressByCourse = new Map(progresses.map((progress) => [String(progress.course), progress]));

  res.json({
    courses: courses.map((course) => {
      const totalLessons = lessonCountByCourse.get(String(course._id)) ?? 0;
      const progress = progressByCourse.get(String(course._id));
      const completedCount = progress?.completedLessons.length ?? 0;
      const percentage = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

      return toCourseDto(course, hasAccessToCourse(user, course), locale, {
        percentage,
        isCompleted: progress?.isCompleted ?? false,
      });
    }),
  });
}

export async function getCourse(req: Request, res: Response) {
  const locale = req.user!.preferredLanguage as Locale;
  const [course, user] = await Promise.all([
    CourseModel.findById(req.params.id).populate<{
      prerequisites: { course: PopulatedCourseRef | null; note: string | null }[];
    }>("prerequisites.course"),
    UserModel.findById(req.userId),
  ]);

  if (!course) {
    sendError(res, 404, "Corso non trovato");
    return;
  }
  if (!user) {
    sendError(res, 401, "Sessione non valida");
    return;
  }

  const raw = req.query.raw === "true" && user.role === "admin";

  res.json({
    course: toCourseDto(course, hasAccessToCourse(user, course), locale, undefined, {
      raw,
      prerequisites: course.prerequisites,
    }),
  });
}

export async function createCourse(req: Request, res: Response) {
  const data = req.body as z.infer<typeof courseSchema>;
  const locale = req.user!.preferredLanguage as Locale;

  if (data.prerequisites.length > 0) {
    const count = await CourseModel.countDocuments({ _id: { $in: data.prerequisites.map((p) => p.course) } });
    if (count !== data.prerequisites.length) {
      sendError(res, 400, "Uno o più corsi prerequisito non esistono");
      return;
    }
  }

  const course = await CourseModel.create({
    code: data.code,
    title: data.title,
    description: data.description,
    block: data.block || null,
    accessLevel: data.accessLevel,
    status: data.status,
    estimatedHours: data.estimatedHours ?? null,
    catalogOrder: data.catalogOrder,
    prerequisites: data.prerequisites,
    createdBy: req.userId,
  });

  const otherUsers = await UserModel.find({ _id: { $ne: req.userId } }, "_id");
  if (otherUsers.length > 0) {
    const title = pickLocalized(course.title, "it") ?? course.code;
    await NotificationModel.insertMany(
      otherUsers.map((user) => ({
        recipient: user._id,
        type: "course_added",
        message: `Nuovo corso disponibile: "${title}"`,
        relatedId: course._id,
      }))
    );
  }

  res.status(201).json({ course: toCourseDto(course, true, locale) });
}

export async function updateCourse(req: Request, res: Response) {
  const data = req.body as z.infer<typeof courseSchema>;
  const locale = req.user!.preferredLanguage as Locale;

  const course = await CourseModel.findById(req.params.id);
  if (!course) {
    sendError(res, 404, "Corso non trovato");
    return;
  }

  if (data.prerequisites.length > 0) {
    const count = await CourseModel.countDocuments({ _id: { $in: data.prerequisites.map((p) => p.course) } });
    if (count !== data.prerequisites.length) {
      sendError(res, 400, "Uno o più corsi prerequisito non esistono");
      return;
    }
  }

  course.code = data.code;
  course.title = data.title;
  course.description = data.description;
  course.block = data.block || null;
  course.accessLevel = data.accessLevel;
  course.status = data.status;
  course.estimatedHours = data.estimatedHours ?? null;
  course.catalogOrder = data.catalogOrder;
  course.prerequisites = data.prerequisites as unknown as typeof course.prerequisites;
  await course.save();

  res.json({ course: toCourseDto(course, true, locale) });
}

export async function uploadCourseCoverImage(req: Request, res: Response) {
  const course = await CourseModel.findById(req.params.id);
  if (!course) {
    sendError(res, 404, "Corso non trovato");
    return;
  }
  if (!req.file) {
    sendError(res, 400, "Nessuna immagine ricevuta");
    return;
  }
  if (!isCloudinaryConfigured()) {
    sendError(res, 500, "Upload copertina non configurato sul server");
    return;
  }

  course.coverImageUrl = await uploadCourseCover(req.file.buffer, String(course._id));
  await course.save();

  const locale = req.user!.preferredLanguage as Locale;
  res.json({ course: toCourseDto(course, true, locale) });
}

export async function deleteCourse(req: Request, res: Response) {
  const course = await CourseModel.findById(req.params.id);
  if (!course) {
    sendError(res, 404, "Corso non trovato");
    return;
  }

  const referencedInPath = await PathModel.exists({ "steps.course": course._id });
  if (referencedInPath) {
    sendError(res, 409, "Il corso è referenziato in un percorso: rimuovilo prima dal percorso");
    return;
  }

  await Promise.all([LessonModel.deleteMany({ course: course._id }), course.deleteOne()]);

  res.status(204).send();
}
