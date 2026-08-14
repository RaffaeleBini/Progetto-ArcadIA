import type { Request, Response } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import { CourseModel } from "../models/Course.js";
import { LessonModel } from "../models/Lesson.js";
import { UserModel } from "../models/User.js";
import { ProgressModel } from "../models/Progress.js";
import { NotificationModel } from "../models/Notification.js";
import { sendError } from "../utils/apiError.js";
import { hasAccessToCourse } from "../utils/access.js";
import { isCloudinaryConfigured, uploadCourseCover } from "../config/cloudinary.js";

export const courseSchema = z.object({
  title: z.string().trim().min(1, "Il titolo è obbligatorio"),
  description: z.string().trim().min(1, "La descrizione è obbligatoria"),
  accessLevel: z.enum(["free", "premium"]).default("free"),
});

function toCourseDto(
  course: InstanceType<typeof CourseModel>,
  hasAccess: boolean,
  progressInfo: { percentage: number; isCompleted: boolean } = { percentage: 0, isCompleted: false }
) {
  return {
    id: String(course._id),
    title: course.title,
    description: course.description,
    coverImageUrl: course.coverImageUrl ?? null,
    accessLevel: course.accessLevel,
    hasAccess,
    percentage: progressInfo.percentage,
    isCompleted: progressInfo.isCompleted,
    createdAt: course.createdAt,
  };
}

export async function listCourses(req: Request, res: Response) {
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const filter = search
    ? {
        $or: [
          { title: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ],
      }
    : {};

  const [courses, user] = await Promise.all([
    CourseModel.find(filter).sort({ createdAt: -1 }),
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

      return toCourseDto(course, hasAccessToCourse(user, course), {
        percentage,
        isCompleted: progress?.isCompleted ?? false,
      });
    }),
  });
}

export async function getCourse(req: Request, res: Response) {
  const [course, user] = await Promise.all([
    CourseModel.findById(req.params.id),
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

  res.json({ course: toCourseDto(course, hasAccessToCourse(user, course)) });
}

export async function createCourse(req: Request, res: Response) {
  const { title, description, accessLevel } = req.body as z.infer<typeof courseSchema>;

  const courseId = new Types.ObjectId();
  let coverImageUrl: string | undefined;

  if (req.file) {
    if (!isCloudinaryConfigured()) {
      sendError(res, 500, "Upload copertina non configurato sul server");
      return;
    }
    coverImageUrl = await uploadCourseCover(req.file.buffer, String(courseId));
  }

  const course = await CourseModel.create({
    _id: courseId,
    title,
    description,
    accessLevel,
    coverImageUrl,
    createdBy: req.userId,
  });

  const otherUsers = await UserModel.find({ _id: { $ne: req.userId } }, "_id");
  if (otherUsers.length > 0) {
    await NotificationModel.insertMany(
      otherUsers.map((user) => ({
        recipient: user._id,
        type: "course_added",
        message: `Nuovo corso disponibile: "${course.title}"`,
        relatedId: course._id,
      }))
    );
  }

  res.status(201).json({ course: toCourseDto(course, true) });
}

export async function updateCourse(req: Request, res: Response) {
  const { title, description, accessLevel } = req.body as z.infer<typeof courseSchema>;

  const course = await CourseModel.findById(req.params.id);
  if (!course) {
    sendError(res, 404, "Corso non trovato");
    return;
  }

  if (req.file) {
    if (!isCloudinaryConfigured()) {
      sendError(res, 500, "Upload copertina non configurato sul server");
      return;
    }
    course.coverImageUrl = await uploadCourseCover(req.file.buffer, String(course._id));
  }

  course.title = title;
  course.description = description;
  course.accessLevel = accessLevel;
  await course.save();

  res.json({ course: toCourseDto(course, true) });
}

export async function deleteCourse(req: Request, res: Response) {
  const course = await CourseModel.findById(req.params.id);
  if (!course) {
    sendError(res, 404, "Corso non trovato");
    return;
  }

  await Promise.all([LessonModel.deleteMany({ course: course._id }), course.deleteOne()]);

  res.status(204).send();
}
