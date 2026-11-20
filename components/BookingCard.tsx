"use client";
import { useEffect, useRef, useState } from "react";
import { BellIcon, CalendarIcon, CheckCircleFilledIcon, CheckIcon, ClockIcon, MessageIcon, UsersIcon, UtensilsIcon } from "./Icons";
import styles from "./BookingCard.module.css";

type Status = "offer" | "rolling" | "confirmed";

/* One column of digits 0..max that slides vertically to `value` */
function Roll({ value, max, delay }: { value: number; max: number; delay: number }) {
  return (
    <span className={styles.roll}>
      <span className={styles.strip} style={{ ["--v" as string]: value, transitionDelay: `${delay}ms` }}>
        {Array.from({ length: max + 1 }, (_, i) => (
          <span key={i}>{i}</span>
        ))}
      </span>
    </span>
  );
}

export default function BookingCard({ onView }: { onView?: () => void }) {
  const [status, setStatus] = useState<Status>("offer");
  const [h, setH] = useState(8);
  const [m, setM] = useState(0);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const confirmed = status === "confirmed";

  const book = () => {
    if (status !== "offer") return;
    setStatus("rolling");
    setH(9); // hour rolls 8 -> 9, minutes roll 00 -> 15 (single-digit hours only for now)
    setM(15);
    timer.current = window.setTimeout(() => setStatus("confirmed"), 1500);
  };

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <div className={styles.logo}><UtensilsIcon width={20} height={20} /></div>
        <div>
          <div className={styles.name}>Cafe Lune</div>
          <div className={styles.sub}>
            <span className={`${styles.subIcon} ${confirmed ? styles.ok : ""}`}>
              {confirmed ? <CheckCircleFilledIcon width={14} height={14} /> : <ClockIcon width={14} height={14} />}
            </span>
            <span key={confirmed ? "c" : "o"} className={styles.swap}>
              {confirmed ? "Reservation confirmed" : "A table for you"}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.time} aria-label={`${h}:${String(m).padStart(2, "0")} PM`}>
        <Roll value={h} max={9} delay={0} />
        <span className={styles.colon}>:</span>
        <Roll value={Math.floor(m / 10)} max={5} delay={220} />
        <Roll value={m % 10} max={9} delay={340} />
        <small>PM</small>
      </div>

      <div className={styles.meta}>
        <span><CalendarIcon width={16} height={16} />Friday</span>
        <span><UsersIcon width={16} height={16} />2 guests</span>
      </div>

      <hr className={styles.rule} />

      <div className={styles.note}>
        <span className={styles.noteIcon}>{confirmed ? <BellIcon width={16} height={16} /> : <MessageIcon width={16} height={16} />}</span>
        <span key={confirmed ? "c" : "o"} className={styles.swap}>
          {confirmed ? "I\u2019ll remind you at 7 PM." : "There is a table at 9:15 PM too."}
        </span>
      </div>

      <div className={styles.actions}>
        <button
          className={`${styles.btn} ${styles.primary} ${confirmed ? styles.done : ""}`}
          disabled={status === "rolling"}
          onClick={confirmed ? onView : book}
        >
          <span key={confirmed ? "c" : "o"} className={`${styles.swap} ${styles.label}`}>
            {confirmed ? <CalendarIcon width={16} height={16} /> : <CheckIcon width={16} height={16} />}
            {confirmed ? "View booking" : "Book table"}
          </span>
        </button>
        <button className={`${styles.btn} ${styles.secondary} ${confirmed ? styles.gone : ""}`} tabIndex={confirmed ? -1 : 0}>
          Other times
        </button>
      </div>
    </div>
  );
}
