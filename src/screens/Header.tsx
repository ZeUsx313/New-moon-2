import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home as HomeIcon, Library, User, Search, Sun, Moon, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HeaderProps {
  isDarkMode: boolean;
  setIsDarkMode: (value: boolean) => void;
}

export default function Header({ isDarkMode, setIsDarkMode }: HeaderProps) {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { path: '/', label: 'الرئيسية', icon: <HomeIcon size={20} /> },
    { path: '/library', label: 'المكتبة', icon: <Library size={20} /> },
    { path: '/my-page', label: 'صفحتي', icon: <User size={20} /> },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <nav className="sticky top-0 z-50 w-full h-16 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-white/10 shadow-sm">
        <div className="max-w-7xl mx-auto h-full px-4 md:px-8 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img
              src="https://storage.azoramoon.com/public/upload/2025/12/24/c925c7f3-2310-4e90-9b62-7fae04fe1c36.webp"
              alt="Azora Logo"
              className="h-12 w-12 object-contain"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8 h-full">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="relative flex items-center gap-2 h-full text-gray-300 hover:text-white transition-colors"
              >
                <span className="text-current">{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
                {isActive(item.path) && (
                  <motion.div
                    layoutId="activeUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-300 hover:text-white">
              <Search size={20} />
            </button>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-300 hover:text-white"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button
              onClick={() => setIsMenuOpen(true)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-300 hover:text-white md:hidden"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed inset-0 z-[60] bg-[#0a0a0a] text-white md:hidden p-8 flex flex-col gap-8"
          >
            <div className="flex justify-between items-center">
              <img
                src="https://storage.azoramoon.com/public/upload/2025/12/24/c925c7f3-2310-4e90-9b62-7fae04fe1c36.webp"
                alt="Logo"
                className="h-12"
              />
              <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-white/10 rounded-full">
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
                  onClick={() => setIsMenuOpen(false)}
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