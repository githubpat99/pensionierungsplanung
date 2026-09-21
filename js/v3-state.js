/* V3 storage and decisions. Financial projections remain calculator-owned. */
(function(root) {
  const base = typeof module !== 'undefined' ? require('./v2-state.js') : root.CheckV2State;
  const copy = value => structuredClone(value);
  const routes = ['rents','need','plan','personal','ahv','pension','pension3a','extra','assets','assumptions','compare','years'];
  function normalize(source) {
    const state = copy(source), position = state.position;
    state.position = 'time';
    // Preserve the base adapter's compatible migrations (e.g. old post PK rent).
    base.validate(state);
    state.position = position;
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
  function variants(state) { return state.v3Variants ?? [Number(state.details.pension?.pkShare ?? 0)]; }
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
  function remember(state, value) {
    share(value); const next = copy(state), values = [...variants(state)];
    if (!values.includes(value)) { if (values.length === 3) throw Error('Drei Varianten gespeichert. Entferne zuerst eine inaktive Variante.'); values.push(value); }
    next.v3Variants = values; return next;
  }
  function activate(state, value) {
    const next = remember(state, value);
    if (next.mode !== 'pre' || next.details.pension?.pk === undefined) throw Error('Erfasse zuerst deine PK-Grunddaten.');
    return base.apply(next, 'pension', {...next.details.pension, pkShare:value});
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
  function decode(raw) {
    const record = JSON.parse(raw);
    if (!record || ![1,2].includes(record.version)) throw Error('Dieser Speicherstand ist ungültig oder stammt aus einer neueren Version. Er bleibt unverändert.');
    if (!Number.isFinite(Date.parse(record.savedAt))) throw Error('Ungültiges Speicherdatum.');
    const state = normalize(record.state);
    if (record.version === 1) {
      state.position = 'plan';
      state.v3Variants = [Number(state.details.pension?.pkShare ?? 0)];
      // Keep old envelope metadata for recovery; no duplicated live person records.
      const {state:oldState, ...legacyEnvelope} = record; state.legacyV3Envelope = legacyEnvelope;
    }
    validate(state);
    return {...record, state};
  }
  const api = {normalize, validate, changeMode, variants, remember, activate, remove, decode, routes};
  root.CheckV3State = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
