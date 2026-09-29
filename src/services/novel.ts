import { http, ApiError } from '../lib/http';
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

  async getNovelById(id: string): Promise<Novel> {
    return http.get<Novel>(`/api/novels/${id}`);
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

  async getChaptersList(id: string, page: number = 1, limit: number = 25, sort: 'asc' | 'desc' = 'asc'): Promise<ChapterMeta[]> {
    const data = await http.get<any>(`/api/novels/${id}/chapters-list?page=${page}&limit=${limit}&sort=${sort}`);
    // The server wraps the list as { chapters: [...] } — accept both shapes
    const list = Array.isArray(data) ? data : Array.isArray(data?.chapters) ? data.chapters : null;
    if (!list) throw new ApiError('فشل جلب قائمة الفصول', 0, data);
    return list;
  },

  async getChapter(novelId: string, chapterId: string): Promise<ChapterFull> {
    return http.get<ChapterFull>(`/api/novels/${novelId}/chapters/${chapterId}`, { retries: 0 });
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
