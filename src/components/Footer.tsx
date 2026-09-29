import React from 'react';
import { Link } from 'react-router-dom';
import { SITE_NAME } from '../lib/site';

/**
 * Site footer — sticks to the bottom of the viewport on short pages
 * (parent layout is min-h-screen flex flex-col + mt-auto) and is pushed
 * down naturally on long pages.
 */
export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-white/10 bg-black/60 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="text-center md:text-right">
            <p className="text-white font-bold text-lg">{SITE_NAME}</p>
            <p className="text-white/40 text-xs mt-1">منصة قراءة الروايات العربية والعالمية المترجمة</p>
          </div>

          {/* Links */}
          <nav aria-label="روابط الموقع" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
            <Link to="/" className="text-white/60 hover:text-white transition-colors">الرئيسية</Link>
            <Link to="/library" className="text-white/60 hover:text-white transition-colors">المكتبة</Link>
            <Link to="/about" className="text-white/60 hover:text-white transition-colors">من نحن</Link>
            <Link to="/privacy" className="text-white/60 hover:text-white transition-colors">سياسة الخصوصية</Link>
            <Link to="/terms" className="text-white/60 hover:text-white transition-colors">شروط الاستخدام</Link>
          </nav>

          {/* Copyright */}
          <p className="text-white/30 text-xs">
            © {year} {SITE_NAME} — جميع الحقوق محفوظة
          </p>
        </div>
      </div>
    </footer>
  );
}
