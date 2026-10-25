const CACHE_NAME = 'objectif-materiaux-v2';
const ASSETS = [
  './',
  './index.html',
  './questions.js',
  './script.js',
  './style.css',
  './manifest.json',
  './logo.png'
];

// Installation du Service Worker
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// On supprime les anciens caches (v1...)
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((noms) => Promise.all(noms.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// Réseau d'abord (pour recevoir les nouveaux cours), cache si pas de connexion.
// cache: 'no-cache' = toujours demander à GitHub si le fichier a changé
// (sinon le navigateur garde l'ancienne version jusqu'à 10 minutes).
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then((response) => {
        const copie = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, copie));
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});
