import { http, ApiError } from '../lib/http';
import { safeRemove } from '../lib/storage';

export interface User {
  _id: string;
  name: string;
  email: string;
  picture?: string;
  banner?: string;
  bio?: string;
  role: 'user' | 'admin' | 'contributor';
  isHistoryPublic: boolean;
  isCommentBlocked: boolean;
  createdAt: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export const TOKEN_KEY = 'token';

export const authService = {
  /** Store/clear the session token (used by the Google OAuth callback too). */
  setToken(token: string) {
    try { localStorage.setItem(TOKEN_KEY, token); } catch { /* ignore */ }
  },
  clearToken() {
    safeRemove(TOKEN_KEY);
  },

  async signup(name: string, email: string, password: string): Promise<LoginResponse> {
    return http.post<LoginResponse>('/auth/signup', { name, email, password });
  },

  async login(email: string, password: string): Promise<LoginResponse> {
    return http.post<LoginResponse>('/auth/login', { email, password });
  },

  async getCurrentUser(): Promise<User> {
    const data = await http.get<{ user: User }>('/api/user', { auth: true });
    if (!data?.user) throw new ApiError('فشل جلب بيانات المستخدم', 401);
    return data.user;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await http.put('/auth/password', { currentPassword, newPassword }, { auth: true });
  },
};
