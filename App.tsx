import React, { useState, useEffect } from 'react';
import { 
  Home, 
  Library, 
  Flame, 
  Book, 
  ShoppingBasket, 
  Search, 
  Sun, 
  Moon, 
  User, 
  Menu, 
  Share2, 
  MessageSquare, 
  AlertCircle,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Star
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

const POPULAR_MANGA = [
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
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500">
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
              <NavLink icon={<Library size={20} />} label="قائمة المانجا" />
              <NavLink icon={<Flame size={20} />} label="أكشن" />
              <NavLink icon={<Book size={20} />} label="روايات" />
              <NavLink icon={<ShoppingBasket size={20} />} label="المتجر" />
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

        {/* Community Section */}
        <section className="px-4 md:px-8 mt-8">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass p-6 rounded-2xl flex items-center justify-between group hover:border-primary/50 transition-all">
              <div className="flex items-center gap-4">
                <div className="h-12 w-1.5 bg-primary/30 rounded-full" />
                <div>
                  <h3 className="font-bold">شارك Azora Manga</h3>
                  <p className="text-sm text-muted">مع أصدقائك</p>
                </div>
              </div>
              <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-6 py-2.5 rounded-full font-medium transition-all transform active:scale-95">
                <Share2 size={18} />
                <span>شارك</span>
              </button>
            </div>

            <div className="glass p-6 rounded-2xl flex items-center justify-between group hover:border-[#5865F2]/50 transition-all">
              <div className="flex items-center gap-4">
                <div className="h-12 w-1.5 bg-white/20 rounded-full" />
                <div>
                  <h3 className="font-bold">انضم لمجتمعنا</h3>
                  <p className="text-sm text-muted">على ديسكورد</p>
                </div>
              </div>
              <a 
                href="#" 
                className="flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752c4] px-6 py-2.5 rounded-full font-medium transition-all transform active:scale-95"
              >
                <MessageSquare size={18} />
                <span>Discord</span>
              </a>
            </div>
          </div>
        </section>

        {/* Support Banner */}
        <section className="px-4 md:px-8 mt-8">
          <div className="max-w-4xl mx-auto glass p-4 rounded-xl border-white/5 hover:border-white/10 transition-all flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-white/5 rounded-lg">
                <AlertCircle size={24} className="text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-bold">هل تحتاج مساعدة أو وجدت مشكلة؟</h4>
                <p className="text-xs text-muted">بلّغ عن الأخطاء أو مشاكل الدفع أو أي مشكلة أخرى • احصل على مكافآت</p>
              </div>
            </div>
            <button className="bg-secondary hover:bg-white/10 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap">
              الإبلاغ عن مشكلة
            </button>
          </div>
        </section>

        {/* Popular Today Section */}
        <section className="px-4 md:px-8 mt-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp size={24} className="text-orange-500" />
              <h2 className="text-xl font-bold">شائع اليوم</h2>
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
              className="popular-swiper"
            >
              {POPULAR_MANGA.map((manga) => (
                <SwiperSlide key={manga.id}>
                  <motion.div 
                    whileHover={{ y: -8 }}
                    className="flex flex-col gap-3 group"
                  >
                    <div className="relative aspect-[2/3] rounded-xl overflow-hidden manga-card-shadow">
                      <img 
                        src={manga.image} 
                        alt={manga.title} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                      
                      <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] text-white">
                          <Star size={10} className="fill-orange-400 text-orange-400" />
                          {manga.rating}
                        </div>
                      </div>
                    </div>
                    <h3 className="text-sm font-bold line-clamp-2 text-center group-hover:text-primary transition-colors h-10">
                      {manga.title}
                    </h3>
                  </motion.div>
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
              <MobileNavLink icon={<Library />} label="قائمة المانجا" />
              <MobileNavLink icon={<Flame />} label="أكشن" />
              <MobileNavLink icon={<Book />} label="روايات" />
              <MobileNavLink icon={<ShoppingBasket />} label="المتجر" />
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
