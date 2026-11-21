"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useSpeech() {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const pendingCountRef = useRef(0);

  useEffect(() => {
    const isSupported =
      typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      typeof SpeechSynthesisUtterance !== "undefined";
    setSupported(isSupported);
    if (!isSupported) return;

    const loadVoices = () => {
      try {
        voicesRef.current = window.speechSynthesis.getVoices();
      } catch {
        voicesRef.current = [];
      }
    };

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, []);

  const cancel = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore cancel errors
    }
    pendingCountRef.current = 0;
    setSpeaking(false);
  }, []);

  const speak = useCallback((text: string, lang?: string) => {
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window) ||
      typeof SpeechSynthesisUtterance === "undefined"
    ) {
      return;
    }
    const clean = text.trim();
    if (!clean) return;

    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const utterance = new SpeechSynthesisUtterance(clean);
      if (lang) {
        utterance.lang = lang;
        const target = lang.toLowerCase().replace("_", "-");
        const exact = voicesRef.current.find(
          (v) => v.lang.toLowerCase().replace("_", "-") === target
        );
        const prefix = target.split("-")[0];
        const fallback =
          exact ??
          voicesRef.current.find((v) =>
            v.lang.toLowerCase().replace("_", "-").startsWith(prefix)
          );
        if (fallback) {
          utterance.voice = fallback;
        }
      }

      pendingCountRef.current += 1;
      setSpeaking(true);

      utterance.onstart = () => {
        setSpeaking(true);
      };

      utterance.onend = () => {
        pendingCountRef.current = Math.max(0, pendingCountRef.current - 1);
        if (pendingCountRef.current === 0) {
          setSpeaking(false);
        }
      };

      utterance.onerror = () => {
        pendingCountRef.current = Math.max(0, pendingCountRef.current - 1);
        if (pendingCountRef.current === 0) {
          setSpeaking(false);
        }
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      pendingCountRef.current = Math.max(0, pendingCountRef.current - 1);
      if (pendingCountRef.current === 0) {
        setSpeaking(false);
      }
    }
  }, []);

  useEffect(() => () => {
    cancel();
  }, [cancel]);

  return { supported, speaking, speak, cancel };
}

