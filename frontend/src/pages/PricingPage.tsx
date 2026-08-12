import { useTranslation } from "react-i18next";
import { Check, Lock } from "lucide-react";
import styles from "./PricingPage.module.css";

export default function PricingPage() {
  const { t } = useTranslation();

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t("pricing.title")}</h1>
      <p className={styles.subtitle}>{t("pricing.subtitle")}</p>

      <div className={styles.plans}>
        <div className={`panel ${styles.plan}`}>
          <h2 className={styles.planName}>{t("pricing.freeName")}</h2>
          <ul className={styles.planFeatures}>
            <li>
              <Check size={14} strokeWidth={1.5} /> {t("pricing.freeFeature1")}
            </li>
            <li>
              <Check size={14} strokeWidth={1.5} /> {t("pricing.freeFeature2")}
            </li>
          </ul>
        </div>

        <div className={`panel ${styles.plan} ${styles.premiumPlan}`}>
          <h2 className={styles.planName}>{t("pricing.premiumName")}</h2>
          <ul className={styles.planFeatures}>
            <li>
              <Check size={14} strokeWidth={1.5} /> {t("pricing.premiumFeature1")}
            </li>
            <li>
              <Lock size={14} strokeWidth={1.5} /> {t("pricing.premiumFeature2")}
            </li>
          </ul>
        </div>
      </div>

      <p className={styles.note}>{t("pricing.note")}</p>
    </div>
  );
}
