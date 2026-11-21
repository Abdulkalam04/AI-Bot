"use client";

import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import styles from "./SettingsSheet.module.css";
import { APP_NAME, APP_VERSION } from "@/lib/config";
import { STRINGS } from "@/lib/strings";
import { useSettings, type Appearance, type MotionSetting, type VoiceLanguage, type Persona } from "@/lib/settings";
import { useSession, signOut } from "next-auth/react";
import { XIcon, LogOutIcon } from "./Icons";

type Props = {
  open: boolean;
  onClose: () => void;
  onClearConversation: () => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
};

export default function SettingsSheet({ open, onClose, onClearConversation, returnFocusRef }: Props) {
  const settings = useSettings();
  const { data: session } = useSession();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const wasOpen = useRef(false);

  const languageOptions: { value: VoiceLanguage; label: string }[] = [
    { value: "en-US", label: "English (US)" },
    { value: "en-IN", label: "English (India)" },
    { value: "hi-IN", label: "Hindi" },
    { value: "es-ES", label: "Spanish" },
    { value: "fr-FR", label: "French" },
    { value: "de-DE", label: "German" },
  ];

  const personaOptions: { value: Persona; label: string }[] = [
    { value: "friendly", label: "Friendly" },
    { value: "concise", label: "Concise" },
    { value: "formal", label: "Formal" },
    { value: "custom", label: "Custom" },
  ];

  useEffect(() => {
    if (!open) return;
    setConfirmClear(false);
    setOpenDropdown(null);
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
    if (wasOpen.current && !open) {
      window.scrollTo(0, 0);
      returnFocusRef.current?.focus({ preventScroll: true });
    }
    wasOpen.current = open;
  }, [open, returnFocusRef]);

  if (!open) return null;

  const setAppearance = (appearance: Appearance) => settings.setSettings({ ...settings, appearance });
  const setMotion = (motion: MotionSetting) => settings.setSettings({ ...settings, motion });
  const setSpeakReplies = (speakReplies: boolean) => settings.setSettings({ ...settings, speakReplies });
  const setPersona = (persona: Persona) => settings.setSettings({ ...settings, persona });
  const setCustomInstructions = (customInstructions: string) =>
    settings.setSettings({ ...settings, customInstructions: customInstructions.slice(0, 500) });

  const CUSTOM_MAX = 500;

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

          <section className={styles.row}>
            <span className={styles.label}>{STRINGS.speakReplies}</span>
            <Segmented
              value={settings.speakReplies ? "on" : "off"}
              options={[
                { value: "on", label: "On" },
                { value: "off", label: "Off" },
              ]}
              onChange={(value) => setSpeakReplies(value === "on")}
            />
          </section>

          <SelectRow
            id="voice-language-list"
            label={STRINGS.voiceLanguage}
            value={settings.voiceLanguage}
            options={languageOptions}
            onChange={(val) => settings.setSettings({ ...settings, voiceLanguage: val })}
            isOpen={openDropdown === "voice-language-list"}
            onToggle={() => setOpenDropdown((cur) => (cur === "voice-language-list" ? null : "voice-language-list"))}
            onClose={() => setOpenDropdown(null)}
          />

          <SelectRow
            id="persona-list"
            label="Personality"
            value={settings.persona}
            options={personaOptions}
            onChange={(val) => setPersona(val)}
            isOpen={openDropdown === "persona-list"}
            onToggle={() => setOpenDropdown((cur) => (cur === "persona-list" ? null : "persona-list"))}
            onClose={() => setOpenDropdown(null)}
          />

          {settings.persona === "custom" && (
            <section className={styles.customRow}>
              <label className={styles.customLabel} htmlFor="custom-instructions">
                Custom instructions
                <span className={`${styles.customCount} ${(settings.customInstructions?.length ?? 0) >= CUSTOM_MAX ? styles.customCountMax : ""}`}>
                  {settings.customInstructions?.length ?? 0}/{CUSTOM_MAX}
                </span>
              </label>
              <textarea
                id="custom-instructions"
                className={styles.customTextarea}
                value={settings.customInstructions ?? ""}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="Tell the assistant how you'd like it to behave…"
                rows={4}
                maxLength={CUSTOM_MAX}
              />
            </section>
          )}

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

          {session?.user && (
            <section className={styles.accountRow}>
              <div className={styles.accountInfo}>
                <span className={styles.accountLabel}>Account</span>
                <span className={styles.accountEmail} title={session.user.email ?? ""}>
                  {session.user.name ? `${session.user.name} (${session.user.email})` : session.user.email}
                </span>
              </div>
              <button
                type="button"
                className={styles.signOutButton}
                onClick={() => signOut({ callbackUrl: "/signin" })}
                aria-label="Sign out"
              >
                <LogOutIcon width={14} height={14} />
                <span>Sign out</span>
              </button>
            </section>
          )}
        </div>

        <footer className={styles.footer}>{APP_NAME} &middot; v{APP_VERSION}</footer>
      </div>
    </div>
  );
}

function Segmented({ value, options, onChange }: { value: string; options: { value: string; label: string }[]; onChange: (value: string) => void }) {
  const selected = options.findIndex((option) => option.value === value);
  return (
    <div className={styles.segmented} role="radiogroup" style={{ "--selected": selected, "--count": options.length } as CSSProperties}>
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

type SelectOption<T extends string = string> = {
  value: T;
  label: string;
};

type SelectRowProps<T extends string = string> = {
  id: string;
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
};

function SelectRow<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
  isOpen,
  onToggle,
  onClose,
}: SelectRowProps<T>) {
  const controlRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [openUpward, setOpenUpward] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onOutside = (event: PointerEvent) => {
      if (!controlRef.current?.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("pointerdown", onOutside);
    return () => document.removeEventListener("pointerdown", onOutside);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !controlRef.current) return;
    const rect = controlRef.current.getBoundingClientRect();
    const sheetEl = controlRef.current.closest<HTMLElement>(`.${styles.sheet}`);
    const sheetRect = sheetEl ? sheetEl.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
    const spaceBelow = sheetRect.bottom - rect.bottom;
    const spaceAbove = rect.top - sheetRect.top;
    const estimatedHeight = options.length * 44 + 16;
    if (spaceBelow < estimatedHeight && spaceAbove >= spaceBelow) {
      setOpenUpward(true);
    } else {
      setOpenUpward(false);
    }
  }, [isOpen, options.length]);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <section className={`${styles.row} ${styles.languageRow}`}>
      <span className={styles.label}>{label}</span>
      <div ref={controlRef} className={styles.languageControl}>
        <button
          ref={buttonRef}
          type="button"
          className={styles.languageButton}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={id}
          onClick={onToggle}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              if (!isOpen) {
                onToggle();
              }
            }
            if (event.key === "Escape" && isOpen) {
              event.preventDefault();
              onClose();
            }
          }}
        >
          <span>{selectedOption?.label ?? value}</span>
          <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ""}`} aria-hidden="true" />
        </button>
        {isOpen && (
          <div
            id={id}
            className={`${styles.languageMenu} ${openUpward ? styles.menuUpward : ""}`}
            role="listbox"
            aria-label={label}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                onClose();
                buttonRef.current?.focus();
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
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={value === option.value}
                className={`${styles.languageOption} ${value === option.value ? styles.languageSelected : ""}`}
                onClick={() => {
                  onChange(option.value);
                  onClose();
                  buttonRef.current?.focus();
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
