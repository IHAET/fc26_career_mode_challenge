/*
 * Makes the app installable and work offline, and shows notifications
 * (reminders, community activity) on phones, which need a service worker.
 *
 * The site's own files are fetched from the network first, so updates show up
 * straight away, and kept in a cache for when there's no connection. Other
 * sites (fonts, Firebase, YouTube, Spotify) are left alone.
 */
const CACHE = 'fc26-app-v1';

// On install, keep the page and every file it links to.
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await fetch('./', { cache: 'no-cache' });
      const html = await res.clone().text();
      await cache.put('./', res);
      const files = Array.from(html.matchAll(/(?:src|href)="(?!https?:|data:|#|mailto:)([^"]+)"/g), (m) => m[1])
        .filter((f) => !/\.html$/.test(f) || f === 'index.html')
        .concat(['manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png']);
      await Promise.all(Array.from(new Set(files)).map((f) => cache.add(f).catch(() => null)));
    } catch (e) { /* offline during install: the next visit fills the cache */ }
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('fc26-app-') && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.includes('/feeds/')) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await fetch(req);
      if (res.ok && res.type === 'basic') cache.put(req.mode === 'navigate' ? './' : req, res.clone());
      return res;
    } catch (e) {
      const hit = await cache.match(req.mode === 'navigate' ? './' : req, { ignoreSearch: req.mode === 'navigate' });
      if (hit) return hit;
      throw e;
    }
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const open = list.find((c) => 'focus' in c);
    if (open) return open.focus().then((c) => (c && 'navigate' in c ? c.navigate(url).catch(() => c) : c));
    return self.clients.openWindow(url);
  }));
});
