import { apiClient } from "./client";
import type { LocalizedText, Path, PathAdminDetail, PathAdminStep, PathProgress } from "../types/path";

export interface PathInput {
  code: string;
  title: LocalizedText;
  description: LocalizedText;
  audience: LocalizedText;
  estimatedHours: number | null;
  estimatedWeeks: number | null;
  accessLevel: "free" | "premium";
  status: "draft" | "published";
  steps: PathAdminStep[];
}

export async function fetchPaths(): Promise<Path[]> {
  const { data } = await apiClient.get<{ paths: Path[] }>("/api/paths");
  return data.paths;
}

export async function fetchPath(id: string): Promise<Path> {
  const { data } = await apiClient.get<{ path: Path }>(`/api/paths/${id}`);
  return data.path;
}

export async function fetchPathForEdit(id: string): Promise<PathAdminDetail> {
  const { data } = await apiClient.get<{ path: PathAdminDetail }>(`/api/paths/${id}`, {
    params: { raw: "true" },
  });
  return data.path;
}

export async function fetchPathProgress(id: string): Promise<PathProgress> {
  const { data } = await apiClient.get<{ progress: PathProgress }>(`/api/paths/${id}/progress`);
  return data.progress;
}

export async function createPath(input: PathInput): Promise<Path> {
  const { data } = await apiClient.post<{ path: Path }>("/api/paths", input);
  return data.path;
}

export async function updatePath(id: string, input: PathInput): Promise<Path> {
  const { data } = await apiClient.put<{ path: Path }>(`/api/paths/${id}`, input);
  return data.path;
}

export async function deletePath(id: string): Promise<void> {
  await apiClient.delete(`/api/paths/${id}`);
}
