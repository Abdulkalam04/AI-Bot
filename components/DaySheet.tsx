"use client";
import type { HTMLAttributes } from "react";
import { DoneIcon, RingIcon, TickIcon } from "./Icons";
import styles from "./DaySheet.module.css";

const IN_PROGRESS = [
  { t: "4 PM", title: "Q3 deck summary", sub: "Ready by 4" },
  { t: "6:30 PM", title: "Flights to Austin", sub: "Watching for under $300" },
];
const COMPLETED = [
  { t: "9:40 AM", title: "Replied to Sam", sub: "About Saturday" },
  { t: "11:15 AM", title: "Moved your 3 PM", sub: "Now Monday at 3" },
  { t: "9:15 PM", title: "Dinner at Cafe Lune", sub: "Booked" },
];

type Props = { grab: HTMLAttributes<HTMLDivElement>; interactive: boolean };

export default function DaySheet({ grab, interactive }: Props) {
  return (
    <div className={`${styles.sheet} ${interactive ? "" : styles.inert}`} role="dialog" aria-label="Saturday">
      {/* the top part is the drag handle: pull down to dismiss */}
      <div className={styles.grab} {...grab}>
        <div className={styles.bar} />
        <div className={styles.titleRow}>
          <h2>Saturday</h2>
          <span className={styles.date}>Nov 7</span>
        </div>
        <div className={styles.summary}>
          <span><RingIcon width={15} height={15} />{IN_PROGRESS.length} in progress</span>
          <span className={styles.muted}><DoneIcon width={15} height={15} />{COMPLETED.length} done</span>
        </div>
      </div>

      <div className={styles.list}>
        <p className={styles.label}>In progress</p>
        {IN_PROGRESS.map((r) => (
          <div key={r.title} className={styles.row}>
            <span className={styles.time}>{r.t}</span>
            <div><div className={styles.title}>{r.title}</div><div className={styles.sub}>{r.sub}</div></div>
            <RingIcon className={styles.end} width={17} height={17} />
          </div>
        ))}

        <p className={`${styles.label} ${styles.gap}`}>Completed</p>
        {COMPLETED.map((r) => (
          <div key={r.title} className={`${styles.row} ${styles.done}`}>
            <span className={styles.time}>{r.t}</span>
            <div><div className={styles.title}>{r.title}</div><div className={styles.sub}>{r.sub}</div></div>
            <TickIcon className={styles.end} width={16} height={16} />
          </div>
        ))}
      </div>
    </div>
  );
}
