import { apiClient } from "./client";
import type { Progress } from "../types/progress";

export async function fetchProgress(courseId: string): Promise<Progress> {
  const { data } = await apiClient.get<{ progress: Progress }>(`/api/courses/${courseId}/progress`);
  return data.progress;
}

export async function completeLesson(courseId: string, lessonId: string): Promise<Progress> {
  const { data } = await apiClient.put<{ progress: Progress }>(
    `/api/courses/${courseId}/lessons/${lessonId}/complete`
  );
  return data.progress;
}

export async function uncompleteLesson(courseId: string, lessonId: string): Promise<Progress> {
  const { data } = await apiClient.put<{ progress: Progress }>(
    `/api/courses/${courseId}/lessons/${lessonId}/uncomplete`
  );
  return data.progress;
}

export function getCertificateUrl(courseId: string): string {
  return `${import.meta.env.VITE_API_URL}/api/courses/${courseId}/certificate`;
}
