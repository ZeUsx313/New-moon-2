/**
 * Service Worker — قمر الروايات
 *
 * Strategy:
 * - App shell (navigation requests): network-first with cache fallback,
 *   so users always get the newest build when online and still get the
 *   app when offline.
 * - Hashed build assets (/assets/…): cache-first (immutable filenames).
 * - Static public files (icons, manifest, fonts): stale-while-revalidate.
 * - API calls (/api, /auth): NEVER cached — always live.
 */

const VERSION = 'v4';
const SHELL_CACHE = `moon-shell-${VERSION}`;
const ASSET_CACHE = `moon-assets-${VERSION}`;
const STATIC_CACHE = `moon-static-${VERSION}`;
const IMAGE_CACHE = `moon-images-${VERSION}`;

/** حد أقصى لصور الغلافات المخزّنة (يُقلَّم الأقدم أولاً) */
const IMAGE_CACHE_MAX = 400;

// These are stale-while-revalidated (best-effort, never blocking)
const STATIC_FILES = ['/manifest.json', '/icon.png', '/robots.txt'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      // Precache minimal shell — failures here must not break install
      try {
        const shell = await caches.open(SHELL_CACHE);
        await shell.addAll(['/', '/index.html']).catch(() => {});
      } catch (e) { /* ignore */ }
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Remove old-version caches
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => n.startsWith('moon-') && ![SHELL_CACHE, ASSET_CACHE, STATIC_CACHE, IMAGE_CACHE].includes(n))
          .map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

/**
 * تخزين صور الغلافات في المتصفح — cache-first.
 * بمجرد تحميل صورة مرة تبقى محفوظة (حتى عبر الجلسات) ولا تُطلب من الخادم
 * مرة أخرى، وتعمل حتى دون اتصال. تدعم الصور من مصادر خارجية
 * (Firebase/Cloudinary…) عبر opaque responses مع تقليم تلقائي.
 */
async function handleImageRequest(req, url) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(req, { ignoreVary: true });
  if (cached) return cached;
  try {
    const res = await fetch(req);
    // نقبل الاستجابات الناجحة و opaque (status 0 للمصادر الخارجية)
    if (res.ok || res.type === 'opaque') {
      await cache.put(req, res.clone());
      // تقليم: أبقِ الحجم تحت الحد الأقصى
      const keys = await cache.keys();
      if (keys.length > IMAGE_CACHE_MAX) {
        const excess = keys.length - IMAGE_CACHE_MAX;
        // keys مرتبة بترتيب الإدراج — نحذف الأقدم
        await Promise.all(keys.slice(0, excess).map((k) => cache.delete(k)));
      }
    }
    return res;
  } catch {
    return cached || Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never touch API/auth traffic
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return;

  // 🖼️ صور (غلافات الروايات والبنرات، من موقعنا أو من مصادر خارجية):
  // cache-first — تحمّل مرة واحدة وتُحفظ لدى متصفح المستخدم.
  const isImageReq =
    req.destination === 'image' ||
    /\.(png|jpe?g|webp|gif|avif|svg)(\?|$)/i.test(url.pathname) ||
    (url.origin !== self.location.origin && /firebasestorage\.googleapis\.com|lh3\.googleusercontent\.com|cloudinary\.com|imgur\.com/i.test(url.hostname));
  if (isImageReq && /^https?:$/.test(url.protocol)) {
    event.respondWith(handleImageRequest(req, url));
    return;
  }

  // Only handle same-origin requests beyond images
  if (url.origin !== self.location.origin) return;

  // Hashed build assets → cache-first (they're content-hashed, immutable)
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(ASSET_CACHE).then((c) => c.put(req, copy));
            return res;
          })
      )
    );
    return;
  }

  // Navigation (SPA shell) → network-first, fall back to cache when offline
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          const cache = await caches.open(SHELL_CACHE);
          cache.put('/index.html', res.clone());
          return res;
        } catch {
          const cache = await caches.open(SHELL_CACHE);
          return (
            (await cache.match(req)) ||
            (await cache.match('/index.html')) ||
            (await cache.match('/')) ||
            new Response('<h1 dir="rtl" style="font-family:sans-serif">أنت غير متصل بالإنترنت</h1>', {
              headers: { 'Content-Type': 'text/html; charset=utf-8' },
            })
          );
        }
      })()
    );
    return;
  }

  // Other static files → stale-while-revalidate
  event.respondWith(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      const cached = await cache.match(req);
      const network = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => null);
      return cached || (await network) || Response.error();
    })()
  );
});
