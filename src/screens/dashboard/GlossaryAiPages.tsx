/**
 * صفحات المستخرج الذكي — نقل حرفي لشاشات التطبيق (عائلة المترجم الذكي):
 *
 *  1) GlossaryAiJobsPage     ← GlossaryExtractorHubScreen       «المستخرج الذكي / Zeus AI Glossary Extractor»
 *  2) GlossaryAiStartPage    ← GlossaryExtractorSelectionScreen «اختيار الرواية» (جزآن + نطاق)
 *  3) GlossaryAiJobDetailPage← GlossaryExtractorJobDetailScreen «تحليلات المستخرج» + الطرفية الحية
 *
 * المستخرج (الذكاء الاصطناعي) يمر على فصول الرواية الأصلية قبل الترجمة ويستخرج
 * من كل فصل مصطلحاته (شخصيات/أماكن/عناصر/رتب/أخرى) مع اقتراح الترجمة العربية،
 * ويغذيها في المسرد — ليكتمل مسرد الرواية كله قبل بدء الترجمة، فتُوزَّع فصولها
 * بعد ذلك على عدة مهام ترجمة تعمل بسرعة مع مسرد جاهز. نفس مزوّدات المترجم
 * ونفس مفاتيحه (Qwen بحسابات تلقائية وبلا انتقال لمزوّد آخر — كالمترجم حرفياً).
 *
 * ⚠️ نظام إضافي مستقل تماماً: لا يمس المترجم ولا المراجع ولا أي نظام قائم.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Play, Pause, Trash2, ArrowRight, X, Search,
  CheckCircle2, Loader2, PlusCircle, BookMarked,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { glossaryAiService, translatorService } from '../../services/translator';
import { ConfirmDialog, LiveTerminal } from './AiPages';
import { Spinner, PageHead } from './shared';

/* ═══════════════ عناصر مشتركة — نسخ مطابقة من ReviewPages (نفس لغة التطبيق) ═══════════════ */

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

function StatusDot({ status, labels }: { status: string; labels: Record<string, string> }) {
  const dot = status === 'active' ? 'bg-white' : status === 'completed' ? 'bg-green-400' : status === 'failed' ? 'bg-red-400' : 'bg-white/30';
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      <span className="text-white/60 text-xs">{labels[status] || status}</span>
    </span>
  );
}

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

/** خطاف قائمة الروايات (نفس نسخة ReviewPages لكن على /api/glossary-ai/novels) */
function useGlossaryAiNovels() {
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
      const res = await glossaryAiService.getNovels(searchOverride ?? searchRef.current, pageNum, 20);
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

/* ═══════════════ 1. المستخرج الذكي — GlossaryExtractorHubScreen ═══════════════ */
export function GlossaryAiJobsPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { setJobs(await glossaryAiService.getJobs()); }
    catch { /* هادئ — التحديث الدوري يعيد المحاولة */ }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const bigBtn = 'w-full flex items-center justify-center gap-2.5 rounded-2xl border border-white/20 bg-white/[0.07] hover:bg-white/[0.12] px-5 py-5 text-white font-extrabold text-lg transition-all';

  return (
    <div className="max-w-3xl mx-auto">
      <PageHead title="المستخرج الذكي" desc="Zeus AI Glossary Extractor — استخراج مصطلحات الرواية كاملة قبل الترجمة" />

      {/* زر البدء — كما في التطبيق بالضبط */}
      <button className={bigBtn + ' mb-8'} onClick={() => navigate('/dashboard/glossary-ai/start')}>
        <PlusCircle size={26} />
        بدء استخراج مصطلحات جديد
      </button>

      <h2 className="text-white font-extrabold text-lg mb-4">المهام الحالية</h2>

      {loading ? (
        <div className="py-16 flex justify-center"><Spinner /></div>
      ) : jobs.length === 0 ? (
        <p className="text-white/40 text-center py-16">لا توجد مهام استخراج حالياً.</p>
      ) : (
        <div className="flex flex-col gap-3.5">
          {jobs.map((job) => {
            const done = job.processed || 0;
            const total = job.total || job.totalToExtract || 0;
            const pct = total > 0 ? Math.min(100, (done / total) * 100) : 0;
            return (
              <Glass key={job.id || job._id} onClick={() => navigate(`/dashboard/glossary-ai/jobs/${job.id || job._id}`)}>
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
                        labels={{ active: 'جاري الاستخراج', completed: 'مكتمل', paused: 'متوقف مؤقتاً', failed: 'متوقف/خطأ' }}
                      />
                    </div>
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mb-1.5">
                      <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-white/40 text-[11px]">
                      {done} / {total} فصل{job.newTerms ? ` — 📚 ${job.newTerms} مصطلح` : ''}
                    </p>
                  </div>
                  <ArrowRight size={18} className="text-white/25 rotate-180 shrink-0" />
                </div>
              </Glass>
            );
          })}
        </div>
      )}

      <div className="mt-8 flex items-start gap-2.5 bg-white/[0.04] border border-white/10 rounded-2xl p-4">
        <BookMarked size={18} className="text-white/40 shrink-0 mt-0.5" />
        <p className="text-white/40 text-xs leading-relaxed">
          💡 ابدأ باستخراج مصطلحات الرواية كاملة أولاً — بعدها وزّع فصولها على مهام ترجمة متعددة تعمل بسرعة مع مسرد جاهز. المصطلحات تُحفظ في «إدارة المصطلحات» لنفس الرواية.
        </p>
      </div>
    </div>
  );
}

