import type { Request, Response } from "express";
import { z } from "zod";
import { CourseModel } from "../models/Course.js";
import { LessonModel } from "../models/Lesson.js";
import { PathModel } from "../models/Path.js";
import { ProgressModel } from "../models/Progress.js";
import { sendError } from "../utils/apiError.js";
import { pickLocalized, type Locale } from "../utils/locale.js";
import { localizedOptional } from "../validation/shared.js";

const pathStepSchema = z.object({
  course: z.string().min(1, "Il corso è obbligatorio"),
  order: z.coerce.number().int().min(0),
  optional: z.boolean().optional().default(false),
  lessonFilter: z.array(z.number().int()).optional().default([]),
  note: z.string().trim().optional().or(z.literal("")),
});

export const pathSchema = z.object({
  code: z.string().trim().min(1, "Il codice è obbligatorio"),
  title: localizedOptional,
  description: localizedOptional,
  audience: localizedOptional,
  estimatedHours: z.coerce.number().positive().optional(),
  estimatedWeeks: z.coerce.number().positive().optional(),
  accessLevel: z.enum(["free", "premium"]).default("premium"),
  status: z.enum(["draft", "published"]).default("draft"),
  steps: z.array(pathStepSchema).min(1, "Il percorso deve avere almeno un corso"),
});

// Forma minima richiesta da toPathDto: sia il Path "piatto" sia il
// risultato di populate("steps.course") la soddisfano.
interface PathLike {
  _id: unknown;
  code: string;
  title?: { it?: string | null; es?: string | null } | null;
  description?: { it?: string | null; es?: string | null } | null;
  audience?: { it?: string | null; es?: string | null } | null;
  estimatedHours?: number | null;
  estimatedWeeks?: number | null;
  accessLevel: string;
  status: string;
  createdAt?: Date;
  steps: { course: unknown; order: number; optional: boolean; lessonFilter?: number[]; note?: string | null }[];
}

interface PopulatedCourseRef {
  _id: unknown;
  title?: { it?: string | null; es?: string | null } | null;
}

function toPathDto(
  path: PathLike,
  locale: Locale,
  options: { raw?: boolean; populatedSteps?: { course: PopulatedCourseRef | null }[] } = {}
) {
  const base = {
    id: String(path._id),
    code: path.code,
    estimatedHours: path.estimatedHours ?? null,
    estimatedWeeks: path.estimatedWeeks ?? null,
    accessLevel: path.accessLevel,
    status: path.status,
    createdAt: path.createdAt,
  };

  if (options.raw) {
    return {
      ...base,
      title: { it: path.title?.it ?? "", es: path.title?.es ?? "" },
      description: { it: path.description?.it ?? "", es: path.description?.es ?? "" },
      audience: { it: path.audience?.it ?? "", es: path.audience?.es ?? "" },
      steps: path.steps.map((step) => ({
        course: String(step.course),
        order: step.order,
        optional: step.optional,
        lessonFilter: step.lessonFilter ?? [],
        note: step.note ?? null,
      })),
    };
  }

  const populatedByIndex = options.populatedSteps ?? [];
  return {
    ...base,
    title: pickLocalized(path.title, locale) ?? "",
    description: pickLocalized(path.description, locale) ?? "",
    audience: pickLocalized(path.audience, locale) ?? "",
    steps: path.steps
      .map((step, index) => ({
        course: String(step.course),
        courseTitle: populatedByIndex[index]?.course ? pickLocalized(populatedByIndex[index].course!.title, locale) : null,
        order: step.order,
        optional: step.optional,
        note: step.note ?? null,
      }))
      .sort((a, b) => a.order - b.order),
  };
}

export async function listPaths(req: Request, res: Response) {
  const locale = req.user!.preferredLanguage as Locale;
  const isAdmin = req.user!.role === "admin";
  const filter: Record<string, unknown> = isAdmin ? {} : { status: "published" };

  const paths = await PathModel.find(filter)
    .populate<{
      steps: { course: PopulatedCourseRef | null; order: number; optional: boolean; note: string | null }[];
    }>("steps.course")
    .sort({ code: 1 });

  res.json({ paths: paths.map((path) => toPathDto(path, locale, { populatedSteps: path.steps })) });
}

