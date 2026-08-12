import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Check, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { deleteLesson, fetchLesson } from "../api/lessons";
import { completeLesson, fetchProgress, uncompleteLesson } from "../api/progress";
import { getColabUrl, getVideoEmbedUrl } from "../utils/media";
import type { Lesson } from "../types/lesson";
import type { Progress } from "../types/progress";
import styles from "./LessonPage.module.css";

export default function LessonPage() {
  const { id: courseId, lessonId } = useParams<{ id: string; lessonId: string }>();
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  const isAdmin = user?.role === "admin";
  const isCompleted = lessonId ? (progress?.completedLessons.includes(lessonId) ?? false) : false;

  const load = useCallback(async () => {
    if (!courseId || !lessonId) return;
    setIsLoading(true);
    const [lessonData, progressData] = await Promise.all([
      fetchLesson(courseId, lessonId),
      fetchProgress(courseId),
    ]);
    setLesson(lessonData);
    setProgress(progressData);
    setIsLoading(false);
  }, [courseId, lessonId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete() {
    if (!courseId || !lessonId || !window.confirm(t("courses.confirmDeleteLesson"))) return;
    await deleteLesson(courseId, lessonId);
    navigate(`/courses/${courseId}`);
  }

  async function handleToggleComplete() {
    if (!courseId || !lessonId) return;
    setIsToggling(true);
    try {
      const updated = isCompleted
        ? await uncompleteLesson(courseId, lessonId)
        : await completeLesson(courseId, lessonId);
      setProgress(updated);
    } finally {
      setIsToggling(false);
    }
  }

  if (isLoading || !lesson) {
    return null;
  }

  const embedUrl = lesson.videoUrl ? getVideoEmbedUrl(lesson.videoUrl) : null;

  return (
    <div className={styles.page}>
      <Link to={`/courses/${courseId}`} className={styles.back}>
        <ArrowLeft size={14} strokeWidth={1.5} />
        {t("courses.backToCourse")}
      </Link>

      <div className={styles.headerRow}>
        <h1 className={styles.title}>{lesson.title}</h1>
        {isAdmin && courseId && (
          <div className={styles.adminActions}>
            <Link
              to={`/courses/${courseId}/lessons/${lesson.id}/edit`}
              className={styles.iconBtn}
              aria-label={t("courses.edit")}
            >
              <Pencil size={16} strokeWidth={1.5} />
            </Link>
            <button
              type="button"
              className={styles.iconBtn}
              aria-label={t("courses.delete")}
              onClick={handleDelete}
            >
              <Trash2 size={16} strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>

      {embedUrl && (
        <div className={styles.videoWrap}>
          <iframe src={embedUrl} title={lesson.title} allowFullScreen />
        </div>
      )}

      {lesson.description && <p className={styles.description}>{lesson.description}</p>}

      <div className={styles.actions}>
        {lesson.notebookGithubUrl && (
          <a
            className="btn"
            href={getColabUrl(lesson.notebookGithubUrl)}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={16} strokeWidth={1.5} />
            {t("courses.openInColab")}
          </a>
        )}

        <button
          type="button"
          className={isCompleted ? `btn ${styles.completedBtn}` : "btn"}
          onClick={handleToggleComplete}
          disabled={isToggling}
        >
          <Check size={16} strokeWidth={1.5} />
          {isCompleted ? t("courses.completed") : t("courses.markComplete")}
        </button>
      </div>
    </div>
  );
}
