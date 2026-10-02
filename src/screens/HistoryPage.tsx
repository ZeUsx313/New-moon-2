/**
 * صفحة السجل (سجل القراءة) — واجهة كاملة مستقلة كما في التطبيق:
 * كل رواية قُرئت سابقاً مع آخر فصل وصل إليه القارئ وشريط التقدم وزر «متابعة».
 *
 * المصدر:
 * - المسجّلون: GET /api/novel/library?type=history (ترتيب الأحدث أولاً) مع ترقيم صفحات
 * - الزوار: مفاتيح localStorage (last_read_* + read_chapters_*) من القارئ
 */
import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'motion/react';
import { History, Play, BookOpen, Clock, LogIn, CloudOff, RefreshCcw } from 'lucide-react';
import Header from '../components/Header';
import SafeImage from '../components/SafeImage';
import { novelService } from '../services/novel';
import { readJSON } from '../lib/storage';
import { useAuth } from '../context/AuthContext';
import { siteUrl, formatRelativeTime } from '../lib/site';

interface HistoryItem {
  novelId: string;
  title: string;
  cover: string;
  author?: string;
  lastChapterId: number;
  lastChapterTitle: string;
  progress: number;
  lastReadAt?: string;
}

const PAGE_SIZE = 12;

export default function HistoryPage() {
  const navigate = useNavigate();
  const { userInfo, openAuthModal } = useAuth();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async (pageNum: number, replace: boolean) => {
    replace ? setLoading(true) : setLoadingMore(true);
    setError(false);
    try {
      if (userInfo) {
        const res = await novelService.getUserLibrary(undefined, 'history', pageNum, PAGE_SIZE);
        const list = (Array.isArray(res) ? res : []).filter((h: any) => h && h.novelId && (h.lastChapterId || 0) > 0);
        const mapped: HistoryItem[] = list.map((h: any) => ({
          novelId: h.novelId,
          title: h.title || 'رواية',
          cover: h.cover || '',
          author: h.author || '',
          lastChapterId: h.lastChapterId,
          lastChapterTitle: h.lastChapterTitle || `الفصل ${h.lastChapterId}`,
          progress: Math.max(1, Math.min(100, h.progress || 0)),
          lastReadAt: h.lastReadAt,
        }));
        // تقدير الصفحات: الخادم يرجع 20 عنصراً افتراضياً — عند صفحة ناقصة نوقف
        setTotalPages(list.length < PAGE_SIZE ? pageNum : pageNum + 1);
        setItems((prev) => (replace ? mapped : [...prev, ...mapped]));
      } else {
        // مصدر الزوار: مفاتيح last_read_*
        const entries: { novelId: string; id: number; title: string; time: string }[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key || !key.startsWith('last_read_')) continue;
          const val = readJSON<{ id?: number; title?: string; time?: string }>(key, {});
          if (!val || typeof val.id !== 'number' || val.id <= 0) continue;
          entries.push({ novelId: key.replace('last_read_', ''), id: val.id, title: val.title || '', time: val.time || '' });
        }
        entries.sort((a, b) => (b.time || '').localeCompare(a.time || ''));
        const slice = entries.slice((pageNum - 1) * PAGE_SIZE, pageNum * PAGE_SIZE);
        const mapped: HistoryItem[] = await Promise.all(
          slice.map(async (e) => {
            const novel = await novelService.getNovelById(e.novelId).catch(() => null);
            const readChapters = readJSON<number[]>(`read_chapters_${e.novelId}`, []);
            const total = (novel as any)?.chaptersCount || 0;
            return {
              novelId: e.novelId,
              title: (novel as any)?.title || 'رواية',
              cover: (novel as any)?.cover || '',
              author: (novel as any)?.author || '',
              lastChapterId: e.id,
              lastChapterTitle: e.title || `الفصل ${e.id}`,
              progress: total > 0 ? Math.max(1, Math.min(100, Math.round((readChapters.length / total) * 100))) : 0,
              lastReadAt: e.time || undefined,
            };
          })
        );
        setTotalPages(entries.length > pageNum * PAGE_SIZE ? pageNum + 1 : pageNum);
        setItems((prev) => (replace ? mapped : [...prev, ...mapped]));
      }
      setPage(pageNum);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [userInfo]);

  useEffect(() => {
    load(1, true);
  }, [load]);

  const hasMore = page < totalPages;

  return (
    <>
      <Helmet>
        <title>سجل القراءة | قمر الروايات</title>
        <meta name="description" content="سجل قراءتك على قمر الروايات — تابع كل الروايات التي قرأتها واستأنف من آخر فصل وصلت إليه." />
        <link rel="canonical" href={siteUrl('/history')} />
        <meta name="robots" content="noindex, follow" />
      </Helmet>
      <div className="min-h-screen bg-background text-foreground" dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>
        <Header />
        <main className="max-w-3xl mx-auto px-4 pb-24 pt-6">
          <div className="flex items-center gap-2 mb-6">
            <History size={26} className="text-white" />
            <h1 className="text-2xl font-bold">السجل</h1>
          </div>

          {/* حالة التحميل الأول */}
          {loading && (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-[#111] border border-white/5 rounded-2xl p-4 flex gap-4 animate-pulse">
                  <div className="w-16 h-24 rounded-xl bg-white/5 shrink-0" />
                  <div className="flex-1 space-y-3 py-1">
                    <div className="h-4 bg-white/5 rounded w-2/3" />
                    <div className="h-3 bg-white/5 rounded w-1/2" />
                    <div className="h-1.5 bg-white/5 rounded w-full mt-6" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* خطأ مع إعادة المحاولة */}
          {!loading && error && items.length === 0 && (
            <div className="text-center py-20">
              <CloudOff className="mx-auto text-white/20 mb-3" size={44} />
              <p className="text-white/60 text-sm mb-4">تعذّر تحميل السجل</p>
              <button
                onClick={() => load(1, true)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/80 transition-colors"
              >
                <RefreshCcw size={16} />
                إعادة المحاولة
              </button>
            </div>
          )}

          {/* فراغ: لا سجل بعد */}
          {!loading && !error && items.length === 0 && (
            <div className="text-center py-20">
              <BookOpen className="mx-auto text-white/20 mb-4" size={52} />
              <h2 className="text-white font-bold text-lg mb-2">سجلك فارغ</h2>
              <p className="text-white/50 text-sm mb-6 max-w-sm mx-auto">
                {userInfo
                  ? 'ابدأ بقراءة أي رواية وستظهر هنا تلقائياً لتستأنفها لاحقاً من حيث توقفت.'
                  : 'سجّل دخولك ليُحفظ سجل قراءتك على حسابك ويظهر على تطبيقك أيضاً، أو اقرأ كزائر وسنحفظه على هذا الجهاز.'}
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                {!userInfo && (
                  <button
                    onClick={openAuthModal}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/80 transition-colors"
                  >
                    <LogIn size={16} />
                    تسجيل الدخول
                  </button>
                )}
                <Link
                  to="/library"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-white/15 text-white font-bold text-sm hover:bg-white/5 transition-colors"
                >
                  <BookOpen size={16} />
                  تصفح الروايات
                </Link>
              </div>
            </div>
          )}

          {/* قائمة السجل */}
          {!loading && items.length > 0 && (
            <div className="space-y-4">
              {items.map((item, idx) => (
                <motion.div
                  key={`${item.novelId}-${idx}`}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: Math.min(idx * 0.04, 0.4) }}
                  className="bg-[#111111] border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-colors"
                >
                  <div className="flex gap-4">
                    <Link to={`/novel/${item.novelId}`} className="shrink-0">
                      <div className="w-16 h-24 sm:w-[76px] sm:h-[112px] rounded-xl overflow-hidden bg-[#1a1a1a] relative">
                        {item.cover ? (
                          <SafeImage src={item.cover} alt={item.title} className="w-full h-full object-cover select-none" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/30">
                            <BookOpen size={22} />
                          </div>
                        )}
                      </div>
                    </Link>

                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <Link to={`/novel/${item.novelId}`} className="min-w-0">
                          <h3 className="font-bold text-white text-[15px] sm:text-base truncate hover:text-white/80 transition-colors">
                            {item.title}
                          </h3>
                        </Link>
                        {item.lastReadAt && (
                          <span className="flex items-center gap-1 text-[10px] text-white/40 shrink-0 pt-1">
                            <Clock size={10} />
                            {formatRelativeTime(item.lastReadAt)}
                          </span>
                        )}
                      </div>

                      <p className="text-[12px] text-white/50 truncate mt-1">
                        توقفت عند: {item.lastChapterTitle}
                      </p>

                      <div className="mt-auto pt-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden" role="progressbar" aria-valuenow={item.progress} aria-valuemin={0} aria-valuemax={100}>
                            <div className="h-full bg-white rounded-full" style={{ width: `${item.progress}%` }} />
                          </div>
                          <span className="text-[11px] font-bold text-white/60 shrink-0">{item.progress}%</span>
                        </div>
                        <button
                          onClick={() => navigate(`/novel/${item.novelId}/reader/${item.lastChapterId}`)}
                          className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black font-bold text-sm hover:bg-white/85 transition-colors"
                        >
                          <Play size={15} className="fill-black -scale-x-100" />
                          متابعة القراءة
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* تحميل المزيد */}
              {hasMore && (
                <div className="pt-2">
                  <button
                    onClick={() => load(page + 1, false)}
                    disabled={loadingMore}
                    className="w-full py-3 rounded-xl border border-white/15 text-white/80 font-bold text-sm hover:bg-white/5 transition-colors disabled:opacity-50"
                  >
                    {loadingMore ? 'جارٍ التحميل…' : 'تحميل المزيد'}
                  </button>
                </div>
              )}
              {!hasMore && items.length >= 4 && (
                <p className="text-center text-white/30 text-xs py-4">وصلت إلى نهاية السجل</p>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
