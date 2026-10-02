/**
 * صفحات الذكاء الاصطناعي — نقل حرفي لشاشات التطبيق (المترجم الذكي وعائلته):
 *
 *  1) TranslationJobsPage    ← TranslatorHubScreen          «المترجم الذكي / Zeus AI Engine»
 *  2) TranslationStartPage   ← EnglishNovelsSelectionScreen «اختيار الرواية» (جزآن + نطاق 25-100 و -!)
 *  3) TranslationJobDetailPage ← TranslationJobDetailScreen «تحليلات الترجمة» (Live Terminal)
 *  4) MetadataJobsPage       ← MetadataTranslationHubScreen «مهام تعريب البيانات» (ورقة تفاصيل)
 *  5) MetadataStartPage      ← NovelMetadataTranslationScreen «تعريب رواية موجودة»
 *  6) TranslationSettingsPage ← TranslatorSettingsScreen   «إعدادات المترجم» (مزوّدون كاملون)
 *
 * كل وظيفة واجهة مستقلة كاملة كما في التطبيق — لا تبسيط، لا تبويبات.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Play, Pause, Trash2, Plus, ArrowRight, ArrowUp, ArrowDown, X, Search,
  CheckCircle2, Circle, Loader2, Zap, Sparkles, Globe, Settings2, ListOrdered,
  BookOpen, Layers, AlertTriangle, ChevronDown, ChevronUp, PlusCircle, MinusCircle,
  CloudDownload, Wrench, Languages, Square,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';

import { translatorService } from '../../services/translator';
import {
  inputCls, Spinner, Modal, PageHead,
} from './shared';

/* ═══════════════ عناصر مشتركة (بنفس لغة التطبيق: زجاج داكن + أسود/أبيض) ═══════════════ */

/** بطاقة زجاجية — مكافئ GlassContainer في التطبيق */
function Glass({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={`bg-white/[0.04] border border-white/10 rounded-2xl text-right w-full ${className} ${onClick ? 'hover:border-white/25 hover:bg-white/[0.07] transition-all' : ''}`}
    >
      {children}
    </Comp>
  );
}

