/**
 * هيكل لوحة التحكم الجديد — شريط جانبي أيمن بأقسام قابلة للتوسيع
 * (قسم المترجمين + قسم الإدارة) وكل وظيفة واجهة مستقلة كاملة كما في التطبيق.
 * ملاحظة: المستخرج الذكي والمترجم الخالص بقسم الإدارة (حصريان للمشرف كما في التطبيق).
 *
 * - سطح المكتب: شريط ثابت على اليمين + محتوى.
 * - الجوال: الشريط يتحول لدرج يفتح بزر عائم.
 */
import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen, ChevronDown, ChevronLeft, Menu, X, Users, Wrench, Settings,
  PlusSquare, FileEdit, Layers, UploadCloud, BookMarked, Cpu, Database,
  FileText, ListTree, Bot, WrenchIcon, DownloadCloud, KeyRound, Tags,
  ScrollText, BarChart3, ShieldAlert, Eraser, Copyright, LayoutDashboard, ShieldCheck, Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Header';
import { StaffGate } from './shared';

interface SideItem { to: string; label: string; Icon: React.ComponentType<{ size?: number; className?: string }>; }
interface SideSection { id: string; label: string; Icon: React.ComponentType<{ size?: number; className?: string }>; items?: SideItem[]; to?: string; adminOnly?: boolean; }

const SECTIONS: SideSection[] = [
  {
    id: 'my-novels',
    label: 'رواياتي',
    Icon: LayoutDashboard,
    to: '/dashboard/novels',
  },
  {
    id: 'translators',
    label: 'قسم المترجمين',
    Icon: BookOpen,
    items: [
      { to: '/dashboard/novels/new', label: 'إضافة رواية', Icon: PlusSquare },
      { to: '/dashboard/novel-edit', label: 'تعديل تفاصيل رواية', Icon: FileEdit },
      { to: '/dashboard/chapters', label: 'إضافة وتعديل الفصول', Icon: Layers },
      { to: '/dashboard/bulk-upload', label: 'نشر جماعي ZIP', Icon: UploadCloud },
      { to: '/dashboard/glossary', label: 'إدارة المصطلحات', Icon: BookMarked },
    ],
  },
  {
    id: 'admin',
    label: 'قسم الإدارة',
    Icon: Wrench,
    adminOnly: true,
    items: [
      { to: '/dashboard/translation-jobs', label: 'المترجم الذكي (الترجمة الآلية)', Icon: Cpu },
      { to: '/dashboard/review-jobs', label: 'المراجع الذكي (جودة الفصول)', Icon: ShieldCheck },
      { to: '/dashboard/glossary-ai', label: 'المستخرج الذكي (استخراج المصطلحات)', Icon: BookMarked },
      { to: '/dashboard/pure-translate', label: 'المترجم الخالص (ترجمة فقط)', Icon: Zap },
      { to: '/dashboard/translation-settings', label: 'إعدادات المترجم', Icon: Settings },
      { to: '/dashboard/metadata-jobs', label: 'مهام تعريب البيانات', Icon: Database },
      { to: '/dashboard/title-generator', label: 'مولد عناوين الفصول', Icon: FileText },
      { to: '/dashboard/title-fixer', label: 'إصلاح عناوين الفصول', Icon: ListTree },
      { to: '/dashboard/auto-import', label: 'الاستيراد التلقائي (السكرابر)', Icon: DownloadCloud },
      { to: '/dashboard/scraper-keys', label: 'مفاتيح السكرابر', Icon: KeyRound },
      { to: '/dashboard/users', label: 'المستخدمون والأدوار', Icon: Users },
      { to: '/dashboard/categories', label: 'التصنيفات', Icon: Tags },
      { to: '/dashboard/cleaner', label: 'المنظف والاستبدال', Icon: Eraser },
      { to: '/dashboard/copyright', label: 'إشعارات الحقوق', Icon: Copyright },
      { to: '/dashboard/logs', label: 'السجلات', Icon: ScrollText },
      { to: '/dashboard/analytics', label: 'التحليلات', Icon: BarChart3 },
      { to: '/dashboard/security', label: 'الأمان', Icon: ShieldAlert },
    ],
  },
];

function SideLink({ to, label, Icon, onNav }: { to: string; label: string; Icon: React.ComponentType<{ size?: number; className?: string }>; onNav?: () => void }) {
  return (
    <NavLink
      to={to}
      end
      onClick={onNav}
      className={({ isActive }) =>
        `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-bold transition-colors ${
          isActive ? 'bg-white text-black' : 'text-white/60 hover:text-white hover:bg-white/10'
        }`}
    >
      <Icon size={16} />
      <span className="flex-1">{label}</span>
    </NavLink>
  );
}

