import { apiClient } from "./client";
import type { Course, CourseAdminDetail, LocalizedText } from "../types/course";

export interface CourseInput {
  code: string;
  title: LocalizedText;
  description: LocalizedText;
  block: string;
  accessLevel: "free" | "premium";
  status: "draft" | "published";
  estimatedHours: number | null;
  catalogOrder: number;
  prerequisites: { course: string; note?: string }[];
}

export async function fetchCourses(search?: string): Promise<Course[]> {
  const { data } = await apiClient.get<{ courses: Course[] }>("/api/courses", {
    params: search ? { search } : undefined,
  });
  return data.courses;
}

export async function fetchCourse(id: string): Promise<Course> {
  const { data } = await apiClient.get<{ course: Course }>(`/api/courses/${id}`);
  return data.course;
}

export async function fetchCourseForEdit(id: string): Promise<CourseAdminDetail> {
  const { data } = await apiClient.get<{ course: CourseAdminDetail }>(`/api/courses/${id}`, {
    params: { raw: "true" },
  });
  return data.course;
}

export async function createCourse(input: CourseInput): Promise<Course> {
  const { data } = await apiClient.post<{ course: Course }>("/api/courses", input);
  return data.course;
}

export async function updateCourse(id: string, input: CourseInput): Promise<Course> {
  const { data } = await apiClient.put<{ course: Course }>(`/api/courses/${id}`, input);
  return data.course;
}

export async function uploadCourseCover(id: string, cover: File): Promise<Course> {
  const formData = new FormData();
  formData.append("cover", cover);
  const { data } = await apiClient.post<{ course: Course }>(`/api/courses/${id}/cover`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.course;
}

export async function deleteCourse(id: string): Promise<void> {
  await apiClient.delete(`/api/courses/${id}`);
}
