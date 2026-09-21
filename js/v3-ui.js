(() => {
  const app = document.getElementById('app');
  const State = CheckV2State;
  const Calculator = RetirementCalculator;
  const V3State = CheckV3State;
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
  // Ohne Kanton bleiben alle Ergebnisse ausdrücklich vorläufig.
  const hasCanton = (source = state) => !!State.canton(source);
  /* Steuerannahmen transparent machen: nur die hinterlegten kantonalen Modellsätze, kein neuer Tarif. */
  const taxLimitNotice = 'Modellrechnung, keine individuelle Steuerberechnung. Nicht berücksichtigt sind unter anderem die Vermögenssteuer und eine separate Steuer auf Zinsen und Dividenden. Die Säule-3a-Bezugssteuer wird nicht modelliert.';
  const p3TaxNotice = 'Zu Ruhestandsbeginn ist die gesamte Säule 3a einmalig im verfügbaren Kapital enthalten. Eine 3a-Bezugssteuer wird nicht modelliert; der Betrag ist kein steuerbereinigter Nettobetrag. Eine reale Staffelung der Bezüge ist in dieser V3 nicht abgebildet.';
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
    const glyph = `<span class="v3-info-glyph" aria-hidden="true">${Icons.icon('infoCircle', {size:18})}</span>`;
    const summary = iconOnly
      ? `<summary aria-label="${esc(aria)}">${glyph}</summary>`
      : `<summary><span class="v3-info-label">${label}</span>${glyph}</summary>`;
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
    if (!figures) return '<p class="v3-status pending">Steuern offen · Wohnkanton unter Persönliche Angaben ergänzen.</p>';
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
    if (!events.length) return '<h4>Kapitalbezüge</h4><p>Ohne PK-Kapitalbezug entsteht keine PK-Bezugssteuer. Die 3a-Bezugssteuer ist nicht modelliert.</p>';
    const note = '';
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
  const variantShares = () => V3State.variants(state);
  let previewShare = null;
  // Zuletzt gespeicherte Quote (Abzeichen «Neu» und Bestätigungszeile im Plan).
  let variantNotice = null;
  // Platz der Variante, deren Wert gerade im PK-Bezug geladen ist (Klick auf die Zeile).
  let editSlot = null;
  // Auswahl im Variantenvergleich und Zustand der standardmässig eingeklappten Grafik.
  let compareShare = null;
  let chartOpen = false;
  let storageBlocked = false;
  const chosenShare = () => state.mode === 'post' ? 0 : numeric(state.details.pension?.pkShare ?? 0);
  let chartObserver;
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
    if (storageBlocked) { node.textContent = 'Gespeicherter Stand geschützt: ungültige oder neuere Version. Kein Überschreiben.'; return; }
    if (storageFailed) { node.textContent = 'Speichern nicht möglich.'; return; }
    if (saveTimer) { node.textContent = 'Änderungen noch nicht gespeichert'; return; }
    const stamp = savedAtLabel(lastSavedAt);
    node.textContent = stamp ? `✓ Automatisch gespeichert | ${stamp}` : 'Noch nicht gespeichert';
  }
  // Schreiben in den lokalen Speicher; ohne technische Begriffe in der Oberfläche.
  function persist() {
    try {
      const stamp = new Date().toISOString();
      if (storageBlocked) { renderSaveState(); return; }
      state.position = route;
      state = normalizeP3(state);
      V3State.validate(state);
      localStorage.setItem(storageKey, JSON.stringify({version:2, savedAt:stamp, state}));
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
    // Der Wohnkanton bleibt optional; fehlende Steuern werden ausdrücklich ausgewiesen.
    // Die Steuerannahmen des gewählten Kantons liegen hinter dem ⓘ am Feld.
    if (field.type === 'canton') return `<div class="v3-field"><label for="${field.key}">${field.label}</label><select id="${field.key}" name="${field.key}" data-empty-label="Noch offen"><option value="" ${entered(value) ? '' : 'selected'}>Noch offen</option>${Object.entries(TaxModel.config.cantons).map(([key, canton]) => `<option value="${key}" ${value === key ? 'selected' : ''}>${key} · ${esc(canton.name)}</option>`).join('')}</select><div data-canton-tax>${taxAssumptionHint(value || State.canton(state))}</div></div>`;
    // Beträge zeigen Schweizer Tausendertrennzeichen; die Eingabe bleibt auf Mobile unkompliziert.
    const amount = isAmountField(field);
    const entry = amount
      ? `<input id="${field.key}" name="${field.key}" type="text" inputmode="decimal" autocomplete="off" data-amount ${field.optional ? '' : 'aria-required="true"'} value="${esc(formatAmount(value))}">`
      : `<input id="${field.key}" name="${field.key}" type="number" inputmode="decimal" min="${field.min ?? 0}" max="${field.max ?? 1e10}" step="${field.step ?? 'any'}" ${field.optional ? '' : 'aria-required="true"'} value="${esc(value)}">`;
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
  const normalizeP3 = source => V3State.normalize(source);
  function setDraft(group) { draft = {}; State.fields(group, state).forEach(field => { draft[field.key] = group === 'pension' && field.key === 'pkShare' ? chosenShare() : (state.details[group]?.[field.key] ?? state.values[field.key] ?? ''); }); }
  // Einstieg «Meine Renten»: Zeitpunkt, optionaler Wohnkanton und AHV in einer Gruppe.
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
  function apply(group, values) { state = State.apply(state, group, values); delete state.exampleValues; markDirty(); }
  function renderForm(routeName) {
    state = normalizeP3(state);
    route = routeName; markDirty();
    const isRents = routeName === 'rents';
    const title = isRents ? 'Meine Renten' : 'Mein Bedarf';
    const copy = isRents ? 'Welche Renten erwartest du? Beginne mit deiner AHV. Deine PK-Rente berechnen wir aus den Angaben deiner Pensionskasse.' : 'Lege deinen monatlichen Bedarf fest. Die PK-Varianten teilen diesen Bedarf und alle übrigen Annahmen.';
    const fields = isRents ? rentFields() : State.fields('need', state).map(field => ({...field, group:'need'}));
    const method = infoMarkup({label:'So rechnen wir', aria:'Rechenweg erklären', body:'<p>Die Berechnung verwendet den bestehenden gemeinsamen Rechenkern. Es werden keine Werte neben dem Rechner geschätzt.</p>'});
      app.innerHTML = `${pageHeader(title)}${stepper(routeName === 'rents' ? 'rents' : 'need')}<div class="v3-layout"><section class="v3-form"><p class="v3-lead">${copy}</p>${isRents ? '<button type="button" class="v3-demo-button" data-demo>Beispielplanung laden</button>' : ''}<form id="v3Form">${isRents ? `<div class="v3-field"><label for="startMode">Deine Situation</label><select id="startMode"><option value="pre" ${state.mode === 'pre' ? 'selected' : ''}>Vor der Pensionierung</option><option value="post" ${state.mode === 'post' ? 'selected' : ''}>Bereits pensioniert</option></select></div>` : ''}<div class="v3-fields">${fields.map(field => fieldMarkup(field)).join('')}</div>${isRents ? '<p class="v3-hint">Die PK-Angaben ergänzt du anschliessend auf «Mein Plan».</p>' : ''}<p class="v3-error" id="v3Error" role="alert"></p><div class="v3-actions"><button type="button" data-v3-back ${isRents ? 'hidden' : ''}>Zurück</button><button class="primary" type="submit">${isRents ? 'Weiter zu meinem Bedarf' : 'Meinen Plan öffnen'}</button></div></form></section><aside class="v3-aside"><strong>${isRents ? 'Der Plan entsteht aus deinen Angaben.' : 'Die PK-Entscheidung kommt im Plan.'}</strong>${method}${isRents ? '<button type="button" data-load>Gespeicherten Stand laden</button>' : ''}</aside></div>`;
    window.CantonPicker?.enhanceAll(app);
    document.querySelector('[data-load]')?.addEventListener('click', load);
    document.querySelector('[data-demo]')?.addEventListener('click', loadDemo);
    document.querySelector('[data-v3-back]')?.addEventListener('click', () => { setRentDraft(); renderForm('rents'); });
    document.getElementById('startMode')?.addEventListener('change', event => { assignForm(); state = V3State.changeMode(state, event.target.value); renderForm('rents'); });
    // Kantonswechsel aktualisiert die Steuerannahme direkt am Feld.
    document.getElementById('v3Form').addEventListener('change', updateCantonInfo);
    document.getElementById('v3Form').addEventListener('submit', submitForm);
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
    stopYearPlay();
    state = normalizeP3(state);
    closeMenu();
    previewShare = null;
    if (!State.timing(state)) { setRentDraft(); renderForm('rents'); return; }
    if (state.values.need === undefined) { setDraft('need'); renderForm('need'); return; }
    renderPlan(true);
  }
  // Whole PK situation for the chosen share: current split, running PK rent and PK capital together.
  function pensionBreakdown(source = state, share = previewShare ?? chosenShare()) {
    if (source.mode === 'post') return '<p class="v3-hint">Die tatsächlich laufende PK-Rente zählt zum Einkommen. Bereits bezogenes Kapital ist im verfügbaren Vermögen enthalten.</p>';
    const plan = planFor(share, source);
    if (!plan) return '<p class="v3-hint">Ergänze zuerst deine persönlichen Angaben, damit wir die Pensionskasse hochrechnen können.</p>';
    const pk = Calculator.calculatePension(plan), rentShare = 100 - share, code = plan.person.canton, capital = capitalTaxInfo(code, pk);
    return `<section id="pkBreakdown" class="v3-pk-breakdown" tabindex="-1" aria-labelledby="pkBreakdownTitle"><h2 id="pkBreakdownTitle">Deine PK-Situation</h2><p class="v3-hint">Hier siehst du deine PK-Rente, dein PK-Kapital und die aktuell gewählte Aufteilung bei Pensionierung mit ${plan.retirement.age}. Die Aufteilung wählst du unter «Mein Plan».</p><p class="v3-pk-split" data-pk-split><span>${share === chosenShare() ? 'Deine aktuelle Aufteilung' : 'Vorschau – aktueller Plan unverändert'}</span><strong>${rentShare} % Rente / ${share} % Kapital</strong></p><div class="v3-pk-cards"><section id="pkRente" class="v3-pk-card" tabindex="-1" aria-labelledby="pkRenteTitle"><h3 id="pkRenteTitle">PK-Rente</h3><p class="v3-pk-value"><strong data-pk-rent>${money(pk.rent / 12)}</strong><span> / Monat</span></p><small data-pk-rent-year>${money(pk.rent)} / Jahr</small></section><section id="pkKapital" class="v3-pk-card" tabindex="-1" aria-labelledby="pkKapitalTitle"><h3 id="pkKapitalTitle">PK-Kapital</h3><dl><div><dt>Brutto</dt><dd data-pk-gross>${money(pk.cap)}</dd></div><div><dt>Bezugssteuer</dt><dd data-pk-tax>${hasCanton(source) ? `− ${money(pk.capitalTax)}` : 'Steuern offen'}</dd></div><div><dt>${hasCanton(source) ? 'Netto' : 'Netto noch offen'}</dt><dd data-pk-net>${hasCanton(source) ? money(pk.netCap) : 'Steuern offen'}</dd></div></dl></section></div>${capital ? infoMarkup({label:'So rechnen wir mit der Bezugssteuer', aria:'Kapitalbezugssteuer erklären', body:capital.body}) : ''}</section>`;
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
    closeMenu(); chartObserver?.disconnect(); route = detail; markDirty(); assetPart = null;
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
    const hint = pension ? (state.mode === 'pre' ? 'Erfasse dein PK-Guthaben und die Sparbeiträge von dir und deinem Arbeitgeber zusammen. Kapitalanteil und Varianten wählst du unter «Mein Plan».' : 'Erfasse die PK-Rente, die du heute tatsächlich erhältst.') : detail === 'pension3a' ? 'Erfasse dein 3a-Guthaben heute und die jährlichen Beiträge bis zur Pensionierung.' : 'Änderungen gelten für deinen Plan und alle Varianten.';
    const p3Note = detail === 'pension3a' ? infoMarkup({label:'Säule 3a im Startkapital', body:`<p>${p3TaxNotice}</p>`}) : '';
    // Mechanik transparent: welche Rendite wo wirkt und wie das Kapital im Ruhestand aufgeteilt wird.
    const rateNote = detail === 'assumptions' ? infoMarkup({label:'So rechnen wir mit Renditen', aria:'Verwendete Renditen und Kapitalaufteilung erklären', body:rateBody()}) : '';
    app.innerHTML = `${pageHeader(editorTitles[detail])}<div class="v3-detail-layout"><section class="v3-detail-form"><p class="v3-sublead">${hint}</p><form id="v3DetailForm">${modeField}<div class="v3-fields" id="detailFields" tabindex="-1">${fields.map(fieldMarkup).join('')}</div>${p3Note}${rateNote}<p class="v3-error" id="v3Error" role="alert"></p><div id="pensionResult">${pension ? pensionBreakdown() : ''}</div><div class="v3-actions"><button type="button" data-detail-back>Abbrechen</button><button class="primary" type="submit">Übernehmen</button></div></form></section></div>`;
    window.CantonPicker?.enhanceAll(app);
    document.querySelector('[data-detail-back]').addEventListener('click', returnToPlan);
    const form = document.getElementById('v3DetailForm');
    // Delegiert, damit die Steuerannahme auch nach einem erneuten Rendern der Felder mitzieht.
    form.addEventListener('change', updateCantonInfo);
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
            const mode = document.getElementById('personMode').value;
          const next = State.apply(V3State.changeMode(state, mode), 'time', draft);
          state = State.apply(next, 'tax', {canton:draft.canton});
        } else if (['ahv','extra'].includes(detail)) apply('income', {...incomeValues(), ...draft});
        else if (detail === 'assumptions') { apply('assumptions', {...assumptionValues(), ...draft}); delete state.p3MigrationNotice; }
        else apply(detail, {...state.details[detail], ...draft});
        delete state.exampleValues; markDirty();
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
    const b = State.breakdown(s), pre = s.mode === 'pre', projection = 'voraussichtlich zum Pensionierungszeitpunkt';
    const rest = b.assets.unallocated;
    const p3Available = b.assets.p3;
    const p3Info = infoMarkup({label:'Säule 3a im Startkapital', body:`<p>${p3TaxNotice}</p>`});
    const capital = pre ? capitalTaxInfo(State.canton(s), b.pk) : null;
    return `<p class="v3-hint">${pre ? `Verfügbare Mittel ab Pensionierung mit ${s.values.retirement}` : `Verfügbare Mittel ab Alter ${s.values.age}`}</p><div class="v3-assets">
     ${assetRowMarkup({part:'cash', label:'Bank / liquide Mittel', value:b.assets.cash})}
     ${assetRowMarkup({part:'securities', label:'Wertschriften', value:b.assets.securities, hint:pre ? projection : ''})}
     ${assetRowMarkup({part:'otherAssets', label:'Weitere verfügbare Vermögenswerte', value:b.assets.other})}
     ${rest !== null && rest > 0 ? assetRowMarkup({part:'unallocated', label:'Noch nicht aufgeteiltes Vermögen', value:rest, hint:'Rest deiner bisherigen Gesamtsumme'}) : ''}
     ${pre ? assetRowMarkup({source:'pension3a', label:'Säule 3a', value:p3Available, hint:projection, badge:'aus Vorsorge', info:p3Info}) : ''}
     ${pre ? assetRowMarkup({source:'pension', label:hasCanton(s) ? 'PK-Kapital netto' : 'PK-Kapital brutto', value:b.assets.pk, hint:hasCanton(s) ? 'gemäss deinem aktuellen Plan' : 'Steuern offen', badge:'aus Vorsorge', focus:'pkBreakdown', highlight:'pkKapital', info:capital ? infoMarkup({label:'So rechnen wir mit der Bezugssteuer', aria:'Kapitalbezugssteuer erklären', body:capital.body}) : ''}) : ''}
    </div><dl class="v3-asset-total" id="assetTotal" tabindex="-1"><div><dt>Verfügbares Vermögen total</dt><dd>${money(b.result.availableCapital)}</dd></div></dl><p class="v3-hint">${pre ? 'Säule 3a ist einmal enthalten, ohne modellierte 3a-Bezugssteuer. PK-Kapital gemäss aktuellem Plan; ohne Kanton vorläufig vor Bezugssteuer.' : 'Bereits bezogenes PK- und 3a-Kapital ist in deinen verfügbaren Mitteln enthalten und wird nicht nochmals hinzugezählt.'}</p><section class="v3-bound-assets"><h2>Gebundenes Vermögen</h2>${assetRowMarkup({part:'property', label:'Immobilien netto', value:b.assets.bound, hint:'Immobilienwert abzüglich Hypotheken'})}<p class="v3-hint">Dieses Vermögen ist aktuell nicht für laufende Entnahmen eingeplant.</p></section>`;
  }
  function renderAssets(focusSection = '') {
    closeMenu(); chartObserver?.disconnect();
    if (!State.timing(state) || state.values.need === undefined) { returnToPlan(); return; }
    route = 'assets'; markDirty();
    window.scrollTo(0, 0);
    app.innerHTML = `${pageHeader('Vermögen')}<div class="v3-detail-layout"><section class="v3-detail-form"><p class="v3-sublead">Dein verfügbares Vermögen besteht aus Bank, Wertschriften und weiteren verfügbaren Vermögenswerten. Vorsorgebeträge werden nur angezeigt; Immobilien netto bleiben als gebundenes Vermögen getrennt.</p>${assetComposition(state)}${backRow()}</section></div>`;
    app.querySelectorAll('[data-asset-form]').forEach(form => form.addEventListener('submit', event => {
      event.preventDefault();
      const values = Object.fromEntries([...form.querySelectorAll('input')].filter(input => input.name).map(input => [input.name, amountValue(input.value)]));
      try { state = State.applyAsset(state, form.dataset.assetForm, values, {keepOptional:true}); assetPart = null; delete state.exampleValues; markDirty(); renderAssets(); }
      catch (error) { form.querySelector('.v3-error').textContent = error.message; }
    }));
    if (focusSection) focusTarget(focusSection);
  }
  // Screens ohne eigene Formularaktion (Vermögen, Vergleich) brauchen einen Weg zurück zum Plan.
  const backRow = () => '<div class="v3-actions v3-actions-back"><button type="button" data-back>← Mein Plan</button></div>';
  function openDetail(name, focusSection = '', focusHighlight = '') {
    stopYearPlay();
    state = normalizeP3(state);
    if (route === 'plan') planScrollY = window.scrollY || 0;
    assetPart = null;
    if (name === 'assets') renderAssets(focusSection);
    else if (name === 'plan') returnToPlan();
    else if (name === 'years') renderYearByYear();
    else renderDetail(name, focusSection, focusHighlight);
  }
  // Sämtliche Ergebniswerte kommen aus dem gemeinsamen Rechenkern.
  function planFor(share, source = state) {
    const plan = State.toPlan(normalizeP3(source));
    if (plan && source.mode === 'pre') plan.pensionDecision.capitalShare = share;
    return plan;
  }
  function evaluated(share, source = state) { const plan = planFor(share, source); return plan ? {plan, result:Calculator.evaluatePlan(plan), pension:Calculator.calculatePension(plan)} : null; }
  function readout(item) {
    return `<div class="v3-readout"><button type="button" class="v3-readout-tile" data-v3-next="pension" data-focus-section="pkBreakdown" data-focus-highlight="pkRente"><span>${Icons.icon('buildingBank', {size:18})} PK-Rente / Monat</span><strong>${money(item.pension.rent / 12)}</strong></button><button type="button" class="v3-readout-tile" data-pk-breakdown><span>${Icons.icon('pigMoney', {size:18})} ${hasCanton() ? 'PK-Kapital netto' : 'PK-Kapital brutto'}</span><strong>${money(item.pension.netCap)}</strong>${hasCanton() ? '' : '<small>Steuern offen</small>'}</button></div>`;
  }
  function currentVariants() { return variantShares().map((share, index) => ({share, index, ...evaluated(share)})).filter(item => item.plan); }
  /* «Weiteres Kapital»: alles, was zusätzlich zum PK-Bezug zum Start verfügbar ist.
     Die Zusammensetzung kommt aus dem Datenmodell (3a, Wertschriften, Bank, weitere Mittel). */
  function furtherCapital(s, item) {
    const projected = Calculator.calculateRetirementStart(item.plan);
    const a = s.details.assets ?? null, pre = s.mode === 'pre';
    // Ohne Vermögensaufteilung ist der eingegebene Gesamtbetrag der freie Teil;
    // mit Aufteilung zählt ausschliesslich der dort geführte Rest (wie im Rechenkern).
    const free = a ? (a.unallocated !== undefined ? numeric(a.unallocated) : 0) : (s.values.free !== undefined ? numeric(s.values.free) : null);
    const rows = [
      ['Säule 3a', pre && s.details.pension3a ? projected.p3 : null],
      ['Freies Vermögen', free],
      ['Wertschriften', pre && entered(a?.securities) ? projected.sec : (entered(a?.securities) ? numeric(a.securities) : null)],
      ['Bank / liquide Mittel', entered(a?.cash) ? numeric(a.cash) : null],
      ['Weitere Kapitalpositionen', entered(a?.otherAssets) ? numeric(a.otherAssets) : null]
    ].filter(([, value]) => value !== null && value > 0.5);
    const total = rows.reduce((sum, [, value]) => sum + value, 0);
    return {rows, total};
  }
  function p3Section(item) {
    if (!item || item.plan.person.mode !== 'pre') return '';
    const {rows, total} = furtherCapital(state, item);
    if (!rows.length) return '';
    const body = `${rows.map(([label, value]) => yearLine(label, money(value))).join('')}${yearLine('Gesamt', money(total), {total:true})}<p class="v3-year-note">Dieses Kapital steht zusätzlich zu deinem PK-Bezug für deine Planung zur Verfügung.</p>`;
    return infoMarkup({label:`Weiteres Kapital ${money(total)}`, aria:'Weiteres Kapital aufschlüsseln', body});
  }
  function marker(index) { return index === 0 ? '●' : index === 1 ? '■' : '◆'; }
  const splitLabel = share => share === 0 ? 'Nur PK-Rente' : share === 100 ? 'Keine PK-Rente' : `${share} % Kapital · ${100 - share} % Rente`;
  /* «···»-Menü: wählt ausschliesslich, ob diese Variante der aktuelle Plan ist.
     Alle Varianten sehen identisch aus – kein Sonderzustand, kein Entfernen. */
  function variantMenu(share) {
    const current = share === chosenShare();
    return `<details class="v3-variant-menu"><summary aria-label="Aktionen für ${share} Prozent Kapital">···</summary><div><button type="button" data-adopt-variant="${share}"${current ? ' disabled aria-current="true"' : ''}>${current ? 'Aktueller Plan' : 'Als aktuellen Plan übernehmen'}</button></div></details>`;
  }
  /* Kompakte Variantenzeile: für alle Varianten identisch aufgebaut (Quote, Kennzahlen, ···). */
  function variantCards() {
    return `<ul class="v3-variant-list">${variantShares().map((share, index) => {
      const item = evaluated(share);
      const cap = item ? Calculator.calculateAvailableCapital(item.plan, share) : null;
      const detail = item ? `<small class="v3-variant-values">PK-Rente ${money(item.pension.rent / 12)} · Startkapital ${money(item.result.availableCapital)}</small><small class="v3-variant-values">PK-Kapital netto ${money(cap.netPkCapitalWithdrawal)}</small>` : '';
      return `<li class="v3-variant-row${share === (previewShare ?? chosenShare()) ? ' editing' : ''}"><button type="button" class="v3-variant-select" data-variant-index="${index}"${share === chosenShare() ? ' aria-current="true"' : ''}><span class="v3-variant-main"><strong>${share} % Kapital</strong>${detail}</span></button>${variantMenu(share)}</li>`;
    }).join('')}</ul>`;
  }
  // Kompakte Achsenbeschriftung (Mio./k) und reine Wertangabe für die Endlabels.
  const axisLabel = value => {
    const grouped = (number, digits) => Number(number).toLocaleString('de-CH', {maximumFractionDigits:digits}).replace(/’/g, "'");
    if (value >= 1000000) return `${grouped(value / 1000000, 1)} Mio.`;
    if (value >= 1000) return `${grouped(value / 1000, 0)} k`;
    return grouped(value, 0);
  };
  const plainMoney = value => Math.round(value || 0).toLocaleString('de-CH').replace(/’/g, "'");
  const lineColor = (selected, index) => selected ? '#283b43' : ['#6f7b7b', '#6f675e', '#536477'][index % 3];
  const isSelectedLine = (row, rows) => row.share === chosenShare();
  function chartLegend(rows) {
    return rows.map((row, index) => `<li><span class="v3-marker marker-${index}">${marker(index)}</span>${row.share} % Kapital${row.share === chosenShare() ? ' · Aktueller Plan' : ''}</li>`).join('');
  }
  // Flachere Grafik als früher: mobil rund 200 px, auf Desktop grosszügiger (Spec §11).
  function chart(rows, width, height = width >= 700 ? 260 : 200) {
    const points = rows.flatMap(row => row.result.yearlyProjection.map(entry => entry.free));
    // Match SVG units to CSS pixels so labels and markers stay legible on mobile.
    const maximum = Math.max(1, ...points), left = Math.max(52, axisLabel(maximum).length * 7 + 14), right = 62, top = 14, bottom = 30, plotWidth = Math.max(60, width - left - right), plotHeight = height - top - bottom;
    const y = value => top + plotHeight - (value / maximum) * plotHeight;
    const grid = [0, .5, 1].map(ratio => `<line class="v3-grid" x1="${left}" x2="${width - right}" y1="${y(maximum * ratio)}" y2="${y(maximum * ratio)}"></line><text x="${left - 10}" text-anchor="end" y="${y(maximum * ratio) + 5}">${axisLabel(maximum * ratio)}</text>`).join('');
    const labels = rows.map((row,index) => ({index, y:y(row.result.yearlyProjection.at(-1).free)})).sort((a,b) => a.y-b.y);
    labels.forEach((entry,i) => { entry.y = Math.max(entry.y, i ? labels[i-1].y + 16 : top); });
    if (labels.at(-1)?.y > height-bottom) { const overflow=labels.at(-1).y-(height-bottom); labels.forEach(entry => entry.y -= overflow); }
    const lines = rows.map((row, index) => { const series = row.result.yearlyProjection, coordinates = series.map((entry, i) => `${left + (i / Math.max(1, series.length - 1)) * plotWidth},${y(entry.free)}`).join(' '), selected = isSelectedLine(row, rows), dash = index === 1 ? ' stroke-dasharray="9 6"' : index === 2 ? ' stroke-dasharray="2 6"' : '', color = lineColor(selected, index), markers = [0, Math.floor((series.length - 1) / 2), series.length - 1].filter((value, position, all) => all.indexOf(value) === position).map(i => { const x = left + (i / Math.max(1, series.length - 1)) * plotWidth; const cy = y(series[i].free); return index === 0 ? `<circle cx="${x}" cy="${cy}" r="4" fill="${color}"></circle>` : index === 1 ? `<rect x="${x - 3}" y="${cy - 3}" width="6" height="6" fill="${color}"></rect>` : `<path d="M ${x} ${cy - 5} L ${x + 5} ${cy} L ${x} ${cy + 5} L ${x - 5} ${cy} Z" fill="${color}"></path>`; }).join(''), end = series.at(-1); return `<polyline data-chart-share="${row.share}" points="${coordinates}" fill="none" stroke="${color}" stroke-width="${selected ? 3.5 : 1.8}" opacity="${selected ? 1 : .7}"${dash}></polyline>${markers}<text class="v3-chart-value" x="${left + plotWidth + 8}" y="${labels.find(entry => entry.index === index).y + 4}">${plainMoney(end.free)}</text>`; }).join('');
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
  function planSummary(item) {
    const result = item.result, known = dataKnown();
    const next = !known.assets ? '<button type="button" class="v3-next-row" data-v3-next="assets">Vermögen ergänzen <span>›</span></button>' : '';
    const taxNext = !hasCanton() ? '<button type="button" class="v3-next-row" data-v3-next="personal">Wohnkanton ergänzen <span>›</span></button>' : '';
    return `<section class="v3-overview"><div class="v3-summary"><div><span>${hasCanton() ? 'Einnahmen nach geschätzten Steuern' : 'Einnahmen vor Steuern'}</span><strong>${money(result.monthlyIncomeNet)} / Monat</strong></div><div><span>Bedarf</span><strong>${money(result.monthlyNeed)} / Monat</strong></div><div><span>Noch zu decken</span><strong>${money(result.monthlyGap)} / Monat</strong></div></div>${known.assets ? '<p class="v3-complete">✓ Vermögen im Plan berücksichtigt</p>' : ''}<p class="v3-hint">${hasCanton() ? 'Nach geschätzten Steuern' : 'Vor Steuern'} · erste Orientierung${known.pension ? '' : ' · PK-Angaben noch offen'}</p></section>${next || taxNext ? `<section class="v3-settle"><h2>Plan festigen</h2>${next}${taxNext}</section>` : ''}`;
  }
  // Qualitative Finanzierungsaussage: nur mit erfassten Daten, sonst neutraler Hinweis (Spec §5).
  function prognosisMarkup(item) {
    const result = item.result;
    if (!hasCanton()) return '<div class="v3-status pending">Steuern offen · vorläufige Modellrechnung ohne Steuerabzug.</div>';
    if (!dataKnown().ready) return '<div class="v3-status pending">Vervollständige deinen Plan, um die langfristige Entwicklung zu sehen.</div>';
    return `<div class="v3-status ${result.capitalExhaustionAge ? 'gap' : 'covered'}">${result.capitalExhaustionAge ? `Finanzierungslücke voraussichtlich ab Alter ${result.capitalExhaustionAge}.` : `Unter den gewählten Annahmen bis Alter ${item.plan.retirement.targetAge} finanzierbar.`}</div>`;
  }
  function compactReadySummary(item) {
    const result = item.result, sources = Calculator.incomeSourcesAtStart(item.plan);
    const source = id => sources.find(entry => entry.id === id)?.annualIncome / 12 || 0;
    const row = (label, amount, page, focus = '', highlight = '') => `<button type="button" class="v3-summary-row" data-v3-next="${page}"${focus ? ` data-focus-section="${focus}"` : ''}${highlight ? ` data-focus-highlight="${highlight}"` : ''}><span>${label}</span><strong>${money(amount)} ${Icons.icon('chevronRight', {size:16})}</strong></button>`;
    const other = source('other'), additional = source('additional');
    const pensionsGross = source('ahv') + source('pk') + other;
    const additionalRows = sources.filter(entry => !['ahv', 'pk', 'other', 'additional'].includes(entry.id) && entry.annualIncome > 0);
    return `<div class="v3-summary-block"><details class="v3-income-sources"><summary>Renten und Steuern im Detail</summary>${row('AHV', source('ahv'), 'ahv', 'detailFields')}${row('PK-Rente', source('pk'), 'pension', 'pkBreakdown', 'pkRente')}${other > 0 ? `<div class="v3-rent-row">${row('Weitere Renten', other, 'extra', 'detailFields')}${infoMarkup({iconOnly:true, aria:'Weitere Renten erläutern', body:`<p>Weitere Renten: ${money(other)} / Monat</p>`})}</div>` : ''}<div class="v3-pension-total"><span>Renten gesamt · vor Steuern</span><strong>${money(pensionsGross)} / Monat</strong></div>${additional > 0 ? row('Weitere Einnahmen', additional, 'extra', 'detailFields') : ''}${additionalRows.map(entry => `<div class="v3-source-line"><span>${esc(entry.name)}</span><strong>${money(entry.annualIncome / 12)}</strong></div>`).join('')}${taxRow(item)}<div class="v3-income-total"><span>${hasCanton() ? 'Einkommen netto' : 'Einkommen vor Steuern'}</span><strong>${money(result.monthlyIncomeNet)} / Monat</strong></div></details><div class="v3-compact-summary">${row(hasCanton() ? 'Einkommen netto / Monat' : 'Einkommen vor Steuern / Monat', result.monthlyIncomeNet, 'ahv', 'detailFields')}${row('Bedarf / Monat', result.monthlyNeed, 'need', 'detailFields')}<div class="v3-gap-value"><span>Monatlich offen</span><strong>${money(result.monthlyGap)}</strong></div>${row('Verfügbares Vermögen', result.availableCapital, 'assets', 'assetTotal')}</div>${prognosisMarkup(item)}<p class="v3-compact-note">${hasCanton() ? 'Nach geschätzten Steuern' : 'Steuern offen'} · Modellrechnung unter deinen Annahmen.</p></div>`;
  }
  /* Topf-Kacheln mit Anteil und Balken: Ausgangslage im Vergleich und Vermögen am
     Jahresanfang. Die Werte stammen unverändert aus den Töpfen der Jahresengine.
     «Total» steht rechts in der Titelzeile, nicht als eigene Kachel. */
  const potGlyph = ['cash', 'chartBar', 'trendingUp'];
  function potTotal(values, total = null) {
    const sum = total ?? values.reduce((a, b) => a + b, 0);
    return `<p class="v3-pot-total"><span>Total</span><strong>${money(sum)}</strong></p>`;
  }
  function potTiles(values, {total = null} = {}) {
    const sum = total ?? values.reduce((a, b) => a + b, 0);
    const share = value => sum > 0 ? Math.round(value / sum * 100) : 0;
    const tile = (name, value, key, glyph) => `<li class="v3-pot-tile pot-${key}"><span class="v3-pot-icon" aria-hidden="true">${Icons.icon(glyph, {size:20})}</span><span class="v3-pot-name">${name}</span><strong>${money(value)}</strong><span class="v3-pot-share">${share(value)} %</span><span class="v3-pot-bar" aria-hidden="true"><span style="width:${share(value)}%"></span></span></li>`;
    return `<ul class="v3-pot-tiles">${potMeta.map((meta, index) => tile(meta[0], values[index], meta[2], potGlyph[index])).join('')}</ul>`;
  }
  // Variantenvergleich: Auswahl oben, Ausgangslage der Töpfe, Übernahme, eingeklappte Grafik.
  function renderCompare() {
    window.scrollTo(0, 0);
    route = 'compare'; markDirty();
    chartObserver?.disconnect();
    const share = chosenShare(), benchmark = currentVariants();
    const targetAge = benchmark[0]?.plan.retirement.targetAge ?? evaluated(share).plan.retirement.targetAge;
    const startAge = benchmark[0]?.plan.retirement.age ?? evaluated(share).plan.retirement.age;
    if (compareShare === null || !variantShares().includes(compareShare)) compareShare = share;
    const selected = compareShare;
    const chosenItem = benchmark.find(item => item.share === selected) ?? benchmark[0];
    /* Gleiche Kennzahlen und gleiche Reihenfolge in jeder Variantenkarte (Spec: identische Darstellung).
       Jede Kennzahl ist über ⓘ erklärt; die Erklärung ist für alle Karten dieselbe. */
    const metricInfo = {
      totalRent: infoMarkup({iconOnly:true, aria:'Total-Rente erklären', body:'<p>AHV und alle Renten zusammen, pro Monat und vor Steuern.</p>'}),
      start: infoMarkup({iconOnly:true, aria:'Startkapital erklären', body:'<p>Alles, was dir zum Start der Pensionierung zur Verfügung steht: PK-Kapital netto plus weiteres Kapital (Säule 3a, Wertschriften, Bank und weitere Mittel).</p>'}),
      target: infoMarkup({iconOnly:true, aria:'Vermögen am Zielalter erklären', body:`<p>Verfügbares Kapital am Ende des Planungshorizonts (Alter ${targetAge}), in heutiger Kaufkraft und ohne gebundenes Immobilienkapital.</p>`}),
      rent: infoMarkup({iconOnly:true, aria:'PK-Rente erklären', body:'<p>Laufende Rente aus dem nicht bezogenen PK-Anteil, pro Monat und vor Steuern.</p>'}),
      pkNet: infoMarkup({iconOnly:true, aria:'PK-Kapital netto erklären', body:'<p>Bezogenes PK-Kapital nach der geschätzten Kapitalbezugssteuer. Bestehendes freies Vermögen wird nicht damit belastet.</p>'})
    };
    const metric = (label, value, info) => `<div class="v3-compare-metric"><span>${label} ${info}</span><strong>${money(value)}</strong></div>`;
    const comparison = benchmark.map(item => {
      const current = item.share === share;
      const capital = Calculator.calculateAvailableCapital(item.plan, item.share);
      const sources = Calculator.incomeSourcesAtStart(item.plan).reduce((map, entry) => ({...map, [entry.id]: entry.annualIncome}), {});
      const totalRent = ((sources.ahv ?? 0) + (sources.pk ?? 0) + (sources.other ?? 0)) / 12;
      return `<li class="v3-compare-card${item.share === selected ? ' selected' : ''}${current ? ' current' : ''}"><div class="v3-compare-head"><button type="button" class="v3-compare-select" data-compare-share="${item.share}" role="radio" aria-checked="${item.share === selected}"><span class="v3-compare-check" aria-hidden="true">${item.share === selected ? '✓' : ''}</span><span class="v3-compare-main"><span class="v3-compare-title"><strong>${item.share} % Kapital</strong>${current ? '<span class="v3-compare-badge">Aktueller Plan</span>' : ''}</span><small>${splitLabel(item.share)}</small></span></button><span class="v3-compare-chevron" aria-hidden="true">${Icons.icon('chevronRight', {size:18})}</span></div><div class="v3-compare-metrics">${metric('Total-Rente / Monat', totalRent, metricInfo.totalRent)}${metric('Startkapital', item.result.availableCapital, metricInfo.start)}${metric(`Vermögen mit ${targetAge}`, item.result.capitalAtTargetAge, metricInfo.target)}${metric('PK-Rente / Monat', item.pension.rent / 12, metricInfo.rent)}${metric('PK-Kapital netto', capital.netPkCapitalWithdrawal, metricInfo.pkNet)}</div></li>`;
    }).join('');
    const chartInfo = infoMarkup({iconOnly:true, aria:'Kapitalentwicklung erklären', body:`<p>Verfügbares Kapital über die Ruhestandsjahre ab Alter ${startAge}. Der Anfangsbetrag hängt vom gewählten PK-Kapitalanteil ab. Die Beträge zeigen Kaufkraft zu Beginn deiner Pensionierung. Immobilien bleiben getrennt. Die stärkere Linie kennzeichnet ausschliesslich deinen aktuellen Plan.</p>`});
    const buckets = chosenItem ? chosenItem.result.bucketAllocation : [0, 0, 0];
    const chosenCapital = chosenItem ? Calculator.calculateAvailableCapital(chosenItem.plan, selected) : null;
    const further = chosenItem ? furtherCapital(state, chosenItem) : {rows:[], total:0};
    const startLine = chosenCapital
      ? `<p class="v3-compare-sub">PK netto ${money(chosenCapital.netPkCapitalWithdrawal)} + weiteres Kapital ${money(further.total)}</p>`
      : '';
    const help = infoMarkup({label:'So funktioniert der Variantenvergleich', aria:'Variantenvergleich erklären', body:`<p>Mehr laufende Rente oder mehr Kapital zu Beginn: Alle Varianten verwenden denselben Bedarf, dieselben Annahmen und denselben Horizont; nur der PK-Kapitalanteil unterscheidet sich.</p><p>Die Ausgangslage zeigt, wie dein Startkapital zu Beginn der Pensionierung auf die drei Töpfe verteilt ist. Der Fehlbetrag einzelner Jahre wird zuerst aus dem Geldmarkttopf genommen; reicht dieser nicht, werden die weiteren Töpfe gemäss Strategie genutzt.</p>`});
    app.innerHTML = `${pageHeader('Varianten vergleichen', {back:'← Zurück zu Mein Plan'})}<div class="v3-compare"><p class="v3-compare-sub">Wähle eine Variante und vergleiche die wichtigsten Kennzahlen sowie die Ausgangslage deiner Planung.</p>${!hasCanton() ? '<p class="v3-hint">Steuern offen · vorläufig ohne Steuerabzug.</p>' : ''}${!dataKnown().ready ? '<p class="v3-hint">Vorläufig: verfügbare Vermögenswerte noch nicht erfasst.</p>' : ''}<h2 class="v3-compare-title">${Icons.icon('arrowsExchange', {size:20})} Deine Varianten</h2><ul class="v3-compare-list" role="radiogroup" aria-label="Variante auswählen">${comparison}</ul><button type="button" class="primary v3-adopt" data-adopt-compare${selected === share ? ' disabled' : ''}>${Icons.icon('circleCheck', {size:18})} Als aktuellen Plan übernehmen</button><section class="v3-compare-start"><div class="v3-pot-heading"><h3>Ausgangslage zum Start der Pensionierung (Alter ${startAge})</h3><span class="v3-pot-total"><span>Startkapital</span><strong>${money(chosenCapital ? chosenCapital.totalInvestableCapital : 0)}</strong></span></div><p class="v3-compare-sub">So ist dein Startkapital zu Beginn der Planung aufgeteilt.</p>${startLine}${potTiles(buckets)}<p class="v3-compare-note"><span aria-hidden="true">${Icons.icon('infoCircle', {size:18})}</span> Der Fehlbetrag in einzelnen Jahren wird zuerst aus dem Geldmarkttopf genommen. Reicht dieser nicht aus, werden die weiteren Töpfe gemäss Strategie genutzt.</p></section><section class="v3-chart-card"><div class="v3-chart-head"><span class="v3-chart-icon" aria-hidden="true">${Icons.icon('chartLine', {size:20})}</span><span class="v3-chart-title">Kapitalentwicklung bis Alter ${targetAge}</span>${chartInfo}</div>${chartOpen ? `<div class="v3-chart-body" id="compareChart"><div class="v3-chart-container"></div><ul class="v3-chart-legend" data-chart-legend></ul><button type="button" class="v3-chart-foot" data-chart-toggle>Kapitalentwicklung ausblenden ${Icons.icon('chevronUp', {size:18})}</button></div>` : `<button type="button" class="v3-chart-more" data-chart-toggle>Kapitalentwicklung anzeigen ${Icons.icon('chevronDown', {size:18})}</button>`}</section>${help}<button type="button" class="v3-year-link" data-v3-next="years">${Icons.icon('calendarStats', {size:20})} So funktioniert deine Planung Jahr für Jahr ${Icons.icon('chevronRight', {size:18})}</button></div>`;
    bindCompare();
  }
  /* Grafik und Legende erst zeichnen, wenn der Bereich sichtbar ist.
     Der Vorschauwert erscheint zusätzlich, solange er nicht gespeichert ist. */
  function bindCompare() {
    const draw = () => {
      const container = app.querySelector('.v3-chart-container');
      if (!container) return;
      const share = chosenShare(), benchmark = currentVariants();
      const rows = previewShare !== null && previewShare !== share && !variantShares().includes(previewShare)
        ? [...benchmark, {share:previewShare, ...evaluated(previewShare)}].filter(item => item.plan)
        : benchmark;
      const width = container.getBoundingClientRect().width;
      if (!width) return;
      container.innerHTML = chart(rows, width);
      const legend = app.querySelector('[data-chart-legend]');
      if (legend) legend.innerHTML = chartLegend(rows);
    };
    const container = app.querySelector('.v3-chart-body');
    if (container) {
      draw();
      chartObserver = new ResizeObserver(draw);
      chartObserver.observe(app.querySelector('.v3-chart-container'));
    }
    app.querySelectorAll('[data-chart-toggle]').forEach(button => button.addEventListener('click', () => { chartOpen = !chartOpen; renderCompare(); }));
    app.querySelectorAll('[data-compare-share]').forEach(button => button.addEventListener('click', () => { compareShare = numeric(button.dataset.compareShare); renderCompare(); }));
    app.querySelector('[data-adopt-compare]')?.addEventListener('click', () => {
      try { state = V3State.activate(state, compareShare); variantNotice = null; previewShare = null; markDirty(); renderCompare(); }
      catch(error) { message(error.message); }
    });
  }
  /* «Jahr für Jahr»: ein Jahr der bestehenden Simulation Schritt für Schritt.
     Keine zweite Rechnung: alle Werte stammen aus evaluatePlan().yearlyProjection
     (Einnahmen je Quelle, Steuern, Bedarf, Kapitalbedarf, Töpfe, Rendite je Topf,
     Umbuchungen, Endkapital) sowie aus capitalWithdrawalEvents() für PK- und 3a-Bezüge. */
  const potMeta = [['Geldmarkt','1 Jahr','cash'],['Obligationen','2 Jahre','bonds'],['Wertschöpfung','Rest','growth']];
  const yearState = {age:null, timer:null, mode:null, cache:null};
  function yearShare() { return chosenShare(); }
  function yearData(share = yearShare()) {

    const plan = planFor(share);
    if (!plan) return null;
    const result = Calculator.evaluatePlan(plan);
    const rows = result.yearlyProjection.filter(row => !row.terminal);
    if (!rows.length) return null;
    const data = {plan, result, rows, share, events:Calculator.capitalWithdrawalEvents(plan, share), rates:plan.scenarios?.returns ?? [0, 1, 6]};
    yearState.cache = {share, data};
    return data;
  }
  function yearLine(label, value, {total = false, note = ''} = {}) {
    return `<div class="v3-year-line${total ? ' total' : ''}"><span>${label}${note ? ` <small>${note}</small>` : ''}</span><strong>${value}</strong></div>`;
  }
  /* Ein Jahr der Simulation als kompaktes Dashboard: Einkommen, Bedarf/Fehlbetrag,
     die drei Töpfe, das Vermögen am Jahresende und die vollständige Berechnung.
     Ein Jahr wird mit dem erreichten Alter beschriftet (Zeile age = Startalter des Jahres).
     Alle Werte stammen unverändert aus evaluatePlan().yearlyProjection. */
  /* Eine Sprache für die drei Töpfe: gleiche Reihenfolge, gleiche Namen, gleiche
     Beschriftungen und gleiche Farben in Kacheln, Karten, Balken und Legende. */
  function yearPotCard(index, row, active) {
    const [, , key] = potMeta[index];
    const take = row.takes ? row.takes[index] : 0;
    const line = (label, value, cls = '') => `<div class="v3-pot-line${cls ? ` ${cls}` : ''}"><span>${label}</span><strong>${value}</strong></div>`;
    return `<li class="v3-pot-card pot-${key}${active ? ' active' : ''}"><span class="v3-pot-icon" aria-hidden="true">${Icons.icon(potGlyph[index], {size:20})}</span><span class="v3-pot-name">${potMeta[index][0]}</span>${line('Bestand Jahresanfang', money(row.buckets[index]))}${line('Entnahme', take > 0.5 ? `− ${money(take)}` : money(0), take > 0.5 ? 'negative' : '')}${line('Bestand Jahresende', money(row.endBuckets[index]), 'end')}</li>`;
  }
  function yearPots(row) {
    const active = row.takes ? row.takes.findIndex(take => take > 0.5) : -1;
    return `<ul class="v3-pot-cards">${potMeta.map((_, index) => yearPotCard(index, row, index === active)).join('')}</ul>`;
  }
  function yearWealth(row) {
    const total = row.end, delta = row.net;
    const shares = row.endBuckets.map(value => total > 0 ? value / total * 100 : 0);
    const segments = row.endBuckets.map((value, index) => `<span class="seg-${potMeta[index][2]}" style="width:${shares[index].toFixed(2)}%"></span>`).join('');
    const legend = row.endBuckets.map((value, index) => `<li class="pot-${potMeta[index][2]}"><strong>${money(value)}</strong><span>${potMeta[index][0]}</span><small>${Math.round(shares[index])} %</small></li>`).join('');
    return `<p class="v3-year-wealth"><strong>${money(total)}</strong><span class="v3-year-delta${delta >= 0 ? ' up' : ' down'}">${delta >= 0 ? '+' : '−'} ${money(Math.abs(delta))} <small>gegenüber Jahresbeginn</small></span></p><div class="v3-year-bar" role="img" aria-label="Aufteilung auf die drei Töpfe">${segments}</div><ul class="v3-year-legend">${legend}</ul>`;
  }
  function yearIncome(row) {
    const rate = TaxModel.getIncomeTaxRate(State.canton(state), row.taxableAnnualIncome);
    const sourceRows = (row.sources || []).filter(source => source.gross > 0.5).map(source => yearLine(esc(source.name), money(source.gross), {note:source.taxable ? 'brutto' : 'nicht steuerbar'})).join('');
    const body = `${sourceRows}${yearLine('Einnahmen vor Steuern', money(row.grossIncome), {total:true})}${yearLine('Steuerbares Einkommen', money(row.taxableAnnualIncome), {note:'nominal'})}${yearLine('Steuersatz', `${percent(rate)} %`)}${yearLine('Einkommenssteuer', `− ${money(row.estimatedIncomeTax ?? 0)}`)}${yearLine('Netto verfügbar', money(row.rent), {total:true})}<p class="v3-year-note">Alle Einnahmen sind brutto, also vor Steuern. Die laufende Einkommenssteuer wird jedes Jahr neu aus dem steuerbaren Einkommen gerechnet.</p>`;
    return `<section class="v3-year-block"><div class="v3-year-block-head"><span class="v3-year-chip" aria-hidden="true">1</span><span class="v3-year-block-icon" aria-hidden="true">${Icons.icon('wallet', {size:20})}</span><h3>Dein Einkommen</h3></div><div class="v3-year-rows">${yearLine('Renten &amp; weitere Einnahmen', money(row.grossIncome))}${yearLine(`Steuern ${Icons.icon('receiptTax', {size:18})}`, `− ${money(row.estimatedIncomeTax ?? 0)}`)}<details class="v3-year-sum"><summary><span>Netto verfügbar</span><strong>${money(row.rent)}</strong><span class="v3-chevron" aria-hidden="true">${Icons.icon('chevronDown', {size:18})}</span></summary><div class="v3-year-sum-body">${body}</div></details></div></section>`;
  }
  function yearNeed(row) {
    const surplus = Math.max(0, row.rent - row.need - (row.special ?? 0));
    const gap = row.withdrawal > 0.5;
    const amount = gap ? row.withdrawal : surplus;
    const info = infoMarkup({iconOnly:true, aria:'Fehlbetrag erklären', body:`${yearLine('Bedarf', money(row.need))}${yearLine('Einnahmen netto', `− ${money(row.rent)}`)}${yearLine(gap ? 'Fehlbetrag' : 'Überschuss', money(amount), {total:true})}${yearLine('Pro Monat', money(amount / 12))}<p class="v3-year-note">${gap ? 'Dieser Betrag wird in diesem Jahr aus dem Geldmarkttopf finanziert.' : 'Der Überschuss wird dem Geldmarkttopf gutgeschrieben.'}</p>`});
    return `<section class="v3-year-block"><div class="v3-year-block-head"><span class="v3-year-chip" aria-hidden="true">2</span><span class="v3-year-block-icon" aria-hidden="true">${Icons.icon('shoppingCart', {size:20})}</span><h3>Dein Bedarf</h3></div><div class="v3-year-rows">${yearLine('Lebenshaltung / Bedarf', money(row.need))}${row.special > 0.5 ? yearLine('Sonderausgabe', money(row.special)) : ''}<div class="v3-year-row gap"><span>${gap ? 'Fehlbetrag' : 'Überschuss'}</span><strong>${money(amount)}</strong>${info}</div></div><p class="v3-year-note">${gap ? 'Wird aus deinem Geldmarkttopf entnommen.' : 'Dein Einkommen deckt den Bedarf dieses Jahres vollständig.'}</p></section>`;
  }
  function yearAges() { const data = yearData(); return data ? data.rows.map(row => row.age) : []; }
  /* Kein «Jahr abspielen» auf dieser Seite (Spec §16): die Kapitalentwicklung gehört
     zum Variantenvergleich, hier zählt das einzelne Jahr. */
  function stopYearPlay() { if (yearState.timer) { clearInterval(yearState.timer); yearState.timer = null; } yearState.mode = null; }
  function startYearPlay() { stopYearPlay(); }
  function advanceYear(direction) {
    const ages = yearAges();
    const index = ages.indexOf(yearState.age);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= ages.length) return false;
    yearState.age = ages[next];
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
    const index = ages.indexOf(yearState.age);
    const row = data.rows[index];
    const nextAge = ages[index + 1];
    const event = data.events.find(entry => entry.age === row.age) || null;
    const label = app.querySelector('#yearAgeLabel');
    if (label) label.textContent = `Alter ${row.age + 1}`;
    const range = app.querySelector('#yearRange');
    if (range) range.value = String(row.age);
    const previous = app.querySelector('[data-year-prev]'), following = app.querySelector('[data-year-next]');
    if (previous) { previous.textContent = index > 0 ? `‹ Alter ${ages[index - 1] + 1}` : '‹ Start'; previous.disabled = index === 0; }
    if (following) { following.textContent = nextAge ? `Alter ${nextAge + 1} ›` : 'Letztes Jahr'; following.disabled = !nextAge; }
    container.innerHTML = `<section class="v3-year-block"><div class="v3-pot-heading"><h3>Vermögen am Jahresanfang · Alter ${row.age + 1}</h3>${potTotal(row.buckets, row.free)}</div>${event ? `<p class="v3-year-note">Enthält deinen PK-Kapitalbezug netto von ${money(event.net)}${event.items.some(item => item.id !== 'pk') ? ' inklusive Säule 3a' : ''}.</p>` : ''}${potTiles(row.buckets, {total:row.free})}</section>${yearIncome(row)}${yearNeed(row)}<section class="v3-year-block"><div class="v3-year-block-head"><span class="v3-year-chip" aria-hidden="true">3</span><span class="v3-year-block-icon" aria-hidden="true">${Icons.icon('coins', {size:20})}</span><h3>So deckst du den Fehlbetrag</h3></div><p class="v3-year-note">Entnahme aus deinen drei Töpfen</p>${yearPots(row)}<p class="v3-year-note">Rendite dieses Jahr ${Icons.icon('trendingUp', {size:18})} ${row.ret >= 0 ? '+' : '−'} ${money(Math.abs(row.ret))} · in den Beständen am Jahresende enthalten.</p></section><section class="v3-year-block"><div class="v3-year-block-head"><span class="v3-year-chip" aria-hidden="true">4</span><span class="v3-year-block-icon" aria-hidden="true">${Icons.icon('chartLine', {size:20})}</span><h3>Dein Vermögen am Jahresende · Alter ${row.age + 1}</h3></div>${yearWealth(row)}</section><details class="v3-info v3-year-detail"><summary><span class="v3-info-label">So wurde dieses Jahr berechnet</span><span class="v3-info-glyph" aria-hidden="true">${Icons.icon('chevronRight', {size:18})}</span></summary><div class="v3-info-panel">${yearDetailRows(data, row)}</div></details><div class="v3-year-foot"><button type="button" data-year-prev${index === 0 ? ' disabled' : ''}>${Icons.icon('chevronLeft', {size:18})} ${index > 0 ? `Alter ${ages[index - 1] + 1}` : 'Start'}</button>${nextAge ? `<button type="button" class="primary" data-year-forward>Weiter zu Alter ${nextAge + 1} ${Icons.icon('chevronRight', {size:18})}</button>` : '<button type="button" class="primary" disabled>Letztes Jahr</button>'}</div>`;
  }
  function yearDetailRows(data, row) {
    const code = State.canton(state);
    const index = data.rows.indexOf(row);
    const event = data.events.find(entry => entry.age === row.age) || null;
    const start = index > 0 ? data.rows[index - 1].end : row.free - row.injection;
    return [
      yearLine('Kapital zu Jahresbeginn', money(start)),
      yearLine('Kapital nach Zufluss', money(row.free), {total:true}),
      yearLine('Töpfe zu Jahresbeginn', potMeta.map((meta, position) => `${meta[0]} ${money(row.buckets[position])}`).join(' · ')),
      (row.sources || []).filter(source => source.gross > 0.5).map(source => yearLine(`Einnahme · ${esc(source.name)}`, money(source.gross), {note:source.taxable ? 'brutto' : 'nicht steuerbar'})).join(''),
      yearLine('Einnahmen vor Steuern', money(row.grossIncome)),
      yearLine('Steuerbares Einkommen', money(row.taxableAnnualIncome), {note:'nominal'}),
      yearLine('Einkommenssteuer', `− ${money(row.estimatedIncomeTax ?? 0)}`, {note:`${percent(TaxModel.getIncomeTaxRate(code, row.taxableAnnualIncome))} %`}),
      yearLine('Verfügbar nach Steuern', money(row.rent)),
      yearLine('Lebensbedarf', money(row.need)),
      row.special > 0.5 ? yearLine('Sonderausgabe', money(row.special)) : '',
      yearLine('Kapitalbedarf', money(row.withdrawal), {total:true}),
      event ? yearLine('Kapitalbezug brutto', money(event.gross)) : '',
      event ? yearLine('Kapitalbezugssteuer', `− ${money(event.tax)}`) : '',
      event ? yearLine('Kapitalbezug netto investiert', money(event.net)) : '',
      yearLine('Entnahme aus den Töpfen', money(Math.min(row.withdrawal, row.free))),
      yearLine('Entnahme je Topf', potMeta.map((meta, position) => `${meta[0]} ${money(row.takes ? row.takes[position] : 0)}`).join(' · ')),
      row.gap > 0.5 ? yearLine('Nicht gedeckt', money(row.gap)) : '',
      yearLine('Rendite je Topf', potMeta.map((meta, position) => `${meta[0]} + ${money(row.gains[position])}`).join(' · ')),
      yearLine('Umbuchungen auf Ziel', potMeta.map((meta, position) => `${meta[0]} ${row.transfers[position] >= 0 ? '+' : '−'} ${money(Math.abs(row.transfers[position]))}`).join(' · ')),
      yearLine('Töpfe am Jahresende', potMeta.map((meta, position) => `${meta[0]} ${money(row.endBuckets[position])}`).join(' · ')),
      yearLine('Kapital am Jahresende', money(row.end), {total:true}),
      `<p class="v3-year-note">Alle Beträge in heutiger Kaufkraft; die Steuerbemessung rechnet mit dem nominalen Einkommen. Bedarf und Steuern sind in der Simulation jährlich, die Kapitalbezugssteuer einmalig im Bezugsjahr.</p>`
    ].filter(Boolean).join('');
  }
  // Ein Jahr der Planung verstehen: dieselbe Simulation als Jahres-Dashboard.
  function renderYearByYear() {
    if (!hasCanton()) { app.innerHTML = `${pageHeader('Planung Jahr für Jahr')}<p>Steuern offen. Ergänze deinen Wohnkanton für die jährliche Steueraufschlüsselung.</p><button type="button" data-v3-next="personal">Wohnkanton ergänzen</button>${backRow()}`; route = 'years'; markDirty(); return; }
    const data = yearData();
    if (!data) { returnToPlan(); return; }
    closeMenu(); chartObserver?.disconnect(); route = 'years'; markDirty(); assetPart = null;
    window.scrollTo(0, 0);
    stopYearPlay();
    const ages = data.rows.map(row => row.age);
    if (!ages.includes(yearState.age)) yearState.age = ages[0];
    const share = yearShare();
    app.innerHTML = `<header class="v3-heading v3-heading-detail"><div class="v3-year-topline"><button type="button" class="home-link" data-year-back>← Zurück zum Variantenvergleich</button><span class="v3-year-pill">${splitLabel(share)}</span></div><h1>Planung Jahr für Jahr</h1></header><div class="v3-detail-layout"><section class="v3-detail-form"><p class="v3-sublead">So entwickelt sich dein Geld über die Jahre.</p><div class="v3-year-nav"><div class="v3-year-nav-row"><button type="button" data-year-prev>‹ Start</button><strong id="yearAgeLabel">Alter ${yearState.age + 1}</strong><button type="button" data-year-next>Alter ${(ages[1] ?? ages[0]) + 1} ›</button></div><input id="yearRange" class="v3-range v3-year-range" type="range" min="${ages[0]}" max="${ages[ages.length - 1]}" step="1" value="${yearState.age}" aria-label="Alter wählen"><div class="v3-year-nav-labels"><span>Pensionierung</span><span>Alter ${ages[ages.length - 1] + 1}</span></div></div><div data-year-body></div></section></div>`;
    renderYearBody();
    bindYearByYear();
  }
  function bindYearByYear() {
    document.querySelector('[data-year-back]')?.addEventListener('click', renderCompare);
    document.getElementById('yearRange')?.addEventListener('input', event => {
      yearState.age = numeric(event.target.value);
      stopYearPlay();
      renderYearBody();
    });
    document.querySelector('[data-year-prev]')?.addEventListener('click', () => { stopYearPlay(); advanceYear(-1); });
    document.querySelector('[data-year-next]')?.addEventListener('click', () => { stopYearPlay(); advanceYear(1); });
    // Der Jahreskörper wird bei jedem Jahreswechsel neu gerendert: Klicks deshalb
    // am bleibenden Container abfangen, sonst verlieren die Knöpfe ihre Wirkung.
    app.querySelector('[data-year-body]')?.addEventListener('click', event => {
      if (event.target.closest('[data-year-forward]') || event.target.closest('[data-year-next]')) { stopYearPlay(); advanceYear(1); return; }
      if (event.target.closest('[data-year-prev]')) { stopYearPlay(); advanceYear(-1); return; }
    });
  }
  // V3 bleibt ohne Wohnkanton als vorläufige Planung nutzbar.
  /* «Mein Plan»: PK-Entscheid mit Vorschau, gespeicherte Varianten und Zugang zum Vergleich.
     Status und Rentenaufschlüsselung liegen bei vollständiger Planung in einem Aufklapper,
     damit die Seite kompakt bleibt; unvollständige Planungen zeigen die nächsten Schritte offen. */
  function renderPlan(restore = false) {
    state = normalizeP3(state);
    if (!State.timing(state) || state.values.need === undefined) { returnToPlan(); return; }
    closeMenu(); chartObserver?.disconnect(); route = 'plan'; markDirty();
    if (!restore) window.scrollTo(0, 0);
    const pre = state.mode === 'pre', known = dataKnown();
    const share = previewShare ?? chosenShare(), item = evaluated(share) ?? evaluated(chosenShare());
    const preview = share !== chosenShare();
    const meta = `${pre ? `Pensionierung mit ${item.plan.retirement.age}` : 'Planungsstart heute'} · Planung bis ${item.plan.retirement.targetAge}`;
    const notice = variantNotice !== null && variantShares().includes(variantNotice) ? `<p class="v3-notice" role="status"><span aria-hidden="true">✓</span> Variante «${variantNotice} % Kapital» gespeichert.</p>` : '';
    const decision = pre ? `<section class="v3-decision"><h2>PK-Bezug wählen</h2>${known.pension ? `<div class="v3-share-row"><label class="v3-share-field" for="shareNumber"><span class="v3-share-caption">Kapitalanteil</span><span class="v3-share-entry"><input id="shareNumber" type="number" inputmode="numeric" min="0" max="100" step="1" value="${share}" aria-describedby="shareReadout"><span class="v3-share-unit" aria-hidden="true">%</span></span></label><p class="v3-share-readout" id="shareReadout"><strong id="shareValue">${share}</strong> % Kapital · <strong id="rentShare">${100 - share}</strong> % Rente</p></div><input id="shareRange" class="v3-range" type="range" min="0" max="100" step="1" value="${share}" aria-label="PK-Kapitalanteil"><div class="v3-range-labels"><span>0 % Kapital</span><span>100 % Kapital</span></div><div class="v3-preview" data-preview="${preview ? 'draft' : 'current'}"><span class="v3-preview-caption" id="previewStatus">${preview ? 'Vorschau (noch nicht gespeichert)' : 'Dein aktueller Plan'}</span><div id="previewReadout">${readout(item)}</div></div><div class="v3-actions v3-decision-actions"><button type="button" class="primary" data-remember${preview ? '' : ' hidden'}>+ Als Variante speichern</button><div class="v3-decision-links"><button type="button" data-adopt${preview ? '' : ' hidden'}>Variante übernehmen</button><button type="button" data-preview-cancel${preview ? '' : ' hidden'}>Zurück zum aktuellen Plan</button></div></div>${notice}<p id="v3Error" class="v3-error" role="alert"></p>` : '<p>Rente, Kapital oder eine Mischung? Erfasse deine PK-Grunddaten, um die Wirkung auf deinen Ruhestand zu sehen.</p><button type="button" class="primary" data-v3-next="pension">PK-Angaben erfassen</button>'}</section>` : (!known.pension ? '<section class="v3-decision"><h2>Deine laufende PK-Rente</h2><button type="button" data-v3-next="pension">PK-Rente erfassen</button></section>' : '');
    const variants = pre && known.pension ? `<section class="v3-section v3-variants-section"><div class="v3-variants-head"><h2>Meine Varianten</h2><button type="button" class="v3-link" data-compare>Varianten vergleichen ${Icons.icon('chevronRight', {size:18})}</button></div><div class="v3-cards">${variantCards()}</div></section>` : '';
    const status = known.ready ? `<details class="v3-plan-status"><summary>Planstatus und Renten</summary><div id="planProjection">${compactReadySummary(item)}</div></details>` : '';
    app.innerHTML = `<button type="button" class="v3-plan-meta" data-v3-next="personal">${meta}<span aria-hidden="true"> ›</span></button>${pageHeader('Mein Plan')}<p class="v3-plan-sub">Passe den PK-Bezug an und sieh die Auswirkungen.</p>${state.exampleValues ? '<p class="v3-hint">Beispielwerte – bitte durch deine persönlichen Angaben ersetzen.</p>' : ''}${state.p3MigrationNotice ? '<p class="v3-hint">Dein bisheriges 3a-Guthaben wird neu vollständig zum Ruhestandsstart berücksichtigt, ohne modellierte 3a-Bezugssteuer. Bitte prüfe die Annahmen.</p>' : ''}<div class="v3-plan-grid v3-plan-compact"><section>${known.ready ? '' : planSummary(evaluated(chosenShare()))}${decision}${variants}${pre && known.ready ? p3Section(item) : ''}${status}</section><aside>${saveRow()}</aside></div>`;
    bindPlan(); renderSaveState();
    if (restore) window.scrollTo(0, planScrollY);
  }
  function bindPlan() {
    const range = document.getElementById('shareRange'), number = document.getElementById('shareNumber');
    const remember = app.querySelector('[data-remember]'), adopt = app.querySelector('[data-adopt]'), cancel = app.querySelector('[data-preview-cancel]');
    const update = value => {
      if (String(value).trim() === '' || !Number.isInteger(Number(value)) || Number(value) < 0 || Number(value) > 100) {
        message('Bitte eine ganze Zahl von 0 bis 100 eingeben.');
        if (adopt) adopt.disabled = true; if (remember) remember.disabled = true;
        return;
      }
      previewShare = Number(value); message();
      if (adopt) adopt.disabled = false; if (remember) remember.disabled = false;
      const preview = previewShare !== chosenShare();
      if (range) range.value = previewShare; if (number) number.value = previewShare;
      document.getElementById('shareValue').textContent = previewShare;
      document.getElementById('rentShare').textContent = 100 - previewShare;
      document.getElementById('previewStatus').textContent = preview ? 'Vorschau (noch nicht gespeichert)' : 'Dein aktueller Plan';
      app.querySelector('.v3-preview')?.setAttribute('data-preview', preview ? 'draft' : 'current');
      const item = evaluated(previewShare);
      document.getElementById('previewReadout').innerHTML = readout(item);
      const projection = document.getElementById('planProjection');
      if (projection) projection.innerHTML = compactReadySummary(item);
      if (adopt) adopt.hidden = !preview;
      if (cancel) cancel.hidden = !preview;
      if (remember) remember.hidden = !preview;
      // Die geladene Variante wird auch in der Liste sichtbar (identische Zeilen, nur der Zustand wechselt).
      const cards = app.querySelector('.v3-cards');
      if (cards) cards.innerHTML = variantCards();
    };
    range?.addEventListener('input', event => update(event.target.value));
    number?.addEventListener('input', event => update(event.target.value));
    app.querySelector('.v3-cards')?.addEventListener('click', event => {
      const button = event.target.closest('[data-variant-index]');
      if (!button) return;
      // Klick auf eine Variante lädt genau diesen Wert in den PK-Bezug (Preview).
      editSlot = Number(button.dataset.variantIndex);
      update(variantShares()[editSlot]);
      focusTarget('shareNumber');
    });
    app.querySelectorAll('[data-adopt-variant]').forEach(button => button.addEventListener('click', () => {
      try { state = V3State.activate(state, numeric(button.dataset.adoptVariant)); previewShare = null; editSlot = null; markDirty(); renderPlan(true); }
      catch (error) { message(error.message); }
    }));
    cancel?.addEventListener('click', () => { previewShare = null; editSlot = null; renderPlan(true); });
    adopt?.addEventListener('click', () => {
      try { state = V3State.activate(state, previewShare, editSlot); previewShare = null; editSlot = null; markDirty(); renderPlan(true); }
      catch (error) { message(error.message); }
    });
    remember?.addEventListener('click', () => {
      try {
        const saved = previewShare;
        // Ohne Klick auf eine Zeile wird der erste Platz mutiert, der nicht der aktuelle Plan ist.
        const target = editSlot !== null && variantShares()[editSlot] !== chosenShare()
          ? editSlot
          : variantShares().findIndex(entry => entry !== chosenShare());
        state = V3State.remember(state, saved, target);
        variantNotice = saved; editSlot = null; markDirty(); renderPlan(true);
      }
      catch (error) { message(error.message); }
    });
    app.querySelectorAll('[data-compare]').forEach(button => button.addEventListener('click', renderCompare));
    document.querySelector('[data-save]')?.addEventListener('click', save);
  }
  function toggleMenu() { const menu = document.getElementById('v3Menu'); const button = document.querySelector('.menu-button'); if (!menu || !button) return; menu.hidden = !menu.hidden; button.setAttribute('aria-expanded', String(!menu.hidden)); }
  function closeMenu() { const menu = document.getElementById('v3Menu'); const button = document.querySelector('.menu-button'); if (menu) menu.hidden = true; if (button) button.setAttribute('aria-expanded', 'false'); }
  function load() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return false;
      const saved = V3State.decode(raw);
      state = saved.state; previewShare = null; editSlot = null; lastSavedAt = saved.savedAt; storageBlocked = false; storageFailed = false;
      const position = state.position;
      if (!State.timing(state) || state.values.need === undefined) returnToPlan();
      else if (position === 'compare' && state.mode === 'pre') renderCompare();
      else if (position === 'years') renderYearByYear();
      else if (['plan','rents','need'].includes(position)) returnToPlan();
      else openDetail(position);
      return true;
    } catch(error) { storageBlocked = true; message(error.message); renderSaveState(); return false; }
  }
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
    pension3a: {p3:234500, p3Contrib:0}
  };
  function loadDemo() {
    try {
      state = State.fresh('pre'); state.riskProfile = 'balanced'; previewShare = null; editSlot = null;
      apply('time', demoPlanung.time);
      apply('regular', demoPlanung.regular);
      apply('need', demoPlanung.need);
      apply('assets', demoPlanung.assets);
      apply('pension3a', demoPlanung.pension3a);
      apply('pension', demoPlanung.pension);
      // Verzinsung 3 %; der Planungshorizont kommt automatisch aus dem Alter (87).
      apply('assumptions', {...State.defaults, pkInterest:3, targetAge:state.targetAge, reviewed:true});
      state.exampleValues = true; renderPlan();
    } catch (error) { message(error.message); }
  }
  // Bind persistent navigation once, including readouts replaced during live previews.
  document.getElementById('v3Home')?.addEventListener('click', returnToPlan);
  document.querySelector('.menu-button').addEventListener('click', toggleMenu);
  document.getElementById('v3Menu').addEventListener('click', event => {
    const button = event.target.closest('[data-menu-page]');
    if (button) { previewShare = null; editSlot = null; openDetail(button.dataset.menuPage); }
  });
  app.addEventListener('click', event => {
    const back = event.target.closest('[data-back]');
    const breakdown = event.target.closest('[data-pk-breakdown]');
    const vorsorge = event.target.closest('[data-open-vorsorge]');
    const next = event.target.closest('[data-v3-next]');
    const cancel = event.target.closest('[data-asset-cancel]');
    const asset = event.target.closest('[data-asset]');
    if (back) { previewShare = null; editSlot = null; returnToPlan(); }
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
  load();
  window.addEventListener?.('pagehide', save);
})();
