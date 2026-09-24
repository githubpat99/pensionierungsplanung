/* Entwicklungs-Fixture für den Ruhestands-Check (V3).
 *
 * Zweck: reproduzierbarer Referenzdatensatz für Entwicklung und Tests sowie Werkzeuge für
 * den Testmodus (Stand als JSON laden, Stand löschen). Der Testmodus greift ausschliesslich
 * über die vorhandene Persistenz zu (`retirement-v3-plan`) und verändert weder die produktive
 * Oberfläche noch die fachliche Berechnungslogik: Er schreibt nur einen Zustand,
 * den die App ohnehin laden kann.
 *
 * Aktivierung (nur Entwicklung):
 *   ?dev=1                     → Testmodus für diese Sitzung
 *   localStorage.devMode=1     → Testmodus dauerhaft
 * Ohne Aktivierung ist dieses Modul wirkungslos. */
(function(root){
  const storageKey = 'retirement-v3-plan';
  /* Referenzstand: 60 → 65, PK 900'000, Bedarf 9'000/Monat, Kanton Zürich,
     Säule 3a 120'000 mit Beitrag, etwas freies Vermögen, drei Varianten. */
  const reference = () => {
    const base = root.CheckV2State;
    let s = base.fresh('pre');
    s.riskProfile = 'balanced';
    for (const [group, values] of [
      ['time', {age:60, retirement:65}],
      ['regular', {canton:'ZH', ahv:2500, other:0, additional:0}],
      ['need', {need:9000}],
      ['assets', {cash:40000, securities:120000, saving:6000, otherAssets:0}],
      ['pension3a', {p3:120000, p3Contrib:7000}],
      ['pension', {pk:900000, pkContrib:24000, pkShare:50}]
    ]) s = base.apply(s, group, values);
    // Zielalter nur setzen, wenn es bereits abgeleitet wurde – sonst bleibt der Standard.
    s = base.apply(s, 'assumptions', {...base.defaults, pkInterest:2, ...(Number.isFinite(s.targetAge) ? {targetAge:s.targetAge} : {}), reviewed:true});
    s.position = 'plan';
    s.v3Variants = [0,50,100];
    return s;
  };
  /* Erstnutzer: sämtliche planungsrelevanten Angaben zurückgesetzt, gleiche Struktur. */
  const empty = () => {
    const base = root.CheckV2State;
    const s = base.fresh('pre');
    s.riskProfile = 'balanced';
    s.position = 'rents';
    s.v3Variants = [0,50,100];
    return s;
  };
  const wrap = state => ({version:2, savedAt:new Date().toISOString(), state, devFixture:true});
  /* Teststand-Aktionen dürfen nicht vom eigenen «pagehide»-Speichern der App überschrieben
     werden: Bis zum nächsten Laden ist das Schreiben gesperrt. */
  const suspend = () => { root.__v3SuspendSave = true; };
  function write(state) {
    root.localStorage.setItem(storageKey, JSON.stringify(wrap(state)));
    suspend();
    return state;
  }
  function enabled() {
    const flag = new URLSearchParams(root.location?.search ?? '').get('dev');
    return flag === '1' || root.localStorage.getItem('devMode') === '1';
  }
  /* Referenzstand schreiben (Standard im Testmodus). */
  const restore = () => write(reference());
  /* Erstnutzer: alles Planungsrelevante leeren – der Referenzdatensatz bleibt unberührt,
     weil er hier nur erzeugt und nie überschrieben wird. */
  const reset = () => write(empty());
  /* Nur die Persistenz entfernen (App startet dann mit ihrem eigenen Erststart). */
  const clear = () => { root.localStorage.removeItem(storageKey); suspend(); return null; };
  /* V4-Testszenarien (nur Testmodus): decken die Zustände der Akzeptanzliste ab.
     Alle Werte sind Beispieldaten – die Rechnung bleibt der gemeinsame Rechenkern. */
  const build = (mode, {age, retirement, pk, pkContrib, pkRent, rents, need, free, canton, p3, variants, targetAge, assets} = {}) => {
    const base = root.CheckV2State;
    let s = base.fresh(mode);
    s.riskProfile = 'balanced';
    const groups = [['time', mode === 'pre' ? {age, retirement} : {age}],
      ['need', {need}],
      mode === 'pre' ? ['pension', {pk, pkContrib:pkContrib ?? 0, pkShare:variants ? variants[0] : 0}] : ['pension', {pkRent}],
      ['assumptions', {...base.defaults, ...(targetAge ? {targetAge} : {})}]];
    if (canton) groups.push(['regular', {canton}]);
    if (rents) groups.push(['income', {canton:canton ?? '', ahv:Math.min(rents, 3000), other:Math.max(0, rents - 3000), additional:0}]);
    if (free) groups.push(['free', {free}]);
    if (p3) groups.push(['pension3a', {p3, p3Contrib:0}]);
    for (const [group, values] of groups) { try { s = base.apply(s, group, values); } catch (error) { /* Szenario bleibt gültig */ } }
    s.position = 'plan';
    s.v3Variants = variants ?? [0, 50, 100];
    return s;
  };
  const scenarios = {
    'leer': () => empty(),
    'knapp': () => build('pre', {age:60, retirement:65, pk:450000, pkContrib:0, need:10000, canton:'ZH'}),
    'geht-auf': () => build('pre', {age:60, retirement:65, pk:800000, pkContrib:24000, need:6500, canton:'ZH', free:150000, p3:80000}),
    'pensioniert': () => build('post', {age:70, rents:5800, need:9000, free:250000, canton:'ZH'}),
    '1-variante': () => build('pre', {age:60, retirement:65, pk:600000, pkContrib:20000, need:8000, canton:'ZH', variants:[50]}),
    '3-varianten': () => build('pre', {age:60, retirement:65, pk:600000, pkContrib:20000, need:8000, canton:'ZH', free:120000, p3:50000, variants:[0,50,100]}),
    'ohne-kanton': () => build('pre', {age:60, retirement:65, pk:600000, pkContrib:20000, need:7000}),
    'vollstaendig': () => build('pre', {age:60, retirement:65, pk:750000, pkContrib:24000, need:7500, canton:'AR', free:200000, p3:120000, targetAge:90, variants:[0,50,100]}),
    'kurz': () => build('pre', {age:62, retirement:65, pk:200000, pkContrib:0, need:9500, canton:'ZH', variants:[50]}),
    'ziel': () => build('pre', {age:58, retirement:65, pk:1200000, pkContrib:30000, need:6000, canton:'ZH', free:400000, p3:150000, targetAge:92, variants:[0,100]})
  };
  /* Szenario schreiben; ohne Testmodus wirkungslos. */
  function scenario(key) {
    const build2 = scenarios[key];
    if (!build2) return null;
    return write(build2());
  }
  const api = {storageKey, reference, empty, scenarios, scenario, restore, reset, clear, enabled, suspend, write, reload: () => { suspend(); root.location.reload(); }};
  root.DevFixture = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
