import React, { useState } from 'react';
import { normalizeCoverUrl as normalizeCoverUrlLocal } from '../lib/coverFallback';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  /** Placeholder shown while loading and on failure */
  fallbackClassName?: string;
  eager?: boolean;
}

const FALLBACK_ICON =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="m9 10 2 2 4-4"/></svg>`
  );

/**
 * Image with lazy loading, a shimmer placeholder, and a graceful fallback
 * when the remote cover fails to load (broken covers never look "broken").
 *
 * 🔥 إصلاح أغلفة wfxs.tw: عند فشل التحميل تُجرَّب نسخة بروكسي الخادم
 * (/api/image-proxy — بدون Referer) مرة واحدة عبر حالة React نظيفة
 * قبل إظهار البديل. الصورة موسومة data-safe-image ليقفز عنها
 * مستمع الـ fallback العام (لا تداخل معالجات).
 */
export default function SafeImage({
  src,
  alt,
  className = '',
  fallbackClassName = '',
  eager = false,
  ...rest
}: SafeImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [triedProxy, setTriedProxy] = useState(false);

  const showFallback = failed || !src;

  /** الرابط المعروض فعلياً: الأصلي، ثم نسخة البروكسي عند أول فشل */
  const proxied = normalizeCoverUrlLocal(src);
  const displaySrc = triedProxy && proxied ? proxied : src;

  const handleError = () => {
    if (proxied && proxied !== src && !triedProxy) {
      setTriedProxy(true);
      return;
    }
    setFailed(true);
  };

  return (
    <span className={`relative block overflow-hidden ${className}`} aria-busy={!loaded && !showFallback}>
      {!showFallback && (
        <img
          src={displaySrc}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          draggable={false}
          data-safe-image="1"
          onLoad={() => setLoaded(true)}
          onError={handleError}
          className={`w-full h-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          {...rest}
        />
      )}
      {(showFallback || !loaded) && (
        <span
          className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-white/5 via-white/10 to-white/5 ${fallbackClassName}`}
        >
          {showFallback ? (
            <img src={FALLBACK_ICON} alt="" className="w-1/3 h-1/3 opacity-60" draggable={false} />
          ) : (
            <span className="block w-6 h-6 border-2 border-white/20 border-t-white/50 rounded-full animate-spin" />
          )}
        </span>
      )}
    </span>
  );
}
