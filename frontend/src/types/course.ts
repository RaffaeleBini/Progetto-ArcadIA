export interface Course {
  id: string;
  title: string;
  description: string;
  coverImageUrl: string | null;
  accessLevel: "free" | "premium";
  hasAccess: boolean;
  percentage: number;
  isCompleted: boolean;
  createdAt: string;
}
