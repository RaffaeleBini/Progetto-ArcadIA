import styles from "./ProgressBar.module.css";

export default function ProgressBar({ percentage }: { percentage: number }) {
  return (
    <div
      className={styles.track}
      role="progressbar"
      aria-valuenow={percentage}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={styles.fill} style={{ width: `${percentage}%` }} />
    </div>
  );
}
