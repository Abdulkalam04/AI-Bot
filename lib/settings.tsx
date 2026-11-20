"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Appearance = "light" | "dark" | "system";
export type MotionSetting = "full" | "calm" | "off";
export type VoiceLanguage = "en-US" | "en-IN" | "hi-IN" | "es-ES" | "fr-FR" | "de-DE";

export type Settings = {
  appearance: Appearance;
  motion: MotionSetting;
  voiceLanguage: VoiceLanguage;
};

const DEFAULT_SETTINGS: Settings = {
  appearance: "system",
  motion: "full",
  voiceLanguage: "en-US",
};

const STORAGE_KEY = "puddle-settings";
const SettingsContext = createContext<(Settings & { setSettings: (next: Settings) => void }) | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setSettingsState({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) as Partial<Settings> });
    } catch {
      setSettingsState(DEFAULT_SETTINGS);
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) setSettingsState((current) => ({ ...current, motion: "off" }));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const theme = settings.appearance === "system" ? (media.matches ? "dark" : "light") : settings.appearance;
    document.documentElement.dataset.theme = theme;

    const motion = settings.motion === "off" || window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "off"
      : settings.motion;
    document.documentElement.dataset.motion = motion;

    const onSystemTheme = () => {
      if (settings.appearance === "system") {
        document.documentElement.dataset.theme = media.matches ? "dark" : "light";
      }
    };
    media.addEventListener("change", onSystemTheme);
    return () => media.removeEventListener("change", onSystemTheme);
  }, [settings]);

  const setSettings = (next: Settings) => setSettingsState(next);
  return <SettingsContext.Provider value={{ ...settings, setSettings }}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const value = useContext(SettingsContext);
  if (!value) throw new Error("useSettings must be used within SettingsProvider");
  return value;
}
