import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { X, Download, CheckCircle2, XCircle, WifiOff, FolderOpen, BookOpen, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Novel } from '../services/novel';
import { offlineStore } from '../lib/offlineStore';
import { offlineEngine, DownloadProgress } from '../lib/offlineDownloads';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  novel: Novel;
}

type Mode = 'first10' | 'first50' | 'all' | 'range';

const fmtMB = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} م.ب`;

/**
 * مودال التنزيل للقراءة دون اتصال — خيارات نطاق (أول 10/50، الكل، مخصص)،
 * تقدم حي، إيقاف/استئناف (المخطّى يُستأنف من حيث توقف)، وحجم تقريبي.
 */
export default function DownloadModal({ isOpen, onClose, novel }: DownloadModalProps) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('first50');
  const [from, setFrom] = useState('1');
  const [to, setTo] = useState('50');
  const [downloaded, setDownloaded] = useState<number[]>([]);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const mountedRef = useRef(true);

  const total = novel.chaptersCount || 0;
  const running = offlineEngine.isRunning(novel._id);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // عند فتح المودال: حالة المخزن + آخر تقدم جارٍ (إن وُجد)
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const rec = await offlineStore.getNovel(novel._id).catch(() => undefined);
      if (mountedRef.current) {
        setDownloaded(rec?.chapterNumbers || []);
        const p = offlineEngine.getProgress(novel._id);
        if (p && offlineEngine.isRunning(novel._id)) setProgress(p);
      }
    })();
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.novelId && detail.novelId !== novel._id) return;
      offlineStore.getNovel(novel._id).then((rec) => {
        if (mountedRef.current) setDownloaded(rec?.chapterNumbers || []);
      }).catch(() => { /* ignore */ });
    };
    window.addEventListener('moon-offline-change', onChange);
    return () => window.removeEventListener('moon-offline-change', onChange);
  }, [isOpen, novel._id]);

  // سحب التقدم الحي أثناء الجولة
  useEffect(() => {
    if (!isOpen || !running) return;
    const t = setInterval(() => {
      const p = offlineEngine.getProgress(novel._id);
      if (p && mountedRef.current) setProgress(p);
    }, 250);
    return () => clearInterval(t);
  }, [isOpen, running, novel._id]);

  const resolveRange = (): { from: number; to: number } => {
    const maxTo = total || 50;
    if (mode === 'first10') return { from: 1, to: Math.min(10, maxTo) };
    if (mode === 'first50') return { from: 1, to: Math.min(50, maxTo) };
    if (mode === 'all') return { from: 1, to: maxTo };
    const f = Math.max(1, parseInt(from) || 1);
    const t = Math.min(maxTo, Math.max(f, parseInt(to) || f));
    return { from: f, to: t };
  };

  const selected = resolveRange();
  const alreadyInRange = downloaded.filter((n) => n >= selected.from && n <= selected.to).length;
  const willDownload = Math.max(0, selected.to - selected.from + 1 - alreadyInRange);

  const start = async () => {
    if (!navigator.onLine) {
      toast.error('لا يمكن التنزيل وأنت دون اتصال — اتصل بالإنترنت أولاً');
      return;
    }
    const range = resolveRange();
    const p = await offlineEngine.download(
      {
        _id: novel._id,
        title: novel.title,
        cover: novel.cover,
        author: novel.author,
        description: novel.description,
        chaptersCount: total,
      },
      { ...range, onProgress: (np) => { if (mountedRef.current) setProgress(np); } },
    );
    if (!mountedRef.current) return;
    if (p.phase === 'done') toast.success(p.message || 'اكتمل التنزيل');
    else if (p.phase === 'error') toast.error(p.message || 'فشل التنزيل');
  };

  const phase = progress?.phase;
  const isWorking = phase === 'preparing' || phase === 'downloading' || offlineEngine.isRunning(novel._id);
  const pct = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  const close = () => {
    // لا نغلق أثناء العمل إلا بعد تأكيد الإيقاف — الإيقاف هنا لطيف
    if (isWorking) {
      offlineEngine.stop(novel._id);
    }
    onClose();
  };

  const modeBtn = (m: Mode, label: string, hint?: string) => (
    <button
      key={m}
      onClick={() => setMode(m)}
      aria-pressed={mode === m}
      className={`flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-xl border text-right transition-all active:scale-[0.98] ${
        mode === m
          ? 'bg-primary/15 border-primary/40 text-primary'
          : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
      }`}
    >
      <span className="text-[13px] font-bold leading-tight">{label}</span>
      {hint && <span className="text-[10px] text-white/40 font-medium">{hint}</span>}
    </button>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative w-full max-w-md bg-[#111]/95 backdrop-blur-xl border border-white/15 rounded-3xl shadow-2xl overflow-hidden max-h-[88vh] overflow-y-auto"
            dir="rtl"
            role="dialog"
            aria-modal="true"
            aria-label="تنزيل للقراءة دون اتصال"
          >
            <button
              onClick={close}
              className="absolute top-4 left-4 p-1.5 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-colors z-10"
              aria-label="إغلاق"
            >
              <X size={19} />
            </button>

            <div className="p-6">
              {/* العنوان */}
              <div className="flex items-start gap-3.5 mb-5">
                <div className="w-12 h-12 shrink-0 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center">
                  <Download className="text-primary w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-white font-extrabold text-lg leading-snug">تنزيل للقراءة دون اتصال</h3>
                  <p className="text-white/50 text-xs mt-0.5 truncate">{novel.title} — {total} فصلاً</p>
                </div>
              </div>

              {/* حالة جولة جارية */}
              {isWorking ? (
                <div className="mb-5">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-white/70 font-bold flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin" />
                      {phase === 'preparing' ? 'يجمع قائمة الفصول…' : 'جارٍ التنزيل…'}
                    </span>
                    <span className="text-primary font-extrabold">{pct}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-white/10 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-l from-primary to-primary/70"
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="text-[11px] text-white/40 mt-2 truncate">
                    {progress?.currentTitle ? `${progress.done} / ${progress.total} — ${progress.currentTitle}` : `${progress?.done || 0} / ${progress?.total || 0}`}
                    {progress?.failed ? ` — فشل ${progress.failed}` : ''}
                  </p>
                  <button
                    onClick={() => { offlineEngine.stop(novel._id); }}
                    className="mt-3 w-full py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-bold text-sm hover:bg-red-500/20 transition-colors"
                  >
                    إيقاف التنزيل
                  </button>
                </div>
              ) : phase === 'done' || phase === 'cancelled' ? (
                <div className="mb-5 flex flex-col gap-3">
                  <div className={`flex items-center gap-2.5 p-3.5 rounded-2xl border ${
                    phase === 'done' ? 'bg-emerald-500/10 border-emerald-500/25' : 'bg-amber-500/10 border-amber-500/25'
                  }`}>
                    {phase === 'done' ? (
                      <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle size={20} className="text-amber-400 shrink-0" />
                    )}
                    <p className={`text-sm font-bold ${phase === 'done' ? 'text-emerald-300' : 'text-amber-300'}`}>
                      {progress?.message}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { onClose(); navigate('/downloads'); }}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/85 active:scale-95 transition-all"
                    >
                      <FolderOpen size={16} />
                      التنزيلات
                    </button>
                    <button
                      onClick={() => { onClose(); navigate(`/novel/${novel._id}/reader/${downloaded[0] || 1}`); }}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/8 border border-white/15 text-white font-bold text-sm hover:bg-white/15 active:scale-95 transition-all"
                    >
                      <BookOpen size={16} />
                      ابدأ القراءة
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* خيارات النطاق */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {modeBtn('first10', 'أول 10 فصول', 'تجربة سريعة')}
                    {modeBtn('first50', 'أول 50 فصلاً', 'الأكثر اختياراً')}
                    {modeBtn('all', 'كل الفصول', total ? `${total} فصلاً` : undefined)}
                    {modeBtn('range', 'نطاق مخصص', 'من — إلى')}
                  </div>

                  {mode === 'range' && (
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <label className="flex flex-col gap-1">
                        <span className="text-[11px] text-white/50 font-bold">من فصل</span>
                        <input
                          type="number"
                          min={1}
                          max={total || undefined}
                          value={from}
                          onChange={(e) => setFrom(e.target.value)}
                          className="bg-white/8 border border-white/15 rounded-xl py-2 px-3 text-white text-sm focus:outline-none focus:border-primary/60"
                          dir="ltr"
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-[11px] text-white/50 font-bold">إلى فصل</span>
                        <input
                          type="number"
                          min={1}
                          max={total || undefined}
                          value={to}
                          onChange={(e) => setTo(e.target.value)}
                          className="bg-white/8 border border-white/15 rounded-xl py-2 px-3 text-white text-sm focus:outline-none focus:border-primary/60"
                          dir="ltr"
                        />
                      </label>
                    </div>
                  )}

                  {/* ملخص */}
                  <div className="text-[12px] bg-white/5 border border-white/10 rounded-xl p-3 mb-4 space-y-1 text-white/60">
                    <p>
                      النطاق المختار: <b className="text-white">{selected.from} → {selected.to}</b> ({selected.to - selected.from + 1} فصلاً)
                    </p>
                    {alreadyInRange > 0 && (
                      <p className="text-emerald-400/80">
                        ✦ {alreadyInRange} فصلاً منزّل مسبقاً وسيُخطّى — الاستئناف مجاني
                      </p>
                    )}
                    <p>سيُنزّل الآن: <b className="text-white">{willDownload}</b> فصلاً (~{fmtMB(willDownload * 12 * 1024)})</p>
                  </div>

                  <button
                    onClick={start}
                    disabled={willDownload === 0}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary text-white font-extrabold text-[15px] hover:bg-primary/85 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none transition-all shadow-lg shadow-primary/20"
                  >
                    <Download size={18} />
                    {willDownload === 0 ? 'كل النطاق منزّل ✓' : 'بدء التنزيل'}
                  </button>

                  {!navigator.onLine && (
                    <p className="flex items-center gap-1.5 text-[11px] text-amber-400 mt-3 justify-center">
                      <WifiOff size={13} />
                      أنت دون اتصال الآن — التنزيل يحتاج إنترنت مرة واحدة
                    </p>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
