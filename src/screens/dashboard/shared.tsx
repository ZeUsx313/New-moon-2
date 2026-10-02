/**
 * مكونات لوحة التحكم المشتركة — أُخذت من اللوحة القديمة وأعيد استخدامها في
 * الواجهات المنفصلة الجديدة (كل وظيفة = واجهة مستقلة كما في التطبيق).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { X, Loader2, Upload, CheckSquare, BookOpen, Search } from 'lucide-react';
import toast from 'react-hot-toast';

import { adminService, AdminNovel } from '../../services/admin';
import { novelService } from '../../services/novel';
import { userService } from '../../services/user';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Header';

/* ═══════════ أنماط مشتركة ═══════════ */
export const inputCls = 'w-full bg-white/5 text-white rounded-lg px-3 py-2.5 border border-white/15 focus:border-primary outline-none text-sm placeholder:text-white/30';
export const btnPrimary = 'bg-primary text-primary-foreground font-bold rounded-lg px-4 py-2.5 text-sm hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2';
export const btnGhost = 'bg-white/10 text-white font-bold rounded-lg px-4 py-2.5 text-sm hover:bg-white/20 disabled:opacity-50 transition-colors flex items-center justify-center gap-2';

export function Spinner() {
  return <Loader2 size={20} className="animate-spin text-white/70" />;
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
        onClick={(e) => e.stopPropagation()}
        className={`bg-[#111] border border-white/15 rounded-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[88vh] overflow-y-auto`}
      >
        <div className="sticky top-0 bg-[#111] border-b border-white/10 px-5 py-4 flex items-center justify-between">
          <h3 className="font-bold text-white">{title}</h3>
          <button onClick={onClose} aria-label="إغلاق" className="p-1.5 rounded-lg hover:bg-white/10 text-white/70"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════ بوابة الصلاحيات (مترجم أو مشرف) ═══════════ */
export function StaffGate({ children }: { children: React.ReactNode }) {
  const { userInfo, isAuthenticated, openAuthModal } = useAuth();
  const isAdmin = userInfo?.role === 'admin';
  const isStaff = isAdmin || userInfo?.role === 'contributor';

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-lg mx-auto px-4 py-24 text-center">
          <BookOpen size={40} className="text-white/30 mx-auto mb-4" />
          <h1 className="text-white font-bold text-xl mb-2">لوحة الترجمة والإدارة</h1>
          <p className="text-white/50 mb-6">سجّل دخولك بحساب مترجم أو مشرف للوصول</p>
          <button onClick={openAuthModal} className={btnPrimary + ' mx-auto'}>تسجيل الدخول</button>
        </div>
      </div>
    );
  }
  if (!isStaff) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-lg mx-auto px-4 py-24 text-center">
          <BookOpen size={40} className="text-white/30 mx-auto mb-4" />
          <h1 className="text-white font-bold text-xl mb-2">صلاحية غير كافية</h1>
          <p className="text-white/50">هذه اللوحة للمترجمين والمشرفين فقط. اطلب ترقية دورك من الإدارة.</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

/* ═══════════ نموذج إنشاء/تعديل رواية (كما في اللوحة القديمة) ═══════════ */
export interface NovelFormState {
  title: string; titleEn: string; cover: string; description: string; category: string; tags: string; status: string;
}
export const EMPTY_FORM: NovelFormState = { title: '', titleEn: '', cover: '', description: '', category: '', tags: '', status: 'مستمرة' };

