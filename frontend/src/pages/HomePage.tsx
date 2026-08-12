import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Rocket } from "lucide-react";
import logo from "../assets/rb-logo.png";
import styles from "./HomePage.module.css";

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <main className={styles.home}>
      <img className={styles.logo} src={logo} alt="Simbolo RB" />
      <h1 className={styles.title}>ArcadIA</h1>
      <p className={styles.subtitle}>{t("home.tagline")}</p>
      <Link to="/register" className="btn">
        <Rocket size={18} strokeWidth={1.5} />
        {t("home.cta")}
      </Link>
    </main>
  );
}
