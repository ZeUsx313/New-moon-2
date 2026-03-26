import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../context/AuthContext';
import {
  Star,
  ChevronLeft,
  ChevronRight,
  Heart,
  Eye,
  BookOpen,
  ArrowUpDown,
  Calendar,
  MessageCircle,
  Search,
  ThumbsUp,
  ThumbsDown,
  X,
  Check,
  Grid,
} from 'lucide-react';
import Header from '../components/Header';
import { novelService, Novel, ChapterMeta, ChapterFull } from '../services/novel';
import { commentService, Comment } from '../services/comment';
import { Skeleton, NovelPageSkeleton } from '../components/Skeleton';
import { CommentSection } from '../components/CommentSection';
import { PageSelectorModal } from '../components/PageSelectorModal';
import toast from 'react-hot-toast';

// Helper: format date as YYYY/M/D
const formatDate = (date: Date | string) => {
  const d = new Date(date);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
};

// Get status pill style (updated colors)
const getStatusStyle = (status: string) => {
  if (status === 'مستمرة') return 'bg-blue-500/20 text-blue-300 border-blue-500/30';   // أزرق غامق شفاف
  if (status === 'مكتملة') return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'; // أخضر غامق شفاف
  return 'bg-red-500/20 text-red-300 border-red-500/30'; // متوقفة
};

