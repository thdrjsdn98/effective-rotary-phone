const CACHE_NAME = 'electric-machinery-cache-v3';
const FILES_TO_CACHE = [
  './', './index.html', './style.css', './script.js', './questions.js',
  './manifest.json', './icon-192.png', './icon-512.png'
];

self.addEventListener('install', function(event) {
  event.waitUntil(caches.open(CACHE_NAME).then(function(cache) { return cache.addAll(FILES_TO_CACHE); }));
  self.skipWaiting();
});
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(key) { return key !== CACHE_NAME; }).map(function(key) { return caches.delete(key); }));
    })
  );
  self.clients.claim();
});
self.addEventListener('fetch', function(event) {
  event.respondWith(
    fetch(event.request).then(function(response) {
      if (response && response.status === 200 && event.request.method === 'GET') {
        var responseClone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, responseClone); });
      }
      return response;
    }).catch(function() { return caches.match(event.request); })
  );
});
