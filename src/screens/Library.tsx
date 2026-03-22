import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, 
  ChevronDown, 
  X, 
  BookOpen, 
  Library as LibraryIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { novelService, Novel } from '../services/novel';
import { categoryService, Category } from '../services/category';
import { useDebounce } from '../hooks/useDebounce';
import Header from '../components/Header';

// صورة الخلفية
import backgroundImage from '../assets/adaptive-icon.png';

// خيارات الحالة
const STATUS_OPTIONS = [
  { id: 'all', name: 'جميع الحالات' },
  { id: 'مستمرة', name: 'مستمرة' },
  { id: 'مكتملة', name: 'مكتملة' },
  { id: 'متوقفة', name: 'متوقفة' }
];

// خيارات الترتيب
const SORT_OPTIONS = [
  { id: 'chapters_desc', name: 'عدد الفصول - من أعلى لأقل' },
  { id: 'chapters_asc', name: 'عدد الفصول - من أقل لأعلى' },
  { id: 'title_asc', name: 'الاسم - أ إلى ي' },
  { id: 'title_desc', name: 'الاسم - ي إلى أ' },
];

// Helper: لون الحالة
const getStatusColor = (status: string) => {
  switch (status) {
    case 'مكتملة': return '#27ae60';
    case 'متوقفة': return '#c0392b';
    default: return '#2980b9';
  }
};

// التحقق مما إذا كان النص يحتوي على أحرف إنجليزية
const containsEnglish = (text: string) => /[a-zA-Z]/.test(text);

