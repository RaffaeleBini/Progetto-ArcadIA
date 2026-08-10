import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getApiErrorMessage } from "../api/client";
import styles from "./AuthForm.module.css";

export default function LoginPage() {
  const { login } = useAuth();
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
      setError(getApiErrorMessage(err, "Credenziali non valide"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      <form className={`panel ${styles.panel}`} onSubmit={handleSubmit}>
        <h1 className={styles.title}>Accedi</h1>

        {error && <p className="formError">{error}</p>}

        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className={`btn ${styles.submit}`} disabled={isSubmitting}>
          {isSubmitting ? "Attendere…" : "Accedi"}
        </button>

        <p className={styles.footer}>
          Non hai un account? <Link to="/register">Registrati</Link>
        </p>
      </form>
    </div>
  );
}
