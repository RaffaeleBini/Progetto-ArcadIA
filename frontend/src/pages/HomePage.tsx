import { Link } from "react-router-dom";
import { Rocket } from "lucide-react";
import logo from "../assets/rb-logo.png";
import styles from "./HomePage.module.css";

export default function HomePage() {
  return (
    <main className={styles.home}>
      <img className={styles.logo} src={logo} alt="Simbolo RB" />
      <h1 className={styles.title}>ArcadIA</h1>
      <p className={styles.subtitle}>
        Piattaforma di formazione online sull'Intelligenza Artificiale.
      </p>
      <Link to="/register" className="btn">
        <Rocket size={18} strokeWidth={1.5} />
        Inizia
      </Link>
    </main>
  );
}
