export interface Lesson {
  id: string;
  course: string;
  title: string;
  order: number;
  videoUrl: string | null;
  description: string | null;
  notebookGithubUrl: string | null;
  createdAt: string;
}
