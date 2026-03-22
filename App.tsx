import React, { useState, useEffect } from 'react';
import { 
  Home, 
  Library, 
  Search, 
  Sun, 
  Moon, 
  User, 
  Menu, 
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Star,
  Clock,
  PlusCircle,
  Lock,
  Pin,
  Flame
} from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Swiper styles
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const HERO_SLIDES = [
  {
    id: 1,
    title: "The Substitute Bride Is Doted on by the Cold-Blooded Emperor",
    image: "https://wsrv.nl/?url=https%3A%2F%2Fstorage.azoramoon.com%2Fpublic%2Fupload%2F2026%2F02%2F21%2F3d193696-84b3-46b8-91d4-a80e698ed920.webp&w=1920&q=85&output=webp",
    tags: ["انتقام", "رومانسي", "خيال"],
    type: "مانهوا",
    status: "جديد",
    statusIcon: "👋"
  },
  {
    id: 2,
    title: "Once an Assassin, Now a Royal Nanny",
    image: "https://wsrv.nl/?url=https%3A%2F%2Fstorage.azoramoon.com%2Fpublic%2Fupload%2F2026%2F03%2F20%2F12c4fba7-71bf-4242-94fc-a8a7ba640189.webp&w=1920&q=85&output=webp",
    tags: ["خيال", "رومانسي", "تناسخ"],
    type: "مانهوا",
    status: "جديد",
    statusIcon: "👋"
  },
  {
    id: 3,
    title: "Vengeance Begins with Marriage",
    image: "https://wsrv.nl/?url=https%3A%2F%2Fstorage.azoramoon.com%2Fpublic%2Fupload%2F2026%2F03%2F19%2F71666fa0-54f3-4b4b-aea5-a5ca55e52fe7.webp&w=1920&q=85&output=webp",
    tags: ["دراما", "رومانسي"],
    type: "مانهوا",
    status: "رائج",
    statusIcon: "🔥"
  }
];

const MOST_READ_MANGA = [
  {
    id: 1,
    title: "Sleepless Death",
    image: "https://wsrv.nl/?url=https%3A%2F%2Fstorage.azoramoon.com%2Fpublic%2Fupload%2F2026%2F03%2F05%2F9adb9016-ff81-4ee1-bfd3-bbd07fadcec5.webp&w=400&q=85&output=webp",
    rating: 10
  },
  {
    id: 2,
    title: "Once an Assassin, Now a Royal Nanny",
    image: "https://wsrv.nl/?url=https%3A%2F%2Fstorage.azoramoon.com%2Fpublic%2Fupload%2F2026%2F03%2F20%2F12c4fba7-71bf-4242-94fc-a8a7ba640189.webp&w=400&q=85&output=webp",
    rating: 10
  },
  {
    id: 3,
    title: "The Substitute Bride Is Doted on by the Cold-Blooded Emperor",
    image: "https://wsrv.nl/?url=https%3A%2F%2Fstorage.azoramoon.com%2Fpublic%2Fupload%2F2026%2F02%2F21%2F3d193696-84b3-46b8-91d4-a80e698ed920.webp&w=400&q=85&output=webp",
    rating: 7.5
  },
  {
    id: 4,
    title: "Vengeance Begins with Marriage",
    image: "https://wsrv.nl/?url=https%3A%2F%2Fstorage.azoramoon.com%2Fpublic%2Fupload%2F2026%2F03%2F19%2F71666fa0-54f3-4b4b-aea5-a5ca55e52fe7.webp&w=400&q=85&output=webp",
    rating: 10
  },
  {
    id: 5,
    title: "Only for Love",
    image: "https://wsrv.nl/?url=https%3A%2F%2Fstorage.azoramoon.com%2Fpublic%2Fupload%2F2026%2F03%2F20%2F8eddb9a9-f9ee-4730-9364-d2b9aa5b2593.webp&w=400&q=85&output=webp",
    rating: 9.44
  }
];

