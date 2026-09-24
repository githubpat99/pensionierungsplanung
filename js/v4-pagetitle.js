/* PageTitle (V4) – die eine verbindliche Titelzeile für alle V4-Screens.
 *
 * Aufbau (immer gleich, immer einzeilig nebeneinander):
 *   [ grosser Haupttitel ]        [ kleine Kontextzeile rechts daneben ]
 *
 * Auf Detailseiten (alles, was von «Mein Plan» weg- und dorthin zurückführt) ergänzt
 * dieselbe Komponente direkt unter der Titelzeile den einen Rückweg:
 *   ( ← Mein Plan )
 *
 * Beispiel:  PageTitle.render('Mein Plan.', 'Pensionierung mit 65 · Planung bis 86')
 *            PageTitle.render('Bedarf.', 'Netto pro Monat', {detail:true})
 *
 * Verbindlich (siehe docs/information-architecture-v4.md §8 und docs/PRODUCT_RULES.md §24.4):
 *  - genau EINE horizontale Titelzeile, kein Untertitel darunter
 *  - Haupttitel links, Serif, dunkel, dominant, darf nicht schrumpfen und nicht umbrechen
 *  - Kontext rechts daneben, deutlich kleiner und leichter, Sans Serif
 *  - auf Mobile ebenfalls nebeneinander; der Kontext nutzt höchstens zwei kurze Zeilen
 *    innerhalb seiner rechten Spalte und springt nie unter den Haupttitel
 *  - Fokussierte Screens haben GENAU EINEN Rückweg: «‹ Mein Plan» (`data-v4-back`).
 *    Kein zusätzliches «✕», kein «Zurück», kein Home – das «✕» gehört ausschliesslich
 *    Modal-Dialogen (siehe `#v4Modal .v3-modal-close`). Der Rückweg liegt bewusst
 *    NICHT in der Titelzeile: dort würde er dem Kontext die Breite nehmen.
 *  - keine screen-spezifischen Titelimplementierungen: jeder V4-Screen rendert seinen
 *    Kopf ausschliesslich über diese Komponente
 */
(function (root) {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  // Icons kommen aus der einen Icon-Quelle (`js/icons.js`), nie als eigenes SVG hier.
  const icon = (name, size) => (root.Icons?.icon ? root.Icons.icon(name, {size}) : '');

  function controls(options) {
    const label = options.backLabel ?? 'Mein Plan';
    return `<div class="v4-detailbar"><button type="button" class="v4-head-back" data-v4-back aria-label="Zurück zu ${esc(label)}">${icon('chevronLeft', 16)}<span>${esc(label)}</span></button></div>`;
  }

  function render(title, context = '', options = {}) {
    const detail = options.detail === true;
    /* Lange Titel bekommen eine eigene Klasse: auf schmalen Screens eine Schriftstufe kleiner,
       damit der Kontext rechts daneben Platz behält (nie Umbruch mitten im Wort). */
    const long = String(title).length > 16 ? ' v4-head-long' : '';
    return `<header class="v4-head${long}"><h1 class="v4-page-title">${esc(title)}</h1>${context ? `<p class="v4-page-context">${esc(context)}</p>` : ''}</header>${detail ? controls(options) : ''}`;
  }

  root.PageTitle = {render, component:'PageTitle'};
})(globalThis);
