/**
 * صفحات قسم المترجمين — كل وظيفة واجهة مستقلة كاملة:
 * رواياتي / إضافة رواية / تعديل تفاصيل رواية / إضافة وتعديل الفصول /
 * نشر جماعي ZIP / إدارة المصطلحات.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Plus, FileText, Trash2, Pencil, Upload, CheckSquare, Square, ArrowRight,
  BookMarked, Languages, Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { adminService, AdminNovel } from '../../services/admin';
import { novelService } from '../../services/novel';
import { categoryService } from '../../services/category';
import { useAuth } from '../../context/AuthContext';
import { translatorService } from '../../services/translator';
import {
  inputCls, btnPrimary, btnGhost, Spinner, NovelFormModal, ChapterModal,
  NovelPicker, PageHead, EMPTY_FORM,
} from './shared';

/* ═══════════ رواياتي ═══════════ */
export function NovelsPage() {
  const navigate = useNavigate();
  const { userInfo } = useAuth();
  const isAdmin = userInfo?.role === 'admin';
  const [novels, setNovels] = useState<AdminNovel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  const loadNovels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await novelService.getNovels({ page: 1, limit: 100 });
      let list: AdminNovel[] = res.novels || [];
      if (!isAdmin) {
        list = list.filter((n) => (n as any).authorEmail === userInfo?.email || (n as any).authorId === userInfo?._id);
      }
      setNovels(list);
    } catch {
      toast.error('فشل جلب الروايات');
    } finally { setLoading(false); }
  }, [isAdmin, userInfo?.email, userInfo?._id]);

  useEffect(() => { loadNovels(); }, [loadNovels]);
  useEffect(() => { categoryService.getCategories().then(setCategories).catch(() => {}); }, []);

  return (
    <div>
      <PageHead title="رواياتي" desc={isAdmin ? 'كل روايات الموقع — إدارة كاملة' : 'الروايات التي تملكها — إدارة كاملة'}>
        <button onClick={() => setShowCreate(true)} className={btnPrimary}><Plus size={16} /> رواية جديدة</button>
      </PageHead>

      {loading ? (
        <div className="py-24 flex justify-center"><Spinner /></div>
      ) : novels.length === 0 ? (
        <div className="py-24 text-center">
          <FileText size={40} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/50 mb-4">{isAdmin ? 'لا توجد روايات بعد' : 'لم تُضف رواياتك بعد'}</p>
          <button onClick={() => setShowCreate(true)} className={btnPrimary + ' mx-auto'}><Plus size={16} /> إنشاء أول رواية</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {novels.map((n) => (
            <motion.div key={n._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <div className="flex gap-3 p-3">
                <img src={n.cover} alt="" className="w-16 h-24 rounded-lg object-cover shrink-0 bg-black/40" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.15'; }} />
                <div className="min-w-0 flex-1">
                  <h3 className="text-white font-bold text-sm line-clamp-2 leading-snug">{n.title}</h3>
                  <p className="text-white/40 text-xs mt-1">{n.chaptersCount ?? 0} فصل · {n.views || 0} مشاهدة</p>
                  <p className="text-white/30 text-xs mt-0.5 truncate">{n.author || '—'}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 border-t border-white/10 text-xs font-bold">
                <button onClick={() => navigate(`/dashboard/chapters/${n._id}`)} className="py-2.5 text-white/80 hover:bg-white/10 flex items-center justify-center gap-1.5">
                  <FileText size={14} /> الفصول
                </button>
                <button onClick={() => navigate(`/dashboard/novel-edit/${n._id}`)} className="py-2.5 border-r border-white/10 text-white/80 hover:bg-white/10 flex items-center justify-center gap-1.5">
                  <Pencil size={13} /> البيانات
                </button>
                <button
                  onClick={async () => {
                    if (!isAdmin) { navigate(`/dashboard/novel-edit/${n._id}`); return; }
                    if (!window.confirm(`حذف رواية «${n.title}» وكل فصولها نهائياً؟`)) return;
                    try { await adminService.deleteNovel(n._id); toast.success('حُذفت الرواية'); loadNovels(); }
                    catch { toast.error('فشل الحذف'); }
                  }}
                  className={`py-2.5 border-r border-white/10 flex items-center justify-center gap-1.5 ${isAdmin ? 'text-red-400 hover:bg-red-500/10' : 'text-white/80 hover:bg-white/10'}`}
                >
                  {isAdmin ? <><Trash2 size={14} /> حذف</> : <><Pencil size={13} /> تعديل</>}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {showCreate && (
        <NovelFormModal
          initial={EMPTY_FORM}
          categories={categories}
          onClose={() => setShowCreate(false)}
          onSaved={loadNovels}
        />
      )}
    </div>
  );
}

/* ═══════════ إضافة رواية (واجهة مستقلة) ═══════════ */
export function NovelCreatePage() {
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [show, setShow] = useState(true);
  const navigate = useNavigate();
  useEffect(() => { categoryService.getCategories().then(setCategories).catch(() => {}); }, []);
  return (
    <div>
      <PageHead title="إضافة رواية جديدة" desc="أدخل بيانات الرواية ثم أضف الفصول من قسم «إضافة وتعديل الفصول»" />
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 max-w-2xl">
        {show ? (
          <NovelFormModal
            initial={EMPTY_FORM}
            categories={categories}
            onClose={() => navigate('/dashboard/novels')}
            onSaved={() => navigate('/dashboard/novels')}
          />
        ) : null}
        {!show && <p className="text-white/50 text-center py-8">تم الإنشاء — عد إلى «رواياتي»</p>}
      </div>
    </div>
  );
}

/* ═══════════ تعديل تفاصيل رواية (منتقي + نموذج كامل) ═══════════ */
export function NovelEditPage() {
  const { novelId } = useParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [novel, setNovel] = useState<AdminNovel | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { categoryService.getCategories().then(setCategories).catch(() => {}); }, []);

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
      <PageHead title="تعديل تفاصيل رواية" desc={novel?.title || '…'}>
        <button onClick={() => navigate('/dashboard/novel-edit')} className={btnGhost}><ArrowRight size={15} /> تغيير الرواية</button>
      </PageHead>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 max-w-2xl min-h-[300px]">
        {loading ? (
          <div className="py-16 flex justify-center"><Spinner /></div>
        ) : novel ? (
          <NovelFormInner novel={novel} categories={categories} onSaved={() => toast.success('محفوظ')} />
        ) : (
          <p className="text-white/50 text-center py-10">تعذر جلب الرواية — اختر رواية أخرى</p>
        )}
      </div>
    </div>
  );
}

/* نموذج بيانات الرواية كنموذج صفحة كاملة (وليس نافذة) */
function NovelFormInner({ novel, categories, onSaved }: { novel: any; categories: { id: string; name: string }[]; onSaved: () => void }) {
  const [form, setForm] = useState({
    title: novel.title || '', titleEn: novel.titleEn || '', cover: novel.cover || '',
    description: novel.description || '', category: novel.category || '',
    tags: (novel.tags || []).join(', '), status: novel.status || 'مستمرة',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const coverRef = useRef<HTMLInputElement>(null);
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const uploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await (await import('../../services/user')).userService.uploadImage(file);
      set('cover', url);
      toast.success('تم رفع الغلاف');
    } catch { toast.error('فشل رفع الغلاف'); } finally { setUploading(false); }
  };

  const submit = async () => {
    if (!form.title.trim() || !form.cover.trim()) { toast.error('العنوان والغلاف مطلوبان'); return; }
    setSaving(true);
    try {
      await adminService.updateNovel(novel._id, {
        title: form.title.trim(),
        titleEn: form.titleEn.trim() || form.title.trim(),
        cover: form.cover.trim(),
        description: form.description,
        category: form.category || 'أخرى',
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        status: form.status || 'مستمرة',
      });
      toast.success('تم تحديث الرواية');
      onSaved();
    } catch (err: any) { toast.error(err?.message || 'فشل الحفظ'); } finally { setSaving(false); }
  };

  return (
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
      <textarea className={inputCls} rows={5} placeholder="القصة / الوصف" value={form.description} onChange={(e) => set('description', e.target.value)} />
      <div className="grid sm:grid-cols-2 gap-3">
        <select className={inputCls} value={form.category} onChange={(e) => set('category', e.target.value)}>
          <option value="">— اختر التصنيف —</option>
          {categories.filter((c) => c.id !== 'all').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className={inputCls} value={form.status} onChange={(e) => set('status', e.target.value)}>
          <option value="مستمرة">مستمرة</option>
          <option value="مكتملة">مكتملة</option>
          <option value="متوقفة">متوقفة</option>
        </select>
      </div>
      <input className={inputCls} placeholder="الوسوم مفصولة بفواصل: أكشن, خيال" value={form.tags} onChange={(e) => set('tags', e.target.value)} />
      <button onClick={submit} disabled={saving} className={btnPrimary + ' w-full'}>
        {saving ? <Spinner /> : <CheckSquare size={16} />} حفظ التعديلات
      </button>
    </div>
  );
}

/* ═══════════ إضافة وتعديل الفصول (منتقي + مدير فصول كامل) ═══════════ */
export function ChaptersPage() {
  const { novelId } = useParams();
  const navigate = useNavigate();

  if (!novelId) {
    return (
      <div>
        <PageHead title="إضافة وتعديل الفصول" desc="اختر رواية لإدارة فصولها: إضافة، تعديل، حذف، جماعي، ورفع ZIP" />
        <NovelPicker actionLabel="إدارة الفصول" onPick={(n) => navigate(`/dashboard/chapters/${n._id}`)} />
      </div>
    );
  }
  return <ChaptersManager novelId={novelId} onBack={() => navigate('/dashboard/chapters')} />;
}

function ChaptersManager({ novelId, onBack }: { novelId: string; onBack: () => void }) {
  const [novel, setNovel] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<{ number: number; title: string } | null>(null);
  const [zipBusy, setZipBusy] = useState(false);
  const zipRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    novelService.getNovelById(novelId, true).then(setNovel).catch(() => {});
  }, [novelId]);

  const load = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const res = await novelService.getChaptersListFull(novelId, p, 25, 'asc', '', true);
      setChapters(res.chapters);
      setTotalPages(res.totalPages);
      setTotal(res.total);
    } catch {
      toast.error('فشل جلب قائمة الفصول');
    } finally { setLoading(false); }
  }, [novelId, page]);

  useEffect(() => { load(page); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const del = async (num: number) => {
    if (!window.confirm(`حذف الفصل ${num} نهائياً؟`)) return;
    try {
      await adminService.deleteChapter(novelId, num);
      toast.success(`تم حذف الفصل ${num}`);
      load(page);
    } catch { toast.error('فشل الحذف'); }
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`حذف ${selected.size} فصلاً نهائياً؟`)) return;
    try {
      await adminService.batchDeleteChapters(novelId, [...selected]);
      toast.success(`تم حذف ${selected.size} فصلاً`);
      setSelected(new Set());
      load(page);
    } catch { toast.error('فشل الحذف الجماعي'); }
  };

  const uploadZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setZipBusy(true);
    const t = toast.loading('جارٍ رفع واستخراج الفصول...');
    try {
      await adminService.bulkUploadZip(novelId, file);
      toast.success('تم رفع الفصول من الملف', { id: t });
      setPage(1);
      load(1);
    } catch (err: any) {
      toast.error(err?.message || 'فشل رفع الملف', { id: t });
    } finally { setZipBusy(false); }
  };

  const toggleSel = (n: number) => {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(n)) s.delete(n); else s.add(n);
      return s;
    });
  };

  return (
    <div>
      <PageHead title={novel?.title || 'إدارة الفصول'} desc={`${total} فصلاً منشوراً`}>
        <button onClick={onBack} className={btnGhost}><ArrowRight size={15} /> تغيير الرواية</button>
      </PageHead>

      {/* أشرطة الإجراءات */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => { setEditing(null); setShowForm(true); }} className={btnPrimary}><Plus size={16} /> إضافة فصل</button>
        <button onClick={() => zipRef.current?.click()} disabled={zipBusy} className={btnGhost}>
          {zipBusy ? <Spinner /> : <Upload size={15} />} رفع ZIP (دفعات)
        </button>
        <input ref={zipRef} type="file" accept=".zip" hidden onChange={uploadZip} />
        {selected.size > 0 && (
          <button onClick={bulkDelete} className="bg-red-500/20 text-red-300 font-bold rounded-lg px-4 py-2.5 text-sm hover:bg-red-500/30 transition-colors flex items-center gap-2">
            <Trash2 size={15} /> حذف المحدد ({selected.size})
          </button>
        )}
      </div>

      {/* قائمة الفصول */}
      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center"><Spinner /></div>
        ) : chapters.length === 0 ? (
          <div className="py-16 text-center text-white/50">لا توجد فصول بعد — أضف أول فصل</div>
        ) : (
          <div className="divide-y divide-white/5 max-h-[60vh] overflow-y-auto">
            {chapters.map((ch) => (
              <div key={ch._id || ch.number} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5">
                <button onClick={() => toggleSel(ch.number)} className="text-white/50 hover:text-white" aria-label="تحديد">
                  {selected.has(ch.number) ? <CheckSquare size={17} className="text-primary" /> : <Square size={17} />}
                </button>
                <span className="font-bold text-white w-14 shrink-0">{ch.number}</span>
                <span className="flex-1 min-w-0 truncate text-white/80 text-sm">{ch.title || `الفصل ${ch.number}`}</span>
                <span className="text-white/30 text-xs hidden sm:block">{ch.views || 0} مشاهدة</span>
                <button onClick={() => { setEditing({ number: ch.number, title: ch.title || '' }); setShowForm(true); }} className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white" aria-label="تعديل"><Pencil size={15} /></button>
                <button onClick={() => del(ch.number)} className="p-2 rounded-lg hover:bg-red-500/20 text-red-400" aria-label="حذف"><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ترقيم الصفحات */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className={btnGhost}>السابق</button>
          <span className="text-white/60 text-sm">صفحة {page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className={btnGhost}>التالي</button>
        </div>
      )}

      {showForm && (
        <ChapterModal
          novelId={novelId}
          novelTitle={novel?.title || ''}
          editing={editing}
          nextNumber={(chapters[chapters.length - 1]?.number || 0) + 1}
          onClose={() => setShowForm(false)}
          onSaved={() => { load(editing ? page : 1); if (!editing) setPage(1); }}
        />
      )}
    </div>
  );
}

/* ═══════════ نشر جماعي ZIP (واجهة مستقلة) ═══════════ */
export function BulkUploadPage() {
  const { novelId } = useParams();
  const navigate = useNavigate();
  const [novel, setNovel] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const zipRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (novelId) novelService.getNovelById(novelId, true).then(setNovel).catch(() => {});
  }, [novelId]);

  if (!novelId) {
    return (
      <div>
        <PageHead title="نشر جماعي ZIP" desc="ارفع ملف ZIP يحتوي فصول الرواية (نصوص/HTML) فيتم استخراجها ونشرها دفعة واحدة" />
        <NovelPicker actionLabel="رفع ZIP" onPick={(n) => navigate(`/dashboard/bulk-upload/${n._id}`)} />
      </div>
    );
  }

  const upload = async () => {
    if (!file) { toast.error('اختر ملف ZIP أولاً'); return; }
    setBusy(true);
    const t = toast.loading('جارٍ رفع واستخراج الفصول...');
    try {
      await adminService.bulkUploadZip(novelId, file);
      toast.success('تم رفع الفصول من الملف', { id: t });
      setFile(null);
    } catch (err: any) {
      toast.error(err?.message || 'فشل رفع الملف', { id: t });
    } finally { setBusy(false); }
  };

  return (
    <div>
      <PageHead title="نشر جماعي ZIP" desc={novel?.title || '…'}>
        <button onClick={() => navigate('/dashboard/bulk-upload')} className={btnGhost}><ArrowRight size={15} /> تغيير الرواية</button>
      </PageHead>
      <div
        onClick={() => zipRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) setFile(f); }}
        className="border-2 border-dashed border-white/15 hover:border-white/30 rounded-2xl p-10 text-center cursor-pointer transition-colors bg-white/5"
      >
        <UploadCloudIcon />
        <p className="text-white/70 font-bold mt-3">{file ? file.name : 'اسحب ملف ZIP هنا أو انقر للاختيار'}</p>
        <p className="text-white/40 text-xs mt-1">يُستخرج ترقيم وعناوين الفصول من أسماء الملفات تلقائياً</p>
        <input ref={zipRef} type="file" accept=".zip" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) setFile(f); }} />
      </div>
      <button onClick={upload} disabled={busy || !file} className={btnPrimary + ' w-full mt-4'}>
        {busy ? <Spinner /> : <Zap size={16} />} بدء النشر الجماعي
      </button>
    </div>
  );
}
function UploadCloudIcon() {
  return <Upload className="mx-auto text-white/40" size={40} />;
}

