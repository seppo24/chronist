// Service Worker: macht die App installierbar und offline startfähig.
// Strategie: Netzwerk zuerst (damit Updates sofort ankommen), bei Offline aus dem Cache.
// Bei jedem Update CACHE_VERSION passend zu js/version.js anheben.
const CACHE_VERSION = '0.3.0';
const CACHE = `chronist-${CACHE_VERSION}`;

const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'js/app.js', 'js/version.js', 'js/util.js', 'js/md.js', 'js/store.js', 'js/claude.js',
  'js/dropbox.js', 'js/sync.js', 'js/dice.js', 'js/adventure.js', 'js/chat.js', 'js/export.js',
  'js/views/home.js', 'js/views/workshop.js', 'js/views/session.js', 'js/views/collection.js',
  'js/views/settings.js', 'js/views/help.js', 'js/views/flowedit.js', 'js/views/flowplay.js', 'js/views/reqs.js',
  'js/flow.js', 'js/images.js',
  'ADMIN-ANLEITUNG.md', 'TESTCHECKLISTE.md', 'CHANGELOG.md',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(SHELL.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => null))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('chronist-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // API-Aufrufe (Claude, Dropbox) nie anfassen
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('index.html'))),
  );
});