const RECENTLY_ADDED_MANGA = [
  {
    id: 1,
    title: "The Rebel Army's Quack Doctor",
    image: "https://wsrv.nl/?url=https%3A%2F%2Fstorage.azoramoon.com%2Fpublic%2Fupload%2F2026%2F02%2F10%2Fa565bd5e-fb3f-4386-934c-97481248860c.webp&w=400&q=85&output=webp",
    rating: 9.2
  },
  {
    id: 2,
    title: "The End of Unrequited Love",
    image: "https://wsrv.nl/?url=https%3A%2F%2Fstorage.azoramoon.com%2Fpublic%2Fupload%2F2026%2F02%2F25%2F44a51c99-9b2d-4b9a-a968-e5a09712ab41.webp&w=400&q=85&output=webp",
    rating: 8.7
  },
  {
    id: 3,
    title: "My Possession Became a Ghost Story",
    image: "https://wsrv.nl/?url=https%3A%2F%2Fstorage.azoramoon.com%2Fpublic%2Fupload%2F2026%2F03%2F05%2Ffa3d7014-3380-4715-81b1-f2b4a2988e20.webp&w=400&q=85&output=webp",
    rating: 9.5
  },
  {
    id: 4,
    title: "The Dutiful Kid Who Saved the Villainous Family",
    image: "https://wsrv.nl/?url=https%3A%2F%2Fstorage.azoramoon.com%2Fpublic%2Fupload%2F2026%2F03%2F02%2Fb9648973-e737-4b69-8219-3ec30269c233.webp&w=400&q=85&output=webp",
    rating: 9.8
  },
  {
    id: 5,
    title: "A Bad Example of a Perfect Curse",
    image: "https://wsrv.nl/?url=https%3A%2F%2Fstorage.azoramoon.com%2Fpublic%2Fupload%2F2026%2F01%2F18%2F65a3f791-5634-4c70-bea7-c543e57ad88b.webp&w=400&q=85&output=webp",
    rating: 6.13
  }
];

