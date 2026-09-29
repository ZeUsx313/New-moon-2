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

const VERSION = 'v2';
const SHELL_CACHE = `moon-shell-${VERSION}`;
const ASSET_CACHE = `moon-assets-${VERSION}`;
const STATIC_CACHE = `moon-static-${VERSION}`;

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
          .filter((n) => n.startsWith('moon-') && ![SHELL_CACHE, ASSET_CACHE, STATIC_CACHE].includes(n))
          .map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never touch API/auth traffic
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return;
  // Only handle same-origin requests
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