export function NovelFormModal({ initial, categories, onClose, onSaved }: {
  initial: NovelFormState & { _id?: string };
  categories: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!initial._id;
  const [form, setForm] = useState<NovelFormState>(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const coverRef = useRef<HTMLInputElement>(null);
  const set = (k: keyof NovelFormState, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const uploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await userService.uploadImage(file);
      set('cover', url);
      toast.success('تم رفع الغلاف');
    } catch {
      toast.error('فشل رفع الغلاف');
    } finally { setUploading(false); }
  };

  const submit = async () => {
    if (!form.title.trim() || !form.cover.trim()) { toast.error('العنوان والغلاف مطلوبان'); return; }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        titleEn: form.titleEn.trim() || form.title.trim(),
        cover: form.cover.trim(),
        description: form.description,
        category: form.category || 'أخرى',
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        status: form.status || 'مستمرة',
      };
      if (isEdit) {
        await adminService.updateNovel(initial._id!, payload);
        toast.success('تم تحديث الرواية');
      } else {
        await adminService.createNovel(payload);
        toast.success('تم إنشاء الرواية — أضف الفصول الآن');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'فشل الحفظ');
    } finally { setSaving(false); }
  };

  return (
    <Modal title={isEdit ? 'تعديل الرواية' : 'إنشاء رواية جديدة'} onClose={onClose}>
      <div className="space-y-3">
        <input className={inputCls} placeholder="عنوان الرواية *" value={form.title} onChange={(e) => set('title', e.target.value)} />
        <input className={inputCls} placeholder="العنوان الإنجليزي" value={form.titleEn} onChange={(e) => set('titleEn', e.target.value)} dir="ltr" />
        <div className="flex gap-2 items-center">
          <input className={inputCls} placeholder="رابط الغلاف *" value={form.cover} onChange={(e) => set('cover', e.target.value)} dir="ltr" />
          <button onClick={() => coverRef.current?.click()} disabled={uploading} className={btnGhost + ' shrink-0'}>
            {uploading ? <Spinner /> : <Upload size={16} />} رفع
          </button>
          <input ref={coverRef} type="file" accept="image/*" hidden onChange={uploadCover} />
        </div>
        {form.cover && <img src={form.cover} alt="غلاف" className="h-28 rounded-lg object-cover border border-white/10" onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.2'; }} />}
        <textarea className={inputCls} rows={4} placeholder="القصة / الوصف" value={form.description} onChange={(e) => set('description', e.target.value)} />
        <select className={inputCls} value={form.category} onChange={(e) => set('category', e.target.value)}>
          <option value="">— اختر التصنيف —</option>
          {categories.filter((c) => c.id !== 'all').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input className={inputCls} placeholder="الوسوم مفصولة بفواصل: أكشن, خيال" value={form.tags} onChange={(e) => set('tags', e.target.value)} />
        <select className={inputCls} value={form.status} onChange={(e) => set('status', e.target.value)}>
          <option value="مستمرة">مستمرة</option>
          <option value="مكتملة">مكتملة</option>
          <option value="متوقفة">متوقفة</option>
        </select>
        <button onClick={submit} disabled={saving} className={btnPrimary + ' w-full'}>
          {saving ? <Spinner /> : <CheckSquare size={16} />} {isEdit ? 'حفظ التعديلات' : 'إنشاء الرواية'}
        </button>
      </div>
    </Modal>
  );
}

/* ═══════════ محرر الفصل ═══════════ */
export function ChapterModal({ novelId, novelTitle, editing, nextNumber, onClose, onSaved }: {
  novelId: string;
  novelTitle: string;
  editing: { number: number; title: string; content?: string } | null;
  nextNumber: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!editing;
  const [number, setNumber] = useState(editing?.number ?? nextNumber);
  const [title, setTitle] = useState(editing?.title ?? '');
  const [content, setContent] = useState('');
  const [loadingContent, setLoadingContent] = useState(false);
  const [saving, setSaving] = useState(false);
  const words = useMemo(() => content.trim() ? content.trim().split(/\s+/).length : 0, [content]);

  useEffect(() => {
    if (isEdit && editing) {
      setLoadingContent(true);
      novelService.getChapter(novelId, String(editing.number))
        .then((ch: any) => setContent(ch?.content || ''))
        .catch(() => toast.error('فشل جلب نص الفصل'))
        .finally(() => setLoadingContent(false));
    }
  }, [isEdit, editing, novelId]);

  const submit = async () => {
    if (!title.trim() || !content.trim()) { toast.error('العنوان والمحتوى مطلوبان'); return; }
    setSaving(true);
    try {
      if (isEdit) {
        await adminService.updateChapter(novelId, number, { title: title.trim(), content });
        toast.success(`تم تعديل الفصل ${number}`);
      } else {
        await adminService.addChapter({ novelId, number, title: title.trim(), content });
        toast.success(`تم إضافة الفصل ${number}`);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'فشل الحفظ — تأكد أن رقم الفصل غير موجود مسبقاً');
    } finally { setSaving(false); }
  };

  return (
    <Modal title={isEdit ? `تعديل الفصل ${editing?.number}` : `إضافة فصل — ${novelTitle}`} onClose={onClose} wide>
      {loadingContent ? (
        <div className="py-10 flex justify-center"><Spinner /></div>
      ) : (
        <div className="space-y-3">
          {!isEdit && (
            <div>
              <label className="text-white/50 text-xs">رقم الفصل</label>
              <input type="number" min={1} className={inputCls} value={number} onChange={(e) => setNumber(parseInt(e.target.value) || nextNumber)} />
            </div>
          )}
          <input className={inputCls} placeholder="عنوان الفصل *" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea
            className={inputCls + ' font-mono leading-relaxed'}
            rows={16}
            placeholder="نص الفصل هنا... (يدعم تنسيقات القارئ: «الحوار»، **التعريض**، [الأقواس])"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            dir="auto"
          />
          <div className="flex items-center justify-between text-xs text-white/40">
            <span>{words.toLocaleString('en-US')} كلمة</span>
            <span>يُحفظ في قاعدة البيانات ويظهر للقراء مباشرة</span>
          </div>
          <button onClick={submit} disabled={saving} className={btnPrimary + ' w-full'}>
            {saving ? <Spinner /> : <CheckSquare size={16} />} {isEdit ? 'حفظ التعديل' : 'نشر الفصل'}
          </button>
        </div>
      )}
    </Modal>
  );
}

/* ═══════════ منتقي الروايات — يُستعمل في كل الواجهات التي تحتاج اختيار رواية ═══════════ */
export function NovelPicker({ onPick, actionLabel, adminOnly }: { onPick: (novel: any) => void; actionLabel: string; adminOnly?: boolean }) {
  const { userInfo } = useAuth();
  const isAdmin = userInfo?.role === 'admin';
  const [novels, setNovels] = useState<AdminNovel[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        if (adminOnly && !isAdmin) {
          // أدوات المشرف فقط — تجلب من /api/translator/novels (متاحة للمترجم أيضاً لكن البدء إداري)
        }
        const res = await novelService.getNovels({ page: 1, limit: 100 });
        let li: AdminNovel[] = res.novels || [];
        if (!isAdmin) {
          li = li.filter((n) => (n as any).authorEmail === userInfo?.email || (n as any).authorId === userInfo?._id);
        }
        if (alive) setNovels(li);
      } catch {
        toast.error('فشل جلب الروايات');
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [isAdmin, userInfo?.email, userInfo?._id, adminOnly]);

  const filtered = novels.filter((n) => n.title?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="relative mb-4">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          className={inputCls + ' pr-9'}
          placeholder="ابحث عن رواية…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {loading ? (
        <div className="py-20 flex justify-center"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-white/50">
          <BookOpen className="mx-auto mb-3 text-white/20" size={36} />
          {novels.length === 0 ? 'لا توجد روايات متاحة لك بعد' : 'لا نتائج مطابقة للبحث'}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((n) => (
            <button
              key={n._id}
              onClick={() => onPick(n)}
              className="bg-white/5 border border-white/10 rounded-xl p-3 flex gap-3 items-center text-right hover:border-white/30 hover:bg-white/10 transition-all"
            >
              <img src={n.cover} alt="" className="w-12 h-[68px] rounded-lg object-cover shrink-0 bg-black/40" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.15'; }} />
              <div className="min-w-0 flex-1">
                <h4 className="text-white font-bold text-sm line-clamp-2 leading-snug">{n.title}</h4>
                <p className="text-white/40 text-xs mt-1">{n.chaptersCount ?? 0} فصل</p>
                <span className="text-white/70 text-xs font-bold mt-1.5 inline-block bg-white/10 rounded-full px-2.5 py-0.5">{actionLabel}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════ رأس صفحة داخل اللوحة ═══════════ */
export function PageHead({ title, desc, children }: { title: string; desc?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      <div className="flex-1 min-w-[200px]">
        <h1 className="text-white font-extrabold text-xl">{title}</h1>
        {desc && <p className="text-white/40 text-xs mt-1">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

/* حالة وظيفة آلية → نص/لون */
export const JOB_STATUS: Record<string, { label: string; cls: string }> = {
  active: { label: 'قيد التنفيذ', cls: 'bg-green-500/15 text-green-400' },
  paused: { label: 'متوقفة مؤقتاً', cls: 'bg-yellow-500/15 text-yellow-400' },
  completed: { label: 'مكتملة', cls: 'bg-white/15 text-white' },
  failed: { label: 'فشلت', cls: 'bg-red-500/15 text-red-400' },
};
export const jobStatus = (s: string) => JOB_STATUS[s] || { label: s || '—', cls: 'bg-white/10 text-white/70' };
