/* Schätzwerte und Herkunft je Eingabe (Schnelleinstieg V3).
   Herkunft: user = von dir erfasst · estimated = Pauschale der App ·
   derived = aus anderen Angaben abgeleitet · model = Modellannahme.
   Diese Datei enthält nur Werte und Herkunft, keine Rechenlogik: alle Projektionen
   bleiben im gemeinsamen Rechenkern (`retirement-calculator.js`). */
(function(root) {
  const AHV_MONTHLY = 3000;
  const UWS_PERCENT = 5.2;
  const origins = {
    user: {key:'user', label:'erfasst'},
    estimated: {key:'estimated', label:'geschätzt'},
    derived: {key:'derived', label:'abgeleitet'},
    model: {key:'model', label:'Modellannahme'}
  };
  // Schreibweise wie in der Oberfläche: Tausendertrennzeichen als Apostroph.
  const chf = value => `CHF ${Math.round(value).toLocaleString('de-CH').replace(/’/g, "'")}`;
  const ahv = {
    key:'ahv', label:'AHV-Rente', monthly:AHV_MONTHLY, origin:'estimated',
    note:`Pauschalannahme von ${chf(AHV_MONTHLY)} pro Monat, bis du deine AHV-Rente erfasst.`
  };
  const uws = {
    key:'uws', label:'PK-Umwandlungssatz', percent:UWS_PERCENT, origin:'model',
    note:`Standardannahme von ${UWS_PERCENT.toLocaleString('de-DE', {minimumFractionDigits:1})} % für die Umwandlung des PK-Guthabens in eine Rente; unter «Annahmen» änderbar.`
  };
  const number = value => { const parsed = Number(String(value ?? '').replace(/['\s\u00a0]/g, '')); return Number.isFinite(parsed) ? parsed : null; };
  /* Nutzereingaben ersetzen Pauschalen: Eine erfasste AHV-Rente grösser als null gilt,
     sonst rechnet die App mit der Pauschale (Herkunft «geschätzt»). */
  function ahvOf(state) {
    const entered = number(state?.details?.income?.ahv);
    return entered !== null && entered > 0 ? {monthly:entered, origin:'user'} : {monthly:AHV_MONTHLY, origin:'estimated'};
  }
  function uwsOf(state) {
    const entered = number(state?.details?.assumptions?.uws ?? state?.assumptions?.uws);
    return entered !== null && entered > 0 ? {percent:entered, origin:'user'} : {percent:UWS_PERCENT, origin:'model'};
  }
  const api = {ahv, uws, origins, ahvOf, uwsOf, ahvAnnualOf:state => ahvOf(state).monthly * 12};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Estimates = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
