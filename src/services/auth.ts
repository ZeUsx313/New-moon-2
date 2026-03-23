import { api } from './api';
import { deobfuscate } from '../utils/deobfuscate';

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

export const authService = {
  async signup(name: string, email: string, password: string): Promise<LoginResponse> {
    const res = await fetch(`${api.baseUrl}/auth/signup`, {
      method: 'POST',
      headers: api.headers,
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'فشل التسجيل');
    }
    const data: LoginResponse = await res.json();
    
    // 🔥 DEOBFUSCATE USER DATA
    if (data.user) {
      data.user.picture = deobfuscate(data.user.picture || '');
      data.user.banner = deobfuscate(data.user.banner || '');
    }
    
    return data;
  },

  async login(email: string, password: string): Promise<LoginResponse> {
    const res = await fetch(`${api.baseUrl}/auth/login`, {
      method: 'POST',
      headers: api.headers,
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'فشل تسجيل الدخول');
    }
    const data: LoginResponse = await res.json();
    
    // 🔥 DEOBFUSCATE USER DATA
    if (data.user) {
      data.user.picture = deobfuscate(data.user.picture || '');
      data.user.banner = deobfuscate(data.user.banner || '');
    }
    
    return data;
  },

  async getCurrentUser(): Promise<User> {
    const res = await fetch(`${api.baseUrl}/api/user`, {
      headers: {
        ...api.headers,
        ...api.getAuthHeader(),
      },
    });
    if (!res.ok) throw new Error('فشل جلب المستخدم');
    const data = await res.json();
    const user = data.user;
    
    // 🔥 DEOBFUSCATE USER DATA
    if (user) {
      user.picture = deobfuscate(user.picture || '');
      user.banner = deobfuscate(user.banner || '');
    }
    
    return user;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const res = await fetch(`${api.baseUrl}/auth/password`, {
      method: 'PUT',
      headers: {
        ...api.headers,
        ...api.getAuthHeader(),
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'فشل تغيير كلمة المرور');
    }
  },
};
