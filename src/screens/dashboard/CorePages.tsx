/**
 * صفحات قسم المترجمين — واجهات إدارة الروايات المطابقة للتطبيق حرفياً
 * (نفس النصوص ونفس البنية ونفس السلوك، مُحوّلة من React Native إلى الويب):
 *
 *  1) NovelsPage      ← ManagementScreen         «أعمالي» (بحث + ترتيب + بطاقات تعديل/فصل/حذف)
 *  2) NovelCreatePage ← AdminDashboardScreen     «مشروع جديد» (نموذج البيانات)
 *  3) NovelEditPage   ← AdminDashboardScreen     «تعديل الرواية» (تبويبان: البيانات/الفصول)
 *  4) ChaptersPage    ← AdminDashboardScreen     «الفصول» (بحث/ترتيب/تحديد بالنطاق/حذف/نشر منفرد/نشر ZIP)
 *  5) BulkUploadPage  ← BulkUploadScreen         «النشر المتعدد»
 *  6) GlossaryPage    ← GlossaryManagerScreen    «المسرد» (أقسام/بحث/بطاقات/FAB)
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Plus, Trash2, Pencil, Upload, ArrowRight, ArrowUp, ArrowDown, Search, X,
  Image as ImageIcon, Camera, FileText, CloudUpload, ChevronDown, CheckCircle2,
  PlusCircle, Type as TypeIcon, Clock, Check,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { adminService, AdminNovel } from '../../services/admin';
import { novelService } from '../../services/novel';
import { categoryService } from '../../services/category';
import { userService } from '../../services/user';
import { useAuth } from '../../context/AuthContext';
import { translatorService } from '../../services/translator';
import { btnGhost, Spinner, NovelPicker, PageHead } from './shared';
import { ConfirmDialog } from './AiPages';

/* ═══════════ أنماط مشتركة — مكافئات أنماط التطبيق الزجاجية ═══════════ */
const GLASS = 'bg-[#141414]/75 border border-white/10 rounded-2xl';
const LABEL_CLS = 'block text-white/80 text-[13px] font-semibold mb-2 text-right';
const GLASS_INPUT =
  'w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3.5 text-white text-right outline-none focus:border-white/30 placeholder:text-white/25 text-base transition-colors';
const MAIN_BTN =
  'w-full rounded-2xl border border-white/20 bg-white/[0.08] py-4 text-white font-bold text-base hover:bg-white/[0.14] transition-colors disabled:opacity-60 flex items-center justify-center gap-2';
const BLUE = '#4a7cc7'; // لون أزرار الترتيب/التحديد كما في التطبيق حرفياً

interface ConfirmState {
  title: string;
  message: string;
  confirmText?: string;
  onConfirm: () => void;
}

/** خطاف مربع حوار التأكيد — مكافئ CustomAlert في التطبيق */
function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null);
  const node = state ? (
    <ConfirmDialog
      open
      title={state.title}
      message={state.message}
      confirmText={state.confirmText || 'حذف'}
      tone="danger"
      onCancel={() => setState(null)}
      onConfirm={() => { const fn = state.onConfirm; setState(null); fn(); }}
    />
  ) : null;
  return { ask: setState, confirmNode: node };
}

