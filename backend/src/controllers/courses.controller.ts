import type { Request, Response } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import { CourseModel } from "../models/Course.js";
import { LessonModel } from "../models/Lesson.js";
import { UserModel } from "../models/User.js";
import { sendError } from "../utils/apiError.js";
import { hasAccessToCourse } from "../utils/access.js";
import { isCloudinaryConfigured, uploadCourseCover } from "../config/cloudinary.js";

export const courseSchema = z.object({
  title: z.string().trim().min(1, "Il titolo è obbligatorio"),
  description: z.string().trim().min(1, "La descrizione è obbligatoria"),
  accessLevel: z.enum(["free", "premium"]).default("free"),
});

function toCourseDto(course: InstanceType<typeof CourseModel>, hasAccess: boolean) {
  return {
    id: String(course._id),
    title: course.title,
    description: course.description,
    coverImageUrl: course.coverImageUrl ?? null,
    accessLevel: course.accessLevel,
    hasAccess,
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

  res.json({ courses: courses.map((course) => toCourseDto(course, hasAccessToCourse(user, course))) });
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
