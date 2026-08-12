import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { createCourse, fetchCourse, updateCourse } from "../api/courses";
import { getApiErrorMessage } from "../api/client";
import styles from "./CourseFormPage.module.css";

export default function CourseFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [accessLevel, setAccessLevel] = useState<"free" | "premium">("free");
  const [cover, setCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditMode);

  useEffect(() => {
    if (!id) return;
    fetchCourse(id).then((course) => {
      setTitle(course.title);
      setDescription(course.description);
      setAccessLevel(course.accessLevel);
      setCoverPreview(course.coverImageUrl);
      setIsLoading(false);
    });
  }, [id]);

  function handleCoverChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setCover(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const input = { title, description, accessLevel, cover };
      const course = isEditMode && id ? await updateCourse(id, input) : await createCourse(input);
      navigate(`/courses/${course.id}`);
    } catch (err) {
      setError(getApiErrorMessage(err, t("courses.saveError")));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return null;
  }

  return (
    <div className={styles.page}>
      <form className={`panel ${styles.panel}`} onSubmit={handleSubmit}>
        <h1 className={styles.title}>{isEditMode ? t("courses.editCourse") : t("courses.newCourse")}</h1>

        {error && <p className="formError">{error}</p>}

        {coverPreview && <img className={styles.coverPreview} src={coverPreview} alt="" />}

        <div className="field">
          <label htmlFor="cover">{t("courses.cover")}</label>
          <input
            ref={fileInputRef}
            id="cover"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleCoverChange}
          />
        </div>

        <div className="field">
          <label htmlFor="title">{t("courses.courseTitle")}</label>
          <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>

        <div className="field">
          <label htmlFor="description">{t("courses.description")}</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="accessLevel">{t("courses.accessLevel")}</label>
          <select
            id="accessLevel"
            value={accessLevel}
            onChange={(e) => setAccessLevel(e.target.value as "free" | "premium")}
          >
            <option value="free">{t("courses.free")}</option>
            <option value="premium">{t("courses.premium")}</option>
          </select>
        </div>

        <button type="submit" className="btn" disabled={isSubmitting}>
          {isSubmitting ? t("courses.saving") : t("courses.save")}
        </button>
      </form>
    </div>
  );
}
