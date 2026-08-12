import { apiClient } from "./client";
import type { Lesson } from "../types/lesson";

export interface LessonInput {
  title: string;
  order: number;
  videoUrl: string;
  description: string;
  notebookGithubUrl: string;
}

export async function fetchLessons(courseId: string): Promise<Lesson[]> {
  const { data } = await apiClient.get<{ lessons: Lesson[] }>(`/api/courses/${courseId}/lessons`);
  return data.lessons;
}

export async function fetchLesson(courseId: string, lessonId: string): Promise<Lesson> {
  const { data } = await apiClient.get<{ lesson: Lesson }>(`/api/courses/${courseId}/lessons/${lessonId}`);
  return data.lesson;
}

export async function createLesson(courseId: string, input: LessonInput): Promise<Lesson> {
  const { data } = await apiClient.post<{ lesson: Lesson }>(`/api/courses/${courseId}/lessons`, input);
  return data.lesson;
}

export async function updateLesson(courseId: string, lessonId: string, input: LessonInput): Promise<Lesson> {
  const { data } = await apiClient.put<{ lesson: Lesson }>(
    `/api/courses/${courseId}/lessons/${lessonId}`,
    input
  );
  return data.lesson;
}

export async function deleteLesson(courseId: string, lessonId: string): Promise<void> {
  await apiClient.delete(`/api/courses/${courseId}/lessons/${lessonId}`);
}
