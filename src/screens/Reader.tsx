import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  List,
  X,
  Trash2,
  Save,
  ArrowUpDown,
  FolderPlus,
  ArrowLeft,
  MessageCircle,
  User,
  Eye,
  Sun,
  Moon,
  Palette,
  Type,
  Bold,
  Quote,
  Sparkles,
  PlusCircle,
  MinusCircle,
  Check,
  MoveHorizontal,
  AlignCenter,
  AlignLeft,
  AlignRight,
  RotateCcw,
  Download,
  Upload,
} from 'lucide-react';
import { novelService, ChapterFull } from '../services/novel';
import { commentService } from '../services/comment';
import { userService } from '../services/user';
import { useAuth } from '../context/AuthContext'; // افترض وجوده
import { toast } from 'react-hot-toast'; // أو أي مكتبة تنبيهات

// --- Helper: Custom Slider (مثل الموجود في الأصلي) ---
const CustomSlider = ({ value, onValueChange, min, max, step = 1, activeColor = '#4a7cc7' }: {
  value: number;
  onValueChange: (val: number) => void;
  min: number;
  max: number;
  step?: number;
  activeColor?: string;
}) => {
  const [sliderWidth, setSliderWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) setSliderWidth(containerRef.current.clientWidth);
    const handleResize = () => setSliderWidth(containerRef.current?.clientWidth || 0);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const percentage = ((value - min) / (max - min)) * 100;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!sliderWidth) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    let newVal = min + (x / sliderWidth) * (max - min);
    if (step) newVal = Math.round(newVal / step) * step;
    newVal = Math.min(max, Math.max(min, newVal));
    onValueChange(newVal);
  };

  return (
    <div ref={containerRef} className="relative flex-1 h-6 cursor-pointer" onClick={handleClick}>
      <div className="absolute top-1/2 -translate-y-1/2 w-full h-1 bg-gray-800 rounded-full" />
      <div
        className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full"
        style={{ width: `${percentage}%`, backgroundColor: activeColor }}
      />
      <div
        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-md border border-gray-600"
        style={{ left: `${percentage}%`, transform: 'translate(-50%, -50%)' }}
      />
    </div>
  );
};

