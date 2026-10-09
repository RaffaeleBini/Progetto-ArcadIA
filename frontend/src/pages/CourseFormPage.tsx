import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  createCourse,
  fetchCourseForEdit,
  fetchCourses,
  updateCourse,
  uploadCourseCover,
} from "../api/courses";
import { getApiErrorMessage } from "../api/client";
import Loading from "../components/Loading";
import ErrorMessage from "../components/ErrorMessage";
import LocalizedField from "../components/LocalizedField";
import type { Course, LocalizedText } from "../types/course";
import styles from "./CourseFormPage.module.css";

const EMPTY_TEXT: LocalizedText = { it: "", es: "" };

export default function CourseFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [code, setCode] = useState("");
  const [title, setTitle] = useState<LocalizedText>(EMPTY_TEXT);
  const [description, setDescription] = useState<LocalizedText>(EMPTY_TEXT);
  const [block, setBlock] = useState("");
  const [accessLevel, setAccessLevel] = useState<"free" | "premium">("free");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [catalogOrder, setCatalogOrder] = useState(1);
  const [prerequisites, setPrerequisites] = useState<string[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [cover, setCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const courses = await fetchCourses();
      setAllCourses(id ? courses.filter((c) => c.id !== id) : courses);

      if (id) {
        const course = await fetchCourseForEdit(id);
        setCode(course.code);
        setTitle(course.title);
        setDescription(course.description);
        setBlock(course.block ?? "");
        setAccessLevel(course.accessLevel);
        setStatus(course.status);
        setEstimatedHours(course.estimatedHours != null ? String(course.estimatedHours) : "");
        setCatalogOrder(course.catalogOrder);
        setPrerequisites(course.prerequisites.map((p) => p.course));
        setCoverPreview(course.coverImageUrl);
      }
    } catch (err) {
      setLoadError(getApiErrorMessage(err, t("common.loadError")));
    } finally {
      setIsLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    load();
  }, [load]);

  function handleCoverChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setCover(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  function togglePrerequisite(courseId: string) {
    setPrerequisites((prev) =>
      prev.includes(courseId) ? prev.filter((c) => c !== courseId) : [...prev, courseId]
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const input = {
        code,
        title,
        description,
        block,
        accessLevel,
        status,
        estimatedHours: estimatedHours ? Number(estimatedHours) : null,
        catalogOrder,
        prerequisites: prerequisites.map((courseId) => ({ course: courseId })),
      };
      let course = isEditMode && id ? await updateCourse(id, input) : await createCourse(input);
      if (cover) {
        course = await uploadCourseCover(course.id, cover);
      }
      navigate(`/courses/${course.id}`);
    } catch (err) {
      setError(getApiErrorMessage(err, t("courses.saveError")));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <Loading />;
  }

  if (loadError) {
    return <ErrorMessage message={loadError} onRetry={load} />;
  }

  return (
    <div className={styles.page}>
      <form className={`panel hudCorners ${styles.panel}`} onSubmit={handleSubmit}>
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
          <label htmlFor="code">{t("courses.code")}</label>
          <input id="code" type="text" value={code} onChange={(e) => setCode(e.target.value)} required />
        </div>

        <LocalizedField
          id="title"
          label={t("courses.courseTitle")}
          value={title}
          onChange={setTitle}
          required
        />

        <LocalizedField
          id="description"
          label={t("courses.description")}
          value={description}
          onChange={setDescription}
          multiline
          required
        />

        <div className="field">
          <label htmlFor="block">{t("courses.block")}</label>
          <input id="block" type="text" value={block} onChange={(e) => setBlock(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="estimatedHours">{t("courses.estimatedHours")}</label>
          <input
            id="estimatedHours"
            type="number"
            min={0}
            value={estimatedHours}
            onChange={(e) => setEstimatedHours(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="catalogOrder">{t("courses.catalogOrder")}</label>
          <input
            id="catalogOrder"
            type="number"
            min={0}
            value={catalogOrder}
            onChange={(e) => setCatalogOrder(Number(e.target.value))}
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

        <div className="field">
          <label htmlFor="status">{t("courses.status")}</label>
          <select id="status" value={status} onChange={(e) => setStatus(e.target.value as "draft" | "published")}>
            <option value="draft">{t("courses.draft")}</option>
            <option value="published">{t("courses.published")}</option>
          </select>
        </div>

        <div className="field">
          <label>{t("courses.prerequisites")}</label>
          <div className={styles.prerequisitesList}>
            {allCourses.map((course) => (
              <label key={course.id} className={styles.prerequisiteItem}>
                <input
                  type="checkbox"
                  checked={prerequisites.includes(course.id)}
                  onChange={() => togglePrerequisite(course.id)}
                />
                {course.title} ({course.code})
              </label>
            ))}
          </div>
        </div>

        <button type="submit" className="btn" disabled={isSubmitting}>
          {isSubmitting ? t("courses.saving") : t("courses.save")}
        </button>
      </form>
    </div>
  );
}
