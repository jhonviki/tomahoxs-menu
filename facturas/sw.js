// sw.js
const CACHE = 'tomahoxs-v2';
const STATIC = [
  '/', '/index.html', '/css/main.css',
  '/js/config.js', '/js/engine.js', '/js/api.js',
  '/js/router.js', '/js/app.js',
  '/js/screens/dashboard.js', '/js/screens/scan.js',
  '/js/screens/historial.js', '/js/screens/recetas.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)));
});

self.addEventListener('fetch', e => {
  // No cachear llamadas a Apps Script ni Gemini
  if (e.request.url.includes('script.google') || e.request.url.includes('generativelanguage')) return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
