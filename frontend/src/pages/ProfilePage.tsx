import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { usePreferences } from "../context/PreferencesContext";
import { changePassword, updateProfile, uploadAvatar } from "../api/users";
import { confirmTwoFactorSetupRequest, disableTwoFactorRequest, setupTwoFactorRequest } from "../api/auth";
import { getApiErrorMessage } from "../api/client";
import type { User } from "../types/user";
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

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

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

  async function handlePasswordSubmit(event: FormEvent) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);
    setIsChangingPassword(true);
    try {
      const updated = await changePassword(currentPassword, newPassword);
      setUser(updated);
      setCurrentPassword("");
      setNewPassword("");
      setPasswordSuccess(true);
    } catch (err) {
      setPasswordError(getApiErrorMessage(err, t("profile.passwordChangeError")));
    } finally {
      setIsChangingPassword(false);
    }
  }

  return (
    <div className={styles.page}>
      <form className={`panel hudCorners ${styles.panel}`} onSubmit={handleSubmit}>
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

      <form className={`panel hudCorners ${styles.panel}`} onSubmit={handlePasswordSubmit}>
        <h1 className={styles.title}>{t("profile.passwordTitle")}</h1>

        {passwordError && <p className="formError">{passwordError}</p>}
        {passwordSuccess && <p className={styles.formSuccess}>{t("profile.passwordChanged")}</p>}

        <div className="field">
          <label htmlFor="currentPassword">{t("profile.currentPassword")}</label>
          <input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="newPassword">{t("profile.newPassword")}</label>
          <input
            id="newPassword"
            type="password"
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="btn" disabled={isChangingPassword}>
          {isChangingPassword ? t("profile.changingPassword") : t("profile.changePassword")}
        </button>
      </form>

      {user.role === "admin" && <TwoFactorSettings user={user} setUser={setUser} />}
    </div>
  );
}

function TwoFactorSettings({ user, setUser }: { user: User; setUser: (user: User) => void }) {
  const { t } = useTranslation();

  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [manualSecret, setManualSecret] = useState<string | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [isStartingSetup, setIsStartingSetup] = useState(false);

  const [confirmCode, setConfirmCode] = useState("");
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);

  const [disablePassword, setDisablePassword] = useState("");
  const [disableError, setDisableError] = useState<string | null>(null);
  const [disableSuccess, setDisableSuccess] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);

  async function handleStartSetup() {
    setSetupError(null);
    setIsStartingSetup(true);
    try {
      const { qrCodeDataUrl: qr, secret } = await setupTwoFactorRequest();
      setQrCodeDataUrl(qr);
      setManualSecret(secret);
    } catch (err) {
      setSetupError(getApiErrorMessage(err, t("profile.twoFactorSetupError")));
    } finally {
      setIsStartingSetup(false);
    }
  }

  async function handleConfirmSetup(event: FormEvent) {
    event.preventDefault();
    setConfirmError(null);
    setIsConfirming(true);
    try {
      const { backupCodes: codes } = await confirmTwoFactorSetupRequest(confirmCode);
      setBackupCodes(codes);
      setUser({ ...user, twoFactorEnabled: true });
    } catch (err) {
      setConfirmError(getApiErrorMessage(err, t("profile.twoFactorConfirmError")));
    } finally {
      setIsConfirming(false);
    }
  }

  function handleBackupCodesAcknowledged() {
    setBackupCodes(null);
    setQrCodeDataUrl(null);
    setManualSecret(null);
    setConfirmCode("");
  }

  async function handleDisable(event: FormEvent) {
    event.preventDefault();
    setDisableError(null);
    setDisableSuccess(false);
    setIsDisabling(true);
    try {
      await disableTwoFactorRequest(disablePassword);
      setUser({ ...user, twoFactorEnabled: false });
      setDisablePassword("");
      setDisableSuccess(true);
    } catch (err) {
      setDisableError(getApiErrorMessage(err, t("profile.twoFactorDisableError")));
    } finally {
      setIsDisabling(false);
    }
  }

  if (backupCodes) {
    return (
      <div className={`panel hudCorners ${styles.panel}`}>
        <h1 className={styles.title}>{t("profile.twoFactorBackupCodesTitle")}</h1>
        <p className={styles.hint}>{t("profile.twoFactorBackupCodesHint")}</p>
        <ul className={styles.backupCodes}>
          {backupCodes.map((code) => (
            <li key={code}>{code}</li>
          ))}
        </ul>
        <button type="button" className="btn" onClick={handleBackupCodesAcknowledged}>
          {t("profile.twoFactorBackupCodesDone")}
        </button>
      </div>
    );
  }

  if (user.twoFactorEnabled) {
    return (
      <form className={`panel hudCorners ${styles.panel}`} onSubmit={handleDisable}>
        <h1 className={styles.title}>{t("profile.twoFactorTitle")}</h1>
        <p className={styles.formSuccess}>{t("profile.twoFactorEnabledStatus")}</p>

        {disableError && <p className="formError">{disableError}</p>}
        {disableSuccess && <p className={styles.formSuccess}>{t("profile.twoFactorDisabled")}</p>}

        <p className={styles.hint}>{t("profile.twoFactorDisableHint")}</p>

        <div className="field">
          <label htmlFor="disablePassword">{t("profile.currentPassword")}</label>
          <input
            id="disablePassword"
            type="password"
            value={disablePassword}
            onChange={(e) => setDisablePassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="btn" disabled={isDisabling}>
          {isDisabling ? t("profile.twoFactorDisabling") : t("profile.twoFactorDisable")}
        </button>
      </form>
    );
  }

  if (qrCodeDataUrl && manualSecret) {
    return (
      <form className={`panel hudCorners ${styles.panel}`} onSubmit={handleConfirmSetup}>
        <h1 className={styles.title}>{t("profile.twoFactorTitle")}</h1>

        {confirmError && <p className="formError">{confirmError}</p>}

        <p className={styles.hint}>{t("profile.twoFactorScanHint")}</p>
        <img className={styles.qrCode} src={qrCodeDataUrl} alt="QR code 2FA" />
        <span className={styles.manualSecret}>
          {t("profile.twoFactorManualEntry")}: {manualSecret}
        </span>

        <div className="field">
          <label htmlFor="confirmCode">{t("profile.twoFactorConfirmCode")}</label>
          <input
            id="confirmCode"
            type="text"
            autoComplete="one-time-code"
            value={confirmCode}
            onChange={(e) => setConfirmCode(e.target.value)}
            required
            autoFocus
          />
        </div>

        <button type="submit" className="btn" disabled={isConfirming}>
          {isConfirming ? t("profile.twoFactorConfirming") : t("profile.twoFactorConfirm")}
        </button>
      </form>
    );
  }

  return (
    <div className={`panel hudCorners ${styles.panel}`}>
      <h1 className={styles.title}>{t("profile.twoFactorTitle")}</h1>
      {setupError && <p className="formError">{setupError}</p>}
      <p className={styles.hint}>{t("profile.twoFactorDisabledHint")}</p>
      <button type="button" className="btn" onClick={handleStartSetup} disabled={isStartingSetup}>
        {isStartingSetup ? t("profile.twoFactorSettingUp") : t("profile.twoFactorEnable")}
      </button>
    </div>
  );
}
