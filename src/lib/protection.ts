/**
 * حماية نصوص الفصول — طبقة التخريب اللطيف للسحب الآلي.
 *
 * الفكرة: النص المعروض يبقى نصاً حقيقياً (SEO + وصولية)، لكن نزرع فيه
 * محارف صفرية العرض (Zero-Width) بمواضع شبه عشوائية ثابتة البذرة:
 *   - أي نسخ/سحب آلي يجلب النص محمّلاً بمحارف خفية تُفسد المطابقة التامة
 *     وتلوّث مجموعات التدريب/النسخ المستخرجة آلياً.
 *   - كل رواية+فصل+قارئ تنتج بصمة مميزة — إن ظهرت نسخة مسروقة يمكن
 *     معرفة مصدرها (تتبع التسريبات).
 *   - القارئ البشري لا يرى شيئاً إطلاقاً.
 */

/** محارف صفرية العرض آمنة للعربية (لا تكسر التشكيل أو الاتجاه). */
const ZW_CHARS = ['\u200B', '\u200C', '\u200D'];

/** بذرة شبه عشوائية ثابتة من سلسلة (mulberry32). */
function seededRandom(seedStr: string): () => number {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

/**
 * يزرع محارف صفرية العرض داخل نص عربي/لاتيني بمعدل ~1 لكل 9-14 حرفاً.
 * النص الخام (ليس HTML) — يُستخدم قبل التحويل إلى HTML.
 */
export function watermarkText(text: string, seed: string): string {
  if (!text || text.length < 24) return text;
  const rand = seededRandom(seed);
  let out = '';
  let sinceLast = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    out += ch;
    if (ch === ' ' || ch === '\n') { sinceLast = 0; continue; }
    sinceLast++;
    // زرع داخل الكلمات فقط (ليس في المسافات) وبكثافة منخفضة
    if (sinceLast > 2 && rand() < 0.09) {
      out += ZW_CHARS[Math.floor(rand() * ZW_CHARS.length)];
      sinceLast = 0;
    }
  }
  return out;
}

/** إشعار الحقوق المُلحق بنهاية كل فصل (مرئي بلطف، غير قابل للحذف بالنسخ). */
export function copyrightNoticeHtml(novelTitle: string): string {
  return (
    `<div class="moon-copyright-notice" style="user-select:none;-webkit-user-select:none;margin-top:2.2em;padding:14px 16px;` +
    `border:1px dashed rgba(255,255,255,.22);border-radius:12px;font-size:.86em;line-height:1.9;opacity:.85;">` +
    `🛡️ <strong>تنبيه حقوق النشر:</strong> هذا الفصل جزء من رواية «${novelTitle}» على موقع قمر الروايات. ` +
    `نسخ المحتوى أو إعادة نشره — آلياً أو يدوياً — <strong>ممنوع ومُتتبَّع</strong>، ` +
    `وكل نصوص الفصول تحمل علامة مائية فريدة تكشف مصدر أي نسخة مسروقة. ` +
    `السكرابينغ يعرّض عنوان IP للحظر الدائم.</div>`
  );
}

/**
 * معالجة محتوى الفصل: العلامة المائية الصفرية على المقاطع النصية فقط.
 * (إشعار الحقوق يُلحق في مرحلة بناء HTML النهائي — copyrightNoticeHtml)
 */
export function protectChapterContent(content: string, novelTitle: string, novelId: string, chapterNumber: string | number, userId?: string): string {
  if (!content) return content;
  const seed = `${novelId}:${chapterNumber}:${userId || 'guest'}`;
  // نزرع العلامة المائية في المقاطع النصية فقط (بين > و <) حتى لا نُتلف الوسوم
  const parts = content.split(/(<[^>]+>)/g);
  const protectedParts = parts.map((part) => {
    if (part.startsWith('<')) return part; // وسم — نتركه
    return watermarkText(part, seed + part.length);
  });
  return protectedParts.join('');
}
