import { api } from './api';

export interface Category {
  id: string;
  name: string;
}

export const categoryService = {
  async getCategories(): Promise<Category[]> {
    const res = await fetch(`${api.baseUrl}/api/categories`);
    if (!res.ok) throw new Error('فشل جلب التصنيفات');
    return res.json();
  },
};