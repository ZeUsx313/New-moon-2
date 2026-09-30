import { http, ApiError } from '../lib/http';
import { apiCache } from '../lib/apiCache';
import { readNumberArray, writeJSON } from '../lib/storage';

/** Guards: endpoints that MUST return arrays (server errors sometimes return objects) */
function ensureArray<T>(data: any, message: string): T[] {
  if (!Array.isArray(data)) throw new ApiError(message, 0, data);
  return data;
}

export interface Novel {
  _id: string;
  title: string;
  titleEn?: string;
  author: string;
  authorEmail?: string;
  authorId?: string;
  cover: string;
  banner?: string;
  description: string;
  category: string;
  tags: string[];
  status: string;
  rating: number;
  views: number;
  favorites: number;
  lastChapterUpdate: string;
  createdAt: string;
  chaptersCount: number;
  chapters?: ChapterMeta[];
}

export interface ChapterMeta {
  _id: string;
  number: number;
  title: string;
  createdAt: string;
  views: number;
}

export interface ChapterFull {
  _id: string;
  number: number;
  title: string;
  content: string;
  copyrightStart: string;
  copyrightEnd: string;
  copyrightStyles: {
    color: string;
    fontSize: number;
    alignment: 'left' | 'center' | 'right';
    isBold: boolean;
    opacity: number;
  };
  totalChapters: number;
  createdAt: string;
  views: number;
}

export interface NovelListResponse {
  novels: Novel[];
  currentPage: number;
  totalPages: number;
  totalNovels: number;
}

