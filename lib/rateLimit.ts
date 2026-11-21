type RateLimitEntry = {
  timestamps: number[];
};

const store = new Map<string, RateLimitEntry>();

// Clean up stale entries periodically to prevent memory leaks
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupStale(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, entry] of store.entries()) {
    const fresh = entry.timestamps.filter((t) => now - t < windowMs);
    if (fresh.length === 0) {
      store.delete(key);
    } else {
      entry.timestamps = fresh;
    }
  }
}

/**
 * In-memory sliding-window rate limiter per user.
 * @param key Unique identifier (e.g. user ID or email)
 * @param limit Max allowed requests within the window (default 30)
 * @param windowMs Window size in milliseconds (default 60,000 = 1 minute)
 */
export function checkRateLimit(
  key: string,
  limit = 30,
  windowMs = 60_000
): {
  allowed: boolean;
  remaining: number;
  resetMs: number;
} {
  const now = Date.now();
  cleanupStale(windowMs);

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Retain only timestamps inside the sliding window
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= limit) {
    const oldest = entry.timestamps[0];
    const resetMs = Math.max(0, windowMs - (now - oldest));
    return {
      allowed: false,
      remaining: 0,
      resetMs,
    };
  }

  entry.timestamps.push(now);
  return {
    allowed: true,
    remaining: limit - entry.timestamps.length,
    resetMs: windowMs,
  };
}

