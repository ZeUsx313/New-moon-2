import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Star, ChevronLeft, ChevronRight, Heart, BookOpen, 
  Eye, ArrowUpDown, Calendar, List, X, Search
} from 'lucide-react';
import Header from '../components/Header';
import { novelService, Novel, ChapterMeta, ChapterFull } from '../services/novel';
import { commentService, Comment, CommentStats } from '../services/comment';

// Skeleton Loaders
const DetailSkeleton = () => (
  <div className="animate-pulse">
    <div className="flex flex-col lg:flex-row gap-8">
      <div className="w-full lg:w-[280px]">
        <div className="aspect-[2/3] bg-gray-800 rounded-xl" />
        <div className="mt-4 space-y-2">
          <div className="h-10 bg-gray-800 rounded w-full" />
          <div className="h-10 bg-gray-800 rounded w-full" />
        </div>
      </div>
      <div className="flex-1 space-y-4">
        <div className="h-8 bg-gray-800 rounded w-3/4" />
        <div className="h-4 bg-gray-800 rounded w-1/2" />
        <div className="h-32 bg-gray-800 rounded" />
      </div>
    </div>
  </div>
);

// Page Selector Modal Component
const PageSelectorModal = ({ 
  isOpen, 
  onClose, 
  totalPages, 
  currentPage, 
  onSelectPage 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  totalPages: number; 
  currentPage: number; 
  onSelectPage: (page: number) => void;
}) => {
  const [inputPage, setInputPage] = useState(currentPage.toString());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(inputPage);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      onSelectPage(pageNum);
      onClose();
    }
  };

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
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[320px] bg-[#1a1a1a] rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
          >
            <div className="p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">اختر الصفحة</h3>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <input
                  type="number"
                  value={inputPage}
                  onChange={(e) => setInputPage(e.target.value)}
                  min={1}
                  max={totalPages}
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white text-center text-lg focus:outline-none focus:border-primary transition-colors"
                  placeholder="رقم الصفحة"
                />
                <div className="flex gap-2 mt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-primary hover:bg-primary/80 text-white font-bold py-2 rounded-xl transition-colors"
                  >
                    انتقال
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded-xl transition-colors"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
              <div className="mt-4 text-center text-sm text-gray-400">
                الصفحة {currentPage} من {totalPages}
              </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-primary to-purple-500" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default function NovelPage() {
  const { slug } = useParams<{ slug: string }>();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState<'chapters' | 'description' | 'views'>('chapters');
  const [chapterSearch, setChapterSearch] = useState('');
  const [selectedChapter, setSelectedChapter] = useState<ChapterFull | null>(null);
  const [showReader, setShowReader] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [chaptersPage, setChaptersPage] = useState(1);
  const [isPageModalOpen, setIsPageModalOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const [reactionStats, setReactionStats] = useState({ like: 0, love: 0, funny: 0, sad: 0, angry: 0 });
  
  const queryClient = useQueryClient();
  const chaptersPerPage = 20;

  // Fetch novel details
  const { data: novel, isLoading: novelLoading } = useQuery({
    queryKey: ['novel', slug],
    queryFn: () => novelService.getNovelById(slug!),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch chapters list with pagination
  const { data: chaptersData, isLoading: chaptersLoading } = useQuery({
    queryKey: ['chapters', slug, chaptersPage, sortOrder],
    queryFn: () => novelService.getChaptersList(slug!, chaptersPage, chaptersPerPage, sortOrder),
    enabled: !!slug,
    staleTime: 2 * 60 * 1000,
  });

  // Fetch user status (favorite, etc.)
  const { data: userStatus } = useQuery({
    queryKey: ['novelStatus', slug],
    queryFn: () => novelService.getNovelStatus(slug!),
    enabled: !!slug && !!localStorage.getItem('token'),
    staleTime: 1 * 60 * 1000,
  });

  const chapters = chaptersData || [];
  const totalChapters = novel?.chaptersCount || 0;
  const totalPages = Math.ceil(totalChapters / chaptersPerPage);

  // Filter chapters by search
  const filteredChapters = useMemo(() => {
    if (!chapterSearch) return chapters;
    return chapters.filter(ch =>
      ch.number.toString().includes(chapterSearch) ||
      ch.title.toLowerCase().includes(chapterSearch.toLowerCase())
    );
  }, [chapters, chapterSearch]);

  // Toggle favorite mutation
  const favoriteMutation = useMutation({
    mutationFn: () => novelService.updateReadingStatus({
      novelId: slug!,
      title: novel?.title,
      cover: novel?.cover,
      author: novel?.author,
      isFavorite: !isFavorite,
    }),
    onSuccess: () => {
      setIsFavorite(!isFavorite);
      queryClient.invalidateQueries({ queryKey: ['novelStatus', slug] });
    },
  });

  // Handle chapter click
  const handleChapterClick = async (chapter: ChapterMeta) => {
    try {
      const full = await novelService.getChapter(slug!, chapter._id);
      setSelectedChapter(full);
      setShowReader(true);
      
      // Update reading progress
      await novelService.updateReadingStatus({
        novelId: slug!,
        lastChapterId: chapter.number,
        lastChapterTitle: full.title,
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Handle sort toggle
  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    setChaptersPage(1);
  };

  // Handle page change
  const goToPage = (page: number) => {
    setChaptersPage(Math.min(Math.max(1, page), totalPages));
  };

  useEffect(() => {
    if (userStatus) {
      setIsFavorite(userStatus.isFavorite);
    }
  }, [userStatus]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  if (novelLoading || !novel) {
    return (
      <div className="min-h-screen bg-background text-foreground" dir="rtl">
        <Header isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <DetailSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <Header isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />

      {/* Background with parallax effect */}
      <div className="fixed inset-0 z-0">
        <img
          src={novel.cover}
          alt=""
          className="w-full h-full object-cover object-top opacity-30 dark:opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/90 to-background" />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Novel Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col lg:flex-row gap-8"
        >
          {/* Cover Image */}
          <div className="lg:w-[280px] shrink-0">
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className="relative rounded-2xl overflow-hidden shadow-2xl"
            >
              <img
                src={novel.cover}
                alt={novel.title}
                className="w-full h-auto object-cover rounded-2xl"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
            </motion.div>

            {/* Action Buttons */}
            <div className="mt-4 space-y-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => chapters.length > 0 && handleChapterClick(chapters[0])}
                className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <BookOpen size={20} />
                اقرأ الآن
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => favoriteMutation.mutate()}
                className={`w-full font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
                  isFavorite 
                    ? 'bg-primary/20 text-primary border border-primary/50' 
                    : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 border border-white/10'
                }`}
              >
                <Heart size={18} className={isFavorite ? 'fill-primary' : ''} />
                {isFavorite ? 'تمت الإضافة للمفضلة' : 'إضافة للمفضلة'}
              </motion.button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3 mt-6">
              <motion.div
                whileHover={{ y: -2 }}
                className="bg-white/5 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10"
              >
                <Star className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
                <div className="text-xl font-bold">{novel.rating}</div>
                <div className="text-xs text-gray-400">التقييم</div>
              </motion.div>
              <motion.div
                whileHover={{ y: -2 }}
                className="bg-white/5 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10"
              >
                <Eye className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                <div className="text-xl font-bold">{novel.views.toLocaleString('ar-EG')}</div>
                <div className="text-xs text-gray-400">مشاهدة</div>
              </motion.div>
              <motion.div
                whileHover={{ y: -2 }}
                className="bg-white/5 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10"
              >
                <Heart className="w-5 h-5 text-pink-500 mx-auto mb-1" />
                <div className="text-xl font-bold">{novel.favorites}</div>
                <div className="text-xs text-gray-400">مفضلة</div>
              </motion.div>
              <motion.div
                whileHover={{ y: -2 }}
                className="bg-white/5 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10"
              >
                <BookOpen className="w-5 h-5 text-green-500 mx-auto mb-1" />
                <div className="text-xl font-bold">{totalChapters}</div>
                <div className="text-xs text-gray-400">فصل</div>
              </motion.div>
            </div>
          </div>

          {/* Novel Info */}
          <div className="flex-1">
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-3xl lg:text-4xl font-bold mb-3"
            >
              {novel.title}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-gray-400 mb-4"
            >
              بواسطة {novel.author}
            </motion.p>

            {/* Info Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
            >
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="text-sm text-gray-400">الحالة</div>
                <div className="font-semibold mt-1 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${novel.status === 'مستمرة' ? 'bg-green-500' : 'bg-red-500'}`} />
                  {novel.status}
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="text-sm text-gray-400">آخر تحديث</div>
                <div className="font-semibold mt-1">
                  {new Date(novel.lastChapterUpdate).toLocaleDateString('ar-EG', {
                    year: 'numeric',
                    month: 'numeric',
                    day: 'numeric'
                  })}
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="text-sm text-gray-400">التصنيفات</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {novel.tags?.slice(0, 3).map((tag) => (
                    <span key={tag} className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="text-sm text-gray-400">الفصول</div>
                <div className="font-semibold mt-1">{totalChapters}</div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-8"
        >
          <div className="flex border-b border-white/10">
            <button
              onClick={() => setActiveTab('chapters')}
              className={`px-6 py-3 font-semibold transition-all relative ${
                activeTab === 'chapters' 
                  ? 'text-primary' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              الفصول
              {activeTab === 'chapters' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
            <button
              onClick={() => setActiveTab('description')}
              className={`px-6 py-3 font-semibold transition-all relative ${
                activeTab === 'description' 
                  ? 'text-primary' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              الملخص
              {activeTab === 'description' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
            <button
              onClick={() => setActiveTab('views')}
              className={`px-6 py-3 font-semibold transition-all relative ${
                activeTab === 'views' 
                  ? 'text-primary' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              المشاهدات
              {activeTab === 'views' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          </div>

          {/* Chapters Tab */}
          {activeTab === 'chapters' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-6"
            >
              {/* Search and Sort */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={chapterSearch}
                    onChange={(e) => setChapterSearch(e.target.value)}
                    placeholder="ابحث برقم الفصل أو العنوان..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pr-10 pl-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={toggleSortOrder}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <ArrowUpDown size={18} />
                  <span>{sortOrder === 'asc' ? 'الأحدث أولاً' : 'الأقدم أولاً'}</span>
                </motion.button>
              </div>

              {/* Chapters List */}
              <div className="space-y-2">
                {chaptersLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="animate-pulse bg-white/5 rounded-xl p-4">
                      <div className="h-5 bg-gray-700 rounded w-1/3" />
                    </div>
                  ))
                ) : filteredChapters.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    لا توجد فصول مطابقة للبحث
                  </div>
                ) : (
                  filteredChapters.map((chapter, idx) => (
                    <motion.div
                      key={chapter._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.02 }}
                      whileHover={{ x: 4 }}
                      onClick={() => handleChapterClick(chapter)}
                      className="group bg-white/5 hover:bg-white/10 rounded-xl p-4 cursor-pointer transition-all duration-300 border border-white/5 hover:border-white/20"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-primary font-bold">{chapter.number}</span>
                          </div>
                          <div>
                            <div className="font-semibold">
                              الفصل {chapter.number}
                            </div>
                            <div className="text-sm text-gray-400 line-clamp-1">
                              {chapter.title}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Eye size={14} />
                            {chapter.views}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            {new Date(chapter.createdAt).toLocaleDateString('en-GB')}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Pagination with Modal */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-8 pt-4 border-t border-white/10">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => goToPage(chaptersPage - 1)}
                    disabled={chaptersPage === 1}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                  >
                    <ChevronRight size={20} />
                    التالي
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsPageModalOpen(true)}
                    className="px-6 py-2 bg-primary/20 hover:bg-primary/30 rounded-xl transition-colors font-medium"
                  >
                    الصفحة {chaptersPage} من {totalPages}
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => goToPage(chaptersPage + 1)}
                    disabled={chaptersPage === totalPages}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                  >
                    <ChevronLeft size={20} />
                    السابق
                  </motion.button>
                </div>
              )}

              <PageSelectorModal
                isOpen={isPageModalOpen}
                onClose={() => setIsPageModalOpen(false)}
                totalPages={totalPages}
                currentPage={chaptersPage}
                onSelectPage={goToPage}
              />
            </motion.div>
          )}

          {/* Description Tab */}
          {activeTab === 'description' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-6"
            >
              <div 
                className="prose prose-invert max-w-none leading-relaxed"
                dangerouslySetInnerHTML={{ __html: novel.description }}
              />
            </motion.div>
          )}

          {/* Views Tab - Statistics */}
          {activeTab === 'views' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/5 rounded-2xl p-6 text-center border border-white/10">
                  <Eye className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                  <div className="text-3xl font-bold">{novel.views.toLocaleString('ar-EG')}</div>
                  <div className="text-gray-400 mt-1">إجمالي المشاهدات</div>
                </div>
                <div className="bg-white/5 rounded-2xl p-6 text-center border border-white/10">
                  <div className="text-3xl font-bold">{novel.chaptersCount}</div>
                  <div className="text-gray-400 mt-1">عدد الفصول</div>
                </div>
                <div className="bg-white/5 rounded-2xl p-6 text-center border border-white/10">
                  <div className="text-3xl font-bold">{novel.favorites.toLocaleString('ar-EG')}</div>
                  <div className="text-gray-400 mt-1">عدد المفضلات</div>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </main>

      {/* Chapter Reader Modal */}
      <AnimatePresence>
        {showReader && selectedChapter && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 overflow-y-auto"
            onClick={() => setShowReader(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="min-h-screen py-8 px-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="max-w-4xl mx-auto bg-[#0a0a0a] rounded-2xl shadow-2xl relative">
                <button
                  onClick={() => setShowReader(false)}
                  className="absolute top-4 left-4 z-10 p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>
                <div className="p-6 md:p-8">
                  <h1 className="text-2xl font-bold mb-6 text-center">
                    الفصل {selectedChapter.number}: {selectedChapter.title}
                  </h1>
                  <div 
                    className="chapter-content prose prose-invert max-w-none leading-loose"
                    style={{
                      fontSize: selectedChapter.copyrightStyles?.fontSize || 18,
                      textAlign: selectedChapter.copyrightStyles?.alignment === 'center' ? 'center' : 'right',
                    }}
                  >
                    {selectedChapter.copyrightStart && (
                      <div className="text-center text-gray-500 mb-6 pb-4 border-b border-white/10">
                        {selectedChapter.copyrightStart}
                      </div>
                    )}
                    <div 
                      dangerouslySetInnerHTML={{ 
                        __html: selectedChapter.content.replace(/\n/g, '<br/>') 
                      }} 
                    />
                    {selectedChapter.copyrightEnd && (
                      <div className="text-center text-gray-500 mt-6 pt-4 border-t border-white/10">
                        {selectedChapter.copyrightEnd}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}