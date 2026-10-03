import React from 'react';
import { Link } from 'react-router-dom';
import { SITE_NAME } from '../lib/site';

/**
 * الفوتر — تصميم أنيق نظيف بروح الموقع (رمادي/أسود/أبيض + لمسة قمر):
 *   - يظهر فقط في الصفحات المختارة (الرئيسية + الصفحات الثابتة + غير الموجود)
 *     وليس في كل صفحات الموقع — وفق طلب المستخدم «ليس ثابتاً ودائماً ظاهراً».
 *   - لا يحتوي أي تحذيرات نسخ — حُذفت كلها.
 *
 * يتضمن فخ السكرابر (Honeypot) — رابط مخفي تماماً عن البشر
 * (aria-hidden + tabindex=-1 + صفر الحجم) لكن روبوتات السحب
 * التي تستخرج كل الروابط وتزورها تُحظر عناوين IP لها فوراً على الخادم.
 */

const LINKS = [
  { to: '/', label: 'الرئيسية' },
  { to: '/library', label: 'المكتبة' },
  { to: '/about', label: 'من نحن' },
  { to: '/privacy', label: 'سياسة الخصوصية' },
  { to: '/terms', label: 'شروط الاستخدام' },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto relative overflow-hidden">
      {/* خط علوي ناعم متلاشٍ بدل الحد الصلب */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-white/15 to-transparent" aria-hidden="true" />

      <div className="max-w-6xl mx-auto px-4 pt-10 pb-8">
        <div className="flex flex-col items-center gap-7">
          {/* العلامة */}
          <div className="text-center">
            <p className="text-white font-extrabold text-lg flex items-center justify-center gap-2 tracking-tight">
              <span aria-hidden="true" className="text-white/60">🌙</span>
              {SITE_NAME}
            </p>
            <p className="text-white/35 text-xs mt-2">منصة قراءة الروايات العربية والعالمية المترجمة</p>
          </div>

          {/* الروابط — كبسولات ناعمة */}
          <nav aria-label="روابط الموقع" className="flex flex-wrap items-center justify-center gap-1.5">
            {LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="px-4 py-2 rounded-full text-[13px] text-white/55 hover:text-white hover:bg-white/[0.07] transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* فاصل متلاشٍ + حقوق النشر */}
          <div className="w-full h-px bg-gradient-to-l from-transparent via-white/10 to-transparent" aria-hidden="true" />
          <p className="text-white/30 text-xs text-center">
            © {year} {SITE_NAME} — جميع الحقوق محفوظة
          </p>
        </div>
      </div>

      {/* 🕳️ فخ السكرابرز — غير مرئي للبشر إطلاقاً */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', height: 0, overflow: 'hidden', opacity: 0 }}>
        <a href="/api/security/honeypot" tabIndex={-1} rel="nofollow noindex">sitemap-full</a>
      </div>
    </footer>
  );
}
