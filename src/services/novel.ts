import { api } from './api';
import { deobfuscate } from '../utils/deobfuscate';

export interface Novel {
  _id: string;
  title: string;
  titleEn?: string;
  author: string;
  authorEmail?: string;
  cover: string;
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

    const res = await fetch(`${api.baseUrl}/api/novels?${query.toString()}`);
    if (!res.ok) throw new Error('فشل جلب الروايات');
    const data: NovelListResponse = await res.json();
    
    // 🔥 DEOBFUSCATE NOVEL COVERS
    data.novels = data.novels.map(n => ({
      ...n,
      cover: deobfuscate(n.cover)
    }));
    
    return data;
  },

  async getNovelById(id: string): Promise<Novel> {
    const res = await fetch(`${api.baseUrl}/api/novels/${id}`);
    if (!res.ok) throw new Error('فشل جلب تفاصيل الرواية');
    const data: Novel = await res.json();
    
    // 🔥 DEOBFUSCATE NOVEL COVER
    data.cover = deobfuscate(data.cover);
    
    return data;
  },

  async incrementView(novelId: string, chapterNumber: number): Promise<void> {
    const res = await fetch(`${api.baseUrl}/api/novels/${novelId}/view`, {
      method: 'POST',
      headers: {
        ...api.headers,
        ...api.getAuthHeader(),
      },
      body: JSON.stringify({ chapterNumber }),
    });
    if (!res.ok) throw new Error('فشل زيادة المشاهدة');
  },

  async getChaptersList(id: string, page: number = 1, limit: number = 25, sort: 'asc' | 'desc' = 'asc'): Promise<ChapterMeta[]> {
    const res = await fetch(`${api.baseUrl}/api/novels/${id}/chapters-list?page=${page}&limit=${limit}&sort=${sort}`);
    if (!res.ok) throw new Error('فشل جلب قائمة الفصول');
    return res.json();
  },

  async getChapter(novelId: string, chapterId: string): Promise<ChapterFull> {
    const res = await fetch(`${api.baseUrl}/api/novels/${novelId}/chapters/${chapterId}`);
    if (!res.ok) throw new Error('فشل جلب محتوى الفصل');
    const data: ChapterFull = await res.json();
    
    // 🔥 DEOBFUSCATE CHAPTER CONTENT
    data.content = deobfuscate(data.content);
    
    return data;
  },

  async reactToNovel(novelId: string, type: 'like' | 'love' | 'funny' | 'sad' | 'angry'): Promise<{
    like: number;
    love: number;
    funny: number;
    sad: number;
    angry: number;
    userReaction: string | null;
  }> {
    const res = await fetch(`${api.baseUrl}/api/novels/${novelId}/react`, {
      method: 'POST',
      headers: {
        ...api.headers,
        ...api.getAuthHeader(),
      },
      body: JSON.stringify({ type }),
    });
    if (!res.ok) throw new Error('فشل تسجيل التفاعل');
    return res.json();
  },

  async updateReadingStatus(data: {
    novelId: string;
    title?: string;
    cover?: string;
    author?: string;
    isFavorite?: boolean;
    lastChapterId?: number;
    lastChapterTitle?: string;
  }): Promise<any> {
    const res = await fetch(`${api.baseUrl}/api/novel/update`, {
      method: 'POST',
      headers: {
        ...api.headers,
        ...api.getAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('فشل تحديث حالة القراءة');
    return res.json();
  },

  async getUserLibrary(userId?: string, type?: 'favorites' | 'history', page: number = 1, limit: number = 20): Promise<any[]> {
    const query = new URLSearchParams();
    if (userId) query.append('userId', userId);
    if (type) query.append('type', type);
    query.append('page', page.toString());
    query.append('limit', limit.toString());

    const res = await fetch(`${api.baseUrl}/api/novel/library?${query.toString()}`, {
      headers: api.getAuthHeader(),
    });
    if (!res.ok) throw new Error('فشل جلب المكتبة');
    const data: any[] = await res.json();
    
    // 🔥 DEOBFUSCATE COVERS
    return data.map(item => ({
      ...item,
      cover: deobfuscate(item.cover)
    }));
  },

  async getNovelStatus(novelId: string): Promise<any> {
    const res = await fetch(`${api.baseUrl}/api/novel/status/${novelId}`, {
      headers: api.getAuthHeader(),
    });
    if (!res.ok) throw new Error('فشل جلب حالة الرواية');
    const data = await res.json();
    
    // 🔥 DEOBFUSCATE COVER
    if (data && data.cover) {
      data.cover = deobfuscate(data.cover);
    }
    
    return data;
  },
};
