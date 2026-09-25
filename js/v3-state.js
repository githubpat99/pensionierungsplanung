/* V3 storage and decisions. Financial projections remain calculator-owned. */
(function(root) {
  const base = typeof module !== 'undefined' ? require('./v2-state.js') : root.CheckV2State;
  const copy = value => structuredClone(value);
  const routes = ['rents','need','plan','personal','ahv','pension','pension3a','extra','assets','assumptions','compare','years','improve','variants','basics'];
  /* Drei Variantenplätze sind der Standard. Bestehende Werte bleiben auf ihren Plätzen
     erhalten und werden nur dann mit den Standardwerten aufgefüllt, wenn Plätze fehlen. */
  const defaultVariants = [0, 50, 100];
  function slots(source) {
    const existing = Array.isArray(source.v3Variants)
      ? source.v3Variants.map(Number).filter(value => Number.isInteger(value) && value >= 0 && value <= 100)
      : [];
    const current = Number(source.details?.pension?.pkShare ?? 0);
    const values = [];
    const push = value => { if (Number.isInteger(value) && value >= 0 && value <= 100 && !values.includes(value)) values.push(value); };
    // Neue Planung: 0 / 50 / 100; ein abweichender aktueller Anteil besetzt den mittleren Platz.
    if (!existing.length) return defaultVariants.includes(current) ? [...defaultVariants] : [defaultVariants[0], current, defaultVariants[2]];
    // Bestehende Plätze behalten ihre Reihenfolge und werden nie doppelt geführt.
    existing.forEach(push);
    if (!values.includes(current)) {
      if (values.length >= 3) values[1] = current;
      else values.splice(Math.min(1, values.length), 0, current);
    }
    defaultVariants.forEach(push);
    return values.slice(0, 3);
  }
  function normalize(source) {
    const state = copy(source), position = state.position;
    state.position = 'time';
    // Preserve the base adapter's compatible migrations (e.g. old post PK rent).
    base.validate(state);
    state.position = position;
    state.v3Variants = slots(state);
    const p3 = state.details.pension3a;
    if (p3 && (p3.p3Mode || p3.p3Accounts)) {
      const accounts = p3.p3Accounts ?? [];
      if (!Array.isArray(accounts) || accounts.some(a => !a || !Number.isFinite(Number(a.amount)) || Number(a.amount) < 0 || Number(a.amount) > 1e10)) throw Error('Ungültiger alter 3a-Bestand.');
      state.legacyP3 ??= copy(p3);
      // Migration of entered balances, not a projection or a new financial rule.
      if (accounts.length) p3.p3 = accounts.reduce((sum, a) => sum + Number(a.amount), 0);
      delete p3.p3Mode;
      delete p3.p3Accounts;
      state.confirmed.assumptions = false;
      state.p3MigrationNotice = true;
    }
    return state;
  }
  function share(value) {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 100) throw Error('Der Kapitalanteil muss eine ganze Zahl von 0 bis 100 sein.');
    return value;
  }
  function variants(state) { return state.v3Variants ?? slots(state); }
  /* Speichert einen Wert auf einen Variantenplatz.
     - Der Platz wird mutiert; war es der Platz des aktuellen Plans, wandert der
       aktuelle Plan mit (der aktuelle Plan ist also veränderbar).
     - Existiert der Wert bereits auf einem anderen Platz, wird dieser zum aktuellen
       Plan, statt einen doppelten Wert zu führen. */
  function remember(state, value, slot = null) {
    share(value);
    const next = copy(state), values = [...variants(next)];
    const current = Number(next.details?.pension?.pkShare ?? 0);
    const adopt = share => next.mode === 'pre' && next.details.pension?.pk !== undefined
      ? base.apply(next, 'pension', {...next.details.pension, pkShare:share})
      : next;
    const existing = values.indexOf(value);
    if (existing >= 0) return value === current ? next : adopt(value);
    const requested = Number.isInteger(slot) && slot >= 0 && slot < values.length ? slot : -1;
    const target = requested >= 0 ? requested : Math.max(0, values.findIndex(entry => entry !== current));
    const movesCurrentPlan = values[target] === current;
    values[target] = value;
    next.v3Variants = values;
    return movesCurrentPlan ? adopt(value) : next;
  }
  function activate(state, value, slot = null) {
    const next = remember(state, value, slot);
    if (next.mode !== 'pre' || next.details.pension?.pk === undefined) throw Error('Erfasse zuerst deine PK-Grunddaten.');
    return base.apply(next, 'pension', {...next.details.pension, pkShare:value});
  }
  function validate(state) {
    const position = state.position;
    // V3 has a shorter onboarding than V2; validate data with the base adapter,
    // but do not require V2's completed assets step for a V3 detail position.
    const checked = copy(state); checked.position = 'time'; base.validate(checked);
    if (!routes.includes(position)) throw Error('Ungültige V3-Position.');
    const values = variants(state);
    if (!Array.isArray(values) || values.length < 1 || values.length > 3 || new Set(values).size !== values.length) throw Error('Ungültige PK-Varianten.');
    values.forEach(share);
    if (state.mode === 'pre' && !values.includes(Number(state.details.pension?.pkShare ?? 0))) throw Error('Aktueller Plan fehlt in den Varianten.');
    return state;
  }
  function remove(state, value) {
    if (value === Number(state.details.pension?.pkShare ?? 0)) throw Error('Der aktuelle Plan bleibt gespeichert.');
    return {...copy(state), v3Variants:variants(state).filter(v => v !== value)};
  }
  function changeMode(state, mode) {
    if (!['pre','post'].includes(mode)) throw Error('Ungültige Situation.');
    if (mode === state.mode) return copy(state);
    const next = copy(state);
    next.pensionByMode ??= {};
    if (next.details.pension) next.pensionByMode[next.mode] = copy(next.details.pension);
    next.mode = mode;
    if (mode === 'pre' && next.details.assumptions) next.details.assumptions = {...base.defaults, ...next.details.assumptions};
    if (next.pensionByMode[mode]) next.details.pension = copy(next.pensionByMode[mode]);
    else delete next.details.pension;
    next.confirmed.pension = false;
    return next;
  }
  /* ---------------- Speicherversion, Migration und Invalidierung ----------------
     Zwei Versionsnummern, zwei Aufgaben:
       `version`        = **Datenschema** der Hülle (1 = alte V3-Planung, 2 = aktuelle Hülle).
       `storageVersion` = **Generation der gespeicherten Planstände** (App-seitig). Neue
                          Deployments erhöhen sie, wenn sich der Zustand so ändert, dass alte
                          Stände migriert oder verworfen werden müssen.
     Regeln (verbindlich für jedes Deployment):
       – Fehlt `storageVersion`, gilt der Stand als Generation 1 (Altbestand vor dieser Regel).
       – Ältere Generationen laufen durch die Migrationskette; fehlt ein Schritt, ist der Stand
         **nicht** übernehmbar und wird gemeldet statt halb geladen.
       – Stände aus einer **neueren** Generation oder einem unbekannten Schema werden **nicht
         angefasst** (kein Überschreiben, kein Löschen) – die App meldet es sichtbar.
       – Nicht ladbare eigene Stände werden vom UI **gesichert und geräumt** (`restore` liefert
         `reason:'invalid'`), damit ein defekter Stand die App nie blockiert. */
  const STORAGE_VERSION = 3;
  /* Migrationskette: `migrations[n]` formt Generation n-1 auf Generation n um. */
  const migrations = {
    /* 1 → 2: Altbestand ohne `storageVersion`; die drei Variantenplätze werden verbindlich. */
    2: record => ({...record, state:{...record.state, v3Variants:slots(record.state ?? {})}}),
    /* 2 → 3: keine Umformung des Zustands (Generation der Varianten-/Vergleichsregeln). */
    3: record => record
  };
  function storageVersionOf(record) {
    const value = Number(record?.storageVersion);
    return Number.isInteger(value) && value >= 1 ? value : 1;
  }
  /* Lädt eine Hülle, ohne zu werfen. Ergebnis:
     `{ok:true, record, state, migrated}` oder `{ok:false, reason:'newer'|'invalid', message}`. */
  function restore(raw) {
    let record;
    try { record = JSON.parse(raw); } catch (error) {
      return {ok:false, reason:'invalid', message:'Dieser Speicherstand ist unlesbar.'};
    }
    if (!record || ![1,2].includes(record.version)) {
      const newer = !!record && Number(record.version) > 2;
      return {ok:false, reason:newer ? 'newer' : 'invalid', message:newer
        ? 'Dein gespeicherter Plan stammt aus einer neueren Version der App. Er bleibt unverändert – bitte lade die Seite neu.'
        : 'Dieser Speicherstand ist ungültig. Er bleibt unverändert.'};
    }
    const from = storageVersionOf(record);
    if (from > STORAGE_VERSION) {
      return {ok:false, reason:'newer', message:'Dein gespeicherter Plan stammt aus einer neueren Version der App. Er bleibt unverändert – bitte lade die Seite neu.'};
    }
    if (!Number.isFinite(Date.parse(record.savedAt))) return {ok:false, reason:'invalid', message:'Ungültiges Speicherdatum.'};
    try {
      let current = record, migrated = false;
      for (let step = from + 1; step <= STORAGE_VERSION; step++) {
        const apply = migrations[step];
        if (typeof apply !== 'function') throw Error(`Keine Migration von Speicherversion ${step - 1} auf ${step}.`);
        current = {...apply(current, step - 1), storageVersion:step};
        migrated = true;
      }
      const state = normalize(current.state);
      if (current.version === 1) {
        state.position = 'plan';
        /* Alte Planungen starten mit denselben drei Variantenplätzen wie neue; `normalize` hat sie
           bereits aus dem aktuellen Kapitalanteil gebildet. Früher wurde hier auf **einen** Platz
           gekürzt – dadurch fehlten bei einem alten Speicherstand beim ersten Öffnen der
           Variantenvergleich und jede Auswahl zum Übernehmen. */
        // Keep old envelope metadata for recovery; no duplicated live person records.
        const {state:oldState, ...legacyEnvelope} = current; state.legacyV3Envelope = legacyEnvelope;
      }
      validate(state);
      return {ok:true, record:{...current, state}, state, migrated};
    } catch (error) {
      return {ok:false, reason:'invalid', message:`Dieser Plan passt nicht mehr zur aktuellen Version (${error.message})`};
    }
  }
  /* Werfende Variante für Tests und Aufrufer, die einen harten Fehler erwarten. */
  function decode(raw) {
    const result = restore(raw);
    if (!result.ok) throw Error(result.message);
    return result.record;
  }
  /* Aktuelle Hülle – die einzige Stelle, die `version` und `storageVersion` setzt. */
  function encode(state, stamp = new Date().toISOString()) {
    return {version:2, storageVersion:STORAGE_VERSION, savedAt:stamp, state};
  }
  const api = {normalize, validate, changeMode, variants, slots, remember, activate, remove, decode, restore, encode, storageVersionOf, STORAGE_VERSION, routes};
  root.CheckV3State = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
