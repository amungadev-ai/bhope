const CACHE = 'bhope-studio-shell-v1';
const SHELL = [
  '/console/offline.html',
  '/console/offline.css',
  '/console/manifest.webmanifest',
  '/console/icon-192.png',
  '/console/icon-512.png',
];
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
    !url.pathname.startsWith('/console/')
  )
    return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/console/offline.html')));
  } else if (url.pathname.startsWith('/console/assets/') || SHELL.includes(url.pathname)) {
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
