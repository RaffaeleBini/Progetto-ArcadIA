export interface PathStep {
  course: string;
  courseTitle: string | null;
  order: number;
  optional: boolean;
  note: string | null;
}

export interface Path {
  id: string;
  code: string;
  title: string;
  description: string;
  audience: string;
  estimatedHours: number | null;
  estimatedWeeks: number | null;
  accessLevel: "free" | "premium";
  status: "draft" | "published";
  steps: PathStep[];
}

export interface PathStepProgress {
  course: string;
  order: number;
  optional: boolean;
  note: string | null;
  isCompleted: boolean;
  percentage: number;
}

export interface PathProgress {
  steps: PathStepProgress[];
  percentage: number;
  isCompleted: boolean;
}

export interface LocalizedText {
  it: string;
  es: string;
}

export interface PathAdminStep {
  course: string;
  order: number;
  optional: boolean;
  lessonFilter: number[];
  note: string | null;
}

// Vista admin: campi bilingue completi per il form di modifica.
export interface PathAdminDetail {
  id: string;
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
