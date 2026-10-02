// Service worker : permet d'ouvrir l'app sans connexion (îles, coupures).
// Changez VERSION à chaque mise en ligne pour forcer la mise à jour.
const VERSION = 'taote-v3';
const COQUILLE = [
  './', 'index.html', 'pro.html', 'manifest.webmanifest',
  'assets/css/app.css',
  'assets/js/app.js', 'assets/js/pro.js', 'assets/js/api.js', 'assets/js/ui.js',
  'assets/js/i18n.js', 'assets/js/config.js',
  'assets/fonts/dm-sans-latin-400-normal.woff2', 'assets/fonts/dm-sans-latin-500-normal.woff2',
  'assets/fonts/dm-sans-latin-700-normal.woff2', 'assets/fonts/bricolage-grotesque-latin-700-normal.woff2',
  'icons/icon.svg', 'icons/icon-192.png', 'data/demo.json',
  'assets/img/entete-nono.svg', 'assets/img/entete-fougere.svg', 'assets/img/fond-gauche.svg', 'assets/img/fond-droite.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(COQUILLE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((cles) => Promise.all(cles.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Fichiers de l'app : réseau d'abord (toujours la dernière version), cache si hors ligne.
// Les données (Supabase, autre domaine) ne passent pas par ici : l'app garde sa propre copie.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then((rep) => {
        if (rep.ok) { const copie = rep.clone(); caches.open(VERSION).then((c) => c.put(req, copie)); }
        return rep;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('index.html'))),
  );
});
