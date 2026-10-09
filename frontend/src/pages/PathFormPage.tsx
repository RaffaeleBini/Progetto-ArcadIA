import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import { createPath, fetchPathForEdit, updatePath } from "../api/paths";
import { fetchCourses } from "../api/courses";
import { getApiErrorMessage } from "../api/client";
import Loading from "../components/Loading";
import ErrorMessage from "../components/ErrorMessage";
import LocalizedField from "../components/LocalizedField";
import type { Course } from "../types/course";
import type { LocalizedText, PathAdminStep } from "../types/path";
import styles from "./PathFormPage.module.css";

const EMPTY_TEXT: LocalizedText = { it: "", es: "" };

export default function PathFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [code, setCode] = useState("");
  const [title, setTitle] = useState<LocalizedText>(EMPTY_TEXT);
  const [description, setDescription] = useState<LocalizedText>(EMPTY_TEXT);
  const [audience, setAudience] = useState<LocalizedText>(EMPTY_TEXT);
  const [estimatedHours, setEstimatedHours] = useState("");
  const [estimatedWeeks, setEstimatedWeeks] = useState("");
  const [accessLevel, setAccessLevel] = useState<"free" | "premium">("premium");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [steps, setSteps] = useState<PathAdminStep[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const availableCourses = await fetchCourses();
      setCourses(availableCourses);

      if (id) {
        const path = await fetchPathForEdit(id);
        setCode(path.code);
        setTitle(path.title);
        setDescription(path.description);
        setAudience(path.audience);
        setEstimatedHours(path.estimatedHours != null ? String(path.estimatedHours) : "");
        setEstimatedWeeks(path.estimatedWeeks != null ? String(path.estimatedWeeks) : "");
        setAccessLevel(path.accessLevel);
        setStatus(path.status);
        setSteps(path.steps);
      } else if (availableCourses.length > 0) {
        setSteps([{ course: availableCourses[0].id, order: 1, optional: false, lessonFilter: [], note: null }]);
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

  function addStep() {
    const nextOrder = steps.length > 0 ? Math.max(...steps.map((s) => s.order)) + 1 : 1;
    setSteps((prev) => [
      ...prev,
      { course: courses[0]?.id ?? "", order: nextOrder, optional: false, lessonFilter: [], note: null },
    ]);
  }

  function updateStep(index: number, patch: Partial<PathAdminStep>) {
    setSteps((prev) => prev.map((step, i) => (i === index ? { ...step, ...patch } : step)));
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
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
        audience,
        estimatedHours: estimatedHours ? Number(estimatedHours) : null,
        estimatedWeeks: estimatedWeeks ? Number(estimatedWeeks) : null,
        accessLevel,
        status,
        steps,
      };
      const path = isEditMode && id ? await updatePath(id, input) : await createPath(input);
      navigate(`/paths/${path.id}`);
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
        <h1 className={styles.title}>{isEditMode ? t("paths.editPath") : t("paths.newPath")}</h1>

        {error && <p className="formError">{error}</p>}

        <div className="field">
          <label htmlFor="code">{t("courses.code")}</label>
          <input id="code" type="text" value={code} onChange={(e) => setCode(e.target.value)} required />
        </div>

        <LocalizedField id="title" label={t("paths.pathTitle")} value={title} onChange={setTitle} required />
        <LocalizedField
          id="description"
          label={t("courses.description")}
          value={description}
          onChange={setDescription}
          multiline
          required
        />
        <LocalizedField id="audience" label={t("paths.audience")} value={audience} onChange={setAudience} multiline />

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
          <label htmlFor="estimatedWeeks">{t("paths.estimatedWeeks")}</label>
          <input
            id="estimatedWeeks"
            type="number"
            min={0}
            value={estimatedWeeks}
            onChange={(e) => setEstimatedWeeks(e.target.value)}
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
          <label>{t("paths.steps")}</label>
          <div className={styles.stepsList}>
            {steps.map((step, index) => (
              <div key={index} className={styles.stepRow}>
                <select value={step.course} onChange={(e) => updateStep(index, { course: e.target.value })}>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title} ({course.code})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  value={step.order}
                  onChange={(e) => updateStep(index, { order: Number(e.target.value) })}
                />
                <label className={styles.optionalLabel}>
                  <input
                    type="checkbox"
                    checked={step.optional}
                    onChange={(e) => updateStep(index, { optional: e.target.checked })}
                  />
                  {t("paths.optional")}
                </label>
                <input
                  type="text"
                  placeholder={t("paths.stepNotePlaceholder")}
                  value={step.note ?? ""}
                  onChange={(e) => updateStep(index, { note: e.target.value || null })}
                />
                <button type="button" className={styles.removeBtn} onClick={() => removeStep(index)}>
                  <Trash2 size={14} strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="btn" onClick={addStep} disabled={courses.length === 0}>
            <Plus size={16} strokeWidth={1.5} />
            {t("paths.addStep")}
          </button>
        </div>

        <button type="submit" className="btn" disabled={isSubmitting || steps.length === 0}>
          {isSubmitting ? t("courses.saving") : t("courses.save")}
        </button>
      </form>
    </div>
  );
}
