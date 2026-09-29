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

    const sendChapters = useCallback((list?: any[]) => {
        postToWeb({ kind: 'chapters', list: list || chaptersListRef.current });
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

    const sendChapterToWeb = useCallback((chapterData: any, opts: any = {}) => {
        if (!chapterData) return;
        const S = { ...settingsRef.current, colored: coloredRef.current };
        const number = opts.number || parseInt(chapterId || '1') || 1;
        const list = chaptersListRef.current || [];
        const sorted = list.length > 0 ? list.map((c: any) => parseInt(c.number)).sort((a: number, b: number) => a - b) : null;
        let hasPrev = true, hasNext = true, position = number, total = realTotalChapters;
        if (sorted) {
            const idx = sorted.indexOf(number);
            hasPrev = idx > 0;
            hasNext = idx !== -1 && idx < sorted.length - 1;
            position = idx + 1;
            total = sorted.length;
        } else {
            hasPrev = number > 1;
            hasNext = !(realTotalChapters > 0 && number >= realTotalChapters);
        }
        const percent = total > 0 ? Math.min(100, Math.round((position / total) * 100)) : 0;
        const html = buildWorSectionHTML({
            number,
            title: chapterData.title,
            content: chapterData.processedContent || '',
            copyrightStart: chapterData.copyrightStart,
            copyrightEnd: chapterData.copyrightEnd,
            copyrightStyles: chapterData.copyrightStyles,
        }, 0, S);
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
        const processed = applyReplacements(ch.content || '');
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

    const fetchChapters = async () => {
        try {
            const list = await novelService.getChaptersList(novelId!, 1, 100000, 'asc');
            if (Array.isArray(list) && list.length > 0) {
                setChaptersList(list);
                sendChapters(list);
            }
        } catch { /* ignore */ }
    };

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

    const fetchChapter = useCallback(async () => {
        setLoading(true);
        setErrorInfo(null);
        setExtraSections([]);
        setEndReached(false);
        setLoadingNext(false);
        loadingNextRef.current = false;
        setCurrentViewedChapter(parseInt(chapterId || '1') || 1);
        try {
            const chapterData = await novelService.getChapter(novelId!, chapterId!);
            if (chapterData && chapterData.content) {
                chapterData.content = normalizeContent(chapterData.content);
            }
            setChapter(chapterData);
            if (chapterData) {
                sectionTitlesRef.current = { ...sectionTitlesRef.current, [parseInt(chapterId || '1') || 1]: chapterData.title || `فصل ${chapterId}` };
            }
            if (chapterData?.totalChapters) setRealTotalChapters(chapterData.totalChapters);

            const savedOffset = await loadScrollPosition(chapterId || '1');
            pendingRestoreRef.current = savedOffset;

            if (chapterData) {
                const processed = applyReplacements(chapterData.content || '');
                setTimeout(() => {
                    sendChapterToWeb({ ...chapterData, processedContent: processed });
                    sendSettings(settingsRef.current);
                }, 0);
            }

            novelService.incrementView(novelId!, parseInt(chapterId || '1') || 1).catch(() => { });
            updateProgressOnServer(chapterData, chapterId || '1');
            fetchCommentCount(chapterId || '1');
        } catch (err: any) {
            const status = err?.message?.includes('403') ? 403 : err?.message?.includes('404') ? 404 : 0;
            let message = 'فشل تحميل الفصل. تحقق من اتصالك بالإنترنت ثم أعد المحاولة.';
            if (status === 403) message = 'هذا الفصل غير متاح حالياً (خاص أو لم يُنشر بعد).';
            else if (status === 404) message = 'الفصل غير موجود. ربما تم حذفه أو تغيير ترقيمه.';
            setErrorInfo({ message, status });
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [novelId, chapterId, applyReplacements, sendChapterToWeb, sendSettings]);

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
        if (list.length > 0) {
            const sorted = list.map((c: any) => parseInt(c.number)).sort((a: number, b: number) => a - b);
            const idx = sorted.indexOf(lastNum);
            if (idx !== -1 && idx < sorted.length - 1) nextNum = sorted[idx + 1];
        } else {
            const cand = lastNum + 1;
            if (!(realTotalChapters > 0 && cand > realTotalChapters)) nextNum = cand;
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
            const nextData = await novelService.getChapter(novelId!, String(nextNum));
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
                content: applyReplacements(section.rawContent),
                copyrightStart: section.copyrightStart,
                copyrightEnd: section.copyrightEnd,
                copyrightStyles: section.copyrightStyles,
            }, 1, settingsRef.current);
            postToWeb({ kind: 'appendChapter', number: nextNum, html });
            if (autoScrollNextRef.current) {
                autoScrollNextRef.current = false;
                setTimeout(() => {
                    const win: any = iframeRef.current?.contentWindow;
                    win?.eval?.(`(function(){var n=0;(function go(){var el=document.querySelector('section[data-ch="${nextNum}"]'); if(!el) return; window.scrollTo({top: el.offsetTop - 8, behavior:'smooth'}); if(++n<3) requestAnimationFrame(go);})();})();`);
                }, 350);
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
    const navigateChapter = (targetId: number | string) => {
        if (parseInt(targetId as any) === parseInt(chapterId || '1')) return;
        clearScrollFor(targetId);
        setTimeout(() => {
            navigate(`/novel/${novelId}/reader/${targetId}`, { replace: true });
        }, 120);
    };

    const scrollToSection = (num: number) => {
        const win: any = iframeRef.current?.contentWindow;
        win?.eval?.(`(function(){var n=0;(function go(){var el=document.querySelector('section[data-ch="${num}"]'); if(!el) return; window.scrollTo({top: el.offsetTop - 8, behavior:'smooth'}); if(++n<3) requestAnimationFrame(go);})();})();`);
    };

    const navigateNextPrev = (offset: number) => {
        const S = settingsRef.current;
        const list = chaptersListRef.current || [];
        const availableChapters = list.map((c: any) => parseInt(c.number));

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
                if (offset > 0) clearScrollFor(nextChapId);
                navigate(`/novel/${novelId}/reader/${nextChapId}`, { replace: true });
            } else {
                toast.error(offset > 0 ? 'أنت في آخر فصل منزل.' : 'أنت في أول فصل منزل.');
            }
        } else {
            const nextNum = parseInt(chapterId || '1') + offset;
            if (offset < 0 && nextNum < 1) return;
            if (offset > 0 && realTotalChapters > 0 && nextNum > realTotalChapters) {
                toast.error('أنت في آخر فصل متاح.');
                return;
            }
            if (offset > 0) clearScrollFor(nextNum);
            navigate(`/novel/${novelId}/reader/${nextNum}`, { replace: true });
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
            await fetch(`${api.baseUrl}/api/admin/copyright`, {
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
                if (cleanerEditingIndex !== null && cleanerOldWord) {
                    await fetch(`${api.baseUrl}/api/admin/cleaner/${encodeURIComponent(cleanerOldWord)}`, {
                        method: 'PUT',
                        headers: { ...api.headers, ...api.getAuthHeader() },
                        body: JSON.stringify({ word: newCleanerWord.trim() }),
                    });
                    setCleanerEditingIndex(null);
                    setCleanerOldWord('');
                } else {
                    await fetch(`${api.baseUrl}/api/admin/cleaner`, {
                        method: 'POST',
                        headers: { ...api.headers, ...api.getAuthHeader() },
                        body: JSON.stringify({ word: newCleanerWord.trim() }),
                    });
                }
                setNewCleanerWord('');
                await fetchCleanerWords();
                toast.success(cleanerEditingIndex !== null ? 'تم التحديث بنجاح' : 'تم الحذف من جميع الفصول بنجاح');
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
            await fetch(`${api.baseUrl}/api/admin/cleaner/${encodeURIComponent(item)}`, {
                method: 'DELETE',
                headers: api.getAuthHeader(),
            });
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
            await fetch(`${api.baseUrl}/api/reports`, {
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
            toast.success('تم إرسال البلاغ، شكراً لك!');
        } catch {
            toast.error('تعذر إرسال البلاغ الآن');
        }
    };

    // ========================= keep awake =========================
    useEffect(() => {
        if (settings.keepAwake) KeepAwake.activateKeepAwakeAsync();
        else KeepAwake.deactivateKeepAwake();
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
                    const processed = applyReplacements(chapterRef.current.content || '');
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
                        const processed = applyReplacements(ch.content || '');
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
    }, [flushWebQueue, sendSettings, sendChapters, sendWords, sendFav, applyReplacements, sendChapterToWeb, currentViewedChapter, novelId, applySettingsPatch, wordsAction, isAdmin, endReached, extraSections, settings]);

    handleMessageRef.current = handleShellMessage;

    useEffect(() => {
        const listener = (event: MessageEvent) => {
            if (event.source !== iframeRef.current?.contentWindow) return;
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
                onAddComment={async (content: string) => {
                    await commentService.addComment(novelId!, content, undefined, currentViewedChapter);
                    fetchCommentCount(currentViewedChapter);
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
