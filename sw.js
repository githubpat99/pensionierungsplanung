/* Service Worker des Ruhestands-Checks (Produktiv-PWA).
 *
 * Zweck: Die installierte App startet über die **Verzeichnisadresse** (`./` → `index.html`), also
 * immer die aktuelle Produktivversion – nicht eine versionsgebundene Datei wie `v3.html`. Ein
 * Deployment darf bei Testern nie an einem alten HTTP-Cache hängen bleiben.
 *
 * Strategie:
 *   – HTML/Navigationen: **Netz zuerst, ohne HTTP-Cache** (`cache:'no-store'`), Fallback auf den
 *     Service-Worker-Cache (offline) – zuerst die Hülle `./index.html`, dann die Produktivversion.
 *   – Skripte, Stylesheets, Manifest (`.js`, `.css`, `.json`, `.webmanifest`): ebenfalls **Netz
 *     zuerst ohne HTTP-Cache**. Eine vergessene `?v=`-Erhöhung darf nie einen Mischzustand aus
 *     alter Engine und neuer Oberfläche erzeugen.
 *   – Bilder/Schriftarten: **stale-while-revalidate** – schnell und selbstheilend.
 *   – Nicht behandelt (reines Netz): alles unter `/tests/`, Aufrufe mit `?dev=1`, Nicht-GET,
 *     fremde Origins und Range-Requests.
 *   – `install`: Hülle vorladen (Verzeichnis, `index.html` und die in `index.html` genannte
 *     Produktivversion) und `skipWaiting()`.
 *   – `activate`: **alle** anderen Caches löschen – auch alte V2/V3-Caches früherer Stände –
 *     und `clients.claim()`.
 *
 * Nutzerdaten werden nicht angefasst: der Plan liegt in `localStorage` und gehört der App.
 */
const CACHE = 'ruhestands-check-prod-1';
const CODE = /\.(?:js|mjs|css|json|webmanifest|map)$/i;
const MEDIA = /\.(?:png|jpe?g|webp|avif|gif|svg|ico|woff2?|ttf|otf|mp4)$/i;

/* Die produktive Version steht **einmal** in `index.html` (`PRODUCTION_ENTRY`). Der Worker liest
   sie beim Installieren von dort, damit hier nichts doppelt gepflegt werden muss. */
async function shellUrls() {
  const urls = ['./', './index.html'];
  try {
    const response = await fetch('./index.html', {cache:'no-store'});
    const html = await response.text();
    const match = html.match(/PRODUCTION_ENTRY\s*=\s*['"]([^'"]+)['"]/);
    if (match) urls.push('./' + match[1].replace(/^\.?\//, ''));
  } catch (error) { /* ohne Netz bleibt es bei der Hülle */ }
  return [...new Set(urls)];
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const urls = await shellUrls();
    /* Einzelne Fehler dürfen die Installation nicht verhindern. */
    await Promise.all(urls.map(url => cache.add(new Request(url, {cache:'reload'})).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    /* Alles ausser dem aktuellen Cache entfernen – unabhängig vom Namen. Damit sind alte
       V2/V3-Caches, frühere Generationen und fremde Caches (z. B. Workbox) zuverlässig weg. */
    await Promise.all(names.filter(name => name !== CACHE).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

function bypass(url) {
  if (url.pathname.startsWith('/tests/')) return true;
  if (url.searchParams.has('dev')) return true;
  return false;
}

async function network(cache, request) {
  /* `no-store` umgeht den HTTP-Cache des Browsers: ein Deployment kann so nicht hängen bleiben. */
  const response = await fetch(request, {cache:'no-store'});
  if (response && response.ok && response.type === 'basic') cache.put(request, response.clone()).catch(() => {});
  return response;
}

async function cacheFirst(cache, request) {
  const cached = await cache.match(request);
  if (cached) return cached;
  return network(cache, request);
}

async function staleWhileRevalidate(cache, request) {
  const cached = await cache.match(request);
  const update = network(cache, request).catch(() => null);
  return cached ?? (await update) ?? Response.error();
}

/* Offline-Fallback: die Hülle (index.html) leitet auf die Produktivversion weiter; beide liegen
   im Vorlade-Cache. */
async function offlineShell(cache, request) {
  for (const url of ['./index.html', './', request]) {
    const cached = await cache.match(url);
    if (cached) return cached;
  }
  return Response.error();
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.headers.has('range')) return;
  if (bypass(url)) return;
  const navigation = request.mode === 'navigate';
  const code = CODE.test(url.pathname);
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      if (navigation || code) return await network(cache, request);
      if (MEDIA.test(url.pathname)) return await staleWhileRevalidate(cache, request);
      return await cacheFirst(cache, request);
    } catch (error) {
      if (navigation) return offlineShell(cache, request);
      const fallback = await cache.match(request);
      if (fallback) return fallback;
      throw error;
    }
  })());
});
