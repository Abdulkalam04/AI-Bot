"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionResultListLike {
  readonly length: number;
  [index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionErrorEventLike extends Event {
  readonly error: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export function useDictation(onTranscript: (text: string, interim: boolean) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const silenceTimer = useRef<number | null>(null);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition));
  }, []);

  const clearSilence = useCallback(() => {
    if (silenceTimer.current !== null) window.clearTimeout(silenceTimer.current);
    silenceTimer.current = null;
  }, []);

  const armSilence = useCallback(() => {
    clearSilence();
    silenceTimer.current = window.setTimeout(() => recognitionRef.current?.stop(), 2500);
  }, [clearSilence]);

  const stop = useCallback(() => {
    clearSilence();
    recognitionRef.current?.stop();
  }, [clearSilence]);

  const start = useCallback((lang: string) => {
    if (!supported) return;
    clearSilence();
    const Constructor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Constructor) return;
    const recognition = new Constructor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;
    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) finalText += text;
        else interimText += text;
      }
      if (finalText) onTranscript(finalText, false);
      if (interimText) onTranscript(interimText, true);
      setInterim(interimText);
      armSilence();
    };
    recognition.onerror = (event) => {
      setListening(false);
      setInterim("");
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError("Microphone is blocked. Allow it in the browser's site settings.");
      } else if (event.error === "network") {
        setError("Microphone is blocked. Allow it in the browser's site settings.");
      } else {
        setError("");
      }
    };
    recognition.onend = () => {
      clearSilence();
      setListening(false);
      setInterim("");
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setError("");
      setListening(true);
      armSilence();
    } catch {
      setListening(false);
    }
  }, [armSilence, clearSilence, onTranscript, supported]);

  useEffect(() => () => {
    clearSilence();
    recognitionRef.current?.abort();
  }, [clearSilence]);

  return { supported, listening, interim, error, start, stop };
}
