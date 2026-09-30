/**
 * خدمة لوحة التحكم (الترجمة/الإدارة) — تتكامل مع مسارات /api/admin/* الخادمية.
 * صلاحيات: admin (الكل) و contributor (رواياته فقط — يفرضها الخادم).
 */
import { http } from '../lib/http';

export interface AdminNovel {
  _id: string;
  title: string;
  titleEn?: string;
  cover: string;
  description?: string;
  category?: string;
  tags?: string[];
  status?: string;
  author?: string;
  authorEmail?: string;
  authorId?: string;
  chaptersCount?: number;
  views?: number;
  lastChapterUpdate?: string;
  createdAt?: string;
}

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'admin' | 'contributor';
  picture?: string;
  createdAt?: string;
}

export interface ScraperLog {
  _id: string;
  message: string;
  level?: string;
  timestamp: string;
}

export const adminService = {
  // ═══════════ الروايات ═══════════
  async createNovel(data: {
    title: string;
    titleEn?: string;
    cover: string;
    description?: string;
    category?: string;
    tags?: string[];
    status?: string;
  }): Promise<{ message: string; novelId: string }> {
    return http.post('/api/admin/novels', data, { auth: true, retries: 0 });
  },

  async updateNovel(id: string, data: {
    title?: string;
    titleEn?: string;
    cover?: string;
    description?: string;
    category?: string;
    tags?: string[];
    status?: string;
  }): Promise<AdminNovel> {
    return http.put(`/api/admin/novels/${id}`, data, { auth: true, retries: 0 });
  },

  async deleteNovel(id: string): Promise<void> {
    await http.delete(`/api/admin/novels/${id}`, { auth: true, retries: 0 });
  },

  // ═══════════ الفصول ═══════════
  async addChapter(data: { novelId: string; number: number; title: string; content: string }): Promise<{ message: string }> {
    return http.post('/api/admin/chapters', data, { auth: true, retries: 0, timeoutMs: 60000 });
  },

  async updateChapter(novelId: string, chapterNumber: number, data: { title?: string; content?: string }): Promise<{ message: string }> {
    return http.put(`/api/admin/chapters/${novelId}/${chapterNumber}`, data, { auth: true, retries: 0, timeoutMs: 60000 });
  },

  async deleteChapter(novelId: string, chapterNumber: number): Promise<void> {
    await http.delete(`/api/admin/chapters/${novelId}/${chapterNumber}`, { auth: true, retries: 0 });
  },

  async batchDeleteChapters(novelId: string, numbers: number[]): Promise<{ message?: string }> {
    return http.post('/api/admin/chapters/batch-delete', { novelId, numbers }, { auth: true, retries: 0, timeoutMs: 60000 });
  },

  async bulkUploadZip(novelId: string, file: File): Promise<{ message?: string }> {
    const form = new FormData();
    form.append('zip', file);
    form.append('novelId', novelId);
    return http.post('/api/admin/chapters/bulk-upload', form, { auth: true, rawBody: true, retries: 0, timeoutMs: 120000 });
  },

  // ═══════════ المستخدمون (admin) ═══════════
  async getUsers(): Promise<AdminUser[]> {
    return http.get<AdminUser[]>('/api/admin/users', { auth: true });
  },

  async setUserRole(userId: string, role: string): Promise<void> {
    await http.put(`/api/admin/users/${userId}/role`, { role }, { auth: true, retries: 0 });
  },

  // ═══════════ التصنيفات (admin) ═══════════
  async addCategory(name: string): Promise<void> {
    await http.post('/api/admin/categories', { name }, { auth: true, retries: 0 });
  },

  async deleteCategory(name: string): Promise<void> {
    await http.delete(`/api/admin/categories/${encodeURIComponent(name)}`, { auth: true, retries: 0 });
  },

  // ═══════════ السجلات ═══════════
  async getLogs(): Promise<ScraperLog[]> {
    return http.get<ScraperLog[]>('/api/scraper/logs', { auth: true });
  },

  // ═══════════ الأمان (admin) ═══════════
  async getSecurityBans(): Promise<{ bans: { ip: string; reason: string; until: number; requests: number }[] }> {
    return http.get('/api/admin/security/bans', { auth: true });
  },

  async unbanIp(ip: string): Promise<void> {
    await http.post('/api/admin/security/unban', { ip }, { auth: true, retries: 0 });
  },

  async getSecurityStats(): Promise<any> {
    return http.get('/api/admin/security/stats', { auth: true });
  },

  // ═══════════ التحليلات (admin) ═══════════
  async getAnalyticsSummary(days = 7): Promise<any> {
    return http.get(`/api/analytics/summary?days=${days}`, { auth: true });
  },
};
