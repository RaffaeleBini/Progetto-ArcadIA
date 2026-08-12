export interface Progress {
  completedLessons: string[];
  totalLessons: number;
  percentage: number;
  isCompleted: boolean;
  completedAt: string | null;
  certificateId: string | null;
}
