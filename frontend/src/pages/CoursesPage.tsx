import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Lock, Plus, Search } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { fetchCourses } from "../api/courses";
import { getApiErrorMessage } from "../api/client";
import type { Course } from "../types/course";
import ProgressBar from "../components/ProgressBar";
import Loading from "../components/Loading";
import ErrorMessage from "../components/ErrorMessage";
import styles from "./CoursesPage.module.css";

export default function CoursesPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [courses, setCourses] = useState<Course[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setIsLoading(true);
    setError(null);
    fetchCourses(search || undefined)
      .then(setCourses)
      .catch((err) => setError(getApiErrorMessage(err, t("common.loadError"))))
      .finally(() => setIsLoading(false));
  }, [search, t]);

  useEffect(() => {
    const timeout = setTimeout(load, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t("courses.title")}</h1>
        <div className={styles.searchBar}>
          <Search size={16} strokeWidth={1.5} />
          <input
            type="search"
            placeholder={t("courses.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {user?.role === "admin" && (
          <Link to="/courses/new" className="btn">
            <Plus size={16} strokeWidth={1.5} />
            {t("courses.new")}
          </Link>
        )}
      </div>

      {isLoading && courses.length === 0 && <Loading />}

      {error && <ErrorMessage message={error} onRetry={load} />}

      {!isLoading && !error && courses.length === 0 && <p className={styles.empty}>{t("courses.empty")}</p>}

      {!error && (
        <div className={styles.grid}>
          {courses.map((course) => (
            <Link key={course.id} to={`/courses/${course.id}`} className={styles.card}>
              <div className={styles.coverWrap}>
                {course.coverImageUrl ? (
                  <img className={styles.cover} src={course.coverImageUrl} alt="" />
                ) : (
                  <div className={styles.coverPlaceholder} />
                )}
                {course.accessLevel === "premium" && (
                  <span className={`badge ${styles.badgeOverlay}`}>
                    <Lock size={12} strokeWidth={1.5} />
                    {t("courses.premiumBadge")}
                  </span>
                )}
              </div>
              <div className={styles.body}>
                <h2 className={styles.cardTitle}>{course.title}</h2>
                <p className={styles.cardDescription}>{course.description}</p>
                {course.hasAccess && (
                  <div className={styles.progressRow}>
                    <ProgressBar percentage={course.percentage} />
                    <span className={styles.progressLabel}>{course.percentage}%</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
