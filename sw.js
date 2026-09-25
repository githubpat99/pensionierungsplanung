/* Service Worker des Ruhestands-Checks.
 *
 * Zweck: Ein Deployment darf bei Testern **nie** an einem alten HTTP-Cache hängen bleiben und
 * niemand soll manuell Cache oder Speicher leeren müssen.
 *
 * Strategie (bewusst einfach und nachvollziehbar – **Code kommt nie aus dem Cache**):
 *   – HTML/Navigationen: **Netz zuerst, ohne HTTP-Cache** (`cache:'no-store'`), Fallback auf den
 *     Service-Worker-Cache (offline). So ist die Hülle nach jedem Deployment sofort aktuell.
 *   – Skripte, Stylesheets, Manifest, Wörterbücher (`.js`, `.css`, `.json`, `.webmanifest`):
 *     ebenfalls **Netz zuerst ohne HTTP-Cache**. Eine vergessene `?v=`-Erhöhung darf nie einen
 *     Mischzustand aus alter Engine und neuer Oberfläche erzeugen.
 *   – Bilder/Schriftarten: **stale-while-revalidate** – schnell, und heilt sich beim nächsten
 *     Aufruf selbst. Sie sind gross und ändern selten.
 *   – Nicht behandelt (reines Netz): alles unter `/tests/`, Aufrufe mit `?dev=1`, Nicht-GET,
 *     fremde Origins und Range-Requests.
 *   – `install` → `skipWaiting()`, `activate` → alte Caches löschen + `clients.claim()`.
 *     Die Seite lädt sich bei einem Kontrollwechsel einmal neu (siehe `js/v4-sw.js`).
 *
 * Es wird **nichts** an Nutzerdaten angefasst: der geplante Zustand liegt in `localStorage`
 * und wird nicht vom Service Worker verwaltet.
 */
const CACHE = 'ruhestands-check-runtime-1';
const CODE = /\.(?:js|mjs|css|json|webmanifest|map)$/i;
const MEDIA = /\.(?:png|jpe?g|webp|avif|gif|svg|ico|woff2?|ttf|otf|mp4)$/i;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
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
      /* Hülle und Code immer am Netz vorbei am HTTP-Cache – nie ein alter Mischzustand. */
      if (navigation || code) return await network(cache, request);
      if (MEDIA.test(url.pathname)) return await staleWhileRevalidate(cache, request);
      return await cacheFirst(cache, request);
    } catch (error) {
      /* Offline: die zuletzt bekannte Hülle ausliefern, sonst den Fehler durchreichen. */
      const fallback = await cache.match(navigation ? '/v4.html' : request, navigation ? {ignoreSearch:true} : undefined);
      if (fallback) return fallback;
      throw error;
    }
  })());
});
