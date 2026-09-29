// src/reader/storage.ts
// Web replacement for @react-native-async-storage/async-storage.
// Same async API surface (getItem/setItem/removeItem) backed by localStorage
// so the reader modules copied from the mobile app work unchanged.

const memory = new Map<string, string>();

export const storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(key) ?? memory.get(key) ?? null;
    } catch {
      return memory.get(key) ?? null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(key, value);
    } catch {
      // localStorage can throw in private mode / quota — fall back to memory
      memory.set(key, value);
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
    memory.delete(key);
  },
};
