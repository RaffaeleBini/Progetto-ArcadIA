import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BookOpen } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import styles from "./DashboardPage.module.css";

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useTranslation();

  return (
    <main className={styles.dashboard}>
      <h1 className={styles.title}>{t("dashboard.welcome", { name: user?.name })}</h1>
      <p>{t("dashboard.intro")}</p>
      <Link to="/courses" className="btn">
        <BookOpen size={16} strokeWidth={1.5} />
        {t("dashboard.goToCourses")}
      </Link>
    </main>
  );
}
