import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import styles from "./ErrorMessage.module.css";

export default function ErrorMessage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useTranslation();

  return (
    <div className={`panel ${styles.wrap}`}>
      <AlertTriangle size={24} strokeWidth={1.5} className={styles.icon} />
      <p className={styles.message}>{message}</p>
      {onRetry && (
        <button type="button" className="btn" onClick={onRetry}>
          {t("common.retry")}
        </button>
      )}
    </div>
  );
}
