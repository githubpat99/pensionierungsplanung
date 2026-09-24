/* PageTitle (V4) – die eine verbindliche Titelzeile für alle V4-Screens.
 *
 * Aufbau (immer gleich, immer einzeilig nebeneinander):
 *   [ grosser Haupttitel ]        [ kleine Kontextzeile rechts daneben ]
 *
 * Auf Detailseiten (alles, was von «Mein Plan» weg- und dorthin zurückführt) ergänzt
 * dieselbe Komponente direkt unter der Titelzeile die beiden runden Bedienelemente:
 *   ( ← )                                              ( ✕ )
 *
 * Beispiel:  PageTitle.render('Mein Plan.', 'Pensionierung mit 65 · Planung bis 86')
 *            PageTitle.render('Bedarf.', 'Netto pro Monat', {detail:true})
 *
 * Verbindlich (siehe docs/PRODUCT_RULES.md §24.2):
 *  - genau EINE horizontale Titelzeile, kein Untertitel darunter
 *  - Haupttitel links, Serif, dunkel, dominant, darf nicht schrumpfen und nicht umbrechen
 *  - Kontext rechts daneben, deutlich kleiner und leichter, Sans Serif
 *  - auf Mobile ebenfalls nebeneinander; der Kontext nutzt höchstens zwei kurze Zeilen
 *    innerhalb seiner rechten Spalte und springt nie unter den Haupttitel
 *  - Detailseiten tragen darunter links den runden Rückweg-Pfeil und rechts das runde «✕»;
 *    beide führen denselben Weg zurück (`data-v4-back`, ausgewertet in `js/v4-ui.js`).
 *    Sie liegen bewusst NICHT in der Titelzeile: dort würden sie dem Kontext die Breite
 *    nehmen und die Ein-Zeilen-Regel brechen.
 *  - keine screen-spezifischen Titelimplementierungen: jeder V4-Screen rendert seinen
 *    Kopf ausschliesslich über diese Komponente
 */
(function (root) {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  // Icons kommen aus der einen Icon-Quelle (`js/icons.js`), nie als eigenes SVG hier.
  const icon = (name, size) => (root.Icons?.icon ? root.Icons.icon(name, {size}) : '');

  function controls(options) {
    const label = options.backLabel ?? 'Mein Plan';
    return `<div class="v4-detailbar"><button type="button" class="v4-head-back" data-v4-back aria-label="Zurück zu ${esc(label)}">${icon('chevronLeft', 16)}<span>${esc(label)}</span></button><button type="button" class="v4-head-close" data-v4-back aria-label="Detail schliessen">${icon('close', 18)}</button></div>`;
  }

  function render(title, context = '', options = {}) {
    const detail = options.detail === true;
    return `<header class="v4-head"><h1 class="v4-page-title">${esc(title)}</h1>${context ? `<p class="v4-page-context">${esc(context)}</p>` : ''}</header>${detail ? controls(options) : ''}`;
  }

  root.PageTitle = {render, component:'PageTitle'};
})(globalThis);
