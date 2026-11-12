const CACHE_NAME = 'objectif-materiaux-v3';
// Polices, illustrations et avatars sont dans l'app : tout marche hors ligne dès la 1re visite
const ILLUS = ['test_tube_3d', 'yarn_3d', 'scroll_3d', 'safety_vest_3d', 'gear_3d', 'books_3d',
  'hammer_and_wrench_3d', 'check_mark_button_3d', 'cross_mark_3d', 'trophy_3d', 'glowing_star_3d',
  'gem_stone_3d', 'hourglass_not_done_3d', '1st_place_medal_3d', '2nd_place_medal_3d', '3rd_place_medal_3d',
  'waving_hand_3d_default', 'bullseye_3d', 'pencil_3d', 'card_index_dividers_3d', 'light_bulb_3d',
  'rocket_3d', 'mobile_phone_3d', 'fire_3d', 'graduation_cap_3d', 'game_die_3d'];
const ASSETS = [
  './',
  './index.html',
  './questions.js',
  './avatars.js',
  './script.js',
  './style.css',
  './manifest.json',
  './logo.png',
  './polices/fredoka.woff2',
  './polices/fredoka-ext.woff2',
  './polices/atkinson-400.woff2',
  './polices/atkinson-400-ext.woff2',
  './polices/atkinson-700.woff2',
  './polices/atkinson-700-ext.woff2',
  './polices/atkinson-400-italique.woff2',
  './polices/atkinson-400-italique-ext.woff2',
  ...ILLUS.map((nom) => './illus/' + nom + '.png')
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
