import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import Header from '../components/Header';
import { novelService, Novel, ChapterMeta, ChapterFull } from '../services/novel';
import { commentService, Comment, CommentStats } from '../services/comment';
import { Star, Lock, ChevronLeft, ChevronRight, MessageCircle, Heart, ThumbsUp, ThumbsDown } from 'lucide-react';

export default function NovelPage() {
  const { slug } = useParams<{ slug: string }>(); // slug هو _id لأننا سنستخدم id
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [novel, setNovel] = useState<Novel | null>(null);
  const [chapters, setChapters] = useState<ChapterMeta[]>([]);
  const [chaptersPage, setChaptersPage] = useState(1);
  const [totalChapters, setTotalChapters] = useState(0);
  const [loadingNovel, setLoadingNovel] = useState(true);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [activeTab, setActiveTab] = useState<'chapters' | 'description' | 'ratings'>('chapters');
  const [chapterSearch, setChapterSearch] = useState('');
  const [selectedChapter, setSelectedChapter] = useState<ChapterFull | null>(null);
  const [showReader, setShowReader] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsStats, setCommentsStats] = useState<CommentStats | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const [reactionStats, setReactionStats] = useState({ like: 0, love: 0, funny: 0, sad: 0, angry: 0 });
  const [isFavorite, setIsFavorite] = useState(false);
  const [userProgress, setUserProgress] = useState<{ progress: number; lastChapterId: number; readChapters: number[] }>({
    progress: 0,
    lastChapterId: 0,
    readChapters: [],
  });

  useEffect(() => {
    if (!slug) return;
    const fetchNovel = async () => {
      try {
        setLoadingNovel(true);
        const data = await novelService.getNovelById(slug);
        setNovel(data);
        setTotalChapters(data.chaptersCount);
        // جلب حالة المستخدم إذا كان مسجلاً
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

  useEffect(() => {
    if (!slug) return;
    const fetchChapters = async () => {
      setLoadingChapters(true);
      try {
        const list = await novelService.getChaptersList(slug, chaptersPage, 25);
        setChapters(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingChapters(false);
      }
    };
    fetchChapters();
  }, [slug, chaptersPage]);

  useEffect(() => {
    if (!slug) return;
    const fetchComments = async () => {
      setLoadingComments(true);
      try {
        const res = await commentService.getComments(slug, undefined, 1, 20);
        setComments(res.comments);
        setCommentsStats(res.stats);
        setUserReaction(res.stats.userReaction);
        setReactionStats({
          like: res.stats.like,
          love: res.stats.love,
          funny: res.stats.funny,
          sad: res.stats.sad,
          angry: res.stats.angry,
        });
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
      const res = await novelService.updateReadingStatus({
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
      // تحديث تقدم القراءة
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

  const handleAddComment = async () => {
    if (!slug || !newComment.trim()) return;
    try {
      const comment = await commentService.addComment(slug, newComment);
      setComments([comment, ...comments]);
      setNewComment('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredChapters = chapters.filter(ch =>
    ch.number.toString().includes(chapterSearch) ||
    ch.title.toLowerCase().includes(chapterSearch.toLowerCase())
  );

  if (loadingNovel || !novel) {
    return (
      <div className="min-h-screen bg-background text-foreground" dir="rtl">
        <Header isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
        <div className="flex items-center justify-center h-64">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <Header isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />

      {/* خلفية ثابتة */}
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

      <section className="max-w-[1400px] mx-auto my-6 sm:px-2 md:px-4 lg:px-6 relative z-10">
        <div className="flex flex-col gap-4 lg:gap-5 sm:flex-row">
          {/* العمود الأيسر */}
          <div className="flex w-full h-auto shrink-0 flex-col gap-3 rounded-lg sm:w-[240px] lg:w-[240px] xl:w-[270px] px-2 sm:p-0 md:sticky md:top-[76px] md:self-start">
            <img
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
                    <button
                      onClick={() => chapters.length > 0 && handleChapterClick(chapters[0])}
                      className="items-center whitespace-nowrap text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-primary-foreground px-4 h-full w-full rounded bg-[#d61a4c] hover:bg-[#d61a4c]/80 flex justify-center content-center font-bold py-3"
                    >
                      اقرأ الفصل {chapters[0]?.number || '1'}
                    </button>
                  </div>
                  <div>
                    <button
                      onClick={handleAddToFavorites}
                      className={`inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-primary-foreground px-4 py-2 select-none w-full rounded h-12 ${isFavorite ? 'bg-[#186ae6]/80' : 'bg-[#186ae6]'} hover:bg-[#186ae6]/80`}
                    >
                      <span className="text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="inline-block mx-1 size-4">
                          <path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0 1 11.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 0 1-1.085.67L12 18.089l-7.165 3.583A.75.75 0 0 1 3.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93Z" clipRule="evenodd"></path>
                        </svg>
                        <span className="font-normal">{isFavorite ? 'تمت الإضافة' : 'إضافة للمفضلة'}</span>
                      </span>
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex-center pt-2">
                <button className="justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 px-4 py-2 w-full rounded h-12 bg-neutral-700 hover:bg-neutral-600 text-white flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-flag w-5 h-5">
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
                    <line x1="4" x2="4" y1="22" y2="15"></line>
                  </svg>
                  الإبلاغ عن مشكلة
                </button>
              </div>
            </div>

            <span className="flex-center gap-3">
              <li className="bg-[#29292966]/40 w-full h-14 flex items-center justify-center gap-2 rounded">
                <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                <div className="flex flex-col">
                  <span className="font-bold text-sm leading-4">{novel.rating}</span>
                  <small className="text-[10px] leading-3">التقييمات</small>
                </div>
              </li>
              <div data-orientation="vertical" role="none" className="shrink-0 !bg-[#ffffff1f] w-[1px] h-[50%]"></div>
              <li className="bg-[#29292966]/40 w-full h-14 flex items-center justify-center gap-2 rounded">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#22d3ee" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bookmark inline-block w-6 h-6 text-[#22d3ee]">
                  <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
                </svg>
                <div className="flex flex-col">
                  <span className="font-bold text-sm leading-4">{novel.favorites}</span>
                  <small className="text-[10px] leading-3">المفضلة</small>
                </div>
              </li>
            </span>

            <div data-orientation="horizontal" role="none" className="shrink-0 !bg-[#ffffff1f] h-[1px] w-full"></div>

            <div className="text-foreground">
              <div className="flex sm:justify-between justify-start items-center gap-2">
                <h1 className="font-semibold text-medium">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-dna inline-block mx-1">
                    <path d="M2 15c6.667-6 13.333 0 20-6"></path>
                    <path d="M9 22c1.798-1.998 2.518-3.995 2.807-5.993"></path>
                    <path d="M15 2c-1.798 1.998-2.518 3.995-2.807 5.993"></path>
                    <path d="m17 6-2.5-2.5"></path>
                    <path d="m14 8-1-1"></path>
                    <path d="m7 18 2.5 2.5"></path>
                    <path d="m3.5 14.5.5.5"></path>
                    <path d="m20 9 .5.5"></path>
                    <path d="m6.5 12.5 1 1"></path>
                    <path d="m16.5 10.5 1 1"></path>
                    <path d="m10 16 1.5 1.5"></path>
                  </svg>
                  الحالة
                </h1>
                <div className="flex items-center ">
                  <span className={`h-[10px] w-[10px] mx-1 rounded-full inline-block relative ${novel.status === 'مستمرة' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <p className="font-normal text-xs inline ml-1 text-foreground">{novel.status}</p>
                </div>
              </div>
              <div className="flex sm:justify-between justify-start items-center gap-2">
                <h1 className="font-semibold text-medium">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-type inline-block mx-1">
                    <polyline points="4 7 4 4 20 4 20 7"></polyline>
                    <line x1="9" x2="15" y1="20" y2="20"></line>
                    <line x1="12" x2="12" y1="4" y2="20"></line>
                  </svg>
                  النوع
                </h1>
                <div className="inline">
                  <span className="px-2 py-1 rounded-[4px] text-xs font-medium inline-block border text-foreground bg-background/10 border-foreground/20">مانهوا</span>
                </div>
              </div>
              <div className="flex sm:justify-between justify-start items-center gap-2">
                <h1 className="font-semibold text-medium">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-book inline-block mx-1">
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>
                  </svg>
                  الفصول
                </h1>
                <div className="inline">
                  <p className="font-normal text-xs inline ml-1 text-foreground">{totalChapters}</p>
                </div>
              </div>
              <div className="flex sm:justify-between justify-start items-center gap-2">
                <h1 className="font-semibold text-medium">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar inline-block mx-1">
                    <path d="M8 2v4"></path>
                    <path d="M16 2v4"></path>
                    <rect width="18" height="18" x="3" y="4" rx="2"></rect>
                    <path d="M3 10h18"></path>
                  </svg>
                  آخر تحديث
                </h1>
                <div className="inline">
                  <p className="font-normal text-xs inline ml-1 text-foreground">{new Date(novel.lastChapterUpdate).toLocaleDateString('ar-EG')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* العمود الأيمن */}
          <div className="flex flex-1 min-w-0 flex-col gap-3 px-2 sm:px-3 py-4">
            <div className="flex flex-col gap-1 md:gap-2">
              <h1 className="text-2xl font-bold text-foreground leading-[1.5rem]">{novel.title}</h1>
              <div className="text-sm text-gray-400">بواسطة {novel.author}</div>
            </div>

            {/* أزرار للشاشات الصغيرة */}
            <div className="block lg:hidden md:hidden sm:hidden">
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-[.5rem] text-[.75rem] leading-4">
                  <div>
                    <button
                      onClick={() => chapters.length > 0 && handleChapterClick(chapters[0])}
                      className="items-center whitespace-nowrap text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-primary-foreground px-4 h-full w-full rounded bg-[#d61a4c] hover:bg-[#d61a4c]/80 flex justify-center content-center font-bold py-3"
                    >
                      اقرأ الفصل {chapters[0]?.number || '1'}
                    </button>
                  </div>
                  <div>
                    <button
                      onClick={handleAddToFavorites}
                      className={`inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-primary-foreground px-4 py-2 select-none w-full rounded h-12 ${isFavorite ? 'bg-[#186ae6]/80' : 'bg-[#186ae6]'} hover:bg-[#186ae6]/80`}
                    >
                      <span className="text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="inline-block mx-1 size-4">
                          <path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0 1 11.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 0 1-1.085.67L12 18.089l-7.165 3.583A.75.75 0 0 1 3.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93Z" clipRule="evenodd"></path>
                        </svg>
                        <span className="font-normal">{isFavorite ? 'تمت الإضافة' : 'إضافة للمفضلة'}</span>
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div data-orientation="horizontal" role="none" className="shrink-0 !bg-[#ffffff1f] h-[1px] w-full text-muted"></div>

            {/* تبويبات */}
            <div className="flex border-b border-border">
              <button
                onClick={() => setActiveTab('chapters')}
                className={`px-4 py-2 font-medium ${activeTab === 'chapters' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
              >
                الفصول ({totalChapters})
              </button>
              <button
                onClick={() => setActiveTab('description')}
                className={`px-4 py-2 font-medium ${activeTab === 'description' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
              >
                الملخص
              </button>
              <button
                onClick={() => setActiveTab('ratings')}
                className={`px-4 py-2 font-medium ${activeTab === 'ratings' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
              >
                التفاعلات
              </button>
            </div>

            {/* محتوى التبويبات */}
            {activeTab === 'chapters' && (
              <div className="space-y-4">
                <div className="relative">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-search absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.3-4.3"></path>
                  </svg>
                  <input
                    type="text"
                    className="flex h-10 rounded-md border px-3 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-10 pr-4 py-2 w-full bg-gray-100/50 border-gray-300/50 focus:border-gray-400 focus:ring-0 dark:bg-white/5 dark:border-white/10 dark:focus:border-white/20"
                    placeholder="البحث برقم الفصل أو العنوان..."
                    value={chapterSearch}
                    onChange={(e) => setChapterSearch(e.target.value)}
                  />
                </div>

                <div className="mt-4 space-y-2">
                  {loadingChapters ? (
                    <div className="text-center py-8">جاري تحميل الفصول...</div>
                  ) : filteredChapters.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">لا توجد فصول مطابقة</div>
                  ) : (
                    filteredChapters.map((chapter) => (
                      <div key={chapter._id} className="flex flex-1 bg-gray-100/50 border border-gray-200/60 hover:bg-gray-200/50 dark:bg-[hsla(0,0%,55%,.05)] dark:border-[rgba(255,255,255,.12)] dark:hover:bg-[hsla(0,0%,55%,.08)] relative rounded-lg p-2 sm:p-3 transition-colors cursor-pointer" onClick={() => handleChapterClick(chapter)}>
                        <div className="w-full h-full flex items-center justify-between gap-2 sm:gap-3">
                          <div className="flex w-full items-center text-left justify-between text-gray-900 dark:text-white min-w-0">
                            <div className="relative w-[60px] h-[60px] sm:w-[70px] sm:h-[70px] shrink-0 overflow-hidden rounded-md border border-gray-300 dark:border-white/10">
                              <img
                                alt={`الفصل ${chapter.number}`}
                                draggable="false"
                                loading="lazy"
                                className="object-cover rounded-md absolute inset-0 w-full h-full"
                                src={novel.cover}
                              />
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-md">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="text-white w-6 h-6">
                                  <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clipRule="evenodd"></path>
                                </svg>
                              </div>
                            </div>
                            <div className="flex w-full flex-col pr-2 sm:pr-[.875rem] ml-2 min-w-0">
                              <div className="flex flex-row gap-1 items-center">
                                <span className="text-xs sm:text-sm font-medium">الفصل {chapter.number}</span>
                              </div>
                              <div className="flex flex-col sm:flex-row sm:justify-start sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                                <time dateTime={chapter.createdAt}>{new Date(chapter.createdAt).toLocaleDateString('ar-EG')}</time>
                              </div>
                            </div>
                          </div>
                          <div className="last flex flex-row items-center justify-between gap-2 sm:gap-3 pr-2 sm:pr-4">
                            <div className="flex items-center gap-1.5">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle w-4 h-4 sm:w-5 sm:h-5 text-[#aab8c2]">
                                <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"></path>
                              </svg>
                              <p className="text-lg sm:text-2xl font-bold text-[#aab8c2]">0</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Heart className="w-4 h-4 text-muted-foreground hover:text-red-400" />
                              <p className="text-lg sm:text-2xl font-bold text-[#aab8c2]">{chapter.views}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {totalChapters > 25 && (
                  <div className="flex justify-center gap-2 pt-4">
                    <button
                      onClick={() => setChaptersPage(p => Math.max(1, p - 1))}
                      disabled={chaptersPage === 1}
                      className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50"
                    >
                      السابق
                    </button>
                    <span className="px-3 py-1">صفحة {chaptersPage}</span>
                    <button
                      onClick={() => setChaptersPage(p => p + 1)}
                      disabled={chaptersPage * 25 >= totalChapters}
                      className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50"
                    >
                      التالي
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'description' && (
              <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: novel.description }} />
            )}

            {activeTab === 'ratings' && (
              <div className="space-y-6">
                {/* تفاعلات الرواية */}
                <div className="flex flex-wrap justify-center gap-4 py-4">
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

                {/* التعليقات */}
                <div>
                  <h3 className="text-lg font-bold mb-4">التعليقات</h3>
                  <div className="bg-muted/20 p-4 rounded-lg">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg p-3 mb-2"
                      rows={3}
                      placeholder="أضف تعليقك..."
                    />
                    <button
                      onClick={handleAddComment}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80"
                    >
                      أضف تعليق
                    </button>
                  </div>
                  <div className="mt-4 space-y-4">
                    {loadingComments ? (
                      <div>جاري تحميل التعليقات...</div>
                    ) : comments.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">لا توجد تعليقات بعد</div>
                    ) : (
                      comments.map(comment => (
                        <div key={comment._id} className="bg-muted/10 p-4 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <img src={comment.user.picture || '/default-avatar.png'} alt={comment.user.name} className="w-8 h-8 rounded-full" />
                            <span className="font-bold">{comment.user.name}</span>
                            <span className="text-xs text-muted-foreground">{new Date(comment.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="text-foreground">{comment.content}</p>
                          <div className="flex gap-4 mt-2">
                            <button className="text-xs text-muted-foreground hover:text-primary">رد</button>
                            <button className="text-xs text-muted-foreground hover:text-primary">إعجاب</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* قارئ الفصل (Modal) */}
      {showReader && selectedChapter && (
        <div className="fixed inset-0 z-50 bg-black/90 overflow-y-auto" onClick={() => setShowReader(false)}>
          <div className="min-h-screen py-8" onClick={(e) => e.stopPropagation()}>
            <div className="max-w-4xl mx-auto bg-background rounded-lg p-6 relative">
              <button
                onClick={() => setShowReader(false)}
                className="absolute top-4 left-4 p-2 bg-gray-700 rounded-full hover:bg-gray-600"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <h1 className="text-2xl font-bold mb-6 text-center">الفصل {selectedChapter.number}: {selectedChapter.title}</h1>
              <div className="chapter-content prose dark:prose-invert max-w-none" style={{
                fontSize: selectedChapter.copyrightStyles?.fontSize || 18,
                textAlign: selectedChapter.copyrightStyles?.alignment || 'right',
              }}>
                {selectedChapter.copyrightStart && (
                  <div className="copyright-start mb-4 text-center text-gray-500" style={selectedChapter.copyrightStyles}>
                    {selectedChapter.copyrightStart}
                  </div>
                )}
                <div dangerouslySetInnerHTML={{ __html: selectedChapter.content.replace(/\n/g, '<br/>') }} />
                {selectedChapter.copyrightEnd && (
                  <div className="copyright-end mt-4 text-center text-gray-500" style={selectedChapter.copyrightStyles}>
                    {selectedChapter.copyrightEnd}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}