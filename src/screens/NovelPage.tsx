import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import { Helmet } from 'react-helmet-async';
import { breadcrumbJsonLd } from '../components/SEO';
import { trackNovelOpen } from '../lib/analytics';
import DOMPurify from 'dompurify';
import { useAuth } from '../context/AuthContext';
import {
  Star,
  ChevronLeft,
  ChevronRight,
  Heart,
  Eye,
  BookOpen,
  ArrowUpDown,
  Search,
  ThumbsUp,
  X,
  Flag,
  CloudOff,
  RefreshCcw,
  Download,
  Tags,
  PenLine,
  WifiOff,
} from 'lucide-react';
import Header from '../components/Header';
import SafeImage from '../components/SafeImage';
import DownloadModal from '../components/DownloadModal';
import { novelService, novelCache, Novel, ChapterMeta, ChaptersListResponse } from '../services/novel';
import { API_BASE_URL } from '../services/api';
import { userService, UserProfile } from '../services/user';
import { commentService, Comment } from '../services/comment';
import { http } from '../lib/http';
import { Skeleton, NovelPageSkeleton } from '../components/Skeleton';
import { CommentSection } from '../components/CommentSection';
import toast from 'react-hot-toast';
import { formatDate, getStatusStyle, siteUrl } from '../lib/site';
import { readNumberArray, readJSON, writeJSON } from '../lib/storage';
import { offlineStore } from '../lib/offlineStore';
import { useDebounce } from '../hooks/useDebounce';
import defaultAvatar from '../assets/adaptive-icon.png';

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
  const { isAuthenticated, openAuthModal, userInfo } = useAuth();
  const [novel, setNovel] = useState<Novel | null>(null);
  const [novelError, setNovelError] = useState<string | null>(null);
  const [chapters, setChapters] = useState<ChapterMeta[]>([]);
  const [chaptersPage, setChaptersPage] = useState(1);
  const [totalChapters, setTotalChapters] = useState(0);
  // Server's own pagination truth (accounts for hidden chapters + active search)
  const [serverTotalPages, setServerTotalPages] = useState(0);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [loadingNovel, setLoadingNovel] = useState(true);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [chaptersError, setChaptersError] = useState(false);
  const [chaptersReloadKey, setChaptersReloadKey] = useState(0);
  const [activeTab, setActiveTab] = useState<'chapters' | 'description' | 'comments'>('description');
  /** نتصفح النسخة المنزّلة؟ (فشل الشبكة مع وجود نسخة محلية، أو عدم اتصال) */
  const [isOfflineNovel, setIsOfflineNovel] = useState(false);
  const [chapterSearch, setChapterSearch] = useState('');
  // 🔥 Server-side chapter search (debounced) — finds chapters on ANY page,
  // not just the currently loaded 25.
  const debouncedChapterSearch = useDebounce(chapterSearch.trim(), 350);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [userProgress, setUserProgress] = useState<{ progress: number; lastChapterId: number; readChapters: number[] }>({
    progress: 0,
    lastChapterId: 0,
    readChapters: [],
  });
  const [isPageModalOpen, setIsPageModalOpen] = useState(false);
  // الفصل الافتراضي لزر «اقرأ الفصل» — لا يتأثر بالبحث أو التنقل بين الصفحات
  const [defaultFirstChapter, setDefaultFirstChapter] = useState<ChapterMeta | null>(null);
  // 🔥 بند «القفز لآخر قراءة»: آخر فصل مقروء لهذه الرواية + هل قفزنا له بالفعل؟
  const [lastReadJump, setLastReadJump] = useState<number | null>(null);
  const lastReadJumpedRef = useRef(false);
  const pendingDescJumpRef = useRef<number | null>(null);
  const [reactionStats, setReactionStats] = useState({ like: 0, love: 0, funny: 0, sad: 0, angry: 0 });
  const [userReaction, setUserReaction] = useState<string | null>(null);
  // Local read chapters for guest users (crash-proof read, per-novel)
  const [localReadChapters, setLocalReadChapters] = useState<number[]>([]);
  // Report modal state
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTypes, setReportTypes] = useState<string[]>([]);
  const [reportDetails, setReportDetails] = useState('');
  const [reportSending, setReportSending] = useState(false);
  // Offline download state (التنزيل للقراءة دون اتصال)
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [offlineCount, setOfflineCount] = useState(0);
  // 🔥 زر القراءة الذكي: «ابدأ القراءة» بلا رقم فصل لأول مرة، و«استئناف القراءة»
  // عند وجود سجل قراءة (ينتقل لآخر فصل قُرئ) بدل زر ثابت على الفصل 1.
  const [guestLastReadId, setGuestLastReadId] = useState(0);
  // 🛡️ أدوات المالك/المشرف: تعديل الرواية + تنزيل الفصول ZIP
  const [exportOpen, setExportOpen] = useState(false);

  // تتبّع الفصول المنزّلة لهذه الرواية (تحدّث تلقائياً بعد كل تغيير)
  useEffect(() => {
    if (!slug) return;
    let alive = true;
    const refresh = () => {
      offlineStore.getNovel(slug).then((rec) => {
        if (alive) setOfflineCount(rec?.chapterNumbers?.length || 0);
      }).catch(() => { /* ignore */ });
    };
    refresh();
    window.addEventListener('moon-offline-change', refresh);
    return () => {
      alive = false;
      window.removeEventListener('moon-offline-change', refresh);
    };
  }, [slug]);

  // Load per-novel guest read state whenever the novel changes
  useEffect(() => {
    if (!slug) return;
    setLocalReadChapters(readNumberArray(`read_chapters_${slug}`));
    // 🔥 آخر فصل مقروء محلياً (القارئ يكتب last_read_ دائماً — زوار ومسجلون)
    try {
      const saved = readJSON<{ id?: number }>(`last_read_${slug}`, {});
      setGuestLastReadId(Number(saved?.id || 0));
    } catch { setGuestLastReadId(0); }
    // reset scroll for every new novel (not just first mount)
    window.scrollTo(0, 0);
  }, [slug]);

  const chaptersPerPage = 25;
  const totalPages = serverTotalPages || Math.ceil(totalChapters / chaptersPerPage);

  /**
   * 🔥 فتح تبويب الفصول مع القفز التلقائي لصفحة آخر فصل مقروء
   * (تصاعدي: الصفحة = ceil(N/25) مباشرة — تنازلي: بعد أول جلب نحسب من الإجمالي)
   */
  const openChaptersTab = () => {
    if (activeTab !== 'chapters' && !lastReadJumpedRef.current) {
      lastReadJumpedRef.current = true;
      try {
        const saved = readJSON<{ id?: number }>(`last_read_${slug}`, {});
        const n = Number(saved?.id || userProgress.lastChapterId || 0);
        if (n > 0) {
          setLastReadJump(n);
          if (sortOrder === 'asc') {
            const target = Math.ceil(n / chaptersPerPage);
            if (target > 1 && (!serverTotalPages || target <= serverTotalPages)) setChaptersPage(target);
          } else {
            // ترتيب تنازلي: نحتاج الإجمالي — نؤجل الحساب بعد أول جلب
            pendingDescJumpRef.current = n;
          }
        }
      } catch { /* لا تاريخ قراءة */ }
    }
    setActiveTab('chapters');
  };

  // A new search starts from page 1 (never mixes page 4 with a fresh query)
  useEffect(() => {
    setChaptersPage(1);
  }, [debouncedChapterSearch, sortOrder]);

  // Combine server and local read chapters
  const readChapters = useMemo(() => {
    const combined = new Set([...userProgress.readChapters, ...localReadChapters]);
    return Array.from(combined);
  }, [userProgress.readChapters, localReadChapters]);

  // 🔥 آخر فصل مقروء: الخادم للمسجلين، والمحلي للزوار (أي منهما موجود)
  const lastReadId = userProgress.lastChapterId || guestLastReadId;

  // 🛡️ مالك الرواية (أو مشرف) — يرى زري التعديل وتنزيل الفصول ZIP
  const isNovelOwner = useMemo(() => {
    if (!userInfo || !novel) return false;
    if (userInfo.role === 'admin') return true;
    if (novel.authorId && String(novel.authorId) === String(userInfo._id)) return true;
    if (novel.authorEmail && String(novel.authorEmail).toLowerCase() === String(userInfo.email || '').toLowerCase()) return true;
    return false;
  }, [userInfo, novel]);

  // 🛡️ تنزيل فصول الرواية ZIP (نفس مسار التطبيق — الخادم يتحقق من الصلاحية)
  const handleExportZip = useCallback((includeTitle: boolean) => {
    setExportOpen(false);
    if (!slug) return;
    const token = localStorage.getItem('token') || '';
    const url = `${API_BASE_URL}/api/admin/novels/${slug}/export?token=${encodeURIComponent(token)}&includeTitle=${includeTitle}`;
    const a = document.createElement('a');
    a.href = url;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success('بدأ تنزيل ملف الفصول ZIP');
  }, [slug]);

  // Fetch novel data — with offline fallback:
  // إذا فشل الشبكة وكانت الرواية منزّلة، نعرض بياناتها من المتجر المحلي
  const fetchNovel = useCallback(async (bypass = false) => {
    if (!slug) return;
    setLoadingNovel(true);
    setNovelError(null);
    try {
      const data = await novelService.getNovelById(slug, bypass);
      setNovel(data);
      setTotalChapters(data.chaptersCount);
      setIsOfflineNovel(false);
      // 📊 تتبع فتح الرواية (تحليلات الموقع)
      trackNovelOpen(slug);
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const status = await novelService.getNovelStatus(slug);
          setIsFavorite(!!status.isFavorite);
          setUserProgress({
            progress: status.progress || 0,
            lastChapterId: status.lastChapterId || 0,
            readChapters: status.readChapters || [],
          });
        } catch { /* status is optional */ }
      }
    } catch (err: any) {
      console.error(err);
      // 📴 وضع عدم الاتصال: نسخة منزّلة؟ نكمل منها بدل شاشة خطأ ميتة
      try {
        const rec = await offlineStore.getNovel(slug);
        if (rec) {
          setNovel({
            _id: rec._id,
            title: rec.title,
            author: rec.author || 'غير معروف',
            cover: rec.cover || '',
            description: rec.description || '',
            tags: [],
            category: '',
            status: 'منزّلة',
            rating: 0,
            views: 0,
            favorites: 0,
            lastChapterUpdate: rec.updatedAt,
            createdAt: rec.downloadedAt,
            chaptersCount: rec.chapterNumbers?.length || 0,
          });
          setTotalChapters(rec.chapterNumbers?.length || 0);
          setIsOfflineNovel(true);
          setNovelError(null);
          setLoadingNovel(false);
          return;
        }
      } catch { /* لا نسخة محلية أيضاً */ }
      setNovelError(err?.message || 'فشل تحميل الرواية');
      setNovel(null);
    } finally {
      setLoadingNovel(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchNovel();
  }, [fetchNovel]);

  // Fetch chapters - ONLY WHEN TAB IS ACTIVE
  // Cached per (novel, page, sort, search) for 5 min: flipping pages back and
  // forth, or leaving and re-entering the novel, costs ZERO network requests.
  // 📴 النسخة المنزّلة: القائمة تُقرأ من IndexedDB مباشرة بلا أي شبكة.
  const lastBypassedReloadRef = useRef(0);
  useEffect(() => {
    if (!slug || activeTab !== 'chapters') return;

    // وضع عدم الاتصال — قائمة الفصول من المتجر المحلي
    const loadOfflineChapters = async () => {
      setLoadingChapters(true);
      setChaptersError(false);
      try {
        const [rec, local] = await Promise.all([offlineStore.getNovel(slug), offlineStore.listChapters(slug)]);
        const metas: ChapterMeta[] = local.map((c) => ({
          _id: `${slug}:${c.number}`,
          number: c.number,
          title: c.title || rec?.chapterTitles?.[c.number] || `الفصل ${c.number}`,
          createdAt: c.savedAt,
          views: 0,
        }));
        setChapters(metas);
        setServerTotalPages(1);
        setTotalChapters(metas.length);
        setDefaultFirstChapter(metas[0] || null);
      } catch {
        setChaptersError(true);
        setChapters([]);
      } finally {
        setLoadingChapters(false);
      }
    };

    if (isOfflineNovel) {
      loadOfflineChapters();
      return;
    }

    const bypass = chaptersReloadKey !== lastBypassedReloadRef.current;
    let stale = false;
    const fetchChapters = async () => {
      setLoadingChapters(true);
      setChaptersError(false);
      try {
        const data: ChaptersListResponse = await novelService.getChaptersListFull(
          slug,
          chaptersPage,
          chaptersPerPage,
          sortOrder,
          debouncedChapterSearch,
          bypass,
        );
        if (!stale) {
          setChapters(data.chapters);
          setServerTotalPages(data.totalPages);
          // إجمالي الخادم هو الحقيقة (يحتسب الفصول المخفية والبحث تلقائياً)
          setTotalChapters(data.total);
          // 🔥 قفزة الترتيب التنازلي: بعد معرفة الإجمالي نحسب صفحة الفصل المقروء أخيراً
          const pendingN = pendingDescJumpRef.current;
          if (pendingN && data.total > 0) {
            pendingDescJumpRef.current = null;
            const target = Math.ceil((data.total - pendingN + 1) / chaptersPerPage);
            if (target >= 1 && target !== chaptersPage && (!data.totalPages || target <= data.totalPages)) {
              setChaptersPage(target);
            }
          }
          // زر «اقرأ الفصل» يثبت على أول فصل حقيقي (بدون بحث)
          if (!debouncedChapterSearch && data.chapters.length > 0) {
            setDefaultFirstChapter(data.chapters[0]);
          }
          lastBypassedReloadRef.current = chaptersReloadKey;
        }
      } catch (err) {
        if (!stale) {
          console.error(err);
          // فشل الشبكة ونسخة منزّلة؟ قائمة محلية فوراً
          try {
            const local = await offlineStore.listChapters(slug);
            if (local.length > 0) {
              const rec = await offlineStore.getNovel(slug);
              setChapters(local.map((c) => ({
                _id: `${slug}:${c.number}`,
                number: c.number,
                title: c.title || rec?.chapterTitles?.[c.number] || `الفصل ${c.number}`,
                createdAt: c.savedAt,
                views: 0,
              })));
              setServerTotalPages(1);
              setTotalChapters(local.length);
              setChaptersError(false);
              setLoadingChapters(false);
              return;
            }
          } catch { /* لا نسخة محلية */ }
          setChaptersError(true);
          setChapters([]);
        }
      } finally {
        if (!stale) setLoadingChapters(false);
      }
    };
    fetchChapters();
    return () => { stale = true; };
  }, [slug, chaptersPage, sortOrder, activeTab, chaptersReloadKey, debouncedChapterSearch, isOfflineNovel]);

  // زر «اقرأ الفصل» يحتاج أول فصل حتى في تبويب الملخص — جلب خفيف (فصل واحد)
  // مع كاش 5 دقائق، وبدون أي إعادة عند العودة للرواية.
  useEffect(() => {
    if (!slug || isOfflineNovel) return;
    if (defaultFirstChapter) return;
    let stale = false;
    novelService
      .getChaptersListFull(slug, 1, 1, 'asc')
      .then((data) => {
        if (!stale && data.chapters.length > 0) setDefaultFirstChapter(data.chapters[0]);
      })
      .catch(() => { /* سيُعاد عند فتح تبويب الفصول */ });
    return () => { stale = true; };
  }, [slug, isOfflineNovel, defaultFirstChapter]);

  // Fetch comments and reactions - ONLY WHEN TAB IS ACTIVE
  useEffect(() => {
    if (!slug || activeTab !== 'comments') return;
    let stale = false;
    const fetchComments = async () => {
      setLoadingComments(true);
      try {
        const res = await commentService.getComments(slug, undefined, 1, 20);
        if (stale) return;
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
        if (!stale) console.error(err);
      } finally {
        if (!stale) setLoadingComments(false);
      }
    };
    fetchComments();
    return () => { stale = true; };
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
    } catch (err: any) {
      toast.error(err?.message || 'فشل تسجيل التفاعل');
    }
  };

  const handleAddToFavorites = async () => {
    if (!slug || !novel) return;
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    // Snapshot the pre-click values so a rollback restores exactly them
    const prevStatus = isFavorite;
    const prevCount = novel.favorites || 0;
    const newStatus = !prevStatus;
    // Optimistic update
    setIsFavorite(newStatus);
    setNovel((prev) => prev ? { ...prev, favorites: prevCount + (newStatus ? 1 : -1) } : prev);
    const result = await novelService.updateReadingStatus({
      novelId: slug,
      title: novel.title,
      cover: novel.cover,
      author: novel.author,
      isFavorite: newStatus,
    });
    if (result?.success) {
      toast.success(newStatus ? 'تمت الإضافة للمفضلة' : 'تم الحذف من المفضلة');
    } else {
      // Real rollback to the exact previous state
      setIsFavorite(prevStatus);
      setNovel((prev) => prev ? { ...prev, favorites: prevCount } : prev);
      toast.error('فشلت العملية، حاول مجدداً');
    }
  };

  const submitReport = async () => {
    if (!slug || !novel) return;
    if (reportTypes.length === 0 && !reportDetails.trim()) {
      toast.error('اختر نوع المشكلة أو اكتب تفاصيلها');
      return;
    }
    setReportSending(true);
    try {
      await http.post('/api/reports', {
        novelId: slug,
        novelTitle: novel.title,
        chapterNumber: null,
        chapterTitle: '',
        types: reportTypes,
        details: reportDetails.trim(),
      }, { auth: true });
      toast.success('تم إرسال البلاغ، شكراً لك!');
      setReportOpen(false);
      setReportTypes([]);
      setReportDetails('');
    } catch (err: any) {
      toast.error(err?.message || 'تعذر إرسال البلاغ الآن');
    } finally {
      setReportSending(false);
    }
  };

  const toggleReportType = (t: string) => {
    setReportTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const handleChapterClick = (chapter: ChapterMeta) => {
    if (!slug) return;
    // Navigate to reader
    navigate(`/novel/${slug}/reader/${chapter.number}`);
    // Mark as read locally (guests) — server marks via the reader
    if (!isAuthenticated && !readChapters.includes(chapter.number)) {
      const newRead = [...readChapters, chapter.number];
      writeJSON(`read_chapters_${slug}`, newRead);
      setLocalReadChapters(newRead);
    }
  };

  const handleAddComment = async (content: string): Promise<boolean> => {
    if (!slug) return false;
    try {
      const comment = await commentService.addComment(slug, content);
      setComments([comment, ...comments]);
      toast.success('تم إضافة التعليق');
      return true;
    } catch (err: any) {
      toast.error(err.message || 'فشل إضافة التعليق');
      return false;
    }
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    setChaptersPage(1);
  };

  const goToPage = (page: number) => {
    setChaptersPage(Math.min(Math.max(1, page), totalPages));
  };

  // Instant local filter while typing (the debounced server search refines it)
  const filteredChapters = chapters.filter(ch =>
    ch.number.toString().includes(chapterSearch) ||
    ch.title.toLowerCase().includes(chapterSearch.toLowerCase())
  );

  // Render description — sanitized HTML only (XSS-safe)
  const renderDescription = (text: string) => {
    if (!text) return null;
    if (text.includes('<') && text.includes('>')) {
      const clean = DOMPurify.sanitize(text, { USE_PROFILES: { html: true } });
      return <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: clean }} />;
    }
    const paragraphs = text.split(/\n\s*\n/);
    return (
      <div className="prose prose-invert max-w-none">
        {paragraphs.map((para, idx) => (
          <p key={idx} className="mb-4 leading-relaxed whitespace-pre-line">
            {para}
          </p>
        ))}
      </div>
    );
  };

  // ═══ بطاقة المترجم/الناشر — مثل بطاقة التطبيق (بنر + صورة + اسم) ═══
  // بيانات خفيفة من /api/user/public-profile عبر بريد أو معرّف الناشر، مخزّنة 10 دقائق.
  const authorEmail = novel?.authorEmail || '';
  const authorUserId = novel?.authorId || '';
  const { data: authorData } = useQuery({
    queryKey: ['authorProfile', authorEmail, authorUserId],
    queryFn: () => userService.getPublicProfile(authorEmail || undefined, authorUserId || undefined),
    enabled: (!!authorEmail || !!authorUserId) && !isOfflineNovel,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 0,
  });
  const authorProfile: UserProfile | null = authorData?.user || null;
  const authorName = authorProfile?.name || novel?.author || 'Zeus';

  const renderTranslatorCard = () => {
    // دون اتصال لا توجد بطاقة (لا بيانات محلية للناشر) — اسم المؤلف نصياً فقط
    if (isOfflineNovel) {
      return (
        <p className="text-white/60 text-sm flex items-center gap-2">
          <PenLine size={16} />
          {novel.author}
        </p>
      );
    }
    const targetId = authorProfile?._id;
    const bannerSrc = authorProfile?.banner || defaultAvatar;
    const avatarSrc = authorProfile?.picture || defaultAvatar;
    return (
      <motion.button
        whileHover={{ scale: targetId ? 1.01 : 1 }}
        whileTap={{ scale: targetId ? 0.99 : 1 }}
        onClick={() => { if (targetId) navigate(`/user/${targetId}`); }}
        disabled={!targetId}
        aria-label={targetId ? `زيارة صفحة الناشر ${authorName}` : `الناشر: ${authorName}`}
        data-testid="translator-card"
        className={`relative w-full rounded-2xl overflow-hidden border border-white/10 text-right block focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${targetId ? 'cursor-pointer' : 'cursor-default'}`}
      >
        {/* البنر */}
        <div className="relative h-36 sm:h-40 w-full">
          <img
            src={bannerSrc}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = defaultAvatar; }}
            loading="lazy"
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
          {/* المحتوى فوق البنر */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
            <img
              src={avatarSrc}
              alt=""
              className="w-[72px] h-[72px] rounded-full object-cover border-[3px] border-white/85 shadow-lg"
              onError={(e) => { (e.target as HTMLImageElement).src = defaultAvatar; }}
              loading="lazy"
              referrerPolicy="no-referrer"
              draggable={false}
            />
            <span className="text-white font-extrabold text-lg drop-shadow-md max-w-full truncate">
              {authorName}
            </span>
            <span className="text-white/70 text-[11px] font-bold bg-white/10 border border-white/20 backdrop-blur-sm rounded-full px-3 py-0.5">
              ناشر الرواية
            </span>
          </div>
          {targetId && (
            <span className="absolute top-3 left-3 text-[11px] font-bold text-white/70 bg-black/45 backdrop-blur-sm border border-white/15 rounded-full px-2.5 py-1">
              زيارة الصفحة ←
            </span>
          )}
        </div>
      </motion.button>
    );
  };

  // ═══ تبويب الملخص: القصة ← التصنيفات ← بطاقة المترجم ═══
  const renderSummary = () => (
    <div className="space-y-6">
      {/* القصة */}
      <section aria-label="ملخص الرواية">
        {novel.description ? (
          renderDescription(novel.description)
        ) : (
          <p className="text-muted-foreground text-sm">لا يوجد ملخص لهذه الرواية بعد.</p>
        )}
      </section>

      {/* التصنيفات */}
      <section aria-label="تصنيفات الرواية" className="pt-2 border-t border-white/10">
        <h3 className="flex items-center gap-2 text-white font-bold text-base mb-3 mt-4">
          <Tags size={18} className="text-white/70" />
          تصنيفات الرواية
        </h3>
        {(() => {
          const cats = [...new Set([...(novel.category ? [novel.category] : []), ...(novel.tags || [])])];
          if (cats.length === 0) {
            return <p className="text-muted-foreground text-sm">لا توجد تصنيفات مضافة.</p>;
          }
          return (
            <div className="flex flex-wrap gap-2">
              {cats.map((tag) => (
                <button
                  key={tag}
                  onClick={() => navigate(`/library?q=${encodeURIComponent(tag)}`)}
                  className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/8 border border-white/15 text-white/75 hover:bg-white/15 hover:text-white hover:border-white/30 active:scale-95 transition-all"
                >
                  {tag}
                </button>
              ))}
            </div>
          );
        })()}
      </section>

      {/* بطاقة المترجم */}
      <section aria-label="بطاقة المترجم" className="pt-2 border-t border-white/10">
        <h3 className="flex items-center gap-2 text-white font-bold text-base mb-3 mt-4">
          <PenLine size={18} className="text-white/70" />
          المترجم
        </h3>
        {renderTranslatorCard()}
      </section>
    </div>
  );

  if (loadingNovel) {
    return <NovelPageSkeleton />;
  }

  if (!novel) {
    return (
      <div className="min-h-screen bg-background text-foreground" dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>
        <Header />
        <div className="flex flex-col items-center justify-center h-96 gap-4 px-6">
          <CloudOff className="text-muted-foreground" size={48} />
          <p className="text-muted-foreground text-sm">{novelError || 'الرواية غير موجودة'}</p>
          <div className="flex gap-3">
            {novelError && (
              <button
                onClick={() => fetchNovel(true)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/80 transition-colors"
              >
                <RefreshCcw size={16} />
                إعادة المحاولة
              </button>
            )}
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2.5 rounded-xl bg-white/10 border border-white/20 text-foreground font-bold text-sm hover:bg-white/20 transition-colors"
            >
              الرئيسية
            </button>
          </div>
        </div>
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
        <meta property="og:url" content={siteUrl(`/novel/${slug}`)} />
        <meta property="og:title" content={`رواية ${novel.title} - قمر الروايات`} />
        <meta property="og:description" content={novel.description?.slice(0, 160)} />
        <meta property="og:image" content={novel.cover} />
        <meta property="book:author" content={novel.author} />
        <meta property="book:tag" content={novel.tags?.join(', ')} />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={siteUrl(`/novel/${slug}`)} />
        <meta property="twitter:title" content={`رواية ${novel.title} - قمر الروايات`} />
        <meta property="twitter:description" content={novel.description?.slice(0, 160)} />
        <meta property="twitter:image" content={novel.cover} />

        {/* AI Crawlers & SEO */}
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={siteUrl(`/novel/${slug}`)} />

        {/* 🔎 مسار التنقل في نتائج جوجل */}
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbJsonLd([
            { name: 'الرئيسية', path: '/' },
            { name: 'المكتبة', path: '/library' },
            { name: novel.title || 'رواية', path: `/novel/${slug}` },
          ]))}
        </script>

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
        <Header />

        {/* 📴 شارة النسخة المنزّلة — البيانات من جهازك */}
        {isOfflineNovel && (
          <div className="relative z-20 max-w-[1400px] mx-auto px-4 mt-2">
            <div className="flex items-center gap-2 text-[12px] font-bold text-white/85 bg-white/10 border border-white/25 rounded-full px-4 py-2 w-fit">
              <WifiOff size={14} />
              أنت تتصفح النسخة المنزّلة — البيانات محفوظة على جهازك وتعمل دون إنترنت
            </div>
          </div>
        )}

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
                        onClick={() => {
                          if (lastReadId > 0) { navigate(`/novel/${slug}/reader/${lastReadId}`); return; }
                          const c = defaultFirstChapter || chapters[0];
                          if (c) handleChapterClick(c);
                        }}
                        className="items-center whitespace-nowrap text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-primary-foreground px-4 h-full w-full rounded bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300 font-bold py-3"
                      >
                        <BookOpen size={18} className="inline ml-2" />
                        {lastReadId > 0 ? 'استئناف القراءة' : 'ابدأ القراءة'}
                        {lastReadId > 0 && (
                          <span className="block text-[11px] font-semibold text-primary-foreground/80 mt-0.5">
                            آخر قراءة: الفصل {lastReadId}
                          </span>
                        )}
                      </motion.button>
                    </div>
                    <div>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleAddToFavorites}
                        className={`inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 px-4 py-2 select-none w-full rounded h-12 font-bold transition-all duration-300 ${
                          isFavorite
                            ? 'bg-red-500/15 text-red-400 border border-red-500/40 backdrop-blur-md shadow-[0_0_18px_rgba(239,68,68,0.22)] hover:bg-red-500/25'
                            : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 border border-white/20'
                        }`}
                      >
                        <Heart size={16} className={`ml-1 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                        {isFavorite ? 'في المفضلة' : 'إضافة للمفضلة'}
                      </motion.button>
                    </div>
                  </div>
                </div>
                <div className="flex-center pt-2">
                  <button
                    onClick={() => setDownloadOpen(true)}
                    aria-label="تنزيل للقراءة دون اتصال"
                    className="justify-center whitespace-nowrap text-sm font-medium transition-colors disabled:opacity-50 px-4 py-2 w-full rounded h-12 bg-white/10 border border-white/20 text-white hover:bg-white/20 flex items-center gap-2 mb-2"
                  >
                    <Download size={18} className="w-5 h-5" />
                    {offlineCount > 0 ? `منزّل (${offlineCount} فصل) — إدارة` : 'تنزيل للقراءة دون اتصال'}
                  </button>
                  <button
                    onClick={() => setReportOpen(true)}
                    aria-label="الإبلاغ عن مشكلة في الرواية"
                    className="justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 px-4 py-2 w-full rounded h-12 bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 flex items-center gap-2"
                  >
                    <Flag size={18} className="w-5 h-5" />
                    الإبلاغ عن مشكلة
                  </button>
                </div>
                {isNovelOwner && !isOfflineNovel && (
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      onClick={() => navigate(`/dashboard/novel-edit/${slug}`)}
                      className="h-11 rounded bg-white/5 border border-white/15 text-white/80 hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-1.5 text-[13px] font-bold"
                    >
                      <PenLine size={15} />
                      تعديل الرواية
                    </button>
                    <button
                      onClick={() => setExportOpen(true)}
                      className="h-11 rounded bg-white/5 border border-white/15 text-white/80 hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-1.5 text-[13px] font-bold"
                    >
                      <Download size={15} />
                      تنزيل الفصول ZIP
                    </button>
                  </div>
                )}
              </div>

              {/* Stats: Views & Favorites */}
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10">
                  <Eye className="w-6 h-6 text-white/70 mx-auto mb-1" />
                  <div className="text-2xl font-bold">{isOfflineNovel ? '—' : novel.views.toLocaleString('en-US')}</div>
                  <div className="text-xs text-gray-400">مشاهدة</div>
                </div>
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10">
                  <Heart className="w-6 h-6 text-white/70 mx-auto mb-1" />
                  <div className="text-2xl font-bold">{isOfflineNovel ? '—' : novel.favorites.toLocaleString('en-US')}</div>
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
                        onClick={() => {
                          if (lastReadId > 0) { navigate(`/novel/${slug}/reader/${lastReadId}`); return; }
                          const c = defaultFirstChapter || chapters[0];
                          if (c) handleChapterClick(c);
                        }}
                        className="items-center whitespace-nowrap text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-primary-foreground px-4 h-full w-full rounded bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300 font-bold py-3"
                      >
                        <BookOpen size={18} className="inline ml-2" />
                        {lastReadId > 0 ? 'استئناف القراءة' : 'ابدأ القراءة'}
                        {lastReadId > 0 && (
                          <span className="block text-[11px] font-semibold text-primary-foreground/80 mt-0.5">
                            آخر قراءة: الفصل {lastReadId}
                          </span>
                        )}
                      </button>
                    </div>
                    <div>
                      <button
                        onClick={handleAddToFavorites}
                        className={`inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 px-4 py-2 select-none w-full rounded h-12 font-bold transition-all duration-300 ${
                          isFavorite
                            ? 'bg-red-500/15 text-red-400 border border-red-500/40 backdrop-blur-md shadow-[0_0_18px_rgba(239,68,68,0.22)] hover:bg-red-500/25'
                            : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 border border-white/20'
                        }`}
                      >
                        <Heart size={16} className={`ml-1 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                        {isFavorite ? 'في المفضلة' : 'إضافة للمفضلة'}
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => setDownloadOpen(true)}
                    className="mt-2 w-full rounded h-12 bg-white/10 border border-white/20 text-white hover:bg-white/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm font-bold"
                  >
                    <Download size={17} />
                    {offlineCount > 0 ? `منزّل (${offlineCount} فصل) — إدارة` : 'تنزيل للقراءة دون اتصال'}
                  </button>
                  {isNovelOwner && !isOfflineNovel && (
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button
                        onClick={() => navigate(`/dashboard/novel-edit/${slug}`)}
                        className="h-11 rounded bg-white/5 border border-white/15 text-white/80 hover:bg-white/10 hover:text-white active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 text-[13px] font-bold"
                      >
                        <PenLine size={15} />
                        تعديل الرواية
                      </button>
                      <button
                        onClick={() => setExportOpen(true)}
                        className="h-11 rounded bg-white/5 border border-white/15 text-white/80 hover:bg-white/10 hover:text-white active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 text-[13px] font-bold"
                      >
                        <Download size={15} />
                        تنزيل الفصول ZIP
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="h-px bg-white/10 my-2" />

              {/* Tabs — الملخص أولاً (افتراضي) ثم الفصول ثم التعليقات */}
              <div className="flex border-b border-white/10">
                <button
                  onClick={() => setActiveTab('description')}
                  data-testid="tab-summary"
                  className={`px-4 py-2 font-medium transition-colors relative ${activeTab === 'description' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  الملخص
                  {activeTab === 'description' && (
                    <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
                <button
                  onClick={openChaptersTab}
                  data-testid="tab-chapters"
                  className={`px-4 py-2 font-medium transition-colors relative ${activeTab === 'chapters' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  الفصول ({totalChapters})
                  {activeTab === 'chapters' && (
                    <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('comments')}
                  data-testid="tab-comments"
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
                    ) : chaptersError ? (
                      <div className="text-center py-10">
                        <CloudOff className="mx-auto text-muted-foreground mb-3" size={40} />
                        <p className="text-muted-foreground text-sm mb-4">تعذّر تحميل الفصول</p>
                        <button
                          onClick={() => setChaptersReloadKey((k) => k + 1)}
                          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/80 transition-colors"
                        >
                          <RefreshCcw size={16} />
                          إعادة المحاولة
                        </button>
                      </div>
                    ) : filteredChapters.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">لا توجد فصول مطابقة</div>
                    ) : (
                      filteredChapters.map((chapter) => {
                        const isRead = readChapters.includes(chapter.number);
                        const isLastRead = lastReadJump === chapter.number;
                        return (
                          <div
                            key={chapter._id}
                            onClick={() => handleChapterClick(chapter)}
                            className={`flex flex-1 relative rounded-lg p-2 sm:p-3 transition-colors cursor-pointer border ${
                              isLastRead
                                ? 'bg-primary/10 border-primary/50 ring-1 ring-primary/40'
                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }`}
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
                                    onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
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
                                    {isLastRead && (
                                      <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">
                                        آخر قراءة
                                      </span>
                                    )}
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

              {/* Summary Tab — الملخص + التصنيفات + بطاقة المترجم */}
              {activeTab === 'description' && renderSummary()}

              {/* Comments Tab */}
              {activeTab === 'comments' && (
                isOfflineNovel ? (
                  <div className="text-center py-10">
                    <WifiOff className="mx-auto text-white/30 mb-3" size={36} />
                    <p className="text-muted-foreground text-sm">التعليقات والتفاعلات تتطلب اتصالاً بالإنترنت</p>
                  </div>
                ) : (
                <>
                  {/* Reactions Row */}
                  <div className="flex flex-wrap justify-center gap-4 py-4 border-b border-white/10 mb-4">
                    <button onClick={() => handleReaction('like')} className={`flex flex-col items-center gap-1 p-2 rounded-lg transition ${userReaction === 'like' ? 'bg-white/15' : 'hover:bg-white/5'}`}>
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
                    <button onClick={() => handleReaction('sad')} className={`flex flex-col items-center gap-1 p-2 rounded-lg transition ${userReaction === 'sad' ? 'bg-white/15' : 'hover:bg-white/5'}`}>
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
                )
              )}
            </div>
          </div>
        </motion.section>

        {/* Chapter Reader Modal (not used now, but keep for potential future) */}
        {/* <ChapterReader chapter={selectedChapter} isOpen={showReader} onClose={() => setShowReader(false)} /> */}
      </div>

      {/* Report Modal */}
      <AnimatePresence>
        {reportOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
              onClick={() => !reportSending && setReportOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 50 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-md bg-[#1a1a1a] rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
              role="dialog"
              aria-modal="true"
              aria-label="الإبلاغ عن مشكلة"
            >
              <div className="p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-white">الإبلاغ عن مشكلة</h3>
                  <button onClick={() => setReportOpen(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors" aria-label="إغلاق">
                    <X size={20} className="text-gray-400" />
                  </button>
                </div>
                <p className="text-white/50 text-xs mb-3">رواية: <span className="text-white/80 font-semibold">{novel.title}</span></p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {['مشكلة في الترجمة', 'فصل مفقود', 'فصول مكررة', 'مشكلة في العرض', 'رابط صورة معطل', 'أخرى'].map((t) => (
                    <button
                      key={t}
                      onClick={() => toggleReportType(t)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                        reportTypes.includes(t)
                          ? 'bg-primary/20 border-primary/50 text-primary'
                          : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  rows={4}
                  placeholder="تفاصيل إضافية (اختياري)..."
                  aria-label="تفاصيل البلاغ"
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-primary transition-colors text-sm mb-4"
                />
                <button
                  onClick={submitReport}
                  disabled={reportSending}
                  className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:bg-primary/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {reportSending ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Flag size={16} />
                      إرسال البلاغ
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 🛡️ نافذة تنسيق تصدير الفصول ZIP — المالك/المشرف فقط */}
      <AnimatePresence>
        {exportOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
              onClick={() => setExportOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 50 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-sm bg-[#1a1a1a] rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
              role="dialog"
              aria-modal="true"
              aria-label="تنسيق التصدير"
            >
              <div className="p-5">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-bold text-white">تنسيق التصدير</h3>
                  <button onClick={() => setExportOpen(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors" aria-label="إغلاق">
                    <X size={18} className="text-gray-400" />
                  </button>
                </div>
                <p className="text-white/60 text-sm mb-4">هل تريد تضمين عنوان الفصل في بداية كل ملف نصي؟</p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleExportZip(true)}
                    className="w-full bg-primary text-primary-foreground font-bold py-2.5 rounded-xl hover:bg-primary/80 transition-colors text-sm"
                  >
                    نعم (تضمين العنوان)
                  </button>
                  <button
                    onClick={() => handleExportZip(false)}
                    className="w-full bg-white/10 border border-white/15 text-white font-bold py-2.5 rounded-xl hover:bg-white/20 transition-colors text-sm"
                  >
                    لا (النص فقط)
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* تنزيل للقراءة دون اتصال */}
      <DownloadModal isOpen={downloadOpen} onClose={() => setDownloadOpen(false)} novel={novel} />
    </>
  );
}