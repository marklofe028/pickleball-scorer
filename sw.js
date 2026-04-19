const CACHE = 'pickle-score-v6';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon.svg',
  './src/styles/main.css',
  './src/app.js',
  './src/modules/scoring.js',
  './src/modules/storage.js',
  './src/modules/voice.js',
  './src/modules/utils.js',
  './src/modules/whisper-worker.js',
  './src/lib/transformers.min.js',
  './src/components/SetupScreen.js',
  './src/components/ScoreBoard.js',
  './src/components/HistoryScreen.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Cache-first for same-origin requests
  if (e.request.url.startsWith(self.location.origin)) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request))
    );
  }
});
