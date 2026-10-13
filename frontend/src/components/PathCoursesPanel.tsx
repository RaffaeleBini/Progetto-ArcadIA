import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Award, Lock } from "lucide-react";
import { fetchPath, fetchPathProgress } from "../api/paths";
import ProgressBar from "./ProgressBar";
import type { Path, PathProgress } from "../types/path";
import styles from "./PathCoursesPanel.module.css";

interface PathCoursesPanelProps {
  pathId?: string;
  currentCourseId: string;
}

export default function PathCoursesPanel({ pathId, currentCourseId }: PathCoursesPanelProps) {
  const { t } = useTranslation();
  const [path, setPath] = useState<Path | null>(null);
  const [progress, setProgress] = useState<PathProgress | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!pathId) return;
    let cancelled = false;
    setHasError(false);
    Promise.all([fetchPath(pathId), fetchPathProgress(pathId)])
      .then(([pathData, progressData]) => {
        if (cancelled) return;
        setPath(pathData);
        setProgress(progressData);
      })
      .catch(() => {
        if (!cancelled) setHasError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [pathId]);

  if (!pathId) {
    return (
      <div className={`panel hudCorners ${styles.panel}`}>
        <h2 className={styles.heading}>{t("courses.pathCourses")}</h2>
        <p className={styles.message}>{t("courses.noPath")}</p>
        <Link to="/paths" className="btn">
          {t("courses.exploreLearningPaths")}
        </Link>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className={`panel hudCorners ${styles.panel}`}>
        <h2 className={styles.heading}>{t("courses.pathCourses")}</h2>
        <p className={styles.message}>{t("courses.pathLoadError")}</p>
      </div>
    );
  }

  if (!path || path.id !== pathId) {
    return <div className={`panel hudCorners ${styles.panel}`} aria-busy="true" />;
  }

  const progressByCourse = new Map((progress?.steps ?? []).map((step) => [step.course, step]));

  return (
    <nav className={`panel hudCorners ${styles.panel}`} aria-label={t("courses.pathCourses")}>
      <h2 className={styles.heading}>
        <Link to={`/paths/${path.id}`} className={styles.pathLink}>
          {path.title}
        </Link>
      </h2>
      <ol className={styles.list}>
        {path.steps.map((step, index) => {
          const isCurrent = step.course === currentCourseId;
          const stepProgress = progressByCourse.get(step.course);
          const isLocked = step.courseAccessLevel === "premium" && !step.hasAccess;
          return (
            <li key={step.course}>
              <Link
                to={`/courses/${step.course}?path=${path.id}`}
                className={isCurrent ? `${styles.item} ${styles.current}` : styles.item}
                aria-current={isCurrent ? "page" : undefined}
              >
                <span className={styles.number}>{index + 1}</span>
                <span className={styles.body}>
                  <span className={styles.titleRow}>
                    <span className={styles.courseTitle}>{step.courseTitle ?? step.course}</span>
                    {isLocked && <Lock size={13} strokeWidth={1.5} aria-hidden="true" />}
                    {stepProgress?.isCompleted && (
                      <Award size={13} strokeWidth={1.5} className={styles.doneIcon} aria-hidden="true" />
                    )}
                  </span>
                  {step.optional && <span className={`badge ${styles.optionalBadge}`}>{t("paths.optional")}</span>}
                  {stepProgress && !isLocked && (
                    <span className={styles.progressRow}>
                      <ProgressBar percentage={stepProgress.percentage} />
                      <span className={styles.progressLabel}>{stepProgress.percentage}%</span>
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
