import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Award, Download, FileCode, Lock, Pencil, Plus, Trash2, Video } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { deleteCourse, fetchCourse } from "../api/courses";
import { deleteLesson, fetchLessons } from "../api/lessons";
import { fetchProgress, getCertificateUrl } from "../api/progress";
import { getApiErrorMessage } from "../api/client";
import ProgressBar from "../components/ProgressBar";
import Loading from "../components/Loading";
import ErrorMessage from "../components/ErrorMessage";
import type { Course } from "../types/course";
import type { Lesson } from "../types/lesson";
import type { Progress } from "../types/progress";
import styles from "./CourseDetailPage.module.css";

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.role === "admin";
  const isLocked = course?.accessLevel === "premium" && !course.hasAccess;

  const load = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const courseData = await fetchCourse(id);
      setCourse(courseData);
      if (!(courseData.accessLevel === "premium" && !courseData.hasAccess)) {
        const [lessonsData, progressData] = await Promise.all([fetchLessons(id), fetchProgress(id)]);
        setLessons(lessonsData);
        setProgress(progressData);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, t("common.loadError")));
    } finally {
      setIsLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDeleteCourse() {
    if (!id || !window.confirm(t("courses.confirmDeleteCourse"))) return;
    await deleteCourse(id);
    navigate("/courses");
  }

  async function handleDeleteLesson(lessonId: string) {
    if (!id || !window.confirm(t("courses.confirmDeleteLesson"))) return;
    await deleteLesson(id, lessonId);
    setLessons((prev) => prev.filter((lesson) => lesson.id !== lessonId));
  }

  if (isLoading) {
    return <Loading />;
  }

  if (error || !course) {
    return <ErrorMessage message={error ?? t("common.notFound")} onRetry={load} />;
  }

  return (
    <div className={styles.page}>
      <Link to="/courses" className={styles.back}>
        <ArrowLeft size={14} strokeWidth={1.5} />
        {t("courses.backToList")}
      </Link>

      {course.coverImageUrl && <img className={styles.cover} src={course.coverImageUrl} alt="" />}

      <div className={styles.headerRow}>
        <h1 className={styles.title}>{course.title}</h1>
        {isAdmin && (
          <div className={styles.adminActions}>
            <Link to={`/courses/${course.id}/edit`} className={styles.iconBtn} aria-label={t("courses.edit")}>
              <Pencil size={16} strokeWidth={1.5} />
            </Link>
            <button
              type="button"
              className={styles.iconBtn}
              aria-label={t("courses.delete")}
              onClick={handleDeleteCourse}
            >
              <Trash2 size={16} strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>

      {course.accessLevel === "premium" && (
        <span className={`badge ${styles.badgeSpacing}`}>
          <Lock size={12} strokeWidth={1.5} />
          {t("courses.premiumBadge")}
        </span>
      )}

      <p className={styles.description}>{course.description}</p>

      {isLocked ? (
        <div className={`panel hudCorners ${styles.previewPanel}`}>
          <p className={styles.previewMessage}>{t("courses.subscriptionRequired")}</p>
          <Link to="/pricing" className="btn">
            {t("courses.viewPlans")}
          </Link>
        </div>
      ) : (
        <>
          {progress && (
            <div className={styles.progressSection}>
              <div className={styles.progressRow}>
                <ProgressBar percentage={progress.percentage} />
                <span className={styles.progressLabel}>{progress.percentage}%</span>
              </div>
              {progress.isCompleted && (
                <a className="btn" href={getCertificateUrl(course.id)}>
                  <Award size={16} strokeWidth={1.5} />
                  {t("courses.downloadCertificate")}
                  <Download size={14} strokeWidth={1.5} />
                </a>
              )}
            </div>
          )}

          <div className={styles.headerRow}>
            <h2 className={styles.sectionTitle}>{t("courses.lessons")}</h2>
            {isAdmin && (
              <Link to={`/courses/${course.id}/lessons/new`} className="btn">
                <Plus size={16} strokeWidth={1.5} />
                {t("courses.newLesson")}
              </Link>
            )}
          </div>

          <ul className={styles.lessonList}>
            {lessons.map((lesson) => {
              const isLessonCompleted = progress?.completedLessons.includes(lesson.id) ?? false;
              return (
                <li key={lesson.id} className={`panel ${styles.lessonItem}`}>
                  <Link to={`/courses/${course.id}/lessons/${lesson.id}`} className={styles.lessonLink}>
                    <span>{lesson.title}</span>
                    <span className={styles.lessonIcons}>
                      {isLessonCompleted && <Award size={15} strokeWidth={1.5} className={styles.doneIcon} />}
                      {lesson.videoUrl && <Video size={15} strokeWidth={1.5} />}
                      {lesson.notebookGithubUrl && <FileCode size={15} strokeWidth={1.5} />}
                    </span>
                  </Link>
                  {isAdmin && (
                    <div className={styles.lessonActions}>
                      <Link
                        to={`/courses/${course.id}/lessons/${lesson.id}/edit`}
                        className={styles.iconBtn}
                        aria-label={t("courses.edit")}
                      >
                        <Pencil size={14} strokeWidth={1.5} />
                      </Link>
                      <button
                        type="button"
                        className={styles.iconBtn}
                        aria-label={t("courses.delete")}
                        onClick={() => handleDeleteLesson(lesson.id)}
                      >
                        <Trash2 size={14} strokeWidth={1.5} />
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
