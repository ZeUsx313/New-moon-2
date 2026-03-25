import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService, User } from '../services/auth';

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
    const loadUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Verify token and get user info
          const user = await authService.getCurrentUser();
          setUserInfo(user);
        } catch (err) {
          console.error('Session restore failed:', err);
          localStorage.removeItem('token');
          setUserInfo(null);
        }
      }
      setIsLoading(false);
    };
    loadUser();
  }, []);

  const login = (token: string, user: User) => {
    localStorage.setItem('token', token);
    setUserInfo(user);
    setIsAuthModalOpen(false);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUserInfo(null);
  };

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

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