// --- خيارات الخطوط (مطابقة للأصلي) ---
const FONT_OPTIONS = [
  { id: 'Cairo', name: 'القاهرة', family: "'Cairo', sans-serif", url: 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap' },
  { id: 'Amiri', name: 'أميري', family: "'Amiri', serif", url: 'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap' },
  { id: 'Geeza', name: 'جيزة', family: "'Geeza Pro', 'Segoe UI', Tahoma, sans-serif", url: '' },
  { id: 'Noto', name: 'نوتو كوفي', family: "'Noto Kufi Arabic', sans-serif", url: 'https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;700&display=swap' },
  { id: 'Arial', name: 'آريال', family: "Arial, sans-serif", url: '' },
  { id: 'Times', name: 'تايمز', family: "'Times New Roman', serif", url: '' },
];

// --- خيارات الألوان المتقدمة ---
const ADVANCED_COLORS = [
  { color: '#ffffff', name: 'white' },
  { color: '#f97316', name: 'orange' },
  { color: '#ec4899', name: 'pink' },
  { color: '#a855f7', name: 'purple' },
  { color: '#fbbf24', name: 'yellow' },
  { color: '#ef4444', name: 'red' },
  { color: '#3b82f6', name: 'blue' },
  { color: '#4ade80', name: 'green' },
  { color: '#888888', name: 'gray' },
  { color: '#000000', name: 'black' },
];

// --- أنماط الأقواس ---
const QUOTE_STYLES = [
  { id: 'all', label: 'بدون', preview: 'لا شيء' },
  { id: 'guillemets', label: '« »', preview: '«نص»' },
  { id: 'curly', label: '“ ”', preview: '“نص”' },
  { id: 'straight', label: '" "', preview: '"نص"' },
  { id: 'single', label: '‘ ’', preview: '‘نص’' },
];

// --- دالة تنسيق الوقت النسبي (للفصول الجديدة) ---
const formatRelativeTime = (date: Date | string): string => {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  if (diffMin < 1) return 'الآن';
  if (diffHour < 1) return `منذ ${diffMin} دقيقة`;
  if (diffDay < 1) return `منذ ${diffHour} ساعة`;
  if (diffDay < 30) return `منذ ${diffDay} يوم`;
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
};

export default function Reader() {
  const { novelId, chapterId } = useParams<{ novelId: string; chapterId: string }>();
  const navigate = useNavigate();
  const { userInfo, isAuthenticated } = useAuth(); // افتراضي
  const isAdmin = userInfo?.role === 'admin';

  // --- State ---
  const [novel, setNovel] = useState<any>(null);
  const [chapter, setChapter] = useState<ChapterFull | null>(null);
  const [chaptersList, setChaptersList] = useState<any[]>([]);
  const [loadingNovel, setLoadingNovel] = useState(true);
  const [loadingChapter, setLoadingChapter] = useState(true);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [totalChapters, setTotalChapters] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [authorProfile, setAuthorProfile] = useState<any>(null);

  // --- إعدادات القارئ ---
  const [fontSize, setFontSize] = useState(19);
  const [bgColor, setBgColor] = useState('#0a0a0a');
  const [textColor, setTextColor] = useState('#e0e0e0');
  const [fontFamily, setFontFamily] = useState(FONT_OPTIONS[0]);
  const [textBrightness, setTextBrightness] = useState(1);

  // --- تنسيق الحوار ---
  const [enableDialogue, setEnableDialogue] = useState(false);
  const [dialogueColor, setDialogueColor] = useState('#4ade80');
  const [dialogueSize, setDialogueSize] = useState(100);
  const [hideQuotes, setHideQuotes] = useState(false);
  const [selectedQuoteStyle, setSelectedQuoteStyle] = useState('all');

  // --- تنسيق الخط العريض (Markdown) ---
  const [enableMarkdown, setEnableMarkdown] = useState(false);
  const [markdownColor, setMarkdownColor] = useState('#ffffff');
  const [markdownSize, setMarkdownSize] = useState(100);
  const [hideMarkdownMarks, setHideMarkdownMarks] = useState(false);
  const [selectedMarkdownStyle, setSelectedMarkdownStyle] = useState('all');

  // --- استبدالات الكلمات ---
  const [folders, setFolders] = useState<any[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [replacementViewMode, setReplacementViewMode] = useState<'folders' | 'list'>('folders');
  const [replaceSearch, setReplaceSearch] = useState('');
  const [replaceSortDesc, setReplaceSortDesc] = useState(true);
  const [newOriginal, setNewOriginal] = useState('');
  const [newReplacement, setNewReplacement] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // --- الأدوات (Admin only) ---
  const [cleanerWords, setCleanerWords] = useState<string[]>([]);
  const [newCleanerWord, setNewCleanerWord] = useState('');
  const [cleanerEditingId, setCleanerEditingId] = useState<number | null>(null);
  const [cleaningLoading, setCleaningLoading] = useState(false);

  const [copyrightStartText, setCopyrightStartText] = useState('');
  const [copyrightEndText, setCopyrightEndText] = useState('');
  const [copyrightLoading, setCopyrightLoading] = useState(false);
  const [copyrightStyle, setCopyrightStyle] = useState({
    color: '#888888',
    opacity: 1,
    alignment: 'center',
    isBold: true,
    fontSize: 14,
  });
  const [hexColorInput, setHexColorInput] = useState('#888888');
  const [copyrightFrequency, setCopyrightFrequency] = useState('always');
  const [copyrightEveryX, setCopyrightEveryX] = useState('5');
  const [enableSeparator, setEnableSeparator] = useState(true);
  const [separatorText, setSeparatorText] = useState('________________________________________');

  // --- حالة الواجهة ---
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsView, setSettingsView] = useState<'main' | 'appearance'>('main');
  const [drawerMode, setDrawerMode] = useState<'none' | 'chapters' | 'replacements' | 'cleaner' | 'copyright'>('none');
  const [showComments, setShowComments] = useState(false);
  const [isAscending, setIsAscending] = useState(true);
  const [iframeKey, setIframeKey] = useState(0); // لإعادة تحميل iframe عند تغيير الإعدادات

  // --- مراجع ---
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // --- تحميل إعدادات القارئ من localStorage ---
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const saved = localStorage.getItem('@reader_settings_v3');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.fontSize) setFontSize(parsed.fontSize);
          if (parsed.bgColor) {
            setBgColor(parsed.bgColor);
            setTextColor(parsed.bgColor === '#fff' ? '#1a1a1a' : '#e0e0e0');
          }
          if (parsed.fontId) {
            const found = FONT_OPTIONS.find(f => f.id === parsed.fontId);
            if (found) setFontFamily(found);
          }
          if (parsed.enableDialogue !== undefined) setEnableDialogue(parsed.enableDialogue);
          if (parsed.dialogueColor) setDialogueColor(parsed.dialogueColor);
          if (parsed.dialogueSize) setDialogueSize(parsed.dialogueSize);
          if (parsed.hideQuotes !== undefined) setHideQuotes(parsed.hideQuotes);
          if (parsed.selectedQuoteStyle) setSelectedQuoteStyle(parsed.selectedQuoteStyle);
          if (parsed.enableMarkdown !== undefined) setEnableMarkdown(parsed.enableMarkdown);
          if (parsed.markdownColor) setMarkdownColor(parsed.markdownColor);
          if (parsed.markdownSize) setMarkdownSize(parsed.markdownSize);
          if (parsed.hideMarkdownMarks !== undefined) setHideMarkdownMarks(parsed.hideMarkdownMarks);
          if (parsed.selectedMarkdownStyle) setSelectedMarkdownStyle(parsed.selectedMarkdownStyle);
          if (parsed.textBrightness) setTextBrightness(parsed.textBrightness);
        }
      } catch (e) {
        console.error('Failed to load settings', e);
      }
    };
    loadSettings();
  }, []);

  const saveSettings = useCallback((newSettings: any) => {
    try {
      const current = localStorage.getItem('@reader_settings_v3');
      const existing = current ? JSON.parse(current) : {};
      const updated = { ...existing, ...newSettings };
      localStorage.setItem('@reader_settings_v3', JSON.stringify(updated));
    } catch (e) {}
  }, []);

  // --- تحميل مجلدات الاستبدال ---
  useEffect(() => {
    const loadFolders = async () => {
      try {
        const saved = localStorage.getItem('@reader_folders_v2');
        if (saved) {
          setFolders(JSON.parse(saved));
        } else {
          // ترحيل الإعدادات القديمة إن وجدت
          const oldReplacements = localStorage.getItem('@reader_replacements');
          if (oldReplacements) {
            const migrated = [{
              id: 'default_migrated',
              name: 'عام (قديم)',
              replacements: JSON.parse(oldReplacements),
            }];
            setFolders(migrated);
            localStorage.setItem('@reader_folders_v2', JSON.stringify(migrated));
          }
        }
        const prefs = localStorage.getItem('@reader_ui_prefs');
        if (prefs) {
          const { lastFolderId, sortDesc } = JSON.parse(prefs);
          if (sortDesc !== undefined) setReplaceSortDesc(sortDesc);
          if (lastFolderId && folders.find(f => f.id === lastFolderId)) {
            setCurrentFolderId(lastFolderId);
            setReplacementViewMode('list');
          }
        }
      } catch (e) {}
    };
    loadFolders();
  }, []);

  const saveFolders = useCallback((newFolders: any[]) => {
    setFolders(newFolders);
    localStorage.setItem('@reader_folders_v2', JSON.stringify(newFolders));
  }, []);

  const saveUiPrefs = useCallback((prefs: any) => {
    const existing = localStorage.getItem('@reader_ui_prefs');
    const current = existing ? JSON.parse(existing) : {};
    localStorage.setItem('@reader_ui_prefs', JSON.stringify({ ...current, ...prefs }));
  }, []);

  // --- تحميل بيانات الرواية والفصول ---
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
        console.error('Failed to fetch novel', err);
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
        console.error('Failed to fetch chapters list', err);
      } finally {
        setLoadingChapters(false);
      }
    };
    fetchChapters();
  }, [novelId]);

  // --- تحميل الفصل الحالي ---
  useEffect(() => {
    if (!novelId || !chapterId) return;
    const fetchChapter = async () => {
      setLoadingChapter(true);
      try {
        const data = await novelService.getChapter(novelId, chapterId);
        setChapter(data);
        // زيادة عدد المشاهدات في الخلفية
        await novelService.incrementView(novelId, parseInt(chapterId));
        // تحديث التقدم
        await novelService.updateReadingStatus({
          novelId,
          lastChapterId: parseInt(chapterId),
          lastChapterTitle: data.title,
        });
        // جلب عدد التعليقات
        const commentsRes = await commentService.getComments(novelId, parseInt(chapterId), 1, 1);
        setCommentCount(commentsRes.totalComments);
      } catch (err) {
        console.error('Failed to fetch chapter', err);
        toast.error('فشل تحميل الفصل');
      } finally {
        setLoadingChapter(false);
      }
    };
    fetchChapter();
  }, [novelId, chapterId]);

  // --- جلب كلمات التنظيف (admin only) ---
  useEffect(() => {
    if (isAdmin) {
      const fetchCleaner = async () => {
        try {
          const res = await fetch('/api/admin/cleaner');
          const data = await res.json();
          setCleanerWords(data);
        } catch (e) {}
      };
      const fetchCopyright = async () => {
        try {
          const res = await fetch('/api/admin/copyright');
          const data = await res.json();
          setCopyrightStartText(data.startText || '');
          setCopyrightEndText(data.endText || '');
          if (data.styles) setCopyrightStyle(prev => ({ ...prev, ...data.styles }));
          setHexColorInput(data.styles?.color || '#888888');
          if (data.frequency) setCopyrightFrequency(data.frequency);
          if (data.everyX) setCopyrightEveryX(data.everyX.toString());
          if (data.chapterSeparatorText) setSeparatorText(data.chapterSeparatorText);
          if (data.enableChapterSeparator !== undefined) setEnableSeparator(data.enableChapterSeparator);
        } catch (e) {}
      };
      fetchCleaner();
      fetchCopyright();
    }
  }, [isAdmin]);

  // --- معالجة الاستبدالات النشطة ---
  const activeReplacements = useMemo(() => {
    if (!currentFolderId) return [];
    const folder = folders.find(f => f.id === currentFolderId);
    return folder ? folder.replacements : [];
  }, [folders, currentFolderId]);

  // --- تطبيق الاستبدالات على النص ---
  const getProcessedContent = useMemo(() => {
    if (!chapter || !chapter.content) return '';
    let content = chapter.content;
    activeReplacements.forEach(rep => {
      if (rep.original && rep.replacement) {
        const escaped = rep.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped, 'g');
        content = content.replace(regex, rep.replacement);
      }
    });
    return content;
  }, [chapter, activeReplacements]);

  // --- دالة إنشاء HTML (نفس الأصلي) ---
  const generateHTML = useCallback(() => {
    if (!chapter) return '';

    const startCopy = chapter.copyrightStart;
    const endCopy = chapter.copyrightEnd;
    const style = chapter.copyrightStyles || {};

    const copyrightCSS = `
      color: ${style.color || '#888'};
      opacity: ${style.opacity || 1};
      text-align: ${style.alignment || 'center'};
      font-weight: ${style.isBold ? 'bold' : 'normal'};
      font-size: ${style.fontSize || 14}px;
      line-height: 1.5;
      padding: 15px 0;
      margin: 10px 0;
      font-family: sans-serif;
    `;

    const dividerCSS = `
      .chapter-divider {
        border: none;
        height: 1px;
        background-color: rgba(128,128,128,0.3);
        margin: 10px 0 30px 0;
        width: 100%;
      }
    `;
    const dividerHTML = `<div class="chapter-divider"></div>`;

    const startHTML = startCopy ? `
      <div class="app-copyright start" style="${copyrightCSS}">
        ${startCopy}
      </div>
      ${dividerHTML}
    ` : '';

    const endHTML = endCopy ? `
      ${dividerHTML}
      <div class="app-copyright end" style="${copyrightCSS}">
        ${endCopy}
      </div>
    ` : '';

    let content = getProcessedContent;

    // تطبيق التنظيف (blocklist) إذا كان المسؤول
    if (isAdmin && cleanerWords.length) {
      cleanerWords.forEach(word => {
        if (!word) return;
        if (word.includes('\n') || word.includes('\r')) {
          content = content.split(word).join('');
        } else {
          const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`^.*${escaped}.*$`, 'gm');
          content = content.replace(regex, '');
        }
      });
    }

    // تطبيق الفاصل (separator) - فقط تحت أول سطر يحتوي على كلمة "الفصل" أو "Chapter"
    if (enableSeparator) {
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().length > 0 && /^(?:الفصل|Chapter|فصل)|:/i.test(lines[i].trim())) {
          lines[i] = lines[i] + `\n\n${separatorText}\n\n`;
          break;
        }
      }
      content = lines.join('\n');
    }

    // تنسيق النص الأساسي (تقسيم إلى فقرات)
    const formattedContent = content
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(line => {
        let processedLine = line;

        // تنسيق الخط العريض (Markdown)
        if (enableMarkdown) {
          const markClass = hideMarkdownMarks ? 'mark-hidden' : 'mark-visible';
          let openQuote = '', closeQuote = '';
          if (selectedMarkdownStyle === 'guillemets') { openQuote = '«'; closeQuote = '»'; }
          else if (selectedMarkdownStyle === 'curly') { openQuote = '“'; closeQuote = '”'; }
          else if (selectedMarkdownStyle === 'straight') { openQuote = '"'; closeQuote = '"'; }
          else if (selectedMarkdownStyle === 'single') { openQuote = '‘'; closeQuote = '’'; }

          processedLine = processedLine.replace(/\*\*(.*?)\*\*/g, (_, text) => {
            const quoteStart = openQuote ? `<span class="cm-quote-style">${openQuote}</span>` : '';
            const quoteEnd = closeQuote ? `<span class="cm-quote-style">${closeQuote}</span>` : '';
            return `<span class="cm-markdown-bold"><span class="${markClass}">**</span>${quoteStart}${text}${quoteEnd}<span class="${markClass}">**</span></span>`;
          });
        }

        // تنسيق الحوار
        if (enableDialogue) {
          const quoteClass = hideQuotes ? 'quote-mark hidden' : 'quote-mark';
          let quoteRegex;
          if (selectedQuoteStyle === 'guillemets') {
            quoteRegex = /(«)([\s\S]*?)(»)/g;
          } else if (selectedQuoteStyle === 'curly') {
            quoteRegex = /([“])([\s\S]*?)([”])/g;
          } else if (selectedQuoteStyle === 'straight') {
            quoteRegex = /(")([\s\S]*?)(")/g;
          } else if (selectedQuoteStyle === 'single') {
            quoteRegex = /(['‘])([\s\S]*?)(['’])/g;
          } else {
            quoteRegex = /([“"«])([\s\S]*?)([”"»])/g;
          }

          processedLine = processedLine.replace(quoteRegex, (_, open, text, close) => {
            return `<span class="cm-dialogue-text"><span class="${quoteClass}">${open}</span>${text}<span class="${quoteClass}">${close}</span></span>`;
          });
        }

        return `<p>${processedLine}</p>`;
      })
      .join('');

    // استيراد الخطوط
    const fontImports = FONT_OPTIONS.map(f => f.url ? `@import url('${f.url}');` : '').join('\n');

    const authorName = authorProfile?.name || novel?.author || 'Zeus';
    const authorAvatar = authorProfile?.picture || 'https://via.placeholder.com/150';
    const authorBanner = authorProfile?.banner || null;
    const bannerStyle = authorBanner ? `background-image: url('${authorBanner}');` : 'background-color: #000;';

    const publisherBanner = `
      <div class="author-section-wrapper">
        <div class="section-title">الناشر</div>
        <div class="author-card" id="authorCard">
          <div class="author-banner" style="${bannerStyle}"></div>
          <div class="author-overlay"></div>
          <div class="author-content">
            <div class="author-avatar-wrapper">
              <img src="${authorAvatar}" class="author-avatar-img" />
            </div>
            <div class="author-name">${authorName}</div>
          </div>
        </div>
      </div>
    `;

    const commentsButton = `
      <div class="comments-btn-container">
        <button class="comments-btn" id="commentsBtn">
          <span class="icon">💬</span>
          <span>عرض التعليقات (${commentCount})</span>
        </button>
      </div>
    `;

    const brightnessStyle = `filter: brightness(${textBrightness});`;

    return `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          ${fontImports}
          * { -webkit-tap-highlight-color: transparent; -webkit-touch-callout: none; box-sizing: border-box; }
          body, html {
            margin: 0; padding: 0; background-color: ${bgColor}; color: ${textColor};
            font-family: ${fontFamily.family}; line-height: 1.8;
            -webkit-overflow-scrolling: touch;
            overflow-x: hidden;
            ${brightnessStyle}
          }
          .container { padding: 25px 20px 120px 20px; width: 100%; max-width: 800px; margin: 0 auto; }
          .title {
            font-size: ${fontSize + 8}px; font-weight: bold; margin-bottom: 20px;
            color: ${bgColor === '#fff' ? '#000' : '#fff'};
            padding-bottom: 10px; font-family: ${fontFamily.family};
            text-align: right;
          }
          ${dividerCSS}
          .content-area { font-size: ${fontSize}px; text-align: justify; word-wrap: break-word; }
          p { margin-bottom: 1.5em; }
          .cm-dialogue-text {
            color: ${enableDialogue ? dialogueColor : 'inherit'};
            font-size: ${dialogueSize}%;
            font-weight: bold;
            transition: color 0.3s ease, font-size 0.3s ease;
          }
          .cm-markdown-bold {
            font-weight: bold;
            color: ${enableMarkdown ? markdownColor : 'inherit'};
            font-size: ${markdownSize}%;
            transition: color 0.3s ease, font-size 0.3s ease;
          }
          .cm-quote-style { opacity: 1; }
          .quote-mark { opacity: 1; transition: opacity 0.3s ease; }
          .quote-mark.hidden { opacity: 0; font-size: 0; }
          .mark-visible { opacity: 1; }
          .mark-hidden { opacity: 0; font-size: 0; }

          body { user-select: none; -webkit-user-select: none; }
          .author-section-wrapper { margin-top: 50px; margin-bottom: 20px; border-top: 1px solid #222; padding-top: 20px; }
          .section-title { color: ${bgColor === '#fff' ? '#000' : '#fff'}; font-size: 18px; font-weight: bold; margin-bottom: 12px; text-align: right; }
          .author-card { border-radius: 16px; overflow: hidden; margin-top: 10px; border: 1px solid #222; position: relative; height: 140px; width: 100%; cursor: pointer; }
          .author-banner { position: absolute; width: 100%; height: 100%; background-size: cover; background-position: center; }
          .author-overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.8)); z-index: 1; }
          .author-content { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 2; width: 100%; }
          .author-avatar-wrapper { width: 76px; height: 76px; border-radius: 38px; border: 3px solid #fff; background-color: #333; margin-bottom: 8px; overflow: hidden; }
          .author-avatar-img { width: 100%; height: 100%; object-fit: cover; }
          .author-name { color: #fff; font-size: 20px; font-weight: bold; text-transform: uppercase; text-shadow: 0 1px 6px rgba(0, 0, 0, 0.9); text-align: center; }
          .comments-btn-container { margin-bottom: 40px; padding: 0 5px; }
          .comments-btn { width: 100%; background-color: ${bgColor === '#fff' ? '#f0f0f0' : '#1a1a1a'}; border: 1px solid ${bgColor === '#fff' ? '#ddd' : '#333'}; color: ${bgColor === '#fff' ? '#333' : '#fff'}; padding: 15px; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        </style>
      </head>
      <body>
        <div class="container" id="clickable-area">
          <div class="title">${chapter.title}</div>
          ${dividerHTML}
          ${startHTML}
          <div class="content-area">${formattedContent}</div>
          ${endHTML}
          ${publisherBanner}
          ${commentsButton}
        </div>
        <script>
          function sendMessage(msg) {
            if (window.parent) { window.parent.postMessage(msg, '*'); }
          }
          document.addEventListener('click', function(e) {
            try {
              if (e.target.closest('#commentsBtn')) { e.stopPropagation(); sendMessage('openComments'); return; }
              if (e.target.closest('#authorCard')) { e.stopPropagation(); sendMessage('openProfile'); return; }
              var selection = window.getSelection();
              if (selection && selection.toString().length > 0) return;
              sendMessage('toggleMenu');
            } catch(err) {}
          });
        </script>
      </body>
      </html>
    `;
  }, [
    chapter, bgColor, textColor, fontFamily, fontSize, enableDialogue, dialogueColor, dialogueSize,
    hideQuotes, selectedQuoteStyle, enableMarkdown, markdownColor, markdownSize, hideMarkdownMarks,
    selectedMarkdownStyle, textBrightness, activeReplacements, authorProfile, novel, commentCount,
    isAdmin, cleanerWords, enableSeparator, separatorText, copyrightStartText, copyrightEndText,
    copyrightStyle, copyrightFrequency, copyrightEveryX
  ]);

  // --- معالجة رسائل iframe ---
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data === 'toggleMenu') {
        setShowMenu(prev => !prev);
      } else if (event.data === 'openComments') {
        setShowComments(true);
      } else if (event.data === 'openProfile') {
        if (authorProfile) navigate(`/user/${authorProfile._id}`);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [authorProfile, navigate]);

  // --- إعادة تحميل iframe عند تغيير الإعدادات ---
  useEffect(() => {
    setIframeKey(prev => prev + 1);
  }, [generateHTML]); // في كل مرة تتغير generateHTML

  // --- دوال التحكم في الإعدادات ---
  const changeFontSize = (delta: number) => {
    const newSize = fontSize + delta;
    if (newSize >= 14 && newSize <= 32) {
      setFontSize(newSize);
      saveSettings({ fontSize: newSize });
    }
  };

  const changeTheme = (newBgColor: string) => {
    setBgColor(newBgColor);
    const newTextColor = newBgColor === '#fff' ? '#1a1a1a' : '#e0e0e0';
    setTextColor(newTextColor);
    saveSettings({ bgColor: newBgColor });
  };

  const handleFontChange = (font: typeof FONT_OPTIONS[0]) => {
    setFontFamily(font);
    saveSettings({ fontId: font.id });
  };

  const handleBrightnessChange = (val: number) => {
    setTextBrightness(val);
    saveSettings({ textBrightness: val });
  };

  // --- دوال مجلدات الاستبدال ---
  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const newFolder = { id: Date.now().toString(), name: newFolderName.trim(), replacements: [] };
    saveFolders([...folders, newFolder]);
    setShowFolderModal(false);
    setNewFolderName('');
  };

  const deleteFolder = (folderId: string) => {
    if (window.confirm('هل أنت متأكد؟ سيتم حذف جميع الاستبدالات داخله.')) {
      const updated = folders.filter(f => f.id !== folderId);
      saveFolders(updated);
      if (currentFolderId === folderId) {
        setCurrentFolderId(null);
        setReplacementViewMode('folders');
      }
    }
  };

  const openFolder = (folderId: string) => {
    setCurrentFolderId(folderId);
    setReplacementViewMode('list');
    saveUiPrefs({ lastFolderId: folderId });
    setReplaceSearch('');
  };

  const backToFolders = () => {
    setReplacementViewMode('folders');
  };

  const toggleSortOrder = () => {
    const newOrder = !replaceSortDesc;
    setReplaceSortDesc(newOrder);
    saveUiPrefs({ sortDesc: newOrder });
  };

  const handleAddReplacement = () => {
    if (!currentFolderId) return;
    if (!newOriginal.trim() || !newReplacement.trim()) {
      toast.error('يرجى إدخال الكلمة الأصلية والبديلة');
      return;
    }
    const folderIndex = folders.findIndex(f => f.id === currentFolderId);
    if (folderIndex === -1) return;
    const folder = folders[folderIndex];
    let updatedReplacements = [...folder.replacements];
    if (editingId !== null) {
      updatedReplacements[editingId] = { original: newOriginal.trim(), replacement: newReplacement.trim() };
      setEditingId(null);
    } else {
      updatedReplacements.push({ original: newOriginal.trim(), replacement: newReplacement.trim() });
    }
    const updatedFolders = [...folders];
    updatedFolders[folderIndex] = { ...folder, replacements: updatedReplacements };
    saveFolders(updatedFolders);
    setNewOriginal('');
    setNewReplacement('');
  };

  const handleEditReplacement = (item: any, idx: number) => {
    setNewOriginal(item.original);
    setNewReplacement(item.replacement);
    setEditingId(idx);
  };

  const handleDeleteReplacement = (idx: number) => {
    if (!currentFolderId) return;
    const folderIndex = folders.findIndex(f => f.id === currentFolderId);
    if (folderIndex === -1) return;
    const folder = folders[folderIndex];
    const updatedReplacements = folder.replacements.filter((_, i) => i !== idx);
    const updatedFolders = [...folders];
    updatedFolders[folderIndex] = { ...folder, replacements: updatedReplacements };
    saveFolders(updatedFolders);
    if (editingId === idx) {
      setEditingId(null);
      setNewOriginal('');
      setNewReplacement('');
    }
  };

  const filteredSortedReplacements = useMemo(() => {
    let list = activeReplacements.map((item, idx) => ({ ...item, idx }));
    if (replaceSearch.trim()) {
      const q = replaceSearch.toLowerCase();
      list = list.filter(item =>
        item.original.toLowerCase().includes(q) || item.replacement.toLowerCase().includes(q)
      );
    }
    if (replaceSortDesc) list.reverse();
    return list;
  }, [activeReplacements, replaceSearch, replaceSortDesc]);

  // --- دوال التنظيف (admin) ---
  const handleExecuteCleaner = async () => {
    if (!newCleanerWord.trim()) {
      toast.error('يرجى إدخال النص المراد حذفه');
      return;
    }
    if (!window.confirm('سيتم حذف أي فقرة أو نص مطابق لما أدخلته من جميع الفصول في السيرفر. هل أنت متأكد؟')) return;
    setCleaningLoading(true);
    try {
      const method = cleanerEditingId !== null ? 'PUT' : 'POST';
      const url = cleanerEditingId !== null ? `/api/admin/cleaner/${cleanerEditingId}` : '/api/admin/cleaner';
      const body = { word: newCleanerWord };
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      if (cleanerEditingId !== null) {
        setCleanerEditingId(null);
      }
      setNewCleanerWord('');
      // إعادة تحميل القائمة
      const fresh = await fetch('/api/admin/cleaner');
      const data = await fresh.json();
      setCleanerWords(data);
      toast.success('تم الحذف من جميع الفصول بنجاح');
      setIframeKey(prev => prev + 1); // إعادة تحميل المحتوى
    } catch (e) {
      toast.error('فشل تنفيذ الحذف');
    } finally {
      setCleaningLoading(false);
    }
  };

  const handleEditCleaner = (word: string, idx: number) => {
    setNewCleanerWord(word);
    setCleanerEditingId(idx);
  };

  const handleDeleteCleaner = async (word: string) => {
    if (!window.confirm('هل تريد إزالة هذا النص من القائمة؟')) return;
    try {
      await fetch(`/api/admin/cleaner/${encodeURIComponent(word)}`, { method: 'DELETE' });
      const fresh = await fetch('/api/admin/cleaner');
      const data = await fresh.json();
      setCleanerWords(data);
      if (newCleanerWord === word) {
        setNewCleanerWord('');
        setCleanerEditingId(null);
      }
      toast.success('تم الحذف من القائمة');
    } catch (e) {
      toast.error('فشل الحذف');
    }
  };

  // --- دوال حقوق النشر (admin) ---
  const handleSaveCopyrights = async () => {
    setCopyrightLoading(true);
    try {
      const res = await fetch('/api/admin/copyright', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startText: copyrightStartText,
          endText: copyrightEndText,
          styles: copyrightStyle,
          frequency: copyrightFrequency,
          everyX: parseInt(copyrightEveryX) || 5,
          chapterSeparatorText: separatorText,
          enableChapterSeparator: enableSeparator,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('تم حفظ الحقوق والإعدادات بنجاح');
      setIframeKey(prev => prev + 1);
    } catch (e) {
      toast.error('فشل الحفظ');
    } finally {
      setCopyrightLoading(false);
    }
  };

  // --- التنقل بين الفصول ---
  const navigateChapter = (targetId: number) => {
    if (targetId === parseInt(chapterId)) return;
    navigate(`/novel/${novelId}/reader/${targetId}`);
    closeDrawers();
  };

  const navigateNextPrev = (offset: number) => {
    const currentNum = parseInt(chapterId);
    const nextNum = currentNum + offset;
    if (nextNum < 1) return;
    if (totalChapters > 0 && nextNum > totalChapters) {
      toast.error('أنت في آخر فصل متاح.');
      return;
    }
    navigate(`/novel/${novelId}/reader/${nextNum}`);
  };

  // --- دوال الإغلاق والدرج ---
  const closeDrawers = () => {
    setDrawerMode('none');
    setEditingId(null);
    setNewOriginal('');
    setNewReplacement('');
    setCleanerEditingId(null);
    setNewCleanerWord('');
  };

  const openLeftDrawer = () => setDrawerMode('chapters');
  const openRightDrawer = (mode: 'replacements' | 'cleaner' | 'copyright') => {
    if (mode === 'replacements' && !currentFolderId) setReplacementViewMode('folders');
    setDrawerMode(mode);
  };

  const toggleSort = () => setIsAscending(prev => !prev);
  const sortedChapters = useMemo(() => {
    let list = [...chaptersList];
    if (!isAscending) list.reverse();
    return list;
  }, [chaptersList, isAscending]);

  // --- عرض الفصول ---
  const renderChapterItem = (chapter: any) => (
    <button
      key={chapter._id}
      onClick={() => navigateChapter(chapter.number)}
      className={`w-full text-right py-3 px-4 border-b border-gray-800 transition-colors ${
        chapter.number == chapterId ? 'bg-blue-500/20 text-blue-400' : 'text-gray-300 hover:bg-gray-800'
      }`}
    >
      <div className="font-medium">{chapter.title || `فصل ${chapter.number}`}</div>
      <div className="text-xs text-gray-500 mt-1">{formatRelativeTime(chapter.createdAt)}</div>
    </button>
  );

  // --- حالة التحميل ---
  if (loadingNovel || loadingChapter) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-white">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>قمر الروايات - {chapter?.title || `فصل ${chapterId}`}</title>
      </Helmet>
      <div className="relative h-screen w-full overflow-hidden bg-gray-900">
        {/* شريط علوي (يظهر عند الضغط) */}
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: showMenu ? 0 : -100, opacity: showMenu ? 1 : 0 }}
          transition={{ duration: 0.25 }}
          className="fixed top-0 left-0 right-0 z-20 bg-black/90 backdrop-blur-md border-b border-gray-800"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-white/10">
              <ChevronLeft size={24} className="text-white" />
            </button>
            <div className="text-center">
              <div className="text-white font-medium truncate max-w-[200px]">{chapter?.title}</div>
              <div className="text-xs text-gray-400">
                الفصل {chapterId} من {totalChapters}
              </div>
            </div>
            <button onClick={() => setShowSettings(true)} className="p-2 rounded-full bg-white/10">
              <Settings size={24} className="text-white" />
            </button>
          </div>
        </motion.div>

        {/* شريط سفلي (يظهر عند الضغط) */}
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: showMenu ? 0 : 100, opacity: showMenu ? 1 : 0 }}
          transition={{ duration: 0.25 }}
          className="fixed bottom-0 left-0 right-0 z-20 bg-black/90 backdrop-blur-md border-t border-gray-800"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex items-center justify-between px-4 py-3 gap-4">
            <button onClick={openLeftDrawer} className="flex flex-col items-center gap-1">
              <List size={22} className="text-white" />
              <span className="text-xs text-gray-400">الفصول</span>
            </button>
            <div className="flex gap-4">
              <button onClick={() => navigateNextPrev(-1)} className="flex flex-col items-center gap-1">
                <ChevronRight size={22} className="text-white" />
                <span className="text-xs text-gray-400">السابق</span>
              </button>
              <button onClick={() => navigateNextPrev(1)} className="flex flex-col items-center gap-1">
                <ChevronLeft size={22} className="text-white" />
                <span className="text-xs text-gray-400">التالي</span>
              </button>
            </div>
            <button onClick={() => setShowComments(true)} className="flex flex-col items-center gap-1">
              <MessageCircle size={22} className="text-white" />
              <span className="text-xs text-gray-400">{commentCount}</span>
            </button>
          </div>
        </motion.div>

        {/* محتوى الفصل (iframe) */}
        <iframe
          key={iframeKey}
          ref={iframeRef}
          srcDoc={generateHTML()}
          className="w-full h-full border-0"
          title="chapter-content"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        />

        {/* درج الفصول (يسار – من أسفل) */}
        <AnimatePresence>
          {drawerMode === 'chapters' && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-30 bg-[#161616] rounded-t-2xl shadow-xl border-t border-gray-800"
              style={{ maxHeight: '70vh' }}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-800">
                <button onClick={closeDrawers}><X size={24} className="text-gray-400" /></button>
                <h3 className="text-white font-bold">الفصول ({sortedChapters.length})</h3>
                <button onClick={toggleSort} className="p-1">
                  <ArrowUpDown size={20} className="text-blue-400" />
                </button>
              </div>
              <div className="overflow-y-auto max-h-[calc(70vh-60px)]">
                {loadingChapters ? (
                  <div className="p-4 text-center text-gray-500">جاري التحميل...</div>
                ) : (
                  sortedChapters.map(renderChapterItem)
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* درج الاستبدالات / التنظيف / الحقوق (يمين) */}
        <AnimatePresence>
          {drawerMode !== 'none' && drawerMode !== 'chapters' && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 z-30 w-full max-w-md bg-[#161616] shadow-xl border-l border-gray-800 overflow-y-auto"
              style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              {drawerMode === 'replacements' && (
                <>
                  {replacementViewMode === 'folders' ? (
                    <>
                      <div className="flex items-center justify-between p-4 border-b border-gray-800">
                        <button onClick={closeDrawers}><X size={24} className="text-gray-400" /></button>
                        <h3 className="text-white font-bold">مجلدات الاستبدال</h3>
                        <button onClick={() => setShowFolderModal(true)}>
                          <FolderPlus size={20} className="text-blue-400" />
                        </button>
                      </div>
                      <div className="divide-y divide-gray-800">
                        {folders.map(folder => (
                          <div key={folder.id} className="flex items-center justify-between p-4 hover:bg-gray-800/50">
                            <button onClick={() => openFolder(folder.id)} className="flex-1 text-right">
                              <div className="text-white font-medium">{folder.name}</div>
                              <div className="text-xs text-gray-500">{folder.replacements.length} كلمة</div>
                            </button>
                            <button onClick={() => deleteFolder(folder.id)} className="p-2">
                              <Trash2 size={18} className="text-red-400" />
                            </button>
                          </div>
                        ))}
                        {folders.length === 0 && (
                          <div className="p-8 text-center text-gray-500">لا توجد مجلدات</div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between p-4 border-b border-gray-800">
                        <div className="flex items-center gap-3">
                          <button onClick={backToFolders}><ArrowLeft size={24} className="text-white" /></button>
                          <h3 className="text-white font-bold">
                            {folders.find(f => f.id === currentFolderId)?.name || 'كلمات'}
                          </h3>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={toggleSortOrder} className="p-1">
                            <ArrowUpDown size={18} className="text-blue-400" />
                          </button>
                          <button onClick={closeDrawers}><X size={24} className="text-gray-400" /></button>
                        </div>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="الكلمة الأصلية"
                            value={newOriginal}
                            onChange={e => setNewOriginal(e.target.value)}
                            className="flex-1 bg-gray-800 text-white rounded-lg px-3 py-2"
                          />
                          <input
                            type="text"
                            placeholder="الكلمة البديلة"
                            value={newReplacement}
                            onChange={e => setNewReplacement(e.target.value)}
                            className="flex-1 bg-gray-800 text-white rounded-lg px-3 py-2"
                          />
                        </div>
                        <button
                          onClick={handleAddReplacement}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg flex items-center justify-center gap-2"
                        >
                          {editingId !== null ? <Save size={18} /> : <PlusCircle size={18} />}
                          {editingId !== null ? 'تحديث' : 'إضافة'}
                        </button>
                        <input
                          type="text"
                          placeholder="بحث..."
                          value={replaceSearch}
                          onChange={e => setReplaceSearch(e.target.value)}
                          className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 mt-2"
                        />
                      </div>
                      <div className="divide-y divide-gray-800">
                        {filteredSortedReplacements.map(item => (
                          <div key={item.idx} className="flex items-center justify-between p-4 hover:bg-gray-800/50">
                            <div className="flex-1 text-right">
                              <div className="text-gray-400 text-sm line-through">{item.original}</div>
                              <div className="text-white font-medium mt-1">→ {item.replacement}</div>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => handleEditReplacement(item, item.idx)} className="p-1">
                                <Save size={16} className="text-blue-400" />
                              </button>
                              <button onClick={() => handleDeleteReplacement(item.idx)} className="p-1">
                                <Trash2 size={16} className="text-red-400" />
                              </button>
                            </div>
                          </div>
                        ))}
                        {filteredSortedReplacements.length === 0 && (
                          <div className="p-8 text-center text-gray-500">لا توجد كلمات</div>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
              {drawerMode === 'cleaner' && isAdmin && (
                <>
                  <div className="flex items-center justify-between p-4 border-b border-gray-800">
                    <button onClick={closeDrawers}><X size={24} className="text-gray-400" /></button>
                    <h3 className="text-white font-bold text-red-400">الحذف الشامل</h3>
                    <div className="w-6" />
                  </div>
                  <div className="p-4">
                    <textarea
                      rows={4}
                      placeholder="النص المراد حذفه (يمكن أن يكون فقرة كاملة)"
                      value={newCleanerWord}
                      onChange={e => setNewCleanerWord(e.target.value)}
                      className="w-full bg-gray-800 text-white rounded-lg p-3"
                    />
                    <button
                      onClick={handleExecuteCleaner}
                      disabled={cleaningLoading}
                      className="w-full mt-3 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg flex items-center justify-center gap-2"
                    >
                      {cleaningLoading ? 'جاري الحذف...' : <Trash2 size={18} />}
                      {cleaningLoading ? 'جارٍ الحذف...' : 'تنفيذ الحذف'}
                    </button>
                  </div>
                  <div className="divide-y divide-gray-800">
                    {cleanerWords.map((word, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 hover:bg-gray-800/50">
                        <div className="flex-1 text-right text-gray-300 text-sm break-all">{word}</div>
                        <div className="flex gap-2">
                          <button onClick={() => handleEditCleaner(word, idx)} className="p-1">
                            <Save size={16} className="text-blue-400" />
                          </button>
                          <button onClick={() => handleDeleteCleaner(word)} className="p-1">
                            <Trash2 size={16} className="text-red-400" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {cleanerWords.length === 0 && (
                      <div className="p-8 text-center text-gray-500">لا توجد كلمات محظورة</div>
                    )}
                  </div>
                </>
              )}
              {drawerMode === 'copyright' && isAdmin && (
                <>
                  <div className="flex items-center justify-between p-4 border-b border-gray-800">
                    <button onClick={closeDrawers}><X size={24} className="text-gray-400" /></button>
                    <h3 className="text-white font-bold text-blue-400">حقوق التطبيق</h3>
                    <div className="w-6" />
                  </div>
                  <div className="p-4 space-y-4">
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">تكرار الظهور</label>
                      <div className="flex gap-2">
                        {['always', 'random', 'every_x'].map(freq => (
                          <button
                            key={freq}
                            onClick={() => setCopyrightFrequency(freq)}
                            className={`px-3 py-1 rounded-full text-xs ${
                              copyrightFrequency === freq
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-800 text-gray-400'
                            }`}
                          >
                            {freq === 'always' ? 'دائماً' : freq === 'random' ? 'عشوائي' : 'كل X فصل'}
                          </button>
                        ))}
                      </div>
                      {copyrightFrequency === 'every_x' && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-gray-400 text-sm">كل</span>
                          <input
                            type="number"
                            value={copyrightEveryX}
                            onChange={e => setCopyrightEveryX(e.target.value)}
                            className="w-16 bg-gray-800 text-white rounded px-2 py-1 text-center"
                          />
                          <span className="text-gray-400 text-sm">فصل</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">اللون (Hex)</label>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full border border-gray-600" style={{ backgroundColor: copyrightStyle.color }} />
                        <input
                          type="text"
                          value={hexColorInput}
                          onChange={e => {
                            setHexColorInput(e.target.value);
                            if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                              setCopyrightStyle(prev => ({ ...prev, color: e.target.value }));
                            }
                          }}
                          className="flex-1 bg-gray-800 text-white rounded px-3 py-2"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {ADVANCED_COLORS.map(c => (
                          <button
                            key={c.color}
                            onClick={() => {
                              setCopyrightStyle(prev => ({ ...prev, color: c.color }));
                              setHexColorInput(c.color);
                            }}
                            className="w-6 h-6 rounded-full border border-gray-600"
                            style={{ backgroundColor: c.color }}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">حجم الخط ({copyrightStyle.fontSize}px)</label>
                      <CustomSlider
                        min={10}
                        max={30}
                        step={1}
                        value={copyrightStyle.fontSize}
                        onValueChange={val => setCopyrightStyle(prev => ({ ...prev, fontSize: val }))}
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">الشفافية ({Math.round(copyrightStyle.opacity * 100)}%)</label>
                      <CustomSlider
                        min={0.1}
                        max={1}
                        step={0.05}
                        value={copyrightStyle.opacity}
                        onValueChange={val => setCopyrightStyle(prev => ({ ...prev, opacity: val }))}
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">المحاذاة</label>
                      <div className="flex gap-2">
                        {['right', 'center', 'left'].map(align => (
                          <button
                            key={align}
                            onClick={() => setCopyrightStyle(prev => ({ ...prev, alignment: align }))}
                            className={`p-2 rounded ${
                              copyrightStyle.alignment === align ? 'bg-blue-600' : 'bg-gray-800'
                            }`}
                          >
                            {align === 'right' && <AlignRight size={18} className="text-white" />}
                            {align === 'center' && <AlignCenter size={18} className="text-white" />}
                            {align === 'left' && <AlignLeft size={18} className="text-white" />}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">خط عريض</span>
                      <input
                        type="checkbox"
                        checked={copyrightStyle.isBold}
                        onChange={e => setCopyrightStyle(prev => ({ ...prev, isBold: e.target.checked }))}
                        className="w-5 h-5"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">تفعيل الفاصل تحت العنوان</span>
                      <input
                        type="checkbox"
                        checked={enableSeparator}
                        onChange={e => setEnableSeparator(e.target.checked)}
                        className="w-5 h-5"
                      />
                    </div>
                    {enableSeparator && (
                      <div>
                        <label className="block text-gray-400 text-sm mb-1">نص الفاصل</label>
                        <input
                          type="text"
                          value={separatorText}
                          onChange={e => setSeparatorText(e.target.value)}
                          className="w-full bg-gray-800 text-white rounded px-3 py-2 text-center"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">نص البداية</label>
                      <textarea
                        rows={3}
                        value={copyrightStartText}
                        onChange={e => setCopyrightStartText(e.target.value)}
                        className="w-full bg-gray-800 text-white rounded p-3"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">نص النهاية</label>
                      <textarea
                        rows={3}
                        value={copyrightEndText}
                        onChange={e => setCopyrightEndText(e.target.value)}
                        className="w-full bg-gray-800 text-white rounded p-3"
                      />
                    </div>
                    <button
                      onClick={handleSaveCopyrights}
                      disabled={copyrightLoading}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg flex items-center justify-center gap-2"
                    >
                      {copyrightLoading ? 'جاري الحفظ...' : <Save size={18} />}
                      حفظ الحقوق
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* نافذة التعليقات */}
        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-40 bg-[#0a0a0a] rounded-t-2xl shadow-xl"
              style={{ maxHeight: '80vh' }}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-800">
                <button onClick={() => setShowComments(false)}><X size={24} className="text-gray-400" /></button>
                <h3 className="text-white font-bold">التعليقات</h3>
                <div className="w-6" />
              </div>
              <div className="overflow-y-auto p-4" style={{ maxHeight: 'calc(80vh - 60px)' }}>
                {/* هنا يمكن تضمين مكون التعليقات (CommentSection) */}
                <CommentSection
                  novelId={novelId!}
                  comments={[]}
                  loading={false}
                  onAddComment={async (content) => {
                    try {
                      await commentService.addComment(novelId!, content, undefined, parseInt(chapterId));
                      toast.success('تم إضافة التعليق');
                      // إعادة تحميل التعليقات
                    } catch (err) {
                      toast.error('فشل إضافة التعليق');
                    }
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* نافذة الإعدادات الرئيسية */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0a] rounded-t-2xl shadow-xl"
              style={{ maxHeight: '85vh' }}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-800">
                <button onClick={() => setShowSettings(false)}><X size={24} className="text-gray-400" /></button>
                <h3 className="text-white font-bold">الإعدادات</h3>
                <div className="w-6" />
              </div>
              <div className="overflow-y-auto p-4" style={{ maxHeight: 'calc(85vh - 60px)' }}>
                {settingsView === 'main' ? (
                  <div className="grid grid-cols-1 gap-4">
                    <button
                      onClick={() => setSettingsView('appearance')}
                      className="flex items-center justify-between p-4 bg-gray-900 rounded-xl hover:bg-gray-800"
                    >
                      <div className="flex items-center gap-3">
                        <Palette size={22} className="text-blue-400" />
                        <span className="text-white">مظهر القراءة</span>
                      </div>
                      <ChevronRight size={18} className="text-gray-500" />
                    </button>
                    <button
                      onClick={() => { setShowSettings(false); openRightDrawer('replacements'); }}
                      className="flex items-center justify-between p-4 bg-gray-900 rounded-xl hover:bg-gray-800"
                    >
                      <div className="flex items-center gap-3">
                        <SwapHorizontal size={22} className="text-blue-400" />
                        <span className="text-white">استبدال الكلمات</span>
                      </div>
                      <ChevronRight size={18} className="text-gray-500" />
                    </button>
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => { setShowSettings(false); openRightDrawer('cleaner'); }}
                          className="flex items-center justify-between p-4 bg-gray-900 rounded-xl hover:bg-gray-800"
                        >
                          <div className="flex items-center gap-3">
                            <Trash2 size={22} className="text-red-400" />
                            <span className="text-white">الحذف الشامل</span>
                          </div>
                          <ChevronRight size={18} className="text-gray-500" />
                        </button>
                        <button
                          onClick={() => { setShowSettings(false); openRightDrawer('copyright'); }}
                          className="flex items-center justify-between p-4 bg-gray-900 rounded-xl hover:bg-gray-800"
                        >
                          <div className="flex items-center gap-3">
                            <Copyright size={22} className="text-blue-400" />
                            <span className="text-white">حقوق التطبيق</span>
                          </div>
                          <ChevronRight size={18} className="text-gray-500" />
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 mb-6">
                      <button onClick={() => setSettingsView('main')} className="p-1">
                        <ArrowLeft size={24} className="text-white" />
                      </button>
                      <h4 className="text-white font-bold text-lg">مظهر القراءة</h4>
                    </div>
                    <div className="space-y-6">
                      {/* نوع الخط */}
                      <div>
                        <label className="block text-gray-400 text-sm mb-2">نوع الخط</label>
                        <div className="flex flex-wrap gap-2">
                          {FONT_OPTIONS.map(font => (
                            <button
                              key={font.id}
                              onClick={() => handleFontChange(font)}
                              className={`px-4 py-2 rounded-full text-sm ${
                                fontFamily.id === font.id
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-800 text-gray-300'
                              }`}
                            >
                              {font.name}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* حجم الخط */}
                      <div>
                        <label className="block text-gray-400 text-sm mb-2">حجم الخط</label>
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => changeFontSize(-2)}
                            className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center"
                          >
                            <MinusCircle size={20} className="text-white" />
                          </button>
                          <span className="text-white text-lg">{fontSize}</span>
                          <button
                            onClick={() => changeFontSize(2)}
                            className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center"
                          >
                            <PlusCircle size={20} className="text-white" />
                          </button>
                        </div>
                      </div>
                      {/* السمات */}
                      <div>
                        <label className="block text-gray-400 text-sm mb-2">السمة</label>
                        <div className="flex gap-4">
                          {[
                            { color: '#fff', name: 'فاتح' },
                            { color: '#2d2d2d', name: 'داكن' },
                            { color: '#0a0a0a', name: 'أسود' },
                          ].map(theme => (
                            <button
                              key={theme.color}
                              onClick={() => changeTheme(theme.color)}
                              className={`w-12 h-12 rounded-full border-2 ${
                                bgColor === theme.color ? 'border-blue-500' : 'border-transparent'
                              }`}
                              style={{ backgroundColor: theme.color }}
                            />
                          ))}
                        </div>
                      </div>
                      {/* سطوع النص */}
                      <div>
                        <label className="block text-gray-400 text-sm mb-2">سطوع النص</label>
                        <CustomSlider
                          min={0.3}
                          max={1.5}
                          step={0.05}
                          value={textBrightness}
                          onValueChange={handleBrightnessChange}
                        />
                      </div>
                      {/* تنسيق الحوار */}
                      <div className="border-t border-gray-800 pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-white font-medium">تنسيق الحوار</span>
                          <input
                            type="checkbox"
                            checked={enableDialogue}
                            onChange={e => {
                              setEnableDialogue(e.target.checked);
                              saveSettings({ enableDialogue: e.target.checked });
                            }}
                            className="w-5 h-5"
                          />
                        </div>
                        {enableDialogue && (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-gray-400 text-sm mb-1">نمط الأقواس</label>
                              <div className="flex flex-wrap gap-2">
                                {QUOTE_STYLES.map(style => (
                                  <button
                                    key={style.id}
                                    onClick={() => {
                                      setSelectedQuoteStyle(style.id);
                                      saveSettings({ selectedQuoteStyle: style.id });
                                    }}
                                    className={`px-3 py-1 rounded-full text-sm ${
                                      selectedQuoteStyle === style.id
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-800 text-gray-300'
                                    }`}
                                  >
                                    {style.preview}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="block text-gray-400 text-sm mb-1">لون الحوار</label>
                              <div className="flex flex-wrap gap-2">
                                {ADVANCED_COLORS.map(c => (
                                  <button
                                    key={c.color}
                                    onClick={() => {
                                      setDialogueColor(c.color);
                                      saveSettings({ dialogueColor: c.color });
                                    }}
                                    className="w-6 h-6 rounded-full border border-gray-600"
                                    style={{ backgroundColor: c.color }}
                                  />
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="block text-gray-400 text-sm mb-1">حجم الحوار ({dialogueSize}%)</label>
                              <CustomSlider
                                min={80}
                                max={150}
                                step={5}
                                value={dialogueSize}
                                onValueChange={val => {
                                  setDialogueSize(val);
                                  saveSettings({ dialogueSize: val });
                                }}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400 text-sm">إخفاء علامات الأقواس</span>
                              <input
                                type="checkbox"
                                checked={hideQuotes}
                                onChange={e => {
                                  setHideQuotes(e.target.checked);
                                  saveSettings({ hideQuotes: e.target.checked });
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      {/* تنسيق الخط العريض */}
                      <div className="border-t border-gray-800 pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-white font-medium">الخط العريض (Bold)</span>
                          <input
                            type="checkbox"
                            checked={enableMarkdown}
                            onChange={e => {
                              setEnableMarkdown(e.target.checked);
                              saveSettings({ enableMarkdown: e.target.checked });
                            }}
                            className="w-5 h-5"
                          />
                        </div>
                        {enableMarkdown && (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-gray-400 text-sm mb-1">نمط الأقواس</label>
                              <div className="flex flex-wrap gap-2">
                                {QUOTE_STYLES.map(style => (
                                  <button
                                    key={style.id}
                                    onClick={() => {
                                      setSelectedMarkdownStyle(style.id);
                                      saveSettings({ selectedMarkdownStyle: style.id });
                                    }}
                                    className={`px-3 py-1 rounded-full text-sm ${
                                      selectedMarkdownStyle === style.id
                                        ? 'bg-white text-black'
                                        : 'bg-gray-800 text-gray-300'
                                    }`}
                                  >
                                    {style.preview}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="block text-gray-400 text-sm mb-1">لون النص العريض</label>
                              <div className="flex flex-wrap gap-2">
                                {ADVANCED_COLORS.map(c => (
                                  <button
                                    key={c.color}
                                    onClick={() => {
                                      setMarkdownColor(c.color);
                                      saveSettings({ markdownColor: c.color });
                                    }}
                                    className="w-6 h-6 rounded-full border border-gray-600"
                                    style={{ backgroundColor: c.color }}
                                  />
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="block text-gray-400 text-sm mb-1">حجم النص العريض ({markdownSize}%)</label>
                              <CustomSlider
                                min={80}
                                max={150}
                                step={5}
                                value={markdownSize}
                                onValueChange={val => {
                                  setMarkdownSize(val);
                                  saveSettings({ markdownSize: val });
                                }}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400 text-sm">إخفاء علامات التنسيق (مثل **)</span>
                              <input
                                type="checkbox"
                                checked={hideMarkdownMarks}
                                onChange={e => {
                                  setHideMarkdownMarks(e.target.checked);
                                  saveSettings({ hideMarkdownMarks: e.target.checked });
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* نافذة إنشاء مجلد جديد */}
        <AnimatePresence>
          {showFolderModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 flex items-center justify-center z-60"
              onClick={() => setShowFolderModal(false)}
            >
              <div className="bg-[#1a1a1a] rounded-xl p-6 w-80" onClick={e => e.stopPropagation()}>
                <h3 className="text-white font-bold mb-4">اسم المجلد</h3>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  placeholder="مثال: روايتي المفضلة"
                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 mb-4"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowFolderModal(false)}
                    className="flex-1 bg-gray-700 text-white py-2 rounded-lg"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleCreateFolder}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg"
                  >
                    تم
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* خلفية للدرج */}
        {drawerMode !== 'none' && (
          <div className="fixed inset-0 bg-black/50 z-25" onClick={closeDrawers} />
        )}
      </div>
    </>
  );
}