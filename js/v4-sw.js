/* Registrierung und Update-Flow des Service Workers (`sw.js`).
 *
 * Ziel: Tester bekommen ein neues Deployment beim nächsten Aufruf automatisch – ohne
 * «Alles löschen», ohne Hard-Reload, ohne Cache-Odyssee.
 *
 * Ablauf:
 *   1. Bei jedem Start `sw.js` mit `updateViaCache:'none'` registrieren und `update()` aufrufen:
 *      der Browser prüft die Worker-Datei am Netz vorbei am HTTP-Cache.
 *   2. Übernimmt ein **neuer** Worker die Kontrolle (`controllerchange`) und war die Seite vorher
 *      schon kontrolliert (echtes Update, keine Erstinstallation), lädt sich die Seite genau
 *      einmal neu. Danach laufen HTML und Assets der neuen Version.
 *   3. Fehler werden nur festgehalten (`__v4SwError`) und in der Diagnose sichtbar; die App
 *      funktioniert ohne Service Worker unverändert weiter.
 *
 * Ausgeschlossen: `file://` (dort gibt es keine Service Worker) und Aufrufe mit `?nosw=1`
 * (z. B. für gezielte Vergleiche in der Entwicklung).
 */
(function(root) {
  const nav = root.navigator;
  if (!nav || !('serviceWorker' in nav)) return;
  const http = root.location.protocol === 'http:' || root.location.protocol === 'https:';
  if (!http) return;
  const params = new URLSearchParams(root.location.search);
  if (params.get('nosw') === '1') return;
  let reloading = false;
  const hadController = !!nav.serviceWorker.controller;
  nav.serviceWorker.addEventListener('controllerchange', () => {
    /* Nur bei einem echten Update neu laden; die Erstinstallation soll die Seite nicht neu starten. */
    if (!hadController || reloading) return;
    reloading = true;
    root.location.reload();
  });
  root.addEventListener('load', async () => {
    try {
      const registration = await nav.serviceWorker.register('sw.js', {scope:'./', updateViaCache:'none'});
      await registration.update();
      root.__v4Sw = {scope:registration.scope, active:!!registration.active, waiting:!!registration.waiting};
    } catch (error) {
      root.__v4SwError = error?.message ?? String(error);
    }
  });
})(globalThis);
