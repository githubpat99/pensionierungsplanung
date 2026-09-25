/* Eine Quelle für die App-Version (Deployments, Cache-Busting, Service-Worker-Updates).
 *
 * `APP_VERSION` wird bei jedem Deployment erhöht und an drei Stellen verwendet:
 *   1. sichtbar im Menü (Pilotbereich) – Tester können ihre Version nennen,
 *   2. als Cache-Name des Service Workers (`sw.js` liest ihn nicht selbst, sondern
 *      bekommt ihn beim Registrieren als Query-Parameter),
 *   3. als Information für die Diagnose (`globalThis.__v4Version`).
 *
 * `STORAGE_VERSION` gehört fachlich zur Speicherung und lebt genau einmal in
 * `js/v3-state.js` (dort, wo die Hüllen geschrieben und migriert werden). Hier wird sie
 * nur durchgereicht, damit UI und Tests dieselbe Zahl lesen.
 */
(function(root) {
  const APP_VERSION = '2026-09-25.2';
  const api = {
    APP_VERSION,
    get STORAGE_VERSION() { return root.CheckV3State?.STORAGE_VERSION ?? null; },
    /* Kurzform für Anzeigen und Berichte: «2026-09-25.1» → «25.09.2026 · Build 1». */
    label() {
      const [date, build] = String(APP_VERSION).split('.');
      const [year, month, day] = String(date).split('-');
      return year && month && day ? `${day}.${month}.${year}${build ? ` · Build ${build}` : ''}` : APP_VERSION;
    }
  };
  root.V4Version = api;
})(globalThis);