export interface ChaptersListResponse {
  chapters: ChapterMeta[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Cache TTLs — chapter lists rarely change mid-session; the novel header even less. */
export const CHAPTERS_LIST_TTL = 5 * 60 * 1000;
export const NOVEL_BY_ID_TTL = 2 * 60 * 1000;

export const novelCache = {
  /** Drop everything cached about one novel (its header + all chapter pages). */
  invalidateNovel(novelId: string): void {
    apiCache.invalidate(`novel:${novelId}`);
    apiCache.invalidatePrefix(`chlist:${novelId}:`);
  },
};

export const novelService = {
  async getNovels(params: {
    filter?: string;
    search?: string;
    category?: string;
    status?: string;
    sort?: string;
    page?: number;
    limit?: number;
    timeRange?: 'day' | 'week' | 'month';
  }): Promise<NovelListResponse> {
    const query = new URLSearchParams();
    if (params.filter) query.append('filter', params.filter);
    if (params.search) query.append('search', params.search);
    if (params.category && params.category !== 'all') query.append('category', params.category);
    if (params.status && params.status !== 'all') query.append('status', params.status);
    if (params.sort) query.append('sort', params.sort);
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.timeRange) query.append('timeRange', params.timeRange);

    return http.get<NovelListResponse>(`/api/novels?${query.toString()}`);
  },

  /**
   * Novel header — cached 2 min (memory + sessionStorage) with in-flight dedup.
   * Re-entering the same novel page within TTL costs ZERO network requests.
   * `bypass` forces a real fetch (pull-to-refresh / after editing).
   */
  async getNovelById(id: string, bypass = false): Promise<Novel> {
    return apiCache.wrap(
      `novel:${id}`,
      NOVEL_BY_ID_TTL,
      () => http.get<Novel>(`/api/novels/${id}`),
      bypass,
    );
  },

  async incrementView(novelId: string, chapterNumber: number): Promise<void> {
    try {
      // 🔥 NO AUTH REQUIRED FOR VIEWS - EVERYONE COUNTS
      await http.post(`/api/novels/${novelId}/view`, { chapterNumber }, { retries: 0, timeoutMs: 8000 });
    } catch (error) {
      // View counting must never break reading
      console.error('Failed to increment view:', error);
    }
  },

  /**
   * Paginated chapters list — server-side pagination + optional server search.
   * Returns the FULL server envelope (chapters/total/totalPages) so callers can
   * paginate on the server's own truth (hidden chapters + search included).
   * Cached 5 min per (novel, page, limit, sort, search) — flipping back and
   * forth between pages or re-entering the novel never re-hits the network.
   */
  async getChaptersListFull(
    id: string,
    page: number = 1,
    limit: number = 25,
    sort: 'asc' | 'desc' = 'asc',
    search: string = '',
    bypass = false,
  ): Promise<ChaptersListResponse> {
    const key = `chlist:${id}:${page}:${limit}:${sort}:${search.trim().toLowerCase()}`;
    return apiCache.wrap(key, CHAPTERS_LIST_TTL, async () => {
      const qs = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sort,
      });
      const q = search.trim();
      if (q) qs.append('search', q);
      const data = await http.get<any>(`/api/novels/${id}/chapters-list?${qs.toString()}`);
      // The server wraps the list as { chapters: [...] } — accept both shapes
      const list = Array.isArray(data) ? data : Array.isArray(data?.chapters) ? data.chapters : null;
      if (!list) throw new ApiError('فشل جلب قائمة الفصول', 0, data);
      return {
        chapters: list,
        total: Number(data?.total) || list.length,
        page: Number(data?.page) || page,
        limit: Number(data?.limit) || limit,
        totalPages: Number(data?.totalPages) || Math.ceil((Number(data?.total) || list.length) / limit) || 1,
      };
    }, bypass);
  },

  /** Back-compat helper: plain array shape. */
  async getChaptersList(
    id: string,
    page: number = 1,
    limit: number = 25,
    sort: 'asc' | 'desc' = 'asc',
    search: string = '',
    bypass = false,
  ): Promise<ChapterMeta[]> {
    const res = await novelService.getChaptersListFull(id, page, limit, sort, search, bypass);
    return res.chapters;
  },

  /**
   * جلب فصل كامل.
   * - auth: يُرسل التوكن تلقائياً إن وُجد — المسجلون يحصلون على ميزانية
   *   أوسع في حدود سرعة الخادم (قراءة عادية أسرع دون 429).
   * - batch: يعلن أن الطلب جزء من تنزيل للقراءة دون إنترنت (X-Moon-Batch)
   *   فيمنحه الخادم ميزانية الدفعات السخية بدل حد القراءة العادي.
   */
  async getChapter(
    novelId: string,
    chapterId: string,
    opts: { batch?: boolean } = {},
  ): Promise<ChapterFull> {
    return http.get<ChapterFull>(`/api/novels/${novelId}/chapters/${chapterId}`, {
      retries: 0,
      auth: true,
      headers: opts.batch ? { 'X-Moon-Batch': 'offline-download' } : undefined,
    });
  },

  async reactToNovel(novelId: string, type: 'like' | 'love' | 'funny' | 'sad' | 'angry'): Promise<{
    like: number;
    love: number;
    funny: number;
    sad: number;
    angry: number;
    userReaction: string | null;
  }> {
    return http.post(`/api/novels/${novelId}/react`, { type }, { auth: true });
  },

  /**
   * Updates reading status / favorites on the server for logged-in users.
   * Guest progress is always tracked locally.
   * Returns { success } so callers never mistake a failure for success.
   */
  async updateReadingStatus(data: {
    novelId: string;
    title?: string;
    cover?: string;
    author?: string;
    isFavorite?: boolean;
    lastChapterId?: number;
    lastChapterTitle?: string;
  }): Promise<{ success: boolean }> {
    // 🔥 GUEST PROGRESS: Always save to localStorage
    if (data.lastChapterId) {
      const readChapters = readNumberArray(`read_chapters_${data.novelId}`);
      if (!readChapters.includes(data.lastChapterId)) {
        readChapters.push(data.lastChapterId);
        writeJSON(`read_chapters_${data.novelId}`, readChapters);
      }

      // Save last read chapter for "Continue Reading"
      writeJSON(`last_read_${data.novelId}`, {
        id: data.lastChapterId,
        title: data.lastChapterTitle,
        time: new Date().toISOString(),
      });
    }

    const token = localStorage.getItem('token');
    if (!token) return { success: true }; // Silent success for guests

    try {
      await http.post('/api/novel/update', data, { auth: true, retries: 0 });
      return { success: true };
    } catch (error) {
      console.error('Failed to update reading status:', error);
      return { success: false };
    }
  },

  async getUserLibrary(userId?: string, type?: 'favorites' | 'history', page: number = 1, limit: number = 20): Promise<any[]> {
    const query = new URLSearchParams();
    if (userId) query.append('userId', userId);
    if (type) query.append('type', type);
    query.append('page', page.toString());
    query.append('limit', limit.toString());

    const data = await http.get<any[]>(`/api/novel/library?${query.toString()}`, { auth: true });
    return ensureArray(data, 'فشل جلب المكتبة');
  },

  async getNovelStatus(novelId: string): Promise<any> {
    return http.get(`/api/novel/status/${novelId}`, { auth: true });
  },
};