const LATEST_UPDATES = [
  {
    id: 1,
    title: "The Substitute Bride Is Doted on by the Cold-Hearted Majesty",
    image: "https://wsrv.nl/?url=https%3A%2F%2Fstorage.azoramoon.com%2Fpublic%2Fupload%2F2026%2F02%2F21%2F3d193696-84b3-46b8-91d4-a80e698ed920.webp&w=400&q=85&output=webp",
    type: "مانهوا",
    rating: 7.5,
    status: "مستمر",
    pinned: true,
    chapters: [
      { number: "الفصل 19", time: "جديد", locked: true, isNew: true },
      { number: "الفصل 18", time: "منذ 8 أيام", locked: true },
      { number: "الفصل 14", time: "منذ 29 يوم", locked: false },
      { number: "الفصل 13", time: "منذ 29 يوم", locked: false },
      { number: "الفصل 12", time: "منذ 29 يوم", locked: false }
    ]
  },
  {
    id: 2,
    title: "Sleepless Death",
    image: "https://wsrv.nl/?url=https%3A%2F%2Fstorage.azoramoon.com%2Fpublic%2Fupload%2F2026%2F03%2F05%2F9adb9016-ff81-4ee1-bfd3-bbd07fadcec5.webp&w=400&q=85&output=webp",
    type: "مانهوا",
    rating: 10,
    status: "مستمر",
    pinned: true,
    chapters: [
      { number: "الفصل 8", time: "جديد", locked: true, isNew: true },
      { number: "الفصل 7", time: "منذ 9 أيام", locked: true },
      { number: "الفصل 5", time: "منذ 16 يوم", locked: false },
      { number: "الفصل 4", time: "منذ 16 يوم", locked: false },
      { number: "الفصل 3", time: "منذ 16 يوم", locked: false }
    ]
  },
  {
    id: 3,
    title: "Vengeance Begins with Marriage",
    image: "https://wsrv.nl/?url=https%3A%2F%2Fstorage.azoramoon.com%2Fpublic%2Fupload%2F2026%2F03%2F19%2F71666fa0-54f3-4b4b-aea5-a5ca55e52fe7.webp&w=400&q=85&output=webp",
    type: "مانهوا",
    rating: 10,
    status: "مستمر",
    pinned: true,
    isHot: true,
    chapters: [
      { number: "الفصل 20", time: "جديد", locked: true, isNew: true },
      { number: "الفصل 19", time: "جديد", locked: true, isNew: true },
      { number: "الفصل 15", time: "جديد", locked: false, isNew: true },
      { number: "الفصل 14", time: "جديد", locked: false, isNew: true },
      { number: "الفصل 13", time: "جديد", locked: false, isNew: true }
    ]
  },
  {
    id: 4,
    title: "Once an Assassin, Now a Royal Nanny",
    image: "https://wsrv.nl/?url=https%3A%2F%2Fstorage.azoramoon.com%2Fpublic%2Fupload%2F2026%2F03%2F20%2F12c4fba7-71bf-4242-94fc-a8a7ba640189.webp&w=400&q=85&output=webp",
    type: "مانهوا",
    rating: 10,
    status: "مستمر",
    pinned: true,
    chapters: [
      { number: "الفصل 10", time: "جديد", locked: true, isNew: true },
      { number: "الفصل 9", time: "جديد", locked: true, isNew: true },
      { number: "الفصل 6", time: "جديد", locked: false, isNew: true },
      { number: "الفصل 5", time: "جديد", locked: false, isNew: true },
      { number: "الفصل 4", time: "جديد", locked: false, isNew: true }
    ]
  },
  {
    id: 5,
    title: "A Secretly Capable Child Is",
    image: "https://wsrv.nl/?url=https%3A%2F%2Fstorage.azoramoon.com%2Fpublic%2Fupload%2F2026%2F03%2F02%2Fb9648973-e737-4b69-8219-3ec30269c233.webp&w=400&q=85&output=webp",
    type: "مانهوا",
    rating: 8.74,
    status: "مستمر",
    pinned: true,
    chapters: [
      { number: "الفصل 29", time: "منذ 3 أيام", locked: true },
      { number: "الفصل 28", time: "منذ 11 يوم", locked: true },
      { number: "الفصل 26", time: "منذ 24 يوم", locked: false },
      { number: "الفصل 25", time: "1mo", locked: false },
      { number: "الفصل 24", time: "1mo", locked: false }
    ]
  },
  {
    id: 6,
    title: "Hush Now, Saintess!",
    image: "https://wsrv.nl/?url=https%3A%2F%2Fstorage.azoramoon.com%2Fpublic%2Fupload%2F2026%2F01%2F18%2F65a3f791-5634-4c70-bea7-c543e57ad88b.webp&w=400&q=85&output=webp",
    type: "مانهوا",
    rating: 9.25,
    status: "مستمر",
    pinned: true,
    chapters: [
      { number: "الفصل 22", time: "منذ 3 أيام", locked: true },
      { number: "الفصل 21", time: "منذ 11 يوم", locked: true },
      { number: "الفصل 16", time: "منذ 15 يوم", locked: false },
      { number: "الفصل 15", time: "منذ 15 يوم", locked: false },
      { number: "الفصل 14", time: "منذ 15 يوم", locked: false }
    ]
  },
  {
    id: 7,
    title: "My Pirate Prince",
    image: "https://wsrv.nl/?url=https%3A%2F%2Fstorage.azoramoon.com%2Fpublic%2Fupload%2F2026%2F03%2F19%2F71666fa0-54f3-4b4b-aea5-a5ca55e52fe7.webp&w=400&q=85&output=webp",
    type: "مانهوا",
    rating: 5,
    status: "مستمر",
    pinned: false,
    chapters: [
      { number: "الفصل 20", time: "منذ 5 أيام", locked: true },
      { number: "الفصل 19", time: "منذ 5 أيام", locked: true },
      { number: "الفصل 15", time: "منذ 5 أيام", locked: false },
    ]
  },
  {
    id: 8,
    title: "This Retired Saintess Will",
    image: "https://wsrv.nl/?url=https%3A%2F%2Fstorage.azoramoon.com%2Fpublic%2Fupload%2F2026%2F01%2F18%2F65a3f791-5634-4c70-bea7-c543e57ad88b.webp&w=400&q=85&output=webp",
    type: "مانهوا",
    rating: 6.67,
    status: "مستمر",
    pinned: false,
    chapters: [
      { number: "الفصل 19", time: "منذ 4 أيام", locked: true },
      { number: "الفصل 18", time: "منذ 11 يوم", locked: true },
    ]
  }
];

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500 font-sans" dir="rtl" style={{ fontFamily: "'Noto Sans Arabic', 'Tajawal', sans-serif" }}>
      {/* Navbar */}
      <nav className="sticky top-0 z-50 w-full h-16 glass flex items-center justify-center px-4 md:px-8 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl w-full flex items-center justify-between">
          {/* Logo & Desktop Nav */}
          <div className="flex items-center gap-8">
            <a href="/" className="flex items-center gap-2">
              <img 
                src="https://storage.azoramoon.com/public/upload/2025/12/24/c925c7f3-2310-4e90-9b62-7fae04fe1c36.webp" 
                alt="Azora Logo" 
                className="h-12 w-12 object-contain"
              />
            </a>
            
            <div className="hidden md:flex items-center gap-6">
              <NavLink icon={<Home size={20} />} label="الرئيسية" active />
              <NavLink icon={<Library size={20} />} label="المكتبة" />
              <NavLink icon={<User size={20} />} label="صفحتي" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <Search size={20} />
            </button>
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button className="p-2 hover:bg-white/10 rounded-full transition-colors hidden sm:block">
              <User size={20} />
            </button>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors md:hidden"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </nav>

      <main className="pb-12 bg-[#050505]">
        {/* Hero Slider */}
        <section className="h-[430px] w-full overflow-hidden">
          <Swiper
            modules={[Autoplay, Pagination, Navigation]}
            autoplay={{ delay: 5000 }}
            pagination={{ clickable: true }}
            loop={true}
            className="h-full w-full"
          >
            {HERO_SLIDES.map((slide) => (
              <SwiperSlide key={slide.id}>
                <div className="relative h-full w-full group cursor-pointer">
                  <img 
                    src={slide.image} 
                    alt={slide.title} 
                    className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent" />
                  
                  <div className="absolute bottom-12 left-0 right-0 px-6 text-center z-10">
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      className="flex flex-col items-center gap-3"
                    >
                      <span className="px-3 py-1 rounded-full bg-gradient-to-r from-cyan-400 to-teal-400 text-black text-xs font-bold flex items-center gap-1">
                        {slide.statusIcon} {slide.status}
                      </span>
                      <h2 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg max-w-3xl">
                        {slide.title}
                      </h2>
                      <div className="flex gap-2">
                        {slide.tags.map(tag => (
                          <span key={tag} className="px-3 py-1 rounded-full border border-white/20 bg-white/5 text-xs text-white backdrop-blur-sm">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                  
                  <div className="absolute top-4 left-4 z-10">
                    <span className="px-2 py-1 bg-black/70 text-white text-[10px] font-bold rounded uppercase">
                      {slide.type}
                    </span>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </section>

        {/* Most Read Section */}
        <section className="px-4 md:px-8 mt-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 mb-6 text-white">
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
              className="popular-swiper py-8"
            >
              {MOST_READ_MANGA.map((manga) => (
                <SwiperSlide key={manga.id} className="pb-6 px-1">
                  <div className="relative w-full aspect-[2/3] group perspective-[1000px] cursor-pointer">
                    <div className="w-full h-full relative transition-all duration-500 ease-out transform-style-3d group-hover:[transform:rotateX(15deg)_translateY(-8px)] origin-bottom shadow-md group-hover:shadow-2xl rounded-xl overflow-hidden border border-white/5">
                      <img 
                        src={manga.image} 
                        alt={manga.title} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4 translate-y-4 group-hover:translate-y-0">
                        <h3 className="text-white font-bold text-sm line-clamp-2 mb-3 text-center drop-shadow-md">
                          {manga.title}
                        </h3>
                        <div className="flex justify-center items-center gap-1 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-xs text-white mx-auto w-fit">
                          <Star size={12} className="fill-orange-400 text-orange-400" />
                          {manga.rating}
                        </div>
                      </div>
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </section>

        {/* Latest Updates Section (EXACT MATCH REBUILD) */}
        <section className="px-4 md:px-8 mt-6">
          <div className="max-w-7xl mx-auto">
            
            {/* Header / Tabs */}
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl md:text-[26px] font-bold text-white tracking-wide">أحدث الإصدارات</h2>
              
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

            {/* Grid layout matching image exactly */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              {LATEST_UPDATES.map((update) => (
                <div key={update.id} className="bg-[#0c0c0c] rounded-xl border border-white/5 overflow-hidden flex h-[300px] hover:border-white/10 transition-colors">
                  
                  {/* Right Side: Image (First in RTL flex) */}
                  <div className="w-[42%] relative shrink-0 h-full">
                    <img 
                      src={update.image} 
                      alt={update.title} 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#0c0c0c]/80" /> 
                    
                    {/* Pink Badge */}
                    <div className="absolute top-0 right-0 bg-[#ff3b8d] text-white text-[12px] px-3 py-1.5 font-bold rounded-bl-xl shadow-md">
                      {update.type}
                    </div>
                    
                    {/* Pinned Badge */}
                    {update.pinned && (
                      <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md text-white text-[11px] px-2 py-1.5 rounded-md flex items-center gap-1.5 shadow-lg border border-white/10">
                        Pinned <Pin size={12} className="rotate-45" />
                      </div>
                    )}
                    
                    {/* Hot Icon */}
                    {update.isHot && (
                      <div className="absolute bottom-3 right-3 bg-[#ff3b8d] text-white p-2 rounded-full shadow-lg shadow-[#ff3b8d]/40">
                        <Flame size={16} className="fill-white" />
                      </div>
                    )}
                  </div>

                  {/* Left Side: Content Box */}
                  <div className="flex-1 p-4 flex flex-col relative z-10 w-[58%]" dir="ltr">
                    
                    <h3 className="text-white font-bold text-[17px] leading-snug line-clamp-2 mb-2 text-left" dir="ltr">
                      {update.title}
                    </h3>
                    
                    {/* Status & Rating line */}
                    <div className="flex justify-between items-center mb-4 flex-row-reverse" dir="ltr">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#00e676] shadow-[0_0_8px_rgba(0,230,118,0.5)]"></div>
                        <span className="text-gray-300 text-[13px] font-medium">{update.status}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[13px] font-bold text-white">
                        <Star size={14} className="fill-[#ff9900] text-[#ff9900]" />
                        {update.rating}
                      </div>
                    </div>
                    
                    {/* Chapters List */}
                    <div className="flex flex-col gap-2 flex-1 overflow-hidden" dir="rtl">
                      {update.chapters.map((chapter, index) => (
                        <div key={index} className="flex justify-between items-center bg-[#151515] hover:bg-[#1a1a1a] transition-colors rounded-lg px-3 py-2.5 border border-transparent hover:border-white/5 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <span className={`text-[13px] font-bold ${chapter.locked ? 'text-[#d9a05b]' : 'text-gray-200'}`}>
                              {chapter.number}
                            </span>
                            {chapter.locked && <Lock size={13} className="text-[#d9a05b]" />}
                          </div>
                          <span className={`text-[11px] font-bold ${chapter.isNew ? 'text-[#ff3b3b]' : 'text-gray-500'}`}>
                            {chapter.time}
                          </span>
                        </div>
                      ))}
                    </div>

                  </div>

                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Recently Added Section */}
        <section className="px-4 md:px-8 mt-16 mb-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 mb-6 text-white">
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
              className="popular-swiper py-8"
            >
              {RECENTLY_ADDED_MANGA.map((manga) => (
                <SwiperSlide key={manga.id} className="pb-6 px-1">
                  <div className="relative w-full aspect-[2/3] group perspective-[1000px] cursor-pointer">
                    <div className="w-full h-full relative transition-all duration-500 ease-out transform-style-3d group-hover:[transform:rotateX(15deg)_translateY(-8px)] origin-bottom shadow-md group-hover:shadow-2xl rounded-xl overflow-hidden border border-white/5">
                      <img 
                        src={manga.image} 
                        alt={manga.title} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4 translate-y-4 group-hover:translate-y-0">
                        <h3 className="text-white font-bold text-sm line-clamp-2 mb-3 text-center drop-shadow-md">
                          {manga.title}
                        </h3>
                        <div className="flex justify-center items-center gap-1 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-xs text-white mx-auto w-fit">
                          <Star size={12} className="fill-orange-400 text-orange-400" />
                          {manga.rating}
                        </div>
                      </div>
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </section>
      </main>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed inset-0 z-[60] bg-[#0a0a0a] text-white md:hidden p-8 flex flex-col gap-8"
          >
            <div className="flex justify-between items-center">
              <img 
                src="https://storage.azoramoon.com/public/upload/2025/12/24/c925c7f3-2310-4e90-9b62-7fae04fe1c36.webp" 
                alt="Logo" 
                className="h-12"
              />
              <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-white/10 rounded-full">
                <ChevronRight size={32} />
              </button>
            </div>
            
            <div className="flex flex-col gap-6 mt-8">
              <MobileNavLink icon={<Home />} label="الرئيسية" />
              <MobileNavLink icon={<Library />} label="المكتبة" />
              <MobileNavLink icon={<User />} label="صفحتي" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavLink({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <a 
      href="#" 
      className={cn(
        "relative flex items-center gap-2 pb-2 transition-all group",
        active ? "text-white font-bold" : "text-gray-400 hover:text-white"
      )}
    >
      <span className={active ? "text-[#ff3b8d]" : "text-gray-400 group-hover:text-[#ff3b8d] transition-colors"}>{icon}</span>
      <span className="leading-none mt-1">{label}</span>
      {active && <div className="absolute -bottom-5 left-0 right-0 h-1 bg-[#ff3b8d] rounded-t-full" />}
    </a>
  );
}

function MobileNavLink({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <a href="#" className="flex items-center gap-4 text-xl font-bold text-gray-300 hover:text-[#ff3b8d] transition-colors">
      <span className="text-[#ff3b8d]">{icon}</span>
      {label}
    </a>
  );
}