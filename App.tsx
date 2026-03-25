import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AuthRequirementModal from './src/components/Modal/AuthRequirementModal';
import Home from './src/screens/Home';
import NovelPage from './src/screens/NovelPage';
import Library from './src/screens/Library';
import MyPage from './src/screens/MyPage';
import Reader from './src/screens/Reader';
import { Login, Signup } from './src/screens/auth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
      retry: 1,
    },
  },
});

function AppContent() {
  const { isAuthModalOpen, closeAuthModal } = useAuth();

  return (
    <Router>
      <Toaster position="top-center" reverseOrder={false} />
      <AuthRequirementModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/novel/:slug" element={<NovelPage />} />
        <Route path="/novel/:novelId/reader/:chapterId" element={<Reader />} />
        <Route path="/library" element={<Library />} />
        <Route path="/my-page" element={<MyPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Routes>
    </Router>
  );
}

export default function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}