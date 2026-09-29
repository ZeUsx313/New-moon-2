/**
 * Tiny client-side API cache — "سرعة الخارق بأقل استهلاك".
 *
 * Every cached GET becomes:
 *   1. Instant from the in-memory Map (same session, same tab).
 *   2. Instant from sessionStorage (new tab / reload within TTL) — hydrated
 *      back into memory lazily.
 *   3. Deduped while in-flight (10 components mounting at once = 1 request).
 *
 * Nothing here ever blocks a network refresh: callers decide freshness via
 * TTL and can always force a real fetch (bypass) for pull-to-refresh flows.
 */

interface CacheEntry<T> {
  value: T;
  at: number;
  ttl: number;
}

const memory = new Map<string, CacheEntry<any>>();
const inflight = new Map<string, Promise<any>>();

const SESSION_PREFIX = 'apicache_v1_';
/** Hard cap so sessionStorage never blows up (chapters lists are small, but still). */
const MAX_PERSISTED_BYTES = 900_000;

function now(): number {
  return Date.now();
}

function isFresh(entry: CacheEntry<any>): boolean {
  return now() - entry.at < entry.ttl;
}

function readSession<T>(key: string): CacheEntry<T> | null {
  try {
    const raw = sessionStorage.getItem(SESSION_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !('value' in parsed)) return null;
    return parsed as CacheEntry<T>;
  } catch {
    return null;
  }
}

function writeSession<T>(key: string, entry: CacheEntry<T>): void {
  try {
    const raw = JSON.stringify(entry);
    if (raw.length > MAX_PERSISTED_BYTES) return;
    sessionStorage.setItem(SESSION_PREFIX + key, raw);
  } catch {
    // QuotaFull / private mode — memory cache still works.
  }
}

export const apiCache = {
  /** Get from memory, then sessionStorage. Returns null when absent/expired. */
  get<T>(key: string, ttl: number): T | null {
    const mem = memory.get(key);
    if (mem && isFresh(mem)) return mem.value as T;
    if (mem && !isFresh(mem)) memory.delete(key);

    const sess = readSession<T>(key);
    if (sess) {
      // Respect the TTL the caller expects now (may differ from when stored).
      const entry: CacheEntry<T> = { value: sess.value, at: sess.at, ttl };
      if (isFresh(entry)) {
        memory.set(key, entry);
        return entry.value;
      }
      try { sessionStorage.removeItem(SESSION_PREFIX + key); } catch { /* ignore */ }
    }
    return null;
  },

  set<T>(key: string, value: T, ttl: number): void {
    const entry: CacheEntry<T> = { value, at: now(), ttl };
    memory.set(key, entry);
    writeSession(key, entry);
  },

  /** Drop one key (and its persisted copy). */
  invalidate(key: string): void {
    memory.delete(key);
    try { sessionStorage.removeItem(SESSION_PREFIX + key); } catch { /* ignore */ }
  },

  /** Drop every key that starts with the prefix (memory + session). */
  invalidatePrefix(prefix: string): void {
    for (const key of Array.from(memory.keys())) {
      if (key.startsWith(prefix)) memory.delete(key);
    }
    try {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith(SESSION_PREFIX + prefix)) sessionStorage.removeItem(k);
      }
    } catch { /* ignore */ }
  },

  /**
   * Cached GET with in-flight dedup.
   * - `ttl` <= 0 → plain pass-through (still dedupes concurrent calls).
   * - `bypass` → skip reads entirely and overwrite the cache with fresh data.
   */
  async wrap<T>(key: string, ttl: number, fetcher: () => Promise<T>, bypass = false): Promise<T> {
    if (!bypass) {
      const hit = apiCache.get<T>(key, ttl);
      if (hit !== null) return hit;
    }
    const running = inflight.get(key);
    if (running) return running as Promise<T>;

    const promise = (async () => {
      try {
        const value = await fetcher();
        apiCache.set(key, value, ttl);
        return value;
      } finally {
        inflight.delete(key);
      }
    })();
    inflight.set(key, promise);
    return promise;
  },
};
