import type { Msg } from "@/components/Chat";

export type Conversation = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Msg[];
};

const STORAGE_KEY = "puddle-history";

export function listConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is Conversation => Boolean(item && typeof item === "object" && typeof item.id === "string"))
      .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  } catch {
    return [];
  }
}

export function getConversation(id: string): Conversation | null {
  if (typeof window === "undefined") return null;
  try {
    const list = listConversations();
    return list.find((item) => item.id === id) ?? null;
  } catch {
    return null;
  }
}

export function saveConversation(c: Conversation): void {
  if (typeof window === "undefined") return;
  try {
    const list = listConversations();
    const index = list.findIndex((item) => item.id === c.id);
    let next: Conversation[];
    if (index >= 0) {
      next = [...list];
      next[index] = c;
    } else {
      next = [c, ...list];
    }
    next.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Quota exceeded or storage restricted
  }
}

export function deleteConversation(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const list = listConversations();
    const next = list.filter((item) => item.id !== id);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage access failure
  }
}

export function clearAll(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage access failure
  }
}

