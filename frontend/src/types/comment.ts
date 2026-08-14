import type { Author } from "./post";

export interface Comment {
  id: string;
  text: string;
  createdAt: string;
  author: Author;
  canDelete: boolean;
}
