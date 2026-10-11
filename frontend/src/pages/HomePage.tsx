import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Rocket } from "lucide-react";
import logo from "../assets/rb-logo.png";
import { useSeo } from "../hooks/useSeo";
import SpaceWindow from "../components/SpaceWindow";
import styles from "./HomePage.module.css";

export default function HomePage() {
  const { t } = useTranslation();
  useSeo({ title: t("seo.home.title"), description: t("seo.home.description") });

  return (
    <main className={styles.home}>
      <SpaceWindow />
      <div className={`hudCorners ${styles.frame}`}>
        <img className={styles.logo} src={logo} alt="Simbolo RB" />
        <h1 className={styles.title}>ArcadIA</h1>
        <p className={styles.subtitle}>{t("home.tagline")}</p>
        <Link to="/register" className="btn">
          <Rocket size={18} strokeWidth={1.5} />
          {t("home.cta")}
        </Link>
      </div>
    </main>
  );
}
