import { http, ApiError } from '../lib/http';

export interface Category {
  id: string;
  name: string;
}

export const categoryService = {
  async getCategories(): Promise<Category[]> {
    const data = await http.get<Category[]>('/api/categories');
    if (!Array.isArray(data)) throw new ApiError('فشل جلب التصنيفات', 0, data);
    return data;
  },

  /** إضافة تصنيف جديد (مشرف فقط) — نفس نداء التطبيق */
  async addCategory(name: string): Promise<any> {
    return http.post('/api/admin/categories', { category: name }, { auth: true, retries: 0 });
  },

  /** حذف تصنيف من قاعدة البيانات (مشرف فقط) — نفس نداء التطبيق */
  async deleteCategory(name: string): Promise<any> {
    return http.delete(`/api/admin/categories/${encodeURIComponent(name)}`, { auth: true, retries: 0 });
  },
};
