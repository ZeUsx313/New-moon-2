/**
 * صفحات المراجع الذكي — نقل حرفي لشاشات التطبيق (عائلة المترجم الذكي):
 *
 *  1) ReviewJobsPage        ← ReviewHubScreen            «المراجع الذكي / Zeus AI Reviewer»
 *  2) ReviewStartPage       ← ReviewNovelsSelectionScreen «اختيار الرواية» (جزآن + نطاق)
 *  3) ReviewJobDetailPage   ← ReviewJobDetailScreen       «تحليلات المراجعة» + الفصول المعلَّمة
 *  4) ReviewFindingsPage    ← ReviewFindingsScreen        «الفصول التي بها خلل» (اختيار رواية → فصولها)
 *
 * المراجع (الذكاء الاصطناعي) يفحص كل فصل ويحدد: إنجليزي / قصير جداً / فقرات مكررة / لغة مخربطة —
 * إن وُجد خلل يُعلَّم الفصل بنوعه، وإلا ينتقل للفصل التالي. نفس مزوّدات المترجم ونفس مفاتيحه.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Play, Pause, Trash2, ArrowRight, X, Search,
  CheckCircle2, Loader2, AlertTriangle, BookOpen, PlusCircle, Flag,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { reviewService, translatorService } from '../../services/translator';
import { ConfirmDialog, LiveTerminal } from './AiPages';
import { Spinner, PageHead } from './shared';

/* ═══════════════ عناصر مشتركة — نسخ مطابقة من AiPages (نفس لغة التطبيق) ═══════════════ */

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