export async function getPath(req: Request, res: Response) {
  const locale = req.user!.preferredLanguage as Locale;
  const isAdmin = req.user!.role === "admin";

  const path = await PathModel.findById(req.params.id).populate<{
    steps: { course: PopulatedCourseRef | null; order: number; optional: boolean; note: string | null }[];
  }>("steps.course");

  if (!path) {
    sendError(res, 404, "Percorso non trovato");
    return;
  }

  const raw = req.query.raw === "true" && isAdmin;
  res.json({ path: toPathDto(path, locale, { raw, populatedSteps: path.steps }) });
}

export async function createPath(req: Request, res: Response) {
  const data = req.body as z.infer<typeof pathSchema>;

  const courseIds = data.steps.map((step) => step.course);
  const count = await CourseModel.countDocuments({ _id: { $in: courseIds } });
  if (count !== new Set(courseIds).size) {
    sendError(res, 400, "Uno o più corsi del percorso non esistono");
    return;
  }

  const path = await PathModel.create({
    code: data.code,
    title: data.title,
    description: data.description,
    audience: data.audience,
    estimatedHours: data.estimatedHours ?? null,
    estimatedWeeks: data.estimatedWeeks ?? null,
    accessLevel: data.accessLevel,
    status: data.status,
    steps: data.steps,
    createdBy: req.userId,
  });

  const locale = req.user!.preferredLanguage as Locale;
  res.status(201).json({ path: toPathDto(path, locale) });
}

export async function updatePath(req: Request, res: Response) {
  const data = req.body as z.infer<typeof pathSchema>;

  const path = await PathModel.findById(req.params.id);
  if (!path) {
    sendError(res, 404, "Percorso non trovato");
    return;
  }

  const courseIds = data.steps.map((step) => step.course);
  const count = await CourseModel.countDocuments({ _id: { $in: courseIds } });
  if (count !== new Set(courseIds).size) {
    sendError(res, 400, "Uno o più corsi del percorso non esistono");
    return;
  }

  path.code = data.code;
  path.title = data.title;
  path.description = data.description;
  path.audience = data.audience;
  path.estimatedHours = data.estimatedHours ?? null;
  path.estimatedWeeks = data.estimatedWeeks ?? null;
  path.accessLevel = data.accessLevel;
  path.status = data.status;
  path.steps = data.steps as unknown as typeof path.steps;
  await path.save();

  const locale = req.user!.preferredLanguage as Locale;
  res.json({ path: toPathDto(path, locale) });
}

export async function deletePath(req: Request, res: Response) {
  const path = await PathModel.findByIdAndDelete(req.params.id);
  if (!path) {
    sendError(res, 404, "Percorso non trovato");
    return;
  }
  res.status(204).send();
}

export async function getPathProgress(req: Request, res: Response) {
  const path = await PathModel.findById(req.params.id);
  if (!path) {
    sendError(res, 404, "Percorso non trovato");
    return;
  }

  const courseIds = path.steps.map((step) => step.course);
  const [progresses, lessonCounts] = await Promise.all([
    ProgressModel.find({ user: req.userId, course: { $in: courseIds } }),
    LessonModel.aggregate<{ _id: unknown; count: number }>([
      { $match: { course: { $in: courseIds } } },
      { $group: { _id: "$course", count: { $sum: 1 } } },
    ]),
  ]);

  const progressByCourse = new Map(progresses.map((p) => [String(p.course), p]));
  const lessonCountByCourse = new Map(lessonCounts.map((c) => [String(c._id), c.count]));

  const steps = [...path.steps]
    .sort((a, b) => a.order - b.order)
    .map((step) => {
      const courseId = String(step.course);
      const progress = progressByCourse.get(courseId);
      const totalLessons = lessonCountByCourse.get(courseId) ?? 0;
      const completedCount = progress?.completedLessons.length ?? 0;
      const percentage = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

      return {
        course: courseId,
        order: step.order,
        optional: step.optional,
        note: step.note ?? null,
        isCompleted: progress?.isCompleted ?? false,
        percentage,
      };
    });

  const requiredSteps = steps.filter((step) => !step.optional);
  const pathPercentage = requiredSteps.length
    ? Math.round(requiredSteps.reduce((sum, step) => sum + step.percentage, 0) / requiredSteps.length)
    : 0;
  const isPathCompleted = requiredSteps.length > 0 && requiredSteps.every((step) => step.isCompleted);

  res.json({ progress: { steps, percentage: pathPercentage, isCompleted: isPathCompleted } });
}
