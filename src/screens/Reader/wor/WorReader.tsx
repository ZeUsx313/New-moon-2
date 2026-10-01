// src/screens/Reader/wor/WorReader.tsx
//
// 🌙 قارئ الموقع — نفس قارئ التطبيق تماماً (Galaxy / wor-reader)
//
// This is the web port of the app's WebReaderScreen: the full reader UI lives
// inside `src/reader/worShell.js` (a self-contained HTML document, identical
// to the one the mobile app renders inside its WebView). The shell already
// falls back to `window.parent.postMessage` when `window.ReactNativeWebView`
// is missing, and the parent talks back through
// `iframe.contentWindow.__wor.receive(obj)` — the exact same contract as the
// app's `injectJavaScript('window.__wor.receive(...)')`.
//
// Data comes from this site's own services (same backend as the app), while
// settings / scroll / word-replacement stores persist in localStorage under
// the SAME keys the app uses.

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { RefreshCcw, ArrowRight, CloudOff } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../services/api';
import { novelService } from '../../../services/novel';
import { apiCache } from '../../../lib/apiCache';
import { protectChapterContent, copyrightNoticeHtml } from '../../../lib/protection';
import {
    noteChapterOpen, noteReaderEngagement,
    shouldChallengeBeforeNext, markChallengeSolved,
} from '../../../lib/readerRisk';
import { dispatchCaptchaRequired } from '../../../lib/captchaPass';
import { ensureReaderSession } from '../../../lib/readerSession';
import { offlineStore, estimateBytes } from '../../../lib/offlineStore';
import { commentService } from '../../../services/comment';
import { userService } from '../../../services/user';
import toast from 'react-hot-toast';
import { CommentsModal } from '../components/CommentsModal';
import buildWorShell from '../../../reader/worShell';
import {
    loadWordsStore, saveWordsStore, novelScopeOf, effectiveTerms,
    replaceTermsInText, buildColoredTerms, buildColoredRegexSources,
} from '../../../reader/wordsStore';
import { KeepAwake } from '../../../reader/optionalModules';
import {
    buildWorSectionHTML, normalizeContent, DEFAULT_SETTINGS, LEGACY_FONT_MAP,
    THEME_CYCLE, isLightColor,
} from './sections';

const SETTINGS_KEY = '@reader_settings_v4';
const SETTINGS_KEYS = [
    'fontSize', 'lineHeight', 'wordSpacing', 'brightness', 'fontWeight', 'direction', 'fontValue',
    'bgColor', 'textColor', 'accent', 'bgPreset', 'customColors',
    'enableDialogue', 'dialogueColor', 'dialogueSize', 'hideQuotes', 'selectedQuoteStyle',
    'enableMarkdown', 'markdownColor', 'markdownSize', 'hideMarkdownMarks', 'selectedMarkdownStyle',
    'enableBracket', 'bracketColor', 'bracketSize', 'hideBracketMarks', 'selectedBracketStyle',
    'enableCustom', 'customOpenMark', 'customCloseMark', 'customColor', 'customSize', 'hideCustomMarks',
    'showProgressBar', 'progressBarColor', 'continuousMode', 'autoScroll', 'keepAwake',
    'hideTitle', 'tapToToggle', 'enableSeparator', 'separatorText', 'dockOpen',
];

// keys that change the chapter's HTML structure → rebuild while keeping scroll
const STRUCTURAL_KEYS = ['selectedQuoteStyle', 'selectedMarkdownStyle', 'selectedBracketStyle', 'customOpenMark', 'customCloseMark'];

const scrollKeyFor = (novelId: string, chNum: number | string) => `@reader_scroll_v1_${novelId}_${chNum}`;
const lastPosKeyFor = (novelId: string) => `@reader_last_pos_v1_${novelId}`;

// ========================= chapters list strategy =========================
// كان القديم يجلب *كل* فصول الرواية (limit=100000) في كل زيارة للقارئ —
// بطء واضح واستهلاك ضخم لقاعدة البيانات/Firestore. الآن:
//   1. جلب أول صفحة فقط (100 فصل = صفحة قائمة الفصول الواحدة في الواجهة).
//   2. كاش عميل (ذاكرة + sessionStorage) لمدة 10 دقائق — الخروج والدخول
//      للقارئ لا يلمس الشبكة إطلاقاً.
//   3. «تحميل المزيد» في القائمة/البحث يطلب الصفحة التالية من الأب عبر الجسر.
//   4. البحث الشامل يذهب للخادم (يدعم كل الفصول) عبر الجسر أيضاً.
const READER_CHAPTERS_PAGE = 100;
const READER_CHAPTERS_TTL = 10 * 60 * 1000;
const READER_SEARCH_RESULTS = 40;
const worChaptersCacheKey = (novelId: string) => `worch:${novelId}`;

