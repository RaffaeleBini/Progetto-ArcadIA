import { useTranslation } from "react-i18next";
import { useConsent } from "../context/ConsentContext";
import styles from "./Footer.module.css";

export default function Footer() {
  const { t } = useTranslation();
  const { openSettings } = useConsent();

  return (
    <footer className={styles.footer}>
      <button type="button" className={styles.link} onClick={openSettings}>
        {t("cookies.manageLink")}
      </button>
    </footer>
  );
}
