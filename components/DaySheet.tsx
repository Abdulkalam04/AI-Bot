"use client";
import { useState, type HTMLAttributes } from "react";
import { DoneIcon, RingIcon, TickIcon, TrashIcon } from "./Icons";
import type { DayItem } from "@/lib/tasks";
import styles from "./DaySheet.module.css";

type Props = {
  grab: HTMLAttributes<HTMLDivElement>;
  interactive: boolean;
  items: DayItem[];
  onToggle: (id: string) => void;
  onDelete?: (id: string) => void;
  onAdd?: (title: string, time?: string) => void;
};

function compareTasks(a: DayItem, b: DayItem): number {
  if (a.time && b.time) {
    const timeA = new Date(a.time).getTime();
    const timeB = new Date(b.time).getTime();
    if (!isNaN(timeA) && !isNaN(timeB)) return timeA - timeB;
  }
  if (a.time && !b.time) return -1;
  if (!a.time && b.time) return 1;
  return a.createdAt - b.createdAt;
}

function formatTaskTime(iso?: string): string {
  if (!iso) return "";
  try {
    const date = new Date(iso);
    if (isNaN(date.getTime())) return "";
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    const timeStr = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    if (isToday) return timeStr;
    if (isTomorrow) return `Tmr ${timeStr}`;
    return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} ${timeStr}`;
  } catch {
    return "";
  }
}

export default function DaySheet({ grab, interactive, items, onToggle, onDelete, onAdd }: Props) {
  const [newTitle, setNewTitle] = useState("");

  const inProgress = items.filter((i) => i.status === "in_progress").sort(compareTasks);
  const completed = items.filter((i) => i.status === "done").sort(compareTasks);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    onAdd?.(trimmed);
    setNewTitle("");
  };

  return (
    <div className={`${styles.sheet} ${interactive ? "" : styles.inert}`} role="dialog" aria-label="My day">
      {/* the top part is the drag handle: pull down to dismiss */}
      <div className={styles.grab} {...grab}>
        <div className={styles.bar} />
        <div className={styles.titleRow}>
          <h2>My day</h2>
        </div>
        <div className={styles.summary}>
          <span>
            <RingIcon width={15} height={15} />
            {inProgress.length} in progress
          </span>
          <span className={styles.muted}>
            <DoneIcon width={15} height={15} />
            {completed.length} done
          </span>
        </div>
      </div>

      <div className={styles.list}>
        {inProgress.length > 0 && <p className={styles.label}>In progress</p>}
        {inProgress.map((r) => (
          <div key={r.id} className={styles.row}>
            <span className={styles.time}>{formatTaskTime(r.time)}</span>
            <div className={styles.textWrap}>
              <div className={styles.title}>{r.title}</div>
              {r.note && <div className={styles.sub}>{r.note}</div>}
            </div>
            <div className={styles.actions}>
              {onDelete && (
                <button
                  type="button"
                  className={styles.deleteBtn}
                  aria-label="Delete item"
                  onClick={() => onDelete(r.id)}
                >
                  <TrashIcon width={14} height={14} />
                </button>
              )}
              <button
                type="button"
                className={styles.iconBtn}
                aria-label="Mark done"
                onClick={() => onToggle(r.id)}
              >
                <RingIcon className={styles.end} width={17} height={17} />
              </button>
            </div>
          </div>
        ))}

        {completed.length > 0 && <p className={`${styles.label} ${styles.gap}`}>Completed</p>}
        {completed.map((r) => (
          <div key={r.id} className={`${styles.row} ${styles.done}`}>
            <span className={styles.time}>{formatTaskTime(r.time)}</span>
            <div className={styles.textWrap}>
              <div className={styles.title}>{r.title}</div>
              {r.note && <div className={styles.sub}>{r.note}</div>}
            </div>
            <div className={styles.actions}>
              {onDelete && (
                <button
                  type="button"
                  className={styles.deleteBtn}
                  aria-label="Delete item"
                  onClick={() => onDelete(r.id)}
                >
                  <TrashIcon width={14} height={14} />
                </button>
              )}
              <button
                type="button"
                className={styles.iconBtn}
                aria-label="Mark in progress"
                onClick={() => onToggle(r.id)}
              >
                <TickIcon className={styles.end} width={16} height={16} />
              </button>
            </div>
          </div>
        ))}

        {inProgress.length === 0 && completed.length === 0 && (
          <p className={styles.empty}>Nothing here yet.</p>
        )}
      </div>

      <form className={styles.addForm} onSubmit={handleAddSubmit}>
        <input
          type="text"
          className={styles.addInput}
          placeholder="Add to My day..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
        <button type="submit" className={styles.addBtn} disabled={!newTitle.trim()}>
          Add
        </button>
      </form>
    </div>
  );
}