/** مربع حوار تأكيد — مكافئ CustomAlert (info / warning / danger) */
export function ConfirmDialog({ open, title, message, confirmText = 'تأكيد', tone = 'info', onCancel, onConfirm }: {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  tone?: 'info' | 'warning' | 'danger';
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  const toneCls = tone === 'danger'
    ? 'bg-red-500 text-white hover:bg-red-500/85'
    : tone === 'warning'
      ? 'bg-yellow-500 text-black hover:bg-yellow-500/85'
      : 'bg-white text-black hover:bg-white/85';
  return (
    <div className="fixed inset-0 z-[210] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-[#111] border border-white/15 rounded-2xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 mb-3">
          {tone === 'danger' ? <AlertTriangle size={20} className="text-red-400" /> : tone === 'warning' ? <AlertTriangle size={20} className="text-yellow-400" /> : <BookOpen size={20} className="text-white" />}
          <h3 className="text-white font-extrabold">{title}</h3>
        </div>
        <p className="text-white/60 text-sm whitespace-pre-line leading-relaxed mb-5">{message}</p>
        <div className="flex gap-2">
          <button onClick={onConfirm} className={`${toneCls} flex-1 rounded-xl py-2.5 font-bold text-sm transition-colors`}>{confirmText}</button>
          <button onClick={onCancel} className="flex-1 rounded-xl py-2.5 font-bold text-sm bg-white/10 text-white hover:bg-white/20 transition-colors">إلغاء</button>
        </div>
      </div>
    </div>
  );
}

/** Live Terminal — مكافئ طرفية السجلات الحية في التطبيق (ألوان: خطأ أحمر/نجاح أخضر/تحذير كهرماني) */
export function LiveTerminal({ logs, title = 'Live Terminal', minHeight = 300 }: { logs: any[]; title?: string; minHeight?: number }) {
  const colorFor = (t: string) =>
    t === 'error' ? 'text-red-400' : t === 'success' ? 'text-green-400' : t === 'warning' ? 'text-yellow-400' : 'text-white/70';
  return (
    <div
      className="bg-black/50 border border-white/10 rounded-2xl p-4 overflow-y-auto max-h-[420px] wor-scroll"
      style={{ minHeight }}
    >
      <p className="text-white/40 text-xs font-bold border-b border-white/10 pb-2 mb-3">{title}</p>
      {logs.length === 0 ? (
        <p className="text-white/30 text-xs text-center py-8">لا توجد سجلات بعد</p>
      ) : (
        logs.map((item, i) => (
          <div key={item._id || item.id || i} className="flex items-start gap-3 mb-2">
            <span className="text-white/30 text-[10px] font-mono shrink-0 mt-0.5 w-14" dir="ltr">
              {item.timestamp ? new Date(item.timestamp).toLocaleTimeString('en-GB') : '—'}
            </span>
            <span className={`flex-1 text-[11px] font-mono leading-relaxed ${colorFor(item.type)}`} dir="auto">
              {item.message}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

/** نقطة حالة + نصها — مكافئ صف الحالة في بطاقات التطبيق */
function StatusDot({ status, labels }: { status: string; labels: Record<string, string> }) {
  const dot = status === 'active' ? 'bg-white' : status === 'completed' ? 'bg-green-400' : status === 'failed' ? 'bg-red-400' : 'bg-white/30';
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      <span className="text-white/60 text-xs">{labels[status] || status}</span>
    </span>
  );
}

/** مفتاح تبديل صغير (بديل Switch في React Native) */
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2.5 py-1.5"
    >
      <span className={`w-10 h-5.5 h-[22px] rounded-full border transition-colors relative ${checked ? 'bg-white border-white' : 'bg-white/10 border-white/20'}`}>
        <span className={`absolute top-[2px] w-4 h-4 rounded-full transition-all ${checked ? 'right-[2px] bg-black' : 'right-[calc(100%-18px)] bg-white/60'}`} />
      </span>
      <span className="text-white/80 text-sm">{label}</span>
    </button>
  );
}

/** خطاف قائمة الروايات المترجمة — بحث مع تأخير 500ms + ترقيم «تحميل المزيد» (كالتطبيق حرفياً) */
function useTranslatorNovels() {
  const [novels, setNovels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const searchRef = useRef(search);
  searchRef.current = search;

  const fetchNovels = useCallback(async (pageNum: number, searchOverride?: string) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const res = await translatorService.getTranslatorNovels(searchOverride ?? searchRef.current, pageNum, 20);
      const arr = Array.isArray(res) ? res : [];
      setNovels((prev) => (pageNum === 1 ? arr : [...prev, ...arr]));
      setHasMore(arr.length === 20);
      setPage(pageNum);
    } catch {
      toast.error('فشل جلب الروايات');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { fetchNovels(1); }, [fetchNovels]);
  // بحث مؤجل 500ms — نفس سلوك التطبيق
  useEffect(() => {
    const t = setTimeout(() => fetchNovels(1), 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) fetchNovels(page + 1);
  }, [loadingMore, hasMore, page, fetchNovels]);

  return { novels, loading, loadingMore, hasMore, search, setSearch, loadMore };
}

/** حقل بحث زجاجي */
function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-xl flex items-center gap-2 px-3 py-2.5">
      <Search size={16} className="text-white/40 shrink-0" />
      <input
        className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value.length > 0 && (
        <button onClick={() => onChange('')} aria-label="مسح البحث" className="text-white/40 hover:text-white">
          <X size={15} />
        </button>
      )}
    </div>
  );
}

/** رأس الشاشات المنبثقة عن الهَب (زر إغلاق دائري مثل التطبيق) */
function SubHead({ title, onClose, extra }: { title: string; onClose: () => void; extra?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      {extra}
      <h1 className="text-white font-extrabold text-lg">{title}</h1>
      <button onClick={onClose} className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors" aria-label="إغلاق">
        <X size={20} />
      </button>
    </div>
  );
}

/* ═══════════════ 1. المترجم الذكي — TranslatorHubScreen ═══════════════ */
export function TranslationJobsPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { setJobs(await translatorService.getJobs()); }
    catch { /* هادئ — التحديث الدوري يعيد المحاولة */ }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  // تحديث حي كل 5 ثوان — مثل useFocusEffect + interval في التطبيق
  useEffect(() => {
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const bigBtn = 'w-full flex items-center justify-center gap-2.5 rounded-2xl border border-white/20 bg-white/[0.07] hover:bg-white/[0.12] px-5 py-5 text-white font-extrabold text-lg transition-all';

  return (
    <div className="max-w-3xl mx-auto">
      <PageHead title="المترجم الذكي" desc="Zeus AI Engine">
        <button
          onClick={() => navigate('/dashboard/translation-settings')}
          className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          aria-label="إعدادات المترجم"
          title="إعدادات المترجم"
        >
          <Settings2 size={20} />
        </button>
      </PageHead>

      {/* أزرار البدء الثلاثة — كما في التطبيق بالضبط */}
      <button className={bigBtn} onClick={() => navigate('/dashboard/translation-start')}>
        <PlusCircle size={26} />
        بدء ترجمة جديدة
      </button>
      <button className={bigBtn + ' mt-2.5'} onClick={() => navigate('/dashboard/metadata-jobs')}>
        <ListOrdered size={26} />
        مهام ترجمة البيانات
      </button>
      <button className={bigBtn + ' mt-2.5 mb-8'} onClick={() => navigate('/dashboard/metadata-start')}>
        <Languages size={26} />
        ترجمة بيانات رواية موجودة
      </button>

      <h2 className="text-white font-extrabold text-lg mb-4">المهام الحالية</h2>

      {loading ? (
        <div className="py-16 flex justify-center"><Spinner /></div>
      ) : jobs.length === 0 ? (
        <p className="text-white/40 text-center py-16">لا توجد مهام نشطة حالياً.</p>
      ) : (
        <div className="flex flex-col gap-3.5 pb-8">
          {jobs.map((job) => {
            const translated = job.translated ?? job.translatedCount ?? 0;
            const total = job.total ?? job.totalToTranslate ?? 0;
            const pct = total > 0 ? Math.min(100, (translated / total) * 100) : 0;
            return (
              <Glass key={job.id || job._id} onClick={() => navigate(`/dashboard/translation-jobs/${job.id || job._id}`)}>
                <div className="flex items-center gap-4 p-4">
                  <img
                    src={job.cover}
                    alt=""
                    className="w-[60px] h-20 rounded-lg object-cover bg-white/5 shrink-0"
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.15'; }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-extrabold text-[15px] truncate">{job.novelTitle}</p>
                    <div className="mt-1.5 mb-2">
                      <StatusDot
                        status={job.status}
                        labels={{ active: 'جاري الترجمة', completed: 'مكتمل', paused: 'متوقف مؤقتاً', failed: 'متوقف/خطأ' }}
                      />
                    </div>
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mb-1.5">
                      <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-white/40 text-[11px]">{translated} / {total} فصل</p>
                  </div>
                  <ArrowRight size={18} className="text-white/25 rotate-180 shrink-0" />
                </div>
              </Glass>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════ 2. اختيار الرواية — EnglishNovelsSelectionScreen ═══════════════ */
export function TranslationStartPage() {
  const navigate = useNavigate();
  const { novels, loading, loadingMore, hasMore, search, setSearch, loadMore } = useTranslatorNovels();

  const [selectedNovel, setSelectedNovel] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [selectionMode, setSelectionMode] = useState<'all' | 'manual'>('all');
  const [selectedChapters, setSelectedChapters] = useState<number[]>([]);
  const [rangeInput, setRangeInput] = useState('');
  const [starting, setStarting] = useState(false);
  const [confirm, setConfirm] = useState<{ open: boolean; message: string }>({ open: false, message: '' });

  // جلب الفصول — نفس نداء التطبيق /api/novels/:id/chapters-list?limit=10000
  const fetchChapters = async (novelId: string) => {
    setChaptersLoading(true);
    setChapters([]);
    try {
      const list = await translatorService.getNovelChaptersList(novelId);
      setChapters(Array.isArray(list) ? list : []);
    } catch {
      toast.error('فشل جلب الفصول');
    } finally {
      setChaptersLoading(false);
    }
  };

  const handleSelectNovel = (novel: any) => {
    setSelectedNovel(novel);
    fetchChapters(novel._id);
    setSelectedChapters([]);
    setRangeInput('');
    setSelectionMode('all');
  };

  const toggleChapter = (num: number) => {
    setSelectedChapters((prev) => (prev.includes(num) ? prev.filter((c) => c !== num) : [...prev, num]));
  };

  /** تطبيق النطاق — يدعم "25-100" و"150-!" (من 150 إلى آخر فصل) ورقماً مفرداً (كالتطبيق حرفياً) */
  const handleApplyRange = () => {
    if (!rangeInput.trim()) { toast.error('يرجى إدخال نطاق'); return; }
    const input = rangeInput.trim();
    let newSelection: number[] = [];
    const availableNumbers = chapters.map((c) => c.number);
    const maxChap = availableNumbers.length > 0 ? Math.max(...availableNumbers) : 0;

    if (input.includes('-!')) {
      const start = parseInt(input.split('-!')[0]);
      if (isNaN(start)) return;
      for (let i = start; i <= maxChap; i++) if (availableNumbers.includes(i)) newSelection.push(i);
    } else if (input.includes('-')) {
      const parts = input.split('-');
      const start = parseInt(parts[0]);
      const end = parseInt(parts[1]);
      if (isNaN(start) || isNaN(end)) return;
      for (let i = start; i <= end; i++) if (availableNumbers.includes(i)) newSelection.push(i);
    } else {
      const num = parseInt(input);
      if (!isNaN(num) && availableNumbers.includes(num)) newSelection.push(num);
    }

    if (newSelection.length === 0) toast.error('لم يتم العثور على فصول');
    else {
      setSelectedChapters(newSelection);
      toast.success(`تم تحديد ${newSelection.length} فصل`);
    }
  };

  const confirmTranslation = () => {
    if (!selectedNovel) return;
    if (selectionMode === 'manual' && selectedChapters.length === 0) {
      toast.error('الرجاء تحديد فصل واحد على الأقل');
      return;
    }
    const count = selectionMode === 'manual' ? String(selectedChapters.length) : (chapters.length ? String(chapters.length) : 'الكل');
    setConfirm({
      open: true,
      message: `هل أنت متأكد من بدء ترجمة "${selectedNovel.title}"؟\nعدد الفصول: ${count}`,
    });
  };

  const startTranslation = async () => {
    setConfirm({ open: false, message: '' });
    setStarting(true);
    try {
      await translatorService.start({
        novelId: selectedNovel._id,
        chapters: selectionMode === 'manual' ? selectedChapters : 'all',
      });
      toast.success('تم بدء المهمة');
      navigate('/dashboard/translation-jobs');
    } catch {
      toast.error('فشل بدء المهمة');
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <SubHead title="اختيار الرواية" onClose={() => navigate('/dashboard/translation-jobs')} />
      <ConfirmDialog
        open={confirm.open}
        title="تأكيد الترجمة"
        message={confirm.message}
        confirmText="ابدأ الآن"
        onCancel={() => setConfirm({ open: false, message: '' })}
        onConfirm={startTranslation}
      />

      <div className="grid lg:grid-cols-[45fr_55fr] gap-3 items-start">
        {/* الجزء الأيمن: قائمة الروايات مع البحث والترقيم */}
        <div>
          <div className="mb-2.5">
            <SearchBox value={search} onChange={setSearch} placeholder="بحث في السيرفر..." />
          </div>
          {loading ? (
            <div className="py-16 flex justify-center"><Spinner /></div>
          ) : (
            <>
              <div className="flex flex-col gap-2 max-h-[62vh] overflow-y-auto wor-scroll pl-1">
                {novels.map((item) => {
                  const selected = selectedNovel?._id === item._id;
                  return (
                    <button
                      key={item._id}
                      onClick={() => handleSelectNovel(item)}
                      className={`bg-white/[0.04] rounded-xl text-right w-full transition-all border ${selected ? 'border-white' : 'border-white/10 hover:border-white/25'}`}
                    >
                      <div className="flex items-center gap-3 p-3">
                        <img
                          src={item.cover}
                          alt=""
                          className="w-9 h-[50px] rounded object-cover bg-white/5 shrink-0"
                          loading="lazy"
                          onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.15'; }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-bold line-clamp-2 leading-snug">{item.title}</p>
                          <p className="text-white/40 text-[10px] mt-1">{item.chaptersCount || 0} فصل</p>
                        </div>
                        {selected && <CheckCircle2 size={22} className="text-white shrink-0" />}
                      </div>
                    </button>
                  );
                })}
                {novels.length === 0 && <p className="text-white/40 text-center py-10 text-sm">لا توجد نتائج</p>}
              </div>
              {hasMore && (
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="mt-2.5 w-full py-2.5 rounded-lg bg-white/10 border border-white/15 hover:bg-white/20 text-white text-xs font-extrabold transition-colors flex items-center justify-center gap-2"
                >
                  {loadingMore ? <Spinner /> : 'تحميل المزيد'}
                </button>
              )}
            </>
          )}
        </div>

        {/* الجزء الأيسر: إعداد الرواية المختارة */}
        <div>
          {selectedNovel ? (
            <Glass className="p-4 lg:sticky lg:top-24">
              <p className="text-white font-extrabold text-sm text-center mb-4 truncate">{selectedNovel.title}</p>

              {/* مفتاح الوضع: الكل / تحديد */}
              <div className="flex bg-black/40 rounded-lg p-1 mb-3">
                <button
                  onClick={() => setSelectionMode('all')}
                  className={`flex-1 py-2 rounded-md text-xs font-extrabold transition-colors ${selectionMode === 'all' ? 'bg-white/10 text-white' : 'text-white/40'}`}
                >
                  الكل
                </button>
                <button
                  onClick={() => setSelectionMode('manual')}
                  className={`flex-1 py-2 rounded-md text-xs font-extrabold transition-colors ${selectionMode === 'manual' ? 'bg-white/10 text-white' : 'text-white/40'}`}
                >
                  تحديد
                </button>
              </div>

              {selectionMode === 'manual' && (
                <div>
                  <div className="flex gap-1.5 mb-2">
                    <input
                      className="flex-1 bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white text-xs text-center outline-none focus:border-white/40"
                      placeholder="25-100"
                      value={rangeInput}
                      onChange={(e) => setRangeInput(e.target.value)}
                      dir="ltr"
                    />
                    <button
                      onClick={handleApplyRange}
                      className="bg-white/15 hover:bg-white/25 rounded-lg px-4 text-white text-xs font-extrabold transition-colors"
                    >
                      ok
                    </button>
                  </div>
                  {chaptersLoading ? (
                    <div className="py-10 flex justify-center"><Spinner /></div>
                  ) : (
                    <div className="max-h-[38vh] overflow-y-auto wor-scroll mt-2.5">
                      {chapters.map((ch) => {
                        const active = selectedChapters.includes(ch.number);
                        return (
                          <button
                            key={ch.number}
                            onClick={() => toggleChapter(ch.number)}
                            className={`w-full text-right px-3 py-2 border-b border-white/5 text-xs transition-colors ${active ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5'}`}
                          >
                            #{ch.number} - {ch.title || ''}
                          </button>
                        );
                      })}
                      {chapters.length === 0 && <p className="text-white/30 text-center text-xs py-8">لا فصول</p>}
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={confirmTranslation}
                disabled={starting}
                className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[0.07] hover:bg-white/[0.14] py-3.5 text-white font-extrabold transition-colors disabled:opacity-50"
              >
                {starting ? <Spinner /> : <Play size={17} />}
                ابدأ
              </button>
            </Glass>
          ) : (
            <div className="min-h-[300px] flex flex-col items-center justify-center text-center">
              <ArrowRight size={40} className="text-white/15" />
              <p className="text-white/40 mt-3 text-sm">اختر رواية</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ 3. تحليلات الترجمة — TranslationJobDetailScreen ═══════════════ */
export function TranslationJobDetailPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [novelMaxChapter, setNovelMaxChapter] = useState(0);
  const [confirm, setConfirm] = useState<{ open: boolean; tone: 'info' | 'warning' | 'danger'; title: string; message: string; confirmText: string; action?: () => void }>({ open: false, tone: 'info', title: '', message: '', confirmText: '' });

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await translatorService.getJob(jobId!);
        if (res) {
          setJob(res);
          setLogs(Array.isArray(res.logs) ? [...res.logs].reverse() : []);
          if (res.novelMaxChapter) setNovelMaxChapter(res.novelMaxChapter);
        }
      } catch { /* التحديث الدوري يعيد المحاولة */ }
    };
    fetchDetails();
    const interval = setInterval(fetchDetails, 3000);
    return () => clearInterval(interval);
  }, [jobId]);

  const ask = (tone: 'info' | 'warning' | 'danger', title: string, message: string, confirmText: string, action: () => void) =>
    setConfirm({ open: true, tone, title, message, confirmText, action });

  const requestResume = () =>
    ask('info', 'استئناف الترجمة', 'استئناف المهمة؟', 'ابدأ', async () => {
      setConfirm((c) => ({ ...c, open: false }));
      try {
        await translatorService.start({ jobId: job?._id || job?.id });
        toast.success('تم استئناف المهمة');
      } catch { toast.error('فشل الاستئناف'); }
    });

  const requestPause = () =>
    ask('warning', 'إيقاف مؤقت', 'هل تريد إيقاف الترجمة مؤقتاً؟ (ستتوقف بعد انتهاء الفصل الحالي)', 'إيقاف', async () => {
      setConfirm((c) => ({ ...c, open: false }));
      try {
        await translatorService.pauseJob(job?._id || job?.id);
        toast.success('تم إرسال طلب الإيقاف');
      } catch { toast.error('فشل الإيقاف'); }
    });

  const requestDelete = () =>
    ask('danger', 'حذف المهمة', 'هل أنت متأكد من حذف هذه المهمة نهائياً؟ (لا يؤثر على الفصول المترجمة بالفعل)', 'حذف', async () => {
      setConfirm((c) => ({ ...c, open: false }));
      try {
        await translatorService.deleteJob(job?._id || job?.id);
        toast.success('تم حذف المهمة');
        navigate('/dashboard/translation-jobs');
      } catch { toast.error('فشل الحذف'); }
    });

  if (!job) {
    return (
      <div className="max-w-3xl mx-auto">
        <SubHead title="تحليلات الترجمة" onClose={() => navigate('/dashboard/translation-jobs')} />
        <div className="py-24 flex justify-center"><Spinner /></div>
      </div>
    );
  }

  const status = job.status;
  const pct = novelMaxChapter > 0 ? Math.min(100, ((job.currentChapter || 0) / novelMaxChapter) * 100) : 0;
  const remaining = Math.max(0, novelMaxChapter - (job.currentChapter || 0));

  return (
    <div className="max-w-3xl mx-auto">
      <SubHead title="تحليلات الترجمة" onClose={() => navigate('/dashboard/translation-jobs')} />
      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        confirmText={confirm.confirmText}
        tone={confirm.tone}
        onCancel={() => setConfirm((c) => ({ ...c, open: false }))}
        onConfirm={() => confirm.action?.()}
      />

      {/* بطاقة الحالة والتقدم */}
      <Glass className="p-4 mb-5">
        <div className="flex items-center justify-between gap-3">
          <span
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-extrabold shrink-0 ${
              status === 'active' ? 'bg-white text-black' : status === 'paused' ? 'bg-yellow-500 text-black' : 'bg-white/10 text-white'
            }`}
          >
            {status === 'active' && <Loader2 size={12} className="animate-spin" />}
            {status === 'active' ? 'نشط' : status === 'paused' ? 'متوقف مؤقتاً' : status === 'completed' ? 'مكتمل' : 'فشل/توقف'}
          </span>
          <h2 className="text-white font-extrabold text-base truncate">{job.novelTitle}</h2>
        </div>
        <div className="w-full h-1.5 bg-white/10 rounded-full mt-4 mb-1.5 overflow-hidden">
          <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-white/40 text-xs text-left">الوصول للفصل {job.currentChapter || 0} / {novelMaxChapter || '—'}</p>
      </Glass>

      {/* شبكة التحليلات: تمت ترجمته / متبقي */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Glass className="py-6 flex flex-col items-center">
          <p className="text-white text-2xl font-extrabold">{job.translatedCount ?? 0}</p>
          <p className="text-white/40 text-xs mt-1.5">تمت ترجمته</p>
        </Glass>
        <Glass className="py-6 flex flex-col items-center border-red-500/40">
          <p className="text-red-400 text-2xl font-extrabold">{remaining}</p>
          <p className="text-white/40 text-xs mt-1.5">متبقي</p>
        </Glass>
      </div>

      {/* الإجراءات — نفس أزرار التطبيق */}
      <h3 className="text-white font-extrabold mb-3">إجراءات</h3>
      <div className="grid grid-cols-2 gap-3 mb-3">
        {status === 'active' ? (
          <button
            onClick={requestPause}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-yellow-500/60 bg-white/[0.04] hover:bg-yellow-500/10 py-4 transition-colors"
          >
            <Pause size={22} className="text-yellow-400" />
            <span className="text-yellow-400 font-extrabold text-sm">إيقاف مؤقت</span>
          </button>
        ) : (
          <button
            onClick={requestResume}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/40 bg-white/[0.04] hover:bg-white/10 py-4 transition-colors"
          >
            <Play size={22} className="text-white" />
            <span className="text-white font-extrabold text-sm">استئناف</span>
          </button>
        )}
        <button
          onClick={requestDelete}
          className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-red-500/60 bg-white/[0.04] hover:bg-red-500/10 py-4 transition-colors"
        >
          <Trash2 size={22} className="text-red-400" />
          <span className="text-red-400 font-extrabold text-sm">حذف المهمة</span>
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 mb-6">
        <button
          onClick={() => navigate(`/dashboard/glossary/${job.novelId}`)}
          className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/[0.04] hover:bg-white/10 py-4 transition-colors"
        >
          <BookOpen size={22} className="text-white" />
          <span className="text-white font-extrabold text-sm">المسرد</span>
        </button>
      </div>

      {/* الطرفية الحية */}
      <LiveTerminal logs={logs} minHeight={320} />
      <div className="h-6" />
    </div>
  );
}

/* ═══════════════ 4. مهام تعريب البيانات — MetadataTranslationHubScreen ═══════════════ */
const META_STEPS = ['العنوان', 'الوصف', 'التصنيفات'];
const META_STATUS = { active: 'نشطة', completed: 'مكتملة', failed: 'فشلت' };

export function MetadataJobsPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailJob, setDetailJob] = useState<any>(null);
  const [detailLogs, setDetailLogs] = useState<any[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; job?: any }>({ open: false });

  const fetchJobs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      setJobs(await translatorService.getMetadataJobs());
    } catch { /* التحديث الدوري يعيد المحاولة */ }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchJobs(true); }, [fetchJobs]);
  useEffect(() => {
    const t = setInterval(() => fetchJobs(true), 5000);
    return () => clearInterval(t);
  }, [fetchJobs]);

  // polling لورقة التفاصيل أثناء فتحها — مثل التطبيق
  useEffect(() => {
    if (!detailJob?._id) return;
    const jobId = detailJob._id;
    const interval = setInterval(async () => {
      try {
        const res = await translatorService.getMetadataJob(jobId);
        if (!res) return;
        setDetailJob(res);
        setDetailLogs(res.logs ? [...res.logs].reverse() : []);
      } catch { /* تجاهل */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [detailJob?._id]);

  const openDetail = (job: any) => {
    setDetailJob(job);
    setDetailLogs(job.logs ? [...job.logs].reverse() : []);
  };

  const performDelete = async (job: any) => {
    setConfirmDelete({ open: false });
    try {
      await translatorService.deleteMetadataJob(job._id);
      toast.success('تم حذف المهمة');
      fetchJobs(true);
    } catch { toast.error('فشل الحذف'); }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => navigate('/dashboard/metadata-start')}
          className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          aria-label="مهمة جديدة"
          title="مهمة جديدة"
        >
          <Plus size={20} />
        </button>
        <div className="text-center">
          <h1 className="text-white font-extrabold text-xl">مهام تعريب البيانات</h1>
          <p className="text-white/40 text-xs mt-0.5">عنوان • وصف • تصنيفات</p>
        </div>
        <button
          onClick={() => navigate('/dashboard/translation-jobs')}
          className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          aria-label="رجوع"
        >
          <ArrowRight size={20} className="rotate-180" />
        </button>
      </div>

      <ConfirmDialog
        open={confirmDelete.open}
        title="حذف المهمة"
        message={`حذف مهمة تعريب "${confirmDelete.job?.novelTitle || ''}" نهائياً؟ (لا يؤثر على بيانات الرواية نفسها)`}
        confirmText="حذف"
        tone="danger"
        onCancel={() => setConfirmDelete({ open: false })}
        onConfirm={() => performDelete(confirmDelete.job)}
      />

      {loading ? (
        <div className="py-16 flex justify-center"><Spinner /></div>
      ) : jobs.length === 0 ? (
        <div className="py-20 text-center">
          <Layers size={52} className="mx-auto text-white/15" />
          <p className="text-white/50 mt-4 text-sm">لا توجد مهام تعريب بعد.</p>
          <button
            onClick={() => navigate('/dashboard/metadata-start')}
            className="mt-5 inline-flex items-center gap-2 bg-white text-black font-extrabold rounded-xl px-5 py-2.5 text-sm hover:bg-white/85 transition-colors"
          >
            <Languages size={17} />
            ابدأ مهمة جديدة
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {jobs.map((item) => {
            const totalSteps = item.totalSteps || 3;
            const pct = totalSteps > 0 ? Math.min(100, ((item.processedCount || 0) / totalSteps) * 100) : 0;
            return (
              <Glass key={item._id}>
                <div className="flex items-center gap-3 p-3">
                  <button onClick={() => openDetail(item)} className="flex items-center gap-3 flex-1 min-w-0 text-right">
                    <span className="relative w-[52px] h-[72px] rounded-lg overflow-hidden bg-white/5 shrink-0">
                      <img
                        src={item.cover}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.15'; }}
                      />
                      <span className="absolute inset-0 bg-black/45 flex items-center justify-center">
                        {item.status === 'active' && <Loader2 size={18} className="animate-spin text-white" />}
                        {item.status === 'completed' && <CheckCircle2 size={24} className="text-green-400" />}
                        {item.status === 'failed' && <X size={24} className="text-red-400" />}
                      </span>
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-white font-extrabold text-[15px] truncate mb-1.5">{item.novelTitle}</span>
                      <span className="flex items-center gap-2 mb-2">
                        <StatusDot status={item.status} labels={META_STATUS} />
                        <span className="text-white/35 text-[11px]">
                          {META_STEPS[Math.min(item.processedCount || 0, 2)] || '—'} • {item.processedCount || 0}/{totalSteps}
                        </span>
                      </span>
                      <span className="block w-full h-1 bg-white/10 rounded-full overflow-hidden">
                        <span className="block h-full bg-white rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </span>
                    </span>
                  </button>
                  <button
                    onClick={() => setConfirmDelete({ open: true, job: item })}
                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                    aria-label="حذف المهمة"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </Glass>
            );
          })}
        </div>
      )}

      {/* ورقة التفاصيل — مكافئ Detail Sheet المنزلق من الأسفل في التطبيق */}
      <AnimatePresence>
        {detailJob && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/60 flex items-end justify-center"
            onClick={() => setDetailJob(null)}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl max-h-[70vh] bg-[#0d0d0d] border-t border-x border-white/10 rounded-t-3xl flex flex-col"
            >
              <span className="w-11 h-1.5 rounded-full bg-white/20 mx-auto mt-2.5" />
              <div className="flex items-center justify-between p-4">
                <button onClick={() => setDetailJob(null)} className="text-white/40 hover:text-white" aria-label="إغلاق">
                  <X size={26} />
                </button>
                <span className="flex items-center gap-2 min-w-0">
                  <StatusDot status={detailJob?.status} labels={META_STATUS} />
                  <p className="text-white font-extrabold truncate">{detailJob?.novelTitle}</p>
                </span>
              </div>

              {/* شرائح الخطوات: العنوان ← الوصف ← التصنيفات */}
              <div className="flex gap-2 px-4 mb-3">
                {META_STEPS.map((label, i) => {
                  const done = (detailJob?.processedCount || 0) > i;
                  const isCurrent = (detailJob?.processedCount || 0) === i && detailJob?.status === 'active';
                  return (
                    <span
                      key={label}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold border transition-colors ${
                        done
                          ? 'bg-green-400 border-green-400 text-black'
                          : isCurrent
                            ? 'bg-transparent border-white text-white'
                            : 'bg-white/5 border-white/15 text-white/40'
                      }`}
                    >
                      {isCurrent && <Loader2 size={12} className="animate-spin" />}
                      {done && <CheckCircle2 size={13} />}
                      {label}
                    </span>
                  );
                })}
              </div>

              <div className="flex-1 min-h-0 px-4 pb-5 overflow-hidden">
                <LiveTerminal logs={detailLogs} minHeight={140} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="h-6" />
    </div>
  );
}

/* ═══════════════ 5. تعريب رواية موجودة — NovelMetadataTranslationScreen ═══════════════ */
export function MetadataStartPage() {
  const navigate = useNavigate();
  const { novels, loading, loadingMore, hasMore, search, setSearch, loadMore } = useTranslatorNovels();
  const [startingId, setStartingId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ open: boolean; novel?: any }>({ open: false });

  const startMetadataTranslation = async (novel: any) => {
    setConfirm({ open: false });
    setStartingId(novel._id);
    try {
      await translatorService.startMetadataTranslation(novel._id);
      toast.success('تم بدء مهمة تعريب البيانات');
      navigate('/dashboard/metadata-jobs');
    } catch (err: any) {
      toast.error(err?.message || 'فشل بدء المهمة');
    } finally {
      setStartingId(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <SubHead title="تعريب رواية موجودة" onClose={() => navigate('/dashboard/translation-jobs')} />
      <ConfirmDialog
        open={confirm.open}
        title="تعريب بيانات الرواية"
        message={`ترجمة عنوان ووصف وتصنيفات "${confirm.novel?.title || ''}"؟\nالعدد الحالي للفصول: ${confirm.novel?.chaptersCount || 0}`}
        confirmText="ابدأ التعريب"
        onCancel={() => setConfirm({ open: false })}
        onConfirm={() => startMetadataTranslation(confirm.novel)}
      />

      <div className="mb-3">
        <SearchBox value={search} onChange={setSearch} placeholder="ابحث عن رواية..." />
      </div>

      {loading ? (
        <div className="py-16 flex justify-center"><Spinner /></div>
      ) : novels.length === 0 ? (
        <div className="py-20 text-center">
          <BookOpen size={46} className="mx-auto text-white/15" />
          <p className="text-white/40 mt-3 text-sm">لا توجد روايات</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2.5">
            {novels.map((item) => (
              <Glass key={item._id}>
                <div className="flex items-center gap-3 p-3">
                  <img
                    src={item.cover}
                    alt=""
                    className="w-[45px] h-16 rounded-md object-cover bg-white/5 shrink-0"
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.15'; }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-extrabold text-sm truncate">{item.title}</p>
                    <p className="text-white/40 text-[11px] mt-1">
                      {item.author ? `بواسطة ${item.author} • ` : ''}{item.chaptersCount || 0} فصل
                    </p>
                  </div>
                  <button
                    onClick={() => setConfirm({ open: true, novel: item })}
                    disabled={startingId === item._id}
                    className="inline-flex items-center gap-1.5 bg-white text-black font-extrabold rounded-lg px-3.5 py-2 text-[13px] hover:bg-white/85 transition-colors disabled:opacity-60 shrink-0"
                  >
                    {startingId === item._id ? <Spinner /> : <Languages size={16} />}
                    تعريب
                  </button>
                </div>
              </Glass>
            ))}
          </div>
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="mt-3 w-full py-2.5 rounded-lg bg-white/10 border border-white/15 hover:bg-white/20 text-white text-xs font-extrabold transition-colors flex items-center justify-center gap-2"
            >
              {loadingMore ? <Spinner /> : 'تحميل المزيد'}
            </button>
          )}
        </>
      )}
      <div className="h-6" />
    </div>
  );
}

/* ═══════════════ 6. إعدادات المترجم — TranslatorSettingsScreen (944 سطراً كاملة) ═══════════════ */

const PROVIDER_TEMPLATES = [
  { type: 'deepseek', title: 'DeepSeek', subtitle: 'وضع عادي/خبير + مزودي POW + توكنات متعددة', Icon: Zap },
  { type: 'qwen', title: 'Qwen', subtitle: 'نموذج + تفكير + بحث، بدون POW', Icon: Sparkles },
  { type: 'gemini_web', title: 'Gemini Web', subtitle: 'كوكيز Google أو وضع الضيف بدون كوكيز — إكمال تلقائي ضد قطع الفصول ومنع تكرار الفقرات', Icon: Globe },
  { type: 'custom', title: 'مزوّد مخصص (OpenAI متوافق)', subtitle: 'Base URL + مفاتيح + جلب النماذج تلقائياً من الرابط', Icon: Wrench },
];

// 🔥 خوادم POW — Railway/Ngrok القديمة ماتت (404) والوكيل الجديد هو العامل الوحيد (تم التحقق حياً)
const DEFAULT_POW_PROVIDERS = [
  { id: 'zeus', name: 'Zeus POW', url: 'http://107.172.78.104:8800/get_pow' },
  { id: 'railway', name: 'Railway (قديم)', url: 'https://web-production-c09dc.up.railway.app/pow' },
  { id: 'ngrok', name: 'Ngrok (قديم)', url: 'https://immunize-quintet-trimmer.ngrok-free.dev/get_pow' },
];

const normalizePowProviderUrl = (url: string) => {
  const value = url || '';
  return value.includes('/get_pow') ? value.split('?')[0] : value;
};
const normalizePowProviders = (powProviders: any[]) =>
  (powProviders && powProviders.length ? powProviders : DEFAULT_POW_PROVIDERS).map((p: any) => ({ ...p, url: normalizePowProviderUrl(p.url) }));

// تصنيف المزوّدين حسب providerId فقط — المزوّد المخصص مستقل تماماً (كالتطبيق)
const isDeepSeekProvider = (p: any) => String(p.providerId || '').toLowerCase() === 'deepseek' || String(p.providerId || '').toLowerCase().startsWith('deepseek_');
const isQwenProvider = (p: any) => String(p.providerId || '').toLowerCase() === 'qwen' || String(p.providerId || '').toLowerCase().startsWith('qwen_');
const isGeminiWebProvider = (p: any) => String(p.providerId || '').toLowerCase() === 'gemini_web' || String(p.providerId || '').toLowerCase().startsWith('gemini_web_');

export function TranslationSettingsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // الحقول العامة
  const [transPrompt, setTransPrompt] = useState('');
  const [extractPrompt, setExtractPrompt] = useState('');

  // المزوّدون
  const [providers, setProviders] = useState<any[]>([]);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [showProviderPicker, setShowProviderPicker] = useState(false);

  // وضع التحديد المتعدد (بديل الضغطة المطولة في الويب: زر «تحديد»)
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // جلب النماذج من Base URL
  const [fetchingModelsFor, setFetchingModelsFor] = useState<string | null>(null);
  const [modelFilter, setModelFilter] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; ids: string[] }>({ open: false, ids: [] });

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    try {
      const res = await translatorService.getSettings();
      if (res) {
        setTransPrompt(res.customPrompt || '');
        setExtractPrompt(res.translatorExtractPrompt || '');
        const fetchedProviders = res.translationProviders || [];
        const normalized = fetchedProviders.map((p: any, idx: number) => ({
          providerId: p.providerId || `provider_${idx}`,
          name: p.name || 'مزوّد جديد',
          baseUrl: p.baseUrl || '',
          models: p.models && p.models.length ? p.models : [{ modelId: 'gemini-2.5-flash', modelName: 'Gemini 2.5 Flash' }],
          apiKeys: (p.apiKeys && p.apiKeys.length ? p.apiKeys : (p.deepSeekTokens && p.deepSeekTokens.length ? p.deepSeekTokens : (p.qwenTokens || []))),
          selectedModel: p.selectedModel || (p.models && p.models[0]?.modelId) || 'gemini-2.5-flash',
          priority: p.priority !== undefined ? p.priority : idx,
          thinkingEnabled: Boolean(p.thinkingEnabled),
          searchEnabled: p.searchEnabled !== false,
          deepSeekModelType: p.deepSeekModelType === 'expert' ? 'expert' : 'default',
          deepSeekTokens: p.deepSeekTokens || [],
          qwenTokens: p.qwenTokens || [],
          powProviders: normalizePowProviders(p.powProviders),
          selectedPowProviderId: p.selectedPowProviderId || 'zeus',
          modelsFetched: false,
        }));
        setProviders(normalized);
      }
    } catch {
      toast.error('فشل جلب الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  const buildProviderByType = (type: string) => {
    const newPriority = providers.length > 0 ? Math.max(...providers.map((p) => p.priority)) + 1 : 0;
    const id = `${type}_${Date.now()}`;
    const base = {
      providerId: id, name: 'مزوّد جديد', baseUrl: '', models: [] as any[], apiKeys: [] as string[],
      selectedModel: '', priority: newPriority, thinkingEnabled: false, searchEnabled: true,
      deepSeekModelType: 'default', deepSeekTokens: [] as string[], qwenTokens: [] as string[],
      powProviders: [] as any[], selectedPowProviderId: '', modelsFetched: false,
    };
    if (type === 'deepseek') {
      return { ...base, name: 'DeepSeek', models: [{ modelId: 'deepseek-chat', modelName: 'DeepSeek Chat' }], selectedModel: 'deepseek-chat', powProviders: normalizePowProviders(DEFAULT_POW_PROVIDERS), selectedPowProviderId: 'zeus' };
    }
    if (type === 'qwen') {
      return { ...base, name: 'Qwen', models: [{ modelId: 'qwen3.8-max', modelName: 'Qwen 3.8 Max' }], selectedModel: 'qwen3.8-max', thinkingEnabled: true, searchEnabled: true };
    }
    if (type === 'gemini_web') {
      return { ...base, name: 'Gemini Web', models: [{ modelId: 'gemini-web', modelName: 'Gemini Web' }], selectedModel: 'gemini-web' };
    }
    return { ...base, name: 'مزوّد مخصص', models: [{ modelId: '', modelName: '' }], selectedModel: '' };
  };

  const addProvider = (type: string) => {
    const newProvider = buildProviderByType(type);
    setProviders((prev) => [...prev, newProvider]);
    setExpandedProvider(newProvider.providerId);
    setShowProviderPicker(false);
  };

  const saveProviders = async (list: any[]) => {
    const cleanedProviders = list.map((p) => ({
      providerId: p.providerId,
      name: p.name,
      baseUrl: p.baseUrl || '',
      models: (p.models || []).filter((m: any) => (m.modelId || '').trim() !== '').map((m: any) => ({ modelId: m.modelId.trim(), modelName: (m.modelName || '').trim() || m.modelId.trim() })),
      apiKeys: p.apiKeys || [],
      selectedModel: p.selectedModel,
      priority: p.priority,
      thinkingEnabled: p.thinkingEnabled,
      searchEnabled: p.searchEnabled,
      deepSeekModelType: p.deepSeekModelType,
      deepSeekTokens: isDeepSeekProvider(p) ? (p.apiKeys || []) : (p.deepSeekTokens || []),
      qwenTokens: isQwenProvider(p) ? (p.apiKeys || []) : (p.qwenTokens || []),
      powProviders: isDeepSeekProvider(p)
        ? normalizePowProviders(p.powProviders).filter((pow: any) => (pow.url || '').trim() !== '').map((pow: any) => ({ id: pow.id, name: pow.name, url: normalizePowProviderUrl(pow.url) }))
        : [],
      selectedPowProviderId: isDeepSeekProvider(p) ? (p.selectedPowProviderId || 'zeus') : '',
    }));
    await translatorService.saveSettings({
      customPrompt: transPrompt,
      translatorExtractPrompt: extractPrompt,
      translationProviders: cleanedProviders,
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveProviders(providers);
      toast.success('تم حفظ الإعدادات بنجاح');
      navigate('/dashboard/translation-jobs');
    } catch {
      toast.error('فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const persistDelete = async (ids: string[]) => {
    const remaining = providers.filter((p) => !ids.includes(p.providerId));
    setProviders(remaining);
    setSelectedIds([]);
    setSelectionMode(false);
    if (ids.includes(expandedProvider || '')) setExpandedProvider(null);
    try {
      await saveProviders(remaining);
      toast.success(`تم حذف ${ids.length} مزوّد وحفظ التغيير`);
    } catch {
      toast.error('تم الحذف محلياً لكن فشل الحفظ على السيرفر');
    }
  };

  const toggleSelected = (providerId: string) => {
    setSelectedIds((prev) => (prev.includes(providerId) ? prev.filter((id) => id !== providerId) : [...prev, providerId]));
  };

  // جلب النماذج من Base URL — مثل التطبيق
  const fetchModelsForProvider = async (providerId: string) => {
    const p = providers.find((x) => x.providerId === providerId);
    if (!p) return;
    if (!p.baseUrl || !p.baseUrl.trim()) {
      toast.error('أدخل Base URL أولاً ثم أعد المحاولة');
      return;
    }
    try {
      setFetchingModelsFor(providerId);
      setModelFilter('');
      const res = await translatorService.fetchProviderModels(p.baseUrl, (p.apiKeys && p.apiKeys[0]) || '');
      const models = (res && (res as any).models) || res || [];
      if (!models.length) {
        toast.error('المزوّد لم يُرجع أي نموذج');
        return;
      }
      setProviders((prev) => prev.map((x) => {
        if (x.providerId !== providerId) return x;
        const mapped = models.map((m: any) => ({ modelId: m.modelId, modelName: m.modelName || m.modelId }));
        const stillThere = mapped.some((m: any) => m.modelId === x.selectedModel);
        return { ...x, models: mapped, selectedModel: stillThere ? x.selectedModel : mapped[0].modelId, modelsFetched: true };
      }));
      toast.success(`تم جلب ${models.length} نموذج — اختر نموذجاً`);
    } catch (err: any) {
      toast.error(err?.message || 'فشل جلب النماذج من المزوّد');
    } finally {
      setFetchingModelsFor(null);
    }
  };

  const updateProviderField = (providerId: string, field: string, value: any) => {
    setProviders((prev) => prev.map((p) => (p.providerId === providerId ? { ...p, [field]: value } : p)));
  };

  const updateProviderKeys = (providerId: string, text: string) => {
    const keys = text.split('\n').map((k) => k.trim()).filter((k) => k.length > 5);
    setProviders((prev) => prev.map((p) => (p.providerId === providerId ? { ...p, apiKeys: keys, _keysText: text } : p)));
  };

  const deletePowProvider = (providerId: string, powProviderId: string) => {
    setProviders((prev) => prev.map((p) => {
      if (p.providerId !== providerId) return p;
      const updatedPowProviders = normalizePowProviders(p.powProviders).filter((pow: any) => pow.id !== powProviderId);
      const selectedPowProviderId = p.selectedPowProviderId === powProviderId ? (updatedPowProviders[0]?.id || '') : p.selectedPowProviderId;
      return { ...p, powProviders: updatedPowProviders, selectedPowProviderId };
    }));
  };

  /** إضافة خادم POW مخصص — يظهر سطر قابل للتحرير (اسم + رابط) يُحفظ مع الإعدادات */
  const addPowProvider = (providerId: string) => {
    setProviders((prev) => prev.map((p) => {
      if (p.providerId !== providerId) return p;
      const current = normalizePowProviders(p.powProviders);
      const newRow = { id: `pow_${Date.now()}`, name: 'خادم مخصص', url: '', _custom: true };
      return { ...p, powProviders: [...current, newRow] };
    }));
  };

  /** تعديل حقل في صف POW (الاسم أو الرابط) — للخوادم المخصصة */
  const updatePowField = (providerId: string, powId: string, field: 'name' | 'url', value: string) => {
    setProviders((prev) => prev.map((p) => {
      if (p.providerId !== providerId) return p;
      const updatedPowProviders = normalizePowProviders(p.powProviders).map((pow: any) => (pow.id === powId ? { ...pow, [field]: value } : pow));
      return { ...p, powProviders: updatedPowProviders };
    }));
  };

  const addModelToProvider = (providerId: string) => {
    setProviders((prev) => prev.map((p) => {
      if (p.providerId !== providerId) return p;
      return { ...p, models: [...p.models, { modelId: '', modelName: '' }], modelsFetched: false };
    }));
  };

  const removeModelFromProvider = (providerId: string, modelIndex: number) => {
    setProviders((prev) => prev.map((p) => {
      if (p.providerId !== providerId) return p;
      if (p.models.length <= 1) {
        toast.error('يجب أن يحتوي المزوّد على نموذج واحد على الأقل');
        return p;
      }
      const updatedModels = p.models.filter((_: any, idx: number) => idx !== modelIndex);
      let updatedSelectedModel = p.selectedModel;
      if (!updatedModels.find((m: any) => m.modelId === updatedSelectedModel)) {
        updatedSelectedModel = updatedModels[0].modelId;
      }
      return { ...p, models: updatedModels, selectedModel: updatedSelectedModel };
    }));
  };

  const updateModelField = (providerId: string, modelIndex: number, field: string, value: string) => {
    setProviders((prev) => prev.map((p) => {
      if (p.providerId !== providerId) return p;
      const updatedModels = p.models.map((m: any, idx: number) => (idx === modelIndex ? { ...m, [field]: value } : m));
      return { ...p, models: updatedModels };
    }));
  };

  const moveProvider = (index: number, direction: number) => {
    const newProviders = [...providers];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newProviders.length) return;
    [newProviders[index].priority, newProviders[targetIndex].priority] = [newProviders[targetIndex].priority, newProviders[index].priority];
    newProviders.sort((a, b) => a.priority - b.priority);
    setProviders(newProviders);
  };

  if (loading) {
    return <div className="py-32 flex justify-center"><Spinner /></div>;
  }

  const miniLabel = 'block text-white/70 text-xs mb-1.5 mt-3';
  const hintSmall = 'text-white/35 text-[11px] leading-relaxed';

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-white text-black font-extrabold rounded-xl px-4 py-2.5 text-sm hover:bg-white/85 transition-colors disabled:opacity-60"
        >
          {saving ? <Spinner /> : 'حفظ الإعدادات'}
        </button>
        <h1 className="text-white font-extrabold text-lg">إعدادات المترجم</h1>
      </div>

      {/* إضافة مزوّد جديد */}
      <button
        onClick={() => setShowProviderPicker(true)}
        className="w-full flex items-center justify-center gap-2.5 rounded-2xl border border-white/20 bg-white/[0.07] hover:bg-white/[0.12] py-4 text-white font-extrabold transition-colors"
      >
        <PlusCircle size={22} />
        إضافة مزوّد جديد
      </button>

      {/* منتقي نوع المزوّد */}
      <AnimatePresence>
        {showProviderPicker && (
          <Modal title="اختر نوع المزوّد" onClose={() => setShowProviderPicker(false)}>
            <p className="text-white/40 text-xs mb-4 leading-relaxed">
              كل مزوّد سيُنشأ بإعداداته الخاصة فقط، بدون خلط إعدادات DeepSeek/Qwen مع المزوّد المخصص.
            </p>
            <div className="flex flex-col gap-2">
              {PROVIDER_TEMPLATES.map((template) => (
                <button
                  key={template.type}
                  onClick={() => addProvider(template.type)}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/10 p-3.5 text-right transition-colors"
                >
                  <template.Icon size={22} className="text-white shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-white font-extrabold text-sm">{template.title}</span>
                    <span className="block text-white/40 text-xs mt-1 leading-relaxed">{template.subtitle}</span>
                  </span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowProviderPicker(false)} className="mt-4 w-full py-2.5 text-white/60 hover:text-white text-sm font-bold">
              إلغاء
            </button>
          </Modal>
        )}
      </AnimatePresence>

      {/* شريط وضع التحديد المتعدد */}
      {selectionMode ? (
        <div className="mt-3 bg-white/[0.06] border border-white/15 rounded-xl p-3 flex flex-wrap items-center gap-2">
          <span className="text-white text-sm font-bold">تم تحديد {selectedIds.length}</span>
          <div className="flex gap-2 mr-auto">
            <button onClick={() => setSelectedIds(providers.map((p) => p.providerId))} className="rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-white text-xs font-bold">تحديد الكل</button>
            <button
              onClick={() => { if (selectedIds.length > 0) setConfirmDelete({ open: true, ids: selectedIds }); }}
              disabled={selectedIds.length === 0}
              className="rounded-lg bg-red-500/20 hover:bg-red-500/30 px-3 py-1.5 text-red-300 text-xs font-bold flex items-center gap-1.5 disabled:opacity-40"
            >
              <Trash2 size={13} /> حذف ({selectedIds.length})
            </button>
            <button onClick={() => { setSelectionMode(false); setSelectedIds([]); }} className="rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-white text-xs font-bold">إلغاء</button>
          </div>
        </div>
      ) : (
        providers.length > 0 && (
          <p className={`${hintSmall} mt-2.5`}>
            💡 اضغط زر «تحديد» بالأسفل لتفعيل وضع تحديد عدة مزوّدين وحذفهم معاً
          </p>
        )
      )}
      {!selectionMode && providers.length > 0 && (
        <button
          onClick={() => setSelectionMode(true)}
          className="mt-2 inline-flex items-center gap-1.5 text-white/50 hover:text-white text-xs font-bold"
        >
          <Square size={12} /> تحديد
        </button>
      )}

      <ConfirmDialog
        open={confirmDelete.open}
        title="تأكيد الحذف"
        message={confirmDelete.ids.length > 1 ? `هل تريد حذف ${confirmDelete.ids.length} مزوّد محدد نهائياً؟` : 'هل تريد حذف هذا المزود نهائياً؟'}
        confirmText={confirmDelete.ids.length > 1 ? 'حذف الكل' : 'حذف'}
        tone="danger"
        onCancel={() => setConfirmDelete({ open: false, ids: [] })}
        onConfirm={() => { persistDelete(confirmDelete.ids); setConfirmDelete({ open: false, ids: [] }); }}
      />

      {/* بطاقات المزوّدين */}
      {[...providers].sort((a, b) => a.priority - b.priority).map((provider, index) => {
        const isExpanded = expandedProvider === provider.providerId;
        const isSelected = selectedIds.includes(provider.providerId);
        const isChatTemplate = isDeepSeekProvider(provider) || isQwenProvider(provider) || isGeminiWebProvider(provider);
        return (
          <Glass key={provider.providerId} className={`mt-3 ${isSelected ? 'border-green-400/60' : ''}`}>
            {/* رأس البطاقة */}
            <div className="flex items-center gap-2 p-3.5">
              {selectionMode ? (
                <button onClick={() => toggleSelected(provider.providerId)} aria-label="تحديد المزوّد">
                  {isSelected ? <CheckCircle2 size={22} className="text-green-400" /> : <Circle size={22} className="text-white/40" />}
                </button>
              ) : (
                <button onClick={() => { setExpandedProvider(isExpanded ? null : provider.providerId); setModelFilter(''); }} aria-label="توسيع">
                  {isExpanded ? <ChevronUp size={20} className="text-white/60" /> : <ChevronDown size={20} className="text-white/60" />}
                </button>
              )}
              <button
                onClick={() => { if (!selectionMode) { setExpandedProvider(isExpanded ? null : provider.providerId); setModelFilter(''); } else toggleSelected(provider.providerId); }}
                className="flex-1 min-w-0 text-right"
              >
                <p className="text-white font-extrabold text-sm truncate">{provider.name}</p>
                <p className="text-white/35 text-[11px] mt-0.5 truncate">النموذج: {provider.selectedModel || 'غير محدد'}</p>
              </button>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => moveProvider(index, -1)} disabled={index === 0} className="p-1 text-white/70 hover:text-white disabled:opacity-25" aria-label="أعلى">
                  <ArrowUp size={16} />
                </button>
                <button onClick={() => moveProvider(index, 1)} disabled={index === providers.length - 1} className="p-1 text-white/70 hover:text-white disabled:opacity-25" aria-label="أسفل">
                  <ArrowDown size={16} />
                </button>
                <button
                  onClick={() => setConfirmDelete({ open: true, ids: [provider.providerId] })}
                  className="p-1 text-red-400 hover:text-red-300"
                  aria-label="حذف المزوّد"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* المحتوى القابل للطي */}
            {isExpanded && !selectionMode && (
              <div className="px-4 pb-4 border-t border-white/10 pt-1">
                <label className={miniLabel}>اسم المزوّد</label>
                <input className={inputCls} value={provider.name} onChange={(e) => updateProviderField(provider.providerId, 'name', e.target.value)} placeholder="مثل: مزودي الخاص، OpenRouter" />

                {!isChatTemplate && (
                  <>
                    <label className={miniLabel}>Base URL (رابط المزوّد المتوافق مع OpenAI)</label>
                    <input className={inputCls} dir="ltr" value={provider.baseUrl} onChange={(e) => updateProviderField(provider.providerId, 'baseUrl', e.target.value)} placeholder="https://api.openai.com/v1" />
                  </>
                )}

                {/* صندوق DeepSeek */}
                {isDeepSeekProvider(provider) && (
                  <div className="mt-3 bg-white/[0.03] border border-white/10 rounded-xl p-3.5">
                    <p className="text-white font-bold text-xs">وضع مزوّد المحادثة</p>
                    <p className={hintSmall}>خاص بـ DeepSeek: وضع عادي/خبير مع التفكير والبحث وخوادم POW.</p>
                    <div className="flex gap-2 mt-2.5">
                      <button
                        onClick={() => updateProviderField(provider.providerId, 'deepSeekModelType', 'default')}
                        className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-extrabold border transition-colors ${provider.deepSeekModelType === 'default' ? 'bg-white text-black border-white' : 'text-white border-white/15 hover:bg-white/5'}`}
                      >
                        <Zap size={15} /> افتراضي
                      </button>
                      <button
                        onClick={() => updateProviderField(provider.providerId, 'deepSeekModelType', 'expert')}
                        className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-extrabold border transition-colors ${provider.deepSeekModelType === 'expert' ? 'bg-white text-black border-white' : 'text-white border-white/15 hover:bg-white/5'}`}
                      >
                        <Sparkles size={15} /> خبير
                      </button>
                    </div>
                    <div className="mt-2">
                      <Toggle checked={Boolean(provider.thinkingEnabled)} onChange={(v) => updateProviderField(provider.providerId, 'thinkingEnabled', v)} label="تفعيل التفكير" />
                      <Toggle checked={provider.searchEnabled !== false} onChange={(v) => updateProviderField(provider.providerId, 'searchEnabled', v)} label="تفعيل البحث" />
                    </div>
                  </div>
                )}

                {/* صندوق Qwen */}
                {isQwenProvider(provider) && (
                  <div className="mt-3 bg-white/[0.03] border border-white/10 rounded-xl p-3.5">
                    <p className="text-white font-bold text-xs">إعدادات Qwen</p>
                    <p className={hintSmall}>نموذج + تفكير + بحث، بدون خادم POW.</p>
                    <div className="mt-2">
                      <Toggle checked={Boolean(provider.thinkingEnabled)} onChange={(v) => updateProviderField(provider.providerId, 'thinkingEnabled', v)} label="تفعيل التفكير" />
                      <Toggle checked={provider.searchEnabled !== false} onChange={(v) => updateProviderField(provider.providerId, 'searchEnabled', v)} label="تفعيل البحث" />
                    </div>
                  </div>
                )}

                {/* صندوق Gemini Web */}
                {isGeminiWebProvider(provider) && (
                  <div className="mt-3 bg-white/[0.03] border border-white/10 rounded-xl p-3.5">
                    <p className="text-white font-bold text-xs">إعدادات Gemini Web</p>
                    <p className={hintSmall}>يستخدم واجهة gemini.google.com عبر كوكيز حساب Google. عند انقطاع الرد في منتصف الفصل يتم إكماله تلقائياً في نفس المحادثة، والتكرار للفقرات يُكشف ويُعاد إصلاحه آلياً.</p>
                    <p className={`${hintSmall} mt-2`}>🟡 يعمل أيضاً بدون أي كوكيز في وضع الضيف (وصول مجهول)، وسيظهر تنبيه واضح في سجل الترجمة عند دخول وضع الضيف أو الانتقال إليه تلقائياً عند فشل الكوكيز. وضع الضيف قد يكون أبطأ وقد يحدّه Google — الكوكيز تبقى الخيار الأفضل.</p>
                  </div>
                )}

                {/* مزودو POW — DeepSeek فقط */}
                {isDeepSeekProvider(provider) && (
                  <>
                    <label className={miniLabel}>مزود POW</label>
                    <p className={hintSmall}>الخوادم الافتراضية معروضة أدناه، ويمكنك إضافة خادم POW مخصص برابطك الخاص واختياره من القائمة.</p>
                    <div className="flex flex-col gap-2 mt-2">
                      {normalizePowProviders(provider.powProviders).map((pow: any) => {
                        const isCustom = Boolean(pow._custom) || !(pow.url || '').trim();
                        return (
                          <div key={pow.id} className="flex items-center gap-2">
                            <button
                              onClick={() => deletePowProvider(provider.providerId, pow.id)}
                              className="p-1.5 text-red-400 hover:text-red-300 shrink-0"
                              aria-label="حذف مزود POW"
                            >
                              <Trash2 size={17} />
                            </button>
                            <div
                              className={`flex-1 rounded-xl border p-2.5 transition-colors ${provider.selectedPowProviderId === pow.id ? 'border-white bg-white/5' : 'border-white/10 hover:border-white/30'}`}
                            >
                              <button
                                onClick={() => updateProviderField(provider.providerId, 'selectedPowProviderId', pow.id)}
                                className="w-full flex items-center gap-2 text-right"
                                aria-label={`اختيار ${pow.name || 'خادم POW'}`}
                              >
                                <span className="flex-1 min-w-0">
                                  <span className="block text-white text-xs font-bold">{pow.name || 'خادم مخصص'}</span>
                                  {!isCustom && <span className="block text-white/35 text-[10px] truncate" dir="ltr">{pow.url}</span>}
                                </span>
                                {provider.selectedPowProviderId === pow.id
                                  ? <CheckCircle2 size={20} className="text-white shrink-0" />
                                  : <Circle size={20} className="text-white/30 shrink-0" />}
                              </button>
                              {isCustom && (
                                <div className="grid grid-cols-[1fr_2fr] gap-2 mt-2">
                                  <input
                                    className="bg-white/5 border border-white/15 rounded-lg px-2.5 py-1.5 text-white text-[11px] outline-none focus:border-white/40"
                                    placeholder="اسم الخادم"
                                    value={pow.name || ''}
                                    onChange={(e) => updatePowField(provider.providerId, pow.id, 'name', e.target.value)}
                                  />
                                  <input
                                    className="bg-white/5 border border-white/15 rounded-lg px-2.5 py-1.5 text-white text-[11px] outline-none focus:border-white/40 font-mono"
                                    dir="ltr"
                                    placeholder="http://your-server:8800/get_pow"
                                    value={pow.url || ''}
                                    onChange={(e) => updatePowField(provider.providerId, pow.id, 'url', e.target.value)}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => addPowProvider(provider.providerId)}
                      className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-white/25 hover:border-white/50 hover:bg-white/5 px-3 py-2 text-white/70 hover:text-white text-xs font-bold transition-colors"
                    >
                      <PlusCircle size={15} /> إضافة خادم POW مخصص
                    </button>
                  </>
                )}

                {/* المفاتيح */}
                <label className={miniLabel}>
                  {isDeepSeekProvider(provider) ? 'توكنات DeepSeek (كل توكن في سطر)' : isQwenProvider(provider) ? 'توكنات Qwen (كل توكن في سطر)' : isGeminiWebProvider(provider) ? 'كوكيز Gemini (اختيارية — فارغة = وضع الضيف)' : 'مفاتيح API (كل مفتاح في سطر)'}
                </label>
                <p className={hintSmall}>
                  {isGeminiWebProvider(provider)
                    ? '🟡 اترك الحقل فارغاً تماماً للعمل في وضع الضيف (بدون حساب — وصول مجهول). أو للحصول على أفضل تجربة: سجّل الدخول في gemini.google.com من المتصفح ← F12 ← Application ← Cookies ← انسخ قيمة __Secure-1PSID و __Secure-1PSIDTS بالشكل: __Secure-1PSID=...; __Secure-1PSIDTS=... (كل حساب في سطر = جلسة مستقلة). الكوكيز تنتهي دورياً — وعند فشلها ينتقل النظام تلقائياً لوضع الضيف مع تنبيه واضح في السجل.'
                    : isDeepSeekProvider(provider)
                      ? '🔑 بالنسبة لـ DeepSeek: ضع توكنات الحساب هنا؛ سيتم استخدامها فعلياً بدل التوكن الافتراضي.'
                      : isQwenProvider(provider)
                        ? '🔑 بالنسبة لـ Qwen: ضع توكنات الحساب هنا وسيعاملها النظام مثل DeepSeek.'
                        : '🔑 مفاتيح هذا المزوّد مستقلة تماماً ويُرسل معها الطلب إلى Base URL أعلاه.'}
                </p>
                <textarea
                  className={inputCls + ' mt-2 font-mono text-xs leading-relaxed'}
                  dir="ltr"
                  rows={4}
                  placeholder={
                    isDeepSeekProvider(provider)
                      ? 'DeepSeek token 1\nDeepSeek token 2'
                      : isQwenProvider(provider)
                        ? 'Qwen token 1\nQwen token 2'
                        : isGeminiWebProvider(provider)
                          ? 'اختياري — __Secure-1PSID=...; __Secure-1PSIDTS=...\nأو اتركه فارغاً لوضع الضيف'
                          : 'sk-...\nمفتاح آخر'
                  }
                  value={provider._keysText !== undefined ? provider._keysText : (provider.apiKeys || []).join('\n')}
                  onChange={(e) => updateProviderKeys(provider.providerId, e.target.value)}
                />

                {/* النماذج */}
                <div className="flex items-center justify-between mt-3">
                  <span className="text-white/70 text-xs font-bold">النماذج</span>
                  {!isChatTemplate && (
                    <button
                      onClick={() => fetchModelsForProvider(provider.providerId)}
                      disabled={fetchingModelsFor === provider.providerId}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-white text-xs font-bold disabled:opacity-50"
                    >
                      {fetchingModelsFor === provider.providerId ? <Spinner /> : <CloudDownload size={14} />}
                      جلب النماذج من الرابط
                    </button>
                  )}
                </div>

                {!isChatTemplate && provider.modelsFetched && provider.models.length > 0 ? (
                  <>
                    <p className={hintSmall}>اختر النموذج المطلوب من {provider.models.length} نموذج تم جلبها:</p>
                    <input
                      className={inputCls + ' mt-2'}
                      dir="ltr"
                      value={modelFilter}
                      onChange={(e) => setModelFilter(e.target.value)}
                      placeholder="ابحث عن نموذج..."
                    />
                    <div className="mt-2 max-h-56 overflow-y-auto wor-scroll border border-white/10 rounded-xl">
                      {provider.models
                        .filter((m: any) => !modelFilter.trim() || m.modelId.toLowerCase().includes(modelFilter.trim().toLowerCase()))
                        .slice(0, 200)
                        .map((m: any) => (
                          <button
                            key={m.modelId}
                            onClick={() => updateProviderField(provider.providerId, 'selectedModel', m.modelId)}
                            className="w-full flex items-center justify-between gap-2 px-3 py-2 border-b border-white/5 last:border-0 hover:bg-white/5 text-right transition-colors"
                          >
                            <span className="text-white/80 text-xs truncate" dir="ltr">{m.modelId}</span>
                            {provider.selectedModel === m.modelId
                              ? <CheckCircle2 size={18} className="text-white shrink-0" />
                              : <Circle size={18} className="text-white/25 shrink-0" />}
                          </button>
                        ))}
                    </div>
                    <button
                      onClick={() => updateProviderField(provider.providerId, 'modelsFetched', false)}
                      className="mt-2 text-white/50 hover:text-white text-xs font-bold"
                    >
                      التبديل للإدخال اليدوي
                    </button>
                  </>
                ) : (
                  <>
                    {provider.models.map((model: any, mIdx: number) => (
                      <div key={mIdx} className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => removeModelFromProvider(provider.providerId, mIdx)}
                          className="p-1 text-red-400 hover:text-red-300 shrink-0"
                          aria-label="حذف النموذج"
                        >
                          <MinusCircle size={20} />
                        </button>
                        <div className="flex-1 min-w-0 grid grid-cols-2 gap-2">
                          <input
                            className={inputCls + ' text-xs'}
                            dir="ltr"
                            placeholder="modelId"
                            value={model.modelId}
                            onChange={(e) => updateModelField(provider.providerId, mIdx, 'modelId', e.target.value)}
                          />
                          <input
                            className={inputCls + ' text-xs'}
                            placeholder="اسم ودود"
                            value={model.modelName}
                            onChange={(e) => updateModelField(provider.providerId, mIdx, 'modelName', e.target.value)}
                          />
                        </div>
                        <button
                          onClick={() => updateProviderField(provider.providerId, 'selectedModel', model.modelId)}
                          className="shrink-0"
                          aria-label="اختيار النموذج"
                        >
                          {provider.selectedModel === model.modelId
                            ? <CheckCircle2 size={20} className="text-white" />
                            : <Circle size={20} className="text-white/30" />}
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addModelToProvider(provider.providerId)}
                      className="mt-2.5 inline-flex items-center gap-1.5 text-white/60 hover:text-white text-xs font-bold"
                    >
                      <PlusCircle size={15} /> إضافة نموذج
                    </button>
                  </>
                )}
              </div>
            )}
          </Glass>
        );
      })}

      {/* تعليمات الترجمة */}
      <Glass className="mt-5 p-4">
        <p className="text-white font-extrabold text-sm">تعليمات الترجمة</p>
        <p className="text-white/35 text-[11px] mt-0.5 mb-2.5">النبرة، الأسلوب، الضمائر...</p>
        <textarea
          className={inputCls}
          rows={5}
          dir="auto"
          value={transPrompt}
          onChange={(e) => setTransPrompt(e.target.value)}
          placeholder="You are a professional translator..."
        />
      </Glass>

      {/* استخراج المصطلحات */}
      <Glass className="mt-4 p-4 border-white/20">
        <p className="text-white font-extrabold text-sm">استخراج المصطلحات</p>
        <p className="text-white/35 text-[11px] mt-0.5 mb-2.5">كيفية استخراج المصطلحات الجديدة للمسرد. يتم الاستخراج دائماً بنفس مزوّد الترجمة الناجح.</p>
        <textarea
          className={inputCls}
          rows={5}
          dir="auto"
          value={extractPrompt}
          onChange={(e) => setExtractPrompt(e.target.value)}
          placeholder="Extract proper nouns..."
        />
      </Glass>

      {/* زر الحفظ */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-5 mb-8 w-full bg-white text-black rounded-2xl py-4 font-extrabold hover:bg-white/85 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {saving ? <Spinner /> : 'حفظ الإعدادات'}
      </button>
    </div>
  );
}
