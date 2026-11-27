const CACHE = 'bhope-studio-shell-v2';
// Every path is relative to the worker's own scope, so the same files work
// whether the studio is served at '/' (Vercel) or '/console/' (by the API).
const base = new URL(self.registration ? self.registration.scope : '/').pathname;
const SHELL = [
  'offline.html',
  'offline.css',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
].map((path) => `${base}${path}`);
self.addEventListener('install', (event) =>
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL))),
);
self.addEventListener('activate', (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('bhope-studio-shell-') && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener('message', (event) => {
  if (event.data?.type === 'ACTIVATE_UPDATE') self.skipWaiting();
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Staff data, authentication, mutations, and every /api request stay network-only.
  if (
    event.request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    !url.pathname.startsWith(base)
  )
    return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match(`${base}offline.html`)));
  } else if (url.pathname.startsWith(`${base}assets/`) || SHELL.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then(
        (saved) =>
          saved ||
          fetch(event.request).then((response) => {
            if (response.ok && response.type === 'basic')
              event.waitUntil(
                caches.open(CACHE).then((cache) => cache.put(event.request, response.clone())),
              );
            return response;
          }),
      ),
    );
  }
});
