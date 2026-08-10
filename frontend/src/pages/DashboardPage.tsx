import { useAuth } from "../context/AuthContext";
import styles from "./DashboardPage.module.css";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <main className={styles.dashboard}>
      <h1 className={styles.title}>Benvenuto, {user?.name}</h1>
      <p>
        Plancia di comando in costruzione — corsi, avanzamento e bacheca
        arriveranno nelle prossime fasi di sviluppo.
      </p>
    </main>
  );
}
