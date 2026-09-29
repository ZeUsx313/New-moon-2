import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Helmet } from 'react-helmet-async';
import {
  Download,
  BookOpen,
  Trash2,
  RefreshCcw,
  ChevronDown,
  ChevronUp,
  WifiOff,
  FolderOpen,
  Library,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import Header from '../components/Header';
import SafeImage from '../components/SafeImage';
import { useTheme } from '../context/ThemeContext';
import { offlineStore, OfflineNovel } from '../lib/offlineStore';
import { offlineEngine, DownloadProgress } from '../lib/offlineDownloads';
import { formatRelativeTime } from '../lib/site';

const fmtMB = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} م.ب` : `${Math.max(1, Math.round(bytes / 1024))} ك.ب`);

/**
 * صفحة التنزيلات — كل ما نزّلته للقراءة دون اتصال:
 * قائمة الروايات المنزّلة مع التقدم الجاري، القراءة، تحديث الفصول
 * الجديدة، إدارة الفصول فرادى، والحذف. تعمل بالكامل دون إنترنت.
 */
export default function Downloads() {
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [novels, setNovels] = useState<OfflineNovel[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [progresses, setProgresses] = useState<Record<string, DownloadProgress>>({});
  const [online, setOnline] = useState(navigator.onLine);

  const reload = useCallback(async () => {
    try {
      const list = await offlineStore.listNovels();
      setNovels(list);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    const onChange = () => {
      reload();
      // اسحب التقدم الحي لأي جولة تعمل
      const next: Record<string, DownloadProgress> = {};
      novels.forEach((n) => {
        if (offlineEngine.isRunning(n._id)) {
          const p = offlineEngine.getProgress(n._id);
          if (p) next[n._id] = p;
        }
      });
      setProgresses(next);
    };
    window.addEventListener('moon-offline-change', onChange);
    const goOffline = () => setOnline(false);
    const goOnline = () => setOnline(true);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('moon-offline-change', onChange);
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // نبض خفيف أثناء وجود تنزيلات نشطة لتحديث الأشرطة
  const anyRunning = novels.some((n) => offlineEngine.isRunning(n._id));
  useEffect(() => {
    if (!anyRunning) return;
    const t = setInterval(() => {
      const next: Record<string, DownloadProgress> = {};
      novels.forEach((n) => {
        if (offlineEngine.isRunning(n._id)) {
          const p = offlineEngine.getProgress(n._id);
          if (p) next[n._id] = p;
        }
      });
      setProgresses(next);
    }, 300);
    return () => clearInterval(t);
  }, [anyRunning, novels]);

  const readNovel = (n: OfflineNovel) => {
    const target = n.lastReadNumber || n.chapterNumbers?.[0] || 1;
    navigate(`/novel/${n._id}/reader/${target}`);
  };

  const updateNovel = async (n: OfflineNovel) => {
    if (!navigator.onLine) return;
    const p = await offlineEngine.download(
      {
        _id: n._id,
        title: n.title,
        cover: n.cover,
        author: n.author,
        description: n.description,
        chaptersCount: n.chaptersCount,
      },
      { from: 1, to: n.chaptersCount },
    );
    if (p.phase === 'done' && p.total === 0) {
      // قد تكون هناك فصول جديدة لم تكن في العد القديم — جلب العدّاد الحقيقي
      try {
        const { novelService } = await import('../services/novel');
        const fresh = await novelService.getNovelById(n._id, true);
        await offlineStore.patchNovel(n._id, { chaptersCount: fresh.chaptersCount || n.chaptersCount });
        if ((fresh.chaptersCount || 0) > n.chaptersCount) {
          await offlineEngine.download(
            { ...n, chaptersCount: fresh.chaptersCount },
            { from: 1, to: fresh.chaptersCount },
          );
        }
      } catch { /* ignore */ }
    }
  };

  const deleteNovel = async (n: OfflineNovel) => {
    if (confirmDelete !== n._id) {
      setConfirmDelete(n._id);
      setTimeout(() => setConfirmDelete((cur) => (cur === n._id ? null : cur)), 4000);
      return;
    }
    setConfirmDelete(null);
    await offlineStore.deleteNovel(n._id);
    reload();
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500" dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>
      <Helmet>
        <title>التنزيلات — قمر الروايات</title>
        <meta name="description" content="رواياتك المنزّلة للقراءة دون اتصال على قمر الروايات" />
        <link rel="canonical" href="/downloads" />
      </Helmet>

      <Header isDarkMode={isDark} setIsDarkMode={toggleTheme} />

      <main className="max-w-3xl mx-auto px-4 py-6 pb-10">
        {/* رأس الصفحة */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
            <Download className="text-primary w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold">التنزيلات</h1>
            <p className="text-muted-foreground text-xs mt-0.5">
              {novels.length > 0
                ? `${novels.length} رواية منزّلة — تُقرأ دون إنترنت`
                : 'اقرأ رواياتك المفضلة دون اتصال'}
            </p>
          </div>
          {!online && (
            <span className="mr-auto flex items-center gap-1.5 text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/25 rounded-full px-3 py-1.5">
              <WifiOff size={13} />
              دون اتصال
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="animate-spin text-primary w-8 h-8" />
          </div>
        ) : novels.length === 0 ? (
          /* حالة فارغة */
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center text-center py-20 px-6"
          >
            <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-5">
              <FolderOpen className="w-11 h-11 text-white/25" />
            </div>
            <h2 className="text-lg font-extrabold mb-2">لا توجد تنزيلات بعد</h2>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mb-6">
              افتح أي رواية واضغط «تنزيل للقراءة دون اتصال» — ستجدها هنا كاملة وتعمل حتى بدون إنترنت.
            </p>
            <button
              onClick={() => navigate('/library')}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-white font-bold text-sm hover:bg-primary/85 active:scale-95 transition-all shadow-lg shadow-primary/20"
            >
              <Library size={17} />
              تصفّح المكتبة
            </button>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-4">
            {novels.map((n) => {
              const prog = progresses[n._id];
              const running = offlineEngine.isRunning(n._id);
              const doneCount = n.chapterNumbers?.length || 0;
              const pct = running && prog && prog.total > 0 ? Math.round(((prog.done || 0) / prog.total) * 100) : 0;
              const isOpen = expanded === n._id;
              return (
                <motion.article
                  key={n._id}
                  layout
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-sm overflow-hidden"
                >
                  {/* بطاقة الرواية */}
                  <div className="flex gap-4 p-4">
                    <button
                      onClick={() => readNovel(n)}
                      className="shrink-0 rounded-xl overflow-hidden ring-1 ring-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label={`اقرأ ${n.title}`}
                    >
                      <SafeImage src={n.cover || '/icon.png'} alt={`غلاف ${n.title}`} className="w-[72px] h-[100px] object-cover" />
                    </button>

                    <div className="flex-1 min-w-0 flex flex-col">
                      <button onClick={() => readNovel(n)} className="text-right">
                        <h3 className="font-extrabold text-[15px] leading-snug truncate hover:text-primary transition-colors">{n.title}</h3>
                      </button>
                      {n.author && <p className="text-muted-foreground text-xs mt-0.5 truncate">{n.author}</p>}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-muted-foreground">
                        <span className="font-bold text-emerald-400">{doneCount} فصل منزّل</span>
                        <span>{fmtMB(n.bytes || 0)}</span>
                        <span>محدّث {formatRelativeTime(n.updatedAt)}</span>
                      </div>

                      {/* شريط تقدم الجولة النشطة */}
                      {running && prog && (
                        <div className="mt-2.5">
                          <div className="flex justify-between text-[10px] text-white/50 mb-1">
                            <span className="flex items-center gap-1.5 font-bold text-primary">
                              <Loader2 size={11} className="animate-spin" />
                              {prog.phase === 'preparing' ? 'تحضير…' : 'تنزيل…'}
                            </span>
                            <span>{pct}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )}

                      {/* الأزرار */}
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={() => readNovel(n)}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary/85 active:scale-95 transition-all"
                        >
                          <BookOpen size={14} />
                          قراءة
                        </button>
                        <button
                          onClick={() => updateNovel(n)}
                          disabled={!online || running}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/8 border border-white/10 text-white/80 font-bold text-xs hover:bg-white/15 active:scale-95 disabled:opacity-35 disabled:pointer-events-none transition-all"
                          title="جلب الفصول الجديدة"
                        >
                          <RefreshCcw size={13} />
                          تحديث
                        </button>
                        <button
                          onClick={() => setExpanded(isOpen ? null : n._id)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/8 border border-white/10 text-white/80 font-bold text-xs hover:bg-white/15 active:scale-95 transition-all"
                          aria-expanded={isOpen}
                        >
                          {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          الفصول
                        </button>
                        <button
                          onClick={() => deleteNovel(n)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs mr-auto active:scale-95 transition-all border ${
                            confirmDelete === n._id
                              ? 'bg-red-500/20 border-red-500/40 text-red-300'
                              : 'bg-white/5 border-white/10 text-white/50 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10'
                          }`}
                        >
                          <Trash2 size={13} />
                          {confirmDelete === n._id ? 'تأكيد الحذف؟' : 'حذف'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* شبكة الفصول المنزّلة */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22 }}
                        className="border-t border-white/10"
                      >
                        <div className="p-4 max-h-72 overflow-y-auto">
                          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                            {(n.chapterNumbers || []).map((num) => (
                              <div key={num} className="relative group">
                                <button
                                  onClick={() => navigate(`/novel/${n._id}/reader/${num}`)}
                                  className="w-full py-2 rounded-lg bg-white/6 border border-white/10 text-xs font-bold text-white/75 hover:bg-primary/15 hover:text-primary hover:border-primary/30 active:scale-95 transition-all"
                                >
                                  {num}
                                </button>
                                <button
                                  onClick={async () => { await offlineStore.deleteChapter(n._id, num); reload(); }}
                                  className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-red-500/80 text-white items-center justify-center hidden group-hover:flex hover:bg-red-500 transition-colors"
                                  aria-label={`حذف الفصل ${num}`}
                                  title={`حذف الفصل ${num}`}
                                >
                                  <Trash2 size={10} />
                                </button>
                              </div>
                            ))}
                          </div>
                          {doneCount === 0 && (
                            <p className="text-center text-muted-foreground text-xs py-4">لا فصول منزّلة — اضغط تحديث</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.article>
              );
            })}

            {/* تلميح */}
            <div className="flex items-center gap-3 p-4 rounded-2xl border border-white/10 bg-white/[0.03] text-xs text-muted-foreground">
              <CheckCircle2 size={16} className="text-primary shrink-0" />
              <p>التنزيلات محفوظة في متصفحك — افتح الموقع دون إنترنت وستجد كل شيء ينتظرك هنا وفي القارئ.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
