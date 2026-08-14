import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { usePreferences } from "../context/PreferencesContext";
import { getApiErrorMessage } from "../api/client";
import styles from "./AuthForm.module.css";

export default function RegisterPage() {
  const { register, login } = useAuth();
  const { language, theme } = usePreferences();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await register(name, email, password, language, theme);
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(getApiErrorMessage(err, t("auth.registerError")));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      <form className={`panel hudCorners ${styles.panel}`} onSubmit={handleSubmit}>
        <h1 className={styles.title}>{t("auth.registerTitle")}</h1>

        {error && <p className="formError">{error}</p>}

        <div className="field">
          <label htmlFor="name">{t("auth.name")}</label>
          <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div className="field">
          <label htmlFor="email">{t("auth.email")}</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>

        <div className="field">
          <label htmlFor="password">{t("auth.password")}</label>
          <input
            id="password"
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className={`btn ${styles.submit}`} disabled={isSubmitting}>
          {isSubmitting ? t("auth.submitting") : t("auth.createAccount")}
        </button>

        <p className={styles.footer}>
          {t("auth.haveAccount")} <Link to="/login">{t("auth.loginLink")}</Link>
        </p>
      </form>
    </div>
  );
}
