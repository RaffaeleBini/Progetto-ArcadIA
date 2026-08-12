import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { usePreferences } from "../context/PreferencesContext";
import { updateProfile, uploadAvatar } from "../api/users";
import { getApiErrorMessage } from "../api/client";
import styles from "./ProfilePage.module.css";

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const { language, theme, setLanguage, setTheme } = usePreferences();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");

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
      const updated = await updateProfile({ name, bio, preferredLanguage: language, theme });
      setUser(updated);
      setSuccess(true);
    } catch (err) {
      setError(getApiErrorMessage(err, t("profile.updateError")));
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
      setAvatarError(getApiErrorMessage(err, t("profile.avatarError")));
    } finally {
      setIsUploadingAvatar(false);
      event.target.value = "";
    }
  }

  return (
    <div className={styles.page}>
      <form className={`panel ${styles.panel}`} onSubmit={handleSubmit}>
        <h1 className={styles.title}>{t("profile.title")}</h1>

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
              {isUploadingAvatar ? t("profile.uploading") : t("profile.changeAvatar")}
            </button>
            <p className={styles.hint}>{t("profile.avatarHint")}</p>
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
        {success && <p className={styles.formSuccess}>{t("profile.updated")}</p>}

        <div className="field">
          <label htmlFor="name">{t("profile.name")}</label>
          <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div className="field">
          <label htmlFor="bio">{t("profile.bio")}</label>
          <textarea id="bio" maxLength={500} value={bio ?? ""} onChange={(e) => setBio(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="preferredLanguage">{t("profile.language")}</label>
          <select
            id="preferredLanguage"
            value={language}
            onChange={(e) => setLanguage(e.target.value as "it" | "es")}
          >
            <option value="it">Italiano</option>
            <option value="es">Español</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="theme">{t("profile.theme")}</label>
          <select id="theme" value={theme} onChange={(e) => setTheme(e.target.value as "light" | "dark")}>
            <option value="dark">{t("profile.themeDark")}</option>
            <option value="light">{t("profile.themeLight")}</option>
          </select>
        </div>

        <button type="submit" className="btn" disabled={isSubmitting}>
          {isSubmitting ? t("profile.saving") : t("profile.save")}
        </button>
      </form>
    </div>
  );
}
