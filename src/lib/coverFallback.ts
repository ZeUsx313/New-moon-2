/**
 * رابط غلاف الرواية (مهمة 38 — إصلاح أغلفة wfxs.tw على الموقع):
 *
 * المشكلة: أغلفة الروايات المسحوبة من m.wfxs.tw تُخزَّن برابط
 * img-wfxs-tw.translate.goog (الغلاف الأصلي img.wfxs.tw محجوب 403 من
 * IP السيرفرات). وكيل الترجمة هذا يعيد 403/302 لأي طلب يحمل ترويسة
 * Referer — والمتصفح يرسل Referer دائماً مع <img> — فيفشل الغلاف في
 * كل شاشات الموقع مهما كانت الصفحة.
 *
 * الحل من مستويين:
 *  1) normalizeCoverUrl — تُستخدم في الأماكن التي تُبنى فيها الروابط برمجياً
 *     (SEO وغيرها): تمرير الرابط عبر بروكسي الصور في الخادم بدون Referer.
 *  2) التقاط خطأ تحميل <img> عالمياً (طور الالتقاط capture) — أي صورة غلاف
 *     تفشل في أي شاشة تُستبدل تلقائياً بنسخة البروكسي مرة واحدة. بهذا تعمل
 *     الأغلفة في كل الصفحات الحالية والمستقبلية دون تعديل مكوّناتها.
 */
import { API_BASE_URL } from '../services/api';

/** مضيفات تحتاج بروكسي الخادم (لا تُحمّل من المتصفح مباشرة بسبب Referer/403) */
const NEEDS_PROXY_RE = /translate\.goog\/|^https?:\/\/([^/]*\.)?wfxs\.tw\//i;

/** يعيد الرابط الصالح للعرض — أو الرابط كما هو إن لم يكن بحاجة بروكسي */
export function normalizeCoverUrl(src?: string | null): string {
  if (!src) return '';
  try {
    if (NEEDS_PROXY_RE.test(src.trim())) {
      return `${API_BASE_URL}/api/image-proxy?url=${encodeURIComponent(src.trim())}`;
    }
    return src;
  } catch {
    return src;
  }
}

/** سمة بيانات لمنع إعادة المحاولة اللانهائية على نفس الصورة */
const PROXIED_ATTR = 'data-cover-proxied';

/** تُستدعى مرة واحدة عند إقلاع الموقع — تراقب كل صور الصفحة */
export function installCoverFallback(): void {
  if (typeof document === 'undefined') return;
  document.addEventListener(
    'error',
    (e) => {
      const img = e.target as HTMLImageElement | null;
      if (!img || img.tagName !== 'IMG') return;
      // صور SafeImage تدير إعادة المحاولة بنفسها (حالة React) — لا تداخل
      if (img.getAttribute('data-safe-image') === '1') return;
      if (img.getAttribute(PROXIED_ATTR) === '1') return;
      const proxied = normalizeCoverUrl(img.currentSrc || img.src);
      if (!proxied || proxied === img.src) return;
      img.setAttribute(PROXIED_ATTR, '1');
      img.style.opacity = ''; // شرطات الإخفاء من معالجات onError الموضعية تُزال عند النجاح
      img.src = proxied;
    },
    true
  );
}
