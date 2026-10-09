import type { LocalizedText } from "../types/course";
import styles from "./LocalizedField.module.css";

interface LocalizedFieldProps {
  id: string;
  label: string;
  value: LocalizedText;
  onChange: (next: LocalizedText) => void;
  multiline?: boolean;
  large?: boolean;
  required?: boolean;
  type?: string;
}

export default function LocalizedField({
  id,
  label,
  value,
  onChange,
  multiline = false,
  large = false,
  required = false,
  type = "text",
}: LocalizedFieldProps) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className={styles.row}>
        {(["it", "es"] as const).map((lang) => (
          <div key={lang} className={large ? `${styles.col} ${styles.colLarge}` : styles.col}>
            <span className={styles.langTag}>{lang.toUpperCase()}</span>
            {multiline ? (
              <textarea
                id={`${id}-${lang}`}
                value={value[lang]}
                onChange={(e) => onChange({ ...value, [lang]: e.target.value })}
                required={required && lang === "it"}
              />
            ) : (
              <input
                id={`${id}-${lang}`}
                type={type}
                value={value[lang]}
                onChange={(e) => onChange({ ...value, [lang]: e.target.value })}
                required={required && lang === "it"}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
