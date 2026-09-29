import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authService, User, TOKEN_KEY } from '../services/auth';

interface AuthContextType {
  userInfo: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userInfo, setUserInfo] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    const loadUser = async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        try {
          // Verify token and get user info
          const user = await authService.getCurrentUser();
          if (alive) setUserInfo(user);
        } catch (err) {
          console.error('Session restore failed:', err);
          // 401 = expired/invalid token → drop it. Network errors keep the
          // token so a temporary outage doesn't log the user out.
          const status = (err as any)?.status;
          if (status === 401 || status === 403) {
            authService.clearToken();
            if (alive) setUserInfo(null);
          }
        }
      }
      if (alive) setIsLoading(false);
    };
    loadUser();

    // Keep auth state in sync across browser tabs (login/logout elsewhere)
    const onStorage = (e: StorageEvent) => {
      if (e.key !== TOKEN_KEY) return;
      if (!e.newValue) {
        setUserInfo(null);
      } else if (!localStorage.getItem(TOKEN_KEY)) {
        // token was removed externally
        setUserInfo(null);
      } else {
        authService.getCurrentUser().then((u) => setUserInfo(u)).catch(() => {});
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      alive = false;
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const login = useCallback((token: string, user: User) => {
    authService.setToken(token);
    setUserInfo(user);
    setIsAuthModalOpen(false);
  }, []);

  const logout = useCallback(() => {
    authService.clearToken();
    setUserInfo(null);
  }, []);

  const openAuthModal = useCallback(() => setIsAuthModalOpen(true), []);
  const closeAuthModal = useCallback(() => setIsAuthModalOpen(false), []);

  return (
    <AuthContext.Provider value={{
      userInfo,
      isAuthenticated: !!userInfo,
      isLoading,
      login,
      logout,
      isAuthModalOpen,
      openAuthModal,
      closeAuthModal
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
