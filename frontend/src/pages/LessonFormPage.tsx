import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { createLesson, fetchLessonForEdit, updateLesson } from "../api/lessons";
import { getApiErrorMessage } from "../api/client";
import Loading from "../components/Loading";
import ErrorMessage from "../components/ErrorMessage";
import LocalizedField from "../components/LocalizedField";
import type { LocalizedText } from "../types/lesson";
import styles from "./LessonFormPage.module.css";

const EMPTY_TEXT: LocalizedText = { it: "", es: "" };

export default function LessonFormPage() {
  const { id: courseId, lessonId } = useParams<{ id: string; lessonId: string }>();
  const isEditMode = Boolean(lessonId);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [title, setTitle] = useState<LocalizedText>(EMPTY_TEXT);
  const [order, setOrder] = useState(1);
  const [theoryContent, setTheoryContent] = useState<LocalizedText>(EMPTY_TEXT);
  const [videoUrl, setVideoUrl] = useState<LocalizedText>(EMPTY_TEXT);
  const [lessonNotebookUrl, setLessonNotebookUrl] = useState<LocalizedText>(EMPTY_TEXT);
  const [exerciseNotebookUrl, setExerciseNotebookUrl] = useState<LocalizedText>(EMPTY_TEXT);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!courseId || !lessonId) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const lesson = await fetchLessonForEdit(courseId, lessonId);
      setTitle(lesson.title);
      setOrder(lesson.order);
      setTheoryContent(lesson.theoryContent);
      setVideoUrl(lesson.videoUrl);
      setLessonNotebookUrl(lesson.lessonNotebookUrl);
      setExerciseNotebookUrl(lesson.exerciseNotebookUrl);
    } catch (err) {
      setLoadError(getApiErrorMessage(err, t("common.loadError")));
    } finally {
      setIsLoading(false);
    }
  }, [courseId, lessonId, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!courseId) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const input = { title, order, theoryContent, videoUrl, lessonNotebookUrl, exerciseNotebookUrl };
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
    return <Loading />;
  }

  if (loadError) {
    return <ErrorMessage message={loadError} onRetry={load} />;
  }

  return (
    <div className={styles.page}>
      <form className={`panel hudCorners ${styles.panel}`} onSubmit={handleSubmit}>
        <h1 className={styles.title}>{isEditMode ? t("courses.editLesson") : t("courses.newLesson")}</h1>

        {error && <p className="formError">{error}</p>}

        <LocalizedField id="title" label={t("courses.lessonTitle")} value={title} onChange={setTitle} required />

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

        <LocalizedField
          id="theoryContent"
          label={t("courses.theoryContent")}
          value={theoryContent}
          onChange={setTheoryContent}
          multiline
          large
        />

        <LocalizedField
          id="videoUrl"
          label={t("courses.videoUrl")}
          value={videoUrl}
          onChange={setVideoUrl}
          type="url"
        />

        <LocalizedField
          id="lessonNotebookUrl"
          label={t("courses.lessonNotebookUrl")}
          value={lessonNotebookUrl}
          onChange={setLessonNotebookUrl}
          type="url"
        />

        <LocalizedField
          id="exerciseNotebookUrl"
          label={t("courses.exerciseNotebookUrl")}
          value={exerciseNotebookUrl}
          onChange={setExerciseNotebookUrl}
          type="url"
        />

        <button type="submit" className="btn" disabled={isSubmitting}>
          {isSubmitting ? t("courses.saving") : t("courses.save")}
        </button>
      </form>
    </div>
  );
}
