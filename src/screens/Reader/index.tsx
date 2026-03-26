import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Settings, List, MessageCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChapterData } from './hooks/useChapterData';
import { useReaderSettings } from './hooks/useReaderSettings';
import { useReplacements } from './hooks/useReplacements';
import { useCleaner } from './hooks/useCleaner';
import { useCopyright } from './hooks/useCopyright';
import { generateHTML } from './utils/generateHTML';
import { LoadingScreen } from './components/LoadingScreen';
import { ChapterDrawer } from './components/ChapterDrawer';
import { ReplacementsDrawer } from './components/ReplacementsDrawer';
import { CleanerDrawer } from './components/CleanerDrawer';
import { CopyrightDrawer } from './components/CopyrightDrawer';
import { SettingsModal } from './components/SettingsModal';
import { CommentsModal } from './components/CommentsModal';
import { ChapterContent } from './components/ChapterContent';
import { commentService } from '../../services/comment';
import toast from 'react-hot-toast';

export default function Reader() {
  const { novelId, chapterId } = useParams<{ novelId: string; chapterId: string }>();
  const navigate = useNavigate();
  const { userInfo } = useAuth();
  const isAdmin = userInfo?.role === 'admin';

  const { novel, chapter, chaptersList, totalChapters, commentCount, authorProfile, loading, loadingChapters } =
    useChapterData(novelId!, chapterId!);

  const { settings, changeFontSize, changeTheme, handleFontChange, handleBrightnessChange, dialogue, markdown } =
    useReaderSettings();

  const replacements = useReplacements();
  const cleaner = useCleaner(isAdmin);
  const copyright = useCopyright(isAdmin);

  const [showMenu, setShowMenu] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'none' | 'chapters' | 'replacements' | 'cleaner' | 'copyright'>('none');
  const [showSettings, setShowSettings] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isAscending, setIsAscending] = useState(true);
  const [iframeKey, setIframeKey] = useState(0);

  const sortedChapters = useMemo(() => {
    let list = [...chaptersList];
    if (!isAscending) list.reverse();
    return list;
  }, [chaptersList, isAscending]);

  const refreshContent = useCallback(() => {
    setIframeKey(prev => prev + 1);
  }, []);

  const html = useMemo(() => {
    if (!chapter) return '';
    return generateHTML({
      chapter: chapter,
      settings,
      activeReplacements: replacements.activeReplacements,
      authorProfile,
      novelTitle: novel?.title || '',
      commentCount,
      isAdmin,
      cleanerWords: cleaner.cleanerWords,
      enableSeparator: copyright.enableSeparator,
      separatorText: copyright.separatorText,
      copyrightStartText: copyright.startText,
      copyrightEndText: copyright.endText,
      copyrightStyle: copyright.style,
      copyrightFrequency: copyright.frequency,
      copyrightEveryX: parseInt(copyright.everyX) || 5,
    });
  }, [chapter, settings, replacements.activeReplacements, authorProfile, novel, commentCount, isAdmin, cleaner.cleanerWords, copyright]);

  useEffect(() => {
    refreshContent();
  }, [html, refreshContent]);

  const handleIframeMessage = useCallback((msg: string) => {
    if (msg === 'toggleMenu') setShowMenu(prev => !prev);
    else if (msg === 'openComments') setShowComments(true);
    else if (msg === 'openProfile') {
      if (authorProfile) navigate(`/user/${authorProfile._id}`);
    }
  }, [authorProfile, navigate]);

  const navigateChapter = (number: number) => {
    if (number === parseInt(chapterId!)) return;
    navigate(`/novel/${novelId}/reader/${number}`);
    setDrawerMode('none');
  };

  const navigateNextPrev = (offset: number) => {
    const current = parseInt(chapterId!);
    const next = current + offset;
    if (next < 1) return;
    if (totalChapters > 0 && next > totalChapters) {
      toast.error('أنت في آخر فصل متاح.');
      return;
    }
    navigate(`/novel/${novelId}/reader/${next}`);
  };

  const handleAddComment = useCallback(async (content: string) => {
    if (!novelId || !chapterId) return;
    try {
      await commentService.addComment(novelId, content, undefined, parseInt(chapterId));
      toast.success('تم إضافة التعليق');
      // Refresh comment count (optional)
    } catch (err) {
      toast.error('فشل إضافة التعليق');
    }
  }, [novelId, chapterId]);

  const openLeftDrawer = () => setDrawerMode('chapters');
  const openRightDrawer = (mode: 'replacements' | 'cleaner' | 'copyright') => {
    if (mode === 'replacements' && !replacements.currentFolderId) replacements.backToFolders();
    setDrawerMode(mode);
  };
  const closeDrawers = () => {
    setDrawerMode('none');
    replacements.setEditingId(null);
    replacements.setNewOriginal('');
    replacements.setNewReplacement('');
    cleaner.setNewCleanerWord('');
    cleaner.setCleanerEditingId(null);
  };

  if (loading) {
    return <LoadingScreen novelCover={novel?.cover} />;
  }

  return (
    <>
      <Helmet>
        <title>قمر الروايات - {chapter?.title || `فصل ${chapterId}`} | {novel?.title}</title>
        <meta name="description" content={`اقرأ ${chapter?.title || `الفصل ${chapterId}`} من رواية ${novel?.title} على قمر الروايات. استمتع بأحدث الفصول المترجمة والحصرية.`} />
        <meta name="keywords" content={`${novel?.title}, ${chapter?.title}, الفصل ${chapterId}, روايات عربية, روايات مترجمة, قمر الروايات`} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://ais-pre-alukpn2lpso7r4p7yzguqv-15287201126.europe-west2.run.app/novel/${novelId}/reader/${chapterId}`} />
        <meta property="og:title" content={`${chapter?.title || `الفصل ${chapterId}`} - ${novel?.title} | قمر الروايات`} />
        <meta property="og:description" content={`استمتع بقراءة ${chapter?.title || `الفصل ${chapterId}`} من رواية ${novel?.title}. تحديثات يومية وحصرية على قمر الروايات.`} />
        <meta property="og:image" content={novel?.cover} />
        <meta property="article:author" content={novel?.author} />
        <meta property="article:section" content="Novels" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={`https://ais-pre-alukpn2lpso7r4p7yzguqv-15287201126.europe-west2.run.app/novel/${novelId}/reader/${chapterId}`} />
        <meta property="twitter:title" content={`${chapter?.title || `الفصل ${chapterId}`} - ${novel?.title} | قمر الروايات`} />
        <meta property="twitter:description" content={`استمتع بقراءة ${chapter?.title || `الفصل ${chapterId}`} من رواية ${novel?.title}. تحديثات يومية وحصرية على قمر الروايات.`} />
        <meta property="twitter:image" content={novel?.cover} />

        {/* AI Crawlers & SEO */}
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={`https://ais-pre-alukpn2lpso7r4p7yzguqv-15287201126.europe-west2.run.app/novel/${novelId}/reader/${chapterId}`} />
      </Helmet>
      <div className="relative h-screen w-full overflow-hidden bg-gray-900">
        {/* Top Bar */}
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: showMenu ? 0 : -100, opacity: showMenu ? 1 : 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-20 bg-black/60 backdrop-blur-xl border-b border-white/10"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => navigate(`/novel/${novelId}`)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ChevronLeft size={24} className="text-white" />
            </button>
            <div className="text-center">
              <div className="text-white font-medium truncate max-w-[200px]">{chapter?.title}</div>
              <div className="text-xs text-white/60">
                الفصل {chapterId} من {totalChapters}
              </div>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <Settings size={24} className="text-white" />
            </button>
          </div>
        </motion.div>

        {/* Bottom Bar */}
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: showMenu ? 0 : 100, opacity: showMenu ? 1 : 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-20 bg-black/60 backdrop-blur-xl border-t border-white/10"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex items-center justify-between px-4 py-3 gap-4">
            <button
              onClick={openLeftDrawer}
              className="flex flex-col items-center gap-1 p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <List size={22} className="text-white" />
              <span className="text-xs text-white/60">الفصول</span>
            </button>
            <div className="flex gap-4">
              <button
                onClick={() => navigateNextPrev(-1)}
                className="flex flex-col items-center gap-1 p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <ChevronLeft size={22} className="text-white" />
                <span className="text-xs text-white/60">السابق</span>
              </button>
              <button
                onClick={() => navigateNextPrev(1)}
                className="flex flex-col items-center gap-1 p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <ChevronRight size={22} className="text-white" />
                <span className="text-xs text-white/60">التالي</span>
              </button>
            </div>
            <button
              onClick={() => setShowComments(true)}
              className="flex flex-col items-center gap-1 p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <MessageCircle size={22} className="text-white" />
              <span className="text-xs text-white/60">{commentCount}</span>
            </button>
          </div>
        </motion.div>

        <ChapterContent key={iframeKey} html={html} onMessage={handleIframeMessage} />

        <ChapterDrawer
          isOpen={drawerMode === 'chapters'}
          onClose={closeDrawers}
          chapters={sortedChapters}
          currentChapterId={chapterId!}
          isAscending={isAscending}
          onToggleSort={() => setIsAscending(prev => !prev)}
          onSelectChapter={navigateChapter}
          loading={loadingChapters}
        />

        <ReplacementsDrawer
          isOpen={drawerMode === 'replacements'}
          onClose={closeDrawers}
          folders={replacements.folders}
          currentFolderId={replacements.currentFolderId}
          viewMode={replacements.viewMode}
          search={replacements.search}
          sortDesc={replacements.sortDesc}
          newOriginal={replacements.newOriginal}
          newReplacement={replacements.newReplacement}
          editingId={replacements.editingId}
          filteredSortedReplacements={replacements.filteredSortedReplacements}
          onSearchChange={replacements.setSearch}
          onNewOriginalChange={replacements.setNewOriginal}
          onNewReplacementChange={replacements.setNewReplacement}
          onAddReplacement={replacements.addReplacement}
          onEditReplacement={replacements.editReplacement}
          onDeleteReplacement={replacements.deleteReplacement}
          onOpenFolder={replacements.openFolder}
          onDeleteFolder={replacements.deleteFolder}
          onBackToFolders={replacements.backToFolders}
          onToggleSort={replacements.toggleSort}
          onShowFolderModal={replacements.setShowFolderModal}
          onCreateFolder={replacements.createFolder}
        />

        {isAdmin && (
          <CleanerDrawer
            isOpen={drawerMode === 'cleaner'}
            onClose={closeDrawers}
            cleanerWords={cleaner.cleanerWords}
            newCleanerWord={cleaner.newCleanerWord}
            cleaningLoading={cleaner.cleaningLoading}
            onNewCleanerWordChange={cleaner.setNewCleanerWord}
            onExecuteCleaner={cleaner.executeCleaner}
            onEditCleaner={cleaner.editCleaner}
            onDeleteCleaner={cleaner.deleteCleaner}
          />
        )}

        {isAdmin && (
          <CopyrightDrawer
            isOpen={drawerMode === 'copyright'}
            onClose={closeDrawers}
            startText={copyright.startText}
            endText={copyright.endText}
            style={copyright.style}
            hexColor={copyright.hexColor}
            frequency={copyright.frequency}
            everyX={copyright.everyX}
            enableSeparator={copyright.enableSeparator}
            separatorText={copyright.separatorText}
            loading={copyright.loading}
            onStartTextChange={copyright.setStartText}
            onEndTextChange={copyright.setEndText}
            onStyleChange={copyright.setStyle}
            onHexColorChange={copyright.setHexColor}
            onFrequencyChange={copyright.setFrequency}
            onEveryXChange={copyright.setEveryX}
            onEnableSeparatorChange={copyright.setEnableSeparator}
            onSeparatorTextChange={copyright.setSeparatorText}
            onSave={copyright.saveCopyright}
          />
        )}

        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          settings={settings}
          onFontSizeChange={changeFontSize}
          onThemeChange={changeTheme}
          onFontChange={handleFontChange}
          onBrightnessChange={handleBrightnessChange}
          onDialogueToggle={dialogue.setEnable}
          onDialogueColorChange={dialogue.setColor}
          onDialogueSizeChange={dialogue.setSize}
          onHideQuotesToggle={dialogue.setHideQuotes}
          onQuoteStyleChange={dialogue.setStyle}
          onMarkdownToggle={markdown.setEnable}
          onMarkdownColorChange={markdown.setColor}
          onMarkdownSizeChange={markdown.setSize}
          onHideMarkdownMarksToggle={markdown.setHideMarks}
          onMarkdownStyleChange={markdown.setStyle}
          onOpenReplacements={() => openRightDrawer('replacements')}
          onOpenCleaner={() => openRightDrawer('cleaner')}
          onOpenCopyright={() => openRightDrawer('copyright')}
          isAdmin={isAdmin}
        />

        <CommentsModal
          isOpen={showComments}
          onClose={() => setShowComments(false)}
          novelId={novelId!}
          chapterId={parseInt(chapterId!)}
          onAddComment={handleAddComment}
        />

        {drawerMode !== 'none' && (
          <div className="fixed inset-0 bg-black/50 z-25" onClick={closeDrawers} />
        )}
      </div>
    </>
  );
}