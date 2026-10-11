import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Award,
  BookOpenText,
  Check,
  ClipboardCheck,
  FileCode2,
  FlaskConical,
  PlayCircle,
  Rocket,
  Route,
} from "lucide-react";
import logo from "../assets/rb-logo.png";
import certificatePreview from "../assets/certificate-preview.png";
import { useSeo } from "../hooks/useSeo";
import SpaceWindow from "../components/SpaceWindow";
import styles from "./HomePage.module.css";

const HOW_STEPS = [
  { key: "step1", Icon: Route },
  { key: "step2", Icon: BookOpenText },
  { key: "step3", Icon: ClipboardCheck },
  { key: "step4", Icon: Award },
] as const;

const LESSON_MATERIALS = [
  { key: "video", Icon: PlayCircle },
  { key: "theory", Icon: BookOpenText },
  { key: "notebook", Icon: FileCode2 },
  { key: "exercises", Icon: FlaskConical },
] as const;

const AUDIENCES = ["beginner", "coders", "advanced"] as const;

export default function HomePage() {
  const { t } = useTranslation();
  useSeo({ title: t("seo.home.title"), description: t("seo.home.description") });

  return (
    <main className={styles.home}>
      <section className={styles.hero}>
        <SpaceWindow />
        <div className={`hudCorners ${styles.frame}`}>
          <img className={styles.logo} src={logo} alt="Simbolo RB" />
          <h1 className={styles.title}>ArcadIA</h1>
          <p className={styles.subtitle}>{t("home.tagline")}</p>
          <Link to="/register" className="btn">
            <Rocket size={18} strokeWidth={1.5} />
            {t("home.cta")}
          </Link>
        </div>
      </section>

      <div className={styles.content}>
        <p className={styles.intro}>{t("home.intro")}</p>

        <section className={`${styles.section} ${styles.whatIs}`} aria-labelledby="home-what">
          <div>
            <h2 id="home-what" className={styles.sectionTitle}>{t("home.whatIs.title")}</h2>
            <p className={styles.lead}>{t("home.whatIs.text")}</p>
          </div>
          <ul className={styles.points}>
            {(["point1", "point2", "point3"] as const).map((k) => (
              <li key={k}>
                <Check size={16} strokeWidth={1.5} /> {t(`home.whatIs.${k}`)}
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.section} aria-labelledby="home-how">
          <h2 id="home-how" className={styles.sectionTitle}>{t("home.how.title")}</h2>
          <ol className={styles.steps}>
            {HOW_STEPS.map(({ key, Icon }, i) => (
              <li key={key} className={`panel ${styles.step}`}>
                <span className={styles.stepNumber}>{i + 1}</span>
                <Icon size={22} strokeWidth={1.5} aria-hidden="true" />
                <h3 className={styles.cardTitle}>{t(`home.how.${key}Title`)}</h3>
                <p>{t(`home.how.${key}Text`)}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.section} aria-labelledby="home-lesson">
          <h2 id="home-lesson" className={styles.sectionTitle}>{t("home.lesson.title")}</h2>
          <ul className={styles.cards}>
            {LESSON_MATERIALS.map(({ key, Icon }) => (
              <li key={key} className={`panel ${styles.card}`}>
                <Icon size={22} strokeWidth={1.5} aria-hidden="true" />
                <h3 className={styles.cardTitle}>{t(`home.lesson.${key}Title`)}</h3>
                <p>{t(`home.lesson.${key}Text`)}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className={`${styles.section} ${styles.certificate}`} aria-labelledby="home-cert">
          <div>
            <h2 id="home-cert" className={styles.sectionTitle}>{t("home.certificate.title")}</h2>
            <p className={styles.lead}>{t("home.certificate.text")}</p>
          </div>
          <img
            className={styles.certificateImage}
            src={certificatePreview}
            alt={t("home.certificate.alt")}
            width={900}
            height={636}
            loading="lazy"
          />
        </section>

        <section className={styles.section} aria-labelledby="home-audience">
          <h2 id="home-audience" className={styles.sectionTitle}>{t("home.audience.title")}</h2>
          <ul className={styles.cards}>
            {AUDIENCES.map((key) => (
              <li key={key} className={`panel ${styles.card}`}>
                <h3 className={styles.cardTitle}>{t(`home.audience.${key}Title`)}</h3>
                <p>{t(`home.audience.${key}Text`)}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className={`hudCorners ${styles.final}`} aria-labelledby="home-final">
          <h2 id="home-final" className={styles.sectionTitle}>{t("home.final.title")}</h2>
          <p className={styles.lead}>{t("home.final.text")}</p>
          <Link to="/register" className="btn">
            <Rocket size={18} strokeWidth={1.5} />
            {t("home.cta")}
          </Link>
        </section>
      </div>
    </main>
  );
}
