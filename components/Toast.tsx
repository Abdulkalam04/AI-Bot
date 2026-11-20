"use client";
import { useEffect } from "react";
import styles from "./Toast.module.css";

export default function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, 3000);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;
  return <div className={styles.toast} role="status" aria-live="polite">{message}</div>;
}
