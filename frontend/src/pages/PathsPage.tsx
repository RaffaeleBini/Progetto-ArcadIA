import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { fetchPaths } from "../api/paths";
import { getApiErrorMessage } from "../api/client";
import type { Path } from "../types/path";
import Loading from "../components/Loading";
import ErrorMessage from "../components/ErrorMessage";
import styles from "./PathsPage.module.css";

export default function PathsPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [paths, setPaths] = useState<Path[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setIsLoading(true);
    setError(null);
    fetchPaths()
      .then(setPaths)
      .catch((err) => setError(getApiErrorMessage(err, t("common.loadError"))))
      .finally(() => setIsLoading(false));
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t("paths.title")}</h1>
        {user?.role === "admin" && (
          <Link to="/paths/new" className="btn">
            <Plus size={16} strokeWidth={1.5} />
            {t("paths.new")}
          </Link>
        )}
      </div>

      {isLoading && paths.length === 0 && <Loading />}

      {error && <ErrorMessage message={error} onRetry={load} />}

      {!isLoading && !error && paths.length === 0 && <p className={styles.empty}>{t("paths.empty")}</p>}

      {!error && (
        <div className={styles.grid}>
          {paths.map((path) => (
            <Link key={path.id} to={`/paths/${path.id}`} className={styles.card}>
              <h2 className={styles.cardTitle}>{path.title}</h2>
              {path.audience && <p className={styles.cardAudience}>{path.audience}</p>}
              <div className={styles.cardMeta}>
                <span>{path.steps.length} {t("paths.courses")}</span>
                {path.estimatedWeeks != null && (
                  <span>
                    {path.estimatedWeeks} {t("paths.weeks")}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
