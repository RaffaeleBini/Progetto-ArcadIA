import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Award, ShieldX } from "lucide-react";
import { verifyCertificate, type CertificateVerification } from "../api/verify";
import { usePreferences } from "../context/PreferencesContext";
import styles from "./VerifyCertificatePage.module.css";

const DATE_LOCALES: Record<string, string> = { it: "it-IT", es: "es-ES" };

export default function VerifyCertificatePage() {
  const { certificateId } = useParams<{ certificateId: string }>();
  const { t } = useTranslation();
  const { language } = usePreferences();

  const [result, setResult] = useState<CertificateVerification | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!certificateId) return;
    verifyCertificate(certificateId)
      .then(setResult)
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  }, [certificateId]);

  if (isLoading) {
    return null;
  }

  return (
    <div className={styles.page}>
      <div className={`panel ${styles.panel}`}>
        {result ? (
          <>
            <Award size={40} strokeWidth={1.5} className={styles.icon} />
            <h1 className={styles.title}>{t("verify.valid")}</h1>

            <div className={styles.row}>
              <span className={styles.label}>{t("verify.recipient")}</span>
              <span className={styles.value}>{result.userName}</span>
            </div>

            <div className={styles.row}>
              <span className={styles.label}>{t("verify.course")}</span>
              <span className={styles.value}>{result.courseTitle}</span>
            </div>

            <div className={styles.row}>
              <span className={styles.label}>{t("verify.completedAt")}</span>
              <span className={styles.value}>
                {new Date(result.completedAt).toLocaleDateString(DATE_LOCALES[language])}
              </span>
            </div>

            <p className={styles.certId}>{result.certificateId}</p>
          </>
        ) : (
          notFound && (
            <>
              <ShieldX size={40} strokeWidth={1.5} className={`${styles.icon} ${styles.errorIcon}`} />
              <h1 className={styles.title}>{t("verify.notFound")}</h1>
            </>
          )
        )}
      </div>
    </div>
  );
}
