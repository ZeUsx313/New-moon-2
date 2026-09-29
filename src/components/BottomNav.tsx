import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Library, Download, User } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';

/**
 * الشريط السفلي العائم — بروح مجرة الروايات (حبة زجاجية عائمة)
 * وبألوان قمر الروايات. كل العناصر تعمل فعلاً:
 *   الرئيسية / المكتبة / التنزيلات / صفحتي (بوابة مصادقة للزوار).
 * يُخفى داخل القارئ (يقرر ذلك App.tsx) ويتمركز على الشاشات الكبيرة
 * بعرض محدود كما في التصميم المرجعي.
 */

const ITEM_BASE = 'relative flex flex-col items-center justify-center gap-1 rounded-2xl min-h-[44px] transition-colors duration-200 select-none';

interface NavItem {
  to: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  match: (p: string) => boolean;
  protected?: boolean;
}

const ITEMS: NavItem[] = [
  {
    to: '/',
    label: 'الرئيسية',
    Icon: Home,
    match: (p: string) => p === '/',
  },
  {
    to: '/library',
    label: 'المكتبة',
    Icon: Library,
    match: (p: string) => p.startsWith('/library') || p.startsWith('/novel/'),
  },
  {
    to: '/downloads',
    label: 'التنزيلات',
    Icon: Download,
    match: (p: string) => p.startsWith('/downloads'),
  },
  {
    to: '/my-page',
    label: 'صفحتي',
    Icon: User,
    match: (p: string) => p.startsWith('/my-page'),
    protected: true,
  },
];

export default function BottomNav() {
  const location = useLocation();
  const { isAuthenticated, openAuthModal } = useAuth();

  const handleItemClick = (e: React.MouseEvent, item: NavItem) => {
    if (item.protected && !isAuthenticated && !location.pathname.startsWith(item.to)) {
      e.preventDefault();
      openAuthModal();
      return;
    }
    // إعادة الضغط على العنصر النشط يعيده لأعلى الصفحة (سلوك تطبيقات الجوال)
    if (location.pathname === item.to) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <nav
      aria-label="التنقل السفلي"
      className="fixed z-[90] bottom-[calc(10px+env(safe-area-inset-bottom,0px))] inset-x-2.5 sm:inset-x-auto sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-[min(680px,calc(100%-28px))] pointer-events-none"
    >
      <motion.div
        initial={{ y: 90, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        className="pointer-events-auto grid grid-cols-4 gap-1 h-[68px] p-2 rounded-[26px] border border-white/10 bg-[#0a0a0a]/90 backdrop-blur-xl shadow-[0_18px_50px_rgba(0,0,0,0.55)]"
      >
        {ITEMS.map((item) => {
          const active = item.match(location.pathname);
          const { Icon } = item;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={(e) => handleItemClick(e, item)}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              className={`${ITEM_BASE} ${
                active
                  ? 'bg-primary/15 text-primary'
                  : 'text-white/55 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.2 : 1.8} className={active ? 'translate-y-[-1px]' : ''} />
              <span className="text-[0.62rem] sm:text-xs font-bold leading-none">{item.label}</span>
              {active && (
                <motion.span
                  layoutId="bottom-nav-active"
                  className="absolute -top-[9px] h-1 w-6 rounded-full bg-primary"
                  transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                />
              )}
            </Link>
          );
        })}
      </motion.div>
    </nav>
  );
}
