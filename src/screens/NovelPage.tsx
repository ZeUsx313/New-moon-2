import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import Header from '../components/Header';
import { novelService, Novel, ChapterMeta, ChapterFull } from '../services/novel';
import { commentService, Comment } from '../services/comment';
import { Star, ChevronLeft, ChevronRight, Heart, Eye, BookOpen, ArrowUpDown, Calendar, MessageCircle, Search, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Skeleton, NovelPageSkeleton } from '../components/Skeleton';
import { CommentSection } from '../components/CommentSection';
import { ChapterReader } from '../components/ChapterReader';
import { PageSelectorModal } from '../components/PageSelectorModal';

export default function NovelPage() {
  const { slug } = useParams<{ slug: string }>();
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

  const chaptersPerPage = 25;
  const totalPages = Math.ceil(totalChapters / chaptersPerPage);

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  };

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

  // Fetch chapters
  useEffect(() => {
    if (!slug) return;
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
  }, [slug, chaptersPage, sortOrder]);

  // Fetch comments and reactions
  useEffect(() => {
    if (!slug) return;
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
  }, [slug]);

  const handleReaction = async (type: 'like' | 'love' | 'funny' | 'sad' | 'angry') => {
    if (!slug) return;
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
    try {
      await novelService.updateReadingStatus({
        novelId: slug,
        title: novel.title,
        cover: novel.cover,
        author: novel.author,
        isFavorite: !isFavorite,
      });
      setIsFavorite(!isFavorite);
    } catch (err) {
      console.error(err);
    }
  };

  const handleChapterClick = async (chapter: ChapterMeta) => {
    if (!slug) return;
    try {
      const full = await novelService.getChapter(slug, chapter._id);
      setSelectedChapter(full);
      setShowReader(true);
      if (userProgress.readChapters.indexOf(chapter.number) === -1) {
        const newRead = [...userProgress.readChapters, chapter.number];
        setUserProgress(prev => ({ ...prev, readChapters: newRead, lastChapterId: chapter.number }));
        await novelService.updateReadingStatus({
          novelId: slug,
          lastChapterId: chapter.number,
          lastChapterTitle: full.title,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (content: string) => {
    if (!slug) return;
    try {
      const comment = await commentService.addComment(slug, content);
      setComments([comment, ...comments]);
    } catch (err: any) {
      alert(err.message);
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

  const getStatusStyle = (status: string) => {
    if (status === 'مستمرة') return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    if (status === 'مكتملة') return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    return 'bg-red-500/20 text-red-300 border-red-500/30';
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
    <div className="relative min-h-screen bg-background text-foreground">
      <Header isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />

      {/* Background */}
      <div className="fixed w-full h-screen z-0 top-0 left-0">
        <img
          alt="Background"
          width={1920}
          height={1080}
          className="object-cover object-top opacity-40 dark:opacity-100"
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
              className="w-full rounded-lg object-cover object-bottom sm:max-h-[400px] h-auto"
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
                      className="items-center whitespace-nowrap text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-white px-4 h-full w-full rounded bg-white/20 backdrop-blur-sm font-bold py-3 hover:bg-white/30"
                    >
                      اقرأ الفصل {chapters[0]?.number || '1'}
                    </motion.button>
                  </div>
                  <div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleAddToFavorites}
                      className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-white px-4 py-2 select-none w-full rounded h-12 bg-white/20 backdrop-blur-sm hover:bg-white/30"
                    >
                      <Heart size={16} className={`ml-1 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
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

            {/* Small screen action buttons (glass style with white text) */}
            <div className="block lg:hidden md:hidden sm:hidden">
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-[.5rem] text-[.75rem] leading-4">
                  <div>
                    <button
                      onClick={() => chapters.length > 0 && handleChapterClick(chapters[0])}
                      className="items-center whitespace-nowrap text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-white px-4 h-full w-full rounded bg-white/20 backdrop-blur-sm font-bold py-3 hover:bg-white/30"
                    >
                      اقرأ الفصل {chapters[0]?.number || '1'}
                    </button>
                  </div>
                  <div>
                    <button
                      onClick={handleAddToFavorites}
                      className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-white px-4 py-2 select-none w-full rounded h-12 bg-white/20 backdrop-blur-sm hover:bg-white/30"
                    >
                      <Heart size={16} className={`ml-1 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
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
                    filteredChapters.map((chapter) => (
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
                                className="object-cover rounded-md absolute inset-0 w-full h-full"
                                src={novel.cover}
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-md">
                                <span className="text-white font-bold text-lg">{chapter.number}</span>
                              </div>
                            </div>
                            <div className="flex w-full flex-col pr-2 sm:pr-[.875rem] ml-2 min-w-0">
                              <div className="flex flex-row gap-1 items-center">
                                <span className="text-xs sm:text-sm font-medium line-clamp-1">{chapter.title || `الفصل ${chapter.number}`}</span>
                              </div>
                              <div className="flex flex-col sm:flex-row sm:justify-start sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-gray-400 mt-1">
                                <time dateTime={chapter.createdAt}>{formatDate(chapter.createdAt)}</time>
                              </div>
                            </div>
                          </div>
                          <div className="last flex flex-row items-center justify-between gap-2 sm:gap-3 pr-2 sm:pr-4">
                            <div className="flex items-center gap-1.5">
                              <MessageCircle size={14} className="text-gray-500" />
                              <p className="text-sm font-bold text-gray-400">0</p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Eye size={14} className="text-gray-500" />
                              <p className="text-sm font-bold text-gray-400">{chapter.views}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
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
              </div>
            )}

            {/* Description Tab */}
            {activeTab === 'description' && (
              <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: novel.description }} />
            )}

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

      <ChapterReader
        chapter={selectedChapter}
        isOpen={showReader}
        onClose={() => setShowReader(false)}
      />
    </div>
  );
}