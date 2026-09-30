/**
 * 📊 تحليلات الموقع — تتبع بأسلوب Google Analytics لكن على خادمنا:
 *   - معرّف زائر ثابت (localStorage) + معرّف جلسة (sessionStorage)
 *   - مشاهدات صفحات لكل مسار + فتح الروايات + مصادر الزيارات + نوع الجهاز
 *   - إرسال بـ sendBeacon (لا يبطئ الإغلاق) مع طابور دفعات
 *   - يحترم Do Not Track (صدق وخصوصية — موثّق في سياسة الخصوصية)
 *   - إذا ضُبط VITE_GA_ID يُحمَّل Google Analytics 4 أيضاً (اختياري)
 */

const CID_KEY = 'moon_cid';
const SID_KEY = 'moon_sid';

function uuid(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  } catch { /* ignore */ }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 8)}`;
}

function getClientId(): string {
  try {
    let cid = localStorage.getItem(CID_KEY);
    if (!cid) {
      cid = uuid();
      localStorage.setItem(CID_KEY, cid);
    }
    return cid;
  } catch { return 'anon'; }
}

function getSessionId(): string {
  try {
    let sid = sessionStorage.getItem(SID_KEY);
    if (!sid) {
      sid = uuid();
      sessionStorage.setItem(SID_KEY, sid);
    }
    return sid;
  } catch { return 'sess'; }
}

/** نوع الجهاز من عرض الشاشة + اللمس (بدون UA parsing ثقيل) */
function deviceType(): string {
  const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  const w = window.innerWidth;
  if (coarse && w < 640) return 'mobile';
  if (coarse) return 'tablet';
  if (w < 1024) return 'small-desktop';
  return 'desktop';
}

function dntRespected(): boolean {
  try {
    const dnt = (navigator as any).doNotTrack || (window as any).doNotTrack || (navigator as any).msDoNotTrack;
    return dnt === '1' || dnt === 'yes';
  } catch { return false; }
}

interface EventPayload {
  type: 'pageview' | 'novel_open' | 'chapter_read' | 'download';
  path?: string;
  novelId?: string;
  referrer?: string;
}

const queue: EventPayload[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function flush(): Promise<void> {
  if (queue.length === 0) return;
  const batch = queue.splice(0, queue.length);
  const body = JSON.stringify({
    cid: getClientId(),
    sid: getSessionId(),
    device: deviceType(),
    screen: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
    events: batch,
    t: Date.now(),
  });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/collect', new Blob([body], { type: 'application/json' }));
    } else {
      await fetch('/api/analytics/collect', { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true });
    }
  } catch { /* التتبع لا يكسر الاستخدام أبداً */ }
}

function schedule(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, 1200);
}

/** تتبع مشاهدة صفحة (يُستدعى من Layout عند كل تغيير مسار) */
export function trackPageview(path: string): void {
  if (dntRespected()) return;
  if (path.startsWith('/dashboard')) return; // اللوحة الإدارية لا تُحتسب زيارات عامة
  queue.push({ type: 'pageview', path, referrer: document.referrer || '' });
  schedule();
}

/** تتبع فتح رواية (يُستدعى من صفحة الرواية) */
export function trackNovelOpen(novelId: string): void {
  if (dntRespected()) return;
  queue.push({ type: 'novel_open', novelId });
  schedule();
}

/** GA4 اختياري — يُفعّل فقط عند ضبط VITE_GA_ID في متغيرات البيئة */
export function initGoogleAnalytics(): void {
  const gaId = import.meta.env.VITE_GA_ID as string | undefined;
  if (!gaId || dntRespected()) return;
  try {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
    document.head.appendChild(s);
    (window as any).dataLayer = (window as any).dataLayer || [];
    function gtag(..._args: any[]) {
      (window as any).dataLayer.push(arguments);
    }
    (window as any).gtag = gtag;
    gtag('js', new Date());
    gtag('config', gaId, { anonymize_ip: true });
  } catch { /* ignore */ }
}

/** إرسال فوري عند مغادرة الصفحة */
window.addEventListener('pagehide', () => { void flush(); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') void flush();
});
