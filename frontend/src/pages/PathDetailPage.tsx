import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Award, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { deletePath, fetchPath, fetchPathProgress } from "../api/paths";
import { getApiErrorMessage } from "../api/client";
import ProgressBar from "../components/ProgressBar";
import Loading from "../components/Loading";
import ErrorMessage from "../components/ErrorMessage";
import type { Path, PathProgress } from "../types/path";
import styles from "./PathDetailPage.module.css";

export default function PathDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [path, setPath] = useState<Path | null>(null);
  const [progress, setProgress] = useState<PathProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.role === "admin";

  const load = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [pathData, progressData] = await Promise.all([fetchPath(id), fetchPathProgress(id)]);
      setPath(pathData);
      setProgress(progressData);
    } catch (err) {
      setError(getApiErrorMessage(err, t("common.loadError")));
    } finally {
      setIsLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete() {
    if (!id || !window.confirm(t("paths.confirmDelete"))) return;
    await deletePath(id);
    navigate("/paths");
  }

  if (isLoading) {
    return <Loading />;
  }

  if (error || !path) {
    return <ErrorMessage message={error ?? t("common.notFound")} onRetry={load} />;
  }

  const progressByCourse = new Map((progress?.steps ?? []).map((step) => [step.course, step]));

  return (
    <div className={styles.page}>
      <Link to="/paths" className={styles.back}>
        <ArrowLeft size={14} strokeWidth={1.5} />
        {t("paths.backToList")}
      </Link>

      <div className={styles.headerRow}>
        <h1 className={styles.title}>{path.title}</h1>
        {isAdmin && (
          <div className={styles.adminActions}>
            <Link to={`/paths/${path.id}/edit`} className={styles.iconBtn} aria-label={t("courses.edit")}>
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

      {path.audience && <p className={styles.audience}>{path.audience}</p>}
      <p className={styles.description}>{path.description}</p>

      {progress && (
        <div className={styles.progressSection}>
          <div className={styles.progressRow}>
            <ProgressBar percentage={progress.percentage} />
            <span className={styles.progressLabel}>{progress.percentage}%</span>
          </div>
        </div>
      )}

      <h2 className={styles.sectionTitle}>{t("paths.steps")}</h2>
      <ul className={styles.stepList}>
        {path.steps.map((step) => {
          const stepProgress = progressByCourse.get(step.course);
          return (
            <li key={step.course} className={`panel ${styles.stepItem}`}>
              <div className={styles.stepHeader}>
                <Link to={`/courses/${step.course}`} className={styles.stepLink}>
                  <span className={styles.stepOrder}>{step.order}.</span>
                  {step.courseTitle ?? step.course}
                  {step.optional && <span className="badge">{t("paths.optional")}</span>}
                  {stepProgress?.isCompleted && <Award size={15} strokeWidth={1.5} className={styles.doneIcon} />}
                </Link>
              </div>
              {step.note && <p className={styles.stepNote}>{step.note}</p>}
              {stepProgress && (
                <div className={styles.stepProgressRow}>
                  <ProgressBar percentage={stepProgress.percentage} />
                  <span className={styles.stepProgressLabel}>{stepProgress.percentage}%</span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