export default function WorReader() {
    const { novelId, chapterId } = useParams<{ novelId: string; chapterId: string }>();
    const navigate = useNavigate();
    const { userInfo } = useAuth() as any;
    const isAdmin = userInfo?.role === 'admin';

    // ---------- data ----------
    const [novel, setNovel] = useState<any>(null);
    const [chapter, setChapter] = useState<any>(null);
    const chapterRef = useRef<any>(null);
    useEffect(() => { chapterRef.current = chapter; }, [chapter]);
    const [chaptersList, setChaptersList] = useState<any[]>([]);
    const chaptersListRef = useRef<any[]>([]);
    useEffect(() => { chaptersListRef.current = chaptersList; }, [chaptersList]);
    // الإجمالي الحقيقي المعروض للمستخدم (بعد إخفاء الفصول المخفية في الخادم)
    const chaptersTotalRef = useRef(0);
    const chaptersLoadingMoreRef = useRef(false);
    const [realTotalChapters, setRealTotalChapters] = useState(0);
    const [commentCount, setCommentCount] = useState(0);
    const commentCountRef = useRef(0);
    useEffect(() => { commentCountRef.current = commentCount; }, [commentCount]);
    const [authorProfile, setAuthorProfile] = useState<any>(null);
    const authorProfileRef = useRef<any>(null);
    useEffect(() => { authorProfileRef.current = authorProfile; }, [authorProfile]);
    const [isFavorite, setIsFavorite] = useState(false);
    const isFavoriteRef = useRef(false);
    useEffect(() => { isFavoriteRef.current = isFavorite; }, [isFavorite]);

    const [loading, setLoading] = useState(true);
    const [errorInfo, setErrorInfo] = useState<any>(null);

    // ---------- settings ----------
    const [settings, setSettings] = useState<any>(DEFAULT_SETTINGS);
    const settingsRef = useRef<any>(DEFAULT_SETTINGS);
    const applySettingsState = useCallback((patch: any) => {
        setSettings((prev: any) => {
            const next = { ...prev, ...patch };
            settingsRef.current = next;
            return next;
        });
    }, []);

    // ---------- words (replacements) ----------
    const wordsStoreRef = useRef<any>({ novel: {}, global: [] });
    const [wordsVersion, setWordsVersion] = useState(0);

    // ---------- continuous scroll ----------
    const [extraSections, setExtraSections] = useState<any[]>([]);
    const [loadingNext, setLoadingNext] = useState(false);
    const [endReached, setEndReached] = useState(false);
    const [currentViewedChapter, setCurrentViewedChapter] = useState(parseInt(chapterId || '1') || 1);
    const loadingNextRef = useRef(false);
    const autoScrollNextRef = useRef(false);

    // ---------- overlays ----------
    const [showComments, setShowComments] = useState(false);
    const [showCleaner, setShowCleaner] = useState(false);
    const [showCopyright, setShowCopyright] = useState(false);

    // ---------- admin cleaner ----------
    const [cleanerWords, setCleanerWords] = useState<string[]>([]);
    const [newCleanerWord, setNewCleanerWord] = useState('');
    const [cleanerEditingIndex, setCleanerEditingIndex] = useState<number | null>(null);
    const [cleanerOldWord, setCleanerOldWord] = useState('');
    const [cleaningLoading, setCleaningLoading] = useState(false);

    // ---------- admin copyright ----------
    const [copyrightStartText, setCopyrightStartText] = useState('');
    const [copyrightEndText, setCopyrightEndText] = useState('');
    const [copyrightLoading, setCopyrightLoading] = useState(false);
    const [copyrightStyle, setCopyrightStyle] = useState<any>({ color: '#888888', opacity: 1, alignment: 'center', isBold: true, fontSize: 14 });
    const [copyrightFrequency, setCopyrightFrequency] = useState('always');
    const [copyrightEveryX, setCopyrightEveryX] = useState('5');

    // ========================= bridge (parent -> shell) =========================
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const webReadyRef = useRef(false);
    const webQueueRef = useRef<any[]>([]);

    const postToWeb = useCallback((obj: any) => {
        if (!webReadyRef.current) {
            webQueueRef.current.push(obj);
            return;
        }
        try {
            const win: any = iframeRef.current?.contentWindow;
            if (win && win.__wor && typeof win.__wor.receive === 'function') {
                win.__wor.receive(obj);
            } else {
                webQueueRef.current.push(obj);
            }
        } catch { /* iframe not ready */ }
    }, []);

    const flushWebQueue = useCallback(() => {
        webReadyRef.current = true;
        const queue = webQueueRef.current;
        webQueueRef.current = [];
        queue.forEach((obj) => postToWeb(obj));
    }, [postToWeb]);

    const sendSettings = useCallback((s: any) => {
        postToWeb({ kind: 'settings', settings: s });
    }, [postToWeb]);

    const sendChapters = useCallback((list?: any[], total?: number) => {
        postToWeb({
            kind: 'chapters',
            list: list || chaptersListRef.current,
            total: total ?? chaptersTotalRef.current,
        });
    }, [postToWeb]);

    const wordsItemsPayload = useCallback(() => ({
        novel: novelScopeOf(wordsStoreRef.current, novelId),
        global: wordsStoreRef.current.global || [],
    }), [novelId]);

    const sendWords = useCallback(() => {
        postToWeb({ kind: 'words', items: wordsItemsPayload() });
    }, [postToWeb, wordsItemsPayload]);

    const sendFav = useCallback((value: boolean) => {
        postToWeb({ kind: 'fav', value });
    }, [postToWeb]);

    // ========================= section builder =========================
    const wordsTerms = useMemo(() => effectiveTerms(wordsStoreRef.current, novelId), [wordsVersion, novelId]); // eslint-disable-line react-hooks/exhaustive-deps
    const coloredTermsSources = useMemo(
        () => buildColoredRegexSources(buildColoredTerms(wordsTerms)),
        [wordsTerms]
    );
    const coloredRef = useRef<any[]>([]);
    useEffect(() => { coloredRef.current = coloredTermsSources; }, [coloredTermsSources]);

    const applyReplacements = useCallback((raw: any) => (
        replaceTermsInText(normalizeContent(raw), wordsTerms)
    ), [wordsTerms]);

    // 🛡️ معالجة محمية: استبدال الكلمات ثم العلامة المائية الصفرية + إشعار الحقوق.
    // تُطبَّق في كل نقطة تُرسل فيها نصوص الفصول إلى واجهة القارئ.
    const processProtected = useCallback((raw: string, chNumber: number | string) => {
        const replaced = applyReplacements(raw || '');
        const title = novelRef.current?.title || '';
        return protectChapterContent(replaced, title, novelId || '', chNumber, userInfo?.email || userInfo?.id || undefined);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [applyReplacements, novelId]);

    const sendChapterToWeb = useCallback((chapterData: any, opts: any = {}) => {
        if (!chapterData) return;
        const S = { ...settingsRef.current, colored: coloredRef.current };
        const number = opts.number || parseInt(chapterId || '1') || 1;
        const list = chaptersListRef.current || [];
        // استخدم القائمة لحساب الموقع/الإجمالي فقط إذا كانت *كاملة* — القائمة
        // الجزئية (تحميل تدريجي) كانت ستجعل شريط التقدم يتجمد عند نسبة صغيرة.
        const serverTotal = chaptersTotalRef.current || 0;
        const completeList = serverTotal > 0 && list.length >= serverTotal;
        const sorted = completeList && list.length > 0
            ? list.map((c: any) => parseInt(c.number)).sort((a: number, b: number) => a - b)
            : null;
        let hasPrev = true, hasNext = true, position = number, total = realTotalChapters || serverTotal;
        if (sorted) {
            const idx = sorted.indexOf(number);
            hasPrev = idx > 0;
            hasNext = idx !== -1 && idx < sorted.length - 1;
            position = idx + 1;
            total = sorted.length;
        } else {
            // الترقيم في هذا النظام تسلسلي 1..N — الموقع بالرقم أدق مع قائمة جزئية
            hasPrev = number > 1;
            hasNext = !(total > 0 && number >= total);
        }
        const percent = total > 0 ? Math.min(100, Math.round((position / total) * 100)) : 0;
        const html = buildWorSectionHTML({
            number,
            title: chapterData.title,
            content: chapterData.processedContent || '',
            copyrightStart: chapterData.copyrightStart,
            copyrightEnd: chapterData.copyrightEnd,
            copyrightStyles: chapterData.copyrightStyles,
        }, 0, S) + copyrightNoticeHtml(novel?.title || '');
        postToWeb({
            kind: 'chapter',
            number,
            title: chapterData.title || `فصل ${number}`,
            novelTitle: novel?.title || '',
            total,
            percent: `${percent}%`,
            percentValue: percent,
            hasPrev,
            hasNext,
            html,
            commentCount: commentCountRef.current,
            showCommentsButton: true,
            authorCard: authorProfileRef.current
                ? { name: authorProfileRef.current.name || novel?.author || '', avatar: authorProfileRef.current.picture || '', banner: authorProfileRef.current.banner || '' }
                : null,
            isFavorite: isFavoriteRef.current,
            scrollOffset: opts.keepScroll ? 0 : (pendingRestoreRef.current || 0),
            keepScroll: !!opts.keepScroll,
        });
    }, [postToWeb, novel, realTotalChapters, chapterId]);

    useEffect(() => {
        commentCountRef.current = commentCount;
        postToWeb({ kind: 'commentCount', count: commentCount });
    }, [commentCount, postToWeb]);

    // ========================= settings persistence =========================
    const saveSettings = async (patch: any) => {
        try {
            const current = localStorage.getItem(SETTINGS_KEY);
            const existing = current ? JSON.parse(current) : {};
            localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...existing, ...patch }));
        } catch { /* ignore */ }
    };

    const applySettingsPatch = useCallback((patch: any, persist = true) => {
        applySettingsState(patch);
        if (persist) saveSettings(patch);
        postToWeb({ kind: 'settings', settings: patch });
    }, [postToWeb, applySettingsState]);

    const loadSettings = async () => {
        try {
            const saved = localStorage.getItem(SETTINGS_KEY);
            if (saved) {
                const p = JSON.parse(saved);
                const patch: any = {};
                SETTINGS_KEYS.forEach((k) => { if (p[k] !== undefined) patch[k] = p[k]; });
                if (p.textBrightness !== undefined && patch.brightness === undefined) patch.brightness = p.textBrightness;
                if (p.fontId && patch.fontValue === undefined) patch.fontValue = LEGACY_FONT_MAP[p.fontId] || 'default';
                applySettingsState(patch);
            }
        } catch { /* ignore */ }
    };

    // 🔥 إصلاح: الإعدادات كانت تُحفظ ولا تُحمّل أبداً — كل فتح فصل يعيد الضبط للافتراضي.
    // تُحمّل مرة واحدة عند تركيب القارئ قبل عرض أي فصل.
    const loadSettingsRef = useRef(loadSettings);
    useEffect(() => {
        loadSettingsRef.current();
    }, []);

    // ========================= words actions (from shell) =========================
    const wordsAction = useCallback(async (msg: any) => {
        const scope = msg.scope === 'global' ? 'global' : 'novel';
        const listFor = () => (scope === 'global'
            ? (wordsStoreRef.current.global || [])
            : novelScopeOf(wordsStoreRef.current, novelId));
        const commit = async (next: any[], toastText: string) => {
            if (scope === 'global') wordsStoreRef.current.global = next;
            else wordsStoreRef.current.novel[String(novelId || 'unknown')] = next;
            await saveWordsStore(wordsStoreRef.current);
            setWordsVersion((v) => v + 1);
            sendWords();
            postToWeb({ kind: 'wordsSaved', items: wordsItemsPayload(), toast: toastText });
        };
        const list = listFor();
        if (msg.action === 'addRep') {
            const original = String(msg.original || '').trim();
            if (!original) { toast.error('اكتب الكلمة الأصلية أولاً'); return; }
            await commit([...list, {
                id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
                original,
                replacement: String(msg.replacement || '').trim(),
                exact: !!msg.exact,
                color: (typeof msg.color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(msg.color)) ? msg.color : null,
            }], 'تمت إضافة الكلمة');
        } else if (msg.action === 'updateRep') {
            const idx = list.findIndex((r: any) => r.id === msg.id);
            if (idx === -1) { toast.error('لم يتم العثور على الكلمة'); return; }
            const next = list.slice();
            next[idx] = {
                ...next[idx],
                original: String(msg.original || '').trim(),
                replacement: String(msg.replacement || '').trim(),
                exact: !!msg.exact,
                color: (typeof msg.color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(msg.color)) ? msg.color : null,
            };
            await commit(next, 'تم تحديث الكلمة');
        } else if (msg.action === 'deleteRep') {
            await commit(list.filter((r: any) => r.id !== msg.id), 'تم حذف الكلمة');
        } else if (msg.action === 'clearScope') {
            await commit([], 'تم مسح الكلمات');
        }
    }, [novelId, postToWeb, sendWords, wordsItemsPayload]);

    // Re-render the open chapter right after a word change (Galaxy behavior:
    // the replacement takes effect while reading, without leaving the chapter)
    const wordsInitRef = useRef(0);
    useEffect(() => {
        wordsInitRef.current += 1;
        if (wordsInitRef.current <= 1) return;
        const ch = chapterRef.current;
        if (!ch) return;
        const processed = processProtected(ch.content || '', (ch as any).number || chapterId || '1');
        setTimeout(() => sendChapterToWeb({ ...ch, processedContent: processed }, { keepScroll: true }), 0);
    }, [wordsVersion]); // eslint-disable-line react-hooks/exhaustive-deps

    // ========================= scroll persistence =========================
    const lastScrollPosRef = useRef<any>(null);
    const sectionTitlesRef = useRef<Record<number, string>>({});
    const scrollSaveTimer = useRef<any>(null);
    const pendingRestoreRef = useRef(0);

    const saveScrollPosition = async (chNum: number, offset: number, globalOffset: number) => {
        try {
            if (!chNum || offset == null || offset < 0) return;
            const payload = JSON.stringify({ offset: Math.round(offset), global: Math.round(globalOffset || 0), v: 2, savedAt: Date.now() });
            localStorage.setItem(scrollKeyFor(novelId, chNum), payload);
            localStorage.setItem(lastPosKeyFor(novelId), JSON.stringify({ chapter: chNum, offset: Math.round(offset), savedAt: Date.now() }));
        } catch { /* ignore */ }
    };

    const loadScrollPosition = async (chNum: string) => {
        try {
            const raw = localStorage.getItem(scrollKeyFor(novelId || '', chNum));
            if (!raw) return 0;
            const parsed = JSON.parse(raw);
            if (parsed?.v !== 2) return 0;
            return parsed?.offset || 0;
        } catch { return 0; }
    };

    const queueSaveScroll = (chNum: number, offset: number, globalOffset: number) => {
        if (!settingsRef.current.continuousMode && parseInt(chNum as any) !== parseInt(chapterId || '1')) return;
        if (scrollSaveTimer.current) clearTimeout(scrollSaveTimer.current);
        scrollSaveTimer.current = setTimeout(() => saveScrollPosition(chNum, offset, globalOffset), 600);
    };

    const clearScrollFor = (chNum: number | string) => {
        try { localStorage.removeItem(scrollKeyFor(novelId || '', chNum)); } catch { /* ignore */ }
    };

    const titleForChapter = (chNum: number | string) => {
        const n = parseInt(chNum as any);
        if (sectionTitlesRef.current[n]) return sectionTitlesRef.current[n];
        if (chapterRef.current && n === parseInt(chapterId || '1')) return chapterRef.current.title;
        const fromList = (chaptersListRef.current || []).find((c: any) => parseInt(c.number) === n);
        if (fromList) return fromList.title;
        return `فصل ${n}`;
    };

    const updateProgressOnServer = async (currentChapter: any, chapterNum: number | string) => {
        if (!currentChapter) return;
        try {
            await novelService.updateReadingStatus({
                novelId: novelId!,
                title: novel?.title,
                cover: novel?.cover,
                author: novel?.author || novel?.translator,
                lastChapterId: parseInt(chapterNum as any) || parseInt(chapterId || '1'),
                lastChapterTitle: titleForChapter(chapterNum),
            });
        } catch { /* ignore */ }
    };

    // ========================= fetching =========================
    const fetchCommentCount = async (chNum: string | number) => {
        try {
            const res = await commentService.getComments(novelId!, parseInt(chNum as any) || 1, 1, 1);
            setCommentCount(res.totalComments || 0);
        } catch { /* ignore */ }
    };

    // ========================= chapters list (lazy + cached) =========================
    // أول زيارة: صفحة واحدة فقط (100 فصل) مع كاش 10 دقائق — الزيارات التالية
    // لنفس الرواية لا تلمس الشبكة إطلاقاً. «تحميل المزيد» يجلب صفحة إضافية.
    const applyChapters = useCallback((list: any[], total: number) => {
        const merged = list;
        setChaptersList(merged);
        chaptersListRef.current = merged;
        chaptersTotalRef.current = total || merged.length;
        sendChapters(merged, total);
    }, [sendChapters]);

    const fetchChapters = useCallback(async (bypass = false) => {
        if (!novelId) return;
        try {
            const cached = bypass ? null : apiCache.get<{ list: any[]; total: number }>(
                worChaptersCacheKey(novelId), READER_CHAPTERS_TTL,
            );
            if (cached && Array.isArray(cached.list) && cached.list.length > 0) {
                applyChapters(cached.list, cached.total);
                return;
            }
            const res = await novelService.getChaptersListFull(novelId, 1, READER_CHAPTERS_PAGE, 'asc');
            if (Array.isArray(res.chapters) && res.chapters.length > 0) {
                apiCache.set(worChaptersCacheKey(novelId), { list: res.chapters, total: res.total }, READER_CHAPTERS_TTL);
                applyChapters(res.chapters, res.total);
            }
        } catch {
            // دون اتصال: قائمة الفصول المنزّلة تكفي تماماً للتنقل داخل النسخة المحلية
            try {
                const rec = await offlineStore.getNovel(novelId);
                if (rec?.chapterNumbers?.length) {
                    const list = [...rec.chapterNumbers]
                        .sort((a, b) => a - b)
                        .map((num) => ({
                            _id: `offline-${num}`,
                            number: num,
                            title: rec.chapterTitles?.[num] || `فصل ${num}`,
                            createdAt: '',
                            views: 0,
                        }));
                    applyChapters(list, list.length);
                }
            } catch { /* قائمة الفصول ليست حرجة — القارئ يعمل بدونها */ }
        }
    }, [novelId, applyChapters]);

    // «تحميل المزيد» من القائمة — يجلب الصفحة التالية ويدمجها في الكاش
    const loadMoreChapters = useCallback(async () => {
        if (!novelId || chaptersLoadingMoreRef.current) return;
        const current = chaptersListRef.current || [];
        const total = chaptersTotalRef.current || 0;
        if (total > 0 && current.length >= total) return; // كل شيء محمّل
        chaptersLoadingMoreRef.current = true;
        try {
            const nextPage = Math.floor(current.length / READER_CHAPTERS_PAGE) + 1;
            const res = await novelService.getChaptersListFull(novelId, nextPage, READER_CHAPTERS_PAGE, 'asc');
            const known = new Set(current.map((c: any) => parseInt(c.number)));
            const fresh = (res.chapters || []).filter((c: any) => !known.has(parseInt(c.number)));
            const merged = [...current, ...fresh];
            apiCache.set(worChaptersCacheKey(novelId), { list: merged, total: res.total }, READER_CHAPTERS_TTL);
            applyChapters(merged, res.total);
        } catch {
            postToWeb({ kind: 'chaptersSearchResults', q: null, results: [], total: chaptersTotalRef.current, loadFailed: true });
        } finally {
            chaptersLoadingMoreRef.current = false;
        }
    }, [novelId, applyChapters, postToWeb]);

    // البحث الشامل — الخادم يبحث في كل الفصول (وليس المُحمّل فقط)
    const searchAllChapters = useCallback(async (q: string) => {
        if (!novelId) return;
        const query = String(q || '').trim();
        if (!query) return;
        try {
            const res = await novelService.getChaptersListFull(novelId, 1, READER_SEARCH_RESULTS, 'asc', query);
            postToWeb({ kind: 'chaptersSearchResults', q: query, results: res.chapters || [], total: res.total });
        } catch {
            postToWeb({ kind: 'chaptersSearchResults', q: query, results: [], total: 0, loadFailed: true });
        }
    }, [novelId, postToWeb]);

    const fetchAuthorData = async () => {
        const n = novelRef.current;
        if (n && (n.authorId || n.authorEmail)) {
            try {
                const profile = await userService.getPublicProfile(
                    n.authorId ? undefined : n.authorEmail,
                    n.authorId
                );
                if (profile?.user) setAuthorProfile(profile.user);
            } catch { /* ignore */ }
        }
    };

    const fetchFavoriteStatus = async () => {
        try {
            const res = await novelService.getNovelStatus(novelId!);
            if (res) {
                setIsFavorite(!!res.isFavorite);
                isFavoriteRef.current = !!res.isFavorite;
                sendFav(!!res.isFavorite);
            }
        } catch { /* ignore */ }
    };

    const fetchCleanerWords = async () => {
        try {
            const res = await fetch(`${api.baseUrl}/api/admin/cleaner`, { headers: api.getAuthHeader() });
            if (res.ok) setCleanerWords(await res.json());
        } catch { /* ignore */ }
    };

    const fetchCopyrights = async () => {
        try {
            const res = await fetch(`${api.baseUrl}/api/admin/copyright`, { headers: api.getAuthHeader() });
            if (!res.ok) return;
            const data = await res.json();
            setCopyrightStartText(data.startText || '');
            setCopyrightEndText(data.endText || '');
            if (data.styles) setCopyrightStyle((prev: any) => ({ ...prev, ...data.styles }));
            if (data.frequency) setCopyrightFrequency(data.frequency);
            if (data.everyX) setCopyrightEveryX(String(data.everyX));
            if (data.chapterSeparatorText) applySettingsState({ separatorText: data.chapterSeparatorText });
            if (data.enableChapterSeparator !== undefined) applySettingsState({ enableSeparator: data.enableChapterSeparator });
        } catch { /* ignore */ }
    };

    const novelRef = useRef<any>(null);
    useEffect(() => { novelRef.current = novel; }, [novel]);

    // Guards against a slow older chapter response overwriting a newer one
    const chapterReqRef = useRef(0);

    /**
     * جلب الفصل بأولوية النسخة المنزّلة (القراءة دون اتصال):
     * IndexedDB أولاً — وإن لم توجد فالشبكة، مع تخزين تلقائي للفصول
     * الجديدة عندما تكون الرواية متتبّعة في التنزيلات (تبقى نسختك حية).
     */
    const loadChapterOfflineFirst = useCallback(async (numStr: string): Promise<{ data: any; fromOffline: boolean }> => {
        const num = parseInt(numStr);
        if (Number.isFinite(num)) {
            try {
                const ch = await offlineStore.getChapter(novelId!, num);
                if (ch && ch.content) {
                    return {
                        data: {
                            _id: ch.serverId || `offline-${ch.number}`,
                            number: ch.number,
                            title: ch.title,
                            content: ch.content,
                            copyrightStart: ch.copyrightStart,
                            copyrightEnd: ch.copyrightEnd,
                            copyrightStyles: ch.copyrightStyles,
                            totalChapters: chaptersTotalRef.current || realTotalChapters || undefined,
                            createdAt: ch.savedAt,
                            views: 0,
                        },
                        fromOffline: true,
                    };
                }
            } catch { /* IndexedDB فشل — نكمل من الشبكة */ }
        }
        const data = await novelService.getChapter(novelId!, numStr);
        // تخزين تلقائي: الرواية متتبّعة في التنزيلات → الفصل يُحفظ محلياً
        if (data?.content) {
            try {
                const tracked = await offlineStore.getNovel(novelId!);
                if (tracked) {
                    const n = parseInt(numStr);
                    if (Number.isFinite(n) && !tracked.chapterNumbers?.includes(n)) {
                        await offlineStore.putChapter({
                            novelId: novelId!,
                            number: n,
                            serverId: data._id,
                            title: data.title || `فصل ${n}`,
                            content: data.content,
                            copyrightStart: data.copyrightStart,
                            copyrightEnd: data.copyrightEnd,
                            copyrightStyles: data.copyrightStyles,
                            bytes: estimateBytes(data.content),
                            savedAt: new Date().toISOString(),
                        });
                        await offlineStore.registerChapter(novelId!, { number: n, title: data.title, bytes: estimateBytes(data.content) });
                    }
                }
            } catch { /* التخزين التلقائي اختياري — لا يعطل القراءة */ }
        }
        return { data, fromOffline: false };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [novelId]);

    const fetchChapter = useCallback(async () => {
        // 🎫 جلسة القراءة — تهيئة غير حاجبة (الطلبات التالية تحمل X-Reader-Session)
        if (navigator.onLine) ensureReaderSession().catch(() => { });
        const reqId = ++chapterReqRef.current;
        setLoading(true);
        setErrorInfo(null);
        setExtraSections([]);
        setEndReached(false);
        setLoadingNext(false);
        loadingNextRef.current = false;
        setCurrentViewedChapter(parseInt(chapterId || '1') || 1);
        try {
            const { data: chapterData, fromOffline } = await loadChapterOfflineFirst(chapterId!);
            if (reqId !== chapterReqRef.current) return; // stale response — ignore
            if (chapterData && chapterData.content) {
                chapterData.content = normalizeContent(chapterData.content);
            }
            setChapter(chapterData);
            if (chapterData) {
                sectionTitlesRef.current = { ...sectionTitlesRef.current, [parseInt(chapterId || '1') || 1]: chapterData.title || `فصل ${chapterId}` };
            }
            // 🛡️ رصد نمط القراءة — يُغلق حدث الفصل السابق ويفتح حدث هذا الفصل
            noteChapterOpen(parseInt(chapterId || '1') || 1);
            if (chapterData?.totalChapters) setRealTotalChapters(chapterData.totalChapters);

            // تذكّر آخر فصل مقروء داخل النسخة المنزّلة (لتفتح «التنزيلات» من مكانه)
            if (Number.isFinite(parseInt(chapterId || ''))) {
                offlineStore.getNovel(novelId!).then((rec) => {
                    if (rec && rec.lastReadNumber !== parseInt(chapterId!)) {
                        offlineStore.patchNovel(novelId!, { lastReadNumber: parseInt(chapterId!) }).catch(() => { });
                    }
                }).catch(() => { });
            }

            const savedOffset = await loadScrollPosition(chapterId || '1');
            if (reqId !== chapterReqRef.current) return;
            pendingRestoreRef.current = savedOffset;

            if (chapterData) {
                const processed = processProtected(chapterData.content || '', chapterId || '1');
                setTimeout(() => {
                    if (reqId !== chapterReqRef.current) return;
                    sendChapterToWeb({ ...chapterData, processedContent: processed });
                    sendSettings(settingsRef.current);
                }, 0);
            }

            // الأثر الجانبي الشبكي لا معنى له للنسخة المنزّلة دون اتصال
            if (!fromOffline || navigator.onLine) {
                novelService.incrementView(novelId!, parseInt(chapterId || '1') || 1).catch(() => { });
                updateProgressOnServer(chapterData, chapterId || '1');
                fetchCommentCount(chapterId || '1');
            }
        } catch (err: any) {
            if (reqId !== chapterReqRef.current) return;
            // ApiError carries the real HTTP status — classify honestly
            const status = err?.status || 0;
            const offlineNoCopy = !navigator.onLine;
            let message = 'فشل تحميل الفصل. تحقق من اتصالك بالإنترنت ثم أعد المحاولة.';
            if (offlineNoCopy && status === 0) {
                message = 'أنت دون اتصال — هذا الفصل غير منزّل. نزّله من صفحة الرواية (زر التنزيل) لتقرأه دون إنترنت.';
            }
            else if (status === 403) message = 'هذا الفصل غير متاح حالياً (خاص أو لم يُنشر بعد).';
            else if (status === 404) message = 'الفصل غير موجود. ربما تم حذفه أو تغيير ترقيمه.';
            else if (status >= 500) message = err?.message || 'الخادم تعثّر أثناء تحميل الفصل — غالباً مشكلة مؤقتة، أعد المحاولة بعد قليل.';
            else if (status === 0) message = err?.message || message;
            setErrorInfo({ message, status });
        } finally {
            if (reqId === chapterReqRef.current) setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [novelId, chapterId, applyReplacements, sendChapterToWeb, sendSettings, loadChapterOfflineFirst]);

    // fetch novel (once per novelId)
    useEffect(() => {
        if (!novelId) return;
        let alive = true;
        (async () => {
            try {
                const data = await novelService.getNovelById(novelId);
                if (!alive) return;
                setNovel(data);
                if (data.chaptersCount) setRealTotalChapters(data.chaptersCount);
            } catch {
                // the reader still works without the novel header data
            }
        })();
        return () => { alive = false; };
    }, [novelId]);

    // fetch chapter on every chapter change
    useEffect(() => {
        if (!novelId || !chapterId) return;
        fetchChapter();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [novelId, chapterId]);

    // chapters list + author + favorite
    useEffect(() => {
        if (!novelId) return;
        fetchChapters();
        fetchAuthorData();
        fetchFavoriteStatus();
        if (isAdmin) {
            fetchCleanerWords();
            fetchCopyrights();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [novelId, isAdmin]);

    // ----- continuous scroll: fetch + append the NEXT chapter -----
    const fetchNextChapter = async () => {
        if (loadingNextRef.current || endReached) return;
        const S = settingsRef.current;
        if (!S.continuousMode) return;
        const lastNum = extraSections.length > 0
            ? extraSections[extraSections.length - 1].number
            : parseInt(chapterId || '1');
        let nextNum: number | null = null;
        const list = chaptersListRef.current || [];
        const serverTotal = chaptersTotalRef.current || 0;
        const completeList = serverTotal > 0 && list.length >= serverTotal;
        if (completeList && list.length > 0) {
            const sorted = list.map((c: any) => parseInt(c.number)).sort((a: number, b: number) => a - b);
            const idx = sorted.indexOf(lastNum);
            if (idx !== -1 && idx < sorted.length - 1) nextNum = sorted[idx + 1];
        }
        if (nextNum === null && !(completeList && list.length > 0)) {
            // قائمة جزئية/غائبة: التسلسل بالرقم (النظام يرقّم 1..N)
            const cand = lastNum + 1;
            const bound = realTotalChapters || serverTotal;
            if (!(bound > 0 && cand > bound)) nextNum = cand;
        }
        if (nextNum === null) {
            setEndReached(true);
            postToWeb({ kind: 'endReached' });
            return;
        }
        loadingNextRef.current = true;
        setLoadingNext(true);
        postToWeb({ kind: 'loadingNext', value: true });
        try {
            const { data: nextData } = await loadChapterOfflineFirst(String(nextNum));
            if (!nextData || !nextData.content) {
                setEndReached(true);
                postToWeb({ kind: 'endReached' });
                return;
            }
            const rawContent = normalizeContent(nextData.content);
            const section = {
                number: nextNum,
                title: nextData.title || `فصل ${nextNum}`,
                rawContent,
                copyrightStart: nextData.copyrightStart,
                copyrightEnd: nextData.copyrightEnd,
                copyrightStyles: nextData.copyrightStyles,
            };
            sectionTitlesRef.current = { ...sectionTitlesRef.current, [nextNum]: section.title };
            setExtraSections((prev) => [...prev, section]);
            const html = buildWorSectionHTML({
                number: section.number,
                title: section.title,
                content: processProtected(section.rawContent, section.number),
                copyrightStart: section.copyrightStart,
                copyrightEnd: section.copyrightEnd,
                copyrightStyles: section.copyrightStyles,
            }, 1, settingsRef.current);
            postToWeb({ kind: 'appendChapter', number: nextNum, html: html + copyrightNoticeHtml(novelRef.current?.title || '') });
            if (autoScrollNextRef.current) {
                autoScrollNextRef.current = false;
                // scroll inside the shell via the bridge (no eval — CSP-safe)
                setTimeout(() => postToWeb({ kind: 'scrollToChapter', number: nextNum }), 350);
            }
        } catch {
            setEndReached(true);
            postToWeb({ kind: 'endReached' });
        } finally {
            loadingNextRef.current = false;
            setLoadingNext(false);
            postToWeb({ kind: 'loadingNext', value: false });
        }
    };

    // ========================= navigation =========================
    // 🛡️ بوابة الفصل التالي (مستوحاة من reading challenge في قراءة مجرة):
    // عند رصد نمط آلي (فصول متتالية بسرعة غير بشرية) يُحجز الانتقال حتى
    // يجتاز المستخدم بوابة التحقق — ثم يكمل تلقائياً من نفس النقطة.
    const pendingGateNavRef = useRef<(() => void) | null>(null);
    useEffect(() => {
        const onSolved = () => {
            markChallengeSolved();
            const fn = pendingGateNavRef.current;
            pendingGateNavRef.current = null;
            fn?.();
        };
        window.addEventListener('captcha-solved', onSolved);
        return () => window.removeEventListener('captcha-solved', onSolved);
    }, []);

    /** يمرّر الانتقال عبر بوابة التحقق إن رصد نمطاً آلياً — للأمام فقط (الرجوع حر) */
    const gateThen = (isForward: boolean, proceed: () => void) => {
        if (isForward && shouldChallengeBeforeNext()) {
            pendingGateNavRef.current = proceed;
            dispatchCaptchaRequired();
            return;
        }
        proceed();
    };

    const navigateChapter = (targetId: number | string) => {
        if (parseInt(targetId as any) === parseInt(chapterId || '1')) return;
        const forward = parseInt(targetId as any) > parseInt(chapterId || '1');
        gateThen(forward, () => {
            clearScrollFor(targetId);
            setTimeout(() => {
                navigate(`/novel/${novelId}/reader/${targetId}`, { replace: true });
            }, 120);
        });
    };

    const scrollToSection = (num: number) => {
        // scroll inside the shell via the bridge (no eval — CSP-safe)
        postToWeb({ kind: 'scrollToChapter', number: num });
    };

    const navigateNextPrev = (offset: number) => {
        const S = settingsRef.current;
        const list = chaptersListRef.current || [];
        const serverTotal = chaptersTotalRef.current || 0;
        // القائمة تعطي تنقلاً دقيقاً (يتخطى المخفي) فقط عندما تكون كاملة
        const completeList = serverTotal > 0 && list.length >= serverTotal;
        const availableChapters = completeList ? list.map((c: any) => parseInt(c.number)) : [];

        // Continuous mode: "next" scrolls to the already-appended section or fetches it
        if (S.continuousMode && offset > 0) {
            const anchorNum = parseInt(chapterId || '1') || 1;
            const secNums = [anchorNum, ...extraSections.map((x) => x.number)];
            const idx = secNums.indexOf(currentViewedChapter);
            const nextSec = idx !== -1 ? secNums[idx + 1] : (extraSections.length ? null : undefined);
            if (nextSec) {
                scrollToSection(nextSec);
                return;
            }
            if (endReached) {
                toast.error('أنت في آخر فصل متاح');
                return;
            }
            autoScrollNextRef.current = true;
            fetchNextChapter();
            return;
        }
        if (availableChapters.length > 0) {
            const currentNum = parseInt(chapterId || '1');
            const sortedAvailable = [...availableChapters].sort((a, b) => a - b);
            const currentIndex = sortedAvailable.indexOf(currentNum);
            if (currentIndex === -1) return;
            const nextIndex = currentIndex + offset;
            if (nextIndex >= 0 && nextIndex < sortedAvailable.length) {
                const nextChapId = sortedAvailable[nextIndex];
                gateThen(offset > 0, () => {
                    if (offset > 0) clearScrollFor(nextChapId);
                    navigate(`/novel/${novelId}/reader/${nextChapId}`, { replace: true });
                });
            } else {
                toast.error(offset > 0 ? 'أنت في آخر فصل منزل.' : 'أنت في أول فصل منزل.');
            }
        } else {
            // تنقل تسلسلي بالرقم مع حدود حقيقية (يعمل مع القائمة الجزئية)
            const bound = realTotalChapters || serverTotal;
            const nextNum = parseInt(chapterId || '1') + offset;
            if (offset < 0 && nextNum < 1) return;
            if (offset > 0 && bound > 0 && nextNum > bound) {
                toast.error('أنت في آخر فصل متاح.');
                return;
            }
            gateThen(offset > 0, () => {
                if (offset > 0) clearScrollFor(nextNum);
                navigate(`/novel/${novelId}/reader/${nextNum}`, { replace: true });
            });
        }
    };

    const handleThemeCycle = () => {
        const S = settingsRef.current;
        let idx = THEME_CYCLE.findIndex((t) => t.bgPreset === S.bgPreset);
        if (idx === -1) idx = THEME_CYCLE.findIndex((t) => t.bgColor.toLowerCase() === String(S.bgColor).toLowerCase());
        const next = THEME_CYCLE[(idx + 1) % THEME_CYCLE.length];
        applySettingsPatch({
            bgPreset: next.bgPreset,
            bgColor: next.bgColor,
            textColor: next.textColor,
            customColors: false,
        });
    };

    // ========================= favorites =========================
    const toggleFavorite = async () => {
        const newStatus = !isFavoriteRef.current;
        isFavoriteRef.current = newStatus;
        setIsFavorite(newStatus);
        sendFav(newStatus);
        try {
            await novelService.updateReadingStatus({
                novelId: novelId!,
                title: novel?.title,
                cover: novel?.cover,
                author: novel?.author || novel?.translator,
                isFavorite: newStatus,
            });
            toast.success(newStatus ? 'تمت الإضافة للمفضلة' : 'تم الحذف من المفضلة');
        } catch {
            isFavoriteRef.current = !newStatus;
            setIsFavorite(!newStatus);
            sendFav(!newStatus);
            toast.error('فشلت العملية');
        }
    };

    // ========================= admin tools =========================
    const handleSaveCopyrights = async () => {
        setCopyrightLoading(true);
        try {
            const res = await fetch(`${api.baseUrl}/api/admin/copyright`, {
                method: 'POST',
                headers: { ...api.headers, ...api.getAuthHeader() },
                body: JSON.stringify({
                    startText: copyrightStartText,
                    endText: copyrightEndText,
                    styles: copyrightStyle,
                    frequency: copyrightFrequency,
                    everyX: parseInt(copyrightEveryX) || 5,
                    enableChapterSeparator: settingsRef.current.enableSeparator,
                    chapterSeparatorText: settingsRef.current.separatorText,
                }),
            });
            if (!res.ok) {
                toast.error('فشل الحفظ — تحقق من صلاحيتك ثم أعد المحاولة');
                return;
            }
            toast.success('تم حفظ إعدادات الحقوق');
            fetchChapter();
        } catch {
            toast.error('فشل الحفظ');
        } finally {
            setCopyrightLoading(false);
        }
    };

    const handleExecuteCleaner = async () => {
        if (!newCleanerWord.trim()) {
            toast.error('يرجى إدخال النص المراد حذفه');
            return;
        }
        const executeAction = async () => {
            setCleaningLoading(true);
            try {
                let res: Response;
                if (cleanerEditingIndex !== null && cleanerOldWord) {
                    res = await fetch(`${api.baseUrl}/api/admin/cleaner/${encodeURIComponent(cleanerOldWord)}`, {
                        method: 'PUT',
                        headers: { ...api.headers, ...api.getAuthHeader() },
                        body: JSON.stringify({ word: newCleanerWord.trim() }),
                    });
                } else {
                    res = await fetch(`${api.baseUrl}/api/admin/cleaner`, {
                        method: 'POST',
                        headers: { ...api.headers, ...api.getAuthHeader() },
                        body: JSON.stringify({ word: newCleanerWord.trim() }),
                    });
                }
                if (!res.ok) {
                    toast.error('فشل تنفيذ العملية — تحقق من صلاحيتك ثم أعد المحاولة');
                    return;
                }
                setCleanerEditingIndex(null);
                setCleanerOldWord('');
                setNewCleanerWord('');
                await fetchCleanerWords();
                toast.success('تم تنفيذ العملية على جميع الفصول بنجاح');
                fetchChapter();
            } catch {
                toast.error('فشل تنفيذ العملية');
            } finally {
                setCleaningLoading(false);
            }
        };

        if (cleanerEditingIndex !== null) {
            if (window.confirm(`سيتم تحديث "${cleanerOldWord}" إلى "${newCleanerWord.trim()}" في جميع الفصول.`)) executeAction();
            else return;
        } else {
            if (window.confirm(`سيتم حذف أي فقرة أو نص مطابق لـ "${newCleanerWord.trim()}" من جميع الفصول في السيرفر.`)) executeAction();
            else return;
        }
    };

    const handleDeleteCleaner = async (item: string) => {
        if (!window.confirm('هل تريد إزالة هذا النص من القائمة؟')) return;
        try {
            const res = await fetch(`${api.baseUrl}/api/admin/cleaner/${encodeURIComponent(item)}`, {
                method: 'DELETE',
                headers: api.getAuthHeader(),
            });
            if (!res.ok) {
                toast.error('فشل الحذف — تحقق من صلاحيتك');
                return;
            }
            fetchCleanerWords();
            if (newCleanerWord === item) {
                setNewCleanerWord('');
                setCleanerEditingIndex(null);
                setCleanerOldWord('');
            }
        } catch {
            toast.error('فشل الحذف');
        }
    };

    const submitReport = async (msg: any) => {
        try {
            const res = await fetch(`${api.baseUrl}/api/reports`, {
                method: 'POST',
                headers: { ...api.headers, ...api.getAuthHeader() },
                body: JSON.stringify({
                    novelId,
                    novelTitle: novel?.title,
                    chapterNumber: parseInt(chapterId || '1') || 1,
                    chapterTitle: chapter ? chapter.title : '',
                    types: msg.types || [],
                    details: msg.details || '',
                }),
            });
            if (!res.ok) {
                toast.error('تعذر إرسال البلاغ الآن — حاول مجدداً');
                return;
            }
            toast.success('تم إرسال البلاغ، شكراً لك!');
        } catch {
            toast.error('تعذر إرسال البلاغ الآن');
        }
    };

    // ========================= keep awake =========================
    useEffect(() => {
        if (settings.keepAwake) KeepAwake.activateKeepAwakeAsync();
        else KeepAwake.deactivateKeepAwake();
        // Release the wake lock when leaving the reader
        return () => { try { KeepAwake.deactivateKeepAwake(); } catch { /* ignore */ } };
    }, [settings.keepAwake]);

    // ========================= shell -> parent messages =========================
    const handleMessageRef = useRef<(d: any) => void>(() => { });

    const handleShellMessage = useCallback((data: any) => {
        if (!data || !data.t) return;
        switch (data.t) {
            case 'ready': {
                flushWebQueue();
                sendSettings(settingsRef.current);
                sendChapters();
                sendWords();
                sendFav(isFavoriteRef.current);
                if (chapterRef.current) {
                    const processed = processProtected(chapterRef.current.content || '', chapterRef.current.number || chapterId || '1');
                    sendChapterToWeb({ ...chapterRef.current, processedContent: processed });
                }
                break;
            }
            case 'scroll': {
                const chNum = parseInt(data.chapter) || currentViewedChapter;
                const inOffset = (data.inOffset != null) ? data.inOffset : data.offset;
                lastScrollPosRef.current = { chapter: chNum, offset: inOffset, global: data.offset };
                setCurrentViewedChapter((prev: number) => (parseInt(prev as any) === chNum ? prev : chNum));
                queueSaveScroll(chNum, inOffset, data.offset);
                // 🛡️ تمرير حقيقي داخل النص = دليل قراءة بشرية (يعفي الفصل من عدّاد السرعة)
                if (data.offset > 400) noteReaderEngagement(chNum);
                break;
            }
            case 'needNext':
                fetchNextChapter();
                break;
            case 'nav': {
                if (data.dir === 'next') navigateNextPrev(1);
                else if (data.dir === 'prev') navigateNextPrev(-1);
                else if (data.to === 'novel') navigate(`/novel/${novelId}`);
                else if (data.to === 'home') navigate('/');
                else if (data.to === 'downloads') navigate('/library');
                break;
            }
            case 'goto':
                if (data.number) navigateChapter(parseInt(data.number));
                break;
            case 'chaptersLoadMore':
                loadMoreChapters();
                break;
            case 'chaptersSearch':
                searchAllChapters(data.q);
                break;
            case 'novelPage':
                navigate(`/novel/${novelId}`);
                break;
            case 'comments':
                setShowComments(true);
                break;
            case 'fav':
                toggleFavorite();
                break;
            case 'settings': {
                if (data.patch) {
                    const needsRebuild = STRUCTURAL_KEYS.some((k) => (
                        Object.prototype.hasOwnProperty.call(data.patch, k)
                        && String(data.patch[k] ?? '') !== String(settingsRef.current[k] ?? '')
                    ));
                    applySettingsPatch(data.patch);
                    if (needsRebuild && chapterRef.current) {
                        const ch = chapterRef.current;
                        const processed = processProtected(ch.content || '', (ch as any).number || chapterId || '1');
                        setTimeout(() => sendChapterToWeb({ ...ch, processedContent: processed }, { keepScroll: true }), 0);
                    }
                }
                break;
            }
            case 'words':
                wordsAction(data);
                break;
            case 'wordsOpen':
                sendWords();
                break;
            case 'report':
                submitReport(data);
                break;
            case 'tool':
                if (!isAdmin) break;
                if (data.tool === 'cleaner') setShowCleaner(true);
                else if (data.tool === 'copyright') setShowCopyright(true);
                break;
            case 'themeCycle':
                handleThemeCycle();
                break;
            case 'exit':
                navigate(`/novel/${novelId}`);
                break;
            case 'profile':
                navigate(`/novel/${novelId}`);
                break;
            case 'error':
                console.log('[wor reader] shell error:', data.message);
                break;
            default:
                break;
        }
    }, [flushWebQueue, sendSettings, sendChapters, sendWords, sendFav, applyReplacements, sendChapterToWeb, currentViewedChapter, novelId, applySettingsPatch, wordsAction, isAdmin, endReached, extraSections, settings, loadMoreChapters, searchAllChapters]);

    handleMessageRef.current = handleShellMessage;

    useEffect(() => {
        const listener = (event: MessageEvent) => {
            if (event.source !== iframeRef.current?.contentWindow) return;
            // Only accept messages coming from our own app origin (the sandboxed
            // srcDoc iframe inherits the parent origin) — blocks foreign frames
            if (event.origin && !event.origin.includes(window.location.hostname)) return;
            const raw = event.data;
            if (raw == null) return;
            let data: any = raw;
            if (typeof raw === 'string') {
                try { data = JSON.parse(raw); } catch { return; }
            }
            handleMessageRef.current(data);
        };
        window.addEventListener('message', listener);
        return () => window.removeEventListener('message', listener);
    }, []);

    // ========================= shell html =========================
    // Gate the shell on the novel header (title/cover for the drawer) with a
    // fallback so a slow novel fetch never blocks reading.
    const [shellNovelReady, setShellNovelReady] = useState(false);
    useEffect(() => {
        if (novel) { setShellNovelReady(true); return; }
        const t = setTimeout(() => setShellNovelReady(true), 2500);
        return () => clearTimeout(t);
    }, [novel]);

    const shellHtml = useMemo(() => {
        if (!shellNovelReady) return '';
        return buildWorShell({
            safeTop: 0,
            safeBottom: 0,
            novelTitle: novel?.title || '',
            novelCover: novel?.cover || '',
            userName: userInfo?.username || userInfo?.name || '',
            userRole: userInfo?.role || '',
            initialSettings: { ...settingsRef.current },
        });
    }, [shellNovelReady, novel, userInfo]);

    // flush the very last position when leaving the reader
    useEffect(() => () => {
        if (scrollSaveTimer.current) clearTimeout(scrollSaveTimer.current);
        const last = lastScrollPosRef.current;
        if (last && last.chapter) saveScrollPosition(last.chapter, last.offset, last.global);
    }, []);

    const lightBg = isLightColor(settings.bgColor);

    // ========================= render =========================
    return (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: settings.bgColor }}>
            <Helmet>
                <title>{chapter ? `${chapter.title} — ${novel?.title || 'قارئ زيوس'}` : 'جاري التحميل…'}</title>
                <meta name="robots" content="noindex" />
            </Helmet>

            {shellNovelReady && (
                <iframe
                    ref={iframeRef}
                    title="reader"
                    srcDoc={shellHtml}
                    className="flex-1 w-full border-0"
                    style={{ backgroundColor: settings.bgColor }}
                    sandbox="allow-scripts allow-same-origin allow-popups"
                />
            )}

            {/* loading overlay */}
            {loading && !errorInfo && (
                <div
                    className="absolute inset-0 z-20 flex flex-col items-center justify-center"
                    style={{ backgroundColor: settings.bgColor }}
                >
                    <div
                        className="w-10 h-10 rounded-full border-[3px] border-transparent animate-spin"
                        style={{ borderTopColor: lightBg ? '#333' : '#fff', borderLeftColor: lightBg ? '#333' : '#fff' }}
                    />
                    <p className="mt-4 text-[15px] font-semibold" style={{ color: lightBg ? '#333' : '#fff' }}>جاري التحميل…</p>
                </div>
            )}

            {/* loading next chapter (continuous mode) */}
            {loadingNext && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full bg-black/70 text-white text-xs">
                    جاري تحميل الفصل التالي…
                </div>
            )}

            {/* error state */}
            {errorInfo && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center px-8" style={{ backgroundColor: settings.bgColor }}>
                    <CloudOff size={64} color={lightBg ? '#555' : '#888'} />
                    <h2 className="text-[22px] font-bold mt-5 mb-2" style={{ color: lightBg ? '#111' : '#fff' }}>تعذّر عرض الفصل</h2>
                    <p className="text-[15px] text-center leading-6 mb-7" style={{ color: lightBg ? '#444' : '#999' }}>{errorInfo.message}</p>
                    <button
                        onClick={() => fetchChapter()}
                        className="flex items-center justify-center gap-2 bg-white text-black font-bold py-3.5 px-8 rounded-2xl w-full max-w-xs mb-3"
                    >
                        <RefreshCcw size={20} color="#000" />
                        إعادة المحاولة
                    </button>
                    <button
                        onClick={() => navigate(`/novel/${novelId}`)}
                        className="flex items-center justify-center gap-2 bg-[#1a1a1a] border border-[#2e2e2e] text-white font-bold py-3.5 px-8 rounded-2xl w-full max-w-xs"
                    >
                        <ArrowRight size={20} color="#fff" />
                        رجوع
                    </button>
                </div>
            )}

            {/* comments modal (site component) */}
            <CommentsModal
                isOpen={showComments}
                onClose={() => setShowComments(false)}
                novelId={novelId!}
                chapterId={currentViewedChapter}
                onAddComment={async (content: string): Promise<boolean> => {
                    try {
                        await commentService.addComment(novelId!, content, undefined, currentViewedChapter);
                        fetchCommentCount(currentViewedChapter);
                        return true;
                    } catch (err: any) {
                        toast.error(err?.message || 'فشل إضافة التعليق');
                        return false;
                    }
                }}
            />

            {/* admin: cleaner modal */}
            {showCleaner && isAdmin && (
                <div className="fixed inset-0 z-[60] flex flex-col bg-[#0d0d0d]">
                    <div className="flex items-center justify-between p-4 border-b border-[#242424]">
                        <span className="text-white font-bold text-[17px]">الحذف الشامل</span>
                        <button onClick={() => setShowCleaner(false)} className="text-[#888] text-2xl leading-none">×</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                        <p className="text-[#888] text-xs mb-3 text-right leading-5">يحذف النص المطابق من جميع الفصول في السيرفر (للمشرفين).</p>
                        <textarea
                            className="w-full bg-[#1d1d1d] text-white rounded-[10px] p-3 text-sm border border-[#2e2e2e] mb-3 text-right min-h-[70px]"
                            placeholder="النص المراد حذفه أو تعديله"
                            value={newCleanerWord}
                            onChange={(e) => setNewCleanerWord(e.target.value)}
                        />
                        <div className="flex gap-2 mb-4">
                            <button
                                onClick={handleExecuteCleaner}
                                disabled={cleaningLoading}
                                className="flex-1 bg-white text-black font-bold py-3 rounded-[10px] disabled:opacity-50"
                            >
                                {cleanerEditingIndex !== null ? 'تحديث' : 'تنفيذ الحذف'}
                            </button>
                            {cleanerEditingIndex !== null && (
                                <button
                                    onClick={() => { setCleanerEditingIndex(null); setCleanerOldWord(''); setNewCleanerWord(''); }}
                                    className="px-4 bg-[#555] text-white rounded-[10px]"
                                >
                                    إلغاء
                                </button>
                            )}
                        </div>
                        <div className="max-h-[45vh] overflow-y-auto">
                            {(cleanerWords || []).map((item, index) => (
                                <div key={`${item}_${index}`} className="bg-[#181818] rounded-[10px] p-3 mb-2 flex items-center justify-between border border-[#2a2a2a]">
                                    <span className="text-[#ddd] text-[13px] flex-1 text-right line-clamp-2">{item}</span>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => { setNewCleanerWord(item); setCleanerEditingIndex(index); setCleanerOldWord(item); }}
                                            className="text-[#8b95a5] text-sm"
                                        >تعديل</button>
                                        <button onClick={() => handleDeleteCleaner(item)} className="text-[#ff4444] text-sm">حذف</button>
                                    </div>
                                </div>
                            ))}
                            {(!cleanerWords || cleanerWords.length === 0) && (
                                <p className="text-[#666] text-center mt-5">لا توجد كلمات محذوفة بعد</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* admin: copyright modal */}
            {showCopyright && isAdmin && (
                <div className="fixed inset-0 z-[60] flex flex-col bg-[#0d0d0d]">
                    <div className="flex items-center justify-between p-4 border-b border-[#242424]">
                        <span className="text-white font-bold text-[17px]">حقوق الموقع</span>
                        <button onClick={() => setShowCopyright(false)} className="text-[#888] text-2xl leading-none">×</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                        <p className="text-[#999] text-[13px] font-bold mb-2 text-right">تكرار الظهور</p>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {[['always', 'كل فصل'], ['everyX', `كل ${copyrightEveryX || 'X'} فصول`], ['never', 'إيقاف']].map(([val, label]) => (
                                <button
                                    key={val}
                                    onClick={() => setCopyrightFrequency(val)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold border ${copyrightFrequency === val ? 'bg-[#8b95a5] border-[#8b95a5] text-black' : 'bg-[#1a1a1a] border-[#2e2e2e] text-[#888]'}`}
                                >{label}</button>
                            ))}
                        </div>
                        {copyrightFrequency === 'everyX' && (
                            <input
                                className="w-full bg-[#1d1d1d] text-white rounded-[10px] p-3 text-sm border border-[#2e2e2e] mb-4 text-right"
                                placeholder="عدد الفصول (X)"
                                value={copyrightEveryX}
                                onChange={(e) => setCopyrightEveryX(e.target.value.replace(/\D/g, ''))}
                            />
                        )}
                        <p className="text-[#999] text-[13px] font-bold mb-2 text-right">نص البداية (يظهر أعلى الفصل)</p>
                        <textarea
                            className="w-full bg-[#1d1d1d] text-white rounded-[10px] p-3 text-sm border border-[#2e2e2e] mb-4 text-right min-h-[70px]"
                            placeholder="مثال: حقوق النشر محفوظة لموقع زيوس..."
                            value={copyrightStartText}
                            onChange={(e) => setCopyrightStartText(e.target.value)}
                        />
                        <p className="text-[#999] text-[13px] font-bold mb-2 text-right">نص النهاية (يظهر أسفل الفصل)</p>
                        <textarea
                            className="w-full bg-[#1d1d1d] text-white rounded-[10px] p-3 text-sm border border-[#2e2e2e] mb-4 text-right min-h-[70px]"
                            placeholder="مثال: شكراً للقراءة على موقع زيوس..."
                            value={copyrightEndText}
                            onChange={(e) => setCopyrightEndText(e.target.value)}
                        />
                        <p className="text-[#999] text-[13px] font-bold mb-2 text-right">نمط النص</p>
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                            {['#888888', '#ffffff', '#f97316', '#4ade80', '#3b82f6'].map((c) => (
                                <button
                                    key={c}
                                    onClick={() => setCopyrightStyle((prev: any) => ({ ...prev, color: c }))}
                                    className="w-[30px] h-[30px] rounded-full"
                                    style={{ backgroundColor: c, border: copyrightStyle.color === c ? '2px solid #fff' : '2px solid transparent' }}
                                />
                            ))}
                            {['right', 'center', 'left'].map((a) => (
                                <button
                                    key={a}
                                    onClick={() => setCopyrightStyle((prev: any) => ({ ...prev, alignment: a }))}
                                    className={`px-2.5 py-1.5 rounded-lg text-[11px] border ${copyrightStyle.alignment === a ? 'bg-[#8b95a5] border-[#8b95a5] text-black' : 'bg-[#1a1a1a] border-[#2e2e2e] text-white'}`}
                                >{a === 'right' ? 'يمين' : a === 'center' ? 'وسط' : 'يسار'}</button>
                            ))}
                            <button
                                onClick={() => setCopyrightStyle((prev: any) => ({ ...prev, isBold: !prev.isBold }))}
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] border ${copyrightStyle.isBold ? 'bg-[#8b95a5] border-[#8b95a5] text-black' : 'bg-[#1a1a1a] border-[#2e2e2e] text-white'}`}
                            >عريض</button>
                        </div>
                        <label className="flex items-center gap-2 mb-3 text-[#ccc] font-bold text-sm">
                            <input
                                type="checkbox"
                                checked={!!settings.enableSeparator}
                                onChange={(e) => applySettingsPatch({ enableSeparator: e.target.checked })}
                            />
                            تفعيل الخط الفاصل تحت العنوان
                        </label>
                        {settings.enableSeparator && (
                            <input
                                className="w-full bg-[#1d1d1d] text-white rounded-[10px] p-3 text-sm border border-[#2e2e2e] mb-4 text-right"
                                placeholder="__________________"
                                value={settings.separatorText || ''}
                                onChange={(e) => applySettingsPatch({ separatorText: e.target.value })}
                            />
                        )}
                        <button
                            onClick={handleSaveCopyrights}
                            disabled={copyrightLoading}
                            className="w-full bg-white text-black font-bold py-3 rounded-[10px] mb-8 disabled:opacity-50"
                        >حفظ الحقوق</button>
                    </div>
                </div>
            )}
        </div>
    );
}