/* ═══════════════ 2. اختيار الرواية — GlossaryExtractorSelectionScreen ═══════════════ */
export function GlossaryAiStartPage() {
  const navigate = useNavigate();
  const { novels, loading, loadingMore, hasMore, search, setSearch, loadMore } = useGlossaryAiNovels();

  const [selectedNovel, setSelectedNovel] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [selectionMode, setSelectionMode] = useState<'all' | 'manual'>('all');
  const [selectedChapters, setSelectedChapters] = useState<number[]>([]);
  const [rangeInput, setRangeInput] = useState('');
  // ⏱️ الفاصل بين كل فصل والذي يليه (بالثواني) — لتقليل الاستهلاك والسرعة
  const [delayInput, setDelayInput] = useState('3');
  const [starting, setStarting] = useState(false);
  const [confirm, setConfirm] = useState<{ open: boolean; message: string }>({ open: false, message: '' });

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

  /** تطبيق النطاق — يدعم "25-100" و"150-!" وأرقاماً مفصولة بفواصل "12,50" (كالتطبيق) */
  const handleApplyRange = () => {
    if (!rangeInput.trim()) { toast.error('يرجى إدخال نطاق'); return; }
    const input = rangeInput.trim();
    let newSelection: number[] = [];
    const availableNumbers = chapters.map((c) => c.number);
    const maxChap = availableNumbers.length > 0 ? Math.max(...availableNumbers) : 0;

    for (const token of input.split(/[,،]/)) {
      const part = token.trim();
      if (!part) continue;
      if (part.includes('-!')) {
        const start = parseInt(part.split('-!')[0]);
        if (isNaN(start)) continue;
        for (let i = start; i <= maxChap; i++) if (availableNumbers.includes(i) && !newSelection.includes(i)) newSelection.push(i);
      } else if (part.includes('-')) {
        const parts = part.split('-');
        const start = parseInt(parts[0]);
        const end = parseInt(parts[1]);
        if (isNaN(start) || isNaN(end)) continue;
        for (let i = start; i <= end; i++) if (availableNumbers.includes(i) && !newSelection.includes(i)) newSelection.push(i);
      } else {
        const num = parseInt(part);
        if (!isNaN(num) && availableNumbers.includes(num) && !newSelection.includes(num)) newSelection.push(num);
      }
    }

    if (newSelection.length === 0) toast.error('لم يتم العثور على فصول');
    else {
      setSelectedChapters(newSelection);
      toast.success(`تم تحديد ${newSelection.length} فصل`);
    }
  };

  const confirmExtraction = () => {
    if (!selectedNovel) return;
    if (selectionMode === 'manual' && selectedChapters.length === 0) {
      toast.error('الرجاء تحديد فصل واحد على الأقل');
      return;
    }
    const count = selectionMode === 'manual' ? String(selectedChapters.length) : (chapters.length ? String(chapters.length) : 'الكل');
    setConfirm({
      open: true,
      message: `هل أنت متأكد من بدء استخراج مصطلحات "${selectedNovel.title}"؟\nعدد الفصول: ${count}`,
    });
  };

  const startExtraction = async () => {
    setConfirm({ open: false, message: '' });
    setStarting(true);
    try {
      const delaySec = parseFloat(String(delayInput).replace(',', '.'));
      const safeDelay = Number.isFinite(delaySec) && delaySec >= 0 && delaySec <= 3600 ? delaySec : 3;
      await glossaryAiService.start({
        novelId: selectedNovel._id,
        chapters: selectionMode === 'manual' ? selectedChapters : 'all',
        chapterDelay: safeDelay,
      });
      toast.success('تم بدء استخراج المصطلحات');
      navigate('/dashboard/glossary-ai');
    } catch {
      toast.error('فشل بدء الاستخراج');
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <SubHead title="اختيار الرواية" onClose={() => navigate('/dashboard/glossary-ai')} />
      <ConfirmDialog
        open={confirm.open}
        title="تأكيد الاستخراج"
        message={confirm.message}
        confirmText="ابدأ الآن"
        onCancel={() => setConfirm({ open: false, message: '' })}
        onConfirm={startExtraction}
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

              {/* ⏱️ الفاصل بين الفصول — تحكم كامل من الواجهة لتقليل السرعة/الاستهلاك */}
              <div className="flex items-center justify-between gap-2 bg-black/40 rounded-lg px-3 py-2 mb-3">
                <span className="text-white/60 text-xs font-bold">⏱️ الفاصل بين كل فصل (ثواني)</span>
                <input
                  className="w-20 bg-white/5 border border-white/15 rounded-lg px-2 py-1.5 text-white text-xs text-center outline-none focus:border-white/40"
                  placeholder="3"
                  inputMode="decimal"
                  value={delayInput}
                  onChange={(e) => setDelayInput(e.target.value)}
                />
              </div>

              {selectionMode === 'manual' && (
                <div>
                  <div className="flex gap-1.5 mb-2">
                    <input
                      className="flex-1 bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white text-xs text-center outline-none focus:border-white/40"
                      placeholder="25-100 أو 12,50 أو 150-!"
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
                onClick={confirmExtraction}
                disabled={starting}
                className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[0.07] hover:bg-white/[0.14] py-3.5 text-white font-extrabold transition-colors disabled:opacity-50"
              >
                {starting ? <Spinner /> : <Play size={17} />}
                ابدأ استخراج المصطلحات
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

/* ═══════════════ 3. تحليلات المستخرج — GlossaryExtractorJobDetailScreen ═══════════════ */
export function GlossaryAiJobDetailPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [novelMaxChapter, setNovelMaxChapter] = useState(0);
  // ⏱️ التحكم الحي في الفاصل بين الفصول (بالثواني)
  const [delayInput, setDelayInput] = useState('3');
  const [savingDelay, setSavingDelay] = useState(false);
  const delayDirtyRef = useRef(false); // يمنع الاستقصاء من مسح ما يكتبه المستخدم
  const [confirm, setConfirm] = useState<{ open: boolean; tone: 'info' | 'warning' | 'danger'; title: string; message: string; confirmText: string; action?: () => void }>({ open: false, tone: 'info', title: '', message: '', confirmText: '' });

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await glossaryAiService.getJob(jobId!);
        if (res) {
          setJob(res);
          setLogs(Array.isArray(res.logs) ? [...res.logs].reverse() : []);
          if (res.novelMaxChapter) setNovelMaxChapter(res.novelMaxChapter);
          // مزامنة حقل الفاصل مع الخادم فقط إن لم يعدّله المستخدم الآن
          if (!savingDelay && !delayDirtyRef.current && res.chapterDelayMs !== undefined && res.chapterDelayMs !== null) {
            setDelayInput(String(res.chapterDelayMs / 1000));
          }
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
    ask('info', 'استئناف الاستخراج', 'استئناف المهمة؟', 'ابدأ', async () => {
      setConfirm((c) => ({ ...c, open: false }));
      try {
        await glossaryAiService.start({ jobId: job?._id || job?.id });
        toast.success('تم استئناف المهمة');
      } catch { toast.error('فشل الاستئناف'); }
    });

  const requestPause = () =>
    ask('warning', 'إيقاف مؤقت', 'هل تريد إيقاف الاستخراج مؤقتاً؟ (ستتوقف بعد انتهاء الفصل الحالي)', 'إيقاف', async () => {
      setConfirm((c) => ({ ...c, open: false }));
      try {
        await glossaryAiService.pauseJob(job?._id || job?.id);
        toast.success('تم إرسال طلب الإيقاف');
      } catch { toast.error('فشل الإيقاف'); }
    });

  const requestDelete = () =>
    ask('danger', 'حذف المهمة', 'هل أنت متأكد من حذف هذه المهمة نهائياً؟ (لا يؤثر على المصطلحات المحفوظة في المسرد)', 'حذف', async () => {
      setConfirm((c) => ({ ...c, open: false }));
      try {
        await glossaryAiService.deleteJob(job?._id || job?.id);
        toast.success('تم حذف المهمة');
        navigate('/dashboard/glossary-ai');
      } catch { toast.error('فشل الحذف'); }
    });

  // ⏱️ حفظ الفاصل الجديد — يسري من الفصل التالي مباشرة دون إيقاف المهمة
  const saveDelay = async () => {
    const delaySec = parseFloat(String(delayInput).replace(',', '.'));
    if (!Number.isFinite(delaySec) || delaySec < 0 || delaySec > 3600) {
      toast.error('أدخل عدد ثوانٍ بين 0 و 3600');
      return;
    }
    setSavingDelay(true);
    try {
      await glossaryAiService.updateDelay(job?._id || job?.id, delaySec);
      delayDirtyRef.current = false;
      toast.success(`تم تغيير الفاصل إلى ${delaySec} ثانية`);
    } catch {
      toast.error('فشل تغيير الفاصل');
    } finally {
      setSavingDelay(false);
    }
  };

  if (!job) {
    return (
      <div className="max-w-3xl mx-auto">
        <SubHead title="تحليلات المستخرج" onClose={() => navigate('/dashboard/glossary-ai')} />
        <div className="py-24 flex justify-center"><Spinner /></div>
      </div>
    );
  }

  const status = job.status;
  const pct = novelMaxChapter > 0 ? Math.min(100, ((job.currentChapter || 0) / novelMaxChapter) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto">
      <SubHead title="تحليلات المستخرج" onClose={() => navigate('/dashboard/glossary-ai')} />
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

      {/* شبكة التحليلات: فصول معالجة / مصطلحات */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Glass className="py-6 flex flex-col items-center">
          <p className="text-white text-2xl font-extrabold">{job.processedCount ?? 0}</p>
          <p className="text-white/40 text-xs mt-1.5">فصل معالج</p>
        </Glass>
        <Glass className="py-6 flex flex-col items-center border-green-500/40">
          <p className="text-green-400 text-2xl font-extrabold">{job.newTermsCount ?? 0}</p>
          <p className="text-white/40 text-xs mt-1.5">مصطلح في المسرد</p>
        </Glass>
      </div>

      {/* الإجراءات — نفس أزرار التطبيق */}
      <h3 className="text-white font-extrabold mb-3">إجراءات</h3>
      <div className="grid grid-cols-2 gap-3 mb-6">
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

      {/* ⏱️ الفاصل بين الفصول — تحكم حي بدون إيقاف المهمة */}
      <Glass className="p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-white font-extrabold text-sm">⏱️ الفاصل بين كل فصل (ثواني)</p>
            <p className="text-white/40 text-[11px] mt-1">يسري من الفصل التالي مباشرة — بدون إيقاف المهمة</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              className="w-20 bg-white/5 border border-white/15 rounded-lg px-2 py-2 text-white text-xs text-center outline-none focus:border-white/40"
              placeholder="3"
              inputMode="decimal"
              value={delayInput}
              onChange={(e) => { delayDirtyRef.current = true; setDelayInput(e.target.value); }}
            />
            <button
              onClick={saveDelay}
              disabled={savingDelay}
              className="bg-white text-black rounded-lg px-5 py-2 text-xs font-extrabold hover:bg-white/85 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {savingDelay && <Loader2 size={13} className="animate-spin" />}
              حفظ
            </button>
          </div>
        </div>
      </Glass>

      {/* الطرفية الحية */}
      <LiveTerminal logs={logs} minHeight={320} />
      <div className="h-6" />
    </div>
  );
}
