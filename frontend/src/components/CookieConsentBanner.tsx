import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useConsent } from "../context/ConsentContext";
import styles from "./CookieConsentBanner.module.css";

function SettingsPanel() {
  const { t } = useTranslation();
  const { preferences, savePreferences, closeSettings } = useConsent();
  const [analytics, setAnalytics] = useState(preferences.analytics);

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="cookie-settings-title">
      <div className={`panel hudCorners ${styles.settingsPanel}`}>
        <h2 id="cookie-settings-title">{t("cookies.settingsTitle")}</h2>

        <div className={styles.categoryRow}>
          <div className={styles.categoryInfo}>
            <h3>{t("cookies.necessaryTitle")}</h3>
            <p>{t("cookies.necessaryDescription")}</p>
          </div>
          <span className={styles.alwaysActive}>{t("cookies.alwaysActive")}</span>
        </div>

        <div className={styles.categoryRow}>
          <div className={styles.categoryInfo}>
            <h3>{t("cookies.analyticsTitle")}</h3>
            <p>{t("cookies.analyticsDescription")}</p>
          </div>
          <input
            type="checkbox"
            checked={analytics}
            onChange={(e) => setAnalytics(e.target.checked)}
            aria-label={t("cookies.analyticsTitle")}
          />
        </div>

        <div className={styles.settingsActions}>
          <button type="button" className="btn" onClick={closeSettings}>
            {t("cookies.cancel")}
          </button>
          <button type="button" className="btn" onClick={() => savePreferences({ analytics })}>
            {t("cookies.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CookieConsentBanner() {
  const { t } = useTranslation();
  const { isPending, isSettingsOpen, acceptAll, rejectAll, openSettings } = useConsent();

  if (isSettingsOpen) {
    return <SettingsPanel />;
  }

  if (!isPending) {
    return null;
  }

  return (
    <div className={`panel hudCorners ${styles.banner}`} role="dialog" aria-modal="false" aria-label={t("cookies.settingsTitle")}>
      <p className={styles.message}>{t("cookies.message")}</p>
      <div className={styles.actions}>
        <button type="button" className="btn" onClick={rejectAll}>
          {t("cookies.reject")}
        </button>
        <button type="button" className="btn" onClick={openSettings}>
          {t("cookies.configure")}
        </button>
        <button type="button" className="btn" onClick={acceptAll}>
          {t("cookies.accept")}
        </button>
      </div>
    </div>
  );
}
