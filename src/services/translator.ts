/**
 * خدمة أدوات الترجمة والإدارة — نقاط النهاية الكاملة التي يستخدمها التطبيق:
 * وظائف الترجمة الآلية، المصطلحات، إعدادات المزودين، ترجمة البيانات،
 * توليد العناوين، استخراج العناوين، مفاتيح السكرابر، المنظف، الحقوق.
 * كلها عبر http الموحد (توكن + مهلة + رسائل عربية).
 */
import { http } from '../lib/http';

const list = <T>(data: any): T[] => (Array.isArray(data) ? data : data?.items || data?.jobs || []);

/* ═══════════ 🔍 المراجع الذكي — مراجعة جودة الفصول بالذكاء الاصطناعي ═══════════
 * نفس نقاط نمط المترجم الذكي: مهام (قائمة/تفاصيل/إيقاف/حذف/استئناف) + فصول معلَّمة */
export const reviewService = {
  async getJobs(): Promise<any[]> { return list(await http.get('/api/review/jobs', { auth: true })); },
  async getJob(id: string): Promise<any> { return http.get(`/api/review/jobs/${id}`, { auth: true }); },
  async start(payload: { novelId?: string; chapters?: 'all' | number[]; jobId?: string }): Promise<any> {
    return http.post('/api/review/start', payload, { auth: true, retries: 0, timeoutMs: 30000 });
  },
  async pauseJob(id: string): Promise<any> { return http.post(`/api/review/jobs/${id}/pause`, {}, { auth: true }); },
  async deleteJob(id: string): Promise<any> { return http.delete(`/api/review/jobs/${id}`, { auth: true }); },
  async getNovels(search = '', page = 1, limit = 20): Promise<any[]> {
    const q = new URLSearchParams({ search, page: String(page), limit: String(limit) });
    return list(await http.get(`/api/review/novels?${q}`, { auth: true }));
  },
  /* الفصول التي بها خلل: بلا novelId = روايات مجمعة، مع novelId = فصول الرواية */
  async getFindings(novelId?: string): Promise<any[]> {
    return list(await http.get(novelId ? `/api/review/findings?novelId=${novelId}` : '/api/review/findings', { auth: true }));
  },
  async removeFinding(id: string): Promise<any> { return http.delete(`/api/review/findings/${id}`, { auth: true }); },
  async reReviewFlagged(novelId: string): Promise<any> {
    return http.post('/api/review/findings/re-review', { novelId }, { auth: true, retries: 0, timeoutMs: 30000 });
  },
};

