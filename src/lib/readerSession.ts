/**
 * 🛡️ جلسة القراءة — مستوحاة من نظام «reader-session» في قراءة مجرة الروايات:
 *
 *   المتصفح الحقيقي يشغّل JS ويستطيع الحصول على «تذكرة جلسة» موقّعة قصيرة
 *   العمر (10 دقائق، تُجدد تلقائياً) تُرفق مع طلبات الفصول. السكرابر الخام
 *   الذي يضرب مسارات الفصول مباشرة بتكرار جماعي وبلا تذكرة يصبح إشارة
 *   مخاطرة واضحة على الخادم (يضيّق ميزانيته قبل التهدئة).
 *
 *   مهم ومقصود: التذكرة **إشارة وليست قفل** — التطبيق والعملاء المشروعون
 *   بدونها لن ينكسروا أبداً (الخادم يعامل غيابها كمؤشر مخاطرة فقط)، بينما
 *   المسارات المشروعة (التنزيل دون اتصال) لها ميزانياتها المستقلة كما هي.
 *
 *   إضافة مجرّبة من فكرة `wor_reader_js=1`: وجود التذكرة أصلاً يثبت أن
 *   الصفحة تعمل بJS حقيقي — لا حاجة لكوكي منفصل.
 */

const SESSION_KEY = 'moon_reader_session';
const TTL_MS = 9 * 60 * 1000; // نجدد قبل انتهاء صلاحية الخادم (10د)
/** نقطة الإصدار على خادم API الفعلي (وليس مجال الموقع) */
const SESSION_URL = `${(import.meta as any).env?.VITE_API_URL || ''}/api/security/reader-session`;
let inflight: Promise<string | null> | null = null;

interface SessionCache {
  token: string;
  until: number;
}

function readCache(): SessionCache | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    return v?.token && typeof v.until === 'number' && Date.now() < v.until ? v : null;
  } catch {
    return null;
  }
}

function writeCache(token: string): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token, until: Date.now() + TTL_MS }));
  } catch { /* ignore */ }
}

/** يضمن وجود تذكرة صالحة — يعيد التذكرة أو null عند تعذر (لا يرمي أبداً). */
export async function ensureReaderSession(): Promise<string | null> {
  const cached = readCache();
  if (cached) return cached.token;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await fetch(SESSION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data?.token) {
        writeCache(data.token);
        return data.token as string;
      }
      return null;
    } catch {
      return null;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/** رأس جلسة القراءة (يُستخدم في http.ts لمسارات الفصول). */
export async function readerSessionHeader(): Promise<Record<string, string>> {
  // إطلاق غير حاجب: لا نؤخر الطلب — إن لم توجد تذكرة بعد فالمرة القادمة تحملها
  const token = readCache()?.token || (await ensureReaderSession());
  return token ? { 'X-Reader-Session': token } : {};
}

/** نسخة متزامنة للرأس إن وُجدت تذكرة جاهزة فقط (لا شبكة). */
export function readerSessionHeaderSync(): Record<string, string> {
  const cached = readCache();
  return cached ? { 'X-Reader-Session': cached.token } : {};
}
