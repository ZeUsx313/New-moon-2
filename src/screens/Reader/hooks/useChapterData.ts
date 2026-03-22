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

  useEffect(() => {
    if (!novelId) return;
    const fetchNovel = async () => {
      try {
        const data = await novelService.getNovelById(novelId);
        setNovel(data);
        setTotalChapters(data.chaptersCount);
        if (data.authorEmail) {
          try {
            const profile = await userService.getPublicProfile(undefined, data.authorEmail);
            setAuthorProfile(profile.user);
          } catch (e) {}
        }
      } catch (err) {
        console.error(err);
        toast.error('فشل تحميل الرواية');
      } finally {
        setLoadingNovel(false);
      }
    };
    fetchNovel();
  }, [novelId]);

  useEffect(() => {
    if (!novelId) return;
    const fetchChapters = async () => {
      setLoadingChapters(true);
      try {
        const list = await novelService.getChaptersList(novelId, 1, 1000, 'asc');
        setChaptersList(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingChapters(false);
      }
    };
    fetchChapters();
  }, [novelId]);

  useEffect(() => {
    if (!novelId || !chapterId) return;
    const fetchChapter = async () => {
      setLoadingChapter(true);
      try {
        const data = await novelService.getChapter(novelId, chapterId);
        setChapter(data);
        await novelService.incrementView(novelId, parseInt(chapterId));
        await novelService.updateReadingStatus({
          novelId,
          lastChapterId: parseInt(chapterId),
          lastChapterTitle: data.title,
        });
        const commentsRes = await commentService.getComments(novelId, parseInt(chapterId), 1, 1);
        setCommentCount(commentsRes.totalComments);
      } catch (err) {
        console.error(err);
        toast.error('فشل تحميل الفصل');
      } finally {
        setLoadingChapter(false);
      }
    };
    fetchChapter();
  }, [novelId, chapterId]);

  return {
    novel,
    chapter,
    chaptersList,
    totalChapters,
    commentCount,
    authorProfile,
    loading: loadingNovel || loadingChapter,
    loadingChapters,
  };
};