/* ═══════════ إدارة المصطلحات (Glossary) ═══════════ */
const GLOSSARY_CATS = [
  { id: 'characters', label: 'شخصيات' },
  { id: 'locations', label: 'أماكن' },
  { id: 'items', label: 'أدوات' },
  { id: 'ranks', label: 'مراتب' },
  { id: 'other', label: 'أخرى' },
];

export function GlossaryPage() {
  const { novelId } = useParams();
  const navigate = useNavigate();
  const [novel, setNovel] = useState<any>(null);
  const [terms, setTerms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [term, setTerm] = useState('');
  const [translation, setTranslation] = useState('');
  const [category, setCategory] = useState('other');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (novelId) novelService.getNovelById(novelId, true).then(setNovel).catch(() => {});
  }, [novelId]);

  const load = useCallback(async () => {
    if (!novelId) return;
    setLoading(true);
    try { setTerms(await translatorService.getGlossary(novelId)); }
    catch { toast.error('فشل جلب المصطلحات'); }
    finally { setLoading(false); }
  }, [novelId]);
  useEffect(() => { load(); }, [load]);

  if (!novelId) {
    return (
      <div>
        <PageHead title="إدارة المصطلحات" desc="قاموس مصطلحات لكل رواية يستخدمه الذكاء الاصطناعي للترجمة الموحدة (أسماء، أماكن، مراتب…)" />
        <NovelPicker actionLabel="إدارة المصطلحات" onPick={(n) => navigate(`/dashboard/glossary/${n._id}`)} />
      </div>
    );
  }

  const add = async () => {
    if (!term.trim() || !translation.trim()) { toast.error('المصطلح والترجمة مطلوبان'); return; }
    setSaving(true);
    try {
      await translatorService.upsertTerm(novelId, term.trim(), translation.trim(), category, description.trim());
      toast.success('حُفظ المصطلح');
      setTerm(''); setTranslation(''); setDescription('');
      load();
    } catch { toast.error('فشل الحفظ'); } finally { setSaving(false); }
  };

  const delOne = async (id: string) => {
    try { await translatorService.deleteTerm(id); setTerms((p) => p.filter((t) => t._id !== id)); toast.success('حُذف'); }
    catch { toast.error('فشل الحذف'); }
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`حذف ${selected.size} مصطلحاً؟`)) return;
    try {
      await translatorService.bulkDeleteTerms([...selected]);
      toast.success('حُذفت المصطلحات المحددة');
      setSelected(new Set());
      load();
    } catch { toast.error('فشل الحذف الجماعي'); }
  };

  return (
    <div>
      <PageHead title="إدارة المصطلحات" desc={`${novel?.title || ''} — ${terms.length} مصطلحاً`}>
        <button onClick={() => navigate('/dashboard/glossary')} className={btnGhost}><ArrowRight size={15} /> تغيير الرواية</button>
      </PageHead>

      {/* إضافة مصطلح */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-5">
        <div className="grid sm:grid-cols-2 gap-3">
          <input className={inputCls} placeholder="المصطلح الأصلي (中文/English) *" value={term} onChange={(e) => setTerm(e.target.value)} dir="auto" />
          <input className={inputCls} placeholder="ترجمته المعتمدة *" value={translation} onChange={(e) => setTranslation(e.target.value)} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3 mt-3">
          <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
            {GLOSSARY_CATS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <input className={inputCls} placeholder="وصف اختياري (سياق الاستخدام)" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <button onClick={add} disabled={saving} className={btnPrimary + ' w-full mt-3'}>
          {saving ? <Spinner /> : <BookMarked size={16} />} حفظ المصطلح
        </button>
      </div>

      {/* قائمة المصطلحات */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <h4 className="text-white font-bold text-sm flex items-center gap-2"><Languages size={15} /> المصطلحات</h4>
          {selected.size > 0 && (
            <button onClick={bulkDelete} className="bg-red-500/20 text-red-300 text-xs font-bold rounded-lg px-3 py-1.5 hover:bg-red-500/30">
              حذف المحدد ({selected.size})
            </button>
          )}
        </div>
        {loading ? (
          <div className="py-16 flex justify-center"><Spinner /></div>
        ) : terms.length === 0 ? (
          <p className="py-12 text-center text-white/40 text-sm">لا مصطلحات بعد — أضف أول مصطلح أعلاه</p>
        ) : (
          <div className="divide-y divide-white/5 max-h-[55vh] overflow-y-auto">
            {terms.map((t) => (
              <div key={t._id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5">
                <button
                  onClick={() => setSelected((p) => { const s = new Set(p); s.has(t._id) ? s.delete(t._id) : s.add(t._id); return s; })}
                  className="text-white/50 hover:text-white" aria-label="تحديد"
                >
                  {selected.has(t._id) ? <CheckSquare size={16} className="text-primary" /> : <Square size={16} />}
                </button>
                <span className="text-white text-sm font-bold shrink-0 max-w-[30%] truncate" dir="auto">{t.term}</span>
                <span className="text-white/60 text-sm flex-1 truncate">{t.translation}</span>
                <span className="text-white/30 text-[10px] bg-white/5 rounded-full px-2 py-0.5 shrink-0 hidden sm:block">
                  {GLOSSARY_CATS.find((c) => c.id === t.category)?.label || t.category}
                </span>
                <button onClick={() => delOne(t._id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400" aria-label="حذف"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
