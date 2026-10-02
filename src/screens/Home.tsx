import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, PlusCircle, Sparkles, Flame, Star, CloudOff, RefreshCcw } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { websiteJsonLd } from '../components/SEO';
import Header from '../components/Header';
import SafeImage from '../components/SafeImage';
import ResumeReading from '../components/ResumeReading';
import { novelService, Novel } from '../services/novel';
import { getStatusStyle, formatRelativeTime, isNewChapter, siteUrl } from '../lib/site';

import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

// Skeleton Loader Component
const NovelCardSkeleton = () => (
  <div className="animate-pulse">
    <div className="aspect-[2/3] bg-gray-800 rounded-xl" />
    <div className="mt-3 space-y-2">
      <div className="h-4 bg-gray-800 rounded w-3/4" />
      <div className="h-3 bg-gray-800 rounded w-1/2" />
    </div>
  </div>
);

// ألوان شارات الترتيب — ذهبي/فضي/برونزي للأول الثلاثة، رمادي داكن موحّد للبقية
const RANK_COLORS: Record<number, { bg: string; shadow: string }> = {
  1: { bg: 'linear-gradient(180deg,#E8C15A 0%,#CFA006 55%,#A8820A 100%)', shadow: '0 6px 14px rgba(207,160,6,0.45)' },
  2: { bg: 'linear-gradient(180deg,#C9D2D9 0%,#98A4AD 55%,#7A868F 100%)', shadow: '0 6px 14px rgba(152,164,173,0.4)' },
  3: { bg: 'linear-gradient(180deg,#C99274 0%,#A3684B 55%,#84523A 100%)', shadow: '0 6px 14px rgba(163,104,75,0.4)' },
};
const RANK_DEFAULT_BG = 'linear-gradient(180deg,#3a3a3a 0%,#242424 100%)';

// Novel Card Component (reusable)
// rank: رقم الترتيب في قسم «الأكثر قراءة» فقط — شارة شريط أعلى الغلاف
const NovelCard = ({ novel, index, rank }: { novel: Novel; index: number; rank?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.5) }}
    className="group cursor-pointer"
  >
    <Link to={`/novel/${novel._id}`} className="block">
      <div className="relative overflow-hidden rounded-xl shadow-lg transform transition-all duration-500 group-hover:scale-105 group-hover:shadow-2xl">
        <div className="aspect-[2/3]">
          <SafeImage
            src={novel.cover}
            alt={novel.title}
            className="w-full h-full transition-transform duration-700 group-hover:scale-110 select-none"
          />
        </div>

        {/* 🏆 شارة الترتيب — شريط أنيق أعلى الغلاف */}
        {rank !== undefined && (
          <div
            className="absolute top-0 right-2.5 w-7 sm:w-8 h-10 sm:h-11 flex items-start justify-center pt-1.5 z-10"
            style={{
              background: RANK_COLORS[rank]?.bg || RANK_DEFAULT_BG,
              boxShadow: RANK_COLORS[rank]?.shadow || '0 6px 14px rgba(0,0,0,0.35)',
              borderRadius: '0 0 10px 10px',
              clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 86%, 0 100%)',
            }}
            aria-label={`الترتيب ${rank}`}
          >
            <span className="text-white font-extrabold text-sm sm:text-base leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
              {rank}
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
          <h3 className="text-white font-bold text-sm line-clamp-2 mb-2 text-center drop-shadow-md">
            {novel.title}
          </h3>
          <div className="flex justify-center items-center gap-1 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-xs text-white mx-auto w-fit">
            <Star size={12} className="fill-white text-white" />
            {novel.rating}
          </div>
        </div>
      </div>
      <div className="mt-3 px-1">
        <h3 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {novel.title}
        </h3>
      </div>
    </Link>
  </motion.div>
);

