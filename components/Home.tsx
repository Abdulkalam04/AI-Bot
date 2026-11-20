"use client";
import { useEffect, useRef, useState } from "react";
import { ComposeIcon, CalendarIcon, HangupIcon, SlidersIcon, UtensilsIcon, XIcon } from "./Icons";
import Mascot from "./Mascot";
import Composer from "./Composer";
import Chat, { Msg } from "./Chat";
import DaySheet from "./DaySheet";
import styles from "./Home.module.css";

type Phase = "home" | "dragging" | "opening" | "voice" | "ending";
const clamp = (n: number, a = 0, b = 1) => Math.min(b, Math.max(a, n));

export default function Home() {
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("home");
  const [view, setView] = useState<"home" | "chat">("home");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [sheet, setSheet] = useState(0);        // 0 closed .. 1 open (Saturday sheet)
  const [sheetDrag, setSheetDrag] = useState(false);
  const [p, setP] = useState(0); // 0 = home, 1 = voice mode. Drives everything through the --p CSS variable.

  const root = useRef<HTMLElement>(null);
  const drag = useRef<{ y: number; moved: boolean } | null>(null);
  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  /* ---- Plan dinner -> chat ---- */
  const startDinner = () => {
    if (phase !== "home" || view === "chat") return;
    setView("chat"); // mascot flies to the bottom-right (--cx / --cy)
    later(() => setMsgs([{ id: "u1", role: "user", text: "Find somewhere for dinner Friday" }]), 150);
    later(() => setMsgs((m) => [...m, { id: "t1", role: "typing" }]), 950);
    later(
      () =>
        setMsgs((m) => [
          ...m.filter((x) => x.role !== "typing"),
          { id: "a1", role: "assistant", text: "Somewhere quiet or somewhere loud?" },
        ]),
      2100
    );
    // buttons fade in once the words have finished streaming
    later(
      () =>
        setMsgs((m) =>
          m.map((x) =>
            x.id === "a1"
              ? { ...x, choices: [
                  { id: "quiet", label: "Quiet", icon: "moon" as const },
                  { id: "loud", label: "Loud", icon: "music" as const },
                ] }
              : x
          )
        ),
      3300
    );
  };

  const choose = (msgId: string, choiceId: string) => {
    setMsgs((m) => m.map((x) => (x.id === msgId ? { ...x, chosen: choiceId } : x)));
    const label = choiceId === "quiet" ? "Quiet" : "Loud";
    later(() => setMsgs((m) => [...m, { id: "u2", role: "user", text: label }]), 300);
    later(() => setMsgs((m) => [...m, { id: "t2", role: "typing" }]), 1250);
    later(() => setMsgs((m) => [...m.filter((x) => x.role !== "typing"), { id: "b1", role: "booking" }]), 2700);
  };
  const newChat = () => {
    if (phase !== "home") return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setMsgs([]);
    setView("home");
    setText("");
  };

  /* ---- sending a message from the composer ---- */
  const send = () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    if (view !== "chat") return;
    const id = Math.random().toString(36).slice(2, 7);
    setMsgs((m) => [...m, { id: "u" + id, role: "user", text: t, fromComposer: true }]);
    later(() => setMsgs((m) => [...m, { id: "t" + id, role: "typing" }]), 550);
    // canned reply for now (the backend will replace this)
    later(
      () =>
        setMsgs((m) => [
          ...m.filter((x) => x.role !== "typing"),
          { id: "r" + id, role: "reply", text: "Got it. I will keep that in mind." },
        ]),
      1800
    );
  };

  /* ---- Saturday sheet ---- */
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

  const open = () => {
    setPhase("opening");
    setP(1);
    later(() => setPhase("voice"), 900); // ^ ^ eyes -> pill eyes, text turns dark
  };
  const close = () => {
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

  const happy = (phase === "dragging" && p > 0.35) || phase === "opening";
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
        <button className={`${styles.round} ${styles.fadeSl}`} aria-label="Settings"><SlidersIcon /></button>
        <div className={styles.goChat}>
          <div className={styles.pull}>
            <div className={styles.slot} data-splash-target /> {/* the real mascot floats above this spot */}
            <span>Pull me down</span>
          </div>
        </div>
        <button className={styles.round} aria-label={sheetOpen ? "Close" : "New chat"} onClick={sheetOpen ? closeSheet : newChat}>
          <span className={styles.swapA}><ComposeIcon /></span>
          <span className={styles.swapB}><XIcon /></span>
        </button>
      </header>

      <div className={`${styles.body} ${styles.dim}`}>
      <div className={`${styles.center} ${styles.goChat} ${locked || view === "chat" ? styles.noTouch : ""}`}>
        <h1>Good evening.</h1>
        <p>Three things moving. One needs you.</p>
        <div className={styles.chips}>
          <button className={styles.chip}><CalendarIcon width={17} height={17} />My day</button>
          <button className={styles.chip} onClick={startDinner}><UtensilsIcon width={17} height={17} />Plan dinner</button>
        </div>
      </div>
      <div className={`${styles.chatWrap} ${view === "chat" && !sheetOpen ? "" : styles.noTouch}`}>
        <Chat messages={msgs} onChoose={choose} onViewBooking={openSheet} />
      </div>
      </div>

      <div className={`${styles.fadeS} ${locked || sheetOpen ? styles.noTouch : ""}`}>
        <Composer value={text} onChange={setText} onSend={send} onVoice={view === "home" ? open : undefined} recording={phase !== "home"} />
      </div>

      <DaySheet grab={grab} interactive={sheetOpen} />

      {/* ---- voice layer ---- */}
      <div className={styles.mascotLayer}>
        <div
          className={`${styles.mascotPos} ${inVoice || phase === "ending" || view === "chat" ? styles.noTouch : ""}`}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          role="button"
          aria-label="Pull down to talk"
        >
          <Mascot size={170} mood={happy ? "happy" : "idle"} morph={inVoice} />
        </div>
      </div>

      <div className={`${styles.voice} ${locked ? "" : styles.noTouch}`}>
        <p className={`${styles.listening} ${phase === "voice" ? styles.live : ""}`}>I am listening.</p>
        <div className={styles.end}>
          <button className={styles.endBtn} onClick={close} aria-label="End"><HangupIcon /></button>
          <span>End</span>
        </div>
      </div>
      </div>
    </section>
  );
}