function SideContent({ onNav }: { onNav?: () => void }) {
  const { userInfo } = useAuth();
  const isAdmin = userInfo?.role === 'admin';
  const location = useLocation();
  // الأقسام القابلة للتوسيع — تُفتح تلقائياً إذا كان النشط داخلها
  const [open, setOpen] = useState<Record<string, boolean>>({
    translators: SECTIONS.some((s) => s.id === 'translators' && s.items?.some((i) => location.pathname.startsWith(i.to))),
    admin: SECTIONS.some((s) => s.id === 'admin' && s.items?.some((i) => location.pathname.startsWith(i.to))),
  });

  return (
    <nav aria-label="أقسام لوحة التحكم" className="flex flex-col gap-1">
      <NavLink
        to="/dashboard"
        end
        onClick={onNav}
        className={({ isActive }) =>
          `flex items-center gap-2.5 rounded-lg px-3 py-3 text-sm font-extrabold transition-colors mb-2 ${
            isActive ? 'bg-white text-black' : 'text-white hover:bg-white/10'
          }`}
      >
        <LayoutDashboard size={18} />
        رواياتي
      </NavLink>

      {SECTIONS.filter((s) => !s.adminOnly || isAdmin).map((section) => {
        if (section.to) {
          return <SideLink key={section.id} to={section.to} label={section.label} Icon={section.Icon} onNav={onNav} />;
        }
        const isOpen = !!open[section.id];
        const hasActive = section.items?.some((i) => location.pathname.startsWith(i.to)) || false;
        return (
          <div key={section.id} className="mb-1">
            <button
              onClick={() => setOpen((p) => ({ ...p, [section.id]: !p[section.id] }))}
              aria-expanded={isOpen}
              className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-extrabold transition-colors ${
                hasActive ? 'text-white bg-white/10' : 'text-white/85 hover:bg-white/10'
              }`}
            >
              <section.Icon size={17} />
              <span className="flex-1 text-right">{section.label}</span>
              <ChevronDown size={15} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <div className="mt-1 mr-4 pr-3 border-r border-white/10 flex flex-col gap-0.5 py-1">
                    {section.items!.map((item) => (
                      <SideLink key={item.to} to={item.to} label={item.label} Icon={item.Icon} onNav={onNav} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      <div className="mt-4 pt-4 border-t border-white/10">
        <NavLink
          to="/"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-bold text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          <ChevronLeft size={16} />
          العودة للموقع
        </NavLink>
      </div>
    </nav>
  );
}

export default function DashboardLayout() {
  const [drawer, setDrawer] = useState(false);
  const location = useLocation();

  // إغلاق درج الجوال عند كل تنقل
  useEffect(() => { setDrawer(false); }, [location.pathname]);

  return (
    <StaffGate>
      <Helmet>
        <title>لوحة التحكم — قمر الروايات</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-screen bg-background" dir="rtl">
        <Header />

        <div className="max-w-[1400px] mx-auto px-3 sm:px-4 py-5 pb-28 flex gap-5 items-start">
          {/* الشريط الجانبي — سطح المكتب (يمين لأن الصفحة RTL) */}
          <aside className="hidden lg:block w-72 shrink-0 sticky top-20">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 max-h-[calc(100vh-120px)] overflow-y-auto">
              <SideContent />
            </div>
          </aside>

          {/* زر درج الجوال */}
          <button
            onClick={() => setDrawer(true)}
            className="lg:hidden fixed bottom-[calc(86px+env(safe-area-inset-bottom,0px))] right-4 z-[95] w-12 h-12 rounded-full bg-white text-black shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-center justify-center"
            aria-label="فتح أقسام اللوحة"
          >
            <Menu size={20} />
          </button>

          {/* درج الجوال */}
          <AnimatePresence>
            {drawer && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="lg:hidden fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm"
                onClick={() => setDrawer(false)}
              >
                <motion.div
                  initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                  transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute inset-y-0 right-0 w-[300px] max-w-[85vw] bg-[#0c0c0c] border-l border-white/10 p-4 overflow-y-auto"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-white font-extrabold">أقسام اللوحة</h2>
                    <button onClick={() => setDrawer(false)} className="p-2 rounded-lg hover:bg-white/10 text-white/70" aria-label="إغلاق"><X size={18} /></button>
                  </div>
                  <SideContent onNav={() => setDrawer(false)} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* المحتوى */}
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </StaffGate>
  );
}
