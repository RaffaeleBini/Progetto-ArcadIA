import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { getApiErrorMessage } from "../api/client";
import styles from "./AuthForm.module.css";

export default function LoginPage() {
  const { login, verifyTwoFactor } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [awaitingTwoFactor, setAwaitingTwoFactor] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  const [isVerifyingTwoFactor, setIsVerifyingTwoFactor] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const { requiresTwoFactor } = await login(email, password);
      if (requiresTwoFactor) {
        setAwaitingTwoFactor(true);
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(getApiErrorMessage(err, t("auth.loginError")));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleTwoFactorSubmit(event: FormEvent) {
    event.preventDefault();
    setTwoFactorError(null);
    setIsVerifyingTwoFactor(true);
    try {
      await verifyTwoFactor(twoFactorCode);
      navigate("/dashboard");
    } catch (err) {
      setTwoFactorError(getApiErrorMessage(err, t("auth.twoFactorError")));
    } finally {
      setIsVerifyingTwoFactor(false);
    }
  }

  if (awaitingTwoFactor) {
    return (
      <div className={styles.wrapper}>
        <form className={`panel hudCorners ${styles.panel}`} onSubmit={handleTwoFactorSubmit}>
          <h1 className={styles.title}>{t("auth.twoFactorTitle")}</h1>
          <p className={styles.footer}>{t("auth.twoFactorHint")}</p>

          {twoFactorError && <p className="formError">{twoFactorError}</p>}

          <div className="field">
            <label htmlFor="twoFactorCode">{t("auth.twoFactorCode")}</label>
            <input
              id="twoFactorCode"
              type="text"
              inputMode="text"
              autoComplete="one-time-code"
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value)}
              required
              autoFocus
            />
          </div>

          <button type="submit" className={`btn ${styles.submit}`} disabled={isVerifyingTwoFactor}>
            {isVerifyingTwoFactor ? t("auth.submitting") : t("auth.twoFactorSubmit")}
          </button>
        </form>
      </div>
    );
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
