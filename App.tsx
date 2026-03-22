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
  PlusCircle
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
    title: "Martial God Asura",
    image: "https://wsrv.nl/?url=https%3A%2F%2Fstorage.azoramoon.com%2Fpublic%2Fupload%2F2026%2F03%2F05%2F9adb9016-ff81-4ee1-bfd3-bbd07fadcec5.webp&w=150&q=85&output=webp",
    type: "مانهوا",
    chapters: [
      { number: "الفصل 405", time: "منذ 3 ساعات" },
      { number: "الفصل 404", time: "منذ 4 ساعات" }
    ]
  },
  {
    id: 2,
    title: "The Substitute Bride Is Doted on by the Cold-Blooded Emperor",
    image: "https://wsrv.nl/?url=https%3A%2F%2Fstorage.azoramoon.com%2Fpublic%2Fupload%2F2026%2F02%2F21%2F3d193696-84b3-46b8-91d4-a80e698ed920.webp&w=150&q=85&output=webp",
    type: "مانهوا",
    chapters: [
      { number: "الفصل 195", time: "منذ 5 ساعات" },
      { number: "الفصل 194", time: "منذ 6 ساعات" }
    ]
  },
  {
    id: 3,
    title: "Once an Assassin, Now a Royal Nanny",
    image: "https://wsrv.nl/?url=https%3A%2F%2Fstorage.azoramoon.com%2Fpublic%2Fupload%2F2026%2F03%2F20%2F12c4fba7-71bf-4242-94fc-a8a7ba640189.webp&w=150&q=85&output=webp",
    type: "مانهوا",
    chapters: [
      { number: "الفصل 32", time: "منذ 7 ساعات" },
      { number: "الفصل 31", time: "منذ 8 ساعات" }
    ]
  },
  {
    id: 4,
    title: "Vengeance Begins with Marriage",
    image: "https://wsrv.nl/?url=https%3A%2F%2Fstorage.azoramoon.com%2Fpublic%2Fupload%2F2026%2F03%2F19%2F71666fa0-54f3-4b4b-aea5-a5ca55e52fe7.webp&w=150&q=85&output=webp",
    type: "مانهوا",
    chapters: [
      { number: "الفصل 12", time: "منذ 9 ساعات" },
      { number: "الفصل 11", time: "منذ 10 ساعات" }
    ]
  },
  {
    id: 5,
    title: "Only for Love",
    image: "https://wsrv.nl/?url=https%3A%2F%2Fstorage.azoramoon.com%2Fpublic%2Fupload%2F2026%2F03%2F20%2F8eddb9a9-f9ee-4730-9364-d2b9aa5b2593.webp&w=150&q=85&output=webp",
    type: "مانهوا",
    chapters: [
      { number: "الفصل 5", time: "منذ 11 ساعة" },
      { number: "الفصل 4", time: "منذ 12 ساعة" }
    ]
  },
  {
    id: 6,
    title: "Sleepless Death",
    image: "https://wsrv.nl/?url=https%3A%2F%2Fstorage.azoramoon.com%2Fpublic%2Fupload%2F2026%2F03%2F05%2F9adb9016-ff81-4ee1-bfd3-bbd07fadcec5.webp&w=150&q=85&output=webp",
    type: "مانهوا",
    chapters: [
      { number: "الفصل 80", time: "منذ 14 ساعة" },
      { number: "الفصل 79", time: "منذ 15 ساعة" }
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
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500 font-sans" style={{ fontFamily: "'Noto Sans Arabic', 'Tajawal', sans-serif" }}>
      {/* Navbar */}
      <nav className="sticky top-0 z-50 w-full h-16 glass flex items-center justify-center px-4 md:px-8">
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

      <main className="pb-12">
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
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                  
                  <div className="absolute bottom-12 left-0 right-0 px-6 text-center">
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
              className="popular-swiper py-8"
            >
              {MOST_READ_MANGA.map((manga) => (
                <SwiperSlide key={manga.id} className="pb-6 px-1">
                  <div className="relative w-full aspect-[2/3] group perspective-[1000px] cursor-pointer">
                    <div className="w-full h-full relative transition-all duration-500 ease-out transform-style-3d group-hover:[transform:rotateX(15deg)_translateY(-8px)] origin-bottom shadow-md group-hover:shadow-2xl rounded-xl overflow-hidden">
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

        {/* Latest Updates Section */}
        <section className="px-4 md:px-8 mt-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 mb-6">
              <Clock size={24} className="text-primary" />
              <h2 className="text-xl font-bold">آخر التحديثات</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {LATEST_UPDATES.map((update) => (
                <div key={update.id} className="glass p-3 rounded-xl flex gap-4 hover:bg-white/5 transition-colors group cursor-pointer">
                  <div className="relative w-24 h-32 rounded-lg overflow-hidden shrink-0 shadow-md">
                    <img 
                      src={update.image} 
                      alt={update.title} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute top-1 right-1 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] text-white font-bold">
                      {update.type}
                    </div>
                  </div>
                  <div className="flex flex-col flex-1 py-1">
                    <h3 className="font-bold text-sm line-clamp-2 group-hover:text-primary transition-colors mb-3">
                      {update.title}
                    </h3>
                    <div className="flex flex-col gap-2 mt-auto">
                      {update.chapters.map((chapter, index) => (
                        <a 
                          key={index} 
                          href="#" 
                          className="flex justify-between items-center bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded transition-colors"
                        >
                          <span className="text-xs font-bold text-foreground/90">{chapter.number}</span>
                          <span className="text-[10px] text-muted">{chapter.time}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Recently Added Section */}
        <section className="px-4 md:px-8 mt-12 mb-12">
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
              className="popular-swiper py-8"
            >
              {RECENTLY_ADDED_MANGA.map((manga) => (
                <SwiperSlide key={manga.id} className="pb-6 px-1">
                  <div className="relative w-full aspect-[2/3] group perspective-[1000px] cursor-pointer">
                    <div className="w-full h-full relative transition-all duration-500 ease-out transform-style-3d group-hover:[transform:rotateX(15deg)_translateY(-8px)] origin-bottom shadow-md group-hover:shadow-2xl rounded-xl overflow-hidden">
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
            className="fixed inset-0 z-[60] bg-background md:hidden p-8 flex flex-col gap-8"
          >
            <div className="flex justify-between items-center">
              <img 
                src="https://storage.azoramoon.com/public/upload/2025/12/24/c925c7f3-2310-4e90-9b62-7fae04fe1c36.webp" 
                alt="Logo" 
                className="h-12"
              />
              <button onClick={() => setIsMenuOpen(false)} className="p-2">
                <ChevronLeft size={32} />
              </button>
            </div>
            
            <div className="flex flex-col gap-6">
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
        active ? "text-foreground font-bold" : "text-muted hover:text-foreground"
      )}
    >
      <span className="text-primary/80 group-hover:text-primary transition-colors">{icon}</span>
      <span className="leading-none">{label}</span>
      {active && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
      {!active && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary/0 group-hover:bg-primary/40 rounded-full transition-all" />}
    </a>
  );
}

function MobileNavLink({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <a href="#" className="flex items-center gap-4 text-xl font-bold hover:text-primary transition-colors">
      <span className="text-primary">{icon}</span>
      {label}
    </a>
  );
}