import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, PlusCircle, Sparkles, Flame, Star } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import Header from '../components/Header';
import { novelService, Novel } from '../services/novel';

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

// Novel Card Component (reusable)
const NovelCard = ({ novel, index }: { novel: Novel; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: index * 0.05 }}
    viewport={{ once: true }}
    className="group cursor-pointer"
  >
    <Link to={`/novel/${novel._id}`} className="block">
      <div className="relative overflow-hidden rounded-xl shadow-lg transform transition-all duration-500 group-hover:scale-105 group-hover:shadow-2xl">
        <div className="aspect-[2/3]">
          <img
            src={novel.cover}
            alt={novel.title}
            onContextMenu={(e) => e.preventDefault()}
            draggable={false}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 select-none"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
          <h3 className="text-white font-bold text-sm line-clamp-2 mb-2 text-center drop-shadow-md">
            {novel.title}
          </h3>
          <div className="flex justify-center items-center gap-1 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-xs text-white mx-auto w-fit">
            <Star size={12} className="fill-yellow-400 text-yellow-400" />
            {novel.rating}
          </div>
        </div>
      </div>
      <div className="mt-3 px-1">
        <h3 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {novel.title}
        </h3>
        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
          <span>{novel.author}</span>
          <span>•</span>
          <span>{novel.chaptersCount || 0} فصل</span>
        </div>
      </div>
    </Link>
  </motion.div>
);

// Helper: format relative time
const formatRelativeTime = (date: Date | string): string => {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffMonth = Math.floor(diffDay / 30);

  if (diffMin < 1) return 'الآن';
  if (diffHour < 1) return `منذ ${diffMin} دقيقة`;
  if (diffDay < 1) return `منذ ${diffHour} ساعة`;
  if (diffMonth < 1) return `منذ ${diffDay} يوم`;
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
};

// Helper: check if chapter is within last 24 hours
const isNewChapter = (date: Date | string): boolean => {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return diffHours < 24;
};

// Helper: get status pill style
const getStatusStyle = (status: string) => {
  if (status === 'مستمرة') return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
  if (status === 'مكتملة') return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
  return 'bg-red-500/20 text-red-300 border-red-500/30';
};

export default function Home() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [latestPage, setLatestPage] = useState(1);
  const [hasMoreUpdates, setHasMoreUpdates] = useState(true);
  const [loadingUpdates, setLoadingUpdates] = useState(false);
  const [latestUpdates, setLatestUpdates] = useState<Novel[]>([]);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  // استخدام React Query مع staleTime طويل للتخزين المؤقت
  const { data: heroData, isLoading: heroLoading } = useQuery({
    queryKey: ['heroNovels'],
    queryFn: () => novelService.getNovels({ filter: 'trending', timeRange: 'week', limit: 5 }),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const { data: trendingData, isLoading: trendingLoading } = useQuery({
    queryKey: ['trendingNovels'],
    queryFn: () => novelService.getNovels({ filter: 'trending', timeRange: 'week', limit: 12 }),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const { data: recentData, isLoading: recentLoading } = useQuery({
    queryKey: ['recentNovels'],
    queryFn: () => novelService.getNovels({ filter: 'latest_added', limit: 12 }),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  // تحميل الصفحة الأولى من آخر التحديثات
  useEffect(() => {
    const fetchFirstPage = async () => {
      try {
        const res = await novelService.getNovels({ filter: 'latest_updates', page: 1, limit: 25 });
        setLatestUpdates(res.novels);
        setHasMoreUpdates(res.totalPages > 1);
        setLatestPage(1);
      } catch (err) {
        console.error(err);
      }
    };
    fetchFirstPage();
  }, []);

  // Load more updates on scroll
  const loadMoreUpdates = useCallback(async () => {
    if (loadingUpdates || !hasMoreUpdates) return;
    setLoadingUpdates(true);
    try {
      const nextPage = latestPage + 1;
      const res = await novelService.getNovels({ filter: 'latest_updates', page: nextPage, limit: 25 });
      setLatestUpdates(prev => [...prev, ...res.novels]);
      setLatestPage(nextPage);
      setHasMoreUpdates(nextPage < res.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUpdates(false);
    }
  }, [latestPage, hasMoreUpdates, loadingUpdates]);

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

  // Dark mode effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const heroNovels = heroData?.novels || [];
  const trendingNovels = trendingData?.novels || [];
  const recentNovels = recentData?.novels || [];
  const isLoading = heroLoading || trendingLoading || recentLoading;

  return (
    <>
      <Helmet>
        <title>قمر الروايات - الرئيسية</title>
      </Helmet>
      <div
        className="min-h-screen bg-background text-foreground transition-colors duration-500"
        dir="rtl"
        style={{ fontFamily: "'Cairo', sans-serif" }}
      >
        <Header isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />

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
                          <img
                            src={novel.cover}
                            alt={novel.title}
                            onContextMenu={(e) => e.preventDefault()}
                            draggable={false}
                            className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105 select-none"
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
                        <NovelCard novel={novel} index={idx} />
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
                        <img
                          src={novel.cover}
                          alt={novel.title}
                          onContextMenu={(e) => e.preventDefault()}
                          draggable={false}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 select-none"
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
                          {(novel.chapters || []).slice(0, 5).map((chapter, chapIdx) => {
                            const isNew = isNewChapter(chapter.createdAt);
                            return (
                              <div
                                key={chapter._id || chapIdx}
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
                              </div>
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