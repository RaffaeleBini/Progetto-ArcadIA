import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { getApiErrorMessage } from "../api/client";
import styles from "./AuthForm.module.css";

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(getApiErrorMessage(err, t("auth.loginError")));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      <form className={`panel hudCorners ${styles.panel}`} onSubmit={handleSubmit}>
        <h1 className={styles.title}>{t("auth.loginTitle")}</h1>

        {error && <p className="formError">{error}</p>}

        <div className="field">
          <label htmlFor="email">{t("auth.email")}</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>

        <div className="field">
          <label htmlFor="password">{t("auth.password")}</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className={`btn ${styles.submit}`} disabled={isSubmitting}>
          {isSubmitting ? t("auth.submitting") : t("auth.loginTitle")}
        </button>

        <p className={styles.footer}>
          {t("auth.noAccount")} <Link to="/register">{t("auth.registerLink")}</Link>
        </p>
      </form>
    </div>
  );
}
