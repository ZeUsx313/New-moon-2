/**
 * 🛡️ بوابة التحقق البشري (Cloudflare Turnstile).
 *
 * عندما يلاحظ الخادم سرعة غير طبيعية في فتح الفصول يرد 429 { captchaRequired }
 * — http.ts يُطلق حدث captcha-required وهذه البوابة تظهر فوراً:
 *   - إن ضُبطت مفاتيح Turnstile (VITE_TURNSTILE_SITE_KEY) تظهر الويدجت الرسمية
 *   - وإلا تظهر عدّاد انتظار بسيط (تهدئة) ثم يُسمح بالمتابعة
 * النجاح → POST /api/security/captcha → رمز مرور مؤقت يُخزّن ويُرسل مع الطلبات.
 */
import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ShieldCheck } from 'lucide-react';

import { storeCaptchaPass } from '../lib/captchaPass';
import { API_BASE_URL } from '../services/api';

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: any) => string;
      reset: (id?: string) => void;
    };
  }
}

const SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) || '';

let scriptLoaded = false;
function loadTurnstileScript(onReady: () => void): void {
  if (scriptLoaded && window.turnstile) { onReady(); return; }
  if (!document.querySelector('script[src*="challenges.cloudflare.com"]')) {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.onload = () => { scriptLoaded = true; onReady(); };
    document.head.appendChild(s);
  } else {
    const wait = setInterval(() => {
      if (window.turnstile) { clearInterval(wait); scriptLoaded = true; onReady(); }
    }, 200);
    setTimeout(() => clearInterval(wait), 8000);
  }
}

export default function CaptchaGate(): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [solved, setSolved] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const onRequired = () => {
      setSolved(false);
      setOpen(true);
      // إن لم توجد مفاتيح كابتشا — عدّاد تهدئة 45 ثانية
      if (!SITE_KEY) {
        setCooldown(45);
        if (cooldownTimer.current) clearInterval(cooldownTimer.current);
        cooldownTimer.current = setInterval(() => {
          setCooldown((c) => {
            if (c <= 1) {
              if (cooldownTimer.current) clearInterval(cooldownTimer.current);
              return 0;
            }
            return c - 1;
          });
        }, 1000);
      }
    };
    window.addEventListener('captcha-required', onRequired);
    return () => {
      window.removeEventListener('captcha-required', onRequired);
      if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    };
  }, []);

  // تحميل الويدجت عند الفتح
  useEffect(() => {
    if (!open || !SITE_KEY || solved) return;
    loadTurnstileScript(() => {
      if (!window.turnstile || !widgetRef.current || widgetIdRef.current) return;
      widgetIdRef.current = window.turnstile.render(widgetRef.current, {
        sitekey: SITE_KEY,
        theme: 'dark',
        language: 'ar',
        callback: async (token: string) => {
          try {
            const res = await fetch(`${API_BASE_URL}/api/security/captcha`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token }),
            });
            const data = await res.json();
            if (data?.pass) {
              storeCaptchaPass(data.pass);
              setSolved(true);
            } else {
              window.turnstile?.reset(widgetIdRef.current || undefined);
            }
          } catch {
            window.turnstile?.reset(widgetIdRef.current || undefined);
          }
        },
      });
    });
  }, [open, solved]);

  const close = (announceSolved = false) => {
    setOpen(false);
    setSolved(false);
    widgetIdRef.current = null;
    if (announceSolved) {
      // مسار التهدئة (بلا Turnstile): إنهاء العدّاد بنجاح = تأكيد بشري كافٍ
      try { window.dispatchEvent(new CustomEvent('captcha-solved')); } catch { /* ignore */ }
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 12 }}
            className="bg-[#111] border border-white/15 rounded-2xl max-w-md w-full p-6 text-center"
          >
            <ShieldCheck size={36} className="mx-auto text-white/80 mb-3" />
            {solved ? (
              <>
                <h2 className="text-white font-bold text-lg mb-1">تم التحقق بنجاح ✓</h2>
                <p className="text-white/50 text-sm mb-4">أعد المحاولة الآن وسيعمل كل شيء — صلاحية المرور 15 دقيقة.</p>
                <button onClick={close} className="bg-primary text-primary-foreground font-bold rounded-xl px-6 py-2.5">متابعة</button>
              </>
            ) : SITE_KEY ? (
              <>
                <h2 className="text-white font-bold text-lg mb-1">تحقق أمني سريع</h2>
                <p className="text-white/50 text-sm mb-4">لاحظنا نشاطاً غير معتاد من جهازك — أكّد أنك إنسان للمتابعة.</p>
                <div ref={widgetRef} className="flex justify-center min-h-[70px]" />
              </>
            ) : (
              <>
                <h2 className="text-white font-bold text-lg mb-1">استراحة قصيرة</h2>
                <p className="text-white/50 text-sm mb-4">
                  فتحت الفصول بسرعة أعلى من المعتاد — انتظر قليلاً لحماية الموقع من النسخ الآلي.
                </p>
                <p className="text-white text-3xl font-extrabold mb-4">{cooldown}</p>
                <button onClick={() => close(true)} disabled={cooldown > 0} className="bg-white/10 disabled:opacity-40 text-white font-bold rounded-xl px-6 py-2.5">
                  {cooldown > 0 ? 'انتظر...' : 'فهمت'}
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