/** خطاف قائمة الروايات (نفس نسخة AiPages لكن على /api/review/novels) */
function useReviewNovels() {
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
      const res = await reviewService.getNovels(searchOverride ?? searchRef.current, pageNum, 20);
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

/* أنواع الخلل — نفس الألوان/التسميات في التطبيق */
const TYPE_LABELS: Record<string, string> = {
  english: 'إنجليزي/غير مترجم',
  short: 'قصير جداً',
  repeated: 'فقرات مكررة',
  gibberish: 'لغة مخربطة',
};
const TYPE_CLS: Record<string, string> = {
  english: 'border-yellow-500/60 text-yellow-400',
  short: 'border-red-500/60 text-red-400',
  repeated: 'border-purple-500/60 text-purple-400',
  gibberish: 'border-cyan-500/60 text-cyan-400',
};

const TypeBadges = ({ types }: { types: string[] }) => (
  <span className="inline-flex flex-wrap gap-1.5">
    {(types || []).map((t, i) => (
      <span key={i} className={`text-[10px] font-bold border rounded-full px-2.5 py-0.5 ${TYPE_CLS[t] || 'border-white/30 text-white/70'}`}>
        {TYPE_LABELS[t] || t}
      </span>
    ))}
  </span>
);

/* ═══════════════ 1. المراجع الذكي — ReviewHubScreen ═══════════════ */
export function ReviewJobsPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { setJobs(await reviewService.getJobs()); }
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
      <PageHead title="المراجع الذكي" desc="Zeus AI Reviewer — فحص جودة الفصول المترجمة" />

      {/* زرا البدء — كما في التطبيق بالضبط */}
      <button className={bigBtn} onClick={() => navigate('/dashboard/review-start')}>
        <PlusCircle size={26} />
        بدء مراجعة جديدة
      </button>
      <button className={bigBtn + ' mb-8 mt-2.5'} onClick={() => navigate('/dashboard/review-findings')}>
        <Flag size={26} />
        الفصول التي بها خلل
      </button>

      <h2 className="text-white font-extrabold text-lg mb-4">المهام الحالية</h2>

      {loading ? (
        <div className="py-16 flex justify-center"><Spinner /></div>
      ) : jobs.length === 0 ? (
        <p className="text-white/40 text-center py-16">لا توجد مهام مراجعة حالياً.</p>
      ) : (
        <div className="flex flex-col gap-3.5 pb-8">
          {jobs.map((job) => {
            const done = (job.reviewed || 0) + (job.flagged || 0);
            const total = job.total || job.totalToReview || 0;
            const pct = total > 0 ? Math.min(100, (done / total) * 100) : 0;
            return (
              <Glass key={job.id || job._id} onClick={() => navigate(`/dashboard/review-jobs/${job.id || job._id}`)}>
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
                        labels={{ active: 'جاري الفحص', completed: 'مكتمل', paused: 'متوقف مؤقتاً', failed: 'متوقف/خطأ' }}
                      />
                    </div>
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mb-1.5">
                      <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-white/40 text-[11px]">
                      {done} / {total} فصل{job.flagged ? ` — 🚩 ${job.flagged} به خلل` : ''}
                    </p>
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

/* ═══════════════ 2. اختيار الرواية — ReviewNovelsSelectionScreen ═══════════════ */
export function ReviewStartPage() {
  const navigate = useNavigate();
  const { novels, loading, loadingMore, hasMore, search, setSearch, loadMore } = useReviewNovels();

  const [selectedNovel, setSelectedNovel] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [selectionMode, setSelectionMode] = useState<'all' | 'manual'>('all');
  const [selectedChapters, setSelectedChapters] = useState<number[]>([]);
  const [rangeInput, setRangeInput] = useState('');
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

  const confirmReview = () => {
    if (!selectedNovel) return;
    if (selectionMode === 'manual' && selectedChapters.length === 0) {
      toast.error('الرجاء تحديد فصل واحد على الأقل');
      return;
    }
    const count = selectionMode === 'manual' ? String(selectedChapters.length) : (chapters.length ? String(chapters.length) : 'الكل');
    setConfirm({
      open: true,
      message: `هل أنت متأكد من بدء مراجعة "${selectedNovel.title}"؟\nعدد الفصول: ${count}`,
    });
  };

  const startReview = async () => {
    setConfirm({ open: false, message: '' });
    setStarting(true);
    try {
      await reviewService.start({
        novelId: selectedNovel._id,
        chapters: selectionMode === 'manual' ? selectedChapters : 'all',
      });
      toast.success('تم بدء المراجعة');
      navigate('/dashboard/review-jobs');
    } catch {
      toast.error('فشل بدء المراجعة');
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <SubHead title="اختيار الرواية" onClose={() => navigate('/dashboard/review-jobs')} />
      <ConfirmDialog
        open={confirm.open}
        title="تأكيد المراجعة"
        message={confirm.message}
        confirmText="ابدأ الآن"
        onCancel={() => setConfirm({ open: false, message: '' })}
        onConfirm={startReview}
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
                onClick={confirmReview}
                disabled={starting}
                className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[0.07] hover:bg-white/[0.14] py-3.5 text-white font-extrabold transition-colors disabled:opacity-50"
              >
                {starting ? <Spinner /> : <Play size={17} />}
                ابدأ المراجعة
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

/* ═══════════════ 3. تحليلات المراجعة — ReviewJobDetailScreen ═══════════════ */
export function ReviewJobDetailPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [novelMaxChapter, setNovelMaxChapter] = useState(0);
  const [confirm, setConfirm] = useState<{ open: boolean; tone: 'info' | 'warning' | 'danger'; title: string; message: string; confirmText: string; action?: () => void }>({ open: false, tone: 'info', title: '', message: '', confirmText: '' });

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await reviewService.getJob(jobId!);
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
    ask('info', 'استئناف المراجعة', 'استئناف المهمة؟', 'ابدأ', async () => {
      setConfirm((c) => ({ ...c, open: false }));
      try {
        await reviewService.start({ jobId: job?._id || job?.id });
        toast.success('تم استئناف المهمة');
      } catch { toast.error('فشل الاستئناف'); }
    });

  const requestPause = () =>
    ask('warning', 'إيقاف مؤقت', 'هل تريد إيقاف المراجعة مؤقتاً؟ (ستتوقف بعد انتهاء الفصل الحالي)', 'إيقاف', async () => {
      setConfirm((c) => ({ ...c, open: false }));
      try {
        await reviewService.pauseJob(job?._id || job?.id);
        toast.success('تم إرسال طلب الإيقاف');
      } catch { toast.error('فشل الإيقاف'); }
    });

  const requestDelete = () =>
    ask('danger', 'حذف المهمة', 'هل أنت متأكد من حذف هذه المهمة نهائياً؟ (لا يؤثر على الفصول المعلَّمة المحفوظة)', 'حذف', async () => {
      setConfirm((c) => ({ ...c, open: false }));
      try {
        await reviewService.deleteJob(job?._id || job?.id);
        toast.success('تم حذف المهمة');
        navigate('/dashboard/review-jobs');
      } catch { toast.error('فشل الحذف'); }
    });

  if (!job) {
    return (
      <div className="max-w-3xl mx-auto">
        <SubHead title="تحليلات المراجعة" onClose={() => navigate('/dashboard/review-jobs')} />
        <div className="py-24 flex justify-center"><Spinner /></div>
      </div>
    );
  }

  const status = job.status;
  const pct = novelMaxChapter > 0 ? Math.min(100, ((job.currentChapter || 0) / novelMaxChapter) * 100) : 0;
  const findings = (job.findings || []).slice().sort((a: any, b: any) => a.chapter - b.chapter);

  return (
    <div className="max-w-3xl mx-auto">
      <SubHead title="تحليلات المراجعة" onClose={() => navigate('/dashboard/review-jobs')} />
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

      {/* شبكة التحليلات: تمت مراجعته / به خلل */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Glass className="py-6 flex flex-col items-center">
          <p className="text-white text-2xl font-extrabold">{job.reviewedCount ?? 0}</p>
          <p className="text-white/40 text-xs mt-1.5">تمت مراجعته (سليم)</p>
        </Glass>
        <Glass className="py-6 flex flex-col items-center border-red-500/40">
          <p className="text-red-400 text-2xl font-extrabold">{job.flaggedCount ?? 0}</p>
          <p className="text-white/40 text-xs mt-1.5">فصول بها خلل</p>
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

      {/* 🚩 الفصول المعلَّمة */}
      {findings.length > 0 && (
        <>
          <h3 className="text-white font-extrabold mb-2">🚩 الفصول التي بها خلل ({findings.length})</h3>
          <p className="text-white/40 text-[11px] mb-3 leading-relaxed">
            احذف هذه الفصول يدوياً ثم أعد استيرادها بالسكرابر وأعد ترجمتها — ثم أزل العلامة من قسم «الفصول التي بها خلل».
          </p>
          <div className="flex flex-col gap-2.5 mb-6">
            {findings.map((f: any, i: number) => (
              <div key={`${f.chapter}-${i}`} className="bg-red-500/[0.06] border border-red-500/25 rounded-xl p-3.5">
                <p className="text-white font-bold text-[13px] mb-2">
                  الفصل #{f.chapter} {f.title ? `— ${f.title}` : ''}
                </p>
                <TypeBadges types={f.types || []} />
                {f.details ? <p className="text-white/50 text-[11px] mt-2 leading-relaxed">{f.details}</p> : null}
              </div>
            ))}
          </div>
        </>
      )}

      {/* الطرفية الحية */}
      <LiveTerminal logs={logs} minHeight={320} />
      <div className="h-6" />
    </div>
  );
}

/* ═══════════════ 4. الفصول التي بها خلل — ReviewFindingsScreen ═══════════════ */
export function ReviewFindingsPage() {
  const navigate = useNavigate();
  const [novels, setNovels] = useState<any[]>([]);
  const [selectedNovel, setSelectedNovel] = useState<any>(null);
  const [findings, setFindings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [findingsLoading, setFindingsLoading] = useState(false);
  const [reReviewing, setReReviewing] = useState(false);
  const [confirm, setConfirm] = useState<{ open: boolean; title: string; message: string; confirmText: string; action?: () => void }>({ open: false, title: '', message: '', confirmText: '' });

  const loadNovels = useCallback(async () => {
    try { setNovels(await reviewService.getFindings()); }
    catch { /* صامت */ }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { loadNovels(); }, [loadNovels]);

  const loadFindings = async (novelId: string) => {
    setFindingsLoading(true);
    try { setFindings(await reviewService.getFindings(novelId)); }
    catch { toast.error('فشل جلب الفصول المعلَّمة'); }
    finally { setFindingsLoading(false); }
  };

  const ask = (title: string, message: string, confirmText: string, action: () => void) =>
    setConfirm({ open: true, title, message, confirmText, action });

  const removeFinding = (f: any) =>
    ask('إزالة العلامة', `إزالة العلامة عن الفصل #${f.chapter}؟\nاستخدم هذا بعد حذف الفصل وإعادة استيراده بالسكرابر وإعادة ترجمته.`, 'إزالة', async () => {
      setConfirm((c) => ({ ...c, open: false }));
      try {
        await reviewService.removeFinding(f._id);
        toast.success('تمت إزالة العلامة');
        loadFindings(selectedNovel.novelId);
        loadNovels();
      } catch { toast.error('فشل إزالة العلامة'); }
    });

  const reReview = () =>
    ask('إعادة المراجعة', `إعادة فحص كل الفصول المعلَّمة لـ"${selectedNovel?.novelTitle}" (${findings.length} فصلاً)؟`, 'ابدأ', async () => {
      setConfirm((c) => ({ ...c, open: false }));
      setReReviewing(true);
      try {
        await reviewService.reReviewFlagged(selectedNovel.novelId);
        toast.success('بدأت إعادة المراجعة');
        navigate('/dashboard/review-jobs');
      } catch { toast.error('فشل بدء إعادة المراجعة'); }
      finally { setReReviewing(false); }
    });

  return (
    <div className="max-w-3xl mx-auto">
      <SubHead title="الفصول التي بها خلل" onClose={() => navigate('/dashboard/review-jobs')} />
      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        confirmText={confirm.confirmText}
        tone="warning"
        onCancel={() => setConfirm((c) => ({ ...c, open: false }))}
        onConfirm={() => confirm.action?.()}
      />

      {!selectedNovel ? (
        // المرحلة 1: اختيار الرواية من بين الروايات التي بها فصول معلَّمة
        loading ? (
          <div className="py-16 flex justify-center"><Spinner /></div>
        ) : novels.length === 0 ? (
          <p className="text-white/40 text-center py-16">🎉 لا توجد فصول معلَّمة حالياً — كل الروايات سليمة.</p>
        ) : (
          <div className="flex flex-col gap-3 pb-8">
            {novels.map((n) => (
              <Glass key={String(n.novelId)} onClick={() => { setSelectedNovel(n); loadFindings(n.novelId); }}>
                <div className="flex items-center gap-4 p-4">
                  <img
                    src={n.cover}
                    alt=""
                    className="w-[60px] h-20 rounded-lg object-cover bg-white/5 shrink-0"
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.15'; }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-extrabold text-[15px] truncate">{n.novelTitle}</p>
                    <p className="text-yellow-400 text-xs mt-1.5">🚩 {n.count} فصلاً بها خلل</p>
                  </div>
                  <ArrowRight size={18} className="text-white/25 rotate-180 shrink-0" />
                </div>
              </Glass>
            ))}
          </div>
        )
      ) : (
        // المرحلة 2: فصول الرواية المعلَّمة
        <>
          <div className="flex items-center gap-2.5 mb-4">
            <button
              onClick={() => { setSelectedNovel(null); setFindings([]); }}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              aria-label="رجوع للروايات"
            >
              <ArrowRight size={18} />
            </button>
            <h2 className="text-white font-extrabold text-base truncate flex-1">{selectedNovel.novelTitle}</h2>
          </div>

          {findingsLoading ? (
            <div className="py-16 flex justify-center"><Spinner /></div>
          ) : findings.length === 0 ? (
            <p className="text-white/40 text-center py-16">لا فصول معلَّمة — اضغط رجوع للتحديث.</p>
          ) : (
            <div className="flex flex-col gap-2.5 pb-24">
              {findings.map((f) => (
                <div key={f._id} className="bg-red-500/[0.06] border border-red-500/30 rounded-xl p-3.5">
                  <p className="text-white font-bold text-[13px] mb-2">
                    الفصل #{f.chapter} {f.chapterTitle ? `— ${f.chapterTitle}` : ''}
                  </p>
                  <TypeBadges types={f.types || []} />
                  {f.details ? <p className="text-white/50 text-[11px] mt-2 leading-relaxed">{f.details}</p> : null}
                  <button
                    onClick={() => removeFinding(f)}
                    className="mt-3 inline-flex items-center gap-1.5 text-green-400 hover:text-green-300 text-xs font-bold transition-colors"
                  >
                    <CheckCircle2 size={15} />
                    إزالة العلامة (تمت معالجته)
                  </button>
                </div>
              ))}
            </div>
          )}

          {findings.length > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[min(92vw,480px)] z-[90]">
              <button
                onClick={reReview}
                disabled={reReviewing}
                className="w-full flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-[#111]/95 backdrop-blur hover:bg-white/[0.12] py-4 text-white font-extrabold transition-colors disabled:opacity-50 shadow-2xl"
              >
                {reReviewing ? <Spinner /> : <Play size={17} />}
                إعادة مراجعة الفصول المعلَّمة
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
