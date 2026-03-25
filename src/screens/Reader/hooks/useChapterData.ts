import { useState, useEffect } from 'react';
import { novelService } from '../../../services/novel';
import { userService } from '../../../services/user';
import { commentService } from '../../../services/comment';
import toast from 'react-hot-toast';

export const useChapterData = (novelId: string, chapterId: string) => {
  const [novel, setNovel] = useState<any>(null);
  const [chapter, setChapter] = useState<any>(null);
  const [chaptersList, setChaptersList] = useState<any[]>([]);
  const [totalChapters, setTotalChapters] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [authorProfile, setAuthorProfile] = useState<any>(null);
  const [loadingNovel, setLoadingNovel] = useState(true);
  const [loadingChapter, setLoadingChapter] = useState(true);
  const [loadingChapters, setLoadingChapters] = useState(false);

  // Fetch Chapter Content - HIGHEST PRIORITY (ROCKET SPEED)
  useEffect(() => {
    if (!novelId || !chapterId) return;
    
    const fetchChapter = async () => {
      setLoadingChapter(true);
      try {
        // This endpoint is now optimized to return ONLY chapter content and metadata
        const data = await novelService.getChapter(novelId, chapterId);
        setChapter(data);
        setTotalChapters(data.totalChapters || 0);
        
        // Background tasks (Non-blocking)
        novelService.incrementView(novelId, parseInt(chapterId)).catch(() => {});
        novelService.updateReadingStatus({
          novelId,
          lastChapterId: parseInt(chapterId),
          lastChapterTitle: data.title,
        }).catch(() => {});
        
        commentService.getComments(novelId, parseInt(chapterId), 1, 1).then(res => {
          setCommentCount(res.totalComments);
        }).catch(() => {});
      } catch (err) {
        console.error("Chapter fetch error:", err);
        toast.error('فشل تحميل الفصل');
      } finally {
        setLoadingChapter(false);
      }
    };
    
    fetchChapter();
  }, [novelId, chapterId]);

  // Fetch Novel Details - Background (Lazy Load)
  useEffect(() => {
    if (!novelId) return;
    
    const fetchNovel = async () => {
      setLoadingNovel(true);
      try {
        const data = await novelService.getNovelById(novelId);
        setNovel(data);
        
        // Fetch author profile if needed
        if (data.authorId || data.authorEmail) {
          userService.getPublicProfile(
            data.authorId ? undefined : data.authorEmail, 
            data.authorId
          ).then(profile => {
            setAuthorProfile(profile.user);
          }).catch(() => {});
        }
      } catch (err) {
        console.error("Novel fetch error:", err);
      } finally {
        setLoadingNovel(false);
      }
    };
    
    fetchNovel();
  }, [novelId]);

  // Fetch Chapters List - Background (Lazy Load for Table of Contents)
  useEffect(() => {
    if (!novelId) return;
    
    const fetchChapters = async () => {
      setLoadingChapters(true);
      try {
        // Fetch the list in the background
        const list = await novelService.getChaptersList(novelId, 1, 1000, 'asc');
        setChaptersList(list);
      } catch (err) {
        console.error("Chapters list fetch error:", err);
      } finally {
        setLoadingChapters(false);
      }
    };
    
    fetchChapters();
  }, [novelId]);

  return {
    novel,
    chapter,
    chaptersList,
    totalChapters,
    commentCount,
    authorProfile,
    loading: loadingChapter, // 🔥 ONLY WAIT FOR CHAPTER CONTENT FOR ROCKET SPEED
    loadingNovel,
    loadingChapters,
  };
};