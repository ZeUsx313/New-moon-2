/**
 * 🛡️ رصد نمط القراءة الآلي — مستوحى من نظام «reading challenge» في
 * قراءة مجرة الروايات (wor_reader_risk_state_v2) ومُعاد بناؤه ليناسب موقعنا:
 *
 * الفكرة (بدون أي لمس للنص!):
 *   - نتابع فتح الفصول: كم فصلاً تتابعياً فتحه المستخدم وكم قضى في كل واحد؟
 *   - القارئ البشري يبقى في الفصل دقائق (وقت قراءة حقيقي + تمرير).
 *   - السكرابر/المُنسخ الآلي يفتح الفصول وراء بعضها بثوانٍ.
 *   - عند رصد 8 فصول متتالية ببقاء أقل من 120 ثانية لكل منها:
 *       1) نبلّغ الخادم بصمت (sendBeacon) ليضيّق ميزانية السرعة لهذا العنوان
 *       2) نطلب بوابة تحقق بشرية قبل الفصل التالي (بوابة الكابتشا الموجودة)
 *   - بعد نجاح التحقق تُمسح الحالة وتعود القراءة طبيعية.
 *
 * صادق ومتسامح: التمرير داخل الفصل والتفاعل يُحسبان «قراءة»، وحد الـ120
 * ثانية هو أكثر من ضعف زمن قراءة أي فصل قصير فعلياً — لن يراه قارئ بشري.
 */

const RISK_KEY = 'moon_reader_risk_state_v1';

/** بلاغ المخاطرة يذهب لخادم API فعلياً (وليس مجال الموقع) — كما تفعل بقية الخدمات */
const FLAG_URL = `${(import.meta as any).env?.VITE_API_URL || ''}/api/security/reader-flag`;

export interface RiskEvent {
  /** معرف الفصل */
  id: string;
  /** مدة البقاء الكلية بالثواني */
  dwell: number;
  /** هل حدث تمرير/تفاعل حقيقي داخل الفصل؟ */
  engaged: boolean;
  t: number;
}

interface RiskState {
  events: RiskEvent[];
  /** هل طلبنا البوابة ولم تُحل بعد؟ */
  challengeRequired?: boolean;
  /** آخر وقت أرسلنا فيه بلاغاً للخادم (تجنب الإغراق) */
  lastFlagAt?: number;
}

/** كم فصلاً متتالياً نفحص */
const MIN_SEQUENCE = 8;
/** أقل من هذه المدة بالثواني يُعد «بقاء قصيراً» */
const SHORT_DWELL_S = 120;

function readState(): RiskState {
  try {
    const v = JSON.parse(localStorage.getItem(RISK_KEY) || '{}');
    if (!v || typeof v !== 'object') return { events: [] };
    if (!Array.isArray(v.events)) v.events = [];
    return v as RiskState;
  } catch {
    return { events: [] };
  }
}

function writeState(s: RiskState): void {
  try {
    localStorage.setItem(RISK_KEY, JSON.stringify(s));
  } catch { /* ignore */ }
}

/** يُستدعى عند فتح/عرض فصل — يُغلق حدث الفصل السابق بحساب مدة بقائه. */
export function noteChapterOpen(chapterId: string | number): void {
  const state = readState();
  const now = Date.now();
  const id = String(chapterId);
  const last = state.events[state.events.length - 1];

  if (last && last.id === id) {
    // نفس الفصل (إعادة عرض) — حدّث لا تُكرر
    return;
  }
  if (last) {
    last.dwell = Math.max(0.05, Math.round(((now - last.t) / 1000) * 10) / 10);
  }

  state.events.push({ id, dwell: 0, engaged: false, t: now });
  state.events = state.events.slice(-30);
  writeState(state);
}

/** علامة تفاعل بشري (تمرير عميق داخل نص الفصل مثلاً). */
export function noteReaderEngagement(chapterId: string | number): void {
  const state = readState();
  const last = state.events[state.events.length - 1];
  if (last && last.id === String(chapterId) && !last.engaged) {
    last.engaged = true;
    writeState(state);
  }
}

/**
 * هل يجب بوابة تحقق قبل فتح الفصل التالي؟
 * يقيّم آخر MIN_SEQUENCE فصل *مُغلق* (الحالي مفتوح ولم تكتمل مدته بعد):
 * لو كلها بقاء قصير بلا تفاعل → نمط آلي واضح.
 */
export function shouldChallengeBeforeNext(): boolean {
  const state = readState();
  if (state.challengeRequired) return true;
  // استثنِ الفصل المفتوح حالياً — dwell=0 لأنه لم يُغلق بعد
  const closed = state.events.slice(0, -1);
  const recent = closed.slice(-MIN_SEQUENCE);
  if (recent.length < MIN_SEQUENCE) return false;
  const allShort = recent.every((e) => e.dwell > 0 && e.dwell < SHORT_DWELL_S && !e.engaged);
  if (allShort) {
    state.challengeRequired = true;
    flagServer(state);
    writeState(state);
  }
  return !!state.challengeRequired;
}

/** بلاغ صامت للخادم — يضيّق ميزانية السرعة لهذا العنوان (بدون حظر).
 * يُرسل كطلب بسيط (text/plain) بلا preflight ليتجاوز أي قيود CORS
 * ويصل دائماً — الخادم يفك JSON من أي content-type. */
function flagServer(state: RiskState): void {
  const now = Date.now();
  if (state.lastFlagAt && now - state.lastFlagAt < 10 * 60_000) return;
  state.lastFlagAt = now;
  const body = JSON.stringify({
    score: 120,
    reasons: ['rapid_sequence', 'short_dwell'],
    metrics: { sequence: MIN_SEQUENCE, shortDwell: SHORT_DWELL_S },
  });
  try {
    // sendBeacon بأبسط صيغة ممكنة (text/plain = طلب بسيط بلا preflight)
    if (navigator.sendBeacon) {
      const delivered = navigator.sendBeacon(
        FLAG_URL,
        new Blob([body], { type: 'text/plain' })
      );
      if (delivered) return;
    }
  } catch { /* fallthrough */ }
  try {
    fetch(FLAG_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body,
      keepalive: true,
    }).catch(() => { /* تجاهل — الإشارة استشارية */ });
  } catch { /* تجاهل */ }
}

/** بعد نجاح التحقق البشري — مسح كامل والحياة تعود طبيعية. */
export function markChallengeSolved(): void {
  try {
    localStorage.removeItem(RISK_KEY);
  } catch { /* ignore */ }
}

/** فحص داخلي للتصحيح/العرض في لوحة الأمان (اختياري). */
export function riskSnapshot(): { sequence: number; challenge: boolean } {
  const s = readState();
  return { sequence: s.events.length, challenge: !!s.challengeRequired };
}
