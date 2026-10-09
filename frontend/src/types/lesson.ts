export interface Lesson {
  id: string;
  course: string;
  title: string;
  order: number;
  theoryContent: string | null;
  videoUrl: string | null;
  lessonNotebookUrl: string | null;
  exerciseNotebookUrl: string | null;
  createdAt: string;
}

export interface LocalizedText {
  it: string;
  es: string;
}

// Vista admin: campi bilingue completi per il form di modifica.
export interface LessonAdminDetail {
  id: string;
  course: string;
  order: number;
  title: LocalizedText;
  theoryContent: LocalizedText;
  videoUrl: LocalizedText;
  lessonNotebookUrl: LocalizedText;
  exerciseNotebookUrl: LocalizedText;
}
