import { Link, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import logo from "../assets/rb-logo.png";
import { useAuth } from "../context/AuthContext";
import styles from "./Header.module.css";

export default function Header() {
  const { user, logout } = useAuth();
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

      <div className={styles.actions}>
        {user ? (
          <>
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
              Esci
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className={styles.link}>
              Accedi
            </Link>
            <Link to="/register" className={styles.link}>
              Registrati
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
