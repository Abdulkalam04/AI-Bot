"use client";
import { ArrowUpIcon, CalendarIcon, MicIcon, WaveIcon } from "./Icons";
import styles from "./Composer.module.css";
import { APP_NAME } from "@/lib/config";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onVoice?: () => void;
  recording?: boolean;
  className?: string;
};

export default function Composer({ value, onChange, onSend, onVoice, recording = false, className = "" }: Props) {
  const canSend = value.trim().length > 0;
  return (
    <div className={`${styles.card} ${className}`}>
      <input
        className={styles.input}
        value={value}
        placeholder={`Ask ${APP_NAME} anything`}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && canSend && onSend()}
        enterKeyHint="send"
      />
      <div className={styles.row}>
        <button className={styles.tool} aria-label="Dictate"><MicIcon />{recording && <span className={styles.rec} />}</button>
        <button className={`${styles.tool} ${styles.today}`}><CalendarIcon /><span>Today</span></button>
        <button className={styles.tool} aria-label="Voice mode" onClick={onVoice}><WaveIcon /></button>
        <button
          className={`${styles.send} ${canSend ? styles.on : ""}`}
          aria-label="Send"
          disabled={!canSend}
          onClick={onSend}
        >
          <ArrowUpIcon width={17} height={17} />
        </button>
      </div>
    </div>
  );
}
