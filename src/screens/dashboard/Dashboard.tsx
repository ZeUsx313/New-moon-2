/**
 * لوحة التحكم — قسم الترجمة كاملاً على الموقع (بند الاستقلال عن التطبيق).
 *
 * التبويبات:
 *   الترجمة     : قائمة الروايات (مساهم = رواياته فقط) + إنشاء/تعديل/حذف
 *   إدارة الرواية: تعديل بيانات الرواية + إدارة الفصول (إضافة/تعديل/حذف/جماعي/ZIP)
 *   السجلات     : سجل نشاط الإضافة/التعديل (scraper logs)
 *   الإدارة     : (admin) المستخدمون والأدوار + التصنيفات
 *   التحليلات   : (admin) إحصاءات الزيارات الحية من الخادم
 *   الأمان      : (admin) عناوين IP المحظورة وفك الحظر
 *
 * الهوية: أسود/أبيض، مكونات نظيفة، كل زر يعمل فعلاً.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight, BookOpen, Plus, Pencil, Trash2, X, Loader2, RefreshCcw,
  FileText, Users, BarChart3, ShieldAlert, ScrollText, Upload, CheckSquare, Square,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '../../context/AuthContext';
import { adminService, AdminNovel, AdminUser, ScraperLog } from '../../services/admin';
import { novelService } from '../../services/novel';
import { categoryService } from '../../services/category';
import { userService } from '../../services/user';
import Header from '../../components/Header';

/* ═══════════════ أدوات صغيرة مشتركة ═══════════════ */

const inputCls = 'w-full bg-white/5 text-white rounded-lg px-3 py-2.5 border border-white/15 focus:border-primary outline-none text-sm placeholder:text-white/30';
const btnPrimary = 'bg-primary text-primary-foreground font-bold rounded-lg px-4 py-2.5 text-sm hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2';
const btnGhost = 'bg-white/10 text-white font-bold rounded-lg px-4 py-2.5 text-sm hover:bg-white/20 disabled:opacity-50 transition-colors flex items-center justify-center gap-2';

function Spinner() {
  return <Loader2 size={20} className="animate-spin text-white/70" />;
}

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
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

/* ═══════════════ نموذج إنشاء/تعديل رواية ═══════════════ */

interface NovelFormState {
  title: string; titleEn: string; cover: string; description: string; category: string; tags: string; status: string;
}
const EMPTY_FORM: NovelFormState = { title: '', titleEn: '', cover: '', description: '', category: '', tags: '', status: 'مستمرة' };

