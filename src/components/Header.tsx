import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home as HomeIcon, Library, User, Search, Sun, Moon, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

// استيراد الصورة من مجلد assets
import logoImg from '../assets/AF32FFD4-DC2A-4D6A-9C05-F0A2E7288DC9.png';

interface HeaderProps {
  isDarkMode: boolean;
  setIsDarkMode: (value: boolean) => void;
}

export default function Header({ isDarkMode, setIsDarkMode }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, openAuthModal } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const navItems = [
    { path: '/', label: 'الرئيسية', icon: <HomeIcon size={18} /> },
    { path: '/library', label: 'المكتبة', icon: <Library size={18} /> },
    { path: '/my-page', label: 'صفحتي', icon: <User size={18} />, protected: true },
  ];

  const handleNavClick = (e: React.MouseEvent, item: any) => {
    // Always close the mobile menu when navigating
    setIsMenuOpen(false);
    if (item.protected && !isAuthenticated) {
      e.preventDefault();
      openAuthModal();
    }
  };

  // Close the mobile menu whenever the route changes (back button, logo, etc.)
  useEffect(() => {
    setIsMenuOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);

  // Lock body scroll while the fullscreen mobile menu is open
  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMenuOpen]);

  const isActive = (path: string) => location.pathname === path;

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    setSearchOpen(false);
    setSearchQuery('');
    navigate(q ? `/library?q=${encodeURIComponent(q)}` : '/library');
  };

  return (
    <>
      {/* تم استخدام relative ليكون الهيدر غير ثابت في جميع الشاشات */}
      <nav className="relative z-50 w-full h-16 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-white/10 shadow-sm">
        <div className="max-w-7xl mx-auto h-full px-4 md:px-8 flex items-center justify-start gap-6">

          {/* Logo Section */}
          <Link to="/" className="flex items-center group" aria-label="الصفحة الرئيسية">
            <img
              src={logoImg}
              alt="شعار قمر الروايات"
              className="h-12 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
            />
          </Link>

          {/* Desktop Navigation - محاذاة لليمين بجانب الشعار */}
          <div className="hidden md:flex items-center gap-6 h-full">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={(e) => handleNavClick(e, item)}
                className="relative flex items-center gap-2 h-full text-gray-300 hover:text-white transition-colors group"
              >
                <span className="text-current group-hover:text-white transition-colors">{item.icon}</span>
                <span className="text-xs font-medium">{item.label}</span>

                {isActive(item.path) && (
                  <motion.div
                    layoutId="activeUnderline"
                    className="absolute bottom-3 left-0 right-0 h-0.5 bg-white rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </Link>
            ))}
          </div>

          {/* Actions Section - مدفوعة لأقصى اليسار */}
          <div className="flex items-center gap-1 md:gap-2 ms-auto">
            <button
              onClick={() => setSearchOpen((v) => !v)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-300 hover:text-white"
              aria-label="بحث"
              title="بحث"
            >
              <Search size={18} />
            </button>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-300 hover:text-white"
              aria-label={isDarkMode ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع المظلم'}
              title={isDarkMode ? 'الوضع الفاتح' : 'الوضع المظلم'}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={() => setIsMenuOpen(true)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-300 hover:text-white md:hidden"
              aria-label="فتح القائمة"
            >
              <Menu size={18} />
            </button>
          </div>
        </div>

        {/* Search bar (expands under the header) */}
        <AnimatePresence>
          {searchOpen && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={submitSearch}
              className="absolute top-full inset-x-0 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-white/10 overflow-hidden z-50"
            >
              <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex gap-2">
                <input
                  type="search"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن رواية بالاسم أو المؤلف…"
                  aria-label="بحث في الروايات"
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl py-2.5 px-4 text-white placeholder:text-white/40 focus:outline-none focus:border-primary transition-colors text-sm"
                  dir="rtl"
                />
                <button
                  type="submit"
                  className="px-5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/80 transition-colors"
                >
                  بحث
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed inset-0 z-[60] bg-[#0a0a0a] text-white md:hidden p-8 flex flex-col gap-8"
            role="dialog"
            aria-modal="true"
            aria-label="القائمة الرئيسية"
          >
            <div className="flex justify-between items-center">
              <img
                src={logoImg}
                alt="شعار قمر الروايات"
                className="h-16 w-auto object-contain"
              />
              <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-white/10 rounded-full" aria-label="إغلاق القائمة">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-0 mt-8 divide-y divide-white/10">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={(e) => handleNavClick(e, item)}
                  className="flex items-center gap-4 py-5 text-xl font-bold text-white hover:text-white/80 transition-colors"
                >
                  <span className="text-white">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
