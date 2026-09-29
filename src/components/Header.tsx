import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home as HomeIcon,
  Library,
  User,
  Search,
  Sun,
  Moon,
  Menu,
  X,
  Download,
  LogOut,
  ChevronLeft,
  Info,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

// استيراد الصورة من مجلد assets
import logoImg from '../assets/AF32FFD4-DC2A-4D6A-9C05-F0A2E7288DC9.png';

interface HeaderProps {
  isDarkMode: boolean;
  setIsDarkMode: (value: boolean) => void;
}

const SAFE_TOP = 'env(safe-area-inset-top, 0px)';

/**
 * الشريط العلوي — تصميم مستوحى من مجرة الروايات:
 * شبكة ثلاثية (أدوات يمين • الشعار بالمنتصف • أدوات يسار) على شريط
 * زجاجي ثابت يختبئ عند التمرير للأسفل ويعود عند التمرير للأعلى.
 * مع درج جانبي (الخطوط الثلاثة) ولوحة بحث موسّعة — كل شيء يعمل،
 * ومع ذلك الحركة والهوية (الشعار، الألوان، الخط) من روح موقعنا.
 */
export default function Header({ isDarkMode, setIsDarkMode }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, userInfo, logout, openAuthModal } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [headerHidden, setHeaderHidden] = useState(false);

  // إغلاق كل شيء عند تغيير المسار
  useEffect(() => {
    setDrawerOpen(false);
    setSearchOpen(false);
    setHeaderHidden(false);
  }, [location.pathname]);

  // قفل تمرير الصفحة أثناء فتح الدرج
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  // اختصار Escape يغلق الدرج والبحث
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawerOpen(false);
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // إخفاء الشريط عند التمرير للأسفل وإظهره عند الأعلى (كالتصميم المرجعي)
  useEffect(() => {
    let last = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y > last + 6 && y > 140) setHeaderHidden(true);
        else if (y < last - 6) setHeaderHidden(false);
        last = y;
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    setSearchOpen(false);
    setSearchQuery('');
    navigate(q ? `/library?q=${encodeURIComponent(q)}` : '/library');
  };

  const drawerLinks = [
    { to: '/', label: 'الرئيسية', Icon: HomeIcon },
    { to: '/library', label: 'المكتبة', Icon: Library },
    { to: '/downloads', label: 'التنزيلات', Icon: Download },
    { to: '/my-page', label: 'صفحتي', Icon: User, protected: true },
  ];
  const drawerPages = [
    { to: '/about', label: 'من نحن', Icon: Info },
    { to: '/privacy', label: 'سياسة الخصوصية', Icon: ShieldCheck },
    { to: '/terms', label: 'شروط الاستخدام', Icon: FileText },
  ];

  const goProtected = (to: string) => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    navigate(to);
  };

  const iconBtn =
    'p-2.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary';

  return (
    <>
      {/* مساحة الشريط الثابت — يحسب ارتفاع الأمان في iOS */}
      <div aria-hidden="true" style={{ height: `calc(4rem + ${SAFE_TOP})` }} />

      <header
        role="banner"
        className="fixed top-0 inset-x-0 z-50 transition-transform duration-300 ease-out focus-within:translate-y-0 data-[hidden=true]:pointer-events-none"
        data-hidden={headerHidden && !searchOpen && !drawerOpen}
        style={{
          transform: headerHidden && !searchOpen && !drawerOpen ? `translateY(calc(-100% - ${SAFE_TOP}))` : undefined,
        }}
      >
        <div
          className="w-full border-b border-white/10 bg-[#0a0a0a]/85 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
          style={{ paddingTop: SAFE_TOP }}
        >
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 h-16 px-3.5 md:px-5 max-w-[1400px] mx-auto">
            {/* أدوات البداية (يمين في RTL): الخطوط الثلاثة + البحث */}
            <div className="flex items-center gap-1 justify-start">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className={iconBtn}
                aria-label="فتح القائمة الجانبية"
                aria-expanded={drawerOpen}
                aria-controls="site-drawer"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setSearchOpen((v) => !v)}
                className={iconBtn}
                aria-label={searchOpen ? 'إغلاق البحث' : 'فتح البحث'}
                aria-expanded={searchOpen}
              >
                <Search size={21} />
              </button>
            </div>

            {/* الشعار بالمنتصف */}
            <Link
              to="/"
              className="flex items-center gap-2.5 group justify-self-center"
              aria-label="قمر الروايات — الصفحة الرئيسية"
            >
              <img
                src={logoImg}
                alt=""
                className="h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
              />
              <span className="hidden min-[400px]:inline text-lg font-extrabold bg-gradient-to-l from-white via-white to-white/60 bg-clip-text text-transparent tracking-tight">
                قمر الروايات
              </span>
            </Link>

            {/* أدوات النهاية (يسار في RTL): الوضع + حسابي */}
            <div className="flex items-center gap-1 justify-end">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={iconBtn}
                aria-label={isDarkMode ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع المظلم'}
                title={isDarkMode ? 'الوضع الفاتح' : 'الوضع المظلم'}
              >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <button
                onClick={() => goProtected('/my-page')}
                className={iconBtn}
                aria-label="صفحتي"
                title="صفحتي"
              >
                <User size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* لوحة البحث الموسّعة أسفل الشريط */}
        <AnimatePresence>
          {searchOpen && (
            <motion.form
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.18 }}
              onSubmit={submitSearch}
              className="absolute top-full inset-x-0 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/10 overflow-hidden z-50"
            >
              <div className="max-w-3xl mx-auto px-4 py-3.5 flex gap-2">
                <div className="relative flex-1">
                  <Search size={17} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/35" aria-hidden="true" />
                  <input
                    type="search"
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث عن رواية بالاسم أو المؤلف…"
                    aria-label="بحث في الروايات"
                    className="w-full bg-white/8 border border-white/15 rounded-2xl py-2.5 pr-10 pl-4 text-white placeholder:text-white/40 focus:outline-none focus:border-primary/60 focus:bg-white/10 transition-colors text-sm"
                    dir="rtl"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 rounded-2xl bg-primary text-white font-bold text-sm hover:bg-primary/85 active:scale-95 transition-all"
                >
                  بحث
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </header>

      {/* الدرج الجانبي (الخطوط الثلاثة) — يعمل على جميع الأحجام كالتصميم المرجعي */}
      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="القائمة الجانبية">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.aside
              id="site-drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className="absolute top-0 bottom-0 right-0 w-[300px] max-w-[84vw] bg-[#0a0a0a]/95 backdrop-blur-2xl border-l border-white/10 flex flex-col overflow-y-auto"
              style={{ paddingTop: SAFE_TOP }}
            >
              {/* رأس الدرج */}
              <div className="flex items-center justify-between p-5 pb-4">
                <Link to="/" onClick={() => setDrawerOpen(false)} className="flex items-center gap-2" aria-label="الصفحة الرئيسية">
                  <img src={logoImg} alt="" className="h-9 w-auto object-contain" />
                  <span className="font-extrabold text-white">قمر الروايات</span>
                </Link>
                <button onClick={() => setDrawerOpen(false)} className={iconBtn} aria-label="إغلاق القائمة">
                  <X size={20} />
                </button>
              </div>

              {/* التنقل الرئيسي */}
              <nav aria-label="التنقل الرئيسي" className="px-3 flex flex-col gap-1">
                {drawerLinks.map(({ to, label, Icon, ...rest }) => (
                  <button
                    key={to}
                    onClick={() => {
                      if ('protected' in rest && rest.protected && !isAuthenticated) {
                        setDrawerOpen(false);
                        openAuthModal();
                        return;
                      }
                      navigate(to);
                    }}
                    className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-[15px] font-bold transition-colors ${
                      location.pathname === to
                        ? 'bg-primary/15 text-primary'
                        : 'text-white/75 hover:text-white hover:bg-white/8'
                    }`}
                  >
                    <Icon size={20} />
                    {label}
                    <ChevronLeft size={16} className="mr-auto text-white/25" aria-hidden="true" />
                  </button>
                ))}
              </nav>

              <div className="h-px bg-white/10 mx-5 my-4" />

              {/* صفحات عامة */}
              <nav aria-label="معلومات الموقع" className="px-3 flex flex-col gap-1">
                {drawerPages.map(({ to, label, Icon }) => (
                  <button
                    key={to}
                    onClick={() => navigate(to)}
                    className="flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-medium text-white/55 hover:text-white hover:bg-white/8 transition-colors"
                  >
                    <Icon size={18} />
                    {label}
                  </button>
                ))}
              </nav>

              {/* المصادقة */}
              <div className="mt-auto p-5 pt-4">
                {isAuthenticated ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3 px-2">
                      <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-extrabold text-lg">
                        {(userInfo?.name || userInfo?.email || '؟').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{userInfo?.name || 'قارئ'}</p>
                        <p className="text-xs text-white/40 truncate">{userInfo?.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setDrawerOpen(false); logout(); }}
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm font-bold text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-colors"
                    >
                      <LogOut size={17} />
                      تسجيل الخروج
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => { setDrawerOpen(false); navigate('/login'); }}
                      className="w-full py-3 rounded-2xl bg-primary text-white font-bold text-sm hover:bg-primary/85 active:scale-95 transition-all"
                    >
                      تسجيل الدخول
                    </button>
                    <button
                      onClick={() => { setDrawerOpen(false); navigate('/signup'); }}
                      className="w-full py-3 rounded-2xl bg-white/8 border border-white/15 text-white font-bold text-sm hover:bg-white/15 active:scale-95 transition-all"
                    >
                      إنشاء حساب
                    </button>
                  </div>
                )}
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
