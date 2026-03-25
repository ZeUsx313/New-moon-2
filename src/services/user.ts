import { api } from './api';

export interface UserProfile {
  _id: string;
  name: string;
  email: string;
  picture?: string;
  banner?: string;
  bio?: string;
  role: string;
  createdAt: string;
  isHistoryPublic: boolean;
}

export interface UserStats {
  user: UserProfile;
  readChapters: number;
  addedChapters: number;
  totalViews: number;
  myWorks: any[];
  worksPage: number;
}

export const userService = {
  async getPublicProfile(email?: string, userId?: string): Promise<{ user: UserProfile }> {
    const query = new URLSearchParams();
    if (email) query.append('email', email);
    if (userId) query.append('userId', userId);
    const res = await fetch(`${api.baseUrl}/api/user/public-profile?${query.toString()}`);
    if (!res.ok) throw new Error('فشل جلب الملف الشخصي');
    const data = await res.json();
    
    // 🔥 USE IMAGE PROXY FOR USER IMAGES
    if (data.user) {
      if (data.user.picture) {
        data.user.picture = `${api.baseUrl}/api/image-proxy?url=${encodeURIComponent(data.user.picture)}`;
      }
      if (data.user.banner) {
        data.user.banner = `${api.baseUrl}/api/image-proxy?url=${encodeURIComponent(data.user.banner)}`;
      }
    }
    
    return data;
  },

  async getUserStats(userId?: string, page: number = 1, limit: number = 20): Promise<UserStats> {
    const query = new URLSearchParams();
    if (userId) query.append('userId', userId);
    query.append('page', page.toString());
    query.append('limit', limit.toString());

    const res = await fetch(`${api.baseUrl}/api/user/stats?${query.toString()}`, {
      headers: api.getAuthHeader(),
    });
    if (!res.ok) throw new Error('فشل جلب إحصائيات المستخدم');
    const data: UserStats = await res.json();
    
    // 🔥 USE IMAGE PROXY FOR USER IMAGES
    if (data.user) {
      if (data.user.picture) {
        data.user.picture = `${api.baseUrl}/api/image-proxy?url=${encodeURIComponent(data.user.picture)}`;
      }
      if (data.user.banner) {
        data.user.banner = `${api.baseUrl}/api/image-proxy?url=${encodeURIComponent(data.user.banner)}`;
      }
    }
    
    return data;
  },

  async updateProfile(data: {
    name?: string;
    email?: string;
    bio?: string;
    banner?: string;
    picture?: string;
    isHistoryPublic?: boolean;
  }): Promise<UserProfile> {
    const res = await fetch(`${api.baseUrl}/api/user/profile`, {
      method: 'PUT',
      headers: {
        ...api.headers,
        ...api.getAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'فشل تحديث الملف الشخصي');
    }
    return res.json();
  },

  async uploadImage(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch(`${api.baseUrl}/api/upload`, {
      method: 'POST',
      headers: api.getAuthHeader(),
      body: formData,
    });
    if (!res.ok) throw new Error('فشل رفع الصورة');
    return res.json();
  },
};
