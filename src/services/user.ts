import { http } from '../lib/http';

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
    return http.get<{ user: UserProfile }>(`/api/user/public-profile?${query.toString()}`);
  },

  async getUserStats(userId?: string, page: number = 1, limit: number = 20): Promise<UserStats> {
    const query = new URLSearchParams();
    if (userId) query.append('userId', userId);
    query.append('page', page.toString());
    query.append('limit', limit.toString());

    return http.get<UserStats>(`/api/user/stats?${query.toString()}`, { auth: true });
  },

  async updateProfile(data: {
    name?: string;
    email?: string;
    bio?: string;
    banner?: string;
    picture?: string;
    isHistoryPublic?: boolean;
  }): Promise<UserProfile> {
    return http.put<UserProfile>('/api/user/profile', data, { auth: true });
  },

  async uploadImage(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('image', file);
    return http.post<{ url: string }>('/api/upload', formData, { auth: true, rawBody: true, retries: 0, timeoutMs: 60000 });
  },
};
