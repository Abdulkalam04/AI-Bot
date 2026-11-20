"use client";
import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import styles from "./ContextPopover.module.css";
import { STRINGS } from "@/lib/strings";

export type ContextValue = { label: string; iso: string };

const OPTIONS: ContextValue[] = [
  { label: STRINGS.today, iso: "today" },
  { label: STRINGS.tomorrow, iso: "tomorrow" },
  { label: STRINGS.thisWeekend, iso: "weekend" },
  { label: STRINGS.nextWeek, iso: "next-week" },
];

type Props = {
  open: boolean;
  value: ContextValue;
  anchorRef: RefObject<HTMLButtonElement | null>;
  onSelect: (value: ContextValue) => void;
  onClose: () => void;
};

export default function ContextPopover({ open, value, anchorRef, onSelect, onClose }: Props) {
  const [pickDate, setPickDate] = useState(false);
  const [active, setActive] = useState(0);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setPickDate(false);
    setActive(Math.max(0, OPTIONS.findIndex((item) => item.label === value.label)));
    panel.current?.querySelector<HTMLButtonElement>('[role="option"]')?.focus();

    const onOutside = (event: PointerEvent) => {
      if (!panel.current?.contains(event.target as Node) && !anchorRef.current?.contains(event.target as Node)) onClose();
    };
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        anchorRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, value.label, anchorRef, onClose]);

  if (!open) return null;

  const move = (direction: number) => {
    const next = (active + direction + OPTIONS.length + 1) % (OPTIONS.length + 1);
    setActive(next);
    const buttons = panel.current?.querySelectorAll<HTMLButtonElement>('[role="option"]');
    buttons?.[next]?.focus();
  };

  const onPanelKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      move(event.key === "ArrowDown" ? 1 : -1);
    }
  };

  const selectDate = (iso: string) => {
    if (!iso) return;
    const date = new Date(`${iso}T12:00:00`);
    const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    onSelect({ label, iso });
  };

  return (
    <div ref={panel} className={styles.popover} role="listbox" aria-label="Conversation context" onKeyDown={onPanelKey}>
      {OPTIONS.map((option) => (
        <button
          key={option.iso}
          role="option"
          aria-selected={value.iso === option.iso}
          className={`${styles.option} ${value.iso === option.iso ? styles.selected : ""}`}
          onClick={() => onSelect(option)}
        >
          {option.label}
        </button>
      ))}
      <button
        role="option"
        aria-selected={false}
        className={styles.option}
        onClick={() => setPickDate(true)}
      >
        {STRINGS.pickDate}
      </button>
      {pickDate && (
        <input
          className={styles.date}
          type="date"
          aria-label={STRINGS.pickDate}
          onChange={(event) => selectDate(event.target.value)}
        />
      )}
    </div>
  );
}
