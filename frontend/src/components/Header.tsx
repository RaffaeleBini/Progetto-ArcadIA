import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bell, LogOut, Moon, Sun } from "lucide-react";
import logo from "../assets/rb-logo.png";
import { useAuth } from "../context/AuthContext";
import { usePreferences } from "../context/PreferencesContext";
import { useNotifications } from "../context/NotificationsContext";
import styles from "./Header.module.css";

export default function Header() {
  const { user, logout } = useAuth();
  const { theme, language, setTheme, setLanguage } = usePreferences();
  const { unreadCount } = useNotifications();
  const { t } = useTranslation();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <header className={styles.header}>
      <Link to="/" className={styles.brand}>
        <img className={styles.logo} src={logo} alt="Simbolo RB" />
        <span className={styles.brandName}>ArcadIA</span>
      </Link>

      {user && (
        <nav className={styles.nav}>
          <Link to="/courses" className={styles.navLink}>
            {t("header.courses")}
          </Link>
          <Link to="/board" className={styles.navLink}>
            {t("header.board")}
          </Link>
        </nav>
      )}

      <div className={styles.actions}>
        <div className={styles.languageSwitch} role="group" aria-label="Lingua">
          <button
            type="button"
            className={language === "it" ? styles.langActive : styles.lang}
            onClick={() => setLanguage("it")}
          >
            IT
          </button>
          <button
            type="button"
            className={language === "es" ? styles.langActive : styles.lang}
            onClick={() => setLanguage("es")}
          >
            ES
          </button>
        </div>

        <button
          type="button"
          className={styles.themeToggle}
          aria-label={t("header.themeToggle")}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? <Sun size={18} strokeWidth={1.5} /> : <Moon size={18} strokeWidth={1.5} />}
        </button>

        {user ? (
          <>
            <Link to="/notifications" className={styles.bellLink} aria-label={t("header.notifications")}>
              <Bell size={18} strokeWidth={1.5} />
              {unreadCount > 0 && (
                <span className={styles.bellBadge}>{unreadCount > 9 ? "9+" : unreadCount}</span>
              )}
            </Link>
            <Link to="/profile" className={styles.profileLink}>
              {user.avatarUrl ? (
                <img className={styles.avatar} src={user.avatarUrl} alt="" />
              ) : (
                <span className={styles.avatarPlaceholder} />
              )}
              <span className={styles.userName}>{user.name}</span>
            </Link>
            <button type="button" className="btn" onClick={handleLogout}>
              <LogOut size={16} strokeWidth={1.5} />
              <span className={styles.logoutLabel}>{t("header.logout")}</span>
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className={styles.link}>
              {t("header.login")}
            </Link>
            <Link to="/register" className={styles.link}>
              {t("header.register")}
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
