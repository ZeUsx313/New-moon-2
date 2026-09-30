import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { UIProvider } from './src/context/UIContext';
import AuthRequirementModal from './src/components/Modal/AuthRequirementModal';
import ErrorBoundary from './src/components/ErrorBoundary';
import ScrollToTop from './src/components/ScrollToTop';
import OfflineBanner from './src/components/OfflineBanner';
import Footer from './src/components/Footer';
import BottomNav from './src/components/BottomNav';
import CaptchaGate from './src/components/CaptchaGate';
import { trackPageview } from './src/lib/analytics';
import Home from './src/screens/Home';

// Route-level code splitting: the heavy screens (reader shell, profile, pages)
// load on demand so the initial bundle stays small and fast.
const NovelPage = lazy(() => import('./src/screens/NovelPage'));
const Library = lazy(() => import('./src/screens/Library'));
const MyPage = lazy(() => import('./src/screens/MyPage'));
const UserProfile = lazy(() => import('./src/screens/UserProfile'));
const Downloads = lazy(() => import('./src/screens/Downloads'));
const Reader = lazy(() => import('./src/screens/Reader'));
const Login = lazy(() => import('./src/screens/auth/Login'));
const Signup = lazy(() => import('./src/screens/auth/Signup'));
const GoogleCallback = lazy(() => import('./src/screens/auth/GoogleCallback'));
const NotFound = lazy(() => import('./src/screens/NotFound'));
const Dashboard = lazy(() => import('./src/screens/dashboard/Dashboard'));
const About = lazy(() => import('./src/screens/StaticPages').then((m) => ({ default: m.About })));
const Privacy = lazy(() => import('./src/screens/StaticPages').then((m) => ({ default: m.Privacy })));
const Terms = lazy(() => import('./src/screens/StaticPages').then((m) => ({ default: m.Terms })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-10 h-10 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );
}

/**
 * Global auth-required modal — rendered ONCE at the app root so every
 * openAuthModal() call (صفحتي / المفضلة / التفاعلات / التعليقات...) actually
 * shows something. Previously the state flipped but nothing was ever mounted,
 * which made buttons like «صفحتي» appear completely dead for guests.
 */
function GlobalAuthModal() {
  const { isAuthModalOpen, closeAuthModal } = useAuth();
  return <AuthRequirementModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />;
}

/** Footer shows on all normal pages, but not inside the immersive reader.
 *  BottomNav floats on the same pages — content reserves room for it.
 *  الشريط السفلي يختفي (مع حجز المساحة) داخل صفحة الرواية وصفحة العضو والقارئ. */
function Layout() {
  const location = useLocation();
  const isReader = /^\/novel\/[^/]+\/reader\//.test(location.pathname);
  const isNovelPage = /^\/novel\/[^/]+\/?$/.test(location.pathname);
  const isMemberPage = /^\/user\/[^/]+/.test(location.pathname);
  const navHiddenRoute = isReader || isNovelPage || isMemberPage;

  // 📊 تتبع الزيارات (Google-style analytics) — صفحة لكل تغيير مسار
  React.useEffect(() => {
    trackPageview(location.pathname + location.search);
  }, [location.pathname, location.search]);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={navHiddenRoute ? undefined : { paddingBottom: 'calc(86px + env(safe-area-inset-bottom, 0px))' }}
    >
      <OfflineBanner />
      <div className="flex-1 flex flex-col">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/novel/:slug" element={<NovelPage />} />
            <Route path="/novel/:novelId/reader/:chapterId" element={<Reader />} />
            <Route path="/library" element={<Library />} />
            <Route path="/downloads" element={<Downloads />} />
            <Route path="/my-page" element={<MyPage />} />
            <Route path="/user/:userId" element={<UserProfile />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/auth/google/callback" element={<GoogleCallback />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </div>
      {!isReader && <Footer />}
      <BottomNav forceHidden={navHiddenRoute} />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AuthProvider>
              <UIProvider>
                <Router>
                <ScrollToTop />
                <GlobalAuthModal />
                <CaptchaGate />
                <Toaster
                  position="top-center"
                  reverseOrder={false}
                  toastOptions={{
                    style: {
                      background: '#1a1a1a',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.1)',
                      fontFamily: "'Cairo', sans-serif",
                    },
                  }}
                />
                <Layout />
                </Router>
              </UIProvider>
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}
