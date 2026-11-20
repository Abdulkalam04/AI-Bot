import type { CSSProperties } from "react";
import styles from "./Mascot.module.css";

export type MascotMood = "idle" | "happy"; // happy = ^ ^ eyes (shown while being pulled down)

type Props = {
  size?: number;          // width in px; everything else scales from this
  mood?: MascotMood;
  morph?: boolean;        // organic wobble. Defaults to on for big sizes, off for the small one
  squashX?: number;       // 1 = normal. Step 4 drives these while dragging
  squashY?: number;
  className?: string;
};

export default function Mascot({
  size = 36,
  mood = "idle",
  morph,
  squashX = 1,
  squashY = 1,
  className = "",
}: Props) {
  const big = size >= 80;
  const morphing = morph ?? big;

  const style = {
    width: size,
    height: size * (big ? 1 : 0.88),
    fontSize: size, // children use em, so the whole thing scales with `size`
    "--sx": squashX,
    "--sy": squashY,
  } as CSSProperties;

  return (
    <div className={`${styles.wrap} ${className}`} style={style} data-mood={mood}>
      <div className={`${styles.blob} ${morphing ? styles.morph : ""}`}>
        <div className={styles.eyes}>
          <span className={styles.pills}><i /><i /></span>
          <span className={styles.arcs}><b /><b /></span>
        </div>
        <span className={styles.shine} />
      </div>
    </div>
  );
}
