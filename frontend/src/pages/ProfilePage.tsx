import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { updateProfile, uploadAvatar } from "../api/users";
import { getApiErrorMessage } from "../api/client";
import styles from "./ProfilePage.module.css";

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [preferredLanguage, setPreferredLanguage] = useState<"it" | "es">(user?.preferredLanguage ?? "it");
  const [theme, setTheme] = useState<"light" | "dark">(user?.theme ?? "light");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  if (!user) {
    return null;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);
    try {
      const updated = await updateProfile({ name, bio, preferredLanguage, theme });
      setUser(updated);
      setSuccess(true);
    } catch (err) {
      setError(getApiErrorMessage(err, "Aggiornamento profilo non riuscito"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setAvatarError(null);
    setIsUploadingAvatar(true);
    try {
      const updated = await uploadAvatar(file);
      setUser(updated);
    } catch (err) {
      setAvatarError(getApiErrorMessage(err, "Upload avatar non riuscito"));
    } finally {
      setIsUploadingAvatar(false);
      event.target.value = "";
    }
  }

  return (
    <div className={styles.page}>
      <form className={`panel ${styles.panel}`} onSubmit={handleSubmit}>
        <h1 className={styles.title}>Il mio profilo</h1>

        <div className={styles.avatarRow}>
          {user.avatarUrl ? (
            <img className={styles.avatar} src={user.avatarUrl} alt="Avatar" />
          ) : (
            <div className={styles.avatar} />
          )}
          <div className={styles.avatarActions}>
            <button
              type="button"
              className="btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
            >
              {isUploadingAvatar ? "Caricamento…" : "Cambia avatar"}
            </button>
            <p className={styles.hint}>PNG, JPEG o WEBP, max 5MB</p>
            {avatarError && <p className="formError">{avatarError}</p>}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={handleAvatarChange}
          />
        </div>

        {error && <p className="formError">{error}</p>}
        {success && <p className={styles.formSuccess}>Profilo aggiornato</p>}

        <div className="field">
          <label htmlFor="name">Nome</label>
          <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div className="field">
          <label htmlFor="bio">Bio</label>
          <textarea id="bio" maxLength={500} value={bio ?? ""} onChange={(e) => setBio(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="preferredLanguage">Lingua</label>
          <select
            id="preferredLanguage"
            value={preferredLanguage}
            onChange={(e) => setPreferredLanguage(e.target.value as "it" | "es")}
          >
            <option value="it">Italiano</option>
            <option value="es">Español</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="theme">Tema</label>
          <select id="theme" value={theme} onChange={(e) => setTheme(e.target.value as "light" | "dark")}>
            <option value="dark">Scuro</option>
            <option value="light">Chiaro</option>
          </select>
        </div>

        <button type="submit" className="btn" disabled={isSubmitting}>
          {isSubmitting ? "Salvataggio…" : "Salva modifiche"}
        </button>
      </form>
    </div>
  );
}
