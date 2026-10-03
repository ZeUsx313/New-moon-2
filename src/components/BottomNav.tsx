import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Library, Download, User, History } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';

/**
 * الشريط السفلي العائم — بروح مجرة الروايات (حبة زجاجية عائمة)
 * وبالهوية الرمادية/السوداء/البيضاء لموقعنا. كل العناصر تعمل فعلاً:
 *   الرئيسية / المكتبة / التنزيلات / السجل / صفحتي (بوابة مصادقة للزوار).
 *
 * يختفي (انزلاقاً) في الحالات التي يطلبها التصميم:
 *   - داخل صفحة أي رواية أو القارئ (forceHidden من App.tsx)
 *   - داخل صفحة عضو (/user/:id)
 *   - عند فتح الدرج الجانبي (الخطوط الثلاثة) — عبر UIContext
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
    to: '/history',
    label: 'السجل',
    Icon: History,
    match: (p: string) => p.startsWith('/history'),
  },
  {
    to: '/my-page',
    label: 'صفحتي',
    Icon: User,
    match: (p: string) => p.startsWith('/my-page') || p.startsWith('/user/'),
    protected: true,
  },
];

export default function BottomNav({ forceHidden = false }: { forceHidden?: boolean }) {
  const location = useLocation();
  const { isAuthenticated, userInfo, openAuthModal } = useAuth();
  const { isDrawerOpen } = useUI();
  // فشل تحميل صورة الحساب → نعود لأيقونة الأشخاص تلقائياً
  const [avatarFailed, setAvatarFailed] = useState(false);
  // 🎯 ليس ثابتاً دائماً أمام العين: يختفي انزلاقاً عند التمرير للأسفل
  // ويعود عند أول تمريرة للأعلى (نفس سلوك تطبيقات الجوال الحديثة)
  const [scrolledDown, setScrolledDown] = useState(false);

  React.useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY;
      if (y < 80) {
        setScrolledDown(false);
      } else if (delta > 6) {
        setScrolledDown(true);
      } else if (delta < -6) {
        setScrolledDown(false);
      }
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const hidden = forceHidden || isDrawerOpen || scrolledDown;

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
      aria-hidden={hidden}
      className="fixed z-[90] bottom-[calc(10px+env(safe-area-inset-bottom,0px))] inset-x-2.5 sm:inset-x-auto sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-[min(680px,calc(100%-28px))] pointer-events-none"
    >
      <motion.div
        initial={{ y: 90, opacity: 0 }}
        animate={hidden ? { y: 120, opacity: 0 } : { y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={`pointer-events-auto grid grid-cols-5 gap-1 h-[68px] p-2 rounded-[26px] border border-white/10 bg-[#0a0a0a]/90 backdrop-blur-xl shadow-[0_18px_50px_rgba(0,0,0,0.55)] ${
          hidden ? 'pointer-events-none' : ''
        }`}
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
              tabIndex={hidden ? -1 : 0}
              className={`${ITEM_BASE} ${
                active
                  ? 'bg-white/15 text-white'
                  : 'text-white/55 hover:text-white hover:bg-white/5'
              }`}
            >
              {item.to === '/my-page' && isAuthenticated ? (
                userInfo?.picture && !avatarFailed ? (
                  <img
                    src={userInfo?.picture}
                    alt=""
                    onError={() => setAvatarFailed(true)}
                    className={`w-[22px] h-[22px] rounded-full object-cover border border-white/25 ${
                      active ? 'translate-y-[-1px] ring-2 ring-white/40' : ''
                    }`}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  /* مسجل دخول بلا صورة (حساب بريد/فشل تحميل) → حرف أول من الاسم */
                  <span
                    className={`w-[22px] h-[22px] rounded-full bg-white/15 border border-white/25 flex items-center justify-center text-[11px] font-extrabold text-white select-none ${
                      active ? 'translate-y-[-1px] ring-2 ring-white/40' : ''
                    }`}
                  >
                    {(userInfo?.name || 'ز').trim().charAt(0).toUpperCase()}
                  </span>
                )
              ) : (
                <Icon size={22} strokeWidth={active ? 2.2 : 1.8} className={active ? 'translate-y-[-1px]' : ''} />
              )}
              <span className="text-[0.62rem] sm:text-xs font-bold leading-none">{item.label}</span>
              {active && (
                <motion.span
                  layoutId="bottom-nav-active"
                  className="absolute -top-[9px] h-1 w-6 rounded-full bg-white"
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
