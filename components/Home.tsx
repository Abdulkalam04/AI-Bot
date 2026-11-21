"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ComposeIcon, CalendarIcon, HangupIcon, SlidersIcon, XIcon, HistoryIcon } from "./Icons";
import Mascot from "./Mascot";
import Composer, { type AttachedImage } from "./Composer";
import Chat, { Msg } from "./Chat";
import DaySheet from "./DaySheet";
import SettingsSheet from "./SettingsSheet";
import HistorySheet from "./HistorySheet";
import ContextPopover, { type ContextValue } from "./ContextPopover";
import Toast from "./Toast";
import { useDictation } from "@/hooks/useDictation";
import { useSpeech } from "@/hooks/useSpeech";
import { useSettings } from "@/lib/settings";
import { STRINGS } from "@/lib/strings";
import { getConversation, saveConversation, deleteConversation } from "@/lib/history";
import { listTasks, createTask, updateTask, toggleTask, deleteTask, type DayItem } from "@/lib/tasks";
import { resolveContext, formatLocalDate } from "@/lib/dateContext";
import styles from "./Home.module.css";

function extractCompleteSentences(text: string, startIndex: number): { sentences: string[]; nextIndex: number } {
  const slice = text.slice(startIndex);
  const regex = /([^.!?\r\n]+[.!?]+)(\s+)/g;
  const sentences: string[] = [];
  let lastConsumed = 0;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(slice)) !== null) {
    const sentence = match[1].trim();
    if (sentence) {
      sentences.push(sentence);
      lastConsumed = regex.lastIndex;
    }
  }

  return { sentences, nextIndex: startIndex + lastConsumed };
}

function stripTransient(messages: Msg[]): Msg[] {
  return messages
    .filter((m) => m.role !== "typing")
    .map((m) => {
      const { leaving, fromComposer, imagePreviews, ...rest } = m;
      const hasImages = imagePreviews && imagePreviews.length > 0;
      const text = hasImages
        ? (rest.text ? `${rest.text} [image]` : "[image]")
        : rest.text;
      return {
        ...rest,
        text,
      };
    });
}

type Phase = "home" | "dragging" | "opening" | "voice" | "ending";
const clamp = (n: number, a = 0, b = 1) => Math.min(b, Math.max(a, n));

