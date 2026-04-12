self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  const isStaticAsset =
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/assets/') ||
      /\.(?:js|css|png|jpg|jpeg|svg|ico|webp|woff2?)$/i.test(url.pathname));

  if (!isStaticAsset) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.match(request).then(response => {
      return response || fetch(request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open('schistoguard-static-v2').then(cache => cache.put(request, responseToCache));
        }
        return networkResponse;
      });
    })
  );
});
