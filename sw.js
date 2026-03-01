const CACHE_NAME = 'objectif-materiaux-v1';
const ASSETS = [
  './',
  './index.html',
  './script.js',
  './style.css',
  './manifest.json',
  './logo.png'
];

// Installation du Service Worker
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Gestion des requêtes pour le mode hors-ligne
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});
