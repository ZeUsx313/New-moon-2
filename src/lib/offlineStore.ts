/**
 * التخزين المحلي للقراءة دون اتصال — IndexedDB.
 *
 * كل رواية منزّلة تسجَّل في متجر `novels` وكل فصل بمحتواه الكامل
 * في متجر `chapters` (مفهرس بـ novelId). IndexedDB تتحمّل مئات
 * الميغابايتات بخلاف localStorage المحدود بـ ~5MB.
 *
 * كل الكتابة تُطلق حدث `moon-offline-change` حتى تتحدث الواجهات
 * (صفحة التنزيلات، زر التنزيل في صفحة الرواية) تلقائياً.
 */

const DB_NAME = 'moon_offline_db';
const DB_VERSION = 1;

export interface OfflineChapter {
  novelId: string;
  number: number;
  serverId?: string;
  title: string;
  content: string;
  copyrightStart?: string;
  copyrightEnd?: string;
  copyrightStyles?: unknown;
  /** حجم تقريبي بالبايت (لعرض استهلاك المساحة) */
  bytes: number;
  savedAt: string;
}

export interface OfflineNovel {
  _id: string;
  title: string;
  cover?: string;
  author?: string;
  description?: string;
  /** إجمالي الفصول على الخادم عند آخر تنزيل */
  chaptersCount: number;
  /** أرقام الفصول المنزّلة فعلياً */
  chapterNumbers: number[];
  /** عناوين الفصول المنزّلة (لعرض القائمة دون اتصال) */
  chapterTitles: Record<number, string>;
  bytes: number;
  downloadedAt: string;
  updatedAt: string;
  /** آخر فصل قرأه المستخدم من النسخة المنزّلة */
  lastReadNumber?: number;
}

export const OFFLINE_CHANGE_EVENT = 'moon-offline-change';

function emitChange(novelId?: string): void {
  try {
    window.dispatchEvent(new CustomEvent(OFFLINE_CHANGE_EVENT, { detail: { novelId } }));
  } catch { /* بيئة بلا window — تجاهل */ }
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB غير مدعوم في هذا المتصفح'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('novels')) {
        db.createObjectStore('novels', { keyPath: '_id' });
      }
      if (!db.objectStoreNames.contains('chapters')) {
        const store = db.createObjectStore('chapters', { keyPath: ['novelId', 'number'] });
        store.createIndex('novelId', 'novelId', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error || new Error('فشل فتح قاعدة البيانات المحلية'));
    };
    req.onblocked = () => {
      // تبويب آخر يحمّل نسخة قديمة — نعيد المحاولة لاحقاً
      dbPromise = null;
    };
  });
  return dbPromise;
}

function tx<T>(
  stores: string[],
  mode: IDBTransactionMode,
  run: (t: IDBTransaction) => IDBRequest<T> | void,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(stores, mode);
        let request: IDBRequest<T> | void;
        t.oncomplete = () => resolve((request as IDBRequest<T>)?.result as T);
        t.onerror = () => reject(t.error || new Error('فشل تخزين البيانات محلياً'));
        t.onabort = () => reject(t.error || new Error('أُجهضت عملية التخزين المحلي'));
        request = run(t);
      }),
  );
}

function idbPut(store: string, value: any): Promise<void> {
  return tx([store], 'readwrite', (t) => {
    t.objectStore(store).put(value);
  }) as Promise<void>;
}

function idbGet<T>(store: string, key: IDBValidKey): Promise<T | undefined> {
  return tx<T>([store], 'readonly', (t) => t.objectStore(store).get(key) as IDBRequest<T>);
}

function idbDelete(store: string, key: IDBValidKey): Promise<void> {
  return tx([store], 'readwrite', (t) => {
    t.objectStore(store).delete(key);
  }) as Promise<void>;
}

function idbGetAll<T>(store: string): Promise<T[]> {
  return tx<T[]>([store], 'readonly', (t) => t.objectStore(store).getAll() as IDBRequest<T[]>);
}

/** حجم تقريبي بالبايت لنص الفصل (UTF-16) */
export const estimateBytes = (content: string): number => (content || '').length * 2;