export default function Home() {
  const [latestPage, setLatestPage] = useState(1);
  const [hasMoreUpdates, setHasMoreUpdates] = useState(true);
  const [loadingUpdates, setLoadingUpdates] = useState(false);
  const [updatesError, setUpdatesError] = useState(false);
  const [latestUpdates, setLatestUpdates] = useState<Novel[]>([]);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  // طلب واحد للأكثر قراءة يغذي السلايدر + القسم (تقليل ضغط الخادم)
  const { data: trendingData, isLoading: trendingLoading } = useQuery({
    queryKey: ['trendingNovels'],
    queryFn: () => novelService.getNovels({ filter: 'trending', timeRange: 'week', limit: 12 }),
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const { data: recentData, isLoading: recentLoading } = useQuery({
    queryKey: ['recentNovels'],
    queryFn: () => novelService.getNovels({ filter: 'latest_added', limit: 12 }),
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  // تحميل الصفحة الأولى من آخر التحديثات
  const fetchUpdatesPage = useCallback(async (pageNum: number, replace: boolean) => {
    setLoadingUpdates(true);
    setUpdatesError(false);
    try {
      const res = await novelService.getNovels({ filter: 'latest_updates', page: pageNum, limit: 25 });
      setLatestUpdates(prev => (replace ? res.novels : [...prev, ...res.novels]));
      setLatestPage(pageNum);
      setHasMoreUpdates(pageNum < res.totalPages);
    } catch (err) {
      console.error(err);
      setUpdatesError(true);
    } finally {
      setLoadingUpdates(false);
    }
  }, []);

  useEffect(() => {
    fetchUpdatesPage(1, true);
  }, [fetchUpdatesPage]);

  // Load more updates on scroll
  const loadMoreUpdates = useCallback(async () => {
    if (loadingUpdates || !hasMoreUpdates) return;
    fetchUpdatesPage(latestPage + 1, false);
  }, [latestPage, hasMoreUpdates, loadingUpdates, fetchUpdatesPage]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreUpdates && !loadingUpdates) {
          loadMoreUpdates();
        }
      },
      { threshold: 0.1 }
    );
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMoreUpdates, loadingUpdates, loadMoreUpdates]);

  const heroNovels = (trendingData?.novels || []).slice(0, 5);
  const trendingNovels = trendingData?.novels || [];
  const recentNovels = recentData?.novels || [];
  const isLoading = trendingLoading || recentLoading;

  return (
    <>
      <Helmet>
        <title>قمر الروايات - الرئيسية | منصة قراءة الروايات العربية والعالمية</title>
        <meta name="description" content="قمر الروايات - وجهتك الأولى لقراءة الروايات العربية والعالمية المترجمة. اكتشف آلاف الروايات الحصرية، التحديثات اليومية، وتجربة قراءة فريدة ومريحة." />
        <meta name="keywords" content="روايات, روايات عربية, روايات مترجمة, قراءة اونلاين, قمر الروايات, روايات صينية, روايات كورية, روايات يابانية, مانجا, مانهوا" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={siteUrl('/')} />
        <meta property="og:title" content="قمر الروايات - الرئيسية | منصة قراءة الروايات العربية والعالمية" />
        <meta property="og:description" content="اكتشف آلاف الروايات الحصرية والمترجمة على قمر الروايات. تجربة قراءة لا مثيل لها مع تحديثات يومية." />
        <meta property="og:image" content={siteUrl('/icon.png')} />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={siteUrl('/')} />
        <meta property="twitter:title" content="قمر الروايات - الرئيسية | منصة قراءة الروايات العربية والعالمية" />
        <meta property="twitter:description" content="اكتشف آلاف الروايات الحصرية والمترجمة على قمر الروايات. تجربة قراءة لا مثيل لها مع تحديثات يومية." />
        <meta property="twitter:image" content={siteUrl('/icon.png')} />

        {/* AI Crawlers & SEO */}
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={siteUrl('/')} />

        {/* 🔎 صندوق بحث السايت-لينكس في نتائج جوجل */}
        <script type="application/ld+json">{JSON.stringify(websiteJsonLd())}</script>
      </Helmet>
      <div
        className="min-h-screen bg-background text-foreground transition-colors duration-500"
        dir="rtl"
        style={{ fontFamily: "'Cairo', sans-serif" }}
      >
        <Header />

        <main className="pb-16">
          {/* Hero Slider with fixed animation */}
          <section className="h-[430px] w-full overflow-hidden">
            <Swiper
              modules={[Autoplay, Pagination, Navigation]}
              autoplay={{ delay: 5000 }}
              pagination={{ clickable: true }}
              loop
              className="h-full w-full"
              onSlideChange={(swiper) => setActiveSlideIndex(swiper.realIndex)}
              onInit={(swiper) => setActiveSlideIndex(swiper.realIndex)}
            >
              {isLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <SwiperSlide key={i}>
                      <div className="relative h-full w-full bg-gray-800 animate-pulse" />
                    </SwiperSlide>
                  ))
                : heroNovels.map((novel, idx) => (
                    <SwiperSlide key={novel._id}>
                      <Link to={`/novel/${novel._id}`} className="block h-full w-full">
                        <div className="relative h-full w-full group">
                          <SafeImage
                            src={novel.cover}
                            alt={novel.title}
                            eager
                            className="w-full h-full transition-transform duration-700 group-hover:scale-105 select-none"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                          <div className="absolute bottom-12 left-0 right-0 px-6 text-center z-10">
                            {activeSlideIndex === idx && (
                              <motion.div
                                initial={{ opacity: 0, y: 40 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, type: 'spring', stiffness: 100, damping: 15 }}
                                className="flex flex-col items-center gap-3"
                              >
                                <h2 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg max-w-3xl">
                                  {novel.title}
                                </h2>
                                <motion.div
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.5, delay: 0.2 }}
                                  className="flex flex-wrap justify-center gap-2"
                                >
                                  {novel.tags?.slice(0, 3).map((tag) => (
                                    <span
                                      key={tag}
                                      className="px-3 py-1 rounded-full border border-white/20 bg-white/5 text-xs text-white backdrop-blur-sm"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </motion.div>
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </Link>
                    </SwiperSlide>
                  ))}
            </Swiper>
          </section>

          {/* Section: Resume Reading (استئناف القراءة) — مطابق للتطبيق، بعد الهيرو */}
          <ResumeReading />

          {/* Section: Most Read (الأكثر قراءة) */}
          <section className="px-4 md:px-8 mt-12">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp size={24} className="text-white" />
                <h2 className="text-xl font-bold">الأكثر قراءة</h2>
              </div>
              <Swiper
                modules={[Navigation]}
                spaceBetween={16}
                slidesPerView={2}
                navigation
                breakpoints={{
                  640: { slidesPerView: 3 },
                  768: { slidesPerView: 4 },
                  1024: { slidesPerView: 6 },
                }}
                className="py-4"
              >
                {isLoading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <SwiperSlide key={i}>
                        <NovelCardSkeleton />
                      </SwiperSlide>
                    ))
                  : trendingNovels.map((novel, idx) => (
                      <SwiperSlide key={novel._id}>
                        <NovelCard novel={novel} index={idx} rank={idx + 1} />
                      </SwiperSlide>
                    ))}
              </Swiper>
            </div>
          </section>

          {/* Section: Recently Added (أضيف حديثاً) */}
          <section className="px-4 md:px-8 mt-16">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center gap-2 mb-6">
                <PlusCircle size={24} className="text-white" />
                <h2 className="text-xl font-bold">أضيف حديثاً</h2>
              </div>
              <Swiper
                modules={[Navigation]}
                spaceBetween={16}
                slidesPerView={2}
                navigation
                breakpoints={{
                  640: { slidesPerView: 3 },
                  768: { slidesPerView: 4 },
                  1024: { slidesPerView: 6 },
                }}
                className="py-4"
              >
                {isLoading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <SwiperSlide key={i}>
                        <NovelCardSkeleton />
                      </SwiperSlide>
                    ))
                  : recentNovels.map((novel, idx) => (
                      <SwiperSlide key={novel._id}>
                        <NovelCard novel={novel} index={idx} />
                      </SwiperSlide>
                    ))}
              </Swiper>
            </div>
          </section>

          {/* Section: Latest Updates with Infinite Scroll */}
          <section className="px-4 md:px-8 mt-16">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center gap-2 mb-8">
                <Sparkles size={28} className="text-white" />
                <h2 className="text-2xl md:text-[26px] font-bold">آخر التحديثات</h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                <AnimatePresence>
                  {latestUpdates.map((novel, idx) => (
                    <motion.div
                      key={novel._id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: Math.min(idx * 0.03, 0.6) }}
                      className="bg-[#0c0c0c] rounded-xl border border-white/5 overflow-hidden flex h-[300px] hover:border-white/10 transition-all duration-300"
                    >
                      <Link
                        to={`/novel/${novel._id}`}
                        className="w-[42%] relative shrink-0 h-full block overflow-hidden group"
                      >
                        <SafeImage
                          src={novel.cover}
                          alt={novel.title}
                          className="w-full h-full transition-transform duration-500 group-hover:scale-110 select-none"
                        />
                        <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#0c0c0c]/80" />
                      </Link>

                      <div className="flex-1 p-4 flex flex-col">
                        <Link to={`/novel/${novel._id}`} className="block">
                          <h3 className="text-white font-bold text-[17px] leading-snug line-clamp-2 mb-2 hover:text-[#ff3b8d] transition-colors">
                            {novel.title}
                          </h3>
                        </Link>
                        <div className="flex justify-start items-center mb-4">
                          <span className={`px-3 py-1 rounded-md text-xs font-medium border ${getStatusStyle(novel.status)}`}>
                            {novel.status}
                          </span>
                        </div>

                        <div className="flex flex-col gap-2 flex-1 overflow-hidden">
                          {/* آخر 5 فصول من الخادم (recentChapters) مع تراجع للقائمة القديمة */}
                          {((novel as any).recentChapters || novel.chapters || []).slice(0, 5).map((chapter: any, chapIdx: number) => {
                            const isNew = isNewChapter(chapter.createdAt);
                            return (
                              <Link
                                key={chapter._id || chapIdx}
                                to={`/novel/${novel._id}/reader/${chapter.number}`}
                                className="flex justify-between items-center bg-[#151515] hover:bg-[#1a1a1a] transition-colors rounded-lg px-3 py-2.5 border border-transparent hover:border-white/5 cursor-pointer"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-[13px] font-bold text-gray-200">
                                    الفصل {chapter.number}
                                  </span>
                                  {isNew && (
                                    <span className="flex items-center gap-1 bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                                      <Flame size={10} className="fill-red-400" />
                                      جديد
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] font-bold text-gray-500">
                                  {formatRelativeTime(chapter.createdAt)}
                                </span>
                              </Link>
                            );
                          })}
                          {(!novel.chapters || novel.chapters.length === 0) && (
                            <div className="text-center text-gray-500 text-sm py-4">
                              لا توجد فصول بعد
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Error state with retry */}
              {updatesError && latestUpdates.length === 0 && !loadingUpdates && (
                <div className="text-center py-14">
                  <CloudOff className="mx-auto text-white/20 mb-3" size={44} />
                  <p className="text-white/60 text-sm mb-4">تعذّر تحميل آخر التحديثات</p>
                  <button
                    onClick={() => fetchUpdatesPage(1, true)}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/80 transition-colors"
                  >
                    <RefreshCcw size={16} />
                    إعادة المحاولة
                  </button>
                </div>
              )}

              {/* Empty state */}
              {!updatesError && !loadingUpdates && latestUpdates.length === 0 && (
                <div className="text-center py-14">
                  <p className="text-white/40 text-sm">لا توجد تحديثات حتى الآن</p>
                </div>
              )}

              {/* Loading indicator and sentinel */}
              {loadingUpdates && (
                <div className="flex justify-center items-center py-8">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              <div ref={loadMoreRef} className="h-4" />
              {!hasMoreUpdates && latestUpdates.length > 0 && (
                <div className="text-center text-gray-500 text-sm py-8">
                  لا توجد تحديثات أخرى
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </>
  );
}