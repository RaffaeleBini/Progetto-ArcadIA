import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { MessageCircle, Send, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  createComment,
  createPost,
  deleteComment,
  deletePost,
  fetchComments,
  fetchPosts,
} from "../api/posts";
import { getApiErrorMessage } from "../api/client";
import Loading from "../components/Loading";
import ErrorMessage from "../components/ErrorMessage";
import type { Post } from "../types/post";
import type { Comment } from "../types/comment";
import type { Author } from "../types/post";
import styles from "./BoardPage.module.css";

function AuthorAvatar({ author }: { author: Author }) {
  return author.avatarUrl ? (
    <img className={styles.avatar} src={author.avatarUrl} alt="" />
  ) : (
    <span className={styles.avatarPlaceholder} />
  );
}

export default function BoardPage() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();

  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newPostText, setNewPostText] = useState("");
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);

  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, Comment[]>>({});
  const [newCommentText, setNewCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const load = useCallback(() => {
    setIsLoading(true);
    setError(null);
    fetchPosts()
      .then(setPosts)
      .catch((err) => setError(getApiErrorMessage(err, t("common.loadError"))))
      .finally(() => setIsLoading(false));
  }, [t]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function formatDate(value: string) {
    return new Date(value).toLocaleString(i18n.language === "es" ? "es-ES" : "it-IT");
  }

  async function handleCreatePost(event: FormEvent) {
    event.preventDefault();
    if (!newPostText.trim()) return;
    setIsSubmittingPost(true);
    try {
      const post = await createPost(newPostText);
      setPosts((prev) => [post, ...prev]);
      setNewPostText("");
    } finally {
      setIsSubmittingPost(false);
    }
  }

  async function handleDeletePost(postId: string) {
    if (!window.confirm(t("board.confirmDeletePost"))) return;
    await deletePost(postId);
    setPosts((prev) => prev.filter((post) => post.id !== postId));
  }

  async function toggleComments(postId: string) {
    if (expandedPostId === postId) {
      setExpandedPostId(null);
      return;
    }
    setExpandedPostId(postId);
    if (!commentsByPost[postId]) {
      const comments = await fetchComments(postId);
      setCommentsByPost((prev) => ({ ...prev, [postId]: comments }));
    }
  }

  async function handleCreateComment(event: FormEvent, postId: string) {
    event.preventDefault();
    if (!newCommentText.trim()) return;
    setIsSubmittingComment(true);
    try {
      const comment = await createComment(postId, newCommentText);
      setCommentsByPost((prev) => ({ ...prev, [postId]: [...(prev[postId] ?? []), comment] }));
      setNewCommentText("");
    } finally {
      setIsSubmittingComment(false);
    }
  }

  async function handleDeleteComment(postId: string, commentId: string) {
    if (!window.confirm(t("board.confirmDeleteComment"))) return;
    await deleteComment(commentId);
    setCommentsByPost((prev) => ({
      ...prev,
      [postId]: (prev[postId] ?? []).filter((comment) => comment.id !== commentId),
    }));
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t("board.title")}</h1>

      <form className={`panel ${styles.composer}`} onSubmit={handleCreatePost}>
        <textarea
          placeholder={t("board.composerPlaceholder")}
          value={newPostText}
          onChange={(e) => setNewPostText(e.target.value)}
          maxLength={2000}
        />
        <button type="submit" className="btn" disabled={isSubmittingPost || !newPostText.trim()}>
          {isSubmittingPost ? t("board.publishing") : t("board.publish")}
        </button>
      </form>

      {isLoading && <Loading />}

      {error && <ErrorMessage message={error} onRetry={load} />}

      {!isLoading && !error && posts.length === 0 && <p className={styles.empty}>{t("board.empty")}</p>}

      <div className={styles.postList}>
        {posts.map((post) => (
          <div key={post.id} className={`panel ${styles.post}`}>
            <div className={styles.postHeader}>
              <AuthorAvatar author={post.author} />
              <div className={styles.authorInfo}>
                <span className={styles.authorName}>{post.author.name}</span>
                <span className={styles.date}>{formatDate(post.createdAt)}</span>
              </div>
              {post.canDelete && (
                <button
                  type="button"
                  className={styles.iconBtn}
                  aria-label={t("board.deletePost")}
                  onClick={() => handleDeletePost(post.id)}
                >
                  <Trash2 size={14} strokeWidth={1.5} />
                </button>
              )}
            </div>

            <p className={styles.postText}>{post.text}</p>

            <button type="button" className={styles.commentsToggle} onClick={() => toggleComments(post.id)}>
              <MessageCircle size={14} strokeWidth={1.5} style={{ verticalAlign: "text-bottom", marginRight: 4 }} />
              {expandedPostId === post.id ? t("board.hideComments") : t("board.showComments")}
            </button>

            {expandedPostId === post.id && (
              <div className={styles.comments}>
                {(commentsByPost[post.id] ?? []).map((comment) => (
                  <div key={comment.id} className={styles.comment}>
                    <AuthorAvatar author={comment.author} />
                    <div className={styles.commentBody}>
                      <span className={styles.authorName}>{comment.author.name}</span>{" "}
                      <span className={styles.date}>{formatDate(comment.createdAt)}</span>
                      <p className={styles.commentText}>{comment.text}</p>
                    </div>
                    {comment.canDelete && (
                      <button
                        type="button"
                        className={styles.iconBtn}
                        aria-label={t("board.deleteComment")}
                        onClick={() => handleDeleteComment(post.id, comment.id)}
                      >
                        <Trash2 size={14} strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                ))}

                {user && (
                  <form className={styles.commentForm} onSubmit={(e) => handleCreateComment(e, post.id)}>
                    <input
                      type="text"
                      placeholder={t("board.commentPlaceholder")}
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      maxLength={1000}
                    />
                    <button type="submit" className="btn" disabled={isSubmittingComment || !newCommentText.trim()}>
                      <Send size={14} strokeWidth={1.5} />
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
