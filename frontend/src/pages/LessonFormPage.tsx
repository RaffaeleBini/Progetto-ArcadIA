import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { createLesson, fetchLesson, updateLesson } from "../api/lessons";
import { getApiErrorMessage } from "../api/client";
import styles from "./LessonFormPage.module.css";

export default function LessonFormPage() {
  const { id: courseId, lessonId } = useParams<{ id: string; lessonId: string }>();
  const isEditMode = Boolean(lessonId);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [title, setTitle] = useState("");
  const [order, setOrder] = useState(1);
  const [videoUrl, setVideoUrl] = useState("");
  const [description, setDescription] = useState("");
  const [notebookGithubUrl, setNotebookGithubUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditMode);

  useEffect(() => {
    if (!courseId || !lessonId) return;
    fetchLesson(courseId, lessonId).then((lesson) => {
      setTitle(lesson.title);
      setOrder(lesson.order);
      setVideoUrl(lesson.videoUrl ?? "");
      setDescription(lesson.description ?? "");
      setNotebookGithubUrl(lesson.notebookGithubUrl ?? "");
      setIsLoading(false);
    });
  }, [courseId, lessonId]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!courseId) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const input = { title, order, videoUrl, description, notebookGithubUrl };
      const lesson =
        isEditMode && lessonId ? await updateLesson(courseId, lessonId, input) : await createLesson(courseId, input);
      navigate(`/courses/${courseId}/lessons/${lesson.id}`);
    } catch (err) {
      setError(getApiErrorMessage(err, t("courses.saveError")));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return null;
  }

  return (
    <div className={styles.page}>
      <form className={`panel ${styles.panel}`} onSubmit={handleSubmit}>
        <h1 className={styles.title}>{isEditMode ? t("courses.editLesson") : t("courses.newLesson")}</h1>

        {error && <p className="formError">{error}</p>}

        <div className="field">
          <label htmlFor="title">{t("courses.lessonTitle")}</label>
          <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>

        <div className="field">
          <label htmlFor="order">{t("courses.order")}</label>
          <input
            id="order"
            type="number"
            min={0}
            value={order}
            onChange={(e) => setOrder(Number(e.target.value))}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="videoUrl">{t("courses.videoUrl")}</label>
          <input
            id="videoUrl"
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="description">{t("courses.description")}</label>
          <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="notebookGithubUrl">{t("courses.notebookUrl")}</label>
          <input
            id="notebookGithubUrl"
            type="url"
            placeholder="https://github.com/utente/repo/blob/main/lezione.ipynb"
            value={notebookGithubUrl}
            onChange={(e) => setNotebookGithubUrl(e.target.value)}
          />
        </div>

        <button type="submit" className="btn" disabled={isSubmitting}>
          {isSubmitting ? t("courses.saving") : t("courses.save")}
        </button>
      </form>
    </div>
  );
}
