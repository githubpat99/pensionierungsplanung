/* Registrierung und Update-Flow des Service Workers (`sw.js`) – für **alle** Einstiege
 * (`index.html`, `v3.html`, `v4.html`). Die installierte App startet über die Verzeichnisadresse
 * (`./` → `index.html`), deshalb muss der Worker dort genauso registriert sein wie auf den
 * direkt aufgerufenen Versionsdateien.
 *
 * Ablauf:
 *   1. Bei jedem Start `sw.js` mit `updateViaCache:'none'` registrieren und `update()` aufrufen:
 *      der Browser prüft die Worker-Datei am HTTP-Cache vorbei.
 *   2. Übernimmt ein **neuer** Worker die Kontrolle (`controllerchange`) und war die Seite vorher
 *      schon kontrolliert (echtes Update, keine Erstinstallation), lädt sich die Seite genau
 *      einmal neu. Danach laufen Hülle und Code der neuen Version.
 *   3. Fehler werden nur festgehalten (`__v4SwError`); die App funktioniert ohne Worker unverändert.
 *
 * Der Worker wird **relativ zum Skript** aufgelöst (`js/pwa-register.js` → `../sw.js`) und der
 * Scope aus dessen Verzeichnis gebildet – so stimmt beides unabhängig davon, welche Seite ihn
 * einbindet (GitHub Pages: `/pensionierungsplanung/`).
 *
 * Ausgeschlossen: `file://` (dort gibt es keine Service Worker) und Aufrufe mit `?nosw=1`.
 */
(function(root) {
  const nav = root.navigator;
  if (!nav || !('serviceWorker' in nav)) return;
  const http = root.location.protocol === 'http:' || root.location.protocol === 'https:';
  if (!http) return;
  if (new URLSearchParams(root.location.search).get('nosw') === '1') return;
  const script = document.currentScript;
  let workerUrl = 'sw.js';
  let scope = './';
  try {
    if (script?.src) {
      workerUrl = new URL('../sw.js', script.src).href;
      scope = new URL('.', workerUrl).pathname;
    }
  } catch (error) { /* Fallback: relativ zur Seite */ }
  let reloading = false;
  const hadController = !!nav.serviceWorker.controller;
  nav.serviceWorker.addEventListener('controllerchange', () => {
    /* Nur bei einem echten Update neu laden; die Erstinstallation startet die Seite nicht neu. */
    if (!hadController || reloading) return;
    reloading = true;
    root.location.reload();
  });
  root.addEventListener('load', async () => {
    try {
      const registration = await nav.serviceWorker.register(workerUrl, {scope, updateViaCache:'none'});
      await registration.update();
      root.__v4Sw = {scope:registration.scope, active:!!registration.active, waiting:!!registration.waiting};
    } catch (error) {
      root.__v4SwError = error?.message ?? String(error);
    }
  });
})(globalThis);
