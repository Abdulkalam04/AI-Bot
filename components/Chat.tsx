"use client";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { MoonStarIcon, MusicIcon } from "./Icons";
import BookingCard from "./BookingCard";
import styles from "./Chat.module.css";
import { APP_NAME } from "@/lib/config";

export type Msg = {
  id: string;
  role: "user" | "typing" | "assistant" | "booking" | "reply";
  text?: string;
  actions?: ReactNode;               // free-form content under the text (Step 7 uses this for the booking card)
  choices?: Choice[];                // Quiet / Loud buttons
  chosen?: string;                   // id of the picked choice
  fromComposer?: boolean;            // bubble flies up from the composer
  context?: { label: string; iso: string };
  leaving?: boolean;
};
export type Choice = { id: string; label: string; icon: "moon" | "music" };

function Words({ text }: { text: string }) {
  return (
    <>
      {text.split(" ").map((w, i) => (
        <span key={i}>
          {i > 0 && " "}
          <span className={styles.w} style={{ animationDelay: `${i * 110}ms` }}>{w}</span>
        </span>
      ))}
    </>
  );
}

export default function Chat({ messages, onChoose, onViewBooking }: { messages: Msg[]; onChoose?: (msgId: string, choiceId: string) => void; onViewBooking?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  // keep the newest message in view
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const t = setTimeout(() => el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }), 60);
    return () => clearTimeout(t);
  }, [messages]);

  return (
    <div ref={ref} className={`${styles.chat} ${messages.some((message) => message.leaving) ? styles.leavingChat : ""}`}>
      {messages.map((m, index) => {
        if (m.role === "user")
          return (
            <div key={m.id} className={`${styles.userWrap} ${m.leaving ? styles.leaving : ""}`} style={m.leaving ? { animationDelay: `${index * 40}ms` } : undefined}>
              <div className={`${styles.user} ${m.fromComposer ? styles.fly : ""}`}>{m.text}</div>
              {m.context && m.context.label !== "Today" && <span className={styles.contextCaption}>for {m.context.label}</span>}
            </div>
          );
        if (m.role === "reply")
          return <div key={m.id} className={styles.reply}><Words text={m.text ?? ""} /></div>;
        if (m.role === "typing")
          return (
            <div key={m.id} className={styles.typing} aria-label={`${APP_NAME} is typing`}>
              <i /><i /><i />
            </div>
          );
        if (m.role === "booking") return <BookingCard key={m.id} onView={onViewBooking} />;
        return (
          <div key={m.id} className={styles.card}>
            <p className={styles.q}><Words text={m.text ?? ""} /></p>
            <div className={styles.actions}>
              {m.choices && (
                <div className={styles.choices}>
                  {m.choices.map((c) => (
                    <button
                      key={c.id}
                      disabled={!!m.chosen}
                      onClick={() => onChoose?.(m.id, c.id)}
                      className={`${styles.opt} ${m.chosen === c.id ? styles.on : ""} ${m.chosen && m.chosen !== c.id ? styles.off : ""}`}
                    >
                      {c.icon === "moon" ? <MoonStarIcon width={22} height={22} /> : <MusicIcon width={22} height={22} />}
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              )}
              {m.actions}
            </div>
          </div>
        );
      })}
    </div>
  );
}
