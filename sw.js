/* SEN Ballistics service worker.
   RELEASE CHECKLIST (every version): bump CACHE below AND update APP_FILE to the new
   versioned filename, in the same commit as the new HTML. Versioned filenames mean the
   SW cache list is release-coupled — forgetting this pins offline users to the old build. */
const CACHE = 'sen-ballistics-v1.12.0';
const APP_FILE = './RTI-SEN-Ballistic-Calculator-V1.12.0.html';
const PRECACHE = [
  APP_FILE,
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Strategy:
   - App shell + icons: cache-first (instant offline load).
   - Google Fonts (css + woff2): stale-while-revalidate into the same cache — fonts render
     offline after first online load.
   - Everything else: network-first, falling back to cache. */
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      }))
    );
    return;
  }

  if (url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
    e.respondWith(
      caches.match(e.request).then(hit => {
        const net = fetch(e.request).then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    );
  }
});
