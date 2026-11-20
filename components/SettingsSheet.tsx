"use client";

import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import styles from "./SettingsSheet.module.css";
import { APP_NAME, APP_VERSION } from "@/lib/config";
import { STRINGS } from "@/lib/strings";
import { useSettings, type Appearance, type MotionSetting, type VoiceLanguage } from "@/lib/settings";
import { XIcon } from "./Icons";

type Props = {
  open: boolean;
  onClose: () => void;
  onClearConversation: () => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
};

export default function SettingsSheet({ open, onClose, onClearConversation, returnFocusRef }: Props) {
  const settings = useSettings();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const languageButtonRef = useRef<HTMLButtonElement>(null);
  const languageControlRef = useRef<HTMLDivElement>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);

  const languageOptions: { value: VoiceLanguage; label: string }[] = [
    { value: "en-US", label: "English (US)" },
    { value: "en-IN", label: "English (India)" },
    { value: "hi-IN", label: "Hindi" },
    { value: "es-ES", label: "Spanish" },
    { value: "fr-FR", label: "French" },
    { value: "de-DE", label: "German" },
  ];

  useEffect(() => {
    if (!open) return;
    setConfirmClear(false);
    setLanguageOpen(false);
    window.scrollTo(0, 0);
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const nodes = panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!nodes?.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      window.scrollTo(0, 0);
      returnFocusRef.current?.focus({ preventScroll: true });
    }
  }, [open, returnFocusRef]);

  useEffect(() => {
    if (!open || !languageOpen) return;
    const onOutside = (event: PointerEvent) => {
      if (!languageControlRef.current?.contains(event.target as Node)) setLanguageOpen(false);
    };
    document.addEventListener("pointerdown", onOutside);
    return () => document.removeEventListener("pointerdown", onOutside);
  }, [open, languageOpen]);

  if (!open) return null;

  const setAppearance = (appearance: Appearance) => settings.setSettings({ appearance, motion: settings.motion, voiceLanguage: settings.voiceLanguage });
  const setMotion = (motion: MotionSetting) => settings.setSettings({ appearance: settings.appearance, motion, voiceLanguage: settings.voiceLanguage });

  return (
    <div className={styles.layer} role="presentation">
      <button className={styles.backdrop} aria-label="Close settings" onClick={onClose} />
      <div ref={panelRef} className={styles.sheet} role="dialog" aria-modal="true" aria-label={STRINGS.settings}>
        <header className={styles.header}>
          <h2>{STRINGS.settings}</h2>
          <button ref={closeRef} className={styles.close} aria-label={STRINGS.close} onClick={onClose}><XIcon /></button>
        </header>

        <div className={styles.rows}>
          <section className={styles.row}>
            <span className={styles.label}>{STRINGS.appearance}</span>
            <Segmented
              value={settings.appearance}
              options={[
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
                { value: "system", label: "System" },
              ]}
              onChange={(value) => setAppearance(value as Appearance)}
            />
          </section>

          <section className={styles.row}>
            <span className={styles.label}>{STRINGS.motion}</span>
            <Segmented
              value={settings.motion}
              options={[
                { value: "full", label: "Full" },
                { value: "calm", label: "Calm" },
                { value: "off", label: "Off" },
              ]}
              onChange={(value) => setMotion(value as MotionSetting)}
            />
          </section>

          <section className={`${styles.row} ${styles.languageRow}`}>
            <span className={styles.label}>{STRINGS.voiceLanguage}</span>
            <div ref={languageControlRef} className={styles.languageControl}>
              <button
                ref={languageButtonRef}
                type="button"
                className={styles.languageButton}
                role="combobox"
                aria-haspopup="listbox"
                aria-expanded={languageOpen}
                aria-controls="voice-language-list"
                onClick={() => setLanguageOpen((current) => !current)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                    event.preventDefault();
                    setLanguageOpen(true);
                  }
                  if (event.key === "Escape") setLanguageOpen(false);
                }}
              >
                <span>{languageOptions.find((option) => option.value === settings.voiceLanguage)?.label}</span>
                <span className={`${styles.chevron} ${languageOpen ? styles.chevronOpen : ""}`} aria-hidden="true" />
              </button>
              {languageOpen && (
                <div
                  id="voice-language-list"
                  className={styles.languageMenu}
                  role="listbox"
                  aria-label={STRINGS.voiceLanguage}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      event.stopPropagation();
                      setLanguageOpen(false);
                      languageButtonRef.current?.focus();
                    }
                    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                      event.preventDefault();
                      event.stopPropagation();
                      const direction = event.key === "ArrowDown" ? 1 : -1;
                      const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>("button");
                      const current = Array.from(buttons).indexOf(document.activeElement as HTMLButtonElement);
                      const next = (current + direction + buttons.length) % buttons.length;
                      buttons[next]?.focus();
                    }
                  }}
                >
                  {languageOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={settings.voiceLanguage === option.value}
                      className={`${styles.languageOption} ${settings.voiceLanguage === option.value ? styles.languageSelected : ""}`}
                      onClick={() => {
                        settings.setSettings({ appearance: settings.appearance, motion: settings.motion, voiceLanguage: option.value });
                        setLanguageOpen(false);
                        languageButtonRef.current?.focus();
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className={`${styles.row} ${styles.clearRow}`}>
            {confirmClear ? (
              <>
                <span className={styles.label}>{STRINGS.areYouSure}</span>
                <div className={styles.confirm}>
                  <button onClick={() => setConfirmClear(false)}>{STRINGS.cancel}</button>
                  <button className={styles.danger} onClick={onClearConversation}>{STRINGS.clear}</button>
                </div>
              </>
            ) : (
              <button className={styles.clearButton} onClick={() => setConfirmClear(true)}>{STRINGS.clearConversation}</button>
            )}
          </section>
        </div>

        <footer className={styles.footer}>{APP_NAME} &middot; v{APP_VERSION}</footer>
      </div>
    </div>
  );
}

function Segmented({ value, options, onChange }: { value: string; options: { value: string; label: string }[]; onChange: (value: string) => void }) {
  const selected = options.findIndex((option) => option.value === value);
  return (
    <div className={styles.segmented} role="radiogroup" style={{ "--selected": selected } as CSSProperties}>
      <span className={styles.pill} />
      {options.map((option) => (
        <button
          key={option.value}
          role="radio"
          aria-checked={value === option.value}
          className={value === option.value ? styles.active : ""}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