// Enhanced page selector modal with search and sort
const EnhancedPageSelectorModal = ({
  isOpen,
  onClose,
  totalPages,
  currentPage,
  onSelectPage,
  sortOrder,
  onToggleSort,
}: {
  isOpen: boolean;
  onClose: () => void;
  totalPages: number;
  currentPage: number;
  onSelectPage: (page: number) => void;
  sortOrder: 'asc' | 'desc';
  onToggleSort: () => void;
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Generate array of page numbers respecting sort order
  const pageNumbers = useMemo(() => {
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    return sortOrder === 'asc' ? pages : pages.reverse();
  }, [totalPages, sortOrder]);

  const filteredPages = pageNumbers.filter((p) =>
    p.toString().includes(searchQuery)
  );

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
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-md bg-black/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
          >
            <div className="p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">اختر الصفحة</h3>
                <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث برقم الصفحة..."
                    className="w-full bg-white/10 border border-white/20 rounded-xl py-2 pr-10 pl-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-primary transition-colors text-right"
                  />
                </div>
                <button
                  onClick={onToggleSort}
                  className="px-3 py-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
                  title={sortOrder === 'asc' ? 'ترتيب تصاعدي' : 'ترتيب تنازلي'}
                >
                  <ArrowUpDown size={18} className="text-white" />
                </button>
              </div>

              <div className="max-h-[50vh] overflow-y-auto">
                <div className="grid grid-cols-4 gap-2">
                  {filteredPages.map((page) => (
                    <button
                      key={page}
                      onClick={() => {
                        onSelectPage(page);
                        onClose();
                      }}
                      className={`py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        page === currentPage
                          ? 'bg-primary/30 text-primary border border-primary/50'
                          : 'bg-white/5 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                {filteredPages.length === 0 && (
                  <div className="text-center text-gray-400 py-8">
                    لا توجد صفحات تطابق البحث
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default function NovelPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, openAuthModal } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [novel, setNovel] = useState<Novel | null>(null);
  const [chapters, setChapters] = useState<ChapterMeta[]>([]);
  const [chaptersPage, setChaptersPage] = useState(1);
  const [totalChapters, setTotalChapters] = useState(0);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [loadingNovel, setLoadingNovel] = useState(true);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [activeTab, setActiveTab] = useState<'chapters' | 'description' | 'comments'>('chapters');
  const [chapterSearch, setChapterSearch] = useState('');
  const [selectedChapter, setSelectedChapter] = useState<ChapterFull | null>(null);
  const [showReader, setShowReader] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [userProgress, setUserProgress] = useState<{ progress: number; lastChapterId: number; readChapters: number[] }>({
    progress: 0,
    lastChapterId: 0,
    readChapters: [],
  });
  const [isPageModalOpen, setIsPageModalOpen] = useState(false);
  const [reactionStats, setReactionStats] = useState({ like: 0, love: 0, funny: 0, sad: 0, angry: 0 });
  const [userReaction, setUserReaction] = useState<string | null>(null);
  // Local read chapters for guest users
  const [localReadChapters, setLocalReadChapters] = useState<number[]>(() => {
    const stored = localStorage.getItem(`read_chapters_${slug}`);
    return stored ? JSON.parse(stored) : [];
  });

  const chaptersPerPage = 25;
  const totalPages = Math.ceil(totalChapters / chaptersPerPage);

  // Combine server and local read chapters
  const readChapters = useMemo(() => {
    const combined = new Set([...userProgress.readChapters, ...localReadChapters]);
    return Array.from(combined);
  }, [userProgress.readChapters, localReadChapters]);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Fetch novel data
  useEffect(() => {
    if (!slug) return;
    const fetchNovel = async () => {
      try {
        setLoadingNovel(true);
        const data = await novelService.getNovelById(slug);
        setNovel(data);
        setTotalChapters(data.chaptersCount);
        const token = localStorage.getItem('token');
        if (token) {
          const status = await novelService.getNovelStatus(slug);
          setIsFavorite(status.isFavorite);
          setUserProgress({
            progress: status.progress,
            lastChapterId: status.lastChapterId,
            readChapters: status.readChapters || [],
          });
        }
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoadingNovel(false);
      }
    };
    fetchNovel();
  }, [slug]);

  // Fetch chapters - ONLY WHEN TAB IS ACTIVE
  useEffect(() => {
    if (!slug || activeTab !== 'chapters') return;
    const fetchChapters = async () => {
      setLoadingChapters(true);
      try {
        const list = await novelService.getChaptersList(slug, chaptersPage, chaptersPerPage, sortOrder);
        setChapters(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingChapters(false);
      }
    };
    fetchChapters();
  }, [slug, chaptersPage, sortOrder, activeTab]);

  // Fetch comments and reactions - ONLY WHEN TAB IS ACTIVE
  useEffect(() => {
    if (!slug || activeTab !== 'comments') return;
    const fetchComments = async () => {
      setLoadingComments(true);
      try {
        const res = await commentService.getComments(slug, undefined, 1, 20);
        setComments(res.comments);
        if (res.stats) {
          setReactionStats({
            like: res.stats.like,
            love: res.stats.love,
            funny: res.stats.funny,
            sad: res.stats.sad,
            angry: res.stats.angry,
          });
          setUserReaction(res.stats.userReaction);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingComments(false);
      }
    };
    fetchComments();
  }, [slug, activeTab]);

  const handleReaction = async (type: 'like' | 'love' | 'funny' | 'sad' | 'angry') => {
    if (!slug) return;
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    try {
      const result = await novelService.reactToNovel(slug, type);
      setReactionStats({
        like: result.like,
        love: result.love,
        funny: result.funny,
        sad: result.sad,
        angry: result.angry,
      });
      setUserReaction(result.userReaction);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddToFavorites = async () => {
    if (!slug || !novel) return;
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    try {
      const newStatus = !isFavorite;
      // Optimistic update
      setIsFavorite(newStatus);
      setNovel((prev) => prev ? { ...prev, favorites: (prev.favorites || 0) + (newStatus ? 1 : -1) } : prev);
      await novelService.updateReadingStatus({
        novelId: slug,
        title: novel.title,
        cover: novel.cover,
        author: novel.author,
        isFavorite: newStatus,
      });
      toast.success(newStatus ? 'تمت الإضافة للمفضلة' : 'تم الحذف من المفضلة');
    } catch (err) {
      // Rollback
      setIsFavorite(!isFavorite);
      setNovel((prev) => prev ? { ...prev, favorites: (prev.favorites || 0) + (isFavorite ? 1 : -1) } : prev);
      toast.error('فشلت العملية');
    }
  };

  const handleChapterClick = (chapter: ChapterMeta) => {
    if (!slug) return;
    // Navigate to reader
    navigate(`/novel/${slug}/reader/${chapter.number}`);
    // Mark as read locally (optimistic)
    if (!readChapters.includes(chapter.number)) {
      const newRead = [...readChapters, chapter.number];
      if (localStorage.getItem('token')) {
        // Will be updated on server when reading chapter
      } else {
        localStorage.setItem(`read_chapters_${slug}`, JSON.stringify(newRead));
        setLocalReadChapters(newRead);
      }
    }
  };

  const handleAddComment = async (content: string) => {
    if (!slug) return;
    try {
      const comment = await commentService.addComment(slug, content);
      setComments([comment, ...comments]);
      toast.success('تم إضافة التعليق');
    } catch (err: any) {
      toast.error(err.message || 'فشل إضافة التعليق');
    }
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    setChaptersPage(1);
  };

  const goToPage = (page: number) => {
    setChaptersPage(Math.min(Math.max(1, page), totalPages));
  };

  const filteredChapters = chapters.filter(ch =>
    ch.number.toString().includes(chapterSearch) ||
    ch.title.toLowerCase().includes(chapterSearch.toLowerCase())
  );

  // Render description with preserved line breaks
  const renderDescription = (text: string) => {
    if (!text) return null;
    if (text.includes('<') && text.includes('>')) {
      return <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: text }} />;
    }
    const paragraphs = text.split(/\n\s*\n/);
    return (
      <div className="prose dark:prose-invert max-w-none">
        {paragraphs.map((para, idx) => (
          <p key={idx} className="mb-4 leading-relaxed">
            {para.split('\n').map((line, i) => (
              <React.Fragment key={i}>
                {line}
                {i < para.split('\n').length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        ))}
      </div>
    );
  };

  if (loadingNovel) {
    return <NovelPageSkeleton />;
  }

  if (!novel) {
    return (
      <div className="min-h-screen bg-background text-foreground" dir="rtl">
        <Header isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
        <div className="flex items-center justify-center h-64">الرواية غير موجودة</div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>قمر الروايات - {novel.title}</title>
        <meta name="description" content={`اقرأ رواية ${novel.title} على قمر الروايات. ${novel.description?.slice(0, 150)}...`} />
        <meta name="keywords" content={`${novel.title}, رواية ${novel.title}, ${novel.author}, ${novel.tags?.join(', ')}, روايات عربية, روايات مترجمة`} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="book" />
        <meta property="og:url" content={`https://moonnovel.vercel.app/novel/${slug}`} />
        <meta property="og:title" content={`رواية ${novel.title} - قمر الروايات`} />
        <meta property="og:description" content={novel.description?.slice(0, 160)} />
        <meta property="og:image" content={novel.cover} />
        <meta property="book:author" content={novel.author} />
        <meta property="book:tag" content={novel.tags?.join(', ')} />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={`https://moonnovel.vercel.app/novel/${slug}`} />
        <meta property="twitter:title" content={`رواية ${novel.title} - قمر الروايات`} />
        <meta property="twitter:description" content={novel.description?.slice(0, 160)} />
        <meta property="twitter:image" content={novel.cover} />

        {/* AI Crawlers & SEO */}
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={`https://moonnovel.vercel.app/novel/${slug}`} />

        {/* Structured Data (JSON-LD) */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Book",
            "name": novel.title,
            "author": {
              "@type": "Person",
              "name": novel.author
            },
            "description": novel.description,
            "image": novel.cover,
            "genre": novel.tags?.join(', '),
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": novel.rating,
              "reviewCount": novel.views
            }
          })}
        </script>
      </Helmet>
      <div className="relative min-h-screen bg-background text-foreground" style={{ fontFamily: "'Cairo', sans-serif" }}>
        <Header isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />

        {/* Background */}
        <div className="fixed w-full h-screen z-0 top-0 left-0">
          <img
            alt="Background"
            width={1920}
            height={1080}
            onContextMenu={(e) => e.preventDefault()}
            draggable={false}
            className="object-cover object-top opacity-40 dark:opacity-100 select-none"
            src={novel.cover}
          />
          <div className="hidden dark:block" style={{ background: 'linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.9), rgba(0,0,0,0.9), rgb(0,0,0))', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}></div>
          <div className="block dark:hidden" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(248,250,252,0.70) 35%, rgba(255,255,255,0.90) 70%, rgba(255,255,255,0.98) 100%)', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}></div>
        </div>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-[1400px] mx-auto my-6 sm:px-2 md:px-4 lg:px-6 relative z-10"
        >
          <div className="flex flex-col gap-4 lg:gap-5 sm:flex-row">
            {/* Left Column */}
            <div className="flex w-full h-auto shrink-0 flex-col gap-3 rounded-lg sm:w-[240px] lg:w-[240px] xl:w-[270px] px-2 sm:p-0 md:sticky md:top-[76px] md:self-start">
              <motion.img
                whileHover={{ scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 300 }}
                alt={`Cover of ${novel.title}`}
                loading="eager"
                width={400}
                height={320}
                onContextMenu={(e) => e.preventDefault()}
                draggable={false}
                className="w-full rounded-lg object-cover object-bottom sm:max-h-[400px] h-auto select-none"
                src={novel.cover}
              />
              <div className="hidden sm:block">
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-[.5rem] text-[.75rem] leading-4">
                    <div>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => chapters.length > 0 && handleChapterClick(chapters[0])}
                        className="items-center whitespace-nowrap text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-white px-4 h-full w-full rounded bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300 font-bold py-3"
                      >
                        <BookOpen size={18} className="inline ml-2" />
                        اقرأ الفصل {chapters[0]?.number || '1'}
                      </motion.button>
                    </div>
                    <div>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleAddToFavorites}
                        className={`inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 px-4 py-2 select-none w-full rounded h-12 font-bold transition-all duration-300 ${
                          isFavorite
                            ? 'bg-gradient-to-r from-primary/20 to-primary/10 text-primary border border-primary/30'
                            : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 border border-white/20'
                        }`}
                      >
                        <Heart size={16} className={`ml-1 ${isFavorite ? 'fill-primary' : ''}`} />
                        {isFavorite ? 'تمت الإضافة' : 'إضافة للمفضلة'}
                      </motion.button>
                    </div>
                  </div>
                </div>
                <div className="flex-center pt-2">
                  <button className="justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 px-4 py-2 w-full rounded h-12 bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-flag w-5 h-5">
                      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
                      <line x1="4" x2="4" y1="22" y2="15"></line>
                    </svg>
                    الإبلاغ عن مشكلة
                  </button>
                </div>
              </div>

              {/* Stats: Views & Favorites */}
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10">
                  <Eye className="w-6 h-6 text-blue-400 mx-auto mb-1" />
                  <div className="text-2xl font-bold">{novel.views.toLocaleString('en-US')}</div>
                  <div className="text-xs text-gray-400">مشاهدة</div>
                </div>
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10">
                  <Heart className="w-6 h-6 text-pink-400 mx-auto mb-1" />
                  <div className="text-2xl font-bold">{novel.favorites.toLocaleString('en-US')}</div>
                  <div className="text-xs text-gray-400">مفضلة</div>
                </div>
              </div>

              <div className="h-px bg-white/10 my-2" />

              <div className="text-foreground space-y-3">
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm font-medium text-gray-400">الحالة</span>
                  <span className={`px-3 py-1 rounded-md text-xs font-medium border ${getStatusStyle(novel.status)}`}>
                    {novel.status}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm font-medium text-gray-400">التصنيفات</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {novel.tags?.slice(0, 3).map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded text-xs bg-primary/20 text-primary">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm font-medium text-gray-400">الفصول</span>
                  <span className="text-sm">{totalChapters}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm font-medium text-gray-400">آخر تحديث</span>
                  <span className="text-sm">{formatDate(novel.lastChapterUpdate)}</span>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="flex flex-1 min-w-0 flex-col gap-3 px-2 sm:px-3 py-4">
              <div className="flex flex-col gap-1 md:gap-2">
                <h1 className="text-2xl font-bold text-foreground leading-[1.5rem]">{novel.title}</h1>
                <div className="text-sm text-gray-400">بواسطة {novel.author}</div>
              </div>

              {/* Small screen action buttons (same enhanced style) */}
              <div className="block lg:hidden md:hidden sm:hidden">
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-[.5rem] text-[.75rem] leading-4">
                    <div>
                      <button
                        onClick={() => chapters.length > 0 && handleChapterClick(chapters[0])}
                        className="items-center whitespace-nowrap text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-white px-4 h-full w-full rounded bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300 font-bold py-3"
                      >
                        <BookOpen size={18} className="inline ml-2" />
                        اقرأ الفصل {chapters[0]?.number || '1'}
                      </button>
                    </div>
                    <div>
                      <button
                        onClick={handleAddToFavorites}
                        className={`inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 px-4 py-2 select-none w-full rounded h-12 font-bold transition-all duration-300 ${
                          isFavorite
                            ? 'bg-gradient-to-r from-primary/20 to-primary/10 text-primary border border-primary/30'
                            : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 border border-white/20'
                        }`}
                      >
                        <Heart size={16} className={`ml-1 ${isFavorite ? 'fill-primary' : ''}`} />
                        {isFavorite ? 'تمت الإضافة' : 'إضافة للمفضلة'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-px bg-white/10 my-2" />

              {/* Tabs */}
              <div className="flex border-b border-white/10">
                <button
                  onClick={() => setActiveTab('chapters')}
                  className={`px-4 py-2 font-medium transition-colors relative ${activeTab === 'chapters' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  الفصول ({totalChapters})
                  {activeTab === 'chapters' && (
                    <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('description')}
                  className={`px-4 py-2 font-medium transition-colors relative ${activeTab === 'description' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  الملخص
                  {activeTab === 'description' && (
                    <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('comments')}
                  className={`px-4 py-2 font-medium transition-colors relative ${activeTab === 'comments' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  التعليقات ({comments.length})
                  {activeTab === 'comments' && (
                    <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
              </div>

              {/* Chapters Tab */}
              {activeTab === 'chapters' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pr-10 pl-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-primary transition-colors"
                        placeholder="البحث برقم الفصل أو العنوان..."
                        value={chapterSearch}
                        onChange={(e) => setChapterSearch(e.target.value)}
                      />
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={toggleSortOrder}
                      className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
                    >
                      <ArrowUpDown size={18} />
                      <span>{sortOrder === 'asc' ? 'الأحدث أولاً' : 'الأقدم أولاً'}</span>
                    </motion.button>
                  </div>

                  <div className="space-y-2">
                    {loadingChapters ? (
                      <Skeleton className="h-16 rounded-xl" count={5} />
                    ) : filteredChapters.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">لا توجد فصول مطابقة</div>
                    ) : (
                      filteredChapters.map((chapter) => {
                        const isRead = readChapters.includes(chapter.number);
                        return (
                          <div
                            key={chapter._id}
                            onClick={() => handleChapterClick(chapter)}
                            className="flex flex-1 bg-white/5 border border-white/10 hover:bg-white/10 relative rounded-lg p-2 sm:p-3 transition-colors cursor-pointer"
                          >
                            <div className="w-full h-full flex items-center justify-between gap-2 sm:gap-3">
                              <div className="flex w-full items-center text-left justify-between text-gray-900 dark:text-white min-w-0">
                                <div className="relative w-[60px] h-[60px] sm:w-[70px] sm:h-[70px] shrink-0 overflow-hidden rounded-md border border-white/10 bg-black/30">
                                  <img
                                    alt={`الفصل ${chapter.number}`}
                                    loading="lazy"
                                    onContextMenu={(e) => e.preventDefault()}
                                    draggable={false}
                                    className="object-cover rounded-md absolute inset-0 w-full h-full select-none"
                                    src={novel.cover}
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-md">
                                    <span className={`text-white font-bold text-lg ${isRead ? 'opacity-50' : ''}`}>
                                      {chapter.number}
                                    </span>
                                  </div>
                                  {isRead && (
                                    <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-green-500 border border-white/30" />
                                  )}
                                </div>
                                <div className="flex w-full flex-col pr-2 sm:pr-[.875rem] ml-2 min-w-0">
                                  <div className="flex flex-row gap-1 items-center">
                                    <span className={`text-sm sm:text-base font-semibold font-cairo line-clamp-1 ${isRead ? 'text-gray-500' : 'text-white'}`}>
                                      {chapter.title || `الفصل ${chapter.number}`}
                                    </span>
                                  </div>
                                  <div className="flex flex-col sm:flex-row sm:justify-start sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-gray-400 mt-1">
                                    <time dateTime={chapter.createdAt}>{formatDate(chapter.createdAt)}</time>
                                  </div>
                                </div>
                              </div>
                              <div className="last flex flex-row items-center gap-2 sm:gap-3 pr-2 sm:pr-4">
                                <div className="flex items-center gap-1.5">
                                  <Eye size={14} className="text-gray-500" />
                                  <p className="text-sm font-bold text-gray-400">{chapter.views}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                      {/* Previous button (now correctly labeled السابق) */}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => goToPage(chaptersPage - 1)}
                        disabled={chaptersPage === 1}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                      >
                        <ChevronLeft size={20} />
                        <span>السابق</span>
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsPageModalOpen(true)}
                        className="px-6 py-2 bg-primary/20 hover:bg-primary/30 rounded-xl transition-colors font-medium"
                      >
                        الصفحة {chaptersPage} من {totalPages}
                      </motion.button>

                      {/* Next button (now correctly labeled التالي) */}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => goToPage(chaptersPage + 1)}
                        disabled={chaptersPage === totalPages}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                      >
                        <span>التالي</span>
                        <ChevronRight size={20} />
                      </motion.button>
                    </div>
                  )}

                  <EnhancedPageSelectorModal
                    isOpen={isPageModalOpen}
                    onClose={() => setIsPageModalOpen(false)}
                    totalPages={totalPages}
                    currentPage={chaptersPage}
                    onSelectPage={goToPage}
                    sortOrder={sortOrder}
                    onToggleSort={toggleSortOrder}
                  />
                </div>
              )}

              {/* Description Tab */}
              {activeTab === 'description' && renderDescription(novel.description)}

              {/* Comments Tab */}
              {activeTab === 'comments' && (
                <>
                  {/* Reactions Row */}
                  <div className="flex flex-wrap justify-center gap-4 py-4 border-b border-white/10 mb-4">
                    <button onClick={() => handleReaction('like')} className={`flex flex-col items-center gap-1 p-2 rounded-lg transition ${userReaction === 'like' ? 'bg-blue-500/20' : 'hover:bg-white/5'}`}>
                      <ThumbsUp className="w-8 h-8" />
                      <span>{reactionStats.like}</span>
                    </button>
                    <button onClick={() => handleReaction('love')} className={`flex flex-col items-center gap-1 p-2 rounded-lg transition ${userReaction === 'love' ? 'bg-red-500/20' : 'hover:bg-white/5'}`}>
                      <Heart className="w-8 h-8 text-red-500" />
                      <span>{reactionStats.love}</span>
                    </button>
                    <button onClick={() => handleReaction('funny')} className={`flex flex-col items-center gap-1 p-2 rounded-lg transition ${userReaction === 'funny' ? 'bg-yellow-500/20' : 'hover:bg-white/5'}`}>
                      <span className="text-2xl">😂</span>
                      <span>{reactionStats.funny}</span>
                    </button>
                    <button onClick={() => handleReaction('sad')} className={`flex flex-col items-center gap-1 p-2 rounded-lg transition ${userReaction === 'sad' ? 'bg-blue-500/20' : 'hover:bg-white/5'}`}>
                      <span className="text-2xl">😢</span>
                      <span>{reactionStats.sad}</span>
                    </button>
                    <button onClick={() => handleReaction('angry')} className={`flex flex-col items-center gap-1 p-2 rounded-lg transition ${userReaction === 'angry' ? 'bg-red-500/20' : 'hover:bg-white/5'}`}>
                      <span className="text-2xl">😠</span>
                      <span>{reactionStats.angry}</span>
                    </button>
                  </div>

                  <CommentSection
                    novelId={slug!}
                    comments={comments}
                    loading={loadingComments}
                    onAddComment={handleAddComment}
                  />
                </>
              )}
            </div>
          </div>
        </motion.section>

        {/* Chapter Reader Modal (not used now, but keep for potential future) */}
        {/* <ChapterReader chapter={selectedChapter} isOpen={showReader} onClose={() => setShowReader(false)} /> */}
      </div>
    </>
  );
}