export const offlineStore = {
  // ---------- novels ----------
  async putNovel(novel: OfflineNovel): Promise<void> {
    await idbPut('novels', { ...novel, updatedAt: new Date().toISOString() });
    emitChange(novel._id);
  },

  async getNovel(novelId: string): Promise<OfflineNovel | undefined> {
    return idbGet<OfflineNovel>('novels', novelId);
  },

  async listNovels(): Promise<OfflineNovel[]> {
    const list = await idbGetAll<OfflineNovel>('novels');
    return list.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  },

  async deleteNovel(novelId: string): Promise<void> {
    await offlineStore.deleteAllChapters(novelId);
    await idbDelete('novels', novelId);
    emitChange(novelId);
  },

  /** يحدّث حقول الرواية دون مساس بالفصول (آخر قراءة، عدد الفصول…) */
  async patchNovel(novelId: string, patch: Partial<OfflineNovel>): Promise<OfflineNovel | undefined> {
    const existing = await offlineStore.getNovel(novelId);
    if (!existing) return undefined;
    const next: OfflineNovel = { ...existing, ...patch, _id: existing._id, updatedAt: new Date().toISOString() };
    await idbPut('novels', next);
    emitChange(novelId);
    return next;
  },

  // ---------- chapters ----------
  async putChapter(chapter: OfflineChapter): Promise<void> {
    await idbPut('chapters', chapter);
  },

  async getChapter(novelId: string, number: number): Promise<OfflineChapter | undefined> {
    if (!Number.isFinite(number)) return undefined;
    return idbGet<OfflineChapter>('chapters', [novelId, number]);
  },

  /** كل فصول رواية واحدة (فهرس novelId) — مرتبة تصاعدياً */
  async listChapters(novelId: string): Promise<OfflineChapter[]> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const t = db.transaction(['chapters'], 'readonly');
      const req = t.objectStore('chapters').index('novelId').getAll(novelId) as IDBRequest<OfflineChapter[]>;
      t.oncomplete = () => resolve((req.result || []).sort((a, b) => a.number - b.number));
      t.onerror = () => reject(t.error || new Error('فشل جلب الفصول المحلية'));
    });
  },

  async deleteChapter(novelId: string, number: number): Promise<void> {
    await idbDelete('chapters', [novelId, number]);
    const novel = await offlineStore.getNovel(novelId);
    if (novel) {
      const set = new Set(novel.chapterNumbers || []);
      const bytes = novel.bytes - (await offlineStore.getChapter(novelId, number).then((c) => c?.bytes || 0));
      set.delete(number);
      const titles = { ...(novel.chapterTitles || {}) };
      delete titles[number];
      await offlineStore.patchNovel(novelId, { chapterNumbers: Array.from(set).sort((a, b) => a - b), chapterTitles: titles, bytes: Math.max(0, bytes) });
    } else {
      emitChange(novelId);
    }
  },

  async deleteAllChapters(novelId: string): Promise<void> {
    const chapters = await offlineStore.listChapters(novelId);
    await Promise.all(chapters.map((c) => idbDelete('chapters', [novelId, c.number])));
  },

  /**
   * تسجيل فصل داخل الرواية (أرقام + عناوين + حجم) — يُستدعى من محرك
   * التنزيل ومن التخزين التلقائي أثناء القراءة.
   * ذرّية: قراءة+دمج+كتابة في معاملة واحدة حتى لا يفقد العمال
   * المتزامنون تحديثات بعضهم (كل كتابة ترى آخر حالة ملتزمة).
   */
  async registerChapter(novelId: string, chapter: { number: number; title?: string; bytes: number }): Promise<void> {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction(['novels'], 'readwrite');
      const store = t.objectStore('novels');
      const getReq = store.get(novelId);
      getReq.onsuccess = () => {
        const novel = getReq.result as OfflineNovel | undefined;
        if (!novel) return; // الرواية غير متتبعة — لا حاجة لتحديث الوصف
        const set = new Set(novel.chapterNumbers || []);
        const existed = set.has(chapter.number);
        set.add(chapter.number);
        const titles = { ...(novel.chapterTitles || {}) };
        if (chapter.title) titles[chapter.number] = chapter.title;
        store.put({
          ...novel,
          chapterNumbers: Array.from(set).sort((a, b) => a - b),
          chapterTitles: titles,
          bytes: existed ? novel.bytes : (novel.bytes || 0) + chapter.bytes,
          updatedAt: new Date().toISOString(),
        });
      };
      t.oncomplete = () => {
        emitChange(novelId);
        resolve();
      };
      t.onerror = () => reject(t.error || new Error('فشل تسجيل الفصل محلياً'));
      t.onabort = () => reject(t.error || new Error('أُجهض تسجيل الفصل'));
    });
  },

  /** هل الفصل منزّل؟ (سريع — بدون قراءة المحتوى) */
  async hasChapter(novelId: string, number: number): Promise<boolean> {
    const novel = await offlineStore.getNovel(novelId);
    return !!novel?.chapterNumbers?.includes(number);
  },

  /** مساحة التخزين المستخدمة (إن دعمها المتصفح) */
  async storageEstimate(): Promise<{ usage: number; quota: number } | null> {
    try {
      if (navigator.storage?.estimate) {
        const est = await navigator.storage.estimate();
        return { usage: est.usage || 0, quota: est.quota || 0 };
      }
    } catch { /* ignore */ }
    return null;
  },
};
