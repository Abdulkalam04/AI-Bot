"use client";
import styles from "./Splash.module.css";

// [left %, height px] – uneven drips like the recording
const DRIPS: [number, number][] = [
  [2, 22], [9, 36], [15, 16], [22, 44], [29, 24], [36, 12], [42, 38], [49, 20],
  [55, 46], [62, 18], [68, 34], [75, 14], [81, 42], [88, 26], [94, 32],
];

export default function Splash({ onDone }: { onDone: () => void }) {
  return (
    <div
      className={styles.splash}
      onAnimationEnd={(e) => {
        if (e.animationName === styles.lift) onDone();
      }}
    >
      <div className={styles.fill}>
        <div className={styles.eyes}>
          <i />
          <i />
        </div>
      </div>
      <div className={styles.drips} aria-hidden>
        <div className={styles.edge} />
        {DRIPS.map(([left, h], i) => (
          <span key={i} style={{ left: `${left}%`, height: h, animationDelay: `${2.55 + i * 0.012}s` }} />
        ))}
      </div>
    </div>
  );
}
