/**
 * 🛡️ حماية نصوص الفصول — فلسفة «مجرة الروايات» المعتمدة الآن:
 *
 *   النص المُعروض للقارئ مقدس — لا يُزرع فيه أي محرف خفي إطلاقاً.
 *   (المحاولات السابقة: U+200B/ZWNJ ثم U+2060 — كلها كسرت اتصال الحروف
 *   العربية عملياً في متصفحات حقيقية رغم ضمانات المواصفات النظرية.
 *   درس نهائي مؤلم: حماية تتضح للقارئ = خسارة مضاعفة).
 *
 * ما تبقى من هذه الطبقة:
 *   1) تطهير المحتوى من أي محارف صفرية قديمة/خارجية (يشفي فصول التنزيلات
 *      القديمة المخزنة في IndexedDB وأي محتوى حُرّف سابقاً) — يعاد عرضه
 *      بحروف عربية متصلة 100%.
 *   2) إشعار حقوق مرئي لطيف بنهاية كل فصل (مثل رسالة «دعمك للمصدر الأصلي»
 *      في المواقع الكبيرة — صادق ولا يتخريب القراءة).
 *
 * الحماية الفعلية ضد السحب الآلي انتقلت إلى محيط الموقع:
 *   جلسات قراءة موقّعة + رصد نمط السرعة + بوابة تحقق بشرية قبل الفصل
 *   التالي + سلّم تصعيد خادمي — انظر lib/readerRisk.ts و lib/readerSession.ts
 *   وخدمة الأمان على الخادم.
 */

/** محارف صفرية/تنسيقية تكسر العربية أو تلوث النص — تُنزع دائماً. */
const ZW_STRIP_RE = /[\u200B\u200C\u200D\u2060\uFEFF\u200E\u200F\u00AD]/g;

/** ينزع كل المحارف الخفية من نص خام (ليس HTML). */
export function sanitizeRawText(text: string): string {
  if (!text) return text;
  return text.replace(ZW_STRIP_RE, '');
}

/**
 * معالجة محتوى الفصل قبل العرض: تطهير فقط — لا زرع، لا تحريف، لا لمس.
 * نفس التوقيع السابق كي تبقى كل نقاط الاستدعاء في WorReader كما هي.
 * (user اختياري ومهمل عمداً — بقي لتوافق الاستدعاءات القديمة.)
 */
export function protectChapterContent(content: string, _novelTitle?: string, _novelId?: string, _chapterNumber?: string | number, _userId?: string): string {
  if (!content) return content;
  // نظّف المقاطع النصية فقط بين الوسوم — الوسوم نفسها لا تُلمس
  const parts = content.split(/(<[^>]+>)/g);
  return parts
    .map((part) => (part.startsWith('<') ? part : sanitizeRawText(part)))
    .join('');
}

/** إشعار الحقوق المُلحق بنهاية كل فصل (مرئي بلطف، صادق، لا يعطّل القراءة). */
export function copyrightNoticeHtml(novelTitle: string): string {
  return (
    `<div class="moon-copyright-notice" style="user-select:none;-webkit-user-select:none;margin-top:2.2em;padding:14px 16px;` +
    `border:1px dashed rgba(255,255,255,.22);border-radius:12px;font-size:.86em;line-height:1.9;opacity:.85;">` +
    `🛡️ <strong>تنبيه حقوق النشر:</strong> هذا الفصل من رواية «${novelTitle}» على موقع قمر الروايات. ` +
    `دعمك بالمصدر الأصلي يساعد على استمرار الترجمة والنشر — النسخ وإعادة النشر آلياً أو يدوياً ممنوع ` +
    `ويخضع للرصد الآلي وسياسات الموقع.</div>`
  );
}
