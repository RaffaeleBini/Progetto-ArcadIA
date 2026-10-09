export interface CoursePrerequisite {
  courseId: string | null;
  title: string | null;
  note?: string | null;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  description: string;
  block: string | null;
  coverImageUrl: string | null;
  accessLevel: "free" | "premium";
  status: "draft" | "published";
  estimatedHours: number | null;
  catalogOrder: number;
  hasAccess: boolean;
  percentage: number;
  isCompleted: boolean;
  prerequisites: CoursePrerequisite[];
  createdAt: string;
}

export interface LocalizedText {
  it: string;
  es: string;
}

// Vista admin: campi bilingue completi per il form di modifica.
export interface CourseAdminDetail {
  id: string;
  code: string;
  title: LocalizedText;
  description: LocalizedText;
  block: string | null;
  coverImageUrl: string | null;
  accessLevel: "free" | "premium";
  status: "draft" | "published";
  estimatedHours: number | null;
  catalogOrder: number;
  prerequisites: { course: string; note: string | null }[];
}
