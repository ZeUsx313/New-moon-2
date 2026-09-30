import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home as HomeIcon,
  Library,
  User,
  Search,
  Menu,
  X,
  Download,
  LogOut,
  ChevronLeft,
  Info,
  ShieldCheck,
  FileText,
  Mail,
  LayoutDashboard,
  BarChart3,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';

// استيراد الصور من مجلد assets
import logoImg from '../assets/AF32FFD4-DC2A-4D6A-9C05-F0A2E7288DC9.png';
import defaultAvatar from '../assets/adaptive-icon.png';

interface HeaderProps {}
void 0 as unknown as HeaderProps | undefined; // (توافق — الخصائص أُلغيت مع إلغاء الوضع الفاتح)

const SAFE_TOP = 'env(safe-area-inset-top, 0px)';

/** 
 * أفاتار المستخدم في الشريط العلوي: صورة الحساب إن وُجدت، وإلا حرف أول
 * من الاسم داخل دائرة (بدل الأيقونة العامة — بند «صورتي لا تظهر»). 
 */
export function UserAvatar({ userInfo, size = 34, className = '' }: { userInfo: any; size?: number; className?: string }) {
  const [failed, setFailed] = React.useState(false);
  const showPic = !!userInfo?.picture && !failed;
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 border border-white/25 bg-white/10 ${className}`}
      style={{ width: size, height: size }}
    >
      {showPic ? (
        <img
          src={userInfo.picture}
          alt=""
          onError={() => setFailed(true)}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="font-extrabold text-white select-none" style={{ fontSize: size * 0.42 }}>
          {(userInfo?.name || 'ز').trim().charAt(0).toUpperCase()}
        </span>
      )}
    </span>
  );
}

/**
 * الشريط العلوي — تصميم مستوحى من مجرة الروايات:
 * شبكة ثلاثية (أدوات يمين • الشعار بالمنتصف • أدوات يسار) على شريط
 * زجاجي ثابت يختبئ عند التمرير للأسفل ويعود عند التمرير للأعلى.
 *
 * الدرج الجانبي (الخطوط الثلاثة) بنفس بنية درج التطبيق:
 *   غلاف بحساب المستخدم ← الرئيسية/المكتبة/صفحتي ← التنزيلات/المظهر
 *   ← سياسة الخصوصية/تواصل معنا/من نحن/شروط الاستخدام ← أدوات الإدارة (للمشرفين).
 * كل ذلك بهوية الموقع (أسود/أبيض) وكل عنصر فيه يعمل فعلاً.
 */
export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, userInfo, logout, openAuthModal } = useAuth();
  const { isDrawerOpen, setDrawerOpen } = useUI();
  const drawerOpen = isDrawerOpen;
  const setDrawerOpenState = setDrawerOpen;
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [headerHidden, setHeaderHidden] = useState(false);

  const isAdmin = userInfo?.role === 'admin' || userInfo?.role === 'contributor';

  // إغلاق كل شيء عند تغيير المسار
  useEffect(() => {
    setDrawerOpenState(false);
    setSearchOpen(false);
    setHeaderHidden(false);
  }, [location.pathname, setDrawerOpenState]);

  // قفل تمرير الصفحة أثناء فتح الدرج
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  // اختصار Escape يغلق الدرج والبحث
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawerOpenState(false);
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setDrawerOpenState]);

  // إخفاء الشريط عند التمرير للأسفل وإظهاره عند الأعلى (كالتصميم المرجعي)
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

  const goProtected = (to: string) => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    navigate(to);
  };

  const iconBtn =
    'p-2.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40';

  /** صف درج عام (تنقل أو صفحات) */
  const DrawerRow = ({
    to,
    label,
    Icon,
    onClick,
    active,
    dim = false,
  }: {
    to?: string;
    label: string;
    Icon: React.ComponentType<{ size?: number; className?: string }>;
    onClick?: () => void;
    active?: boolean;
    dim?: boolean;
  }) => (
    <button
      onClick={() => {
        setDrawerOpenState(false);
        if (onClick) onClick();
        else if (to) navigate(to);
      }}
      className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-[15px] font-bold transition-colors w-full text-right ${
        active
          ? 'bg-white/15 text-white'
          : dim
            ? 'text-white/55 hover:text-white hover:bg-white/8'
            : 'text-white/75 hover:text-white hover:bg-white/8'
      }`}
    >
      <Icon size={20} />
      {label}
      {to && <ChevronLeft size={16} className="mr-auto text-white/25" aria-hidden="true" />}
    </button>
  );

  return (
    <>
      {/* مساحة الشريط الثابت — يحسب ارتفاع الأمان في iOS */}
      <div aria-hidden="true" style={{ height: `calc(4rem + ${SAFE_TOP})` }} />

      <header
        role="banner"
        className="fixed top-0 inset-x-0 z-50 transition-transform duration-300 ease-out focus-within:translate-y-0 data-[hidden=true]:pointer-events-none"
        data-hidden={headerHidden && !searchOpen && !drawerOpen}
        data-testid="top-header"
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
                onClick={() => setDrawerOpenState(true)}
                className={iconBtn}
                aria-label="فتح القائمة الجانبية"
                aria-expanded={drawerOpen}
                aria-controls="site-drawer"
                data-testid="drawer-toggle"
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

            {/* أدوات النهاية (يسار في RTL): حسابي — الوضع الفاتح أُلغي (الموقع مظلم دائماً) */}
            <div className="flex items-center gap-1 justify-end">
              <button
                onClick={() => goProtected('/my-page')}
                className={iconBtn}
                aria-label={isAuthenticated ? 'صفحتي' : 'تسجيل الدخول'}
                title={isAuthenticated ? (userInfo?.name || 'صفحتي') : 'تسجيل الدخول'}
              >
                {isAuthenticated ? (
                  <UserAvatar userInfo={userInfo} size={30} />
                ) : (
                  <User size={20} />
                )}
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
                    className="w-full bg-white/8 border border-white/15 rounded-2xl py-2.5 pr-10 pl-4 text-white placeholder:text-white/40 focus:outline-none focus:border-white/50 focus:bg-white/10 transition-colors text-sm"
                    dir="rtl"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/85 active:scale-95 transition-all"
                >
                  بحث
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </header>

      {/* ═══ الدرج الجانبي (الخطوط الثلاثة) — نفس بنية درج التطبيق ═══ */}
      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="القائمة الجانبية">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpenState(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.aside
              id="site-drawer"
              data-testid="side-drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className="absolute top-0 bottom-0 right-0 w-[310px] max-w-[85vw] bg-[#0a0a0a]/97 backdrop-blur-2xl border-l border-white/10 flex flex-col"
              style={{ paddingTop: SAFE_TOP }}
            >
              <div className="flex-1 overflow-y-auto">
                {/* ═══ القسم العلوي: بنر المستخدم + الحساب (كالتطبيق) ═══ */}
                <div className="relative">
                  <div className="h-32 w-full overflow-hidden">
                    <img
                      src={userInfo?.banner || defaultAvatar}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = defaultAvatar; }}
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-[#0a0a0a]" />
                  <button
                    onClick={() => setDrawerOpenState(false)}
                    className="absolute top-3 left-3 p-2 rounded-full bg-black/40 text-white/80 hover:text-white hover:bg-black/60 transition-colors"
                    aria-label="إغلاق القائمة"
                  >
                    <X size={18} />
                  </button>
                  <div className="absolute bottom-3 right-4 left-4 flex items-center gap-3">
                    <button
                      onClick={() => { setDrawerOpenState(false); goProtected('/my-page'); }}
                      className="shrink-0"
                      aria-label={isAuthenticated ? 'صفحتي' : 'تسجيل الدخول'}
                    >
                      {isAuthenticated && userInfo?.picture ? (
                        <img
                          src={userInfo.picture}
                          alt=""
                          className="w-14 h-14 rounded-full object-cover border-2 border-white/40"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="w-14 h-14 rounded-full bg-white/10 border-2 border-white/40 flex items-center justify-center overflow-hidden">
                          {isAuthenticated ? (
                            <UserAvatar userInfo={userInfo} size={56} />
                          ) : (
                            <img src={defaultAvatar} alt="" className="w-full h-full object-cover" />
                          )}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => { setDrawerOpenState(false); goProtected('/my-page'); }}
                      className="min-w-0 text-right"
                    >
                      <p className="text-white font-extrabold text-[15px] truncate">
                        {isAuthenticated ? (userInfo?.name || 'قارئ') : 'زائر'}
                      </p>
                      <p className="text-white/50 text-xs truncate">
                        {isAuthenticated ? (userInfo?.email || '') : 'اضغط لتسجيل الدخول'}
                      </p>
                    </button>
                    {isAuthenticated && (
                      <button
                        onClick={() => { setDrawerOpenState(false); logout(); }}
                        className="mr-auto p-2 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-colors"
                        aria-label="تسجيل الخروج"
                        title="تسجيل الخروج"
                      >
                        <LogOut size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* ═══ القسم الأول: التنقل الأساسي (كالتطبيق) ═══ */}
                <nav aria-label="التنقل الرئيسي" className="px-3 mt-2 flex flex-col gap-1">
                  <DrawerRow to="/" label="الرئيسية" Icon={HomeIcon} active={location.pathname === '/'} />
                  <DrawerRow to="/library" label="المكتبة" Icon={Library} active={location.pathname.startsWith('/library') || location.pathname.startsWith('/novel/')} />
                  <DrawerRow
                    label="صفحتي"
                    Icon={User}
                    active={location.pathname.startsWith('/my-page')}
                    onClick={() => goProtected('/my-page')}
                  />
                </nav>

                <div className="h-px bg-white/10 mx-5 my-3" />

                {/* ═══ القسم الثاني: التنزيلات والمظهر ═══ */}
                <nav aria-label="أدوات" className="px-3 flex flex-col gap-1">
                  <DrawerRow to="/downloads" label="التنزيلات" Icon={Download} active={location.pathname.startsWith('/downloads')} />
                </nav>

                <div className="h-px bg-white/10 mx-5 my-3" />

                {/* ═══ القسم الثالث: معلومات (كالتطبيق) ═══ */}
                <nav aria-label="معلومات الموقع" className="px-3 flex flex-col gap-1">
                  <DrawerRow to="/privacy" label="سياسة الخصوصية" Icon={ShieldCheck} dim active={location.pathname.startsWith('/privacy')} />
                  <DrawerRow to="/about#contact" label="تواصل معنا" Icon={Mail} dim active={false} />
                  <DrawerRow to="/about" label="من نحن" Icon={Info} dim active={location.pathname.startsWith('/about')} />
                  <DrawerRow to="/terms" label="شروط الاستخدام" Icon={FileText} dim active={location.pathname.startsWith('/terms')} />
                </nav>

                {/* ═══ أدوات الإدارة (للمشرفين والمساهمين فقط — كما في الخطة) ═══ */}
                {isAdmin && (
                  <>
                    <div className="h-px bg-white/10 mx-5 my-3" />
                    <nav aria-label="أدوات الإدارة" className="px-3 flex flex-col gap-1">
                      <p className="px-4 pt-1 pb-2 text-[10px] font-bold tracking-wider text-white/30">أدوات الإدارة</p>
                      <DrawerRow
                        label="لوحة التحكم"
                        Icon={LayoutDashboard}
                        onClick={() => { setDrawerOpenState(false); navigate('/dashboard'); }}
                      />
                      <DrawerRow
                        label="التحليلات والإحصاءات"
                        Icon={BarChart3}
                        onClick={() => { setDrawerOpenState(false); navigate('/dashboard?tab=analytics'); }}
                      />
                    </nav>
                  </>
                )}

                <div className="h-6" />
              </div>

              {/* تذييل الدرج — إصدار الموقع كالتطبيق */}
              <div className="p-4 border-t border-white/10 text-center">
                <p className="text-white/35 text-[11px] font-bold">قمر الروايات — v1.0</p>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
