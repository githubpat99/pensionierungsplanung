(() => {
  const app = document.getElementById('app');
  const State = CheckV2State;
  const Calculator = RetirementCalculator;
  const storageKey = 'retirement-v3-plan';
  const money = value => `CHF ${Math.round(value || 0).toLocaleString('de-CH').replace(/’/g, "'")}`;
  // Tausendertrennzeichen sind reine Darstellung: intern bleiben die Werte numerisch,
  // beim Lesen werden Apostroph und Leerzeichen entfernt.
  const amountRaw = value => String(value ?? '').replace(/['\s\u00a0]/g, '');
  const amountValue = value => { const raw = amountRaw(value).replace(',', '.'); return raw === '' ? '' : raw; };
  const formatAmount = value => {
    const raw = amountValue(value);
    if (raw === '' || !/^-?\d*\.?\d*$/.test(raw)) return String(value ?? '');
    const [whole = '', decimals] = raw.split('.');
    const sign = whole.startsWith('-') ? '-' : '', digits = whole.replace('-', '');
    const grouped = digits ? Number(digits).toLocaleString('de-CH').replace(/’/g, "'") : '';
    return `${sign}${grouped}${decimals === undefined ? '' : `.${decimals}`}`;
  };
  const isAmountField = field => String(field?.unit ?? '').startsWith('CHF');
  // Pflichtfelder werden konsistent mit «*» gekennzeichnet, optionale Felder ohne Stern.
  const requiredMark = field => field.optional === true ? '' : ' <span class="v3-required" aria-hidden="true">*</span>';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const numeric = value => Number(value || 0);
  const entered = value => value !== undefined && value !== null && String(value).trim() !== '';
  const percent = value => Number(value || 0).toLocaleString('de-DE', {maximumFractionDigits:2});
  // V3 verlangt einen Wohnkanton: ohne Kanton entstehen keine Steuerschätzung und keine Ergebnisse.
  const hasCanton = (source = state) => !!State.canton(source);
  /* Steuerannahmen transparent machen: nur die hinterlegten kantonalen Modellsätze, kein neuer Tarif. */
  const taxLimitNotice = 'Modellrechnung, keine individuelle Steuerberechnung. Nicht berücksichtigt sind unter anderem die Vermögenssteuer und eine separate Steuer auf Zinsen und Dividenden. PK-Kapital und 3a-Bezüge werden mit demselben vereinfachten kantonalen Modell geschätzt.';
  const p3TaxNotice = 'Die 3a-Bezugssteuer wird mit demselben vereinfachten kantonalen Modell geschätzt wie das PK-Kapital. Kantonale Sonderregeln für die Säule 3a sind nicht abgebildet.';
  function taxRateLine(code) {
    const canton = TaxModel.canton(code); if (!canton) return '';
    const {lowMax, mediumMax} = TaxModel.config.incomeThresholds;
    return `Für ${esc(canton.name)} verwendet das vereinfachte kantonale Modell ${esc(TaxModel.config.version)} je nach Höhe des steuerbaren Einkommens ${percent(canton.incomeTaxPct.low)} % (bis ${money(lowMax)}), ${percent(canton.incomeTaxPct.medium)} % (bis ${money(mediumMax)}) oder ${percent(canton.incomeTaxPct.high)} % (darüber); der Satz gilt jeweils für den gesamten Betrag.`;
  }
  function capitalTaxRateLine(code, cap) {
    const canton = TaxModel.canton(code); if (!canton || !(numeric(cap) > 0)) return '';
    return `Für den PK-Kapitalbezug von ${money(cap)} rechnet das Modell mit ${percent(TaxModel.getCapitalWithdrawalTaxRate(code, cap))} % (linear zwischen den Referenzbeträgen ${TaxModel.config.capitalTaxReferenceAmounts.map(amount => money(amount)).join(', ')} interpoliert).`;
  }
  /* Einheitliches Info-Muster für alle Screens: Wert zuerst, Erklärung hinter dem ⓘ,
     technische Annahme hinter dem zweiten ⓘ (iconOnly). Nie eine Textwand im Seitenfluss. */
  function infoMarkup({label = '', aria = 'Erklärung öffnen', body = '', iconOnly = false}) {
    const summary = iconOnly
      ? `<summary aria-label="${esc(aria)}"><span class="v3-info-icon" aria-hidden="true">ⓘ</span></summary>`
      : `<summary><span class="v3-info-label">${label}</span><span class="v3-info-icon" aria-hidden="true">ⓘ</span></summary>`;
    return `<details class="v3-info${iconOnly ? ' v3-info-sub' : ''}">${summary}<div class="v3-info-panel">${body}</div></details>`;
  }
  // Steuerannahmen des Wohnkantons: Satz- und Modelltransparenz am Kantonsfeld.
  function taxAssumptionHint(code = State.canton(state)) {
    if (!TaxModel.canton(code)) return '';
    return infoMarkup({label:'Steuerannahme', aria:'Steuerannahme des Wohnkantons erklären', body:`<p>${taxRateLine(code)}</p><p>${taxLimitNotice}</p>`});
  }
  // Kapitalbezug: dieselbe Rechnung für Plan, PK-Seite und Vermögensseite.
  function capitalTaxInfo(code, pension) {
    const canton = TaxModel.canton(code);
    if (!canton || !pension || !(pension.cap > 0)) return '';
    const rate = percent(TaxModel.getCapitalWithdrawalTaxRate(code, pension.cap));
    return {rate, body: `<p>Geschätzte Kapitalbezugssteuer für ${esc(canton.name)}: ${money(pension.cap)} × ${rate} % = ${money(pension.capitalTax)}; PK-Kapital netto ${money(pension.netCap)}.</p><p>Besteuert wird nur der bezogene PK-Anteil. Bereits bestehendes freies Vermögen wird nicht mit einer Kapitalbezugssteuer belastet.</p><div class="v3-tax-rate"><span>Steuersatz Kapitalbezug: ${rate} %</span>${infoMarkup({iconOnly:true, aria:'Satz des Kapitalbezugs erklären', body:capitalTaxRateLine(code, pension.cap)})}</div><p>${taxLimitNotice}</p>`};
  }
  function taxFigures(item) {
    const code = State.canton(state), canton = TaxModel.canton(code);
    if (!canton || !item) return null;
    const row = item.result.yearlyProjection?.[0] ?? {}, base = numeric(row.taxableAnnualIncome), rate = TaxModel.getIncomeTaxRate(code, base);
    // Anzeige konsistent halten: die Monatssteuer ergibt sich aus der gerundeten Jahressteuer.
    const tax = base > 0 && rate !== null ? Math.round(numeric(item.result.incomeTax)) : 0;
    return {code, canton, base, rate, tax, monthlyTax: tax / 12, pre: state.mode === 'pre'};
  }
  // Eine Zeile in der Einkommensübersicht; die nachvollziehbare Rechnung liegt hinter dem ⓘ.
  function taxRow(item) {
    const figures = taxFigures(item);
    if (!figures) return '';
    return `<details class="v3-tax-details"><summary><span class="v3-tax-label">Geschätzte Steuern <span class="v3-tax-icon" aria-hidden="true">ⓘ</span></span><strong class="v3-tax-amount">− ${money(figures.monthlyTax)} / Monat</strong></summary>${taxPanel(item)}</details>`;
  }
  function taxPanel(item) {
    const figures = taxFigures(item);
    if (!figures) return '';
    const {code, canton, base, rate, tax, monthlyTax, pre} = figures;
    const income = base > 0 && rate !== null
      ? `<h4>Laufende Einkommenssteuer</h4><dl><div><dt>Steuerbares Einkommen</dt><dd>${money(base)} / Jahr</dd></div><div><dt>Steuerannahme ${esc(code)}</dt><dd>${percent(rate)} %</dd></div><div><dt>Geschätzte Steuer</dt><dd>${money(tax)} / Jahr<small>${money(monthlyTax)} / Monat</small></dd></div></dl><p>Vereinfachte Planungsannahme für ${esc(canton.name)} (${esc(code)}). Die tatsächliche Steuer hängt u. a. von Gemeinde, Zivilstand, Konfession und Abzügen ab.</p>`
      : '<h4>Laufende Einkommenssteuer</h4><p>Im ersten Planjahr ist kein steuerbares Einkommen erfasst.</p>';
    const capital = !pre
      ? '<p>Nach der Pensionierung wird kein PK-Kapitalbezug und keine Bezugssteuer mehr gerechnet. Bereits bezogenes Kapital bleibt in deinem verfügbaren Vermögen und wird nicht erneut besteuert.</p>'
      : capacityPanel(item, code);
    return `<div class="v3-tax-panel"><h3>So rechnen wir mit Steuern</h3>${income}${capital}<p>${taxLimitNotice}</p><button type="button" class="v3-year-link" data-v3-next="years">So funktioniert deine Planung Jahr für Jahr <span aria-hidden="true">→</span></button></div>`;
  }
  // Kapitalbezüge chronologisch: pro Bezugsjahr eine gemeinsame Steuerbasis aus PK und Säule 3a.
  function capacityPanel(item, code) {
    const events = item.result.capitalWithdrawals || [];
    if (!events.length) return '<h4>Kapitalbezüge</h4><p>Ohne PK-Kapitalbezug und ohne 3a-Bezug entsteht keine Bezugssteuer.</p>';
    const planning = item.result.p3Planning;
    // Ohne Detailplanung deklariert die Rechnung die technische Annahme ausdrücklich (Spec §11).
    const open = planning && !planning.planned && planning.reason !== 'retirement';
    const note = open
      ? `<p class="v3-tax-note-line"><strong>Säule 3a – Bezugsplanung noch offen.</strong> Aktuelle Planungsannahme: Gesamter Bezug bei Pensionierung.</p>`
      : '';
    const blocks = events.map(event => {
      const rows = event.items.map(entry => `<div><dt>${esc(entry.name)}</dt><dd>${money(entry.gross)}</dd></div>`).join('');
      const total = event.items.length > 1 ? `<div class="v3-tax-sum"><dt>Kapitalbezüge gesamt</dt><dd>${money(event.gross)}</dd></div>` : '';
      const rate = percent(TaxModel.getCapitalWithdrawalTaxRate(code, event.gross));
      return `<h4>Alter ${event.age}${event.age === item.plan.retirement.age ? ' · Pensionierung' : ''}</h4><dl>${rows}${total}<div><dt>Geschätzte Bezugssteuer</dt><dd>− ${money(event.tax)}</dd></div><div class="v3-tax-sum"><dt>Netto ins Vermögen</dt><dd>${money(event.net)}</dd></div></dl><div class="v3-tax-rate"><span>Steuersatz ${rate} %</span>${infoMarkup({iconOnly:true, aria:'Satz des Kapitalbezugs erklären', body:capitalTaxRateLine(code, event.gross)})}</div>`;
    }).join('');
    return `<h4>Kapitalbezüge</h4>${note}${blocks}`;
  }
  let state = State.fresh('pre');
  let route = 'rents';
  let draft = {};
  let assetPart = null;
  let planScrollY = 0;
  const benchmarkShares = [0, 50, 100];
  const chosenShare = () => state.mode === 'post' ? 0 : numeric(state.details.pension?.pkShare ?? 50);
  let chartObserver;
  let p3ChartObserver;
  let p3Draft = null;
  // Speicherstatus: letzter erfolgreicher Speicherzeitpunkt und eine kurze Nachfrist für automatisches Speichern.
  let lastSavedAt = null;
  let saveTimer = null;
  let storageFailed = false;
  const autoSaveDelay = 600;
  const savedAtLabel = iso => {
    const date = new Date(iso);
    if (!iso || Number.isNaN(date.getTime())) return '';
    return `${date.toLocaleDateString('de-CH', {day:'numeric', month:'short', year:'numeric'})}, ${date.toLocaleTimeString('de-CH', {hour:'2-digit', minute:'2-digit'})}`;
  };
  function saveRow() { return '<div class="v3-save"><span id="saveLabel">Noch nicht gespeichert</span><button type="button" data-save>Jetzt speichern</button></div>'; }
  function renderSaveState() {
    const node = document.getElementById('saveLabel');
    if (!node) return;
    const row = node.closest?.('.v3-save');
    const state = storageFailed ? 'error' : saveTimer ? 'pending' : lastSavedAt ? 'saved' : 'empty';
    row?.setAttribute('data-state', state);
    if (storageFailed) { node.textContent = 'Speichern nicht möglich.'; return; }
    if (saveTimer) { node.textContent = 'Änderungen noch nicht gespeichert'; return; }
    const stamp = savedAtLabel(lastSavedAt);
    node.textContent = stamp ? `✓ Automatisch gespeichert | ${stamp}` : 'Noch nicht gespeichert';
  }
  // Schreiben in den lokalen Speicher; ohne technische Begriffe in der Oberfläche.
  function persist() {
    try {
      const stamp = new Date().toISOString();
      localStorage.setItem(storageKey, JSON.stringify({version:1, savedAt:stamp, state}));
      lastSavedAt = stamp; storageFailed = false;
    } catch (error) { storageFailed = true; }
    renderSaveState();
  }
  // Änderungen speichern automatisch; «Jetzt speichern» schreibt sofort.
  // Ohne Timer (z. B. in einer Testumgebung) wird direkt gespeichert.
  const canDefer = typeof setTimeout === 'function' && typeof clearTimeout === 'function';
  function markDirty() {
    if (saveTimer && canDefer) clearTimeout(saveTimer);
    saveTimer = canDefer ? setTimeout(() => { saveTimer = null; persist(); }, autoSaveDelay) : null;
    if (!saveTimer) { persist(); return; }
    renderSaveState();
  }
  function save() { if (saveTimer && canDefer) { clearTimeout(saveTimer); saveTimer = null; } persist(); }

  function fieldMarkup(field) {
    const value = draft[field.key] ?? '';
    // Pflichtfeld in V3: kein «noch offen»-Modus, der Picker listet nur die 26 Kantone.
    // Die Steuerannahmen des gewählten Kantons liegen hinter dem ⓘ am Feld.
    if (field.type === 'canton') return `<div class="v3-field"><label for="${field.key}">${field.label}${requiredMark(field)}</label><select id="${field.key}" name="${field.key}" data-empty-label="Kanton wählen" aria-required="true" required><option value="" disabled ${entered(value) ? '' : 'selected'}>Kanton wählen</option>${Object.entries(TaxModel.config.cantons).map(([key, canton]) => `<option value="${key}" ${value === key ? 'selected' : ''}>${key} · ${esc(canton.name)}</option>`).join('')}</select><div data-canton-tax>${taxAssumptionHint(value || State.canton(state))}</div></div>`;
    // Beträge zeigen Schweizer Tausendertrennzeichen; die Eingabe bleibt auf Mobile unkompliziert.
    const amount = isAmountField(field);
    const entry = amount
      ? `<input id="${field.key}" name="${field.key}" type="text" inputmode="decimal" autocomplete="off" data-amount value="${esc(formatAmount(value))}">`
      : `<input id="${field.key}" name="${field.key}" type="number" inputmode="decimal" min="${field.min ?? 0}" max="${field.max ?? 1e10}" step="${field.step ?? 'any'}" value="${esc(value)}">`;
    return `<div class="v3-field"><label for="${field.key}">${field.label}${requiredMark(field)}</label><div class="v3-entry">${entry}<span>${field.unit}</span></div></div>`;
  }
  // Eingaben lesen: Trennzeichen entfernen, damit die Berechnung rein numerisch bleibt.
  function assignForm() { app.querySelectorAll('input,select').forEach(input => { if (!input.name) return; if (input.type === 'radio') { if (input.checked) draft[input.name] = input.value; return; } draft[input.name] = input.type === 'checkbox' ? input.checked : (input.hasAttribute('data-amount') ? amountValue(input.value) : input.value); }); }
  // Betragsfeld formatieren, ohne die Schreibposition mitten im Feld zu zerstören.
  function formatAmountField(input) {
    const raw = input.value, formatted = formatAmount(raw);
    if (formatted === raw) return;
    input.value = formatted;
    const caret = formatted.length;
    input.setSelectionRange?.(caret, caret);
  }
  // V3 erfasst jede Säule 3a mit Bezugsplanung: ohne Angabe gilt der Bezug bei Pensionierung.
  function normalizeP3(source) {
    const pension3a = source.details && source.details.pension3a;
    if (!pension3a) return source;
    if (pension3a.p3Mode === 'retirement' || pension3a.p3Mode === 'later') return source;
    return {...source, details:{...source.details, pension3a:{...pension3a, p3Mode:'retirement', p3Accounts:Array.isArray(pension3a.p3Accounts) ? pension3a.p3Accounts : []}}};
  }
  const p3Mode = () => state.details.pension3a?.p3Mode === 'later' ? 'later' : 'retirement';
  const p3Accounts = () => Array.isArray(state.details.pension3a?.p3Accounts) ? state.details.pension3a.p3Accounts : [];
  // Status der 3a-Planung: Konten sind die Wahrheit, es gibt keine abweichende Summe mehr.
  const p3Status = planning => {
    if (!planning) return 'Noch nicht erfasst';
    if (planning.planned) return `Geplant · Alter ${planning.withdrawals.map(withdrawal => withdrawal.age).join(', ')}`;
    return 'Noch offen';
  };
  function setDraft(group) { draft = {}; State.fields(group, state).forEach(field => { draft[field.key] = group === 'pension' && field.key === 'pkShare' ? chosenShare() : (state.details[group]?.[field.key] ?? state.values[field.key] ?? ''); }); }
  // Einstieg «Meine Renten»: Zeitpunkt, Pflichtkanton und AHV in einer Gruppe.
  function rentFields() {
    const income = State.fields('income', state);
    return [...State.fields('time', state).map(field => ({...field, group:'time'})), {...income.find(field => field.key === 'canton'), group:'income'}, {...income.find(field => field.key === 'ahv'), group:'income'}];
  }
  function setRentDraft() {
    draft = {};
    rentFields().forEach(field => { draft[field.key] = field.key === 'canton' ? State.canton(state) : field.group === 'time' ? (state.values[field.key] ?? '') : (state.details.income?.[field.key] ?? ''); });
  }
  // Jeder Screen hat genau einen Titel. Der Plan braucht keinen sichtbaren Seitentitel
  // (seine Kennzahlen führen), behält aber eine Überschrift für Screenreader.
  function pageHeader(title, {hidden = false, back = '', to = 'data-back'} = {}) {
    if (hidden) return `<h1 class="v3-visually-hidden">${title}</h1>`;
    if (back) return `<header class="v3-heading v3-heading-detail"><button type="button" class="home-link" ${to}>${back}</button><h1>${title}</h1></header>`;
    return `<header class="v3-heading"><h1>${title}</h1></header>`;
  }
  // Context jump target: move focus to the section and highlight it briefly. No timers involved.
  function focusTarget(id, highlight = '') {
    if (!id) return;
    const node = document.getElementById(id);
    if (!node || !node.scrollIntoView) return;
    node.style?.setProperty?.('scroll-margin-top', '12px');
    node.scrollIntoView({block: 'start', behavior: 'auto'});
    node.focus?.({preventScroll: true});
    const marked = (highlight && document.getElementById(highlight)) || node;
    if (!marked.classList) return;
    marked.classList.add('v3-focus-target');
    marked.addEventListener('animationend', () => marked.classList.remove('v3-focus-target'), {once: true});
  }
  function stepper(active) { return `<nav class="v3-stepper" aria-label="Planungsschritte"><span class="${active === 'rents' ? 'active' : ''}">Meine Renten</span><span class="${active === 'need' ? 'active' : ''}">Mein Bedarf</span><span class="${active === 'plan' ? 'active' : ''}">Mein Plan</span></nav>`; }
  function message(text = '') { const node = document.getElementById('v3Error'); if (node) node.textContent = text; }
  function apply(group, values) { state = State.apply(state, group, values); markDirty(); }
  function renderForm(routeName) {
    state = normalizeP3(state);
    route = routeName;
    const isRents = routeName === 'rents';
    const title = isRents ? 'Meine Renten' : 'Mein Bedarf';
    const copy = isRents ? 'Wähle deinen Wohnsitzkanton und erfasse die Renten, die deinen Ruhestand tragen. Unbekannte Beträge bleiben offen.' : 'Lege deinen monatlichen Bedarf fest. Die PK-Varianten teilen diesen Bedarf und alle übrigen Annahmen.';
    const fields = isRents ? rentFields() : State.fields('need', state).map(field => ({...field, group:'need'}));
    const method = infoMarkup({label:'So rechnen wir', aria:'Rechenweg erklären', body:'<p>Die Berechnung verwendet den bestehenden gemeinsamen Rechenkern. Es werden keine Werte neben dem Rechner geschätzt.</p>'});
      app.innerHTML = `${pageHeader(title)}${stepper(routeName === 'rents' ? 'rents' : 'need')}<div class="v3-layout"><section class="v3-form"><p class="v3-lead">${copy}</p>${isRents ? '<button type="button" class="v3-demo-button" data-demo>Beispielplanung laden</button>' : ''}<form id="v3Form"><div class="v3-fields">${fields.map(field => fieldMarkup(field)).join('')}</div><p class="v3-error" id="v3Error" role="alert"></p><div class="v3-actions"><button type="button" data-v3-back ${isRents ? 'hidden' : ''}>Zurück</button><button class="primary" type="submit">${isRents ? 'Weiter zu meinem Bedarf' : 'Meinen Plan öffnen'}</button></div></form></section><aside class="v3-aside"><strong>${isRents ? 'Der Plan entsteht aus deinen Angaben.' : 'Die PK-Entscheidung kommt im Plan.'}</strong>${method}${isRents ? '<button type="button" data-load>Gespeicherten V3-Stand laden</button>' : ''}</aside></div>`;
    window.CantonPicker?.enhanceAll(app);
    document.querySelector('[data-load]')?.addEventListener('click', load);
    document.querySelector('[data-demo]')?.addEventListener('click', loadDemo);
    document.querySelector('[data-v3-back]')?.addEventListener('click', () => { setRentDraft(); renderForm('rents'); });
    // Kantonswechsel aktualisiert die Steuerannahme direkt am Feld.
    document.getElementById('v3Form').addEventListener('change', updateCantonInfo);
    document.getElementById('v3Form').addEventListener('submit', submitForm);
  }
  // Vorläufiger Hinweis der Schnellerfassung, abhängig von der gewählten Bezugswahl.
  function p3ModeHint(mode = p3Mode()) {
    return mode === 'later'
      ? 'Für die erste Berechnung rechnen wir vorläufig mit Bezug bei Pensionierung. Deine Bezüge planst du unter «Mein Plan» → Säule 3a.'
      : 'Wir rechnen mit dem gesamten Bezug bei Pensionierung inklusive geschätzter Kapitalbezugssteuer.';
  }
  // Die Anzeige folgt der aktuell gewählten Option, nicht erst dem gespeicherten Stand.
  function updateP3Hint() {
    const node = app.querySelector('[data-p3-hint]'), checked = app.querySelector('[name="p3Mode"]:checked');
    if (node) node.innerHTML = p3ModeHint(checked ? checked.value : p3Mode());
  }
  function updateCantonInfo(event) {
    if (event.target.name !== 'canton') return;
    const node = event.currentTarget.querySelector('[data-canton-tax]');
    if (node) node.innerHTML = taxAssumptionHint(event.target.value);
  }
  function submitForm(event) {
      event.preventDefault(); assignForm();
    try {
      if (route === 'rents') {
        if (!TaxModel.canton(draft.canton)) throw Error('Bitte wähle deinen Wohnsitzkanton. Ohne Kanton berechnen wir keine Steuern und keine Ergebnisse.');
        const time = Object.fromEntries(State.fields('time', state).map(field => [field.key, draft[field.key]]));
        apply('time', time); apply('regular', {...incomeValues(), canton:draft.canton, ahv:draft.ahv ?? state.details.income?.ahv ?? 0});
        setDraft('need'); renderForm('need');
      } else { apply('need', {need:draft.need}); renderPlan(); }
    } catch (error) { message(error.message); }
  }
  const editorTitles = {personal:'Persönliche Angaben', ahv:'AHV-Renten', pension:'Pensionskasse (PK)', pension3a:'Säule 3a', extra:'Weitere Einnahmen', need:'Bedarf', assumptions:'Annahmen', assets:'Vermögen'};
  const pkRateKeys = ['pkInterest', 'uws'];
  // V3 weist keine separat einstellbare Wertschriftenrendite aus: der Ruhestand rechnet
  // mit den Portfolio-Sätzen des Risikoprofols (Cash/Anleihen/Wertschöpfung).
  const hiddenRateKeys = ['secReturn'];
  function editorFields(detail) {
    if (detail === 'personal') return [...State.fields('time', state), ...State.fields('tax', state)];
    if (detail === 'ahv') return State.fields('income', state).filter(field => field.key === 'ahv');
    if (detail === 'extra') return State.fields('income', state).filter(field => ['other', 'additional'].includes(field.key));
    if (detail === 'pension') return [...State.fields('pension', state).filter(field => field.key !== 'pkShare'), ...State.fields('assumptions', state).filter(field => pkRateKeys.includes(field.key))];
    return State.fields(detail, state).filter(field => detail !== 'assumptions' || (!pkRateKeys.includes(field.key) && !hiddenRateKeys.includes(field.key)));
  }
  function assumptionValues() { const {reviewed, ...values} = state.details.assumptions ?? {}; return {...State.defaults, ...values, targetAge:state.targetAge}; }
  // Renditen und Kapitalmechanik offenlegen: vor der Pensionierung Aufbau, im Ruhestand drei Töpfe.
  function rateBody() {
    const values = assumptionValues(), plan = planFor(chosenShare()), pre = state.mode === 'pre';
    const returns = plan?.scenarios?.returns ?? [0, 1, 6];
    const share = chosenShare();
    const accumulation = pre
      ? `<p>Bis zur Pensionierung wachsen dein PK-Guthaben mit der PK-Verzinsung, deine Säule 3a mit der 3a-Rendite und deine Wertschriften mit einem hinterlegten internen Satz von ${percent(values.secReturn)} %. Eine separat einstellbare Wertschriftenrendite rechnen wir nicht.</p>`
      : '<p>Dein Plan startet heute; ein Aufbau bis zur Pensionierung wird nicht mehr gerechnet. Eine separat einstellbare Wertschriftenrendite rechnen wir nicht.</p>';
    return `${accumulation}<p>Im Ruhestand liegt dein Kapital in drei Töpfen: <strong>Cash</strong> ${percent(returns[0])} %, <strong>Anleihen</strong> ${percent(returns[1])} % und <strong>Wertschöpfung</strong> ${percent(returns[2])} % (Rendite deines Risikoprofils, real). Im Cash-Topf liegt die Entnahme des laufenden Jahres, in den Anleihen die Entnahmen der nächsten zwei Jahre, der Rest in der Wertschöpfung. Die Aufteilung wird jedes Jahr aus dem verbleibenden Kapital neu gebildet.</p><p>Die Entnahme eines Jahres ist der Bedarf abzüglich der Renten nach geschätzter Einkommenssteuer; die Kapitalbezugssteuer wird einmalig beim Bezug abgezogen und danach nicht mehr belastet. Alle Beträge sind in heutiger Kaufkraft gerechnet, die Renten sind feste Nominalbeträge.</p>${pre ? `<p>Die Aufteilung deines PK-Kapitals (${share} % Kapital) bestimmt nur, wie viel Rente und wie viel Kapital du beim Start hast – die Mechanik danach ist für alle Varianten dieselbe.</p>` : ''}`;
  }
  function incomeValues() { return {ahv:0, other:state.values.regular ?? 0, additional:0, ...state.details.income, canton:State.canton(state)}; }
  function returnToPlan() {
    state = normalizeP3(state);
    closeMenu();
    if (!State.timing(state)) { setRentDraft(); renderForm('rents'); return; }
    if (state.values.need === undefined) { setDraft('need'); renderForm('need'); return; }
    renderPlan(true);
  }
  // Whole PK situation for the chosen share: current split, running PK rent and PK capital together.
  function pensionBreakdown(source = state, share = chosenShare()) {
    if (source.mode === 'post') return '<p class="v3-hint">Die tatsächlich laufende PK-Rente zählt zum Einkommen. Bereits bezogenes Kapital ist im verfügbaren Vermögen enthalten.</p>';
    if (!hasCanton(source)) return '<p class="v3-hint">Wähle zuerst deinen Wohnsitzkanton. Ohne Kanton berechnen wir keine PK-Werte und keine Bezugssteuer.</p>';
    const plan = planFor(share, source);
    if (!plan) return '<p class="v3-hint">Ergänze zuerst deine persönlichen Angaben, damit wir die Pensionskasse hochrechnen können.</p>';
    const pk = Calculator.calculatePension(plan), rentShare = 100 - share, code = plan.person.canton, capital = capitalTaxInfo(code, pk);
    return `<section id="pkBreakdown" class="v3-pk-breakdown" tabindex="-1" aria-labelledby="pkBreakdownTitle"><h2 id="pkBreakdownTitle">Deine PK-Situation</h2><p class="v3-hint">Hier siehst du deine PK-Rente, dein PK-Kapital und die aktuell gewählte Aufteilung bei Pensionierung mit ${plan.retirement.age}. Die Aufteilung wählst du unter «Mein Plan».</p><p class="v3-pk-split" data-pk-split><span>Deine aktuelle Aufteilung</span><strong>${rentShare} % Rente / ${share} % Kapital</strong></p><div class="v3-pk-cards"><section id="pkRente" class="v3-pk-card" tabindex="-1" aria-labelledby="pkRenteTitle"><h3 id="pkRenteTitle">PK-Rente</h3><p class="v3-pk-value"><strong data-pk-rent>${money(pk.rent / 12)}</strong><span> / Monat</span></p><small data-pk-rent-year>${money(pk.rent)} / Jahr</small></section><section id="pkKapital" class="v3-pk-card" tabindex="-1" aria-labelledby="pkKapitalTitle"><h3 id="pkKapitalTitle">PK-Kapital</h3><dl><div><dt>Brutto</dt><dd data-pk-gross>${money(pk.cap)}</dd></div><div><dt>Bezugssteuer</dt><dd data-pk-tax>− ${money(pk.capitalTax)}</dd></div><div><dt>Netto</dt><dd data-pk-net>${money(pk.netCap)}</dd></div></dl></section></div>${capital ? infoMarkup({label:'So rechnen wir mit der Bezugssteuer', aria:'Kapitalbezugssteuer erklären', body:capital.body}) : ''}</section>`;
  }
  function pensionDraft() {
    const values = {...state.details.pension, ...Object.fromEntries(State.fields('pension', state).map(field => [field.key, field.key === 'pkShare' ? chosenShare() : draft[field.key]]))};
    let next = State.apply(state, 'pension', values);
    if (state.mode === 'pre') {
      const rates = {...assumptionValues(), ...Object.fromEntries(pkRateKeys.map(key => [key, draft[key]]))};
      next = State.apply(next, 'assumptions', rates);
      // Editing PK data is not confirmation of all planning assumptions.
      next.confirmed.assumptions = false;
    }
    return next;
  }
  function renderDetail(detail, focusSection = '', focusHighlight = '') {
    if (detail === 'pension' && !hasCanton()) { returnToPlan(); return; }
    closeMenu(); chartObserver?.disconnect(); route = detail; assetPart = null;
    window.scrollTo(0, 0);
    const pension = detail === 'pension';
    const fields = editorFields(detail);
    const initial = detail === 'personal' ? {...state.values, canton:State.canton(state)}
      : ['ahv','extra'].includes(detail) ? incomeValues()
      : detail === 'assumptions' ? assumptionValues()
      : pension ? {...assumptionValues(), ...state.details.pension}
      : {...state.values, ...state.details[detail]};
    draft = Object.fromEntries(fields.map(field => [field.key, initial[field.key] ?? '']));
    const modeField = detail === 'personal' ? `<div class="v3-field"><label for="personMode">Deine Situation</label><select id="personMode"><option value="pre" ${state.mode === 'pre' ? 'selected' : ''}>Vor der Pensionierung</option><option value="post" ${state.mode === 'post' ? 'selected' : ''}>Bereits pensioniert</option></select></div>` : '';
    const hint = pension ? (state.mode === 'pre' ? 'Erfasse dein PK-Guthaben und die Sparbeiträge von dir und deinem Arbeitgeber zusammen. Kapitalanteil und Varianten wählst du unter «Mein Plan».' : 'Erfasse die PK-Rente, die du heute tatsächlich erhältst.') : detail === 'pension3a' ? 'Erfasse dein 3a-Guthaben und die jährlichen Beiträge. Säule 3a bleibt bis zum Bezug gebunden und wird erst dann – nach geschätzter Kapitalbezugssteuer – zu verfügbarem Vermögen.' : 'Änderungen gelten für deinen Plan und alle Varianten.';
    // Schnellerfassung Säule 3a: ein Gesamtbetrag und die Wahl des Bezugszeitpunkts.
    const p3ModeField = detail === 'pension3a' ? `<fieldset class="v3-radio" id="p3ModeField"><legend>Bezugsplanung</legend><label><input type="radio" name="p3Mode" value="retirement" ${p3Mode() === 'retirement' ? 'checked' : ''}> Bezug bei Pensionierung</label><label><input type="radio" name="p3Mode" value="later" ${p3Mode() === 'later' ? 'checked' : ''}> Bezüge später planen</label></fieldset>` : '';
    // Schnellerfassung: die Annahme gilt vorläufig, bis die Bezüge unter «Mein Plan» geplant sind.
    const p3Hint = detail === 'pension3a' ? `<p class="v3-hint" data-p3-hint>${p3ModeHint()}</p>` : '';
    const p3Note = detail === 'pension3a' ? infoMarkup({label:'So rechnen wir mit der 3a-Bezugssteuer', aria:'Behandlung der Säule 3a erklären', body:`<p>Säule 3a bleibt bis zum Bezugsalter gebunden. Im Bezugsjahr wird der Betrag mit der geschätzten Kapitalbezugssteuer belastet; nur der Nettobetrag zählt zum verfügbaren Vermögen. Werden PK-Kapital und 3a im selben Jahr bezogen, bilden sie eine gemeinsame Steuerbasis.</p><p>${p3TaxNotice}</p>`}) : '';
    // Mechanik transparent: welche Rendite wo wirkt und wie das Kapital im Ruhestand aufgeteilt wird.
    const rateNote = detail === 'assumptions' ? infoMarkup({label:'So rechnen wir mit Renditen', aria:'Verwendete Renditen und Kapitalaufteilung erklären', body:rateBody()}) : '';
    app.innerHTML = `${pageHeader(editorTitles[detail])}<div class="v3-detail-layout"><section class="v3-detail-form"><p class="v3-sublead">${hint}</p><form id="v3DetailForm">${modeField}<div class="v3-fields" id="detailFields" tabindex="-1">${fields.map(fieldMarkup).join('')}</div>${p3ModeField}${p3Hint}${p3Note}${rateNote}<p class="v3-error" id="v3Error" role="alert"></p><div id="pensionResult">${pension ? pensionBreakdown() : ''}</div><div class="v3-actions"><button type="button" data-detail-back>Abbrechen</button><button class="primary" type="submit">Übernehmen</button></div></form></section></div>`;
    window.CantonPicker?.enhanceAll(app);
    if (detail === 'pension3a') updateP3Hint();
    document.querySelector('[data-detail-back]').addEventListener('click', returnToPlan);
    const form = document.getElementById('v3DetailForm');
    // Delegiert, damit die Steuerannahme auch nach einem erneuten Rendern der Felder mitzieht.
    form.addEventListener('change', event => { updateCantonInfo(event); if (detail === 'pension3a') updateP3Hint(); });
    document.getElementById('personMode')?.addEventListener('change', event => {
      assignForm();
      const source = {...state, mode:event.target.value};
      draft.retirement ??= state.values.retirement ?? '';
      form.querySelector('.v3-fields').innerHTML = [...State.fields('time', source), ...State.fields('tax', source)].map(fieldMarkup).join('');
      window.CantonPicker?.enhanceAll(form);
    });
    if (pension) form.addEventListener('input', () => {
      assignForm();
      try { const next = pensionDraft(); document.getElementById('pensionResult').innerHTML = pensionBreakdown(next); message(); }
      catch (error) { document.getElementById('pensionResult').innerHTML = '<p class="v3-hint">Bitte prüfe die PK-Eingaben für eine aktuelle Berechnung.</p>'; message(error.message); }
    });
    form.addEventListener('submit', event => {
      event.preventDefault(); assignForm();
      try {
        if (pension) state = pensionDraft();
        else if (detail === 'personal') {
          if (!TaxModel.canton(draft.canton)) throw Error('Bitte wähle deinen Wohnsitzkanton. Ohne Kanton berechnen wir keine Steuern und keine Ergebnisse.');
          const mode = document.getElementById('personMode').value;
          const next = State.apply({...state, mode}, 'time', draft);
          state = State.apply(next, 'tax', {canton:draft.canton});
        } else if (['ahv','extra'].includes(detail)) apply('income', {...incomeValues(), ...draft});
        else if (detail === 'assumptions') apply('assumptions', {...assumptionValues(), ...draft});
        else apply(detail, {...state.details[detail], ...draft});
        markDirty();
        returnToPlan();
      } catch (error) { message(error.message); }
    });
    if (focusSection) focusTarget(focusSection, focusHighlight);
  }
  // --- Vermögensdetailseite: verfügbare Mittel direkt bearbeiten, Vorsorge nur lesend ---
  function assetRowMarkup({part, label, value, hint = '', source = '', badge = '', focus = '', highlight = '', info = ''}) {
    const open = !!part && assetPart === part;
    const action = source ? `data-open-vorsorge="${source}"${focus ? ` data-focus-section="${focus}"` : ''}${highlight ? ` data-focus-highlight="${highlight}"` : ''}` : `data-asset="${part}" aria-expanded="${open}" aria-controls="asset-${part}"`;
    return `<div class="v3-asset-item${source ? ' v3-asset-source' : ''}"><button type="button" class="v3-asset-trigger" ${action}><span class="v3-asset-label">${label}${hint ? `<small>${hint}</small>` : ''}</span><span class="v3-asset-value">${value === null ? '<span class="v3-unknown">Noch nicht erfasst</span>' : `<strong>${money(value)}</strong>`}${badge ? `<small>${badge}</small>` : ''}</span><span class="v3-asset-chevron" aria-hidden="true">${value === null ? 'Erfassen' : '›'}</span></button>${info}${open ? assetFormMarkup(part) : ''}</div>`;
  }
  function assetFormMarkup(part) {
    const values = part === 'unallocated' ? {unallocated:State.breakdown(state).assets.unallocated ?? ''} : (state.details.assets ?? {});
    return `<form class="v3-asset-form" id="asset-${part}" data-asset-form="${part}" novalidate><div class="v3-fields">${State.assetFields(part, state, {keepOptional:true}).map(field => `<div class="v3-field"><label for="asset-input-${field.key}">${field.label}${requiredMark(field)}</label><div class="v3-entry"><input id="asset-input-${field.key}" name="${field.key}" type="text" inputmode="decimal" autocomplete="off" data-amount${field.optional === true ? ' data-optional="true"' : ''} value="${esc(formatAmount(values[field.key] ?? ''))}"><span>${field.unit}</span></div></div>`).join('')}</div><p class="v3-hint">Optionale Felder dürfen leer bleiben; sie zählen dann nicht als erfasst.</p><p class="v3-error" id="asset-error-${part}" role="alert"></p><div class="v3-actions"><button type="button" data-asset-cancel="${part}">Abbrechen</button><button class="primary" type="submit">Übernehmen</button></div></form>`;
  }
  /* Available capital stays with its own sources; Säule 3a and the chosen PK capital
     withdrawal come from Vorsorge and are only shown, never entered here a second time. */
  function assetComposition(s) {
    s = normalizeP3(s);
    if (!State.timing(s)) return '<p class="v3-hint">Ergänze zuerst deine persönlichen Angaben.</p>';
    if (!hasCanton(s)) return '<p class="v3-hint">Wähle zuerst deinen Wohnsitzkanton unter «Persönliche Angaben» oder auf «Mein Plan». Ohne Kanton berechnen wir keine Steuern und zeigen keine Vermögenswerte.</p>';
    const b = State.breakdown(s), pre = s.mode === 'pre', projection = 'voraussichtlich zum Pensionierungszeitpunkt';
    const rest = b.assets.unallocated, planning = pre ? b.p3 : null;
    const p3Available = planning ? planning.netAtStart : null;
    const p3Bound = planning ? planning.boundAtRetirement : 0;
    const p3Info = planning ? infoMarkup({label:'So rechnen wir mit der 3a-Bezugssteuer', aria:'Behandlung der Säule 3a erklären', body:`<p>${p3Status(planning)}. ${planning.planned ? '' : 'Aktuelle Planungsannahme: gesamter Bezug bei Pensionierung. '}${p3TaxNotice}</p><dl><div><dt>Säule 3a brutto bei Bezug</dt><dd>${money(planning.grossAtStart)}</dd></div><div><dt>Geschätzte Bezugssteuer</dt><dd>− ${money(planning.taxAtStart)}</dd></div><div><dt>Säule 3a netto im Vermögen</dt><dd>${money(planning.netAtStart)}</dd></div>${p3Bound > 0 ? `<div><dt>Noch gebunden</dt><dd>${money(p3Bound)}</dd></div>` : ''}</dl>`}) : '';
    const capital = pre ? capitalTaxInfo(State.canton(s), b.pk) : null;
    const boundRows = `${pre && p3Bound > 0 ? assetRowMarkup({source:'pension3a', label:'Säule 3a noch nicht bezogen', value:p3Bound, hint:'wird erst im Bezugsjahr zu verfügbarem Vermögen', badge:'gebunden'}) : ''}`;
    return `<p class="v3-hint">${pre ? `Verfügbare Mittel ab Pensionierung mit ${s.values.retirement}` : `Verfügbare Mittel ab Alter ${s.values.age}`}</p><div class="v3-assets">
     ${assetRowMarkup({part:'cash', label:'Bank / liquide Mittel', value:b.assets.cash})}
     ${assetRowMarkup({part:'securities', label:'Wertschriften', value:b.assets.securities, hint:pre ? projection : ''})}
     ${assetRowMarkup({part:'otherAssets', label:'Weitere verfügbare Vermögenswerte', value:b.assets.other})}
     ${rest !== null && rest > 0 ? assetRowMarkup({part:'unallocated', label:'Noch nicht aufgeteiltes Vermögen', value:rest, hint:'Rest deiner bisherigen Gesamtsumme'}) : ''}
     ${pre ? assetRowMarkup({source:'pension3a', label:'Säule 3a', value:p3Available, hint:`${p3Status(planning)} · netto nach Bezugssteuer`, badge:'aus Vorsorge', info:p3Info}) : ''}
     ${pre ? assetRowMarkup({source:'pension', label:'PK-Kapital netto', value:b.assets.pk, hint:'gemäss deiner PK-Entscheidung · netto nach Bezugssteuer', badge:'aus Vorsorge', focus:'pkBreakdown', highlight:'pkKapital', info:capital ? infoMarkup({label:'So rechnen wir mit der Bezugssteuer', aria:'Kapitalbezugssteuer erklären', body:capital.body}) : ''}) : ''}
    </div><dl class="v3-asset-total" id="assetTotal" tabindex="-1"><div><dt>Verfügbares Vermögen total</dt><dd>${money(b.result.availableCapital)}</dd></div></dl><p class="v3-hint">${pre ? 'Vorsorgebeträge sind im verfügbaren Vermögen nur mit ihrem Nettobetrag enthalten; noch nicht bezogene Guthaben bleiben gebunden.' : 'Bereits bezogenes PK- und 3a-Kapital ist in deinen verfügbaren Mitteln enthalten und wird nicht nochmals hinzugezählt.'}</p><section class="v3-bound-assets"><h2>Gebundenes Vermögen</h2>${boundRows}${assetRowMarkup({part:'property', label:'Immobilien netto', value:b.assets.bound, hint:'Immobilienwert abzüglich Hypotheken'})}<p class="v3-hint">Dieses Vermögen ist aktuell nicht für laufende Entnahmen eingeplant.</p></section>`;
  }
  function renderAssets(focusSection = '') {
    closeMenu(); chartObserver?.disconnect();
    if (!State.timing(state) || state.values.need === undefined) { returnToPlan(); return; }
    if (!hasCanton()) { returnToPlan(); return; }
    route = 'assets';
    window.scrollTo(0, 0);
    app.innerHTML = `${pageHeader('Vermögen')}<div class="v3-detail-layout"><section class="v3-detail-form"><p class="v3-sublead">Dein verfügbares Vermögen besteht aus Bank, Wertschriften und weiteren verfügbaren Vermögenswerten. Vorsorgebeträge werden nur angezeigt; Immobilien netto bleiben als gebundenes Vermögen getrennt.</p>${assetComposition(state)}${backRow()}</section></div>`;
    app.querySelectorAll('[data-asset-form]').forEach(form => form.addEventListener('submit', event => {
      event.preventDefault();
      const values = Object.fromEntries([...form.querySelectorAll('input')].filter(input => input.name).map(input => [input.name, amountValue(input.value)]));
      try { state = State.applyAsset(state, form.dataset.assetForm, values, {keepOptional:true}); assetPart = null; markDirty(); renderAssets(); }
      catch (error) { form.querySelector('.v3-error').textContent = error.message; }
    }));
    if (focusSection) focusTarget(focusSection);
  }
  // Screens ohne eigene Formularaktion (Vermögen, Vergleich) brauchen einen Weg zurück zum Plan.
  const backRow = () => '<div class="v3-actions v3-actions-back"><button type="button" data-back>← Mein Plan</button></div>';
  function openDetail(name, focusSection = '', focusHighlight = '') {
    state = normalizeP3(state);
    if (route === 'plan') planScrollY = window.scrollY || 0;
    assetPart = null;
    if (name === 'assets') renderAssets(focusSection);
    else if (name === 'pension3aplan') renderP3Plan();
    else if (name === 'years') renderYearByYear();
    else renderDetail(name, focusSection, focusHighlight);
  }
  // Kein Wohnkanton, kein Planobjekt: damit entstehen ohne Kanton auch keine Rechenergebnisse.
  function planFor(share, source = state) {
    if (!hasCanton(source)) return null;
    const plan = State.toPlan(normalizeP3(source));
    if (plan && source.mode === 'pre') plan.pensionDecision.capitalShare = share;
    return plan;
  }
  function evaluated(share, source = state) { const plan = planFor(share, source); return plan ? {plan, result:Calculator.evaluatePlan(plan), pension:Calculator.calculatePension(plan)} : null; }
  function readout(item) {
    return `<div class="v3-readout"><button type="button" class="v3-plan-link" data-v3-next="pension" data-focus-section="pkBreakdown" data-focus-highlight="pkRente"><span>PK-Rente / Monat</span><strong>${money(item.pension.rent / 12)}</strong><small>PK-Details ›</small></button><button type="button" class="v3-capital-link" data-pk-breakdown><span>PK-Kapital netto</span><strong>${money(item.pension.netCap)}</strong><small>Aufschlüsselung ansehen →</small></button></div>`;
  }
  function currentVariants() { return benchmarkShares.map((share, index) => ({share, index, ...evaluated(share)})).filter(item => item.plan); }
  // Säule 3a im Plan: nur eine kompakte, navigierbare Zeile (Übersicht bleibt im 3a-Screen).
  function p3Section(item) {
    const pension3a = state.details.pension3a;
    if (state.mode !== 'pre' || !pension3a) return '';
    const planning = item.result.p3Planning, accounts = p3Accounts();
    const total = accounts.length ? accounts.reduce((sum, account) => sum + numeric(account.amount), 0) : numeric(pension3a.p3);
    const reference = item.result.p3Planning;
    const ages = reference && reference.planned ? reference.withdrawals.map(withdrawal => withdrawal.age).join(', ') : '';
    const meta = accounts.length
      ? `CHF ${Math.round(total).toLocaleString('de-CH').replace(/’/g, "'")} · ${accounts.length} ${accounts.length === 1 ? 'Konto' : 'Konten'} · Bezüge ${ages}`
      : `${money(total)} · ${p3Mode() === 'later' ? 'Bezugsplanung offen' : 'Bezug bei Pensionierung'}`;
    return `<section class="v3-p3-section"><button type="button" class="v3-p3-link" data-v3-next="pension3aplan"><span class="v3-p3-link-copy"><strong>Säule 3a</strong><small>${meta}</small></span><b aria-hidden="true">›</b></button></section>`;
  }
  /* 3a-Simulator: Konten und Bezugsalter im Entwurf verändern, Wirkung sofort sehen,
     erst «Planung übernehmen» schreibt die Strategie in den Plan. */
/* 3a-Flow: Übersicht («Säule 3a planen») → einzelnes Konto bearbeiten → Auswirkung ansehen.
   Der Entwurf lebt zwischen den Screens; erst «Planung übernehmen» schreibt ihn in den Plan. */
  function p3AccountRows() {
    return ((p3Draft && p3Draft.accounts) || []).map((account, index) => ({name: account.name ?? '', amount: account.amount ?? '', age: account.age ?? ''}));
  }
  function p3AccountLabel(account, index) {
    const name = String(account.name ?? '').trim();
    return name || `3a Konto ${index + 1}`;
  }
  function p3AccountError(account, index) {
    const label = p3AccountLabel(account, index);
    if (!entered(account.amount) || !Number.isFinite(Number(account.amount)) || Number(account.amount) < 0) return `Bitte prüfe das Guthaben von «${label}».`;
    if (!entered(account.age) || !Number.isInteger(Number(account.age)) || Number(account.age) < numeric(state.values.age) || Number(account.age) > 110) return `Bitte wähle das Bezugsalter von «${label}» (${state.values.age} bis 110).`;
    return '';
  }
  function p3AgeOptions(current) {
    const from = numeric(state.values.age), ages = [];
    for (let age = from; age <= 90; age++) ages.push(age);
    if (numeric(current) && !ages.includes(numeric(current))) ages.push(numeric(current));
    return ages.sort((a, b) => a - b).map(age => `<option value="${age}" ${numeric(current) === age ? 'selected' : ''}>Alter ${age}</option>`).join('');
  }
  // Entwurfsquelle: Konten sind die Wahrheit, ihre Summe ist der Gesamtbetrag.
  function p3DraftSource(draft = p3Draft) {
    const accounts = ((draft && draft.accounts) || []).map((account, index) => ({name: p3AccountLabel(account, index), amount:numeric(account.amount), age:Math.round(numeric(account.age))}));
    const total = accounts.reduce((sum, account) => sum + account.amount, 0);
    return {...state, details:{...state.details, pension3a:{...state.details.pension3a, p3:total, p3Mode:'later', p3Accounts:accounts}}};
  }
  function p3BaselineSource() {
    return {...state, details:{...state.details, pension3a:{...state.details.pension3a, p3Mode:'retirement', p3Accounts:[]}}};
  }
  function p3SumOf(accounts) {
    return (accounts || []).reduce((sum, account) => sum + numeric(account.amount), 0);
  }
  function p3StartDraft() {
    const stored = p3Accounts().map(account => ({name: account.name ?? '', amount: entered(account.amount) ? account.amount : '', age: entered(account.age) ? account.age : ''}));
    // Erstmalige Aufteilung: der Gesamtbetrag aus der Schnellerfassung wird auf das erste Konto verteilt.
    if (!stored.length) return {accounts:[{name:'Säule 3a', amount:entered(state.details.pension3a?.p3) ? state.details.pension3a.p3 : '', age:numeric(state.values.retirement)}]};
    return {accounts: stored};
  }
  // «Planung übernehmen» prüft die Konten und schreibt sie in den Plan; Übersicht und Analyse teilen diese Aktion.
  function commitP3Draft() {
    try {
      const list = p3AccountRows();
      if (!list.length) throw Error('Bitte erfasse mindestens ein 3a-Konto.');
      const problem = list.map((account, index) => p3AccountError(account, index)).find(Boolean);
      if (problem) throw Error(problem);
      const accountsToSave = list.map(account => ({name:String(account.name ?? '').trim(), amount:Number(account.amount), age:Number(account.age)}));
      state = State.apply(state, 'pension3a', {...state.details.pension3a, p3:p3SumOf(accountsToSave), p3Mode:'later', p3Accounts:accountsToSave});
      markDirty();
      p3Draft = null;
      returnToPlan();
    } catch (error) { message(error.message); }
  }
  function p3DraftEvaluated() {
    return {draft: evaluated(chosenShare(), p3DraftSource()), baseline: evaluated(chosenShare(), p3BaselineSource())};
  }
  // Transparenz der 3a-Annahmen: Guthaben wachsen bis zum Bezugsalter, besteuert wird der Bezug.
  function p3GrowthNote() {
    const rate = percent(state.details.assumptions?.p3Return ?? 0);
    return `Die Guthaben der Konten wachsen bis zum Bezugsalter mit der Annahme von ${rate} % pro Jahr weiter. Der Bezug kann deshalb höher ausfallen als das heutige Guthaben.`;
  }
  function p3TotalInfo() {
    return infoMarkup({iconOnly:true, aria:'Gesamtbetrag der Säule 3a erklären', body:`<p>Summe der Guthaben aller Konten zum heutigen Stand. Die Konten sind die Wahrheit; einen separat editierbaren Gesamtbetrag gibt es nicht.</p><p>${p3GrowthNote()}</p>`});
  }
  function p3TaxInfo() {
    return infoMarkup({iconOnly:true, aria:'Bezugssteuer erklären', body:`<p>Geschätzte Kapitalbezugssteuer auf allen 3a-Bezügen. ${p3GrowthNote()}</p><p>Im Bezugsjahr bilden PK-Kapital und 3a zusammen eine Steuerbasis; jedes Element trägt seinen Anteil an der Jahressteuer.</p><p>${esc(p3TaxNotice)}</p>`});
  }
  function p3NetInfo(planning) {
    return infoMarkup({iconOnly:true, aria:'Netto aus Säule 3a erklären', body:`<p>${money(planning.grossTotal)} brutto bei Bezug − ${money(planning.taxTotal)} Steuern = ${money(planning.netTotal)} netto. Nur der Nettobetrag zählt zum verfügbaren Vermögen.</p>`});
  }
  function p3BoundInfo() {
    return infoMarkup({iconOnly:true, aria:'Gebundenes Guthaben erklären', body:'<p>Guthaben, deren Bezugsalter nach der Pensionierung liegt. Sie bleiben länger gebunden und entwickeln sich weiter.</p>'});
  }
  // Übersicht: Kontenliste und die wichtigsten Gesamtergebnisse der laufenden Planung.
  function renderP3Plan() {
    if (!hasCanton()) { returnToPlan(); return; }
    closeMenu(); chartObserver?.disconnect(); route = 'pension3aplan'; assetPart = null;
    window.scrollTo(0, 0);
    if (!p3Draft) p3Draft = p3StartDraft();
    const accounts = p3AccountRows(), total = p3SumOf(accounts);
    const {draft} = p3DraftEvaluated(), planning = draft && draft.result.p3Planning;
    const summary = planning
      ? `<dl class="v3-p3-rows"><div><dt>Bezugssteuer gesamt${p3TaxInfo()}</dt><dd>${money(planning.taxTotal)}</dd></div><div><dt>Netto aus 3a${p3NetInfo(planning)}</dt><dd>${money(planning.netTotal)}</dd></div><div><dt>Bei Pensionierung verfügbar</dt><dd>${money(planning.netAtStart)}</dd></div><div><dt>Noch gebunden${p3BoundInfo()}</dt><dd>${money(planning.boundAtRetirement)}</dd></div></dl>`
      : '';
    app.innerHTML = `${pageHeader('Säule 3a planen', {back:'← Mein Plan', to:'data-back'})}<div class="v3-detail-layout"><section class="v3-detail-form"><dl class="v3-p3-rows v3-p3-head"><div><dt>Gesamt${p3TotalInfo()}</dt><dd>${money(total)}</dd></div><div><dt>Konten</dt><dd>${accounts.length}</dd></div></dl><p class="v3-sublead">Jedes Konto trägt sein Guthaben und sein Bezugsalter. Deine Planung bleibt ein Entwurf, bis du sie übernimmst.</p><div class="v3-p3-list" data-p3-list><div class="v3-p3-accounts">${accounts.map((account, index) => `<button type="button" class="v3-p3-account" data-p3-account="${index}"><span class="v3-p3-account-name">${esc(p3AccountLabel(account, index))}</span><span class="v3-p3-account-amount">${entered(account.amount) ? money(numeric(account.amount)) : 'Offen'}</span><span class="v3-p3-account-age">${entered(account.age) ? account.age : '–'}</span><b aria-hidden="true">›</b></button>`).join('')}</div><div class="v3-p3-tools"><button type="button" data-p3-add>+ Konto hinzufügen</button></div></div>${summary ? `<section class="v3-p3-effects"><h2>Deine Planung</h2>${summary}<button type="button" class="v3-p3-effect-link" data-p3-effect>Auswirkungen ansehen <span aria-hidden="true">→</span></button></section>` : ''}<p class="v3-error" id="v3Error" role="alert"></p><div class="v3-actions"><button type="button" data-detail-back>Abbrechen</button><button type="button" class="primary" data-p3-commit>Planung übernehmen</button></div></section></div>`;
    document.querySelector('[data-back]')?.addEventListener('click', () => { p3Draft = null; returnToPlan(); });
    document.querySelector('[data-detail-back]')?.addEventListener('click', () => { p3Draft = null; returnToPlan(); });
    document.querySelector('[data-p3-effect]')?.addEventListener('click', renderP3Effect);
    document.querySelector('[data-p3-commit]')?.addEventListener('click', commitP3Draft);
    const form = app.querySelector('[data-p3-list]');
    form?.addEventListener('click', event => {
      const row = event.target.closest('[data-p3-account]');
      if (row) { renderP3Account(numeric(row.dataset.p3Account)); return; }
      if (event.target.closest('[data-p3-add]')) {
        p3Draft.accounts.push({name:'', amount:'', age:numeric(state.values.retirement)});
        renderP3Account(p3Draft.accounts.length - 1);
      }
    });
  }
  // Screen 2: genau ein Konto bearbeiten.
  function renderP3Account(index) {
    closeMenu(); chartObserver?.disconnect(); route = 'pension3aaccount';
    window.scrollTo(0, 0);
    const account = p3AccountRows()[index] || {name:'', amount:'', age:numeric(state.values.retirement)};
    app.innerHTML = `${pageHeader('3a-Konto bearbeiten', {back:'← Säule 3a', to:'data-back-p3'})}<div class="v3-detail-layout"><section class="v3-detail-form"><form id="v3P3AccountForm"><div class="v3-fields"><div class="v3-field"><label for="p3AccountName">Bezeichnung (optional)</label><div class="v3-entry"><input id="p3AccountName" name="name" type="text" autocomplete="off" value="${esc(account.name ?? '')}" placeholder="3a Konto ${index + 1}"></div></div><div class="v3-field"><label for="p3AccountAmount">Guthaben${requiredMark({})}</label><div class="v3-entry"><input id="p3AccountAmount" name="amount" type="text" inputmode="decimal" autocomplete="off" data-amount value="${esc(formatAmount(account.amount ?? ''))}"><span>CHF</span></div>${infoMarkup({iconOnly:true, aria:'Guthaben erklären', body:`<p>Guthaben des Kontos zum heutigen Stand. ${p3GrowthNote()}</p>`})}</div><div class="v3-field"><label for="p3AccountAge">Bezug${requiredMark({})}</label><div class="v3-entry v3-entry-select"><select id="p3AccountAge" name="age" aria-label="Bezugsalter"><option value="">Alter wählen</option>${p3AgeOptions(account.age)}</select></div></div></div><div class="v3-p3-live" data-p3-live></div><p class="v3-error" id="v3Error" role="alert"></p><div class="v3-actions"><button type="button" data-detail-back>Abbrechen</button><button class="primary" type="submit">Übernehmen</button></div></form>${p3AccountRows().length > 1 ? '<div class="v3-actions v3-actions-back"><button type="button" data-p3-remove>Konto entfernen</button></div>' : ''}</section></div>`;
    const form = document.getElementById('v3P3AccountForm');
    const read = () => ({name: form.querySelector('[name="name"]').value.trim(), amount: amountValue(form.querySelector('[name="amount"]').value), age: form.querySelector('[name="age"]').value});
    // Live: die Wirkung dieser Änderung wird sofort gerechnet.
    const live = () => {
      const node = app.querySelector('[data-p3-live]');
      if (!node) return;
      const rows = p3AccountRows();
      rows[index] = read();
      const total = p3SumOf(rows);
      const problem = p3AccountError(rows[index], index);
      if (problem) { node.innerHTML = `<p class="v3-hint">${problem}</p>`; return; }
      const source = p3DraftSource({accounts:rows}), item = evaluated(chosenShare(), source);
      const planning = item && item.result.p3Planning;
      node.innerHTML = planning
        ? `<p class="v3-p3-live-line">Gesamt ${money(total)} · Bezugssteuer ${money(planning.taxTotal)} · Netto aus 3a ${money(planning.netTotal)}</p>`
        : '';
    };
    form.addEventListener('input', live);
    form.addEventListener('change', live);
    form.addEventListener('submit', event => {
      event.preventDefault();
      try {
        const rows = p3AccountRows(), values = read();
        const problem = p3AccountError(values, index);
        if (problem) throw Error(problem);
        rows[index] = {name:values.name, amount:Number(values.amount), age:Number(values.age)};
        p3Draft = {accounts: rows};
        renderP3Plan();
      } catch (error) { message(error.message); }
    });
    document.querySelector('[data-back-p3]')?.addEventListener('click', () => renderP3Plan());
    document.querySelector('[data-detail-back]')?.addEventListener('click', () => renderP3Plan());
    document.querySelector('[data-p3-remove]')?.addEventListener('click', () => {
      p3Draft.accounts.splice(index, 1);
      renderP3Plan();
    });
    live();
  }
  // Screen 3 (Analyse): Steuervergleich, Vermögensvergleich, Kurven und Stützpunkte.
  function renderP3Effect() {
    closeMenu(); chartObserver?.disconnect(); route = 'pension3aeffect'; assetPart = null;
    window.scrollTo(0, 0);
    const {draft, baseline} = p3DraftEvaluated();
    if (!draft || !baseline) { renderP3Plan(); return; }
    const planned = draft.result.p3Planning, base = baseline.result.p3Planning;
    const taxDelta = planned.taxTotal - base.taxTotal;
    const target = draft.plan.retirement.targetAge, retirement = draft.plan.retirement.age;
    const ages = [...new Set([retirement, 75, 85, target].filter(age => age >= retirement && age <= target))].sort((a, b) => a - b);
    const capitalAt = (item, age) => (item.result.yearlyProjection.find(row => row.age === age) || item.result.yearlyProjection.at(-1)).free;
    const rows = ages.map(age => `<tr><th scope="row">${age === retirement ? `Alter ${age} · Pensionierung` : `Alter ${age}`}</th><td>${money(capitalAt(draft, age))}</td><td>${money(capitalAt(baseline, age))}</td></tr>`).join('');
    const tableLead = `<div class="v3-p3-table-lead"><span>Verfügbares Kapital je Stützpunkt</span>${infoMarkup({iconOnly:true, aria:'Stützpunkte erklären', body:`<p>${p3GrowthNote()}</p><p>Später bezogene Guthaben bleiben länger gebunden und entwickeln sich weiter; früher bezogene stehen früher zur Verfügung. Die Steuer je Bezugsjahr richtet sich nach der gemeinsamen Basis mit dem PK-Kapital.</p>`})}</div>`;
    app.innerHTML = `${pageHeader('Auswirkung deiner 3a-Planung', {back:'← Säule 3a', to:'data-back-p3'})}<div class="v3-detail-layout"><section class="v3-detail-form"><p class="v3-sublead">Deine Bezugsplanung</p><dl class="v3-p3-rows"><div><dt>Kapitalbezugssteuer${p3TaxInfo()}</dt><dd>${money(planned.taxTotal)}</dd></div><div><dt>Netto aus 3a${p3NetInfo(planned)}</dt><dd>${money(planned.netTotal)}</dd></div></dl><p class="v3-p3-compare">Gegenüber Bezug bei Pensionierung: <strong class="${taxDelta <= 0 ? 'down' : 'up'}">CHF ${Math.round(Math.abs(taxDelta)).toLocaleString('de-CH').replace(/’/g, "'")} ${taxDelta <= 0 ? 'weniger' : 'mehr'} Steuern</strong></p><div class="v3-p3-toggle" role="group" aria-label="Verlauf wählen"><label><input type="radio" name="p3curve" value="plan" checked> Deine Planung</label><label><input type="radio" name="p3curve" value="baseline"> Bezug bei Pensionierung</label></div><div class="v3-p3-chart" data-p3-chart></div>${tableLead}<table class="v3-p3-table"><thead><tr><th scope="col">Alter</th><th scope="col">Deine Planung</th><th scope="col">Bezug bei Pensionierung</th></tr></thead><tbody>${rows}</tbody></table><p class="v3-error" id="v3Error" role="alert"></p><div class="v3-actions"><button type="button" data-detail-back>Abbrechen</button><button type="button" class="primary" data-p3-commit>Planung übernehmen</button></div></section></div>`;
    const container = app.querySelector('[data-p3-chart]');
    let mode = 'plan';
    const chartRows = () => mode === 'plan'
      ? [{...draft, selected:true}]
      : [{...draft, selected:true}, {...baseline, selected:false}];
    const draw = () => {
      const width = container.getBoundingClientRect().width;
      if (width > 0) container.innerHTML = chart(chartRows(), width);
    };
    draw();
    p3ChartObserver?.disconnect();
    if (typeof ResizeObserver === 'function') { p3ChartObserver = new ResizeObserver(draw); p3ChartObserver.observe(container); }
    app.querySelectorAll('[name="p3curve"]').forEach(input => input.addEventListener('change', event => { mode = event.target.value; draw(); }));
    document.querySelector('[data-back-p3]')?.addEventListener('click', () => renderP3Plan());
    document.querySelector('[data-detail-back]')?.addEventListener('click', () => { p3Draft = null; returnToPlan(); });
    document.querySelector('[data-p3-commit]')?.addEventListener('click', commitP3Draft);
  }
  function marker(index) { return index === 0 ? '●' : index === 1 ? '■' : '◆'; }
  function variantCards() { return currentVariants().map(item => `<div class="v3-variant ${item.share === chosenShare() ? 'selected' : ''}"><button class="v3-variant-select" data-variant-index="${item.index}" type="button" aria-pressed="${item.share === chosenShare()}"><span class="v3-marker marker-${item.index}">${marker(item.index)}</span><span class="v3-variant-copy"><strong>${item.share} % Kapital</strong><small>${item.index === 1 ? 'Rente + Kapital' : item.share === 0 ? 'mehr laufende PK-Rente' : 'mehr Kapital zu Beginn'}</small></span><span class="v3-variant-chevron" aria-hidden="true">›</span></button></div>`).join(''); }
  // Kompakte Achsenbeschriftung (Mio./k) und reine Wertangabe für die Endlabels.
  const axisLabel = value => {
    const grouped = (number, digits) => Number(number).toLocaleString('de-CH', {maximumFractionDigits:digits}).replace(/’/g, "'");
    if (value >= 1000000) return `${grouped(value / 1000000, 1)} Mio.`;
    if (value >= 1000) return `${grouped(value / 1000, 0)} k`;
    return grouped(value, 0);
  };
  const plainMoney = value => Math.round(value || 0).toLocaleString('de-CH').replace(/’/g, "'");
  const lineColor = (selected, index) => selected ? '#1f6255' : ['#6f7b7b', '#6f675e', '#536477'][index % 3];
  const isSelectedLine = (row, rows) => row.selected ?? (rows.length === 1 || row.share === chosenShare());
  function chartLegend(rows, share) {
    const ordered = [...rows].sort((a, b) => Number(b.share === share) - Number(a.share === share));
    return ordered.map(row => {
      const index = rows.indexOf(row);
      return `<li><span class="v3-legend-dot" style="background:${lineColor(isSelectedLine(row, rows), index)}"></span>${row.share} %</li>`;
    }).join('');
  }
  // Flachere Grafik als früher: mobil rund 200 px, auf Desktop grosszügiger (Spec §11).
  function chart(rows, width, height = width >= 700 ? 260 : 200) {
    const points = rows.flatMap(row => row.result.yearlyProjection.map(entry => entry.free));
    // Match SVG units to CSS pixels so labels and markers stay legible on mobile.
    const maximum = Math.max(1, ...points), left = Math.max(52, axisLabel(maximum).length * 7 + 14), right = 62, top = 14, bottom = 30, plotWidth = Math.max(60, width - left - right), plotHeight = height - top - bottom;
    const y = value => top + plotHeight - (value / maximum) * plotHeight;
    const grid = [0, .5, 1].map(ratio => `<line class="v3-grid" x1="${left}" x2="${width - right}" y1="${y(maximum * ratio)}" y2="${y(maximum * ratio)}"></line><text x="${left - 10}" text-anchor="end" y="${y(maximum * ratio) + 5}">${axisLabel(maximum * ratio)}</text>`).join('');
    const lines = rows.map((row, index) => { const series = row.result.yearlyProjection, coordinates = series.map((entry, i) => `${left + (i / Math.max(1, series.length - 1)) * plotWidth},${y(entry.free)}`).join(' '), selected = isSelectedLine(row, rows), dash = index === 1 ? ' stroke-dasharray="9 6"' : index === 2 ? ' stroke-dasharray="2 6"' : '', color = lineColor(selected, index), markers = [0, Math.floor((series.length - 1) / 2), series.length - 1].filter((value, position, all) => all.indexOf(value) === position).map(i => { const x = left + (i / Math.max(1, series.length - 1)) * plotWidth; const cy = y(series[i].free); return index === 0 ? `<circle cx="${x}" cy="${cy}" r="4" fill="${color}"></circle>` : index === 1 ? `<rect x="${x - 3}" y="${cy - 3}" width="6" height="6" fill="${color}"></rect>` : `<path d="M ${x} ${cy - 5} L ${x + 5} ${cy} L ${x} ${cy + 5} L ${x - 5} ${cy} Z" fill="${color}"></path>`; }).join(''), end = series.at(-1); return `<polyline data-chart-share="${row.share}" points="${coordinates}" fill="none" stroke="${color}" stroke-width="${selected ? 3.5 : 1.8}" opacity="${selected ? 1 : .7}"${dash}></polyline>${markers}<text class="v3-chart-value" x="${left + plotWidth + 8}" y="${y(end.free) + 4}">${plainMoney(end.free)}</text>`; }).join('');
    const series = rows[0].result.yearlyProjection, startAge = series[0].age, endAge = series.at(-1).age;
    const tickAges = [startAge, ...series.filter(entry => entry.age > startAge && entry.age < endAge && entry.age % 5 === 0).map(entry => entry.age), endAge];
    const xForAge = age => left + ((age - startAge) / Math.max(1, endAge - startAge)) * plotWidth;
    const spacedAges = tickAges.filter((age, index) => index === 0 || index === tickAges.length - 1 || (xForAge(age) - xForAge(startAge) >= 30 && xForAge(endAge) - xForAge(age) >= 38));
    const ticks = spacedAges.filter((age, index) => index === 0 || xForAge(age) - xForAge(spacedAges[index - 1]) >= 32).map(age => `<text data-chart-tick-age="${age}" x="${xForAge(age)}" text-anchor="${age === startAge ? 'start' : age === endAge ? 'end' : 'middle'}" y="${height - 8}">${age}</text>`).join('');
    return `<svg class="v3-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Verfügbares Kapital von Alter ${startAge} bis ${endAge}">${grid}<line class="v3-axis" x1="${left}" x2="${width - right}" y1="${y(0)}" y2="${y(0)}"></line>${lines}${ticks}</svg>`;
  }
  // Vollständigkeit für qualitative Aussagen: erst mit erfasstem Vermögen und Vorsorge
  // darf eine Lücke prognostiziert werden. Fehlende Angaben sind nicht automatisch 0.
  function dataKnown() {
    const pre = state.mode === 'pre', a = state.details.assets ?? null;
    const assets = state.values.free !== undefined || (!!a && ['cash','securities','otherAssets'].some(key => entered(a[key])));
    const pension = state.details.pension?.[pre ? 'pk' : 'pkRent'] !== undefined;
    return {pre, assets, pension, ready:assets && pension};
  }
  function planSummary(item) { const result = item.result; const known = dataKnown(); const assetsKnown = known.assets; const pensionKnown = known.pension; const assets = assetsKnown ? Calculator.calculateAvailableCapital(item.plan).totalInvestableCapital : null; const assetsMarkup = `<section class="v3-asset-card"><div class="v3-asset-icon" aria-hidden="true">◉</div><div class="v3-asset-copy"><h3>Vermögen</h3><strong>${assets === null ? 'Noch nicht erfasst' : `${money(assets)} im Plan`}</strong><div class="v3-progress"><span style="width:${assets === null ? 0 : 100}%"></span></div><small>${assets === null ? 'Damit wird dein Plan genauer.' : 'Kann einen Teil der Lücke decken.'}</small></div></section>`; const checklist = `<section class="v3-settle"><h2>Plan festigen</h2><button type="button" class="v3-next-row" data-v3-next="assets" data-focus-section="assetTotal"><span class="v3-circle">${assetsKnown ? '✓' : ''}</span><span><strong>Vermögen</strong><small>${assetsKnown ? 'Erfasst' : 'Offen'}</small></span><em>${assetsKnown ? 'Anpassen' : 'Nächster Schritt'}</em><b>›</b></button><button type="button" class="v3-next-row" data-v3-next="pension" data-focus-section="pkBreakdown" data-focus-highlight="pkRente"><span class="v3-circle">${pensionKnown ? '✓' : ''}</span><span><strong>Pensionskasse</strong><small>${pensionKnown ? 'Erfasst' : 'Offen'}</small></span><em>${pensionKnown ? 'Anpassen' : 'Nächster Schritt'}</em><b>›</b></button></section>`; return `<div class="v3-summary"><div><span>Bedarf / Monat</span><strong>${money(result.monthlyNeed)}</strong></div><div><span>Einkommen netto</span><strong>${money(result.monthlyIncomeNet)}</strong></div><div><span>Aus Vermögen / Monat</span><strong>${money(result.monthlyGap)}</strong></div></div>${taxRow(item)}${prognosisMarkup(item)}${assetsMarkup}${checklist}`; }
  // Qualitative Finanzierungsaussage: nur mit erfassten Daten, sonst neutraler Hinweis (Spec §5).
  function prognosisMarkup(item) {
    const result = item.result;
    if (!dataKnown().ready) return '<div class="v3-status pending">Vervollständige deinen Plan, um die langfristige Entwicklung zu sehen.</div>';
    return `<div class="v3-status ${result.capitalExhaustionAge ? 'gap' : 'covered'}">${result.capitalExhaustionAge ? `Finanzierungslücke voraussichtlich ab Alter ${result.capitalExhaustionAge}.` : `Unter den gewählten Annahmen bis Alter ${item.plan.retirement.targetAge} finanzierbar.`}</div>`;
  }
  function compactReadySummary(item) {
    const result = item.result, sources = Calculator.incomeSourcesAtStart(item.plan);
    const source = id => sources.find(entry => entry.id === id)?.annualIncome / 12 || 0;
    const row = (label, amount, page, focus = '', highlight = '') => `<button type="button" class="v3-summary-row" data-v3-next="${page}"${focus ? ` data-focus-section="${focus}"` : ''}${highlight ? ` data-focus-highlight="${highlight}"` : ''}><span>${label}</span><strong>${money(amount)} <small>›</small></strong></button>`;
    const other = source('other'), additional = source('additional');
    const pensionsGross = source('ahv') + source('pk') + other;
    const additionalRows = sources.filter(entry => !['ahv', 'pk', 'other', 'additional'].includes(entry.id) && entry.annualIncome > 0);
    return `<div class="v3-summary-block"><div class="v3-income-sources"><h2>Deine Renten und Einnahmen</h2>${row('AHV', source('ahv'), 'ahv', 'detailFields')}${row('PK-Rente', source('pk'), 'pension', 'pkBreakdown', 'pkRente')}${other > 0 ? `<div class="v3-rent-row">${row('Weitere Renten', other, 'extra', 'detailFields')}${infoMarkup({iconOnly:true, aria:'Weitere Renten erläutern', body:`<p>Weitere Renten: ${money(other)} / Monat</p>`})}</div>` : ''}<div class="v3-pension-total"><span>Renten gesamt · vor Steuern</span><strong>${money(pensionsGross)} / Monat</strong></div>${additional > 0 ? row('Weitere Einnahmen', additional, 'extra', 'detailFields') : ''}${additionalRows.map(entry => `<div class="v3-source-line"><span>${esc(entry.name)}</span><strong>${money(entry.annualIncome / 12)}</strong></div>`).join('')}${taxRow(item)}<div class="v3-income-total"><span>Einkommen netto</span><strong>${money(result.monthlyIncomeNet)} / Monat</strong></div></div><div class="v3-compact-summary">${row('Bedarf / Monat', result.monthlyNeed, 'need', 'detailFields')}<div class="v3-gap-value"><span>Monatlich offen</span><strong>${money(result.monthlyGap)}</strong></div>${row('Verfügbares Vermögen', result.availableCapital, 'assets', 'assetTotal')}</div>${prognosisMarkup(item)}<p class="v3-compact-note">Nach geschätzten Steuern · Kapitalwirkung über die Jahre vergleichen.</p></div>`;
  }
  function updateCompactSummary(item) { document.querySelectorAll('.v3-compact-note').forEach(note => note.remove()); const summary = document.querySelector('.v3-summary-block') || document.querySelector('.v3-compact-summary'); if (summary) summary.outerHTML = compactReadySummary(item); }
  // Variantenvergleich: kompakter Kopf, flache Grafik mit integriertem Umschalter und Legende.
  function renderCompare() {
    if (!hasCanton()) { returnToPlan(); return; }
    route = 'compare';
    chartObserver?.disconnect();
    const share = chosenShare(), chosen = {share, ...evaluated(share)}, benchmark = currentVariants();
    const startAge = chosen.plan.retirement.age, targetAge = chosen.plan.retirement.targetAge;
    const comparison = benchmark.map(item => `<div class="v3-comparison-card ${item.share === share ? 'chosen' : ''}" ${item.share === share ? 'aria-current="true"' : ''}><div class="v3-comparison-head"><strong>${item.share} % Kapital</strong>${item.share === share ? '<small>✓ Deine Wahl</small>' : ''}</div><dl><div><dt>PK-Rente / Monat</dt><dd>${money(item.pension.rent / 12)}</dd></div><div><dt>Verfügbares Startkapital</dt><dd>${money(item.result.availableCapital)}</dd></div><div><dt>Kapital mit ${targetAge}</dt><dd>${money(item.result.capitalAtTargetAge)}</dd></div></dl></div>`).join('');
    const chartInfo = infoMarkup({iconOnly:true, aria:'Kapitalentwicklung erklären', body:`<p>Verfügbares Kapital über die Ruhestandsjahre ab Alter ${startAge}. Der Anfangsbetrag hängt vom gewählten PK-Kapitalanteil ab.</p>`});
    const compareInfo = infoMarkup({iconOnly:true, aria:'Vergleich der PK-Aufteilung erklären', body:`<p>Mehr laufende Rente oder mehr Kapital zu Beginn: Die Werte stammen aus derselben Berechnung und verwenden identischen Bedarf und Horizont.</p>${benchmarkShares.includes(share) ? '' : `<p>Deine aktuelle Wahl: ${share} % Kapital. Die Karten zeigen die festen Vergleichspunkte 0, 50 und 100 %.</p>`}`});
    app.innerHTML = `${pageHeader('Varianten vergleichen')}<div class="v3-compare"><p class="v3-compare-sub">So entwickelt sich dein Kapital bis Alter ${targetAge}.</p><section class="v3-section"><div class="v3-compare-head"><h2>Kapitalentwicklung ${chartInfo}</h2><label class="v3-compare-toggle"><span>Alle Varianten</span><input type="checkbox" id="compareLines" role="switch" aria-label="Alle Varianten anzeigen"></label></div><p class="v3-chosen-line">${share} % PK-Kapital · <strong>Deine Wahl</strong></p><div class="v3-chart-container"></div><ul class="v3-chart-legend" data-chart-legend></ul></section><section class="v3-section"><h2>PK-Aufteilung im Vergleich ${compareInfo}</h2><p class="v3-subline">Monatliche Rente und Kapital zu Beginn (Alter ${startAge}).</p><div class="v3-comparison-cards">${comparison}</div></section><button type="button" class="v3-year-link" data-v3-next="years">So funktioniert deine Planung Jahr für Jahr <span aria-hidden="true">→</span></button>${backRow()}</div>`;
    const container = app.querySelector('.v3-chart-container');
    let rows = [chosen];
    let chartWidth = 0;
    const draw = () => {
      container.innerHTML = chart(rows, chartWidth);
      const legend = app.querySelector('[data-chart-legend]');
      if (legend) legend.innerHTML = chartLegend(rows, share);
    };
    const resizeChart = () => {
      const width = container.getBoundingClientRect().width;
      if (width > 0 && width !== chartWidth) {
        chartWidth = width;
        draw();
      }
    };
    resizeChart();
    chartObserver = new ResizeObserver(resizeChart);
    chartObserver.observe(container);
    document.getElementById('compareLines').addEventListener('change', event => { rows = event.target.checked ? (benchmarkShares.includes(share) ? benchmark : [...benchmark, chosen]) : [chosen]; draw(); });
  }
  /* «Jahr für Jahr»: ein Jahr der bestehenden Simulation Schritt für Schritt.
     Keine zweite Rechnung: alle Werte stammen aus evaluatePlan().yearlyProjection
     (Einnahmen je Quelle, Steuern, Bedarf, Kapitalbedarf, Töpfe, Rendite je Topf,
     Umbuchungen, Endkapital) sowie aus capitalWithdrawalEvents() für PK- und 3a-Bezüge. */
  const potMeta = [['Geldmarkt','1 Jahr','cash'],['Obligationen','2 Jahre','bonds'],['Wertschöpfung','Rest','growth']];
  const yearState = {age:null, share:null, step:0, timer:null, mode:null, cache:null};
  const prefersReducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  function yearShare() { return yearState.share ?? chosenShare(); }
  function yearData(share = yearShare()) {
    if (yearState.cache && yearState.cache.share === share) return yearState.cache.data;
    const plan = planFor(share);
    if (!plan) return null;
    const result = Calculator.evaluatePlan(plan);
    const rows = result.yearlyProjection.filter(row => !row.terminal);
    if (!rows.length) return null;
    const data = {plan, result, rows, share, events:Calculator.capitalWithdrawalEvents(plan, share), rates:plan.scenarios?.returns ?? [0, 1, 6]};
    yearState.cache = {share, data};
    return data;
  }
  function potColumns(values, compact = false) {
    return `<div class="v3-year-pots${compact ? ' compact' : ''}">${values.map((value, index) => `<div class="v3-year-pot pot-${potMeta[index][2]}"><span class="v3-year-pot-bar" aria-hidden="true"></span><strong>${money(value)}</strong><small>${potMeta[index][0]}</small><em>${potMeta[index][1]}</em></div>`).join('')}</div>`;
  }
  function yearLine(label, value, {total = false, note = ''} = {}) {
    return `<div class="v3-year-line${total ? ' total' : ''}"><span>${label}${note ? ` <small>${note}</small>` : ''}</span><strong>${value}</strong></div>`;
  }
  function yearSteps(data, row) {
    const code = State.canton(state);
    const steps = [];
    const first = row.age === data.rows[0].age;
    const event = data.events.find(entry => entry.age === row.age) || null;
    const surplus = Math.max(0, row.rent - row.need - (row.special ?? 0));
    const index = data.rows.indexOf(row);
    const initial = index === 0;
    const rate = TaxModel.getIncomeTaxRate(code, row.taxableAnnualIncome);
    // Jeder Schritt zeigt genau eine Zahl; die Herleitung liegt hinter dem ⓘ.
    const step = (title, sub, value, {note = '', info = '', extra = ''} = {}) => ({title, sub, value, note, info, extra});
    const detail = (aria, body) => infoMarkup({iconOnly:true, aria, body});
    // 1 Einnahmen: immer brutto / vor Steuern.
    const sourceRows = (row.sources || []).filter(source => source.gross > 0.5).map(source => yearLine(esc(source.name), money(source.gross), {note:'brutto'})).join('');
    steps.push(step('Einnahmen', 'vor Steuern', money(row.grossIncome), {
      info:detail('Einnahmen erklären', `${sourceRows}${yearLine('Einnahmen gesamt', money(row.grossIncome), {total:true})}<p class="v3-year-note">Alle Einnahmen sind brutto, also vor Steuern.</p>`)}));
    // 2 Steuern: laufende Einkommenssteuer separat, im ersten Jahr gekennzeichnet.
    steps.push(step('Steuern', 'Einkommenssteuer', `− ${money(row.estimatedIncomeTax ?? 0)}`, {
      note:`${percent(rate)} %`,
      info:detail('Steuern erklären', `${yearLine('Steuerbares Einkommen', money(row.taxableAnnualIncome), {note:'nominal'})}${yearLine('Steuersatz', `${percent(rate)} %`)}${yearLine('Einkommenssteuer', `− ${money(row.estimatedIncomeTax ?? 0)}`, {total:true})}<p class="v3-year-note">Die laufende Einkommenssteuer wird jedes Jahr neu aus dem steuerbaren Einkommen gerechnet.</p>${first ? '<p class="v3-year-note">Im Pensionierungsjahr berücksichtigt die Simulation die für dieses Jahr relevanten Steuern. Das erste Jahr kann ein Mischjahr aus Erwerbs- und Renteneinkommen sein; im heutigen Modell rechnen wir es als volles Rentenjahr.</p>' : ''}`),
      extra:first ? '<p class="v3-year-flag">Steuern im ersten Jahr bereits berücksichtigt ✓</p>' : ''}));
    // 3 Einnahmen netto (nach Steuern).
    steps.push(step('Einnahmen netto', 'nach Steuern', money(row.rent), {
      info:detail('Netto-Einnahmen erklären', `${yearLine('Einnahmen vor Steuern', money(row.grossIncome))}${yearLine('Einkommenssteuer', `− ${money(row.estimatedIncomeTax ?? 0)}`)}${yearLine('Einnahmen netto', money(row.rent), {total:true})}`)}));
    // 4 Bedarf (nach Steuern).
    steps.push(step('Bedarf', 'nach Steuern', money(row.need), {
      info:detail('Bedarf erklären', '<p>Der Bedarf ist im Modell der Lebensbedarf nach Steuern. Er bleibt über die Jahre in heutiger Kaufkraft konstant; die Steuern stehen deshalb als eigener Schritt davor.</p>')}));
    // 5 Offen: Fehlbetrag, der aus dem Vermögen kommt.
    const offen = row.withdrawal > 0.5 ? row.withdrawal : surplus;
    steps.push(step('Offen', row.withdrawal > 0.5 ? 'aus Vermögen' : 'Überschuss in den Geldmarkt', money(offen), {
      note:`≈ ${money(offen / 12).replace('CHF ', '')} / Monat`,
      info:detail('Fehlbetrag erklären', `${yearLine('Bedarf', money(row.need))}${yearLine('Einnahmen netto', `− ${money(row.rent)}`)}${yearLine(row.withdrawal > 0.5 ? 'Offen' : 'Überschuss', money(offen), {total:true})}${yearLine('Pro Monat', money(offen / 12))}<p class="v3-year-note">${row.withdrawal > 0.5 ? 'Dieser Betrag wird in diesem Jahr aus dem Geldmarkttopf finanziert.' : 'Der Überschuss wird dem Geldmarkttopf gutgeschrieben.'}</p>`)}));
    // 5b Kapitalbezug (PK und/oder Säule 3a) in diesem Jahr.
    if (event) steps.push(step('Kapitalbezug', event.items.some(item => item.id !== 'pk') ? 'PK und Säule 3a' : 'Pensionskasse', money(event.net), {
      note:'netto investiert',
      info:detail('Kapitalbezug erklären', `${event.items.map(item => yearLine(esc(item.name), money(item.gross))).join('')}${event.items.length > 1 ? yearLine('Bezug brutto', money(event.gross), {total:true}) : ''}${yearLine('Kapitalbezugssteuer', `− ${money(event.tax)}`, {note:`${percent(TaxModel.getCapitalWithdrawalTaxRate(code, event.gross))} %`})}${yearLine('Netto investiert', money(event.net), {total:true})}<p class="v3-year-note">Die Bezugssteuer fällt einmalig im Bezugsjahr an und wird nicht der laufenden Einkommenssteuer zugerechnet.</p>`)}));
    // 6 Die drei Töpfe zu Jahresbeginn.
    const injectionNote = row.injection > 0.5 ? `<p class="v3-year-note">Der 3a-Nettozufluss von ${money(row.injection)} ist bereits enthalten: zuerst werden Geldmarkt und Obligationen auf Ziel gebracht, der Rest fliesst in die Wertschöpfung.</p>` : '';
    steps.push(step('Die drei Töpfe zu Jahresbeginn', '', money(row.free), {
      note:row.injection > 0.5 ? 'inkl. 3a-Zufluss' : 'Kapital zu Jahresbeginn',
      info:detail('Zielstruktur der Töpfe erklären', `<p>Geldmarkt = Kapitalbedarf des laufenden Jahres (1 Jahr): ${money(row.withdrawal)}.</p><p>Obligationen = Kapitalbedarf der beiden Folgejahre (2 Jahre): ${money(row.reserve)}.</p><p>Wertschöpfung = alles übrige investierbare Kapital: ${money(row.buckets[2])}.</p><p>Die Zielgrössen werden jedes Jahr neu aus dem effektiven Kapitalbedarf berechnet.</p>`),
      extra:potColumns(row.buckets) + injectionNote}));
    // 7 Rendite je Topf.
    steps.push(step('Rendite dieses Jahr', '', `+ ${money(row.ret)}`, {
      note:'gesamt',
      info:detail('Rendite erklären', `${row.gains.map((gain, position) => yearLine(`${potMeta[position][0]}`, `+ ${money(gain)}`, {note:`${percent(data.rates[position])} %`})).join('')}${yearLine('Rendite gesamt', `+ ${money(row.ret)}`, {total:true})}<p class="v3-year-note">Es gelten die Portfolio-Sätze des Risikoprofils; es wird keine zusätzliche Renditeannahme verwendet.</p>`)}));
    // 8 Auffüllen auf die Zielstruktur (Umbuchungen zu Beginn des Jahres).
    const moves = row.transfers.map((value, position) => ({value, position})).filter(move => Math.abs(move.value) > 0.5)
      .map(move => yearLine(`${move.value > 0 ? 'Ziel' : 'Quelle'} ${potMeta[move.position][0]}`, `${move.value > 0 ? '+' : '−'} ${money(Math.abs(move.value))}`)).join('');
    steps.push(step(initial ? 'Startbefüllung der Töpfe' : 'Auffüllen auf die Zielstruktur', '', '', {
      note:initial ? 'Geldmarkt zuerst' : 'zu Beginn des Jahres',
      info:detail('Auffüllen erklären', `${moves || '<p class="v3-year-note">Die Töpfe liegen bereits auf ihren Zielwerten.</p>'}<p class="v3-year-note">${initial ? 'Zuerst werden Geldmarkt und Obligationen gefüllt, der Rest liegt in der Wertschöpfung.' : 'Geldmarkt und Obligationen werden zuerst aufgefüllt; das Kapital dafür kommt aus dem jeweils nächsten Topf.'}</p>`)}));
    // 9 Kapital Ende Jahr.
    steps.push(step('Kapital Ende Jahr', '', money(row.end), {
      note:'nach Rendite',
      info:detail('Jahresende erklären', `${yearLine('Töpfe am Jahresende', potMeta.map((meta, position) => `${meta[0]} ${money(row.endBuckets[position])}`).join(' · '))}${yearLine('Kapital am Jahresende', money(row.end), {total:true})}${row.gap > 0.5 ? `<p class="v3-year-note">In diesem Jahr sind ${money(row.gap)} des Bedarfs nicht gedeckt.</p>` : ''}`),
      extra:potColumns(row.endBuckets, true)}));
    return steps;
  }
  function yearAges() { const data = yearData(); return data ? data.rows.map(row => row.age) : []; }
  function stopYearPlay() {
    if (yearState.timer) { clearInterval(yearState.timer); yearState.timer = null; }
    yearState.mode = null;
    const button = app.querySelector('[data-year-play]');
    if (button) button.textContent = '▶ Jahr abspielen';
  }
  function startYearPlay(mode) {
    if (yearState.timer) { stopYearPlay(); return; }
    const data = yearData();
    if (!data) return;
    const row = data.rows.find(entry => entry.age === yearState.age) || data.rows[0];
    const total = yearSteps(data, row).length;
    yearState.mode = mode;
    const button = app.querySelector('[data-year-play]');
    if (button) button.textContent = '■ Stopp';
    if (prefersReducedMotion()) { yearState.step = 0; renderYearBody(); if (mode === 'all') advanceYear(1); stopYearPlay(); return; }
    yearState.step = 1;
    renderYearBody();
    yearState.timer = setInterval(() => {
      const current = yearData();
      const active = current.rows.find(entry => entry.age === yearState.age) || current.rows[0];
      const count = yearSteps(current, active).length;
      if (yearState.step < count) { yearState.step += 1; renderYearBody(); return; }
      if (yearState.mode !== 'all' || !advanceYear(1)) { stopYearPlay(); return; }
      yearState.step = 1;
      renderYearBody();
    }, 650);
  }
  function advanceYear(direction) {
    const ages = yearAges();
    const index = ages.indexOf(yearState.age);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= ages.length) return false;
    yearState.age = ages[next];
    yearState.step = 0;
    renderYearBody();
    return true;
  }
  function renderYearBody() {
    const container = app.querySelector('[data-year-body]');
    if (!container) return;
    const data = yearData();
    if (!data) return;
    const ages = data.rows.map(row => row.age);
    if (!ages.includes(yearState.age)) yearState.age = ages[0];
    const row = data.rows.find(entry => entry.age === yearState.age);
    const steps = yearSteps(data, row);
    const visible = yearState.step === 0 ? steps.length : Math.min(yearState.step, steps.length);
    const label = app.querySelector('#yearAgeLabel');
    if (label) label.textContent = `Alter ${row.age}`;
    const range = app.querySelector('#yearRange');
    if (range) range.value = String(row.age);
    const nextAge = ages[ages.indexOf(row.age) + 1];
    container.innerHTML = `<ol class="v3-year-steps">${steps.map((step, index) => `<li class="v3-year-step${index < visible ? ' visible' : ''}"><div class="v3-year-step-head"><span class="v3-year-chip" aria-hidden="true">${index + 1}</span><div class="v3-year-step-title"><strong>${step.title}</strong>${step.sub ? `<small>${step.sub}</small>` : ''}</div>${step.value ? `<div class="v3-year-step-value"><strong>${step.value}</strong>${step.note ? `<small>${step.note}</small>` : ''}</div>` : (step.note ? `<small class="v3-year-step-note">${step.note}</small>` : '')}${step.info || ''}</div>${step.extra}</li>`).join('')}</ol>
      <details class="v3-info v3-year-detail"><summary><span class="v3-info-label">Berechnung dieses Jahres ansehen</span><span class="v3-info-icon" aria-hidden="true">ⓘ</span></summary><div class="v3-info-panel">${yearDetailRows(data, row)}</div></details>
      <div class="v3-year-next">${yearState.step !== 0 && visible < steps.length ? '<p class="v3-year-note">Wiedergabe läuft …</p>' : ''}${nextAge ? `<button type="button" class="v3-year-next-button" data-year-forward>Weiter zu Alter ${nextAge} →</button>` : '<p class="v3-year-note">Letztes Planungsjahr erreicht.</p>'}</div>`;
  }
  function yearDetailRows(data, row) {
    const code = State.canton(state);
    const index = data.rows.indexOf(row);
    const start = index > 0 ? data.rows[index - 1].end : row.free - row.injection;
    return [
      yearLine('Kapital zu Jahresbeginn', money(start)),
      yearLine('Kapitalzufluss 3a netto', `+ ${money(row.injection)}`),
      yearLine('Kapital nach Zufluss', money(row.free), {total:true}),
      yearLine('Töpfe zu Jahresbeginn', potMeta.map((meta, position) => `${meta[0]} ${money(row.buckets[position])}`).join(' · ')),
      yearLine('Einnahmen vor Steuern', money(row.grossIncome)),
      yearLine('Steuerbares Einkommen', money(row.taxableAnnualIncome), {note:'nominal'}),
      yearLine('Einkommenssteuer', `− ${money(row.estimatedIncomeTax ?? 0)}`, {note:`${percent(TaxModel.getIncomeTaxRate(code, row.taxableAnnualIncome))} %`}),
      yearLine('Verfügbar nach Steuern', money(row.rent)),
      yearLine('Lebensbedarf', money(row.need)),
      yearLine('Kapitalbedarf', money(row.withdrawal), {total:true}),
      yearLine('Entnahme aus den Töpfen', money(Math.min(row.withdrawal, row.free))),
      row.gap > 0.5 ? yearLine('Nicht gedeckt', money(row.gap)) : '',
      yearLine('Rendite je Topf', potMeta.map((meta, position) => `${meta[0]} + ${money(row.gains[position])}`).join(' · ')),
      yearLine('Umbuchungen auf Ziel', potMeta.map((meta, position) => `${meta[0]} ${row.transfers[position] >= 0 ? '+' : '−'} ${money(Math.abs(row.transfers[position]))}`).join(' · ')),
      yearLine('Töpfe am Jahresende', potMeta.map((meta, position) => `${meta[0]} ${money(row.endBuckets[position])}`).join(' · ')),
      yearLine('Kapital am Jahresende', money(row.end), {total:true}),
      `<p class="v3-year-note">Alle Beträge in heutiger Kaufkraft; die Steuerbemessung rechnet mit dem nominalen Einkommen. Bedarf und Steuern sind in der Simulation jährlich, die Kapitalbezugssteuer einmalig im Bezugsjahr.</p>`
    ].filter(Boolean).join('');
  }
  // Ein Jahr der Planung verstehen: dieselbe Simulation, Schritt für Schritt.
  function renderYearByYear() {
    if (!hasCanton()) { returnToPlan(); return; }
    const data = yearData();
    if (!data) { returnToPlan(); return; }
    closeMenu(); chartObserver?.disconnect(); route = 'years'; assetPart = null;
    window.scrollTo(0, 0);
    stopYearPlay();
    yearState.step = 0;
    const ages = data.rows.map(row => row.age);
    if (!ages.includes(yearState.age)) yearState.age = ages[0];
    const share = yearShare();
    const options = [[0, '0 % · Rente'], [50, '50 % · Rente + Kapital'], [100, '100 % · Kapital']];
    if (![0, 50, 100].includes(share)) options.push([share, `${share} % · eigene Mischung`]);
    options.sort((a, b) => a[0] - b[0]);
    app.innerHTML = `${pageHeader('Jahr für Jahr', {back:'← Variantenvergleich', to:'data-year-back'})}<div class="v3-detail-layout"><section class="v3-detail-form"><p class="v3-sublead">So entwickelt sich dein Geld über die Jahre.</p><div class="v3-year-head"><label class="v3-year-variant"><span>PK-Variante</span><select id="yearShare">${options.map(([value, label]) => `<option value="${value}" ${value === share ? 'selected' : ''}>${label}</option>`).join('')}</select></label>${share === chosenShare() ? '<small class="v3-year-choice">✓ Deine Wahl</small>' : ''}</div><div class="v3-year-nav"><input id="yearRange" class="v3-range v3-year-range" type="range" min="${ages[0]}" max="${ages[ages.length - 1]}" step="1" value="${yearState.age}" aria-label="Alter wählen"><div class="v3-year-nav-row"><button type="button" data-year-prev>‹ Vorjahr</button><strong id="yearAgeLabel">Alter ${yearState.age}</strong><button type="button" data-year-next>Nächstes Jahr ›</button></div></div><div data-year-body></div><div class="v3-year-actions"><button type="button" class="primary" data-year-play>▶ Jahr abspielen</button><button type="button" data-year-playall>▶ Gesamten Verlauf</button></div>${backRow()}</section></div>`;
    renderYearBody();
    bindYearByYear();
  }
  function bindYearByYear() {
    document.querySelector('[data-year-back]')?.addEventListener('click', renderCompare);
    document.getElementById('yearShare')?.addEventListener('change', event => {
      const value = numeric(event.target.value);
      yearState.share = [0, 50, 100].includes(value) ? value : yearShare();
      yearState.step = 0;
      stopYearPlay();
      renderYearByYear();
    });
    document.getElementById('yearRange')?.addEventListener('input', event => {
      yearState.age = numeric(event.target.value);
      yearState.step = 0;
      stopYearPlay();
      renderYearBody();
    });
    document.querySelector('[data-year-prev]')?.addEventListener('click', () => { yearState.step = 0; advanceYear(-1); });
    document.querySelector('[data-year-next]')?.addEventListener('click', () => { yearState.step = 0; advanceYear(1); });
    app.querySelector('[data-year-body]')?.addEventListener('click', event => {
      if (event.target.closest('[data-year-forward]')) { yearState.step = 0; advanceYear(1); }
    });
    document.querySelector('[data-year-play]')?.addEventListener('click', () => startYearPlay('year'));
    document.querySelector('[data-year-playall]')?.addEventListener('click', () => startYearPlay('all'));
  }
  // Ohne Wohnkanton bleiben die bisherigen Angaben ladbar, aber es entstehen keine Ergebnisse.
  function renderCantonPlan(restore = false) {
    closeMenu(); chartObserver?.disconnect(); route = 'plan';
    if (!restore) window.scrollTo(0, 0);
    draft = {canton: State.canton(state)};
    app.innerHTML = `${pageHeader('Mein Plan', {hidden:true})}<div class="v3-plan-grid v3-plan-compact"><section><section class="v3-canton-gate" id="cantonGate" tabindex="-1" aria-labelledby="cantonGateTitle"><h2 id="cantonGateTitle">Wohnkanton wählen</h2><p class="v3-lead">Dein Wohnsitzkanton bestimmt die geschätzten Steuern. Erst danach berechnen wir deinen Plan.</p><p class="v3-hint">Deine bisherigen Angaben bleiben erhalten.</p>${fieldMarkup({key:'canton', label:'Dein Wohnsitzkanton', type:'canton'})}<p class="v3-error" id="v3Error" role="alert"></p><div class="v3-actions"><button type="button" class="primary" data-canton-confirm>Kanton übernehmen und berechnen</button></div></section></section><aside>${saveRow()}</aside></div>`;
    window.CantonPicker?.enhanceAll(app);
    document.querySelector('[data-canton-confirm]')?.addEventListener('click', () => {
      const code = document.getElementById('canton')?.value || '';
      if (!TaxModel.canton(code)) { message('Bitte wähle deinen Wohnsitzkanton.'); return; }
      apply('tax', {canton:code});
      renderPlan();
    });
    document.querySelector('[data-save]')?.addEventListener('click', save);
    renderSaveState();
  }
  function renderPlan(restore = false) {
    state = normalizeP3(state);
    if (!hasCanton()) { renderCantonPlan(restore); return; }
    closeMenu();
    chartObserver?.disconnect();
    route = 'plan';
    if (!restore) window.scrollTo(0, 0);
    const pre = state.mode === 'pre';
    // Qualitative Aussagen nur mit erfassten Daten: eine blosse Teilmenge ist nicht «0».
    const known = dataKnown();
    const assetsReady = known.assets, pensionReady = known.pension;
    const decisionReady = assetsReady && pensionReady;
    const item = evaluated(chosenShare());
    const decision = decisionReady && pre ? `<div class="v3-decision"><div class="v3-decision-title"><span>PK-Bezug wählen</span><strong><em id="shareValue">${chosenShare()}</em> % Kapital</strong></div><input id="shareRange" class="v3-range" type="range" min="0" max="100" step="1" value="${chosenShare()}" aria-label="PK-Kapitalanteil"><div class="v3-range-labels"><span>100 % Rente</span><span>100 % Kapital</span></div><div id="previewReadout">${readout(item)}</div></div>` : `<div class="v3-note">${decisionReady ? 'Die laufende PK-Rente wird als bestehende Einnahme verwendet.' : 'Vermögen und PK-Angaben fehlen noch. Ergänze sie, bevor du PK-Bezug und Varianten vergleichst.'}</div>`;
    const variantsSection = decisionReady && pre ? `<section class="v3-section"><div class="v3-variants-heading"><h2>PK-Varianten vergleichen</h2></div><p class="v3-hint">Deine Wahl: <strong id="chosenVariantLabel">${chosenShare()} % Kapital</strong></p><div class="v3-cards">${variantCards()}</div><button class="v3-compare-button" data-compare>Varianten vergleichen <span aria-hidden="true">→</span></button></section>` : '';
    const readyContent = decisionReady && pre ? `<section class="v3-compact-plan">${decision}${compactReadySummary(item)}${variantsSection}</section>` : `${decision}<section><h2 class="v3-current-title">Aktueller Plan</h2>${planSummary(item)}<p class="v3-info-line">Weitere Angaben verfeinern die Planung.</p></section>`;
    const afterReady = saveRow();
    // Der Plan zeigt nur eine kleine, rechtsbündige Zeitangabe; der ganze Text öffnet die persönlichen Angaben.
    const planMeta = `${pre ? `Pensionierung mit ${item.plan.retirement.age}` : 'Planungsstart heute'} · Planung bis ${item.plan.retirement.targetAge}`;
    app.innerHTML = `${pageHeader('Mein Plan', {hidden:true})}<button type="button" class="v3-plan-meta" data-v3-next="personal" aria-label="${planMeta} – Persönliche Angaben bearbeiten"><span>${planMeta}</span><span class="v3-plan-meta-chevron" aria-hidden="true">›</span></button><div class="v3-plan-grid v3-plan-compact"><section>${readyContent}${p3Section(item)}</section><aside>${afterReady}</aside></div>`;
    bindPlan();
    renderSaveState();
    if (restore) window.scrollTo(0, planScrollY);
  }
  function bindPlan() {
    const range = document.getElementById('shareRange');
    const update = value => {
      const share = Math.max(0, Math.min(100, Math.round(numeric(value))));
      if (share !== chosenShare()) apply('pension', {...state.details.pension, pkShare:share});
      const item = evaluated(chosenShare());
      range.value = chosenShare();
      document.getElementById('shareValue').textContent = chosenShare();
      document.getElementById('previewReadout').innerHTML = readout(item);
      // Die Einkommensübersicht enthält die Steuerzeile samt ⓘ und wird hier mitaktualisiert.
      updateCompactSummary(item);
      document.getElementById('chosenVariantLabel').textContent = `${chosenShare()} % Kapital`;
      document.querySelector('.v3-cards').innerHTML = variantCards();
    };
    range?.addEventListener('input', event => update(event.target.value));
    app.querySelector('.v3-cards')?.addEventListener('click', event => {
      const button = event.target.closest('[data-variant-index]');
      if (button) update(benchmarkShares[numeric(button.dataset.variantIndex)]);
    });
    document.querySelector('[data-compare]')?.addEventListener('click', renderCompare);
    document.querySelector('[data-save]')?.addEventListener('click', save);
  }
  function toggleMenu() { const menu = document.getElementById('v3Menu'); const button = document.querySelector('.menu-button'); if (!menu || !button) return; menu.hidden = !menu.hidden; button.setAttribute('aria-expanded', String(!menu.hidden)); }
  function closeMenu() { const menu = document.getElementById('v3Menu'); const button = document.querySelector('.menu-button'); if (menu) menu.hidden = true; if (button) button.setAttribute('aria-expanded', 'false'); }
  function load() { try { const saved = JSON.parse(localStorage.getItem(storageKey) || 'null'); if (!saved || saved.version !== 1) throw Error('Kein gültiger V3-Stand.'); State.validate(saved.state); state = normalizeP3(saved.state); lastSavedAt = saved.savedAt ?? null; storageFailed = false; if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; } returnToPlan(); } catch (error) { message(error.message); } }
  /* Inhalt des Knopfs «Beispielplanung laden» auf «Meine Renten».
     Persönliche Planungswerte – bewusst an einer Stelle gebündelt, damit sie leicht ersetzt
     oder vor einem Commit wieder auf generische Beispieldaten zurückgestellt werden können. */
  const demoPlanung = {
    time: {age:61, retirement:65},
    // AHV 50'000 pro Jahr; das Feld führt CHF / Monat (50'000 / 12, auf zwei Stellen gerundet).
    regular: {canton:'AR', ahv:4166.67, other:0, additional:1000},
    need: {need:9000},
    // Bank/liquide Mittel 20'000 und Wertschriften 10'000 (ohne zusätzliche jährliche Anlage).
    assets: {cash:20000, securities:10000, saving:0},
    // PK-Sparbeiträge zusammen (Arbeitnehmer und Arbeitgeber) 50'000 pro Jahr.
    pension: {pk:850000, pkContrib:50000, pkShare:50},
    pension3a: {p3:234500, p3Contrib:0, p3Mode:'later', p3Accounts:[
      {name:'Helvetia', amount:160000, age:68},
      {name:'RB SG', amount:44500, age:66},
      {name:'RB Mö', amount:30000, age:70}
    ]}
  };
  function loadDemo() {
    try {
      state = State.fresh('pre'); state.riskProfile = 'balanced';
      apply('time', demoPlanung.time);
      apply('regular', demoPlanung.regular);
      apply('need', demoPlanung.need);
      apply('assets', demoPlanung.assets);
      apply('pension3a', demoPlanung.pension3a);
      apply('pension', demoPlanung.pension);
      // Verzinsung 3 %; der Planungshorizont kommt automatisch aus dem Alter (87).
      apply('assumptions', {...State.defaults, pkInterest:3, targetAge:state.targetAge, reviewed:true});
      renderPlan();
    } catch (error) { message(error.message); }
  }
  // Bind persistent navigation once, including readouts replaced during live previews.
  document.querySelector('.menu-button').addEventListener('click', toggleMenu);
  document.getElementById('v3Menu').addEventListener('click', event => {
    const button = event.target.closest('[data-menu-page]');
    if (button) openDetail(button.dataset.menuPage);
  });
  app.addEventListener('click', event => {
    const back = event.target.closest('[data-back]');
    const breakdown = event.target.closest('[data-pk-breakdown]');
    const vorsorge = event.target.closest('[data-open-vorsorge]');
    const next = event.target.closest('[data-v3-next]');
    const cancel = event.target.closest('[data-asset-cancel]');
    const asset = event.target.closest('[data-asset]');
    if (back) returnToPlan();
    else if (breakdown) openDetail('pension', 'pkBreakdown', 'pkKapital');
    else if (vorsorge) openDetail(vorsorge.dataset.openVorsorge, vorsorge.dataset.focusSection || '', vorsorge.dataset.focusHighlight || '');
    else if (next) openDetail(next.dataset.v3Next, next.dataset.focusSection || '', next.dataset.focusHighlight || '');
    else if (cancel) { assetPart = null; renderAssets(); }
    else if (asset) { assetPart = asset.dataset.asset; renderAssets(); }
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
  // Betragsfelder formatieren: beim Tippen nur am Feldende, beim Verlassen des Feldes immer.
  const amountTarget = event => event.target?.closest?.('input[data-amount]') ?? null;
  app.addEventListener('input', event => {
    const input = amountTarget(event);
    if (!input || input.selectionStart !== input.value.length) return;
    formatAmountField(input);
  });
  app.addEventListener('blur', event => { const input = amountTarget(event); if (input) formatAmountField(input); }, true);
  state.riskProfile = 'balanced';
  window.V3 = {save, load, planFor};
  setRentDraft(); renderForm('rents');
})();
