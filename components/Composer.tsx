"use client";
import { ArrowUpIcon, CalendarIcon, MicIcon, WaveIcon } from "./Icons";
import styles from "./Composer.module.css";
import { APP_NAME } from "@/lib/config";
import type { RefObject } from "react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onVoice?: () => void;
  recording?: boolean;
  className?: string;
  onMic?: () => void;
  micListening?: boolean;
  micSupported?: boolean;
  contextLabel?: string;
  contextOpen?: boolean;
  onContextToggle?: () => void;
  contextButtonRef?: RefObject<HTMLButtonElement | null>;
  interim?: string;
};

export default function Composer({ value, onChange, onSend, onVoice, recording = false, className = "", onMic, micListening = false, micSupported = true, contextLabel = "Today", contextOpen = false, onContextToggle, contextButtonRef, interim = "" }: Props) {
  const canSend = value.trim().length > 0;
  const displayValue = value + (interim ? `${value && !value.endsWith(" ") ? " " : ""}${interim}` : "");
  return (
    <div className={`${styles.card} ${className}`}>
      <input
        className={styles.input}
        value={displayValue}
        placeholder={`Ask ${APP_NAME} anything`}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && canSend && onSend()}
        enterKeyHint="send"
      />
      <div className={styles.row}>
        <button
          className={`${styles.tool} ${micListening ? styles.listening : ""} ${!micSupported ? styles.unsupported : ""}`}
          aria-label="Dictate"
          aria-pressed={micListening}
          onClick={onMic}
        >
          <MicIcon />
          {micListening && <span className={styles.rec} />}
        </button>
        <button
          ref={contextButtonRef}
          className={`${styles.tool} ${styles.today}`}
          aria-haspopup="listbox"
          aria-expanded={contextOpen}
          onClick={onContextToggle}
        >
          <CalendarIcon /><span>{contextLabel}</span>
        </button>
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
