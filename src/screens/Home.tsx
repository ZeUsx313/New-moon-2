import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';
import { motion } from 'motion/react';
import { TrendingUp, PlusCircle, Clock, Flame, Star, ChevronLeft, ChevronRight, Pin } from 'lucide-react';
import Header from '../components/Header';
import { novelService, Novel } from '../services/novel';

// Import Swiper styles
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
const NovelCard = ({ novel }: { novel: Novel }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
    viewport={{ once: true }}
    className="group cursor-pointer"
  >
    <Link to={`/novel/${novel._id}`} className="block">
      <div className="relative overflow-hidden rounded-xl shadow-lg transform transition-all duration-500 group-hover:scale-105 group-hover:shadow-2xl">
        <div className="aspect-[2/3]">
          <img
            src={novel.cover}
            alt={novel.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
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

// Main Component
export default function Home() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [trendingNovels, setTrendingNovels] = useState<Novel[]>([]);
  const [recentNovels, setRecentNovels] = useState<Novel[]>([]);
  const [latestUpdates, setLatestUpdates] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hero Slider Data (still static, but can be replaced by API)
  const heroSlides = [
    {
      id: 1,
      title: 'The Substitute Bride Is Doted on by the Cold-Blooded Emperor',
      image: 'https://storage.azoramoon.com/public/upload/2026/02/21/3d193696-84b3-46b8-91d4-a80e698ed920.webp',
      slug: 'the-substitute-bride-is-doted-on-by-the-cold-blooded-emperor',
      tags: ['انتقام', 'رومانسي', 'خيال'],
      status: 'جديد',
      statusIcon: '👋',
    },
    {
      id: 2,
      title: 'Once an Assassin, Now a Royal Nanny',
      image: 'https://storage.azoramoon.com/public/upload/2026/03/20/12c4fba7-71bf-4242-94fc-a8a7ba640189.webp',
      slug: 'once-an-assassin-now-a-royal-nanny',
      tags: ['خيال', 'رومانسي', 'تناسخ'],
      status: 'جديد',
      statusIcon: '👋',
    },
    {
      id: 3,
      title: 'Vengeance Begins with Marriage',
      image: 'https://storage.azoramoon.com/public/upload/2026/03/19/71666fa0-54f3-4b4b-aea5-a5ca55e52fe7.webp',
      slug: 'vengeance-begins-with-marriage',
      tags: ['دراما', 'رومانسي'],
      status: 'رائج',
      statusIcon: '🔥',
    },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [trending, recent, updates] = await Promise.all([
          novelService.getNovels({ filter: 'trending', timeRange: 'week', limit: 12 }),
          novelService.getNovels({ filter: 'latest_added', limit: 12 }),
          novelService.getNovels({ filter: 'latest_updates', limit: 8 }),
        ]);
        setTrendingNovels(trending.novels);
        setRecentNovels(recent.novels);
        setLatestUpdates(updates.novels);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground" dir="rtl">
        <Header isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
        <div className="flex items-center justify-center h-64 text-red-500">
          خطأ: {error}
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-background text-foreground transition-colors duration-500"
      dir="rtl"
      style={{ fontFamily: "'Cairo', sans-serif" }}
    >
      <Header isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />

      <main className="pb-16">
        {/* Hero Slider */}
        <section className="h-[430px] w-full overflow-hidden">
          <Swiper
            modules={[Autoplay, Pagination, Navigation]}
            autoplay={{ delay: 5000 }}
            pagination={{ clickable: true }}
            loop
            className="h-full w-full"
          >
            {heroSlides.map((slide) => (
              <SwiperSlide key={slide.id}>
                <Link to={`/novel/${slide.slug}`} className="block h-full w-full">
                  <div className="relative h-full w-full group">
                    <img
                      src={slide.image}
                      alt={slide.title}
                      className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                    <div className="absolute bottom-12 left-0 right-0 px-6 text-center z-10">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="flex flex-col items-center gap-3"
                      >
                        <span className="px-3 py-1 rounded-full bg-gradient-to-r from-cyan-400 to-teal-400 text-black text-xs font-bold flex items-center gap-1">
                          {slide.statusIcon} {slide.status}
                        </span>
                        <h2 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg max-w-3xl">
                          {slide.title}
                        </h2>
                        <div className="flex flex-wrap justify-center gap-2">
                          {slide.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-3 py-1 rounded-full border border-white/20 bg-white/5 text-xs text-white backdrop-blur-sm"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </Link>
              </SwiperSlide>
            ))}
          </Swiper>
        </section>

        {/* Section: Recently Added (المضافة حديثاً) */}
        <section className="px-4 md:px-8 mt-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 mb-6">
              <PlusCircle size={24} className="text-green-500" />
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
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <SwiperSlide key={i}>
                      <NovelCardSkeleton />
                    </SwiperSlide>
                  ))
                : recentNovels.map((novel) => (
                    <SwiperSlide key={novel._id}>
                      <NovelCard novel={novel} />
                    </SwiperSlide>
                  ))}
            </Swiper>
          </div>
        </section>

        {/* Section: Most Read (الأكثر قراءة) */}
        <section className="px-4 md:px-8 mt-16">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp size={24} className="text-orange-500" />
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
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <SwiperSlide key={i}>
                      <NovelCardSkeleton />
                    </SwiperSlide>
                  ))
                : trendingNovels.map((novel) => (
                    <SwiperSlide key={novel._id}>
                      <NovelCard novel={novel} />
                    </SwiperSlide>
                  ))}
            </Swiper>
          </div>
        </section>

        {/* Section: Latest Updates (آخر التحديثات) */}
        <section className="px-4 md:px-8 mt-16">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl md:text-[26px] font-bold">آخر التحديثات</h2>
              <div className="flex items-center bg-[#111111] rounded-full p-1 border border-white/5">
                <button className="flex items-center gap-2 text-gray-500 hover:text-gray-300 px-4 md:px-5 py-2 rounded-full transition-colors text-sm font-bold">
                  <Clock size={16} />
                  جديد
                </button>
                <button className="flex items-center gap-2 bg-[#ff3b8d]/10 text-[#ff3b8d] border border-[#ff3b8d]/30 px-4 md:px-5 py-2 rounded-full text-sm font-bold shadow-[0_0_10px_rgba(255,59,141,0.1)] transition-all">
                  <Flame size={16} className="fill-[#ff3b8d]" />
                  رائج
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="animate-pulse bg-gray-800/30 rounded-xl flex h-[300px]"
                    >
                      <div className="w-[42%] bg-gray-800 rounded-r-xl" />
                      <div className="flex-1 p-4 space-y-4">
                        <div className="h-5 bg-gray-800 rounded w-3/4" />
                        <div className="h-4 bg-gray-800 rounded w-1/2" />
                        <div className="space-y-2">
                          <div className="h-10 bg-gray-800 rounded" />
                          <div className="h-10 bg-gray-800 rounded" />
                        </div>
                      </div>
                    </div>
                  ))
                : latestUpdates.map((novel) => (
                    <div
                      key={novel._id}
                      className="bg-[#0c0c0c] rounded-xl border border-white/5 overflow-hidden flex h-[300px] hover:border-white/10 transition-all duration-300"
                    >
                      <Link
                        to={`/novel/${novel._id}`}
                        className="w-[42%] relative shrink-0 h-full block overflow-hidden group"
                      >
                        <img
                          src={novel.cover}
                          alt={novel.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#0c0c0c]/80" />
                        <div className="absolute top-0 right-0 bg-[#ff3b8d] text-white text-[12px] px-3 py-1.5 font-bold rounded-bl-xl shadow-md">
                          رواية
                        </div>
                        {novel.status === 'مستمرة' && (
                          <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md text-white text-[11px] px-2 py-1.5 rounded-md flex items-center gap-1.5 shadow-lg border border-white/10">
                            مستمر <Pin size={12} className="rotate-45" />
                          </div>
                        )}
                      </Link>

                      <div className="flex-1 p-4 flex flex-col">
                        <Link to={`/novel/${novel._id}`} className="block">
                          <h3 className="text-white font-bold text-[17px] leading-snug line-clamp-2 mb-2 hover:text-[#ff3b8d] transition-colors">
                            {novel.title}
                          </h3>
                        </Link>
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#00e676] shadow-[0_0_8px_rgba(0,230,118,0.5)]" />
                            <span className="text-gray-300 text-[13px] font-medium">
                              {novel.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[13px] font-bold text-white">
                            <Star size={14} className="fill-[#ff9900] text-[#ff9900]" />
                            {novel.rating}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 flex-1 overflow-hidden">
                          {novel.chapters?.slice(0, 5).map((chapter) => (
                            <div
                              key={chapter._id}
                              className="flex justify-between items-center bg-[#151515] hover:bg-[#1a1a1a] transition-colors rounded-lg px-3 py-2.5 border border-transparent hover:border-white/5 cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] font-bold text-gray-200">
                                  الفصل {chapter.number}
                                </span>
                                {/* Lock icon can be added conditionally */}
                              </div>
                              <span className="text-[11px] font-bold text-gray-500">
                                {new Date(chapter.createdAt).toLocaleDateString('ar-EG')}
                              </span>
                            </div>
                          ))}
                          {(!novel.chapters || novel.chapters.length === 0) && (
                            <div className="text-center text-gray-500 text-sm py-4">
                              لا توجد فصول بعد
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}