import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import styles from "./DashboardPage.module.css";

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useTranslation();

  return (
    <main className={styles.dashboard}>
      <h1 className={styles.title}>{t("dashboard.welcome", { name: user?.name })}</h1>
      <p>{t("dashboard.underConstruction")}</p>
    </main>
  );
}
