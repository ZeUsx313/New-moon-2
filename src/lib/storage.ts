/**
 * Crash-proof localStorage JSON helpers.
 * A single corrupt key must never white-screen the app again.
 */

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return (parsed ?? fallback) as T;
  } catch {
    // Corrupt value — remove it so future reads are clean
    try { localStorage.removeItem(key); } catch { /* ignore */ }
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode / quota exceeded — non-fatal
  }
}

export function readNumberArray(key: string): number[] {
  const arr = readJSON<unknown>(key, []);
  if (!Array.isArray(arr)) return [];
  return arr.map(Number).filter((n) => Number.isFinite(n));
}

export function safeRemove(key: string): void {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}
