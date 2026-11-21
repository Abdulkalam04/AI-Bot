"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import styles from "./HistorySheet.module.css";
import { XIcon, TrashIcon } from "./Icons";
import { listConversations, deleteConversation, type Conversation } from "@/lib/history";
import { STRINGS } from "@/lib/strings";

type Props = {
  open: boolean;
  activeId?: string | null;
  onClose: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation?: (id: string) => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
};

function formatRelativeDate(timestamp: number): string {
  const now = Date.now();
  const diff = Math.max(0, now - timestamp);
  const s = Math.floor(diff / 1000);
  if (s < 60) return "Just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 4) return `${w}w ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function HistorySheet({
  open,
  activeId,
  onClose,
  onSelectConversation,
  onDeleteConversation,
  returnFocusRef,
}: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (!open) return;
    setConversations(listConversations());
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

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteConversation(id);
    setConversations(listConversations());
    onDeleteConversation?.(id);
  };

  return (
    <div className={styles.layer} role="presentation">
      <button className={styles.backdrop} aria-label="Close history" onClick={onClose} />
      <div ref={panelRef} className={styles.sheet} role="dialog" aria-modal="true" aria-label="Chat history">
        <header className={styles.header}>
          <h2>History</h2>
          <button ref={closeRef} className={styles.close} aria-label={STRINGS.close} onClick={onClose}>
            <XIcon />
          </button>
        </header>

        <div className={styles.content}>
          {conversations.length === 0 ? (
            <div className={styles.empty}>No conversations yet.</div>
          ) : (
            <div className={styles.list}>
              {conversations.map((c) => {
                const isActive = c.id === activeId;
                return (
                  <div
                    key={c.id}
                    role="button"
                    tabIndex={0}
                    className={`${styles.item} ${isActive ? styles.activeItem : ""}`}
                    onClick={() => onSelectConversation(c.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectConversation(c.id);
                      }
                    }}
                  >
                    <div className={styles.itemContent}>
                      <span className={styles.itemTitle}>{c.title || "New chat"}</span>
                      <span className={styles.itemDate}>{formatRelativeDate(c.updatedAt || c.createdAt)}</span>
                    </div>
                    <button
                      type="button"
                      className={styles.deleteButton}
                      aria-label="Delete conversation"
                      onClick={(e) => handleDelete(e, c.id)}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