export const translatorService = {
  /* ═══════════ الترجمة الآلية (jobs) ═══════════ */
  async getJobs(): Promise<any[]> { return list(await http.get('/api/translator/jobs', { auth: true })); },
  async getJob(id: string): Promise<any> { return http.get(`/api/translator/jobs/${id}`, { auth: true }); },
  async start(payload: { novelId?: string; chapters?: 'all' | number[]; resumeFrom?: number; jobId?: string }): Promise<any> {
    return http.post('/api/translator/start', payload, { auth: true, retries: 0, timeoutMs: 30000 });
  },
  async pauseJob(id: string): Promise<any> { return http.post(`/api/translator/jobs/${id}/pause`, {}, { auth: true }); },
  async deleteJob(id: string): Promise<any> { return http.delete(`/api/translator/jobs/${id}`, { auth: true }); },

  /* ═══════════ روايات المترجم (مع chaptersCount) ═══════════ */
  async getTranslatorNovels(search = '', page = 1, limit = 20): Promise<any[]> {
    const q = new URLSearchParams({ search, page: String(page), limit: String(limit) });
    return list(await http.get(`/api/translator/novels?${q}`, { auth: true }));
  },

  /* ═══════════ المصطلحات (Glossary) ═══════════ */
  async getGlossary(novelId: string): Promise<any[]> { return list(await http.get(`/api/translator/glossary/${novelId}`, { auth: true })); },
  async upsertTerm(novelId: string, term: string, translation: string, category = 'other', description = ''): Promise<any> {
    return http.post('/api/translator/glossary', { novelId, term, translation, category, description }, { auth: true });
  },
  async deleteTerm(id: string): Promise<any> { return http.delete(`/api/translator/glossary/${id}`, { auth: true }); },
  async bulkDeleteTerms(ids: string[]): Promise<any> { return http.post('/api/translator/glossary/bulk-delete', { ids }, { auth: true }); },

  /* ═══════════ إعدادات الترجمة والمزودين ═══════════ */
  async getSettings(): Promise<any> { return http.get('/api/translator/settings', { auth: true }); },
  async saveSettings(payload: any): Promise<any> { return http.post('/api/translator/settings', payload, { auth: true }); },
  async fetchProviderModels(baseUrl: string, apiKey: string): Promise<any[]> {
    const res = await http.post('/api/translator/providers/models', { baseUrl, apiKey }, { auth: true, timeoutMs: 30000 });
    return list(res);
  },

  /* ═══════════ ترجمة بيانات الروايات (Metadata) ═══════════ */
  async getMetadataJobs(): Promise<any[]> { return list(await http.get('/api/translator/metadata-jobs', { auth: true })); },
  async getMetadataJob(id: string): Promise<any> { return http.get(`/api/translator/metadata-jobs/${id}`, { auth: true }); },
  async startMetadataTranslation(novelId: string): Promise<any> { return http.post(`/api/admin/novels/${novelId}/translate-metadata`, {}, { auth: true }); },
  async deleteMetadataJob(id: string): Promise<any> { return http.delete(`/api/translator/metadata-jobs/${id}`, { auth: true }); },

  /* ═══════════ توليد عناوين الفصول (Title Generator) ═══════════ */
  async getTitleGenSettings(): Promise<any> { return http.get('/api/title-gen/settings', { auth: true }); },
  async saveTitleGenSettings(payload: { prompt?: string; apiKeys?: string[] }): Promise<any> { return http.post('/api/title-gen/settings', payload, { auth: true }); },
  async getTitleGenJobs(): Promise<any[]> { return list(await http.get('/api/title-gen/jobs', { auth: true })); },
  async getTitleGenJob(id: string): Promise<any> { return http.get(`/api/title-gen/jobs/${id}`, { auth: true }); },
  async startTitleGen(payload: { novelId?: string; chapters?: 'all' | number[]; jobId?: string }): Promise<any> {
    return http.post('/api/title-gen/start', payload, { auth: true, retries: 0 });
  },
  async pauseTitleGen(id: string): Promise<any> { return http.post(`/api/title-gen/jobs/${id}/pause`, {}, { auth: true }); },
  async deleteTitleGenJob(id: string): Promise<any> { return http.delete(`/api/title-gen/jobs/${id}`, { auth: true }); },

  /* قائمة فصول رواية كاملة (منتقي النطاقات في مولد العناوين) —
     نفس نداء التطبيق: GET /api/novels/{id}/chapters-list?limit=10000
     الرد إما مصفوفة قديمة أو { chapters, total, totalPages } */
  async getNovelChaptersList(novelId: string): Promise<any[]> {
    const res = await http.get(`/api/novels/${novelId}/chapters-list?limit=10000`, { auth: true });
    return Array.isArray(res) ? res : res?.chapters || [];
  },

  /* ═══════════ استخراج/إصلاح عناوين الفصول ═══════════ */
  async getExtractJobs(): Promise<any[]> { return list(await http.get('/api/admin/tools/extract-titles/jobs', { auth: true })); },
  async getExtractJob(id: string): Promise<any> { return http.get(`/api/admin/tools/extract-titles/jobs/${id}`, { auth: true }); },
  async startExtract(novelId: string): Promise<any> { return http.post('/api/admin/tools/extract-titles/start', { novelId }, { auth: true }); },
  async deleteExtractJob(id: string): Promise<any> { return http.delete(`/api/admin/tools/extract-titles/jobs/${id}`, { auth: true }); },

  /* ═══════════ مفاتيح السكرابر + كوكيز TomatoMTL ═══════════ */
  async getScraperKeys(): Promise<{ keys: string[]; tomatomtlCookies?: string; wtrlabCookies?: string }> { return http.get('/api/admin/scraper-keys', { auth: true }); },
  async saveScraperKeys(keys: string[]): Promise<any> { return http.post('/api/admin/scraper-keys', { keys }, { auth: true, timeoutMs: 60000 }); },
  async checkScraperKeys(): Promise<any> { return http.get('/api/admin/scraper-keys/check', { auth: true, timeoutMs: 60000 }); },
  async saveTomatomtlCookies(cookies: string): Promise<any> { return http.post('/api/admin/scraper-keys', { tomatomtlCookies: cookies }, { auth: true, timeoutMs: 60000 }); },
  async checkTomatomtlSession(): Promise<{ ok?: boolean; message?: string }> { return http.post('/api/admin/scraper-keys/check-tomatomtl', {}, { auth: true, timeoutMs: 150000 }); },
  async saveWtrlabCookies(cookies: string): Promise<any> { return http.post('/api/admin/scraper-keys', { wtrlabCookies: cookies }, { auth: true, timeoutMs: 60000 }); },
  async checkWtrlabSession(): Promise<{ ok?: boolean; message?: string }> { return http.post('/api/admin/scraper-keys/check-wtrlab', {}, { auth: true, timeoutMs: 150000 }); },
  async getWatchlist(): Promise<any[]> { return list(await http.get('/api/admin/watchlist', { auth: true })); },

  /* ═══════════ المنظف العام (كلمات تُنزع من كل الفصول) ═══════════ */
  async getCleanerWords(): Promise<string[]> { return list(await http.get('/api/admin/cleaner', { auth: true })); },
  async addCleanerWord(word: string): Promise<any> { return http.post('/api/admin/cleaner', { word }, { auth: true, timeoutMs: 60000 }); },
  async updateCleanerWord(index: number, word: string): Promise<any> { return http.put(`/api/admin/cleaner/${index}`, { word }, { auth: true, timeoutMs: 60000 }); },
  async deleteCleanerWord(word: string): Promise<any> { return http.delete(`/api/admin/cleaner/${encodeURIComponent(word)}`, { auth: true, timeoutMs: 60000 }); },

  /* ═══════════ إشعارات الحقوق العامة ═══════════ */
  async getCopyright(): Promise<any> { return http.get('/api/admin/copyright', { auth: true }); },
  async saveCopyright(payload: any): Promise<any> { return http.post('/api/admin/copyright', payload, { auth: true }); },

  /* ═══════════ تصدير رواية (JSON) ═══════════ */
  async exportNovel(novelId: string): Promise<void> {
    const res = await fetch(`${(await import('../services/api')).api.baseUrl}/api/admin/novels/${novelId}/export`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
    });
    if (!res.ok) throw new Error('فشل التصدير');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `novel-${novelId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