function NovelFormModal({ initial, categories, onClose, onSaved }: {
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

/* ═══════════════ محرر الفصل ═══════════════ */

function ChapterModal({ novelId, novelTitle, editing, nextNumber, onClose, onSaved }: {
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

/* ═══════════════ إدارة فصول رواية ═══════════════ */

function NovelChaptersView({ novel, onBack }: { novel: AdminNovel; onBack: () => void }) {
  const [chapters, setChapters] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<{ number: number; title: string } | null>(null);
  const [showEditNovel, setShowEditNovel] = useState(false);
  const [zipBusy, setZipBusy] = useState(false);
  const zipRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  const load = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const res = await novelService.getChaptersListFull(novel._id, p, 25, 'asc', '', true);
      setChapters(res.chapters);
      setTotalPages(res.totalPages);
      setTotal(res.total);
    } catch {
      toast.error('فشل جلب قائمة الفصول');
    } finally { setLoading(false); }
  }, [novel._id, page]);

  useEffect(() => { load(page); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { categoryService.getCategories().then(setCategories).catch(() => {}); }, []);

  const del = async (num: number) => {
    if (!window.confirm(`حذف الفصل ${num} نهائياً؟`)) return;
    try {
      await adminService.deleteChapter(novel._id, num);
      toast.success(`تم حذف الفصل ${num}`);
      load(page);
    } catch { toast.error('فشل الحذف'); }
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`حذف ${selected.size} فصلاً نهائياً؟`)) return;
    try {
      await adminService.batchDeleteChapters(novel._id, [...selected]);
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
      await adminService.bulkUploadZip(novel._id, file);
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
      {/* رأس الرواية */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <button onClick={onBack} className={btnGhost}><ArrowRight size={16} /> عودة للقائمة</button>
        <h2 className="font-bold text-lg text-white flex-1 min-w-0 truncate">{novel.title}</h2>
        <button onClick={() => setShowEditNovel(true)} className={btnGhost}><Pencil size={15} /> بيانات الرواية</button>
      </div>

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
        <span className="text-white/40 text-sm self-center mr-auto">{total} فصلاً</span>
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

      <AnimatePresence>
        {showForm && (
          <ChapterModal
            novelId={novel._id}
            novelTitle={novel.title}
            editing={editing}
            nextNumber={(chapters[chapters.length - 1]?.number || 0) + 1}
            onClose={() => setShowForm(false)}
            onSaved={() => { load(editing ? page : 1); if (!editing) setPage(1); }}
          />
        )}
        {showEditNovel && (
          <NovelFormModal
            initial={{ _id: novel._id, title: novel.title || '', titleEn: (novel as any).titleEn || '', cover: novel.cover || '', description: novel.description || '', category: novel.category || '', tags: (novel.tags || []).join(', '), status: novel.status || 'مستمرة' }}
            categories={categories}
            onClose={() => setShowEditNovel(false)}
            onSaved={onBack}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════ تبويب التحليلات ═══════════════ */

function AnalyticsTab() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (d: number) => {
    setLoading(true);
    try { setData(await adminService.getAnalyticsSummary(d)); }
    catch { toast.error('فشل جلب التحليلات'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(days); }, [days, load]);

  if (loading) return <div className="py-20 flex justify-center"><Spinner /></div>;
  if (!data) return <div className="py-20 text-center text-white/50">لا توجد بيانات بعد</div>;

  const series: { _id: string; views: number; visitors: number }[] = data.daily || [];
  const maxV = Math.max(1, ...series.map((d) => d.views));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        {[7, 14, 30].map((d) => (
          <button key={d} onClick={() => setDays(d)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${days === d ? 'bg-primary text-primary-foreground' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>
            {d} يوم
          </button>
        ))}
        <button onClick={() => load(days)} className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white" aria-label="تحديث"><RefreshCcw size={16} /></button>
      </div>

      {/* بطاقات الإجماليات */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'مشاهدات الصفحات', value: data.totals?.pageViews ?? 0 },
          { label: 'زوار فريدون', value: data.totals?.uniqueVisitors ?? 0 },
          { label: 'جلسات', value: data.totals?.sessions ?? 0 },
          { label: 'روايات مقروءة', value: data.totals?.novelOpens ?? 0 },
        ].map((c) => (
          <div key={c.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-white/50 text-xs">{c.label}</p>
            <p className="text-white text-2xl font-extrabold mt-1">{Number(c.value).toLocaleString('en-US')}</p>
          </div>
        ))}
      </div>

      {/* سلسلة يومية */}
      {series.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <h4 className="text-white font-bold mb-4">الزيارات اليومية</h4>
          <div className="flex items-end gap-1.5 h-40" dir="ltr">
            {series.slice().reverse().map((d) => (
              <div key={d._id} className="flex-1 flex flex-col items-center gap-1 group">
                <span className="text-[10px] text-white/0 group-hover:text-white/70 transition-colors">{d.views}</span>
                <div className="w-full bg-white/20 hover:bg-white/40 rounded-t transition-colors" style={{ height: `${Math.max(3, (d.views / maxV) * 100)}%` }} />
                <span className="text-[9px] text-white/40">{d._id.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* الأعلى قائماً */}
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { title: 'أكثر الصفحات زيارة', rows: (data.topPages || []).map((p: any) => ({ k: p._id, v: p.count })) },
          { title: 'أكثر الروايات قراءة', rows: (data.topNovels || []).map((p: any) => ({ k: p.title || p._id, v: p.count })) },
          { title: 'مصادر الزيارات', rows: (data.referrers || []).map((p: any) => ({ k: p._id || 'مباشر', v: p.count })) },
        ].map((box) => (
          <div key={box.title} className="bg-white/5 border border-white/10 rounded-xl p-4">
            <h4 className="text-white font-bold text-sm mb-3">{box.title}</h4>
            <div className="space-y-2">
              {box.rows.length === 0 && <p className="text-white/40 text-xs">لا بيانات بعد</p>}
              {box.rows.slice(0, 8).map((r: any, i: number) => (
                <div key={i} className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-white/70 truncate" dir="auto">{r.k}</span>
                  <span className="text-white font-bold shrink-0">{r.v}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* الأجهزة */}
      {(data.devices || []).length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <h4 className="text-white font-bold text-sm mb-3">الأجهزة</h4>
          <div className="flex flex-wrap gap-2">
            {data.devices.map((d: any) => (
              <span key={d._id} className="bg-white/10 text-white/80 text-xs rounded-full px-3 py-1.5">{d._id}: <b>{d.count}</b></span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════ تبويب الأمان ═══════════════ */

function SecurityTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confirmAll, setConfirmAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bans, stats] = await Promise.all([adminService.getSecurityBans(), adminService.getSecurityStats()]);
      setData({ bans: bans?.bans || [], stats });
    } catch { toast.error('فشل جلب حالة الأمان'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const unban = async (ip: string) => {
    try {
      await adminService.unbanIp(ip);
      toast.success(`تم فك حظر ${ip}`);
      load();
    } catch { toast.error('فشل فك الحظر'); }
  };

  const unbanAll = async () => {
    try {
      const res = await adminService.unbanAllIps();
      toast.success(`تم فك حظر جميع العناوين (${res?.removed ?? 0}) ومسح عدادات المخالفات`);
      setConfirmAll(false);
      load();
    } catch { toast.error('فشل فك الحظر الجماعي'); }
  };

  if (loading) return <div className="py-20 flex justify-center"><Spinner /></div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'IP محظور الآن', value: data?.stats?.bannedIps ?? data?.bans?.length ?? 0 },
          { label: 'طلبات آخر دقيقة', value: data?.stats?.requestsLastMinute ?? '—' },
          { label: 'عناوين نشطة', value: data?.stats?.trackedIps ?? '—' },
          { label: 'تحديات كابتشا', value: data?.stats?.captchaChallenges ?? '—' },
        ].map((c) => (
          <div key={c.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-white/50 text-xs">{c.label}</p>
            <p className="text-white text-xl font-extrabold mt-1">{String(c.value)}</p>
          </div>
        ))}
      </div>

      {/* سياسة التصعيد — الحظر آخر خيار إضطراري */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h4 className="text-white font-bold text-sm mb-2 flex items-center gap-2"><ShieldAlert size={15} /> سياسة الحماية الحالية</h4>
        <ol className="text-white/60 text-xs space-y-1.5 list-decimal ps-5 leading-relaxed">
          <li>تجاوز الحدود → <span className="text-white/85">تهدئة 429 مع مدة انتظار</span> — لا حظر أبداً في هذه المرحلة.</li>
          <li>إن ضُبطت الكابتشا → بوابة تحقق بشرية، وحلّها يمنح حرية قراءة 15 دقيقة.</li>
          <li>الحظر المؤقت (15د) <span className="text-white/85">آخر خيار إضطراري</span> — فقط لمن يتجاهل التهديدات 10+ مرة خلال 15 دقيقة، أو فخ السكرابر.</li>
          <li>المشرفون/المساهمون مستثنون تماماً، وتنزيل الفصول للقراءة دون إنترنت له ميزانية سخية مستقلة (300/د للمسجلين) ولا يُحظر منه.</li>
        </ol>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-2">
          <h4 className="text-white font-bold text-sm flex items-center gap-2"><ShieldAlert size={15} /> عناوين محظورة</h4>
          <div className="flex items-center gap-2">
            {(data?.bans || []).length > 0 && (
              confirmAll ? (
                <>
                  <button onClick={unbanAll} className="bg-red-600/90 hover:bg-red-600 text-white text-xs font-bold rounded-lg px-3 py-1.5">تأكيد فك الجميع</button>
                  <button onClick={() => setConfirmAll(false)} className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg px-3 py-1.5">إلغاء</button>
                </>
              ) : (
                <button onClick={() => setConfirmAll(true)} className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg px-3 py-1.5">فك حظر الجميع</button>
              )
            )}
            <button onClick={load} className="p-2 rounded-lg hover:bg-white/10 text-white/70" aria-label="تحديث"><RefreshCcw size={15} /></button>
          </div>
        </div>
        {(data?.bans || []).length === 0 ? (
          <p className="py-10 text-center text-white/40 text-sm">لا توجد حظرات حالياً — الأمن هادئ</p>
        ) : (
          <div className="divide-y divide-white/5">
            {data.bans.map((b: any) => (
              <div key={b.ip} className="flex items-center gap-3 px-4 py-3">
                <span className="font-mono text-white text-sm" dir="ltr">{b.ip}</span>
                <span className="text-white/40 text-xs flex-1 truncate">{b.reason} — حتى {new Date(b.until).toLocaleString('ar-EG')}</span>
                <button onClick={() => unban(b.ip)} className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg px-3 py-1.5">فك الحظر</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════ تبويب الإدارة ═══════════════ */

function AdminTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [cats, setCats] = useState<{ id: string; name: string }[]>([]);
  const [newCat, setNewCat] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, c] = await Promise.all([
        adminService.getUsers().catch(() => [] as AdminUser[]),
        categoryService.getCategories().catch(() => []),
      ]);
      setUsers(u);
      setCats(c);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const changeRole = async (user: AdminUser, role: string) => {
    try {
      await adminService.setUserRole(user._id, role);
      toast.success(`تم جعل ${user.name} ${role === 'admin' ? 'مشرفاً' : role === 'contributor' ? 'مترجماً' : 'قارئاً'}`);
      setUsers((prev) => prev.map((u) => (u._id === user._id ? { ...u, role: role as AdminUser['role'] } : u)));
    } catch { toast.error('فشل تغيير الدور'); }
  };

  const addCat = async () => {
    const name = newCat.trim();
    if (!name) return;
    try {
      await adminService.addCategory(name);
      setNewCat('');
      toast.success('أضيفت التصنيف');
      load();
    } catch { toast.error('فشل إضافة التصنيف'); }
  };

  const delCat = async (name: string) => {
    if (!window.confirm(`حذف تصنيف «${name}»؟`)) return;
    try {
      await adminService.deleteCategory(name);
      toast.success('حُذف التصنيف');
      load();
    } catch { toast.error('فشل الحذف'); }
  };

  if (loading) return <div className="py-20 flex justify-center"><Spinner /></div>;

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      {/* المستخدمون */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
          <Users size={15} className="text-white/70" />
          <h4 className="text-white font-bold text-sm">المستخدمون والأدوار</h4>
          <span className="text-white/30 text-xs mr-auto">{users.length}</span>
        </div>
        <div className="divide-y divide-white/5 max-h-[55vh] overflow-y-auto">
          {users.map((u) => (
            <div key={u._id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-bold truncate">{u.name}</p>
                <p className="text-white/40 text-xs truncate" dir="ltr">{u.email}</p>
              </div>
              <select
                value={u.role}
                onChange={(e) => changeRole(u, e.target.value)}
                className="bg-white/10 text-white text-xs rounded-lg px-2 py-1.5 border border-white/15 outline-none"
                aria-label={`دور ${u.name}`}
              >
                <option value="user">قارئ</option>
                <option value="contributor">مترجم</option>
                <option value="admin">مشرف</option>
              </select>
            </div>
          ))}
          {users.length === 0 && <p className="py-8 text-center text-white/40 text-sm">لا مستخدمين</p>}
        </div>
      </div>

      {/* التصنيفات */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden self-start">
        <div className="px-4 py-3 border-b border-white/10">
          <h4 className="text-white font-bold text-sm">التصنيفات</h4>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            <input className={inputCls} placeholder="اسم تصنيف جديد" value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCat()} />
            <button onClick={addCat} className={btnPrimary + ' shrink-0'}><Plus size={15} /></button>
          </div>
          <div className="flex flex-wrap gap-2">
            {cats.filter((c) => c.id !== 'all').map((c) => (
              <span key={c.id} className="bg-white/10 text-white/80 text-xs rounded-full pl-2 pr-3 py-1.5 flex items-center gap-1.5">
                {c.name}
                <button onClick={() => delCat(c.name)} className="text-red-400 hover:text-red-300" aria-label={`حذف ${c.name}`}><X size={13} /></button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ الشاشة الرئيسية ═══════════════ */

type TabId = 'novels' | 'logs' | 'admin' | 'analytics' | 'security';

export default function Dashboard() {
  const navigate = useNavigate();
  const { userInfo, isAuthenticated, openAuthModal } = useAuth();
  const isAdmin = userInfo?.role === 'admin';
  const isStaff = isAdmin || userInfo?.role === 'contributor';

  const [params, setParams] = useSearchParams();
  const tabParam = (params.get('tab') as TabId) || 'novels';
  const tab: TabId = (['novels', 'logs', 'admin', 'analytics', 'security'].includes(tabParam) ? tabParam : 'novels') as TabId;

  const [novels, setNovels] = useState<AdminNovel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedNovel, setSelectedNovel] = useState<AdminNovel | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [logs, setLogs] = useState<ScraperLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

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

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try { setLogs(await adminService.getLogs()); }
    catch { toast.error('فشل جلب السجلات'); }
    finally { setLogsLoading(false); }
  }, []);

  useEffect(() => {
    categoryService.getCategories().then(setCategories).catch(() => {});
  }, []);
  useEffect(() => {
    if (tab === 'logs') loadLogs();
  }, [tab, loadLogs]);
  // 🔥 تحميل روايات الترجمة عند فتح التبويب (أو العودة إليه)
  useEffect(() => {
    if (tab === 'novels' && !selectedNovel) loadNovels();
  }, [tab, selectedNovel, loadNovels]);

  // 🔒 بوابة الصلاحيات
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
          <ShieldAlert size={40} className="text-white/30 mx-auto mb-4" />
          <h1 className="text-white font-bold text-xl mb-2">صلاحية غير كافية</h1>
          <p className="text-white/50">هذه اللوحة للمترجمين والمشرفين فقط. اطلب ترقية دورك من الإدارة.</p>
        </div>
      </div>
    );
  }

  const switchTab = (t: TabId) => {
    setSelectedNovel(null);
    setParams(t === 'novels' ? {} : { tab: t });
  };

  const TABS: { id: TabId; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { id: 'novels', label: 'الترجمة', icon: <BookOpen size={16} /> },
    { id: 'logs', label: 'السجلات', icon: <ScrollText size={16} /> },
    { id: 'admin', label: 'الإدارة', icon: <Users size={16} />, adminOnly: true },
    { id: 'analytics', label: 'التحليلات', icon: <BarChart3 size={16} />, adminOnly: true },
    { id: 'security', label: 'الأمان', icon: <ShieldAlert size={16} />, adminOnly: true },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>لوحة التحكم — قمر الروايات</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-6 pb-28">
        {/* رأس اللوحة */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <button onClick={() => navigate('/')} className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white" aria-label="عودة"><ArrowRight size={18} /></button>
          <h1 className="text-white font-extrabold text-xl">لوحة التحكم</h1>
          <span className="text-white/40 text-sm">{isAdmin ? 'مشرف عام' : 'مترجم'}</span>
          {tab === 'novels' && !selectedNovel && (
            <button onClick={() => setShowCreate(true)} className={btnPrimary + ' mr-auto'}><Plus size={16} /> رواية جديدة</button>
          )}
        </div>

        {/* التبويبات */}
        {!selectedNovel && (
          <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
            {TABS.filter((t) => !t.adminOnly || isAdmin).map((t) => (
              <button
                key={t.id}
                onClick={() => switchTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
                  tab === t.id ? 'bg-primary text-primary-foreground' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        )}

        {/* المحتوى */}
        {tab === 'novels' && (
          selectedNovel ? (
            <NovelChaptersView novel={selectedNovel} onBack={() => { setSelectedNovel(null); loadNovels(); }} />
          ) : loading ? (
            <div className="py-24 flex justify-center"><Spinner /></div>
          ) : novels.length === 0 ? (
            <div className="py-24 text-center">
              <BookOpen size={40} className="text-white/20 mx-auto mb-4" />
              <p className="text-white/50 mb-4">{isAdmin ? 'لا توجد روايات بعد' : 'لم تُضف رواياتك بعد'}</p>
              <button onClick={() => setShowCreate(true)} className={btnPrimary + ' mx-auto'}><Plus size={16} /> إنشاء أول رواية</button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {novels.map((n) => (
                <motion.div key={n._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden group">
                  <div className="flex gap-3 p-3">
                    <img src={n.cover} alt="" className="w-16 h-24 rounded-lg object-cover shrink-0 bg-black/40" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.15'; }} />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-white font-bold text-sm line-clamp-2 leading-snug">{n.title}</h3>
                      <p className="text-white/40 text-xs mt-1">{n.chaptersCount ?? (n as any).chapters?.length ?? 0} فصل · {n.views || 0} مشاهدة</p>
                      <p className="text-white/30 text-xs mt-0.5 truncate">{n.author || '—'}</p>
                    </div>
                  </div>
                  <div className="flex border-t border-white/10">
                    <button onClick={() => setSelectedNovel(n)} className="flex-1 py-2.5 text-white/80 hover:bg-white/10 text-xs font-bold flex items-center justify-center gap-1.5">
                      <FileText size={14} /> إدارة الفصول
                    </button>
                    {isAdmin && (
                      <button
                        onClick={async () => {
                          if (!window.confirm(`حذف رواية «${n.title}» وكل فصولها نهائياً؟`)) return;
                          try { await adminService.deleteNovel(n._id); toast.success('حُذفت الرواية'); loadNovels(); }
                          catch { toast.error('فشل الحذف'); }
                        }}
                        className="px-4 border-r border-white/10 text-red-400 hover:bg-red-500/10 flex items-center"
                        aria-label="حذف"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )
        )}

        {tab === 'logs' && (
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <h4 className="text-white font-bold text-sm">سجل النشاط</h4>
              <button onClick={loadLogs} className="p-2 rounded-lg hover:bg-white/10 text-white/70" aria-label="تحديث">
                {logsLoading ? <Spinner /> : <RefreshCcw size={15} />}
              </button>
            </div>
            <div className="divide-y divide-white/5 max-h-[65vh] overflow-y-auto">
              {logs.length === 0 ? (
                <p className="py-12 text-center text-white/40 text-sm">لا سجلات بعد</p>
              ) : logs.map((l) => (
                <div key={l._id} className="px-4 py-2.5 flex items-start gap-3">
                  <span className="text-white/30 text-xs shrink-0" dir="ltr">{new Date(l.timestamp).toLocaleString('ar-EG')}</span>
                  <span className="text-white/75 text-sm">{l.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'admin' && isAdmin && <AdminTab />}
        {tab === 'analytics' && isAdmin && <AnalyticsTab />}
        {tab === 'security' && isAdmin && <SecurityTab />}

        <AnimatePresence>
          {showCreate && (
            <NovelFormModal
              initial={EMPTY_FORM}
              categories={categories}
              onClose={() => setShowCreate(false)}
              onSaved={loadNovels}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