/* ═══════════ 1. أعمالي — ManagementScreen ═══════════ */
export function NovelsPage() {
  const navigate = useNavigate();
  const { userInfo } = useAuth();
  const isAdmin = userInfo?.role === 'admin';
  const [novels, setNovels] = useState<AdminNovel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortAscending, setSortAscending] = useState(true); // true = تصاعدي
  const [sortBy, setSortBy] = useState<'title' | 'date'>('title');
  const { ask, confirmNode } = useConfirm();

  const loadNovels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await novelService.getNovels({ page: 1, limit: 1000 });
      let list: AdminNovel[] = res.novels || [];
      if (!isAdmin) {
        list = list.filter((n) => (n as any).authorEmail === userInfo?.email || (n as any).authorId === userInfo?._id);
      }
      setNovels(list);
    } catch {
      toast.error('فشل جلب الأعمال');
    } finally { setLoading(false); }
  }, [isAdmin, userInfo?.email, userInfo?._id]);

  useEffect(() => { loadNovels(); }, [loadNovels]);

  const handleDelete = (n: AdminNovel) => {
    ask({
      title: 'حذف الرواية',
      message: 'هل أنت متأكد؟ سيتم حذف الرواية وجميع الفصول نهائياً.',
      onConfirm: async () => {
        try { await adminService.deleteNovel(n._id); toast.success('تم الحذف بنجاح'); loadNovels(); }
        catch { toast.error('فشل الحذف'); }
      },
    });
  };

  // تصفية وترتيب الأعمال — نفس منطق التطبيق حرفياً
  const filteredAndSortedNovels = useMemo(() => {
    let filtered = novels.filter((item) => item.title?.toLowerCase().includes(searchQuery.toLowerCase()));
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'title') {
        const comparison = (a.title || '').localeCompare(b.title || '', 'ar');
        return sortAscending ? comparison : -comparison;
      }
      const dateA = new Date((a as any).updatedAt || a.createdAt || 0).getTime();
      const dateB = new Date((b as any).updatedAt || b.createdAt || 0).getTime();
      return sortAscending ? dateA - dateB : dateB - dateA; // التنازلي = الأحدث أولاً
    });
    return filtered;
  }, [novels, searchQuery, sortAscending, sortBy]);

  return (
    <div>
      {confirmNode}
      {/* رأس أعمالي — مثل التطبيق: عنوان + زر إضافة */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-white font-extrabold text-xl">أعمالي</h1>
        <button
          onClick={() => navigate('/dashboard/novels/new')}
          aria-label="إضافة رواية"
          className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        >
          <Plus size={22} />
        </button>
      </div>

      {/* شريط البحث وزرا الترتيب — مثل التطبيق */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-3 h-11">
          <Search size={18} className="text-white/50 shrink-0" />
          <input
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/40"
            placeholder="ابحث باسم الرواية..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} aria-label="مسح" className="text-white/40 hover:text-white"><X size={15} /></button>
          )}
        </div>
        <button
          onClick={() => setSortBy((p) => (p === 'title' ? 'date' : 'title'))}
          aria-label="تبديل معيار الترتيب"
          className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors shrink-0"
        >
          {sortBy === 'title' ? <TypeIcon size={19} /> : <Clock size={19} />}
        </button>
        <button
          onClick={() => setSortAscending((p) => !p)}
          aria-label="تبديل اتجاه الترتيب"
          className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors shrink-0"
        >
          {sortAscending ? <ArrowUp size={19} /> : <ArrowDown size={19} />}
        </button>
      </div>

      {loading ? (
        <div className="py-24 flex justify-center"><Spinner /></div>
      ) : filteredAndSortedNovels.length === 0 ? (
        <div className="py-24 text-center text-white/50 text-base">
          {searchQuery ? 'لا توجد نتائج مطابقة للبحث' : 'لم تقم بنشر أي أعمال بعد.'}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAndSortedNovels.map((n) => (
            <motion.div key={n._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`${GLASS} p-3`}>
              <div className="flex flex-row-reverse items-center gap-4">
                {/* في RTL: الصورة تظهر يساراً والمعلومات يميناً كما في التطبيق */}
                <img
                  src={n.cover}
                  alt={n.title}
                  className="w-[70px] h-[100px] rounded-lg object-cover shrink-0 bg-black/40"
                  loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.15'; }}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-bold text-base mb-1.5 truncate text-right">{n.title}</h3>
                  <div className="flex flex-row-reverse items-center gap-1.5 mb-2.5 text-white/50 text-xs">
                    <span>{n.chaptersCount ?? 0} فصل</span>
                    <span>•</span>
                    <span>{n.views || 0} مشاهدة</span>
                  </div>
                  <div className="flex flex-row-reverse gap-2.5">
                    <button
                      onClick={() => navigate(`/dashboard/novel-edit/${n._id}`)}
                      className="flex flex-row-reverse items-center gap-1.5 px-3 py-2 rounded-lg border border-white/20 bg-white/5 text-white text-xs font-semibold hover:bg-white/10 transition-colors"
                    >
                      <Pencil size={14} /> تعديل
                    </button>
                    <button
                      onClick={() => navigate(`/dashboard/chapters/${n._id}?add=1`)}
                      className="flex flex-row-reverse items-center gap-1.5 px-3 py-2 rounded-lg border border-white/20 bg-white/5 text-white text-xs font-semibold hover:bg-white/10 transition-colors"
                    >
                      <PlusCircle size={14} /> فصل
                    </button>
                    <button
                      onClick={() => handleDelete(n)}
                      aria-label="حذف"
                      className="px-2.5 py-2 rounded-lg border border-red-500 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════ 2+3. نموذج بيانات الرواية — AdminDashboardScreen (تبويب البيانات) ═══════════ */
const STATUS_OPTIONS = ['مستمرة', 'مكتملة', 'متوقفة', 'خاصة'];

function NovelForm({ novel, onSaved }: { novel: AdminNovel | null; onSaved: () => void }) {
  const navigate = useNavigate();
  const { userInfo } = useAuth();
  const isAdmin = userInfo?.role === 'admin';
  const [title, setTitle] = useState(novel?.title || '');
  const [titleEn, setTitleEn] = useState(novel?.titleEn || '');
  const [cover, setCover] = useState(novel?.cover || '');
  const [description, setDescription] = useState(novel?.description || '');
  const [status, setStatus] = useState(novel?.status || 'مستمرة');
  const [selectedTags, setSelectedTags] = useState<string[]>(
    novel?.tags?.length ? novel.tags : novel?.category ? [novel.category] : [],
  );
  const [customTag, setCustomTag] = useState('');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const coverRef = useRef<HTMLInputElement>(null);
  const { ask, confirmNode } = useConfirm();

  useEffect(() => {
    categoryService.getCategories()
      .then((cats) => setAvailableCategories(cats.filter((c) => c.id !== 'all').map((c) => c.name)))
      .catch(() => setAvailableCategories(['أكشن', 'رومانسي', 'فانتازيا']));
  }, []);

  const uploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingImage(true);
    try {
      const { url } = await userService.uploadImage(file);
      setCover(url);
      toast.success('تم رفع الصورة بنجاح');
    } catch { toast.error('فشل رفع الصورة'); }
    finally { setUploadingImage(false); }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const addCustomTag = async () => {
    const newTag = customTag.trim();
    if (!newTag) return;
    if (!isAdmin) { toast.error('صلاحية المشرف مطلوبة لإضافة تصنيفات جديدة'); return; }
    try {
      await categoryService.addCategory(newTag);
      setAvailableCategories((prev) => (prev.includes(newTag) ? prev : [...prev, newTag]));
      setSelectedTags((prev) => (prev.includes(newTag) ? prev : [...prev, newTag]));
      setCustomTag('');
      toast.success('تم إضافة التصنيف لقاعدة البيانات');
    } catch { toast.error('فشل إضافة التصنيف'); }
  };

  const handleDeleteCategory = (catName: string) => {
    ask({
      title: 'حذف التصنيف نهائياً',
      message: `هل أنت متأكد من حذف تصنيف "${catName}" من قاعدة البيانات وجميع الروايات؟`,
      onConfirm: async () => {
        try {
          await categoryService.deleteCategory(catName);
          setAvailableCategories((prev) => prev.filter((c) => c !== catName));
          setSelectedTags((prev) => prev.filter((t) => t !== catName));
          toast.success('تم حذف التصنيف نهائياً');
        } catch { toast.error('فشل الحذف'); }
      },
    });
  };

  const handleSaveNovel = async () => {
    if (!title.trim() || !cover.trim()) { toast.error('املأ الحقول الأساسية'); return; }
    setLoading(true);
    try {
      // نفس نداء التطبيق حرفياً: category = أول تصنيف مختار
      const payload = {
        title: title.trim(),
        titleEn: titleEn.trim() || title.trim(),
        cover: cover.trim(),
        description,
        category: selectedTags[0] || 'أخرى',
        tags: selectedTags,
        status,
      };
      if (novel) {
        await adminService.updateNovel(novel._id, payload);
        toast.success('تم تحديث الرواية بنجاح');
      } else {
        await adminService.createNovel(payload);
        toast.success('تم إنشاء الرواية بنجاح');
      }
      onSaved();
    } catch (err: any) { toast.error(err?.message || 'فشلت العملية'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-5">
      {confirmNode}

      {/* رفع الغلاف — مثل التطبيق */}
      <button
        onClick={() => coverRef.current?.click()}
        disabled={uploadingImage}
        className="w-full h-[200px] rounded-2xl overflow-hidden border border-white/10 bg-[#1e1e1e]/60 relative block group"
      >
        {uploadingImage ? (
          <div className="w-full h-full flex items-center justify-center"><Spinner /></div>
        ) : cover ? (
          <>
            <img src={cover} alt="غلاف" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.2'; }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-black/40 rounded-full p-4 opacity-80 group-hover:opacity-100 transition-opacity">
                <Camera size={24} className="text-white" />
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2.5">
            <ImageIcon size={40} className="text-white/40" />
            <span className="text-white/40 text-sm">رفع الغلاف</span>
          </div>
        )}
      </button>
      <input ref={coverRef} type="file" accept="image/*" hidden onChange={uploadCover} />

      <div className={GLASS + ' p-5 space-y-4'}>
        <div>
          <label className={LABEL_CLS}>عنوان الرواية (عربي)</label>
          <input className={GLASS_INPUT} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="اكتب العنوان هنا..." />
        </div>
        <div>
          <label className={LABEL_CLS}>عنوان الرواية (إنجليزي - اختياري)</label>
          <input className={GLASS_INPUT} value={titleEn} onChange={(e) => setTitleEn(e.target.value)} placeholder="English Title..." dir="ltr" style={{ textAlign: 'left' }} />
        </div>
        <div>
          <label className={LABEL_CLS}>رابط الصورة (اختياري)</label>
          <input className={GLASS_INPUT + ' text-xs'} value={cover} onChange={(e) => setCover(e.target.value)} placeholder="https://..." dir="ltr" style={{ textAlign: 'left' }} />
        </div>
      </div>

      {/* الحالة — رقائق مثل التطبيق */}
      <div className={GLASS + ' p-5'}>
        <label className={LABEL_CLS}>الحالة</label>
        <div className="flex flex-wrap gap-2.5">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => setStatus(opt)}
              className={`px-4 py-2 rounded-full border text-xs transition-colors ${
                status === opt ? 'bg-white/10 border-white text-white font-bold' : 'bg-black/50 border-white/10 text-white/50'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* التصنيفات — مثل التطبيق */}
      <div className={GLASS + ' p-5'}>
        <label className={LABEL_CLS}>التصنيفات المختارة</label>
        {selectedTags.length === 0 ? (
          <p className="text-white/40 text-xs text-center py-2.5">لم يتم اختيار تصنيفات</p>
        ) : (
          <div className="flex flex-wrap justify-end gap-2.5 mb-2.5">
            {selectedTags.map((tag) => (
              <span key={tag} className="flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full py-1.5 px-3">
                <span className="text-white font-bold text-xs">{tag}</span>
                <button onClick={() => toggleTag(tag)} aria-label={`إزالة ${tag}`} className="bg-black/30 rounded-full p-0.5">
                  <X size={12} className="text-white" />
                </button>
              </span>
            ))}
          </div>
        )}

        {isAdmin && (
          <>
            <label className={LABEL_CLS + ' mt-4'}>إضافة تصنيف جديد (مشرف فقط)</label>
            <div className="flex gap-2.5 items-center">
              <input className={GLASS_INPUT} value={customTag} onChange={(e) => setCustomTag(e.target.value)} placeholder="اكتب تصنيفاً جديداً..." />
              <button
                onClick={addCustomTag}
                aria-label="إضافة تصنيف"
                className="w-[50px] h-[50px] shrink-0 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
              >
                <Plus size={22} />
              </button>
            </div>
          </>
        )}

        <label className={LABEL_CLS + ' mt-4'}>اختر من القائمة</label>
        <div className="flex flex-wrap justify-end gap-2">
          {availableCategories.filter((c) => !selectedTags.includes(c)).map((cat) => (
            <span key={cat} className="relative m-0.5">
              <button
                onClick={() => toggleTag(cat)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-[15px] bg-white/5 border border-white/10 text-white/70 text-xs hover:bg-white/10 transition-colors"
              >
                {cat} <Plus size={11} />
              </button>
              {isAdmin && (
                <button
                  onClick={() => handleDeleteCategory(cat)}
                  aria-label={`حذف تصنيف ${cat}`}
                  className="absolute -top-1.5 -left-1.5 z-10 bg-[#111] rounded-md"
                >
                  <XCircleIcon />
                </button>
              )}
            </span>
          ))}
        </div>
      </div>

      <div className={GLASS + ' p-5'}>
        <label className={LABEL_CLS}>الوصف</label>
        <textarea
          className={GLASS_INPUT + ' min-h-[300px] leading-relaxed resize-y'}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="اكتب وصفاً مشوقاً..."
        />
      </div>

      <button onClick={handleSaveNovel} disabled={loading} className={MAIN_BTN}>
        {loading ? <Spinner /> : <span>{novel ? 'حفظ التعديلات' : 'إنشاء الرواية'}</span>}
      </button>
    </div>
  );
}

function XCircleIcon() {
  return (
    <span className="relative block w-4 h-4">
      <span className="absolute inset-0 rounded-full text-red-500">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.3 14.3a1 1 0 01-1.41 0L12 13.41l-2.89 2.89a1 1 0 11-1.41-1.41L10.59 12 7.7 9.11a1 1 0 111.41-1.41L12 10.59l2.89-2.89a1 1 0 111.41 1.41L13.41 12l2.89 2.89a1 1 0 010 1.41z"/></svg>
      </span>
    </span>
  );
}

/* ═══════════ إضافة رواية — «مشروع جديد» ═══════════ */
export function NovelCreatePage() {
  const navigate = useNavigate();
  return (
    <div>
      <PageHead title="مشروع جديد" desc="أدخل بيانات الرواية ثم أضف الفصول من «إضافة وتعديل الفصول»" />
      <div className="max-w-2xl">
        <NovelForm novel={null} onSaved={() => navigate('/dashboard/novels')} />
      </div>
    </div>
  );
}

/* ═══════════ تعديل الرواية — تبويبان: البيانات / الفصول (مثل التطبيق) ═══════════ */
export function NovelEditPage() {
  const { novelId } = useParams();
  const navigate = useNavigate();
  const [novel, setNovel] = useState<AdminNovel | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'novel' | 'chapters'>('novel');

  useEffect(() => {
    if (!novelId) { setNovel(null); return; }
    setLoading(true);
    novelService.getNovelById(novelId, true)
      .then((n: any) => setNovel(n))
      .catch(() => { toast.error('فشل جلب الرواية'); setNovel(null); })
      .finally(() => setLoading(false));
  }, [novelId]);

  if (!novelId) {
    return (
      <div>
        <PageHead title="تعديل تفاصيل رواية" desc="اختر الرواية التي تريد تعديل بياناتها" />
        <NovelPicker actionLabel="تعديل البيانات" onPick={(n) => navigate(`/dashboard/novel-edit/${n._id}`)} />
      </div>
    );
  }

  return (
    <div>
      <PageHead title="تعديل الرواية" desc={novel?.title || '…'}>
        <button onClick={() => navigate('/dashboard/novel-edit')} className={btnGhost}><ArrowRight size={15} /> تغيير الرواية</button>
      </PageHead>

      {/* التبويبان مثل التطبيق: البيانات / الفصول */}
      <div className="flex gap-3.5 mb-5">
        <button
          onClick={() => setActiveTab('novel')}
          className={`px-5 py-2 rounded-full border font-semibold text-sm transition-colors ${
            activeTab === 'novel' ? 'bg-white/10 border-white/30 text-white' : 'bg-[#141414]/60 border-white/10 text-white/50'
          }`}
        >
          البيانات
        </button>
        <button
          onClick={() => setActiveTab('chapters')}
          className={`px-5 py-2 rounded-full border font-semibold text-sm transition-colors ${
            activeTab !== 'novel' ? 'bg-white/10 border-white/30 text-white' : 'bg-[#141414]/60 border-white/10 text-white/50'
          }`}
        >
          الفصول
        </button>
      </div>

      <div className="max-w-2xl">
        {loading ? (
          <div className="py-16 flex justify-center"><Spinner /></div>
        ) : activeTab === 'novel' ? (
          novel ? (
            <NovelForm novel={novel} onSaved={() => toast.success('محفوظ')} />
          ) : (
            <p className="text-white/50 text-center py-10">تعذر جلب الرواية — اختر رواية أخرى</p>
          )
        ) : (
          <ChaptersManager novelId={novelId} hideBackToPicker />
        )}
      </div>
    </div>
  );
}

/* ═══════════ 4. إضافة وتعديل الفصول — AdminDashboardScreen (تبويب الفصول) ═══════════ */
export function ChaptersPage() {
  const { novelId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  if (!novelId) {
    return (
      <div>
        <PageHead title="إضافة وتعديل الفصول" desc="اختر رواية لإدارة فصولها: إضافة، تعديل، حذف، تحديد بالنطاق، ونشر ZIP" />
        <NovelPicker actionLabel="إدارة الفصول" onPick={(n) => navigate(`/dashboard/chapters/${n._id}`)} />
      </div>
    );
  }
  return <ChaptersManager novelId={novelId} autoAdd={searchParams.get('add') === '1'} />;
}

function ChaptersManager({ novelId, autoAdd = false, hideBackToPicker = false }: {
  novelId: string;
  autoAdd?: boolean;
  hideBackToPicker?: boolean;
}) {
  const navigate = useNavigate();
  const [novelTitle, setNovelTitle] = useState('');
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // نفس حالات التطبيق
  const [view, setView] = useState<'list' | 'form'>('list'); // قائمة الفصول / نموذج الفصل
  const [chapterMode, setChapterMode] = useState<'single' | 'zip'>('single');
  const [isEditingChapter, setIsEditingChapter] = useState(false);
  const [chapterNumber, setChapterNumber] = useState('');
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterContent, setChapterContent] = useState('');
  const [saving, setSaving] = useState(false);

  const [chapterSearch, setChapterSearch] = useState('');
  const [sortAsc, setSortAsc] = useState(true);
  const [displayedLimit, setDisplayedLimit] = useState(150); // نفس حد التطبيق

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedChapNums, setSelectedChapNums] = useState<number[]>([]);
  const [batchRangeInput, setBatchRangeInput] = useState('');

  const [zipFile, setZipFile] = useState<File | null>(null);
  const [zipBusy, setZipBusy] = useState(false);
  const [zipLogs, setZipLogs] = useState<string[]>([]);
  const zipRef = useRef<HTMLInputElement>(null);
  const { ask, confirmNode } = useConfirm();

  const fetchNovelChapters = useCallback(async () => {
    setLoading(true);
    try {
      // نفس نداء التطبيق: chapters-list بحد كبير لجلب كل الفصول للإدارة
      const res = await novelService.getChaptersListFull(novelId, 1, 5000, 'asc', '', true);
      setChapters(res.chapters);
    } catch {
      toast.error('فشل جلب قائمة الفصول');
    } finally { setLoading(false); }
  }, [novelId]);

  useEffect(() => {
    novelService.getNovelById(novelId, true).then((n: any) => setNovelTitle(n?.title || '')).catch(() => {});
    fetchNovelChapters();
    if (autoAdd) prepareAddChapter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [novelId]);

  // 🔥 التصفية والترتيب — نفس منطق التطبيق
  const processedChapters = useMemo(() => {
    let result = [...chapters];
    if (chapterSearch.trim()) {
      const q = chapterSearch.toLowerCase();
      result = result.filter((c) => (c.title && c.title.toLowerCase().includes(q)) || String(c.number).includes(q));
    }
    result.sort((a, b) => (sortAsc ? a.number - b.number : b.number - a.number));
    return result;
  }, [chapters, chapterSearch, sortAsc]);

  // 🔥 التحميل المتدرج — نفس التطبيق (150 لكل دفعة)
  const visibleChapters = useMemo(() => processedChapters.slice(0, displayedLimit), [processedChapters, displayedLimit]);

  const nextChapterNumber = () => (chapters.length > 0 ? Math.max(...chapters.map((c) => c.number)) + 1 : 1);

  const prepareAddChapter = () => {
    setIsEditingChapter(false);
    setChapterNumber(String(nextChapterNumber()));
    setChapterTitle('');
    setChapterContent('');
    setChapterMode('single');
    setView('form');
  };

  const prepareEditChapter = async (chap: any) => {
    setIsEditingChapter(true);
    setChapterNumber(String(chap.number));
    setChapterTitle(chap.title || '');
    setChapterContent('');
    setChapterMode('single');
    setView('form');
    try {
      const ch = await novelService.getChapter(novelId, String(chap.number));
      setChapterContent(ch?.content || '');
    } catch { toast.error('فشل تحميل محتوى الفصل'); }
  };

  const handleSaveChapter = async () => {
    const num = parseInt(chapterNumber);
    if (!num || !chapterTitle.trim() || !chapterContent.trim()) { toast.error('جميع الحقول مطلوبة'); return; }
    setSaving(true);
    try {
      if (isEditingChapter) {
        await adminService.updateChapter(novelId, num, { title: chapterTitle.trim(), content: chapterContent });
        toast.success('تم تعديل الفصل بنجاح');
      } else {
        await adminService.addChapter({ novelId, number: num, title: chapterTitle.trim(), content: chapterContent });
        toast.success('تم إضافة الفصل بنجاح');
      }
      await fetchNovelChapters();
      setView('list');
    } catch (err: any) { toast.error(err?.message || 'فشل الرفع — تأكد أن رقم الفصل غير موجود مسبقاً'); }
    finally { setSaving(false); }
  };

  const handleDeleteChapter = (chapNum: number) => {
    ask({
      title: 'حذف الفصل',
      message: `هل أنت متأكد من حذف الفصل رقم ${chapNum}؟`,
      onConfirm: async () => {
        try {
          await adminService.deleteChapter(novelId, chapNum);
          toast.success('تم حذف الفصل');
          fetchNovelChapters();
        } catch { toast.error('فشل الحذف'); }
      },
    });
  };

  // 🔥 التحديد المتعدد (مكافئ الضغط المطول في التطبيق — زر «تحديد» للويب)
  const handleToggleSelection = (chapNum: number) => {
    if (selectedChapNums.includes(chapNum)) {
      const newVal = selectedChapNums.filter((n) => n !== chapNum);
      setSelectedChapNums(newVal);
      if (newVal.length === 0) setIsSelectionMode(false);
    } else {
      setSelectedChapNums([...selectedChapNums, chapNum]);
    }
  };

  const handleSelectAll = () => {
    if (selectedChapNums.length === chapters.length) {
      setSelectedChapNums([]);
      setIsSelectionMode(false);
    } else {
      setSelectedChapNums(chapters.map((c) => c.number));
    }
  };

  const handleRangeSelection = () => {
    if (!batchRangeInput.trim()) return;
    const rangeParts = batchRangeInput.split('-');
    let start = parseInt(rangeParts[0]);
    let end = parseInt(rangeParts[1]);
    if (isNaN(start) || isNaN(end)) { toast.error('صيغة غير صحيحة (مثال: 100-200)'); return; }
    if (start > end) [start, end] = [end, start];
    const availableNums = new Set(chapters.map((c) => c.number));
    const newSelection: number[] = [];
    for (let i = start; i <= end; i++) {
      if (availableNums.has(i)) newSelection.push(i);
    }
    setSelectedChapNums((prev) => Array.from(new Set([...prev, ...newSelection])));
    setBatchRangeInput('');
    toast.success(`تم تحديد ${newSelection.length} فصل`);
  };

  const handleBatchDelete = () => {
    if (selectedChapNums.length === 0) return;
    ask({
      title: 'حذف متعدد',
      message: `هل أنت متأكد من حذف ${selectedChapNums.length} فصل؟`,
      onConfirm: async () => {
        try {
          await adminService.batchDeleteChapters(novelId, selectedChapNums);
          toast.success('تم الحذف بنجاح');
          setIsSelectionMode(false);
          setSelectedChapNums([]);
          fetchNovelChapters();
        } catch { toast.error('فشل الحذف'); }
      },
    });
  };

  const handleBulkUpload = async () => {
    if (!zipFile) { toast.error('يرجى اختيار ملف ZIP'); return; }
    setZipBusy(true);
    setZipLogs([]);
    try {
      const res: any = await adminService.bulkUploadZip(novelId, zipFile);
      const successCount = res?.successCount || 0;
      const errors: string[] = res?.errors || [];
      if (successCount > 0) {
        toast.success(`تم نشر ${successCount} فصل بنجاح!`);
        setZipLogs([`✅ تم إضافة ${successCount} فصل بنجاح.`, ...errors]);
        fetchNovelChapters();
      } else {
        toast.error('لم يتم إضافة أي فصل');
        setZipLogs(['❌ لم يتم العثور على فصول صالحة.', ...errors]);
      }
      setZipFile(null);
    } catch (err: any) {
      const msg = err?.message || 'حدث خطأ أثناء الرفع';
      toast.error(msg);
      setZipLogs([`❌ خطأ فادح: ${msg}`]);
    } finally { setZipBusy(false); }
  };

  /* ─── نموذج الفصل (نشر منفرد / نشر ZIP) ─── */
  if (view === 'form') {
    return (
      <div className="space-y-5">
        {confirmNode}
        <button onClick={() => setView('list')} className="flex items-center gap-1.5 text-white text-sm hover:opacity-80">
          <ArrowRight size={16} /> رجوع للقائمة
        </button>

        {!isEditingChapter && (
          <div className="bg-black/50 rounded-xl p-1 flex">
            <button
              onClick={() => setChapterMode('single')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${chapterMode === 'single' ? 'bg-white/10 text-white' : 'text-white/60'}`}
            >
              نشر منفرد
            </button>
            <button
              onClick={() => setChapterMode('zip')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${chapterMode === 'zip' ? 'bg-white/10 text-white' : 'text-white/60'}`}
            >
              نشر ZIP
            </button>
          </div>
        )}

        {chapterMode === 'single' ? (
          <div className={GLASS + ' p-5 space-y-4'}>
            <div className="flex gap-4">
              <div className="w-1/3">
                <label className={LABEL_CLS}>رقم الفصل</label>
                <input type="number" min={1} className={GLASS_INPUT} value={chapterNumber} onChange={(e) => setChapterNumber(e.target.value)} placeholder="1" />
              </div>
              <div className="flex-1">
                <label className={LABEL_CLS}>العنوان</label>
                <input className={GLASS_INPUT} value={chapterTitle} onChange={(e) => setChapterTitle(e.target.value)} placeholder="مثال: البداية" />
              </div>
            </div>
            <div>
              <label className={LABEL_CLS}>المحتوى</label>
              <textarea
                className={GLASS_INPUT + ' min-h-[400px] leading-[24px] resize-y'}
                value={chapterContent}
                onChange={(e) => setChapterContent(e.target.value)}
                placeholder="اكتب أو الصق النص هنا..."
                dir="auto"
              />
            </div>
            <button onClick={handleSaveChapter} disabled={saving} className={MAIN_BTN}>
              {saving ? <Spinner /> : <span>{isEditingChapter ? 'حفظ التعديل' : 'نشر الفصل'}</span>}
            </button>
          </div>
        ) : (
          <div className={GLASS + ' p-5 space-y-4'}>
            <p className="text-white/50 text-xs leading-5 text-right">
              ارفع ملف ZIP يحتوي على ملفات نصية (.txt). سيتم استخراج الأرقام من أسماء الملفات.
            </p>
            <button
              onClick={() => zipRef.current?.click()}
              className="w-full h-[150px] bg-black/50 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2.5 hover:border-white/25 transition-colors"
            >
              {zipFile ? (
                <>
                  <FileText size={40} className="text-white" />
                  <span className="text-white mt-2">{zipFile.name}</span>
                </>
              ) : (
                <>
                  <CloudUpload size={48} className="text-white/40" />
                  <span className="text-white/40 text-sm mt-2">اضغط لاختيار ملف .zip</span>
                </>
              )}
            </button>
            <input ref={zipRef} type="file" accept=".zip" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) setZipFile(f); }} />
            <button onClick={handleBulkUpload} disabled={zipBusy || !zipFile} className={MAIN_BTN}>
              {zipBusy ? <Spinner /> : <span>بدء المعالجة والنشر</span>}
            </button>
            {zipLogs.length > 0 && (
              <div className="bg-black rounded-lg p-3 max-h-56 overflow-y-auto">
                {zipLogs.map((log, i) => (
                  <p key={i} className={`text-[11px] leading-5 ${log.includes('❌') ? 'text-[#ff6b6b]' : 'text-[#4ade80]'}`} dir="auto">{log}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  /* ─── قائمة الفصول ─── */
  return (
    <div>
      {confirmNode}

      {!hideBackToPicker && (
        <PageHead title={novelTitle || 'إدارة الفصول'} desc={`${chapters.length} فصلاً`}>
          <button onClick={() => navigate('/dashboard/chapters')} className={btnGhost}><ArrowRight size={15} /> تغيير الرواية</button>
        </PageHead>
      )}

      {/* البحث والترتيب — مثل التطبيق */}
      <div className="flex flex-row-reverse gap-2.5 mb-4">
        <div className="flex-1 flex items-center gap-2 bg-[#1a1a1a] border border-[#333] rounded-xl px-3 h-[45px]">
          <Search size={17} className="text-white/40 shrink-0" />
          <input
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30 text-right"
            placeholder="بحث برقم الفصل..."
            value={chapterSearch}
            onChange={(e) => setChapterSearch(e.target.value)}
          />
          {chapterSearch && (
            <button onClick={() => setChapterSearch('')} aria-label="مسح" className="text-white/40 hover:text-white"><X size={15} /></button>
          )}
        </div>
        <button
          onClick={() => setSortAsc(!sortAsc)}
          className="flex items-center gap-1.5 px-3 rounded-xl border font-bold text-xs shrink-0 transition-colors"
          style={{ color: BLUE, borderColor: `${BLUE}4D`, background: `${BLUE}1A` }}
        >
          {sortAsc ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
          <span>{sortAsc ? '1 ➔ 9' : '9 ➔ 1'}</span>
        </button>
        {!isSelectionMode && (
          <button
            onClick={() => { setIsSelectionMode(true); setSelectedChapNums([]); }}
            className="px-3 rounded-xl border border-white/20 bg-white/5 text-white/80 text-xs font-bold shrink-0 hover:bg-white/10 transition-colors"
          >
            تحديد
          </button>
        )}
      </div>

      {/* شريط التحديد / بطاقة الإضافة — مثل التطبيق */}
      {isSelectionMode ? (
        <div className="bg-[#1a1a1a] rounded-2xl p-4 border-b-2 mb-4" style={{ borderColor: BLUE }}>
          <div className="flex items-center justify-between mb-2.5">
            <button onClick={() => { setIsSelectionMode(false); setSelectedChapNums([]); }} className="text-red-500 font-bold text-sm">إلغاء</button>
            <span className="text-white font-bold text-sm">تحديد: {selectedChapNums.length}</span>
            <button onClick={handleSelectAll} className="font-bold text-sm" style={{ color: BLUE }}>تحديد الكل</button>
          </div>
          <div className="flex gap-2.5">
            <div className="flex-1 flex bg-[#222] rounded-lg p-0.5">
              <input
                className="flex-1 bg-transparent text-white text-xs text-center outline-none placeholder:text-white/30"
                placeholder="171-400"
                value={batchRangeInput}
                onChange={(e) => setBatchRangeInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleRangeSelection(); }}
                dir="ltr"
              />
              <button onClick={handleRangeSelection} aria-label="تطبيق النطاق" className="w-8 rounded-md flex items-center justify-center text-white" style={{ background: BLUE }}>
                <Check size={15} />
              </button>
            </div>
            <button
              onClick={handleBatchDelete}
              disabled={selectedChapNums.length === 0}
              className="flex items-center gap-1.5 px-4 rounded-lg bg-[#b91c1c] text-white disabled:opacity-50"
            >
              <Trash2 size={18} />
              <span className="text-xs font-bold">حذف</span>
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={prepareAddChapter}
          className="w-full mb-5 rounded-2xl border-2 border-dashed border-white/20 bg-white/5 py-8 flex flex-col items-center gap-1.5 hover:bg-white/10 transition-colors"
        >
          <PlusCircle size={30} className="text-white" />
          <span className="text-white font-bold text-sm mt-1">إضافة فصل جديد</span>
        </button>
      )}

      {loading ? (
        <div className="py-16 flex justify-center"><Spinner /></div>
      ) : visibleChapters.length === 0 ? (
        <p className="text-white/40 text-center py-8 text-sm">
          {chapterSearch ? 'لا توجد فصول تطابق بحثك.' : 'لا توجد فصول بعد — أضف أول فصل'}
        </p>
      ) : (
        <div className="space-y-2.5">
          {visibleChapters.map((chap) => {
            const isSelected = selectedChapNums.includes(chap.number);
            return (
              <div
                key={chap.number}
                onClick={() => { if (isSelectionMode) handleToggleSelection(chap.number); }}
                className={`flex flex-row-reverse items-center gap-3 p-4 rounded-xl border transition-colors ${
                  isSelectionMode && isSelected ? 'bg-[#4a7cc7]/20 border-[#4a7cc7]' : 'bg-[#1e1e1e]/60 border-white/10'
                } ${isSelectionMode ? 'cursor-pointer' : ''}`}
              >
                <div className="flex-1 text-right min-w-0">
                  <p className="text-white/70 text-xs font-bold">#{chap.number}</p>
                  <p className="text-white text-sm font-bold truncate">{chap.title || `الفصل ${chap.number}`}</p>
                </div>
                {isSelectionMode ? (
                  <div className="w-6 h-6 rounded-full border bg-[#1a1a1a] flex items-center justify-center shrink-0" style={{ borderColor: BLUE }}>
                    {isSelected && <Check size={14} style={{ color: BLUE }} />}
                  </div>
                ) : (
                  <div className="flex gap-2.5 shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); prepareEditChapter(chap); }} aria-label="تعديل" className="p-2 bg-white/5 rounded-lg text-white hover:bg-white/10 transition-colors">
                      <Pencil size={17} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteChapter(chap.number); }} aria-label="حذف" className="p-2 bg-white/5 rounded-lg text-red-500 hover:bg-red-500/15 transition-colors">
                      <Trash2 size={17} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* عرض المزيد — نفس التطبيق */}
          {visibleChapters.length < processedChapters.length && (
            <button
              onClick={() => setDisplayedLimit((p) => p + 150)}
              className="w-full py-4 bg-white/5 rounded-xl border border-[#333] font-bold text-sm my-2.5 transition-colors hover:bg-white/10"
              style={{ color: BLUE }}
            >
              عرض المزيد من الفصول
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════ 5. النشر المتعدد — BulkUploadScreen ═══════════ */
export function BulkUploadPage() {
  const { novelId } = useParams();
  const navigate = useNavigate();
  const { userInfo } = useAuth();
  const isAdmin = userInfo?.role === 'admin';
  const [novelsList, setNovelsList] = useState<AdminNovel[]>([]);
  const [fetchingNovels, setFetchingNovels] = useState(true);
  const [selectedNovel, setSelectedNovel] = useState<AdminNovel | null>(null);
  const [showNovelPicker, setShowNovelPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const zipRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await novelService.getNovels({ page: 1, limit: 1000 });
        let list: AdminNovel[] = res.novels || [];
        if (!isAdmin) {
          list = list.filter((n) => (n as any).authorEmail === userInfo?.email || (n as any).authorId === userInfo?._id);
        }
        if (alive) setNovelsList(list);
      } catch {
        toast.error('فشل جلب قائمة الروايات');
      } finally { if (alive) setFetchingNovels(false); }
    })();
    return () => { alive = false; };
  }, [isAdmin, userInfo?.email, userInfo?._id]);

  // دعم الرابط المباشر: /dashboard/bulk-upload/{novelId} يختار الرواية مسبقاً
  useEffect(() => {
    if (novelId && novelsList.length > 0 && !selectedNovel) {
      const pre = novelsList.find((n) => n._id === novelId);
      if (pre) setSelectedNovel(pre);
    }
  }, [novelId, novelsList, selectedNovel]);

  const handleUpload = async () => {
    if (!selectedNovel) { toast.error('يرجى اختيار الرواية أولاً'); return; }
    if (!selectedFile) { toast.error('يرجى اختيار ملف ZIP'); return; }
    setLoading(true);
    setLogs([]);
    try {
      const res: any = await adminService.bulkUploadZip(selectedNovel._id, selectedFile);
      const successCount = res?.successCount || 0;
      const errors: string[] = res?.errors || [];
      if (successCount > 0) {
        toast.success(`تم نشر ${successCount} فصل بنجاح!`);
        setLogs([`✅ تم إضافة ${successCount} فصل بنجاح.`, ...errors]);
        setSelectedFile(null);
      } else {
        toast.error('لم يتم إضافة أي فصل');
        setLogs(['❌ لم يتم العثور على فصول صالحة.', ...errors]);
      }
    } catch (err: any) {
      const msg = err?.message || 'حدث خطأ أثناء الرفع';
      toast.error(msg);
      setLogs([`❌ خطأ فادح: ${msg}`]);
    } finally { setLoading(false); }
  };

  return (
    <div>
      <PageHead title="النشر المتعدد" />

      <div className="max-w-2xl space-y-6">
        {/* صندوق الشرح — نفس نص التطبيق */}
        <div className={GLASS + ' p-4'}>
          <p className="text-white/70 text-sm leading-[22px] text-right">
            قم برفع ملف ZIP يحتوي على ملفات نصية (.txt). سيتم استخراج رقم الفصل من اسم الملف (مثال: 10.txt) والعنوان من السطر الأول داخل الملف.
          </p>
        </div>

        {/* 1. اختر الرواية */}
        <div>
          <h3 className="text-white font-bold text-base mb-2.5 text-right">1. اختر الرواية</h3>
          <div className={GLASS}>
            <button
              onClick={() => setShowNovelPicker(true)}
              disabled={fetchingNovels}
              className="w-full flex items-center justify-between px-4 py-4 text-right"
            >
              <ChevronDown size={20} className="text-white/40" />
              <span className={`text-sm ${selectedNovel ? 'text-white font-bold' : 'text-white/50'}`}>
                {fetchingNovels ? 'جارٍ جلب الروايات…' : selectedNovel ? selectedNovel.title : 'اضغط للاختيار من القائمة'}
              </span>
            </button>
          </div>
        </div>

        {/* 2. ملف الفصول (ZIP) */}
        <div>
          <h3 className="text-white font-bold text-base mb-2.5 text-right">2. ملف الفصول (ZIP)</h3>
          <div className={GLASS}>
            <button onClick={() => zipRef.current?.click()} className="w-full h-[150px] bg-black/30 flex items-center justify-center">
              {selectedFile ? (
                <div className="flex flex-col items-center gap-1.5">
                  <FileText size={32} className="text-white" />
                  <span className="text-white font-bold text-base">{selectedFile.name}</span>
                  <span className="text-white/50 text-xs">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2.5">
                  <CloudUpload size={40} className="text-white/40" />
                  <span className="text-white/40 text-sm">اضغط لاختيار ملف .zip</span>
                </div>
              )}
            </button>
            <input ref={zipRef} type="file" accept=".zip" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) setSelectedFile(f); }} />
          </div>
        </div>

        {/* زر النشر — نفس نص التطبيق */}
        <button
          onClick={handleUpload}
          disabled={!selectedNovel || !selectedFile || loading}
          className={MAIN_BTN + ' h-[55px] disabled:opacity-50 disabled:bg-[#323232]/50 disabled:border-[#333]'}
        >
          {loading ? <Spinner /> : <span>بدء المعالجة والنشر</span>}
        </button>

        {/* سجل العملية */}
        {logs.length > 0 && (
          <div className={GLASS + ' p-4'}>
            <h4 className="text-white font-bold text-sm mb-2.5 text-right">سجل العملية:</h4>
            <div className="max-h-56 overflow-y-auto">
              {logs.map((log, i) => (
                <p key={i} className={`text-xs mb-1 text-right ${log.includes('❌') ? 'text-[#ff6b6b]' : 'text-[#4ade80]'}`} dir="auto">{log}</p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* منتقي الروايات المنبثق — مثل التطبيق */}
      {showNovelPicker && (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-5" onClick={() => setShowNovelPicker(false)}>
          <div className="bg-[#161616] border border-[#333] rounded-2xl p-5 w-full max-w-md max-h-[60%] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white font-bold text-lg text-center mb-5">اختر رواية للنشر</h3>
            <div className="flex-1 overflow-y-auto">
              {novelsList.length === 0 ? (
                <p className="text-white/40 text-center py-8 text-sm">لا توجد روايات متاحة لك</p>
              ) : (
                novelsList.map((item) => (
                  <button
                    key={item._id}
                    onClick={() => { setSelectedNovel(item); setShowNovelPicker(false); }}
                    className="w-full flex flex-row-reverse items-center justify-between px-4 py-3.5 border-b border-[#222] last:border-0 hover:bg-white/5 transition-colors"
                  >
                    {selectedNovel?._id === item._id && <Check size={18} className="text-white" />}
                    <span className="text-white/80 text-base">{item.title}</span>
                  </button>
                ))
              )}
            </div>
            <button onClick={() => setShowNovelPicker(false)} className="mt-5 py-3.5 bg-[#333] rounded-xl text-white">إغلاق</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════ 6. المسرد — GlossaryManagerScreen ═══════════ */
const GLOSSARY_CATS = [
  { id: 'characters', label: 'شخصيات' },
  { id: 'locations', label: 'أماكن' },
  { id: 'items', label: 'عناصر' },
  { id: 'ranks', label: 'رتب' },
  { id: 'other', label: 'أخرى' },
];

export function GlossaryPage() {
  const { novelId } = useParams();
  const navigate = useNavigate();
  const [terms, setTerms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('characters');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [inputTerm, setInputTerm] = useState('');
  const [inputTrans, setInputTrans] = useState('');
  const [inputDesc, setInputDesc] = useState('');
  const [inputCat, setInputCat] = useState('characters');

  const fetchTerms = useCallback(async () => {
    if (!novelId) return;
    setLoading(true);
    try { setTerms(await translatorService.getGlossary(novelId)); }
    catch { /* مثل التطبيق: فشل صامت */ }
    finally { setLoading(false); }
  }, [novelId]);
  useEffect(() => { fetchTerms(); }, [fetchTerms]);

  // نفس فلترة التطبيق: القسم النشط ثم البحث
  const filteredTerms = useMemo(() => {
    let data = terms.filter((t) => (t.category || 'other') === activeTab);
    if (search.trim()) {
      const lower = search.toLowerCase();
      data = data.filter((t) => t.term?.toLowerCase().includes(lower) || t.translation?.includes(search));
    }
    return data;
  }, [terms, activeTab, search]);

  const resetForm = () => {
    setInputTerm(''); setInputTrans(''); setInputDesc(''); setInputCat(activeTab); setEditId(null);
  };

  const openAdd = () => { resetForm(); setShowModal(true); };

  const openEdit = (item: any) => {
    setEditId(item._id);
    setInputTerm(item.term || '');
    setInputTrans(item.translation || '');
    setInputDesc(item.description || '');
    setInputCat(item.category || 'other');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!inputTerm.trim() || !inputTrans.trim()) { toast.error('البيانات ناقصة'); return; }
    try {
      await translatorService.upsertTerm(novelId!, inputTerm.trim(), inputTrans.trim(), inputCat || activeTab, inputDesc);
      await fetchTerms();
      setShowModal(false);
      resetForm();
      toast.success('تم الحفظ');
    } catch { toast.error('فشل الحفظ'); }
  };

  const deleteTerm = (item: any) => {
    // مربع تأكيد مثل التطبيق (إلغاء / حذف)
    if (!window.confirm('هل أنت متأكد؟')) return;
    (async () => {
      try {
        await translatorService.deleteTerm(item._id);
        setTerms((prev) => prev.filter((t) => t._id !== item._id));
        toast.success('تم الحذف');
      } catch { toast.error('فشل الحذف'); }
    })();
  };

  if (!novelId) {
    return (
      <div>
        <PageHead title="المسرد" desc="قاموس مصطلحات لكل رواية يستخدمه الذكاء الاصطناعي للترجمة الموحدة (أسماء، أماكن، رتب…)" />
        <NovelPicker actionLabel="إدارة المصطلحات" onPick={(n) => navigate(`/dashboard/glossary/${n._id}`)} />
      </div>
    );
  }

  return (
    <div className="relative">
      <PageHead title="المسرد" desc="المصطلحات المعتمدة التي يلتزم بها المرجع أثناء الترجمة">
        <button onClick={() => navigate('/dashboard/glossary')} className={btnGhost}><ArrowRight size={15} /> تغيير الرواية</button>
      </PageHead>

      {/* أقسام المسرد — نفس تبويبات التطبيق */}
      <div className="flex flex-wrap gap-2 mb-4">
        {GLOSSARY_CATS.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveTab(cat.id)}
            className={`px-4 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
              activeTab === cat.id ? 'bg-white/10 border-white text-white' : 'bg-[#1e1e1e]/60 border-[#333] text-white/50'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* البحث */}
      <div className="mb-4">
        <div className="flex flex-row-reverse items-center gap-2.5 p-2.5 bg-[#1e1e1e]/60 border border-white/10 rounded-xl">
          <Search size={19} className="text-white/40 shrink-0" />
          <input
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30 text-right"
            placeholder="بحث..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* بطاقات المصطلحات */}
      {loading ? (
        <div className="py-16 flex justify-center"><Spinner /></div>
      ) : filteredTerms.length === 0 ? (
        <p className="text-white/40 text-center py-14 text-sm">لا توجد مصطلحات</p>
      ) : (
        <div className="space-y-2.5 pb-20">
          {filteredTerms.map((item) => (
            <div key={item._id} className={`${GLASS} rounded-xl flex items-center p-3`}>
              <button onClick={() => deleteTerm(item)} aria-label="حذف" className="p-2 border-l border-[#333] ml-3 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors shrink-0">
                <Trash2 size={17} />
              </button>
              <button onClick={() => openEdit(item)} className="flex-1 text-right min-w-0">
                <div className="flex flex-row-reverse items-center gap-2 mb-1">
                  <span className="text-white font-bold text-sm">{item.translation}</span>
                  <ArrowRight size={12} className="text-white/40" />
                  <span className="text-white/60 text-xs" dir="auto">{item.term}</span>
                </div>
                {item.description ? <p className="text-white/40 text-[10px] text-right truncate">{item.description}</p> : null}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* زر الإضافة العائم — مثل التطبيق */}
      <button
        onClick={openAdd}
        aria-label="إضافة مصطلح"
        className="fixed bottom-8 left-8 w-14 h-14 rounded-full bg-[#06b6d4] text-white flex items-center justify-center shadow-lg hover:brightness-110 transition-all z-50"
      >
        <Plus size={28} />
      </button>

      {/* نافذة الإضافة/التعديل — مثل التطبيق */}
      {showModal && (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-5" onClick={() => setShowModal(false)}>
          <div className="bg-[#161616] border border-[#333] rounded-2xl p-5 w-full max-w-md max-h-[80%] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white font-bold text-lg text-center mb-5">{editId ? 'تعديل' : 'إضافة'}</h3>
            <label className="block text-white/50 text-xs mb-1.5 text-right">القسم</label>
            <div className="flex flex-wrap gap-2 mb-4">
              {GLOSSARY_CATS.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setInputCat(cat.id)}
                  className={`px-2.5 py-1 rounded-lg border text-xs transition-colors ${
                    inputCat === cat.id ? 'bg-[#06b6d4] border-[#06b6d4] text-white' : 'bg-[#222] border-[#333] text-white/60'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <label className="block text-white/50 text-xs mb-1.5 text-right">English</label>
            <input className="w-full bg-[#222] text-white p-2.5 rounded-lg border border-[#333] mb-4 outline-none focus:border-white/30 text-sm" value={inputTerm} onChange={(e) => setInputTerm(e.target.value)} dir="ltr" style={{ textAlign: 'left' }} />
            <label className="block text-white/50 text-xs mb-1.5 text-right">عربي</label>
            <input className="w-full bg-[#222] text-white p-2.5 rounded-lg border border-[#333] mb-4 outline-none focus:border-white/30 text-sm text-right" value={inputTrans} onChange={(e) => setInputTrans(e.target.value)} />
            <label className="block text-white/50 text-xs mb-1.5 text-right">وصف (اختياري)</label>
            <input className="w-full bg-[#222] text-white p-2.5 rounded-lg border border-[#333] mb-4 outline-none focus:border-white/30 text-sm text-right" value={inputDesc} onChange={(e) => setInputDesc(e.target.value)} />
            <div className="flex gap-2.5 mt-2.5">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-lg bg-[#333] text-white text-sm font-bold">إلغاء</button>
              <button onClick={handleSave} className="flex-1 py-3 rounded-lg bg-[#06b6d4] text-white text-sm font-bold hover:brightness-110">حفظ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