// مكون البطاقة
const NovelCard = ({ novel, onClick }: { novel: Novel; onClick: () => void }) => {
  const statusColor = getStatusColor(novel.status);

  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -4 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      onClick={onClick}
      className="cursor-pointer group"
    >
      <div className="relative overflow-hidden rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-300">
        <div className="aspect-[2/3]">
          <img
            src={novel.cover}
            alt={novel.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        </div>
        <div className="absolute top-2 right-2">
          <div className="px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10">
            <span className="text-xs font-medium" style={{ color: statusColor }}>
              {novel.status}
            </span>
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
      <div className="mt-3 px-1">
        <h3 className="text-sm font-semibold text-white line-clamp-2 group-hover:text-primary transition-colors">
          {novel.title}
        </h3>
        <div className="flex justify-between items-center mt-2">
          <div className="flex items-center gap-1 text-white/40 text-xs">
            <BookOpen size={12} />
            <span>{novel.chaptersCount || 0} فصل</span>
          </div>
          {novel.category && (
            <div className="text-primary text-xs bg-primary/10 px-2 py-0.5 rounded-full">
              {novel.category}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// مكون النافذة المنبثقة للفلترة (مع تمرير)
const FilterModal = ({
  isOpen,
  onClose,
  title,
  options,
  selectedId,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  options: { id: string; name: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-md bg-[#1a1a1a] rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
          >
            <div className="p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">{title}</h3>
                <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                  <X size={20} className="text-gray-400" />
                </button>
              </div>
              {/* إضافة منطقة تمرير */}
              <div className="max-h-[60vh] overflow-y-auto">
                <div className="divide-y divide-white/10">
                  {options.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => {
                        onSelect(option.id);
                        onClose();
                      }}
                      className="w-full flex items-center justify-between py-3 hover:bg-white/5 transition-colors"
                    >
                      <span className={`text-right ${selectedId === option.id ? 'text-white font-bold' : 'text-gray-300'}`}>
                        {option.name}
                      </span>
                      {selectedId === option.id && <Check size={18} className="text-primary" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default function Library() {
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 500);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedSort, setSelectedSort] = useState('chapters_desc');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  // Modal states
  const [modalType, setModalType] = useState<'sort' | 'category' | 'status' | null>(null);

  // جلب التصنيفات وتصفيتها (إزالة التي تحتوي على إنجليزية)
  const { data: rawCategories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories(),
    staleTime: 30 * 60 * 1000,
  });

  // تصفية التصنيفات: استبعاد أي تصنيف يحتوي على أحرف إنجليزية
  const categories = rawCategories.filter((cat: any) => !containsEnglish(cat.name));

  // جلب الروايات
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['novels', page, selectedCategory, selectedStatus, selectedSort, debouncedSearch],
    queryFn: () =>
      novelService.getNovels({
        page,
        limit,
        category: selectedCategory,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        sort: selectedSort,
        search: debouncedSearch,
      }),
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000,
  });

  const novels = data?.novels || [];
  const totalPages = data?.totalPages || 1;

  // إعادة تعيين الصفحة عند تغيير الفلاتر أو البحث
  useEffect(() => {
    setPage(1);
  }, [selectedCategory, selectedStatus, selectedSort, debouncedSearch]);

  // الحصول على اسم التصنيف المحدد للعرض
  const getSelectedCategoryName = () => {
    if (selectedCategory === 'all') return 'التصنيف';
    const cat = categories.find((c: any) => c.id === selectedCategory);
    return cat?.name || 'التصنيف';
  };

  const getSelectedStatusName = () => {
    const status = STATUS_OPTIONS.find(s => s.id === selectedStatus);
    return status?.name || 'الحالة';
  };

  const getSelectedSortName = () => {
    const sort = SORT_OPTIONS.find(s => s.id === selectedSort);
    return sort?.name || 'الترتيب';
  };

  // عدد الأعمدة responsive
  const [columns, setColumns] = useState(4);
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) setColumns(2);
      else if (width < 1024) setColumns(3);
      else setColumns(4);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // توليد أزرار الصفحات
  const renderPageButtons = () => {
    const maxButtons = 5;
    let start = Math.max(1, page - 2);
    let end = Math.min(totalPages, start + maxButtons - 1);
    if (end - start < maxButtons - 1) {
      start = Math.max(1, end - maxButtons + 1);
    }
    const pages = [];
    for (let i = start; i <= end; i++) pages.push(i);

    return (
      <div className="flex justify-center items-center gap-2 mt-8 mb-4">
        {page > 1 && (
          <button
            onClick={() => handlePageChange(page - 1)}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <ChevronRight size={18} className="text-white" />
          </button>
        )}
        {pages.map(p => (
          <button
            key={p}
            onClick={() => handlePageChange(p)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 ${
              page === p
                ? 'bg-primary/20 text-primary border border-primary/50'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {p}
          </button>
        ))}
        {page < totalPages && (
          <button
            onClick={() => handlePageChange(page + 1)}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <ChevronLeft size={18} className="text-white" />
          </button>
        )}
      </div>
    );
  };

  // تأثير الوضع المظلم
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <>
      <Helmet>
        <title>قمر الروايات - المكتبة</title>
      </Helmet>
      <div className="min-h-screen bg-background text-foreground transition-colors duration-500" dir="rtl">
        <Header isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
        <div className="relative overflow-hidden bg-black">
          {/* خلفية زجاجية */}
          <div className="absolute inset-0 z-0">
            <img
              src={backgroundImage}
              alt=""
              className="w-full h-full object-cover opacity-40 blur-sm"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-black" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 py-6">
            {/* العنوان مع شعار */}
            <div className="flex items-center gap-3 mb-6">
              <Sparkles size={28} className="text-white" />
              <h1 className="text-3xl font-bold text-white">المكتبة</h1>
            </div>

            {/* شريط البحث */}
            <div className="relative mb-5">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث داخل المكتبة..."
                className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl py-3 pr-12 pl-12 text-white placeholder:text-white/40 focus:outline-none focus:border-primary transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* أزرار الفلاتر */}
            <div className="flex flex-wrap gap-3 mb-6">
              <button
                onClick={() => setModalType('sort')}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/20 transition-colors"
              >
                <span className="text-white text-sm">{getSelectedSortName()}</span>
                <ChevronDown size={14} className="text-white/60" />
              </button>
              <button
                onClick={() => setModalType('category')}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/20 transition-colors"
              >
                <span className="text-white text-sm">{getSelectedCategoryName()}</span>
                <ChevronDown size={14} className="text-white/60" />
              </button>
              <button
                onClick={() => setModalType('status')}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/20 transition-colors"
              >
                <span className="text-white text-sm">{getSelectedStatusName()}</span>
                <ChevronDown size={14} className="text-white/60" />
              </button>
            </div>

            {/* قائمة الروايات */}
            {isLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : novels.length === 0 ? (
              <div className="text-center py-20">
                <LibraryIcon size={48} className="mx-auto text-white/20" />
                <p className="text-white/40 mt-2">لا توجد روايات تطابق بحثك</p>
              </div>
            ) : (
              <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
                {novels.map((novel, idx) => (
                  <motion.div
                    key={novel._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.03 }}
                  >
                    <NovelCard novel={novel} onClick={() => navigate(`/novel/${novel._id}`)} />
                  </motion.div>
                ))}
              </div>
            )}

            {/* أزرار الصفحات */}
            {totalPages > 1 && !isLoading && renderPageButtons()}

            {/* مؤشر تحميل عند تحديث البيانات */}
            {isFetching && !isLoading && (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* النوافذ المنبثقة للفلترة */}
        <FilterModal
          isOpen={modalType === 'sort'}
          onClose={() => setModalType(null)}
          title="الترتيب حسب"
          options={SORT_OPTIONS}
          selectedId={selectedSort}
          onSelect={setSelectedSort}
        />
        <FilterModal
          isOpen={modalType === 'category'}
          onClose={() => setModalType(null)}
          title="التصنيفات"
          options={categories}
          selectedId={selectedCategory}
          onSelect={setSelectedCategory}
        />
        <FilterModal
          isOpen={modalType === 'status'}
          onClose={() => setModalType(null)}
          title="الحالة"
          options={STATUS_OPTIONS}
          selectedId={selectedStatus}
          onSelect={setSelectedStatus}
        />
      </div>
    </>
  );
}