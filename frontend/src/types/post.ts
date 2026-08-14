export interface Author {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface Post {
  id: string;
  text: string;
  createdAt: string;
  author: Author;
  canDelete: boolean;
}
