export interface Course {
  id: string;
  title: string;
  description: string;
  coverImageUrl: string | null;
  accessLevel: "free" | "premium";
  hasAccess: boolean;
  createdAt: string;
}
