/**
 * عائلة «مولد عناوين الفصول» + «إصلاح عناوين الفصول» — منقولة من شاشات التطبيق
 * (TitleGeneratorHubScreen / TitleGeneratorSelectionScreen / TitleGeneratorSettingsScreen /
 *  TitleGeneratorDetailScreen / ChapterTitleFixerScreen / ChapterTitleFixerSelectionScreen)
 * كواجهات منفصلة كاملة مطابقة للبنية والوظيفة، بهوية الموقع الأسود/الأبيض.
 *
 * المسارات المتوقعة (تُربَط في App.tsx):
 *  /dashboard/title-generator             → TitleGenHubPage
 *  /dashboard/title-generator/start       → TitleGenStartPage
 *  /dashboard/title-generator/settings    → TitleGenSettingsPage
 *  /dashboard/title-generator/jobs/:jobId → TitleGenDetailPage
 *  /dashboard/title-fixer                 → TitleFixerSelectPage
 *  /dashboard/title-fixer/jobs/:jobId     → TitleFixerDetailPage
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight, Check, ChevronLeft, Info, Library, Loader2, Pause, Play, Plus,
  RefreshCcw, Rocket, RotateCcw, Save, Search, Settings, Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { translatorService } from '../../services/translator';
import { useDebounce } from '../../hooks/useDebounce';
import {
  inputCls, btnPrimary, btnGhost, Spinner, PageHead, Modal,
} from './shared';

const HUB_POLL_MS = 5000; // الهَب: تحديث كل 5 ثوانٍ (كالتطبيق)
const DETAIL_POLL_MS = 3000; // شاشات المهام: تحديث كل 3 ثوانٍ (كالتطبيق)
const NOVELS_PAGE_SIZE = 20;
const CHAPTERS_CHUNK = 150; // بديل الـ virtualization (FlatList) لقوائم الفصول الضخمة

/* ═══════════ عناصر مشتركة صغيرة ═══════════ */

function Dot({ cls }: { cls: string }) {
  return <span className={`w-2 h-2 rounded-full shrink-0 ${cls}`} aria-hidden />;
}

/** شارة الحالة الصلبة في شاشات التفاصيل (كالطبائع في التطبيق: نشط أبيض/متوقف كهرماني/...) */
const BADGE_STYLES: Record<string, { label: string; cls: string }> = {
  active: { label: 'نشط', cls: 'bg-white text-black' },
  paused: { label: 'متوقف مؤقتاً', cls: 'bg-amber-400 text-black' },
  completed: { label: 'مكتمل', cls: 'bg-white/15 text-white' },
};

