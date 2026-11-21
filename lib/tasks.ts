export type DayItem = {
  id: string;
  title: string;
  note?: string;
  time?: string; // ISO datetime string
  status: "in_progress" | "done";
  createdAt: number;
};

const STORAGE_KEY = "puddle-tasks";

export function listTasks(): DayItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is DayItem =>
        Boolean(item && typeof item === "object" && typeof item.id === "string" && typeof item.title === "string")
    );
  } catch {
    return [];
  }
}

export function getTask(id: string): DayItem | null {
  if (typeof window === "undefined") return null;
  try {
    const list = listTasks();
    return list.find((item) => item.id === id) ?? null;
  } catch {
    return null;
  }
}

export function createTask(data: { title: string; note?: string; time?: string }): DayItem {
  const newItem: DayItem = {
    id: "t_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    title: data.title.trim(),
    ...(data.note?.trim() ? { note: data.note.trim() } : {}),
    ...(data.time?.trim() ? { time: data.time.trim() } : {}),
    status: "in_progress",
    createdAt: Date.now(),
  };

  if (typeof window !== "undefined") {
    try {
      const list = listTasks();
      const next = [newItem, ...list];
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage error or quota exceeded
    }
  }

  return newItem;
}

export function updateTask(id: string, updates: Partial<Omit<DayItem, "id" | "createdAt">>): DayItem | null {
  if (typeof window === "undefined") return null;
  try {
    const list = listTasks();
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) return null;

    const updated: DayItem = { ...list[index], ...updates };
    const next = [...list];
    next[index] = updated;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return updated;
  } catch {
    return null;
  }
}

export function toggleTask(id: string): DayItem | null {
  if (typeof window === "undefined") return null;
  try {
    const list = listTasks();
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) return null;

    const current = list[index];
    const nextStatus: "in_progress" | "done" = current.status === "in_progress" ? "done" : "in_progress";
    const updated: DayItem = { ...current, status: nextStatus };
    const next = [...list];
    next[index] = updated;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return updated;
  } catch {
    return null;
  }
}

export function deleteTask(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const list = listTasks();
    const next = list.filter((item) => item.id !== id);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage error
  }
}

export function clearAllTasks(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage error
  }
}

