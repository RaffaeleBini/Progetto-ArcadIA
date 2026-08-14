import { apiClient } from "./client";
import type { Post } from "../types/post";
import type { Comment } from "../types/comment";

export async function fetchPosts(): Promise<Post[]> {
  const { data } = await apiClient.get<{ posts: Post[] }>("/api/posts");
  return data.posts;
}

export async function createPost(text: string): Promise<Post> {
  const { data } = await apiClient.post<{ post: Post }>("/api/posts", { text });
  return data.post;
}

export async function deletePost(id: string): Promise<void> {
  await apiClient.delete(`/api/posts/${id}`);
}

export async function fetchComments(postId: string): Promise<Comment[]> {
  const { data } = await apiClient.get<{ comments: Comment[] }>(`/api/posts/${postId}/comments`);
  return data.comments;
}

export async function createComment(postId: string, text: string): Promise<Comment> {
  const { data } = await apiClient.post<{ comment: Comment }>(`/api/posts/${postId}/comments`, { text });
  return data.comment;
}

export async function deleteComment(id: string): Promise<void> {
  await apiClient.delete(`/api/comments/${id}`);
}
