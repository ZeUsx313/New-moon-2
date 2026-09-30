/**
 * 🛡️ رمز مرور الكابتشا — حالة مشتركة بين http.ts وبوابة التحقق.
 * يُخزّن في sessionStorage (ينتهي مع الجلسة) مع صلاحية زمنية 15 دقيقة.
 */

export const PASS_KEY = 'moon_captcha_pass';

/** يُستدعى من http.ts عند 429 captchaRequired لفتح بوابة التحقق */
export function dispatchCaptchaRequired(): void {
  window.dispatchEvent(new CustomEvent('captcha-required'));
}

/** هل نملك رمز مرور كابتشا صالحاً؟ */
export function hasCaptchaPass(): boolean {
  try {
    const raw = sessionStorage.getItem(PASS_KEY);
    if (!raw) return false;
    const { token, until } = JSON.parse(raw);
    return !!token && Date.now() < until;
  } catch { return false; }
}

/** رأس التفويض للكابتشا (يستخدمه http.ts مع كل الطلبات) */
export function captchaPassHeader(): Record<string, string> {
  try {
    const raw = sessionStorage.getItem(PASS_KEY);
    if (!raw) return {};
    const { token } = JSON.parse(raw);
    return token ? { 'X-Captcha-Pass': token } : {};
  } catch { return {}; }
}

/** تخزين رمز المرور بعد نجاح التحقق */
export function storeCaptchaPass(token: string, ttlMs = 15 * 60 * 1000): void {
  try {
    sessionStorage.setItem(PASS_KEY, JSON.stringify({ token, until: Date.now() + ttlMs }));
  } catch { /* ignore */ }
}
