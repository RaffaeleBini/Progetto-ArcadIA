import { apiClient } from "./client";
import type { Course } from "../types/course";

export interface CourseInput {
  title: string;
  description: string;
  accessLevel: "free" | "premium";
  cover?: File | null;
}

function toFormData(input: CourseInput): FormData {
  const formData = new FormData();
  formData.append("title", input.title);
  formData.append("description", input.description);
  formData.append("accessLevel", input.accessLevel);
  if (input.cover) {
    formData.append("cover", input.cover);
  }
  return formData;
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

export async function createCourse(input: CourseInput): Promise<Course> {
  const { data } = await apiClient.post<{ course: Course }>("/api/courses", toFormData(input), {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.course;
}

export async function updateCourse(id: string, input: CourseInput): Promise<Course> {
  const { data } = await apiClient.put<{ course: Course }>(`/api/courses/${id}`, toFormData(input), {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.course;
}

export async function deleteCourse(id: string): Promise<void> {
  await apiClient.delete(`/api/courses/${id}`);
}