export default function Home() {
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("home");
  const [view, setView] = useState<"home" | "chat">("home");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [sheet, setSheet] = useState(0);        // 0 closed .. 1 open (Day sheet)
  const [sheetDrag, setSheetDrag] = useState(false);
  const [p, setP] = useState(0); // 0 = home, 1 = voice mode. Drives everything through the --p CSS variable.
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMsgId, setStreamingMsgId] = useState<string | undefined>(undefined);
  const [contextOpen, setContextOpen] = useState(false);
  const [context, setContext] = useState<ContextValue>({ label: STRINGS.today, iso: "today" });
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [tasks, setTasks] = useState<DayItem[]>([]);
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  // Time-based greeting — neutral default on server, real value set after mount to avoid hydration mismatch
  const [greeting, setGreeting] = useState("Good morning");
  const settings = useSettings();
  const speech = useSpeech();

  useEffect(() => {
    const h = new Date().getHours();
    if (h >= 18) setGreeting("Good evening");
    else if (h >= 12) setGreeting("Good afternoon");
    else setGreeting("Good morning");
  }, []);

  useEffect(() => {
    setTasks(listTasks());
  }, []);

  const handleToggleTask = (id: string) => {
    toggleTask(id);
    setTasks(listTasks());
  };

  const handleDeleteTask = (id: string) => {
    deleteTask(id);
    setTasks(listTasks());
  };

  const handleAddTask = (title: string, time?: string) => {
    const res = resolveContext(context);
    const todayStr = formatLocalDate(new Date());
    const defaultTime = res.start !== todayStr ? `${res.start}T09:00:00` : undefined;
    createTask({ title, time: time || defaultTime });
    setTasks(listTasks());
  };

  const root = useRef<HTMLElement>(null);
  const settingsButton = useRef<HTMLButtonElement>(null);
  const historyButton = useRef<HTMLButtonElement>(null);
  const contextButton = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ y: number; moved: boolean } | null>(null);
  const timers = useRef<number[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>(0);
  const chatAbortRef = useRef<AbortController | null>(null);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  const voiceTextRef = useRef("");
  const handleTranscript = useCallback((spoken: string, interim: boolean) => {
    if (phase === "voice") {
      if (!interim && spoken.trim()) {
        voiceTextRef.current += (voiceTextRef.current ? " " : "") + spoken.trim();
      }
    } else {
      if (!interim) {
        setText((current) => `${current}${current && !current.endsWith(" ") ? " " : ""}${spoken.trim()}`);
      }
    }
  }, [phase]);
  const dictation = useDictation(handleTranscript);

  // Debounced auto-save of the active conversation whenever messages change (skipped while streaming)
  useEffect(() => {
    if (isStreaming) return;
    if (!conversationId) return;

    const clean = stripTransient(msgs);
    if (clean.length === 0) return;

    const timer = setTimeout(() => {
      const existing = getConversation(conversationId);
      const firstUser = clean.find((m) => m.role === "user");
      const title = firstUser?.text ? firstUser.text.slice(0, 40) : (existing?.title ?? "New chat");
      const now = Date.now();
      saveConversation({
        id: conversationId,
        title,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        messages: clean,
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [msgs, conversationId, isStreaming]);

  useEffect(() => {
    if (dictation.error) setToast(dictation.error);
  }, [dictation.error]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      speech.cancel();
      if (dictation.listening) dictation.stop();
      if (phase === "voice" || phase === "opening") close();
      if (contextOpen) setContextOpen(false);
      if (historyOpen) setHistoryOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dictation.listening, phase, contextOpen, historyOpen, speech]);

  const choose = (msgId: string, choiceId: string) => {
    setMsgs((m) => m.map((x) => (x.id === msgId ? { ...x, chosen: choiceId } : x)));
  };
  const newChat = (ignoreSettings = false) => {
    if (phase !== "home" || busy || (settingsOpen && !ignoreSettings) || historyOpen) return;
    speech.cancel();
    if (dictation.listening) dictation.stop();
    chatAbortRef.current?.abort();
    chatAbortRef.current = null;
    setIsStreaming(false);
    setContextOpen(false);
    setAttachedImages([]);
    timers.current.forEach(clearTimeout);
    timers.current = [];

    if (conversationId) {
      const clean = stripTransient(msgs);
      if (clean.length > 0) {
        const existing = getConversation(conversationId);
        const firstUser = clean.find((m) => m.role === "user");
        const title = firstUser?.text ? firstUser.text.slice(0, 40) : (existing?.title ?? "New chat");
        const now = Date.now();
        saveConversation({
          id: conversationId,
          title,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
          messages: clean,
        });
      }
    }

    if (msgs.length === 0 && view === "home") {
      setText("");
      setAttachedImages([]);
      setConversationId(null);
      requestAnimationFrame(() => document.querySelector<HTMLInputElement>(".input")?.focus());
      root.current?.style.setProperty("--hop", "1");
      window.setTimeout(() => root.current?.style.setProperty("--hop", "0"), 260);
      return;
    }
    setBusy(true);
    setMsgs((current) => current.map((message) => ({ ...message, leaving: true })));
    later(() => {
      setMsgs([]);
      setConversationId(null);
      setView("home");
      setText("");
      setAttachedImages([]);
      setBusy(false);
      later(() => document.querySelector<HTMLInputElement>(".input")?.focus(), 40);
      root.current?.style.setProperty("--hop", "1");
      window.setTimeout(() => root.current?.style.setProperty("--hop", "0"), 260);
    }, 250);
  };

  /* ---- execute chat pipeline for both composer and voice mode ---- */
  const executeChat = async (messageText: string, fromComposer = false, images: AttachedImage[] = []) => {
    if (busy || settingsOpen || sheetOpen || historyOpen || chatAbortRef.current) return;
    if (dictation.listening) dictation.stop();

    let activeId = conversationId;
    if (!activeId) {
      activeId = "c_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      setConversationId(activeId);
    }

    if (fromComposer) {
      setText("");
      if (view === "home") setView("chat");
    }

    const id = Math.random().toString(36).slice(2, 7);
    const history = msgs
      .filter((message): message is Msg & { text: string } =>
        (message.role === "user" || message.role === "reply") && typeof message.text === "string"
      )
      .map((message) => ({
        role: message.role === "reply" ? "assistant" as const : "user" as const,
        text: message.role === "user" && message.imagePreviews?.length
          ? `${message.text ? message.text + " " : ""}[image]`
          : message.text,
      }));
    const controller = new AbortController();
    chatAbortRef.current = controller;
    setIsStreaming(true);
    setStreamingMsgId("r" + id);
    setMsgs((m) => [
      ...m,
      {
        id: "u" + id,
        role: "user",
        text: messageText || (images.length > 0 ? undefined : ""),
        fromComposer,
        context,
        imagePreviews: images.map((img) => img.dataUrl).filter(Boolean),
      },
      { id: "t" + id, role: "typing" },
    ]);

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const date = new Date().toISOString();
    const resolvedContext = resolveContext(context);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...history, { role: "user", text: messageText || "[image]" }],
          images: images.map((img) => ({ base64: img.base64, mimeType: img.mimeType })),
          context,
          resolvedContext,
          timeZone,
          date,
          persona: settings.persona,
          customInstructions: settings.customInstructions,
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const raw = await response.text();
        let parsed: unknown = null;
        try {
          parsed = JSON.parse(raw);
        } catch {
          // not JSON
        }
        console.error(
          "[chat] failed:",
          response.status,
          response.headers.get("content-type"),
          raw.slice(0, 500)
        );
        let errorMsg = "";
        if (
          typeof parsed === "object" &&
          parsed !== null &&
          "error" in parsed &&
          typeof (parsed as Record<string, unknown>).error === "string" &&
          (parsed as Record<string, unknown>).error
        ) {
          errorMsg = (parsed as { error: string }).error;
        } else {
          errorMsg = raw.slice(0, 120) || `Request failed (${response.status})`;
        }
        setMsgs((current) => current.filter((message) => message.id !== "t" + id));
        setToast(errorMsg);
        return;
      }
      if (!response.body) throw new Error("The assistant returned an empty response.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let replyText = "";
      let started = false;
      let spokenIndex = 0;
      let detectedToolCall: { name: string; args: Record<string, unknown>; id?: string } | null = null;
      let streamBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (!chunk || chatAbortRef.current !== controller) continue;

        streamBuffer += chunk;
        const lines = streamBuffer.split("\n");
        streamBuffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('{"type":"tool_call"')) {
            try {
              detectedToolCall = JSON.parse(trimmed);
              continue;
            } catch {
              // Not JSON tool call
            }
          }
          if (line) {
            replyText += line + "\n";
          }
        }

        if (replyText.trim()) {
          const display = replyText.trimStart();
          if (!started) {
            started = true;
            setMsgs((current) => [
              ...current.filter((message) => message.id !== "t" + id),
              { id: "r" + id, role: "reply", text: display },
            ]);
          } else {
            setMsgs((current) => current.map((message) => message.id === "r" + id ? { ...message, text: display } : message));
          }

          if (settings.speakReplies && speech.supported) {
            const { sentences, nextIndex } = extractCompleteSentences(display, spokenIndex);
            if (sentences.length > 0) {
              for (const sentence of sentences) {
                speech.speak(sentence, settings.voiceLanguage);
              }
              spokenIndex = nextIndex;
            }
          }
        }
      }

      if (streamBuffer) {
        const trimmed = streamBuffer.trim();
        if (trimmed.startsWith('{"type":"tool_call"')) {
          try {
            detectedToolCall = JSON.parse(trimmed);
          } catch {
            replyText += streamBuffer;
          }
        } else {
          replyText += streamBuffer;
        }
      }

      // If a function tool was called by the model, execute it on the client and send follow-up
      if (detectedToolCall && chatAbortRef.current === controller) {
        let toolResponse: Record<string, unknown> = {};
        let wasTaskCreated = false;

        if (detectedToolCall.name === "create_task") {
          const args = (detectedToolCall.args || {}) as { title?: string; time?: string };
          const task = createTask({ title: args.title || "New task", time: args.time });
          setTasks(listTasks());
          toolResponse = { success: true, task };
          wasTaskCreated = true;
        } else if (detectedToolCall.name === "list_tasks") {
          const currentTasks = listTasks();
          toolResponse = { tasks: currentTasks };
        } else if (detectedToolCall.name === "complete_task") {
          const args = (detectedToolCall.args || {}) as { id?: string };
          const updated = args.id ? updateTask(args.id, { status: "done" }) : null;
          setTasks(listTasks());
          toolResponse = { success: !!updated, task: updated };
        }

        const followUpResponse = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [
              ...history,
              { role: "user" as const, text: messageText },
              {
                role: "assistant" as const,
                functionCall: {
                  name: detectedToolCall.name,
                  args: detectedToolCall.args,
                  id: detectedToolCall.id,
                },
              },
              {
                role: "user" as const,
                functionResponse: {
                  name: detectedToolCall.name,
                  response: toolResponse,
                  id: detectedToolCall.id,
                },
              },
            ],
            context,
            resolvedContext,
            timeZone,
            date,
            persona: settings.persona,
            customInstructions: settings.customInstructions,
          }),
          signal: controller.signal,
        });

        if (!followUpResponse.ok) {
          const raw = await followUpResponse.text();
          let parsed: unknown = null;
          try {
            parsed = JSON.parse(raw);
          } catch {
            // not JSON
          }
          console.error(
            "[chat] failed:",
            followUpResponse.status,
            followUpResponse.headers.get("content-type"),
            raw.slice(0, 500)
          );
          let errorMsg = "";
          if (
            typeof parsed === "object" &&
            parsed !== null &&
            "error" in parsed &&
            typeof (parsed as Record<string, unknown>).error === "string" &&
            (parsed as Record<string, unknown>).error
          ) {
            errorMsg = (parsed as { error: string }).error;
          } else {
            errorMsg = raw.slice(0, 120) || `Request failed (${followUpResponse.status})`;
          }
          setMsgs((current) => current.filter((message) => message.id !== "t" + id));
          setToast(errorMsg);
          return;
        }

        if (followUpResponse.body) {
          const followUpReader = followUpResponse.body.getReader();
          let confirmText = "";
          let confirmSpokenIndex = 0;

          while (true) {
            const { done, value } = await followUpReader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            if (!chunk || chatAbortRef.current !== controller) continue;
            confirmText += chunk;

            if (!started) {
              started = true;
              setMsgs((current) => [
                ...current.filter((message) => message.id !== "t" + id),
                {
                  id: "r" + id,
                  role: "reply",
                  text: confirmText,
                  taskConfirmation: wasTaskCreated ? "Added to My day" : undefined,
                },
              ]);
            } else {
              setMsgs((current) =>
                current.map((message) =>
                  message.id === "r" + id
                    ? {
                        ...message,
                        text: confirmText,
                        taskConfirmation: wasTaskCreated ? "Added to My day" : message.taskConfirmation,
                      }
                    : message
                )
              );
            }

            if (settings.speakReplies && speech.supported) {
              const { sentences, nextIndex } = extractCompleteSentences(confirmText, confirmSpokenIndex);
              if (sentences.length > 0) {
                for (const sentence of sentences) {
                  speech.speak(sentence, settings.voiceLanguage);
                }
                confirmSpokenIndex = nextIndex;
              }
            }
          }

          if (settings.speakReplies && speech.supported && chatAbortRef.current === controller) {
            const remaining = confirmText.slice(confirmSpokenIndex).trim();
            if (remaining) {
              speech.speak(remaining, settings.voiceLanguage);
            }
          }
        }
      } else {
        if (settings.speakReplies && speech.supported && chatAbortRef.current === controller) {
          const remaining = replyText.slice(spokenIndex).trim();
          if (remaining) {
            speech.speak(remaining, settings.voiceLanguage);
          }
        }
      }

      if (!started && chatAbortRef.current === controller) {
        setMsgs((current) => current.filter((message) => message.id !== "t" + id));
      }
    } catch (error) {
      if (controller.signal.aborted) {
        // Keep partial text — just clear the streaming state, don't remove the message
        setIsStreaming(false);
        setStreamingMsgId(undefined);
        if (chatAbortRef.current === controller) chatAbortRef.current = null;
        return;
      }
      setMsgs((current) => current.filter((message) => message.id !== "t" + id));
      setToast("Unable to reach the assistant right now.");
    } finally {
      if (chatAbortRef.current === controller) chatAbortRef.current = null;
      setIsStreaming(false);
      setStreamingMsgId(undefined);
    }
  };

  /* ---- stop streaming (keep partial text) ---- */
  const stopStreaming = () => {
    if (chatAbortRef.current) {
      chatAbortRef.current.abort();
      chatAbortRef.current = null;
    }
    setIsStreaming(false);
    setStreamingMsgId(undefined);
  };

  /* ---- regenerate the last reply ---- */
  const regenerate = useCallback((replyId: string) => {
    if (isStreaming || busy) return;
    // Find the user message just before this reply
    const replyIndex = msgs.findIndex((m) => m.id === replyId);
    if (replyIndex <= 0) return;
    // Walk back to find the last user message before this reply
    let userMsg: Msg | undefined;
    for (let i = replyIndex - 1; i >= 0; i--) {
      if (msgs[i].role === "user") { userMsg = msgs[i]; break; }
    }
    if (!userMsg?.text) return;
    const userText = userMsg.text;
    // Remove the reply (and its user bubble) so executeChat adds fresh ones
    setMsgs((current) => current.filter((m) => m.id !== replyId && m.id !== userMsg!.id));
    void executeChat(userText, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msgs, isStreaming, busy]);

  /* ---- sending a message from the composer ---- */
  const send = async () => {
    if (phase !== "home" || busy || settingsOpen || sheetOpen || historyOpen || chatAbortRef.current) return;
    const t = `${text}${dictation.interim ? `${text && !text.endsWith(" ") ? " " : ""}${dictation.interim}` : ""}`.trim();
    if (!t && attachedImages.length === 0) return;
    const imagesToSend = [...attachedImages];
    setAttachedImages([]);
    await executeChat(t, true, imagesToSend);
  };

  // Silence pause detection: when user stops speaking in voice mode, send final text through chat pipeline
  const previousListeningRef = useRef(false);
  useEffect(() => {
    const wasListening = previousListeningRef.current;
    previousListeningRef.current = dictation.listening;

    if (wasListening && !dictation.listening) {
      if (phase === "voice" && !isStreaming && !speech.speaking) {
        const captured = voiceTextRef.current.trim();
        voiceTextRef.current = "";
        if (captured) {
          void executeChat(captured, false);
        } else if (dictation.supported) {
          dictation.start(settings.voiceLanguage);
        }
      }
    }
  }, [dictation.listening, phase, isStreaming, speech.speaking, settings.voiceLanguage, dictation.supported]);

  // Return to listening after speaking or streaming ends in voice mode
  const wasSpeakingRef = useRef(false);
  const wasStreamingRef = useRef(false);
  useEffect(() => {
    const wasSpeaking = wasSpeakingRef.current;
    const wasStreaming = wasStreamingRef.current;
    wasSpeakingRef.current = speech.speaking;
    wasStreamingRef.current = isStreaming;

    if (phase !== "voice") return;

    if (wasSpeaking && !speech.speaking && !isStreaming) {
      if (!dictation.listening && dictation.supported) {
        voiceTextRef.current = "";
        dictation.start(settings.voiceLanguage);
      }
    }

    if (wasStreaming && !isStreaming && !speech.speaking) {
      if (!dictation.listening && dictation.supported) {
        voiceTextRef.current = "";
        dictation.start(settings.voiceLanguage);
      }
    }
  }, [phase, speech.speaking, isStreaming, dictation.listening, dictation.supported, settings.voiceLanguage, dictation]);

  const openConversation = (id: string) => {
    if (phase !== "home" || busy) return;
    speech.cancel();
    if (dictation.listening) dictation.stop();
    chatAbortRef.current?.abort();
    chatAbortRef.current = null;
    setIsStreaming(false);
    timers.current.forEach(clearTimeout);
    timers.current = [];

    if (conversationId && conversationId !== id) {
      const clean = stripTransient(msgs);
      if (clean.length > 0) {
        const existing = getConversation(conversationId);
        const firstUser = clean.find((m) => m.role === "user");
        const title = firstUser?.text ? firstUser.text.slice(0, 40) : (existing?.title ?? "New chat");
        const now = Date.now();
        saveConversation({
          id: conversationId,
          title,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
          messages: clean,
        });
      }
    }

    const target = getConversation(id);
    if (!target) return;

    setConversationId(target.id);
    setMsgs(target.messages);
    setView("chat");
    setText("");
    setAttachedImages([]);
    setHistoryOpen(false);
  };

  const handleDeleteConversation = (id: string) => {
    if (conversationId === id) {
      setConversationId(null);
      setMsgs([]);
      setView("home");
      setText("");
    }
  };

  /* ---- Day sheet ---- */
  const sDrag = useRef<{ y: number; h: number } | null>(null);
  const openSheet = () => setSheet(1);
  const closeSheet = () => setSheet(0);
  const grab = {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      sDrag.current = { y: e.clientY, h: (root.current?.clientHeight ?? 800) * 0.6 };
      setSheetDrag(true);
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      const d = sDrag.current;
      if (d) setSheet(clamp(1 - (e.clientY - d.y) / d.h));
    },
    onPointerUp: () => {
      if (!sDrag.current) return;
      sDrag.current = null;
      setSheetDrag(false);
      setSheet(sheet > 0.7 ? 1 : 0);
    },
  };
  const sheetOpen = sheet > 0.3;

  const stopAudio = useCallback(() => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = 0;
    audioStreamRef.current?.getTracks().forEach((track) => track.stop());
    audioStreamRef.current = null;
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      void audioContextRef.current.close();
    }
    audioContextRef.current = null;
  }, []);

  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
    chatAbortRef.current?.abort();
    stopAudio();
  }, [stopAudio]);

  const startVoiceAudio = useCallback(async () => {
    stopAudio();
    if (!navigator.mediaDevices?.getUserMedia) {
      setToast(STRINGS.dictationUnsupported);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      const context = new AudioContext();
      audioContextRef.current = context;
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.82;
      source.connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);
      let smoothed = 0;
      const tick = () => {
        analyser.getByteTimeDomainData(samples);
        let sum = 0;
        for (const sample of samples) {
          const centered = (sample - 128) / 128;
          sum += centered * centered;
        }
        const rms = Math.sqrt(sum / samples.length);
        smoothed = smoothed * 0.82 + rms * 0.18;
        root.current?.style.setProperty("--lv", String(Math.min(1, smoothed * 4)));
        animationFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      setToast("Microphone is blocked. Allow it in the browser's site settings.");
      let level = 0;
      const tick = () => {
        level = 0.32 + Math.sin(performance.now() / 420) * 0.12;
        root.current?.style.setProperty("--lv", String(Math.max(0.12, level)));
        animationFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    }
  }, [stopAudio]);

  const open = () => {
    if (busy || phase !== "home" || settingsOpen || historyOpen || sheet > 0.3) return;
    speech.cancel();
    if (dictation.listening) dictation.stop();
    voiceTextRef.current = "";
    setPhase("opening");
    setP(1);
    void startVoiceAudio();
    later(() => {
      setPhase("voice");
      if (!dictation.supported) {
        setToast(STRINGS.dictationUnsupported);
      } else {
        dictation.start(settings.voiceLanguage);
      }
      if (settings.speakReplies && !speech.supported) {
        setToast("Speech synthesis is not supported in this browser.");
      }
    }, 900); // ^ ^ eyes -> pill eyes, text turns dark
  };
  const close = () => {
    speech.cancel();
    if (dictation.listening) dictation.stop();
    voiceTextRef.current = "";
    chatAbortRef.current?.abort();
    chatAbortRef.current = null;
    setIsStreaming(false);
    stopAudio();
    root.current?.style.setProperty("--lv", "0");
    setPhase("ending");
    setP(0);
    later(() => setPhase("home"), 800);
  };

  /* ---- pull-down gesture on the little mascot ---- */
  const onDown = (e: React.PointerEvent) => {
    if (phase !== "home") return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { y: e.clientY, moved: false };
    setPhase("dragging");
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dy = e.clientY - d.y;
    if (dy > 6) d.moved = true;
    const range = Math.min((root.current?.clientHeight ?? 700) * 0.26, 220);
    setP(clamp(dy / range));
  };
  const onUp = () => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    if (!d.moved || p > 0.45) open(); // a plain tap also opens voice mode
    else {
      setPhase("home");
      setP(0);
    }
  };

  const onMascotClick = () => {
    if (phase === "voice") {
      close();
    }
  };

  const happy = (phase === "dragging" && p > 0.35) || phase === "opening" || dictation.listening || speech.speaking;
  const inVoice = phase === "opening" || phase === "voice";
  const locked = phase !== "home" && phase !== "dragging";

  return (
    <section
      ref={root}
      className={`${styles.home} ${phase === "dragging" || sheetDrag ? styles.dragging : ""}`}
      style={{ ["--p" as string]: p, ["--cx" as string]: view === "chat" ? 1 : 0, ["--cy" as string]: view === "chat" ? 1 : 0, ["--s" as string]: sheet, ["--tx" as string]: view === "chat" && text.trim() ? 1 : 0 }}
    >
      <div className={styles.column}>
      <header className={`${styles.top} ${styles.fade} ${locked ? styles.noTouch : ""}`}>
        <div className={styles.navLeft}>
          <button
            ref={settingsButton}
            className={`${styles.round} ${styles.fadeSl}`}
            aria-label="Settings"
            onClick={() => !locked && !sheetOpen && !historyOpen && setSettingsOpen(true)}
          >
            <SlidersIcon />
          </button>
          <button
            ref={historyButton}
            className={`${styles.round} ${styles.fadeSl}`}
            aria-label="Chat history"
            onClick={() => !locked && !sheetOpen && !settingsOpen && setHistoryOpen(true)}
          >
            <HistoryIcon />
          </button>
        </div>
        <div className={`${styles.topCenter} ${styles.goChat}`}>
          <div className={styles.pull}>
            <div className={styles.slot} data-splash-target /> {/* the real mascot floats above this spot */}
            <span>Pull me down</span>
          </div>
        </div>
        <button
          className={styles.round}
          aria-label={sheetOpen ? "Close" : "New chat"}
          disabled={phase === "opening" || phase === "voice" || phase === "ending"}
          onClick={sheetOpen ? closeSheet : () => newChat()}
        >
          <span className={styles.swapA}><ComposeIcon /></span>
          <span className={styles.swapB}><XIcon /></span>
        </button>
      </header>

      <div className={`${styles.body} ${styles.dim}`}>
      <div className={`${styles.center} ${styles.goChat} ${locked || view === "chat" ? styles.noTouch : ""}`}>
        <h1>{greeting}.</h1>
        <p>How can I help?</p>
        <div className={styles.chips}>
          <button className={styles.chip} onClick={openSheet}><CalendarIcon width={17} height={17} />My day</button>
        </div>
      </div>
      <div className={`${styles.chatWrap} ${view === "chat" && !sheetOpen ? "" : styles.noTouch}`}>
        <Chat messages={msgs} onChoose={choose} onRegenerate={regenerate} streamingId={streamingMsgId} />
      </div>
      </div>

      <div className={`${styles.fadeS} ${locked || sheetOpen ? styles.noTouch : ""}`}>
        <Composer
          value={text}
          onChange={setText}
          onSend={send}
          onStop={stopStreaming}
          streaming={isStreaming}
          onVoice={open}
          recording={phase !== "home"}
          onMic={() => {
            if (phase !== "home" || busy || sheetOpen || settingsOpen || historyOpen) return;
            if (!dictation.supported) {
              setToast(STRINGS.dictationUnsupported);
              return;
            }
            if (dictation.listening) dictation.stop();
            else dictation.start(settings.voiceLanguage);
          }}
          micListening={dictation.listening}
          micSupported={dictation.supported}
          contextLabel={context.label}
          contextOpen={contextOpen}
          onContextToggle={() => !locked && setContextOpen((open) => !open)}
          contextButtonRef={contextButton}
          interim={dictation.interim}
          images={attachedImages}
          onImagesChange={setAttachedImages}
          onAttachError={(msg) => setToast(msg)}
        />
      </div>

      <ContextPopover
        open={contextOpen}
        value={context}
        anchorRef={contextButton}
        onClose={() => setContextOpen(false)}
        onSelect={(next) => {
          setContext(next);
          setContextOpen(false);
          root.current?.style.setProperty("--hop", "1");
          window.setTimeout(() => root.current?.style.setProperty("--hop", "0"), 260);
        }}
      />

      <Toast message={toast} onDismiss={() => setToast("")} />
      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onClearConversation={() => {
          setSettingsOpen(false);
          if (conversationId) {
            deleteConversation(conversationId);
            setConversationId(null);
          }
          newChat(true);
        }}
        returnFocusRef={settingsButton}
      />
      <HistorySheet
        open={historyOpen}
        activeId={conversationId}
        onClose={() => setHistoryOpen(false)}
        onSelectConversation={openConversation}
        onDeleteConversation={handleDeleteConversation}
        returnFocusRef={historyButton}
      />

      <DaySheet
        grab={grab}
        interactive={sheetOpen}
        items={tasks.filter((item) => {
          const resolvedForDay = resolveContext(context);
          if (item.time) {
            try {
              const itemDate = new Date(item.time);
              if (!isNaN(itemDate.getTime())) {
                const itemDateStr = formatLocalDate(itemDate);
                return itemDateStr >= resolvedForDay.start && itemDateStr <= resolvedForDay.end;
              }
            } catch {
              // ignore
            }
          }
          const todayStr = formatLocalDate(new Date());
          if (todayStr >= resolvedForDay.start && todayStr <= resolvedForDay.end) {
            return true;
          }
          if (item.createdAt) {
            try {
              const createdDateStr = formatLocalDate(new Date(item.createdAt));
              return createdDateStr >= resolvedForDay.start && createdDateStr <= resolvedForDay.end;
            } catch {
              // ignore
            }
          }
          return false;
        })}
        onToggle={handleToggleTask}
        onDelete={handleDeleteTask}
        onAdd={handleAddTask}
      />

      {/* ---- voice layer ---- */}
      <div className={styles.mascotLayer}>
        <div
          className={`${styles.mascotPos} ${(phase === "opening" || phase === "ending" || view === "chat") ? styles.noTouch : ""}`}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onClick={onMascotClick}
          role="button"
          aria-label={phase === "voice" ? "Cancel voice mode" : "Pull down to talk"}
          style={{ ["--lv" as string]: 0, ["--hop" as string]: 0 }}
        >
          <Mascot size={170} mood={happy ? "happy" : "idle"} morph={inVoice} />
        </div>
      </div>

      <div className={`${styles.voice} ${locked ? "" : styles.noTouch}`}>
        <p className={`${styles.listening} ${phase === "voice" ? styles.live : ""}`}>
          {speech.speaking ? "Speaking..." : "I am listening."}
        </p>
        <div className={styles.end}>
          <button className={styles.endBtn} onClick={close} aria-label="End"><HangupIcon /></button>
          <span>End</span>
        </div>
      </div>
      </div>
    </section>
  );
}