function StatusBadge({ status }: { status?: string }) {
  const s = BADGE_STYLES[status || ''] || { label: 'فشل/توقف', cls: 'bg-white/10 text-white/70' };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold shrink-0 ${s.cls}`}>
      {status === 'active' && <Loader2 size={11} className="animate-spin" aria-hidden />}
      {s.label}
    </span>
  );
}

/* ألوان سجل التنفيذ: error=أحمر / success=أخضر / warning=كهرماني (كالتطبيق) */
function logTone(type?: string): string {
  if (type === 'error') return 'text-red-400';
  if (type === 'success') return 'text-green-400';
  if (type === 'warning') return 'text-amber-400';
  return 'text-white/70';
}

/** Live Terminal — السجلات الحية بألوانها وأوقاتها (الأحدث أولاً كما في التطبيق) */
function JobTerminal({ logs, live }: { logs: any[]; live?: boolean }) {
  const items = (logs || []).slice().reverse();
  return (
    <div className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden mt-5">
      <div className="px-4 py-2.5 border-b border-white/10 flex items-center justify-between">
        <h3 className="text-white/50 text-xs font-bold tracking-widest">Live Terminal</h3>
        {live && <span className="text-[10px] text-green-400 font-bold animate-pulse">● مباشر</span>}
      </div>
      <div className="max-h-[55vh] overflow-y-auto p-4 space-y-2">
        {items.length === 0 ? (
          <p className="py-8 text-center text-white/40 text-xs">لا سجلات بعد</p>
        ) : (
          items.map((l: any, i: number) => {
            const isObj = l && typeof l === 'object';
            const text = isObj ? l?.message ?? '' : String(l);
            const time = isObj ? l?.timestamp || l?.time : null;
            return (
              <div key={(isObj && l?._id) || i} className="flex items-start gap-3">
                <span className="text-white/30 text-[10px] font-mono shrink-0 mt-0.5" dir="ltr">
                  {time ? new Date(time).toLocaleTimeString('ar-EG') : '—'}
                </span>
                <span className={`flex-1 text-[11px] font-mono leading-relaxed break-words ${logTone(isObj ? l?.type : undefined)}`} dir="auto">
                  {text}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ═══════════ نافذة تأكيد (بديل CustomAlert في التطبيق) ═══════════ */

interface ConfirmConfig {
  title: string;
  message: string;
  confirmText: string;
  tone?: 'info' | 'warning' | 'danger';
  onConfirm: () => void | Promise<void>;
}

function ConfirmDialog({ config, onClose }: { config: ConfirmConfig; onClose: () => void }) {
  const cls = config.tone === 'danger'
    ? 'bg-red-500/15 text-red-300 border border-red-400/40 hover:bg-red-500/25'
    : config.tone === 'warning'
      ? 'bg-amber-400/15 text-amber-300 border border-amber-400/40 hover:bg-amber-400/25'
      : btnPrimary;
  return (
    <Modal title={config.title} onClose={onClose}>
      <p className="text-white/70 text-sm leading-relaxed whitespace-pre-line mb-5">{config.message}</p>
      <div className="flex gap-2">
        <button onClick={onClose} className={btnGhost + ' flex-1'}>إلغاء</button>
        {/* النمط في التطبيق: تُغلق النافذة ثم يُنفَّذ الإجراء والـ toast يخبر بالنتيجة */}
        <button
          onClick={() => { onClose(); void config.onConfirm(); }}
          className={cls + ' flex-1 font-bold rounded-lg px-4 py-2.5 text-sm transition-colors flex items-center justify-center gap-2'}
        >
          {config.confirmText}
        </button>
      </div>
    </Modal>
  );
}

/* ═══════════ لوحة قائمة الروايات (بحث خادمي debounced 500ms + ترقيم) ═══════════ */

function useNovelList() {
  const [novels, setNovels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 500);

  const fetchNovels = useCallback(async (pageNum: number, term: string) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const res = await translatorService.getTranslatorNovels(term, pageNum, NOVELS_PAGE_SIZE);
      setNovels((prev) => (pageNum === 1 ? res : [...prev, ...res]));
      setHasMore(res.length === NOVELS_PAGE_SIZE);
      setPage(pageNum);
    } catch {
      toast.error('فشل جلب الروايات');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { fetchNovels(1, debounced); }, [debounced, fetchNovels]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) fetchNovels(page + 1, debounced);
  }, [loadingMore, hasMore, page, debounced, fetchNovels]);

  return { novels, loading, loadingMore, hasMore, search, setSearch, loadMore };
}

function NovelListItem({ n, active, onPick }: { n: any; active: boolean; onPick: () => void }) {
  return (
    <button
      onClick={onPick}
      aria-pressed={active}
      className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-right transition-all ${
        active ? 'border-white bg-white/10' : 'border-white/10 bg-white/5 hover:border-white/30'
      }`}
    >
      <img
        src={n.cover}
        alt=""
        loading="lazy"
        className="w-9 h-[52px] rounded-md object-cover bg-black/40 shrink-0"
        onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.15'; }}
      />
      <span className="flex-1 min-w-0">
        <span className="block text-white text-xs font-bold line-clamp-2 leading-snug">{n.title}</span>
        <span className="block text-white/40 text-[10px] mt-0.5">{n.chaptersCount || 0} فصل</span>
      </span>
      {active && <Check size={18} className="text-white shrink-0" aria-hidden />}
    </button>
  );
}

function NovelListPane({ activeId, onPick, ariaLabel }: { activeId?: string; onPick: (n: any) => void; ariaLabel: string }) {
  const { novels, loading, loadingMore, hasMore, search, setSearch, loadMore } = useNovelList();
  return (
    <section aria-label={ariaLabel} className="bg-white/5 border border-white/10 rounded-2xl p-3">
      <div className="relative mb-3">
        <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30" aria-hidden />
        <input
          className={inputCls + ' pr-9 text-xs'}
          placeholder="بحث في السيرفر..."
          aria-label="بحث في الروايات"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {loading ? (
        <div className="py-16 flex justify-center"><Spinner /></div>
      ) : novels.length === 0 ? (
        <p className="py-16 text-center text-white/40 text-sm">لا توجد نتائج</p>
      ) : (
        <div className="space-y-2 max-h-[62vh] overflow-y-auto pl-1">
          {novels.map((n) => (
            <NovelListItem key={n._id} n={n} active={activeId === n._id} onPick={() => onPick(n)} />
          ))}
          {hasMore && (
            <button onClick={loadMore} disabled={loadingMore} className={btnGhost + ' w-full text-xs'}>
              {loadingMore ? <Spinner /> : null} تحميل المزيد
            </button>
          )}
        </div>
      )}
    </section>
  );
}

