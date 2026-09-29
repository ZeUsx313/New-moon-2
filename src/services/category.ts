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
};