/* مبدّل الوضع: الكل / تحديد (كالتطبيق) */
function ModeSwitch({ mode, onChange }: { mode: 'all' | 'manual'; onChange: (m: 'all' | 'manual') => void }) {
  const base = 'flex-1 py-2 rounded-md text-[11px] font-extrabold transition-colors';
  return (
    <div className="grid grid-cols-2 gap-1 bg-black/40 border border-white/10 rounded-lg p-1 mb-3" role="tablist" aria-label="نطاق الفصول">
      <button role="tab" aria-selected={mode === 'all'} onClick={() => onChange('all')} className={mode === 'all' ? base + ' bg-white/15 text-white' : base + ' text-white/40 hover:text-white/70'}>
        الكل
      </button>
      <button role="tab" aria-selected={mode === 'manual'} onClick={() => onChange('manual')} className={mode === 'manual' ? base + ' bg-white/15 text-white' : base + ' text-white/40 hover:text-white/70'}>
        تحديد
      </button>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   1) الهَب — مكافئ TitleGeneratorHubScreen
   ════════════════════════════════════════════════════════════════════ */
export function TitleGenHubPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchJobs = useCallback(async () => {
    try { setJobs(await translatorService.getTitleGenJobs()); }
    catch { /* صامت كالتطبيق */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchJobs();
    const t = setInterval(fetchJobs, HUB_POLL_MS);
    return () => clearInterval(t);
  }, [fetchJobs]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchJobs();
    setRefreshing(false);
  };

  return (
    <div>
      <PageHead title="مولد العناوين الذكي" desc="Gemini 2.5 Flash — توليد عناوين فصول بالذكاء الاصطناعي">
        <button onClick={() => navigate('/dashboard/title-generator/settings')} className={btnGhost} aria-label="إعدادات مولد العناوين">
          <Settings size={15} /> الإعدادات
        </button>
        <button onClick={onRefresh} disabled={refreshing} className={btnGhost} aria-label="تحديث القائمة">
          <RefreshCcw size={15} className={refreshing ? 'animate-spin' : ''} /> تحديث
        </button>
      </PageHead>

      {/* الزر الكبير — مكافئ newTranslationBtn */}
      <button
        onClick={() => navigate('/dashboard/title-generator/start')}
        className="w-full bg-primary text-primary-foreground font-extrabold rounded-2xl py-4 flex items-center justify-center gap-2.5 hover:opacity-90 transition-opacity mb-7"
      >
        <Plus size={22} aria-hidden /> بدء توليد عناوين
      </button>

      <h2 className="text-white font-bold text-base mb-4">المهام الحالية</h2>

      {loading ? (
        <div className="py-16 flex justify-center"><Spinner /></div>
      ) : jobs.length === 0 ? (
        <p className="py-16 text-center text-white/40 text-sm">لا توجد مهام نشطة حالياً.</p>
      ) : (
        <div className="space-y-3 max-w-3xl">
          {jobs.map((j) => {
            const id = j.id || j._id;
            const done = j.processed ?? j.processedCount ?? 0;
            const total = j.total ?? j.totalToProcess ?? 0;
            const pct = Math.min(100, Math.round((done / (total || 1)) * 100));
            const st = j.status === 'active'
              ? { label: 'جاري المعالجة', dot: 'bg-white animate-pulse' }
              : j.status === 'completed'
                ? { label: 'مكتمل', dot: 'bg-white/50' }
                : { label: 'متوقف/خطأ', dot: 'bg-white/25' };
            return (
              <button
                key={id}
                onClick={() => navigate(`/dashboard/title-generator/jobs/${id}`)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4 text-right hover:border-white/30 hover:bg-white/10 transition-all"
              >
                <img
                  src={j.cover}
                  alt=""
                  loading="lazy"
                  className="w-[52px] h-[72px] rounded-lg object-cover bg-black/40 shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.15'; }}
                />
                <span className="flex-1 min-w-0">
                  <span className="block text-white font-bold text-sm truncate">{j.novelTitle}</span>
                  <span className="flex items-center gap-2 mt-1.5">
                    <Dot cls={st.dot} />
                    <span className="text-white/50 text-[11px]">{st.label}</span>
                  </span>
                  <span className="block h-1.5 bg-white/10 rounded-full overflow-hidden mt-2">
                    <span className="block h-full bg-white rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="block text-white/40 text-[10px] mt-1">{done} / {total} فصل</span>
                </span>
                <ChevronLeft size={18} className="text-white/30 shrink-0" aria-hidden />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   2) بدء مهمة — مكافئ TitleGeneratorSelectionScreen (تخطيط جزأين + نطاق 25-100 و 150-!)
   ════════════════════════════════════════════════════════════════════ */
export function TitleGenStartPage() {
  const navigate = useNavigate();
  const [selectedNovel, setSelectedNovel] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [mode, setMode] = useState<'all' | 'manual'>('all');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [rangeInput, setRangeInput] = useState('');
  const [visibleCount, setVisibleCount] = useState(CHAPTERS_CHUNK);
  const [starting, setStarting] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmConfig | null>(null);

  const fetchChapters = async (novelId: string) => {
    setChaptersLoading(true);
    setChapters([]);
    try {
      setChapters(await translatorService.getNovelChaptersList(novelId));
    } catch {
      toast.error('فشل جلب الفصول');
    } finally {
      setChaptersLoading(false);
    }
  };

  const handleSelectNovel = (novel: any) => {
    setSelectedNovel(novel);
    setSelected(new Set());
    setRangeInput('');
    setMode('all');
    setVisibleCount(CHAPTERS_CHUNK);
    fetchChapters(novel._id);
  };

  const toggleChapter = (num: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(num)) next.delete(num);
      else next.add(num);
      return next;
    });
  };

  /* نطاق يفهم: 25-100 (مدى) و 150-! (من 150 إلى آخر فصل) ورقماً مفرداً — كالتطبيق */
  const applyRange = () => {
    if (!rangeInput.trim()) { toast.error('يرجى إدخال نطاق'); return; }
    const input = rangeInput.trim();
    const availableNumbers = chapters.map((c: any) => Number(c.number)).filter((n) => Number.isFinite(n));
    const availableSet = new Set(availableNumbers);
    const maxChap = availableNumbers.reduce((m, n) => (n > m ? n : m), 0);
    const picked: number[] = [];

    if (input.includes('-!')) {
      const start = parseInt(input.split('-!')[0], 10);
      if (!Number.isNaN(start)) {
        for (let i = start; i <= maxChap; i++) if (availableSet.has(i)) picked.push(i);
      }
    } else if (input.includes('-')) {
      const parts = input.split('-');
      const start = parseInt(parts[0], 10);
      const end = parseInt(parts[1], 10);
      if (!Number.isNaN(start) && !Number.isNaN(end)) {
        for (let i = start; i <= end; i++) if (availableSet.has(i)) picked.push(i);
      }
    } else {
      const num = parseInt(input, 10);
      if (!Number.isNaN(num) && availableSet.has(num)) picked.push(num);
    }

    if (picked.length === 0) {
      toast('لم يتم العثور على فصول', { icon: '⚠️' });
    } else {
      setSelected(new Set(picked));
      toast.success(`تم تحديد ${picked.length} فصل`);
    }
  };

  const confirmJob = () => {
    if (!selectedNovel) return;
    if (mode === 'manual' && selected.size === 0) {
      toast.error('الرجاء تحديد فصل واحد على الأقل');
      return;
    }
    const count = mode === 'manual' ? selected.size : (chapters.length || 'الكل');
    setConfirm({
      title: 'بدء التوليد',
      message: `هل أنت متأكد من توليد عناوين لـ«${selectedNovel.title}»؟\nسيتم استبدال العناوين الحالية.\nعدد الفصول: ${count}`,
      confirmText: 'ابدأ الآن',
      tone: 'info',
      onConfirm: startJob,
    });
  };

  const startJob = async () => {
    if (!selectedNovel) return;
    setStarting(true);
    try {
      await translatorService.startTitleGen({
        novelId: selectedNovel._id,
        chapters: mode === 'manual' ? Array.from(selected).sort((a, b) => a - b) : 'all',
      });
      toast.success('تم بدء المهمة');
      navigate('/dashboard/title-generator');
    } catch (e: any) {
      toast.error(e?.message || 'فشل بدء المهمة');
    } finally {
      setStarting(false);
    }
  };

  const visibleChapters = useMemo(() => chapters.slice(0, visibleCount), [chapters, visibleCount]);

  return (
    <div>
      <PageHead title="اختيار الرواية (للعناوين)" desc="اختر رواية ثم حدّد الفصول — سيتم استبدال العناوين الحالية بعناوين مولّدة">
        <button onClick={() => navigate('/dashboard/title-generator')} className={btnGhost}>
          <ArrowRight size={15} /> رجوع
        </button>
      </PageHead>

      <div className="grid lg:grid-cols-[45fr_55fr] gap-4 items-start">
        {/* اليمين: قائمة الروايات (بحث + ترقيم) */}
        <NovelListPane ariaLabel="قائمة الروايات" activeId={selectedNovel?._id} onPick={handleSelectNovel} />

        {/* اليسار: إعداد الرواية المختارة */}
        <section aria-label="إعداد المهمة" className="bg-white/5 border border-white/10 rounded-2xl p-4 min-h-[420px] flex flex-col">
          {selectedNovel ? (
            <>
              <h2 className="text-white font-bold text-sm text-center mb-4 truncate">{selectedNovel.title}</h2>
              <ModeSwitch mode={mode} onChange={setMode} />

              {mode === 'manual' && (
                <div className="flex flex-col flex-1 min-h-0">
                  <div className="flex gap-2 mb-2">
                    <input
                      className={inputCls + ' text-center font-mono'}
                      dir="ltr"
                      placeholder="25-100"
                      value={rangeInput}
                      onChange={(e) => setRangeInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') applyRange(); }}
                      aria-label="نطاق الفصول (مثال: 25-100 أو 150-!)"
                    />
                    <button onClick={applyRange} className={btnGhost + ' shrink-0 px-5 text-xs font-extrabold'}>ok</button>
                  </div>
                  {chaptersLoading ? (
                    <div className="py-10 flex justify-center"><Spinner /></div>
                  ) : chapters.length === 0 ? (
                    <p className="py-10 text-center text-white/40 text-xs">لا توجد فصول</p>
                  ) : (
                    <div className="max-h-[46vh] overflow-y-auto rounded-xl border border-white/10 bg-black/20 divide-y divide-white/5">
                      {visibleChapters.map((ch: any) => {
                        const num = Number(ch.number);
                        const active = selected.has(num);
                        return (
                          <button
                            key={ch.number}
                            onClick={() => toggleChapter(num)}
                            aria-pressed={active}
                            className={`w-full text-right px-3 py-2 text-xs transition-colors ${active ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5'}`}
                          >
                            #{ch.number} - {ch.title || ''}
                          </button>
                        );
                      })}
                      {visibleCount < chapters.length && (
                        <button
                          onClick={() => setVisibleCount((v) => v + CHAPTERS_CHUNK)}
                          className="w-full py-2.5 text-center text-white/60 text-[11px] font-bold hover:bg-white/5 transition-colors"
                        >
                          عرض المزيد ({chapters.length - visibleCount} متبقية)
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-auto pt-4">
                <button onClick={confirmJob} disabled={starting} className={btnPrimary + ' w-full py-3.5 rounded-xl'}>
                  {starting ? <Spinner /> : <Play size={16} aria-hidden />} توليد العناوين
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
              <ArrowRight size={40} className="text-white/15 mb-3" aria-hidden />
              <p className="text-white/40 text-sm">اختر رواية</p>
            </div>
          )}
        </section>
      </div>

      {confirm && <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   3) الإعدادات — مكافئ TitleGeneratorSettingsScreen (برومبت + مفاتيح)
   ════════════════════════════════════════════════════════════════════ */
export function TitleGenSettingsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [apiKeysText, setApiKeysText] = useState('');
  const [savedKeysCount, setSavedKeysCount] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const s = await translatorService.getTitleGenSettings();
        if (!alive) return;
        const keys: string[] = s?.apiKeys || [];
        setPrompt(s?.prompt || '');
        setApiKeysText(keys.join('\n'));
        setSavedKeysCount(keys.length);
      } catch {
        toast.error('فشل جلب الإعدادات');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const processedKeys = apiKeysText.split('\n').map((k) => k.trim()).filter((k) => k.length > 5);
      await translatorService.saveTitleGenSettings({ prompt, apiKeys: processedKeys });
      setSavedKeysCount(processedKeys.length);
      toast.success(`تم الحفظ بنجاح (${processedKeys.length} مفتاح)`);
      navigate('/dashboard/title-generator');
    } catch (e: any) {
      toast.error(e?.message || 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-24 flex justify-center"><Spinner /></div>;

  return (
    <div className="max-w-3xl">
      <PageHead title="إعدادات مولد العناوين" desc="برومبت التوليد ومفاتيح Gemini Flash">
        <button onClick={() => navigate('/dashboard/title-generator')} className={btnGhost}>
          <ArrowRight size={15} /> رجوع
        </button>
      </PageHead>

      {/* بطاقة المعلومة — كما في التطبيق */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4 flex items-start gap-3">
        <Info size={18} className="text-white/60 shrink-0 mt-0.5" aria-hidden />
        <p className="text-white/60 text-xs leading-relaxed">
          يستخدم هذا النظام مفاتيح Gemini Flash. إذا لم تقم بإضافة مفاتيح هنا، سيحاول استخدام مفاتيح المترجم.
        </p>
      </div>

      {/* المفاتيح */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
        <h2 className="text-white font-bold text-sm mb-1">مفاتيح API (منفصلة)</h2>
        <p className="text-white/40 text-xs mb-1">ضع كل مفتاح في سطر منفصل.</p>
        <p className="text-white text-xs font-bold mb-3">الحالة: {savedKeysCount} مفتاح محفوظ.</p>
        <textarea
          className={inputCls + ' font-mono text-xs h-[150px] resize-y'}
          dir="ltr"
          placeholder={'AIzaSy...\nAIzaSy...'}
          value={apiKeysText}
          onChange={(e) => setApiKeysText(e.target.value)}
          aria-label="مفاتيح API"
        />
      </div>

      {/* البرومبت */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-5">
        <h2 className="text-white font-bold text-sm mb-1">البرومبت (Prompt)</h2>
        <p className="text-white/40 text-xs mb-3">التعليمات التي ترسل للذكاء الاصطناعي لتوليد العنوان.</p>
        <textarea
          className={inputCls + ' min-h-[200px] leading-relaxed'}
          dir="auto"
          placeholder="Read the chapter content..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          aria-label="برومبت توليد العناوين"
        />
      </div>

      <button onClick={handleSave} disabled={saving} className={btnPrimary + ' w-full py-3.5 rounded-2xl'}>
        {saving ? <Spinner /> : <Save size={16} aria-hidden />} حفظ الإعدادات
      </button>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   4) تفاصيل مهمة توليد — مكافئ TitleGeneratorDetailScreen (polling 3s + إجراءات + Live Terminal)
   ════════════════════════════════════════════════════════════════════ */
export function TitleGenDetailPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmConfig | null>(null);

  const load = useCallback(async () => {
    if (!jobId) return;
    try { setJob(await translatorService.getTitleGenJob(jobId)); }
    catch { /* كالتطبيق: تُتجاهل أخطاء التحديث الحي */ }
    finally { setLoading(false); }
  }, [jobId]);

  useEffect(() => {
    load();
    const t = setInterval(load, DETAIL_POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  const id = job?._id || job?.id || jobId || '';

  const performResume = async () => {
    try {
      await translatorService.startTitleGen({ jobId: id });
      toast.success('تم استئناف المهمة');
    } catch (e: any) { toast.error(e?.message || 'فشل الاستئناف'); }
  };

  const performPause = async () => {
    try {
      await translatorService.pauseTitleGen(id);
      toast('تم إرسال طلب الإيقاف', { icon: '⏸' });
    } catch (e: any) { toast.error(e?.message || 'فشل الإيقاف'); }
  };

  const performDelete = async () => {
    setBusy(true);
    try {
      await translatorService.deleteTitleGenJob(id);
      toast.success('تم حذف المهمة');
      navigate('/dashboard/title-generator');
    } catch (e: any) {
      toast.error(e?.message || 'فشل الحذف');
      setBusy(false);
    }
  };

  if (loading) return <div className="py-24 flex justify-center"><Spinner /></div>;

  if (!job) {
    return (
      <div className="py-20 text-center">
        <p className="text-white/50 text-sm mb-4">المهمة غير موجودة — ربما حُذفت</p>
        <button onClick={() => navigate('/dashboard/title-generator')} className={btnGhost}>
          <ArrowRight size={15} /> رجوع للهَب
        </button>
      </div>
    );
  }

  const total = job.totalToProcess ?? 0;
  const done = job.processedCount ?? 0;
  const pct = Math.min(100, Math.round((done / (total || 1)) * 100));
  const logs: any[] = job.logs || [];

  return (
    <div>
      <PageHead title="متابعة المهمة" desc={job.novelTitle || undefined}>
        <button onClick={() => navigate('/dashboard/title-generator')} className={btnGhost}>
          <ArrowRight size={15} /> رجوع
        </button>
        <button onClick={load} className={btnGhost} aria-label="تحديث الآن">
          <RefreshCcw size={15} /> تحديث
        </button>
      </PageHead>

      {/* بطاقة الحالة والتقدم */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-white font-bold text-base max-w-[70%] truncate">{job.novelTitle}</h2>
          <StatusBadge status={job.status} />
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-white rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-white/50 text-xs mt-2">تم معالجة {done} / {total}</p>
      </div>

      {/* الإجراءات: استئناف/إيقاف مؤقت + حذف (بتأكيد) */}
      <h2 className="text-white font-bold text-sm mb-3">إجراءات</h2>
      <div className="grid grid-cols-2 gap-3 mb-2 max-w-xl">
        {job.status === 'active' ? (
          <button
            onClick={() => setConfirm({
              title: 'إيقاف مؤقت',
              message: 'هل تريد إيقاف المهمة مؤقتاً؟ (ستتوقف بعد الفصل الحالي)',
              confirmText: 'إيقاف',
              tone: 'warning',
              onConfirm: performPause,
            })}
            className="bg-white/5 border border-amber-400/60 text-amber-300 rounded-2xl py-4 flex flex-col items-center justify-center gap-2 font-bold text-sm hover:bg-white/10 transition-colors"
          >
            <Pause size={20} aria-hidden /> إيقاف مؤقت
          </button>
        ) : (
          <button
            onClick={() => setConfirm({
              title: 'استئناف المهمة',
              message: 'استئناف توليد العناوين؟',
              confirmText: 'ابدأ',
              tone: 'info',
              onConfirm: performResume,
            })}
            className="bg-white/5 border border-white/70 text-white rounded-2xl py-4 flex flex-col items-center justify-center gap-2 font-bold text-sm hover:bg-white/10 transition-colors"
          >
            <Play size={20} aria-hidden /> استئناف
          </button>
        )}
        <button
          onClick={() => setConfirm({
            title: 'حذف المهمة',
            message: 'هل أنت متأكد من حذف هذه المهمة نهائياً؟',
            confirmText: 'حذف',
            tone: 'danger',
            onConfirm: performDelete,
          })}
          disabled={busy}
          className="bg-white/5 border border-red-400/60 text-red-300 rounded-2xl py-4 flex flex-col items-center justify-center gap-2 font-bold text-sm hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          <Trash2 size={20} aria-hidden /> حذف المهمة
        </button>
      </div>

      {/* السجل الحي */}
      <JobTerminal logs={logs} live={job.status === 'active'} />

      {confirm && <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   5) إصلاح العناوين: اختيار رواية + المهام الحالية
      مكافئ ChapterTitleFixerSelectionScreen + قائمة مهام Extractor Hub
   ════════════════════════════════════════════════════════════════════ */

function ExtractJobCard({ job, onOpen, onDelete }: { job: any; onOpen: () => void; onDelete: () => void }) {
  const total = job.totalChapters ?? 0;
  const done = job.processedCount ?? 0;
  const pct = Math.min(100, Math.round((done / (total || 1)) * 100));
  const lastLog = job.logs?.length ? job.logs[job.logs.length - 1] : null;
  const st = job.status === 'active'
    ? { label: 'جاري المعالجة...', dot: 'bg-green-400 animate-pulse' }
    : job.status === 'completed'
      ? { label: 'مكتمل', dot: 'bg-white' }
      : { label: 'فشل', dot: 'bg-red-400' };
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/25 transition-colors">
      <div className="p-4 flex items-center gap-3">
        <button onClick={onOpen} className="flex-1 flex items-center gap-3 text-right min-w-0" aria-label={`متابعة مهمة ${job.novelTitle || ''}`}>
          <img
            src={job.cover}
            alt=""
            loading="lazy"
            className="w-[46px] h-[64px] rounded-lg object-cover bg-black/40 shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.15'; }}
          />
          <span className="flex-1 min-w-0">
            <span className="block text-white font-bold text-sm truncate">{job.novelTitle}</span>
            <span className="flex items-center gap-2 mt-1">
              <Dot cls={st.dot} />
              <span className="text-white/50 text-[11px]">{st.label}</span>
            </span>
            <span className="block h-1.5 bg-white/10 rounded-full overflow-hidden mt-2">
              <span className="block h-full bg-white rounded-full transition-all" style={{ width: `${pct}%` }} />
            </span>
            <span className="block text-white/40 text-[10px] mt-1">{done} / {total} فصل</span>
          </span>
          <ChevronLeft size={16} className="text-white/30 shrink-0" aria-hidden />
        </button>
        <button onClick={onDelete} aria-label="حذف المهمة" className="p-2 rounded-lg hover:bg-white/10 text-red-300 shrink-0">
          <Trash2 size={16} />
        </button>
      </div>
      {lastLog?.message && (
        <div className="bg-black/30 border-t border-white/5 px-4 py-2">
          <p className="text-white/50 text-[10px] truncate">{lastLog.message}</p>
        </div>
      )}
    </div>
  );
}

export function TitleFixerSelectPage() {
  const navigate = useNavigate();
  const [selectedNovel, setSelectedNovel] = useState<any>(null);
  const [starting, setStarting] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [confirm, setConfirm] = useState<ConfirmConfig | null>(null);

  const loadJobs = useCallback(async () => {
    try { setJobs(await translatorService.getExtractJobs()); }
    catch { /* صامت كالتطبيق */ }
    finally { setJobsLoading(false); }
  }, []);

  useEffect(() => {
    loadJobs();
    const t = setInterval(loadJobs, DETAIL_POLL_MS); // تحديث حي كل 3 ثوانٍ كما في شاشة التطبيق
    return () => clearInterval(t);
  }, [loadJobs]);

  const startExtraction = async () => {
    if (!selectedNovel) return;
    setStarting(true);
    try {
      await translatorService.startExtract(selectedNovel._id);
      toast.success('تم بدء المهمة بنجاح');
      setSelectedNovel(null);
      loadJobs();
    } catch (e: any) {
      toast.error(e?.message || 'فشل بدء المهمة');
    } finally {
      setStarting(false);
    }
  };

  const performDeleteJob = async (jobId: string) => {
    try {
      await translatorService.deleteExtractJob(jobId);
      toast.success('تم حذف المهمة');
      loadJobs();
    } catch (e: any) { toast.error(e?.message || 'فشل الحذف'); }
  };

  return (
    <div>
      <PageHead title="اختيار رواية للاستخراج" desc="استخراج العناوين الحقيقية من السطر الأول لكل فصل وإصلاح العناوين المكسورة">
        <button onClick={() => navigate(-1)} className={btnGhost}>
          <ArrowRight size={15} /> رجوع
        </button>
      </PageHead>

      <div className="grid lg:grid-cols-[45fr_55fr] gap-4 items-start">
        <NovelListPane ariaLabel="قائمة الروايات" activeId={selectedNovel?._id} onPick={setSelectedNovel} />

        {/* لوحة التأكيد — كشاشة التطبيق: معلومات + بدء */}
        <section aria-label="تأكيد الاستخراج" className="bg-white/5 border border-white/10 rounded-2xl p-4 min-h-[360px] flex flex-col">
          {selectedNovel ? (
            <>
              <h2 className="text-white font-bold text-base text-center border-b border-white/10 pb-3 mb-4 truncate">
                {selectedNovel.title}
              </h2>
              <p className="text-white/60 text-sm leading-relaxed">
                سيتم إنشاء مهمة في الخلفية للمرور على جميع الفصول ({selectedNovel.chaptersCount || 0}) واستخراج العناوين من السطر الأول.
              </p>
              <p className="text-amber-300/90 text-sm leading-relaxed mt-3">
                يمكنك الخروج واستخدام الموقع بحرية أثناء المعالجة.
              </p>
              <div className="mt-auto pt-4">
                <button onClick={startExtraction} disabled={starting} className={btnPrimary + ' w-full py-3 rounded-xl'}>
                  {starting ? <Spinner /> : <Rocket size={16} aria-hidden />} بدء المهمة
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
              <Library size={44} className="text-white/15 mb-3" aria-hidden />
              <p className="text-white/40 text-sm">اختر رواية</p>
            </div>
          )}
        </section>
      </div>

      {/* المهام الحالية — من شاشة Extractor Hub في التطبيق (تحديث حي + حذف + آخر سجل) */}
      <div className="flex items-center justify-between mt-8 mb-3">
        <h2 className="text-white font-bold text-base">المهام الحالية</h2>
        <button onClick={loadJobs} className={btnGhost + ' text-xs'} aria-label="تحديث المهام">
          <RefreshCcw size={13} /> تحديث
        </button>
      </div>
      {jobsLoading ? (
        <div className="py-10 flex justify-center"><Spinner /></div>
      ) : jobs.length === 0 ? (
        <p className="py-10 text-center text-white/40 text-sm">لا توجد مهام نشطة.</p>
      ) : (
        <div className="space-y-3">
          {jobs.map((j) => (
            <ExtractJobCard
              key={j._id}
              job={j}
              onOpen={() => navigate(`/dashboard/title-fixer/jobs/${j._id}`)}
              onDelete={() => setConfirm({
                title: 'حذف المهمة',
                message: 'هل أنت متأكد من حذف مهمة الاستخراج نهائياً؟',
                confirmText: 'حذف',
                tone: 'danger',
                onConfirm: () => performDeleteJob(j._id),
              })}
            />
          ))}
        </div>
      )}

      {confirm && <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   6) تفاصيل مهمة استخراج — مكافئ شاشة المهمة في عائلة إصلاح العناوين
      (polling 3s + سجلات حية + حذف/إعادة)
   ════════════════════════════════════════════════════════════════════ */
export function TitleFixerDetailPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmConfig | null>(null);

  const load = useCallback(async () => {
    if (!jobId) return;
    try { setJob(await translatorService.getExtractJob(jobId)); }
    catch { /* المهمة قد تكون حُذفت */ }
    finally { setLoading(false); }
  }, [jobId]);

  useEffect(() => {
    load();
    const t = setInterval(load, DETAIL_POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  const performDelete = async () => {
    setBusy(true);
    try {
      await translatorService.deleteExtractJob(jobId!);
      toast.success('تم حذف المهمة');
      navigate('/dashboard/title-fixer');
    } catch (e: any) {
      toast.error(e?.message || 'فشل الحذف');
      setBusy(false);
    }
  };

  /* إعادة: بدء استخراج جديد لنفس الرواية (نفس نداء البدء في التطبيق) */
  const performRestart = async () => {
    if (!job?.novelId) { toast.error('لا يمكن تحديد رواية هذه المهمة'); return; }
    setBusy(true);
    try {
      await translatorService.startExtract(job.novelId);
      toast.success('بدأت مهمة إعادة الاستخراج');
      load();
    } catch (e: any) {
      toast.error(e?.message || 'فشل إعادة الاستخراج');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="py-24 flex justify-center"><Spinner /></div>;

  if (!job) {
    return (
      <div className="py-20 text-center">
        <p className="text-white/50 text-sm mb-4">المهمة غير موجودة — ربما حُذفت</p>
        <button onClick={() => navigate('/dashboard/title-fixer')} className={btnGhost}>
          <ArrowRight size={15} /> رجوع
        </button>
      </div>
    );
  }

  const total = job.totalChapters ?? 0;
  const done = job.processedCount ?? 0;
  const pct = Math.min(100, Math.round((done / (total || 1)) * 100));
  const logs: any[] = job.logs || [];

  return (
    <div>
      <PageHead title="مهمة استخراج العناوين" desc={job.novelTitle || undefined}>
        <button onClick={() => navigate('/dashboard/title-fixer')} className={btnGhost}>
          <ArrowRight size={15} /> رجوع
        </button>
        <button onClick={load} className={btnGhost} aria-label="تحديث الآن">
          <RefreshCcw size={15} /> تحديث
        </button>
      </PageHead>

      {/* بطاقة الحالة والتقدم */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-5 flex flex-wrap items-center gap-4">
        {job.cover && (
          <img
            src={job.cover}
            alt=""
            loading="lazy"
            className="w-14 h-20 rounded-lg object-cover bg-black/40 shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.15'; }}
          />
        )}
        <div className="flex-1 min-w-[220px]">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="text-white font-bold text-base truncate">{job.novelTitle}</h2>
            <StatusBadge status={job.status} />
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-white/50 text-xs mt-2">تم معالجة {done} / {total} فصل</p>
        </div>
      </div>

      {/* الإجراءات: إعادة + حذف */}
      <h2 className="text-white font-bold text-sm mb-3">إجراءات</h2>
      <div className="grid grid-cols-2 gap-3 mb-2 max-w-xl">
        <button
          onClick={() => setConfirm({
            title: 'إعادة الاستخراج',
            message: 'بدء مهمة استخراج جديدة لنفس الرواية؟',
            confirmText: 'إعادة',
            tone: 'info',
            onConfirm: performRestart,
          })}
          disabled={busy}
          className="bg-white/5 border border-white/70 text-white rounded-2xl py-4 flex flex-col items-center justify-center gap-2 font-bold text-sm hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          <RotateCcw size={20} aria-hidden /> إعادة الاستخراج
        </button>
        <button
          onClick={() => setConfirm({
            title: 'حذف المهمة',
            message: 'هل أنت متأكد من حذف هذه المهمة نهائياً؟',
            confirmText: 'حذف',
            tone: 'danger',
            onConfirm: performDelete,
          })}
          disabled={busy}
          className="bg-white/5 border border-red-400/60 text-red-300 rounded-2xl py-4 flex flex-col items-center justify-center gap-2 font-bold text-sm hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          <Trash2 size={20} aria-hidden /> حذف المهمة
        </button>
      </div>

      {/* السجل الحي */}
      <JobTerminal logs={logs} live={job.status === 'active'} />

      {confirm && <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />}
    </div>
  );
}
