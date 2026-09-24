(() => {
  const app = document.getElementById('app');
  const State = CheckV2State;
  const Calculator = RetirementCalculator;
  const V3State = CheckV3State;
  // Schätzwerte und Herkunft (Schnelleinstieg): Pauschalen gelten, bis sie erfasst sind.
  const Estimates = globalThis.Estimates ?? null;
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
  const taxLimitNotice = 'Modellrechnung, keine individuelle Steuerberechnung. Nicht berücksichtigt sind unter anderem die Vermögenssteuer und eine separate Steuer auf Zinsen und Dividenden. Die 3a-Bezugssteuer wird approximativ mit demselben kantonalen Modell geschätzt.';
  const p3TaxNotice = 'Angenommen wird ein Bezug der ganzen Säule 3a auf einmal ein Jahr vor dem PK-Bezug. Die geschätzte 3a-Bezugssteuer wird vor der Topfaufteilung abgezogen; nur der Nettobetrag steht zur Verfügung. Die Rechnung ist approximativ mit dem vereinfachten kantonalen Modell: Weil 3a und PK in getrennten Jahren bezogen werden, fallen zwei getrennte Steuerbasen an. Eine weitergehende Staffelung der 3a-Bezüge über mehrere Jahre ist nicht modelliert und könnte die Steuer zusätzlich reduzieren.';
  /* Verständliche Erklärung der Säule 3a mit den tatsächlich gerechneten Werten:
     Nettoguthaben, Bezugsalter, kantonaler Durchschnittssteuersatz, Steuerbetrag. */
  function p3TaxExplanation(plan) {
    const code = plan ? (plan.person.canton || '') : '';
    const capital = plan ? Calculator.calculateAvailableCapital(plan) : null;
    const p3 = capital && capital.p3;
    if (!p3 || !(p3.grossTotal > 0)) return `<p>Du hast kein Guthaben in der Säule 3a erfasst. Ohne 3a-Guthaben fällt keine 3a-Bezugssteuer an.</p><p>${p3TaxNotice}</p>`;
    const canton = TaxModel.canton(code);
    const rate = canton ? TaxModel.getCapitalWithdrawalTaxRate(code, p3.grossAtStart) : null;
    const ageLine = p3.withdrawalAge === null ? '' : `<p>Der Bezug wird <strong>1 Jahr vor dem PK-Bezug</strong> simuliert, hier also mit Alter ${p3.withdrawalAge}.</p>`;
    const taxLine = rate === null
      ? '<p>Ohne Wohnkanton schätzen wir noch keine Bezugssteuer. Der Betrag ist deshalb vorläufig brutto.</p>'
      : `<p>Die Bezugssteuer ziehen wir mit dem <strong>kantonalen Durchschnittssteuersatz für Kapitalbezüge</strong> ab: ${esc(canton.name)} <strong>${percent(rate)} %</strong>. Das ergibt ${money(p3.taxAtStart)}.</p>`;
    return `<p>Aus deiner persönlichen Vorsorge (Säule 3a) stehen dir am Ruhestandsstart <strong>${money(p3.netAtStart)} netto</strong> zur Verfügung.</p><p>Dein 3a-Guthaben wächst bis zum Bezug auf ${money(p3.grossAtStart)} (brutto).</p>${ageLine}${taxLine}<p>Es bleiben <strong>${money(p3.netAtStart)} netto</strong>. Nur dieser Betrag fliesst in dein Startkapital.</p><p>Säule 3a und PK beziehst du in verschiedenen Jahren. Deshalb werden sie getrennt besteuert.</p><p>Eine <strong>Staffelung</strong> über mehrere Jahre könnte die Steuer senken. Sie ist hier nicht simuliert.</p>`;
  }
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
  /* Lange Erklärungen gehören nicht in den Seitenfluss: sie öffnen als Dialog (Modal).
     Kurze Hinweise bleiben beim ⓘ im Fluss (Produktregel «im Seitenfluss ohne
     Navigationsüberlagerung»); der Dialog ist für Textwände gedacht. */
  /* In engen Rastern (Kennzahlen, Kacheln, Kopfzeilen) hat ein aufgeklappter Seitentext
     keinen Platz: dort öffnet die Erklärung als Dialog. Breite Blöcke behalten das ⓘ im Fluss. */
  function modalInfo({title, body, aria = 'Erklärung öffnen'}) {
    return `<button type="button" class="v3-info v3-info-sub v3-modal-icon" data-modal data-modal-title="${esc(title)}" data-modal-body="${esc(body)}" aria-label="${esc(aria)}">${Icons.icon('infoCircle', {size:18})}</button>`;
  }
  function modalLink({label, title, body, aria = ''}) {
    return `<button type="button" class="v3-modal-link" data-modal data-modal-title="${esc(title || label)}" data-modal-body="${esc(body)}"${aria ? ` aria-label="${esc(aria)}"` : ''}>${Icons.icon('infoCircle', {size:18})} ${esc(label)}</button>`;
  }
  /* Inhalt und Titel können aus einem Element (data-Attribute) oder direkt übergeben werden. */
  function openModal(source) {
    const dialog = document.getElementById('v3Modal');
    if (!dialog || !source) return;
    const data = source.dataset || source;
    const title = dialog.querySelector('#v3ModalTitle'), body = dialog.querySelector('#v3ModalBody');
    if (title) title.textContent = data.modalTitle || '';
    if (body) body.innerHTML = data.modalBody || '';
    if (dialog.open) return; // bereits offen: nur den Inhalt gewechselt
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    dialog.querySelector('[data-modal-close]')?.focus();
  }
  function closeModal() {
    const dialog = document.getElementById('v3Modal');
    if (!dialog) return;
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
    document.querySelector('[data-pots-modal]')?.focus();
  }
  /* §9: Das Töpfe-Modell öffnet als Dialog (Desktop) bzw. Bottom Sheet (Mobile),
     ohne Route-Wechsel. Donut, Legende und die drei Anlageklassen aus bucketConfig. */
  function donutSvg(values) {
    const total = values.reduce((a, b) => a + b, 0);
    const radius = 54, circumference = 2 * Math.PI * radius;
    let offset = 0;
    const rings = bucketConfig.map((bucket, index) => {
      const share = total > 0 ? values[index] / total : 0;
      const length = share * circumference;
      const ring = `<circle r="${radius}" cx="70" cy="70" fill="none" stroke="${bucket.color}" stroke-width="22" stroke-dasharray="${length} ${circumference - length}" stroke-dashoffset="${-offset}" transform="rotate(-90 70 70)"></circle>`;
      offset += length;
      return ring;
    }).join('');
    return `<svg class="v3-donut" viewBox="0 0 140 140" role="img" aria-label="Aufteilung auf die drei Töpfe">${rings}</svg>`;
  }
  function potsModalBody(values, total) {
    const sum = total ?? values.reduce((a, b) => a + b, 0);
    const amounts = roundedParts(values, sum);
    const percents = roundedParts(values.map(value => sum > 0 ? value / sum * 100 : 0), 100);
    const legend = bucketConfig.map((bucket, index) =>
      `<li class="pot-${bucket.tone}"><span class="v3-pot-icon" aria-hidden="true">${Icons.icon(bucket.icon, {size:20})}</span><span class="v3-pot-name">${bucket.label}</span><strong>${money(amounts[index])}</strong><small>${percents[index]} %</small></li>`
    ).join('');
    const notes = bucketConfig.map(bucket => `<div class="v3-pot-note pot-${bucket.tone}"><span class="v3-pot-icon" aria-hidden="true">${Icons.icon(bucket.icon, {size:20})}</span><div><strong>${bucket.label}</strong><p>${bucket.note}</p></div></div>`).join('');
    return `<p class="v3-modal-lead">Dein Vermögen ist auf drei Töpfe verteilt.</p><div class="v3-donut-wrap">${donutSvg(values)}<div class="v3-donut-total"><span>Total</span><strong>${money(sum)}</strong></div></div><ul class="v3-donut-legend">${legend}</ul><div class="v3-pot-notes">${notes}</div><section class="v3-chart-card"><div class="v3-chart-head"><span class="v3-chart-icon" aria-hidden="true">${Icons.icon('chartLine', {size:20})}</span><span class="v3-chart-title">Kapitalentwicklung bis Alter ${
  evaluated(chosenShare())?.plan.retirement.targetAge ?? ''}</span></div><div class="v3-chart-body" id="potsChart"><div class="v3-chart-container"></div><ul class="v3-chart-legend" data-chart-legend></ul></div></section><button type="button" class="primary v3-modal-action" data-modal-close>Schliessen</button>`;
  }
  function openPotsModal(trigger) {
    const item = evaluated(chosenShare());
    if (!item) return;
    openModal({dataset:{modalTitle:'Das Töpfe-Modell', modalBody:potsModalBody(item.result.bucketAllocation, item.result.availableCapital)}, currentTarget:trigger});
    // «Aufteilung und Entwicklung»: die Kapitalentwicklung wird im Dialog gezeichnet.
    const body = document.getElementById('v3ModalBody');
    if (body) bindChart(body);
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
    if (!events.length) return '<h4>Kapitalbezüge</h4><p>Ohne Kapitalbezug entsteht keine Bezugssteuer.</p>';
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
  // Platz der Variante, deren Wert gerade im PK-Bezug geladen ist (Klick auf die Karte).
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
  // Unterdrückt das Speichern, bis die Seite neu geladen wird: Beim Laden oder Löschen eines
  // Teststandes darf das eigene «pagehide»-Speichern den Stand nicht sofort überschreiben.
  const suspendSaving = () => { globalThis.__v3SuspendSave = true; };
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
      if (storageBlocked || globalThis.__v3SuspendSave) { renderSaveState(); return; }
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
  /* Schnelleinstieg «Ergebnis zuerst»: vier Fragen ergeben sofort einen ersten Plan – vor der
     Pensionierung mit PK-Guthaben, danach mit laufender PK-Rente und verfügbarem Vermögen.
     Alles Weitere wird danach auf «Mein Plan» verfeinert (AHV, Kanton, Kapital, PK-Ausweis). */
  function startFields() {
    const pick = (group, keys) => State.fields(group, state).filter(field => keys.includes(field.key)).map(field => ({...field, group}));
    return state.mode === 'pre'
      ? [...pick('time', ['age','retirement']), ...pick('pension', ['pk']), ...pick('need', ['need'])]
      : [...pick('time', ['age']), {key:'rents', group:'rents', unit:'CHF'}, ...pick('free', ['free']), ...pick('need', ['need'])];
  }
  function setStartDraft() {
    draft = {};
    startFields().forEach(field => {
      if (field.key === 'rents') { // Renten total = AHV + weitere Renten (monatlich)
        const income = state.details.income;
        draft.rents = income ? (numeric(income.ahv) + numeric(income.other)) || '' : '';
        return;
      }
      const fromDetails = state.details[field.group]?.[field.key];
      draft[field.key] = fromDetails ?? state.values[field.key] ?? '';
    });
  }
  /* Die vier Fragen des Schnellstarts (Story «Nur 4 Angaben, dann siehst du, wo du stehst»).
     Nur Beschriftung und Einheit weichen vom Detail-Editor ab; die Feldnamen bleiben identisch. */
  const startQuestions = {
    age: {label:'Wie alt bist du?', unit:'Jahre', index:1, icon:'calendarStats'},
    retirement: {label:'Wann möchtest du in Pension?', unit:'mit Alter', index:2, icon:'arrowsExchange'},
    pk: {label:'Wie hoch ist dein PK-Guthaben heute?', unit:'CHF', index:3, icon:'buildingBank'},
    // Nach der Pensionierung zählt die Rente als Ganzes; die Aufteilung kommt beim Präzisieren.
    rents: {label:'Wie hoch sind deine Renten pro Monat?', unit:'CHF / Monat', index:2, icon:'buildingBank',
      hint:'AHV + PK-Rente + weitere regelmässige Renten',
      info:{title:'Welche Renten zählen?', body:'<p>Alle regelmässigen Renten, die dir heute ausbezahlt werden: AHV, PK-Rente und weitere Renten. Die genaue Aufteilung erfassen wir anschliessend beim Präzisieren.</p>'}},
    free: {label:'Wie viel Kapital steht dir für deinen Ruhestand zur Verfügung?', unit:'CHF', index:3, icon:'wallet',
      hint:'Z. B. Bankguthaben, Wertschriften, Festgeld und andere Anlagen, die du für deinen Lebensunterhalt einsetzen kannst.',
      info:{title:'Was gehört dazu?', body:'<p>Geld und Anlagen, die du während deiner Pensionierung grundsätzlich für deinen Lebensunterhalt verwenden kannst – auch wenn sie aktuell investiert oder zeitweise gebunden sind. Dazu zählen z. B. Bankguthaben, Festgeld, ETF-/Wertschriftendepots und bereits bezogene Vorsorgegelder.</p><p>Nicht dazu zählen: selbstbewohntes Wohneigentum oder anderes Vermögen, das du nicht für die Finanzierung deines Ruhestands einsetzen möchtest.</p>'}},
    need: {label:'Wie viel brauchst du pro Monat?', unit:'CHF / Monat', index:4, icon:'shoppingCart', hint:'Netto, also nach Steuern.'}
  };
  /* Was der erste Check leistet – mit den vorhandenen Icons, ohne Marketing-Bilder. */
  const startBenefits = [
    {icon:'listDetails', text:'4 Angaben genügen für den ersten Plan'},
    {icon:'wallet', text:'Deine Angaben bleiben auf diesem Gerät'},
    {icon:'chartLine', text:'Danach Schritt für Schritt präzisieren'}
  ];
  /* Verbindliche Header-Regel «Mein Plan»: unabhängig vom Datenzustand immer dieselbe Struktur,
     Positionierung und Typografie. Links der Titel, rechts daneben die kleine Statuszeile –
     nur ihr Inhalt wechselt (Planungsdaten oder der Empty-State-Satz). Der Schnellstart ist
     damit kein eigener Bereich, sondern der leere Zustand von «Mein Plan». */
  const emptyStatus = 'Nur 4 Angaben – danach siehst du, wo du stehst.';
  // Reine Information, kein Link: «Persönliche Angaben» erreichst du über das Menü.
  function planHeader(status = '') {
    return `<header class="v3-heading v3-heading-plan"><h1>Mein Plan</h1><span class="v3-plan-meta"><span data-plan-status>${status || emptyStatus}</span></span></header>`;
  }
  // Status aus den erfassten Planungsdaten; leer, solange keine vorliegen.
  function planStatus() {
    if (!State.timing(state) || state.values.need === undefined) return '';
    const plan = planFor(chosenShare());
    if (!plan) return '';
    const retirement = plan.retirement?.age, target = plan.retirement?.targetAge;
    return `${state.mode === 'pre' && retirement ? `Pensionierung mit ${retirement}` : 'Planungsstart heute'}${target ? ` · Planung bis ${target}` : ''}`;
  }
  // Zeile rechts im Kopf: entsteht live aus den Angaben (vor und nach der Pensionierung).
  function startMeta() {
    const age = numeric(draft.age), retirement = numeric(draft.retirement);
    const life = typeof LifeExpectancy !== 'undefined' && LifeExpectancy.defaultTargetAge ? LifeExpectancy : null;
    if (state.mode === 'post') {
      if (!(age > 0)) return '';
      const target = life ? life.defaultTargetAge(age, age) : null;
      return `Planungsstart heute${target ? ` · Planung bis ${target}` : ''}`;
    }
    if (!(age > 0) || !(retirement > age)) return '';
    const target = life ? life.defaultTargetAge(age, retirement) : null;
    return `Pensionierung mit ${retirement}${target ? ` · Planung bis ${target}` : ''}`;
  }
  /* Modellannahmen des ersten Checks – erst hinter dem ⓘ, nicht unter den Eingabefeldern.
     Vor der Pensionierung mit Kapitalentscheid, danach mit laufender Rente. */
  function assumptionsBody() {
    const ahv = Estimates ? Estimates.ahvOf(state) : null, uws = Estimates ? Estimates.uwsOf(state) : null;
    const pre = state.mode === 'pre';
    const rows = [
      ahv ? `<li><strong>AHV-Rente ${money(ahv.monthly)} pro Monat</strong> – Pauschale, bis du deine eigene AHV-Rente erfasst.</li>` : '',
      pre && uws ? `<li><strong>PK-Umwandlungssatz ${percent(uws.percent)} % pro Jahr</strong> – Standardannahme für die Umwandlung des PK-Guthabens in eine Rente.</li>` : '',
      !pre ? '<li><strong>Deine Renten</strong> – für den ersten Check teilen wir sie in die geschätzte AHV und weitere Renten auf; die genaue Aufteilung kannst du danach erfassen. Ein Kapitalbezug und eine Bezugssteuer werden nach der Pensionierung nicht mehr gerechnet.</li>' : '',
      '<li><strong>Renditen und Inflation</strong> – aus deinem Risikoprofil (ausgewogen); unter «Annahmen» änderbar.</li>',
      '<li><strong>Steuern</strong> – erst mit deinem Wohnkanton geschätzt; ohne Kanton bleibt der Plan vorläufig.</li>',
      pre ? '<li><strong>Vermögen und Säule 3a</strong> – zählen im ersten Plan noch nicht mit und werden nach dem ersten Check ergänzt.</li>'
        : '<li><strong>Säule 3a</strong> – gilt mit der Pensionierung als bezogen und wird nicht zusätzlich angerechnet.</li>'
    ].filter(Boolean).join('');
    return `<p>Für deinen ersten Check rechnen wir mit sinnvollen Annahmen:</p><ul>${rows}</ul><p>Alles davon kannst du danach Schritt für Schritt durch deine eigenen Angaben ersetzen.</p>`;
  }
  // Situationswahl als kompakte Auswahl statt Formularblock.
  function situationSegments() {
    const segment = (value, label, glyph) => `<button type="button" class="v3-segment" data-situation="${value}" aria-pressed="${state.mode === value}">${Icons.icon(glyph, {size:18})}<span>${label}</span></button>`;
    return `<div class="v3-situation" role="group" aria-label="Deine Situation"><span class="v3-situation-label">Deine Situation</span><div class="v3-segments">${segment('pre', 'Vor der Pensionierung', 'user')}${segment('post', 'Bereits pensioniert', 'users')}</div></div>`;
  }
  /* Vier Eingabekarten: Desktop 2×2, mobil untereinander (eine Angabe pro Karte). */
  function startCards() {
    return `<div class="v3-start">${startFields().map(field => {
      const meta = startQuestions[field.key] ?? {label:field.label, unit:field.unit, index:0, icon:'listDetails'};
      const value = draft[field.key] ?? '';
      const amount = isAmountField(field);
      const hint = meta.hint ? `<small class="v3-start-hint">${esc(meta.hint)}${meta.info ? ' ' + modalInfo({title:meta.info.title, body:meta.info.body, aria:meta.info.title + ' erklären'}) : ''}</small>` : '';
      return `<section class="v3-start-card"><div class="v3-start-head"><span class="v3-start-icon" aria-hidden="true">${Icons.icon(meta.icon, {size:20})}</span><span class="v3-start-index" aria-hidden="true">${meta.index}</span></div><label for="start-${field.key}">${meta.label}</label>${hint}<div class="v3-start-entry"><input id="start-${field.key}" name="${field.key}" type="text" inputmode="${amount ? 'decimal' : 'numeric'}" autocomplete="off"${amount ? ' data-amount' : ''} value="${esc(formatAmount(value))}" aria-describedby="start-unit-${field.key}"><span id="start-unit-${field.key}">${meta.unit}</span></div></section>`;
    }).join('')}</div>`;
  }
  function startBenefitList() {
    return `<ul class="v3-start-benefits">${startBenefits.map(item => `<li><span class="v3-start-icon" aria-hidden="true">${Icons.icon(item.icon, {size:18})}</span>${item.text}</li>`).join('')}</ul>`;
  }
  function renderStart() {
    state = normalizeP3(state);
    route = 'rents'; markDirty();
    // Kopf nach der verbindlichen Header-Regel; die Statuszeile entsteht beim Ausfüllen.
    app.innerHTML = `${planHeader(startMeta())}<section class="v3-form">${situationSegments()}<form id="v3Form" novalidate>${startCards()}<p class="v3-start-note">Für deinen ersten Check verwenden wir sinnvolle Annahmen. Danach kannst du deinen Plan Schritt für Schritt präzisieren. ${modalInfo({title:'Annahmen für den ersten Check', body:assumptionsBody(), aria:'Verwendete Annahmen anzeigen'})}</p><p class="v3-error" id="v3Error" role="alert"></p><div class="v3-actions"><button class="primary" type="submit">Meinen ersten Plan anzeigen <span aria-hidden="true">→</span></button></div>${startBenefitList()}</form></section>`;
    app.querySelectorAll('[data-situation]').forEach(button => button.addEventListener('click', () => {
      assignForm();
      state = V3State.changeMode(state, button.dataset.situation);
      renderStart();
    }));
    // Nur der Inhalt der Statuszeile ändert sich – Struktur, Position und Grösse bleiben.
    document.getElementById('v3Form').addEventListener('input', () => {
      assignForm();
      const node = app.querySelector('[data-plan-status]');
      if (node) node.textContent = startMeta() || emptyStatus;
    });
    document.getElementById('v3Form').addEventListener('submit', submitStart);
  }
  /* Vier Angaben → erster Plan: vor der Pensionierung mit PK-Guthaben, danach mit laufender
     PK-Rente und verfügbarem Vermögen; der Bedarf gilt in beiden Fällen. */
  function submitStart(event) {
    event.preventDefault(); assignForm();
    try {
      if (state.mode === 'pre') {
        const pension = state.details.pension ?? {};
        apply('time', {age:draft.age, retirement:draft.retirement});
        apply('pension', {...pension, pk:draft.pk, pkContrib:pension.pkContrib ?? 0, pkShare:pension.pkShare ?? 0});
      } else {
        // Renten total: Für den ersten Check teilen wir sie in die geschätzte AHV und
        // den Rest als weitere Renten – ohne Doppelzählung; die Aufteilung folgt beim Präzisieren.
        const total = numeric(draft.rents);
        const ahvMonthly = Estimates ? Estimates.ahvOf(state).monthly : 0;
        apply('time', {age:draft.age});
        apply('income', {...incomeValues(), ahv:Math.min(total, ahvMonthly), other:Math.max(0, total - ahvMonthly), additional:0});
        apply('free', {free:draft.free});
      }
      apply('need', {need:draft.need});
      renderPlan();
    } catch (error) { message(error.message); }
  }
  function renderForm(routeName) {
    state = normalizeP3(state);
    route = routeName; markDirty();
    const isRents = routeName === 'rents';
    const copy = isRents ? 'Welche Renten erwartest du? Beginne mit deiner AHV. Deine PK-Rente berechnen wir aus den Angaben deiner Pensionskasse.' : 'Lege deinen monatlichen Bedarf fest. Die PK-Varianten teilen diesen Bedarf und alle übrigen Annahmen.';
    const fields = isRents ? rentFields() : State.fields('need', state).map(field => ({...field, group:'need'}));
    const method = infoMarkup({label:'So rechnen wir', aria:'Rechenweg erklären', body:'<p>Die Berechnung verwendet den bestehenden gemeinsamen Rechenkern. Es werden keine Werte neben dem Rechner geschätzt.</p>'});
    // Testfunktionen (Beispielplanung, Stand laden) liegen im Testmodus, nicht im Erstnutzer-Flow.
      app.innerHTML = `${planHeader(planStatus())}${stepper(routeName === 'rents' ? 'rents' : 'need')}<div class="v3-layout"><section class="v3-form"><p class="v3-lead">${copy}</p>${isRents ? situationSegments() : ''}<form id="v3Form"><div class="v3-fields">${fields.map(field => fieldMarkup(field)).join('')}</div>${isRents ? '<p class="v3-hint">Die PK-Angaben ergänzt du anschliessend auf «Mein Plan».</p>' : ''}<p class="v3-error" id="v3Error" role="alert"></p><div class="v3-actions"><button type="button" data-v3-back ${isRents ? 'hidden' : ''}>Zurück</button><button class="primary" type="submit">${isRents ? 'Weiter zu meinem Bedarf' : 'Meinen Plan öffnen'}</button></div></form></section><aside class="v3-aside"><strong>${isRents ? 'Der Plan entsteht aus deinen Angaben.' : 'Die PK-Entscheidung kommt im Plan.'}</strong>${method}</aside></div>`;
    window.CantonPicker?.enhanceAll(app);
    app.querySelectorAll('[data-situation]').forEach(button => button.addEventListener('click', () => {
      assignForm(); state = V3State.changeMode(state, button.dataset.situation); renderStart();
    }));
    document.querySelector('[data-v3-back]')?.addEventListener('click', () => { setRentDraft(); renderForm('rents'); });
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
    return `${accumulation}<p>Im Ruhestand liegt dein Kapital in drei Töpfen: <strong>Cash</strong> ${percent(returns[0])} %, <strong>Anleihen</strong> ${percent(returns[1])} % und <strong>Wertschöpfung</strong> ${percent(returns[2])} % (Rendite deines Risikoprofils, real). Im Cash-Topf liegt die Entnahme des laufenden Jahres, in den Anleihen die Entnahmen der nächsten zwei Jahre, der Rest in der Wertschöpfung. Die Aufteilung wird jedes Jahr aus dem verbleibenden Kapital neu gebildet.</p><p>Die Entnahme eines Jahres ist der Bedarf abzüglich der Renten nach geschätzter Einkommenssteuer; die Kapitalbezugssteuer wird einmalig beim Bezug abgezogen und danach nicht mehr belastet. Alle Beträge sind nominale CHF des jeweiligen Jahres; die Renten sind feste Nominalbeträge.</p>${pre ? `<p>Die Aufteilung deines PK-Kapitals (${share} % Kapital) bestimmt nur, wie viel Rente und wie viel Kapital du beim Start hast – die Mechanik danach ist für alle Varianten dieselbe.</p>` : ''}`;
  }
  function incomeValues() { return {ahv:0, other:state.values.regular ?? 0, additional:0, ...state.details.income, canton:State.canton(state)}; }
  function returnToPlan() {
    stopYearPlay();
    state = normalizeP3(state);
    closeMenu();
    previewShare = null;
    if (!State.timing(state) || state.values.need === undefined) { setStartDraft(); renderStart(); return; }
    renderPlan(true);
  }
  // Whole PK situation for the chosen share: current split, running PK rent and PK capital together.
  function pensionBreakdown(source = state, share = previewShare ?? chosenShare()) {
    if (source.mode === 'post') return '<p class="v3-hint">Die tatsächlich laufende PK-Rente zählt zum Einkommen. Bereits bezogenes Kapital ist im verfügbaren Vermögen enthalten.</p>';
    const plan = planFor(share, source);
    if (!plan) return '<p class="v3-hint">Ergänze zuerst deine persönlichen Angaben, damit wir die Pensionskasse hochrechnen können.</p>';
    const pk = Calculator.calculatePension(plan), rentShare = 100 - share, code = plan.person.canton, capital = capitalTaxInfo(code, pk);
    return `<section id="pkBreakdown" class="v3-pk-breakdown" tabindex="-1" aria-labelledby="pkBreakdownTitle"><h2 id="pkBreakdownTitle">Deine PK-Situation</h2><p class="v3-hint">Hier siehst du deine PK-Rente, dein PK-Kapital und die aktuell gewählte Aufteilung bei Pensionierung mit ${plan.retirement.age}. Die Aufteilung wählst du unter «Mein Plan».</p><p class="v3-pk-split" data-pk-split><span>${share === chosenShare() ? 'Deine aktuelle Aufteilung' : 'Vorschau – aktueller Plan unverändert'}</span><strong>Kapitalbezug ${share} % · Rente ${rentShare} %</strong></p><div class="v3-pk-cards"><section id="pkRente" class="v3-pk-card" tabindex="-1" aria-labelledby="pkRenteTitle"><h3 id="pkRenteTitle">PK-Rente</h3><p class="v3-pk-value"><strong data-pk-rent>${money(pk.rent / 12)}</strong><span> / Monat</span></p><small data-pk-rent-year>${money(pk.rent)} / Jahr</small></section><section id="pkKapital" class="v3-pk-card" tabindex="-1" aria-labelledby="pkKapitalTitle"><h3 id="pkKapitalTitle">PK-Kapital</h3><dl><div><dt>Brutto</dt><dd data-pk-gross>${money(pk.cap)}</dd></div><div><dt>Bezugssteuer</dt><dd data-pk-tax>${plan?.person?.canton ? `− ${money(pk.capitalTax)}` : 'Steuern offen'}</dd></div><div><dt>${plan?.person?.canton ? 'Netto' : 'Netto noch offen'}</dt><dd data-pk-net>${plan?.person?.canton ? money(pk.netCap) : 'Steuern offen'}</dd></div></dl></section></div>${capital ? infoMarkup({label:'So rechnen wir mit der Bezugssteuer', aria:'Kapitalbezugssteuer erklären', body:capital.body}) : ''}</section>`;
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
  /* Daten und Sicherung (bei den Annahmen, immer sichtbar): einen gesicherten Stand aus einer
     Datei laden oder den gespeicherten Stand löschen. Beide Aktionen sperren das eigene
     Speichern, damit der neue bzw. gelöschte Stand nicht sofort wieder überschrieben wird. */
  function dataSectionMarkup() {
    return `<section class="v3-data" aria-labelledby="v3DataTitle"><h2 id="v3DataTitle">Daten und Sicherung</h2><p class="v3-hint">Dein Plan liegt nur auf diesem Gerät. Du kannst einen gesicherten Stand aus einer JSON-Datei laden oder den gespeicherten Stand löschen.</p><div class="v3-data-actions"><button type="button" class="v3-data-load" data-data-load>Stand laden</button><input type="file" accept=".json,application/json" hidden data-data-file><button type="button" class="v3-data-clear" data-data-clear>Stand löschen</button></div><p class="v3-data-status" data-data-status role="status"></p></section>`;
  }
  /* Übernimmt eine gesicherte Datei: Speicherhülle der App oder reiner Zustand. Die Datei wird
     vor dem Schreiben mit derselben Prüfung wie beim App-Start validiert; gibt den Fehler zurück. */
  function importState(raw) {
    let envelope;
    try {
      const parsed = JSON.parse(raw);
      envelope = parsed && parsed.state && Number.isFinite(Number(parsed.version)) ? parsed : {version:2, savedAt:new Date().toISOString(), state:parsed};
      V3State.decode(JSON.stringify(envelope));
    } catch (error) { return `Datei nicht geladen: ${error.message}`; }
    globalThis.localStorage.setItem(storageKey, JSON.stringify(envelope));
    return '';
  }
  function bindDataSection() {
    const status = text => { const node = app.querySelector('[data-data-status]'); if (node) node.textContent = text || ''; };
    const input = app.querySelector('[data-data-file]');
    const load = app.querySelector('[data-data-load]'), clear = app.querySelector('[data-data-clear]');
    if (!load || !clear) return;
    load.addEventListener('click', () => { status(''); if (input) { input.value = ''; input.click(); } });
    input?.addEventListener('change', () => {
      const chosen = input.files?.[0];
      if (!chosen) return;
      const reader = new FileReader();
      reader.onload = () => {
        const problem = importState(String(reader.result ?? ''));
        status(problem || `Stand «${chosen.name}» geladen.`);
        if (!problem) { suspendSaving(); globalThis.location.reload(); }
      };
      reader.onerror = () => status(`«${chosen.name}» konnte nicht gelesen werden.`);
      reader.readAsText(chosen);
    });
    // Löschen nur nach Bestätigung (zwei Schritte, kein zweiter Dialog).
    clear.addEventListener('click', () => {
      if (clear.dataset.confirmed !== 'true') {
        clear.dataset.confirmed = 'true'; clear.textContent = 'Wirklich löschen?';
        status('Beim Bestätigen wird der gespeicherte Stand auf diesem Gerät entfernt.');
        return;
      }
      globalThis.localStorage.removeItem(storageKey);
      suspendSaving();
      globalThis.location.reload();
    });
  }
  function renderDetail(detail, focusSection = '', focusHighlight = '') {
    closeMenu(); chartObserver?.disconnect(); route = detail; markDirty(); assetPart = null;
    window.scrollTo(0, 0);
    const pension = detail === 'pension';
    const fields = editorFields(detail);
    // Eine Datenquelle je Wert: Zeigt der Schnellstart eine Annahme (z. B. AHV CHF 3'000),
    // steht sie auch im Detail-Editor – mit sichtbarer Herkunft, bis der Nutzer sie ersetzt.
    const assumedAhv = detail === 'ahv' && Estimates && Estimates.ahvOf(state).origin === 'estimated';
    const initial = detail === 'personal' ? {...state.values, canton:State.canton(state)}
      : ['ahv','extra'].includes(detail) ? {...incomeValues(), ...(assumedAhv ? {ahv:Estimates.ahv.monthly} : {})}
      : detail === 'assumptions' ? assumptionValues()
      : pension ? {...assumptionValues(), ...state.details.pension}
      : {...state.values, ...state.details[detail]};
    draft = Object.fromEntries(fields.map(field => [field.key, initial[field.key] ?? '']));
    const originNote = assumedAhv ? `<p class="v3-start-hint" id="assumptionOrigin">Aus dem Schnellstart übernommen (Annahme ${money(Estimates.ahv.monthly)} / Monat). Deine Eingabe ersetzt sie.</p>` : '';
    const modeField = detail === 'personal' ? `<div class="v3-field"><label for="personMode">Deine Situation</label><select id="personMode"><option value="pre" ${state.mode === 'pre' ? 'selected' : ''}>Vor der Pensionierung</option><option value="post" ${state.mode === 'post' ? 'selected' : ''}>Bereits pensioniert</option></select></div>` : '';
    const hint = pension ? (state.mode === 'pre' ? 'Erfasse dein PK-Guthaben und die Sparbeiträge von dir und deinem Arbeitgeber zusammen. Kapitalanteil und Varianten wählst du unter «Mein Plan».' : 'Erfasse die PK-Rente, die du heute tatsächlich erhältst.') : detail === 'pension3a' ? 'Erfasse dein 3a-Guthaben heute und die jährlichen Beiträge bis zur Pensionierung.' : 'Änderungen gelten für deinen Plan und alle Varianten.';
    const p3Note = detail === 'pension3a' ? infoMarkup({label:'Säule 3a netto', body:`<p>${p3TaxNotice}</p>`}) : '';
    // Inflation als Modellannahme: eine Zahlenwelt, nominale CHF des jeweiligen Jahres.
    const inflationNote = detail === 'assumptions' ? infoMarkup({label:'Inflation', aria:'Verwendung der Inflationsannahme erklären', body:'<p>Wird verwendet, um zukünftige Ausgaben und dafür vorgesehene Einnahmen hochzurechnen. Alle angezeigten Beträge sind nominale CHF des jeweiligen Jahres.</p><p>Der Lebensbedarf steigt mit dieser Annahme. Renten werden nur dann angepasst, wenn du für sie eine Indexierung erfasst hast – bei Schweizer PK-Renten hängt ein Teuerungsausgleich von der Vorsorgeeinrichtung ab.</p>'}) : '';
    // Mechanik transparent: welche Rendite wo wirkt und wie das Kapital im Ruhestand aufgeteilt wird.
    const rateNote = detail === 'assumptions' ? infoMarkup({label:'So rechnen wir mit Renditen', aria:'Verwendete Renditen und Kapitalaufteilung erklären', body:rateBody()}) : '';
    // Herkunft der AHV-Rente: Pauschale, solange keine eigene Angabe erfasst ist.
    const estimateNote = detail === 'ahv' && Estimates ? infoMarkup({label:'Geschätzte AHV-Rente', aria:'Herkunft der AHV-Rente erklären', body:`<p>${Estimates.ahv.note} Deine Eingabe ersetzt die Pauschale sofort.</p>`}) : '';
    // Daten und Sicherung stehen bei den Annahmen: laden, löschen – ohne Testmodus.
    const dataSection = detail === 'assumptions' ? dataSectionMarkup() : '';
    app.innerHTML = `${pageHeader(editorTitles[detail])}<div class="v3-detail-layout"><section class="v3-detail-form"><p class="v3-sublead">${hint}</p><form id="v3DetailForm">${modeField}<div class="v3-fields" id="detailFields" tabindex="-1">${fields.map(fieldMarkup).join('')}</div>${p3Note}${inflationNote}${rateNote}${originNote}${estimateNote}<p class="v3-error" id="v3Error" role="alert"></p><div id="pensionResult">${pension ? pensionBreakdown() : ''}</div><div class="v3-actions"><button type="button" data-detail-back>Abbrechen</button><button class="primary" type="submit">Übernehmen</button></div></form>${dataSection}</section></div>`;
    window.CantonPicker?.enhanceAll(app);
    document.querySelector('[data-detail-back]').addEventListener('click', returnToPlan);
    bindDataSection();
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
    const p3Info = infoMarkup({label:'Säule 3a netto', body:p3TaxExplanation(pre ? State.toPlan(s) : null)});
    const capital = pre ? capitalTaxInfo(State.canton(s), b.pk) : null;
    return `<p class="v3-hint">${pre ? `Verfügbare Mittel ab Pensionierung mit ${s.values.retirement}` : `Verfügbare Mittel ab Alter ${s.values.age}`}</p><div class="v3-assets">
     ${assetRowMarkup({part:'cash', label:'Bank / liquide Mittel', value:b.assets.cash})}
     ${assetRowMarkup({part:'securities', label:'Wertschriften', value:b.assets.securities, hint:pre ? projection : ''})}
     ${assetRowMarkup({part:'otherAssets', label:'Weitere verfügbare Vermögenswerte', value:b.assets.other})}
     ${rest !== null && rest > 0 ? assetRowMarkup({part:'unallocated', label:'Noch nicht aufgeteiltes Vermögen', value:rest, hint:'Rest deiner bisherigen Gesamtsumme'}) : ''}
     ${pre ? assetRowMarkup({source:'pension3a', label:'Säule 3a netto', value:p3Available, hint:b.assets.p3Gross===null?projection:`Bezug mit ${b.assets.p3Age} · ${money(b.assets.p3Gross)} brutto minus ${money(b.assets.p3Tax)} geschätzte Bezugssteuer`, badge:'aus Vorsorge', info:p3Info}) : ''}
     ${pre ? assetRowMarkup({source:'pension', label:hasCanton(s) ? 'PK-Kapital netto' : 'PK-Kapital brutto', value:b.assets.pk, hint:hasCanton(s) ? 'gemäss deinem aktuellen Plan' : 'Steuern offen', badge:'aus Vorsorge', focus:'pkBreakdown', highlight:'pkKapital', info:capital ? infoMarkup({label:'So rechnen wir mit der Bezugssteuer', aria:'Kapitalbezugssteuer erklären', body:capital.body}) : ''}) : ''}
    </div><dl class="v3-asset-total" id="assetTotal" tabindex="-1"><div><dt>Verfügbares Vermögen total</dt><dd>${money(b.result.availableCapital)}</dd></div></dl><p class="v3-plan-note">${pre ? modalLink({label:'Wie Vorsorgekapital angerechnet wird', title:'Vorsorgekapital im verfügbaren Vermögen', aria:'Anrechnung des Vorsorgekapitals erklären', body:p3TaxExplanation(State.toPlan(s))}) : modalLink({label:'Was hier bereits enthalten ist', title:'Verfügbares Vermögen nach der Pensionierung', aria:'Zusammensetzung des verfügbaren Vermögens erklären', body:'<p>Bereits bezogenes PK- und 3a-Kapital ist in deinen verfügbaren Mitteln enthalten und wird nicht nochmals hinzugezählt.</p>'})}</p><section class="v3-bound-assets"><h2>Gebundenes Vermögen</h2>${assetRowMarkup({part:'property', label:'Immobilien netto', value:b.assets.bound, hint:'Immobilienwert abzüglich Hypotheken'})}<p class="v3-hint">Dieses Vermögen ist aktuell nicht für laufende Entnahmen eingeplant.</p></section>`;
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
    else if (name === 'improve') renderImprove();
    else renderDetail(name, focusSection, focusHighlight);
  }
  // Sämtliche Ergebniswerte kommen aus dem gemeinsamen Rechenkern.
  function planFor(share, source = state) {
    const plan = State.toPlan(normalizeP3(source));
    if (plan && source.mode === 'pre') plan.pensionDecision.capitalShare = share;
    return withEstimates(plan, source);
  }
  /* Pauschalen gelten nur, solange nichts erfasst ist. Sie werden in die Planstruktur ergänzt,
     aus der der Rechenkern die Einnahmen liest (`income.pre`/`income.post`, Jahreswerte);
     gerechnet wird unverändert im Rechenkern, und der gespeicherte Stand bleibt unberührt. */
  function withEstimates(plan, source) {
    if (!plan || !Estimates) return plan;
    const ahv = Estimates.ahvOf(source);
    if (ahv.origin === 'estimated') {
      const annual = ahv.monthly * 12;
      if (plan.income?.pre && !(numeric(plan.income.pre.ahv) > 0)) plan.income.pre.ahv = annual;
      if (plan.income?.post && !(numeric(plan.income.post.ahv) > 0)) plan.income.post.ahv = annual;
    }
    // Ohne Wohnkanton rechnet der erste Check mit einer geschätzten Steuerannahme (mittleres
    // Kantonsmodell); der eigene Wohnkanton ersetzt sie. Der Rechenkern bleibt unverändert.
    if (!State.canton(source)) {
      const code = estimatedCanton(plan);
      if (code) plan.person.canton = code;
    }
    return plan;
  }
  /* Kanton mit dem mittleren Modellsatz für das erwartete Einkommen – nur für den ersten Check. */
  function estimatedCanton(plan) {
    const Tax = globalThis.TaxModel, cantons = Tax?.config?.cantons;
    if (!Tax || !cantons) return '';
    const income = plan?.income ?? {};
    const reference = numeric(income.pre?.ahv) + numeric(income.pre?.other) + numeric(income.post?.pkRent) || 60000;
    const rated = Object.keys(cantons)
      .map(code => ({code, rate:Tax.getIncomeTaxRate(code, reference)}))
      .filter(entry => Number.isFinite(entry.rate))
      .sort((a, b) => a.rate - b.rate);
    return rated.length ? rated[Math.floor(rated.length / 2)].code : '';
  }
  function evaluated(share, source = state) { const plan = planFor(share, source); return plan ? {plan, result:Calculator.evaluatePlan(plan), pension:Calculator.calculatePension(plan)} : null; }
  /* «Renten total / Monat» mit den echten Beträgen je Rente herleiten. */
  function rentsInfo(item) {
    const sources = Calculator.incomeSourcesAtStart(item.plan).filter(source => source.annualIncome > 0.5);
    const estimatedAhv = Estimates && Estimates.ahvOf(state).origin === 'estimated';
    const line = (label, amount) => `<div><dt>${label}</dt><dd>${amount}</dd></div>`;
    const rows = sources.map(source => line(`${esc(source.name)}${source.id === 'ahv' && estimatedAhv ? ' <small>geschätzt</small>' : ''}`, `${money(source.annualIncome / 12)} / Monat`)).join('');
    const total = sources.reduce((sum, source) => sum + source.annualIncome, 0) / 12;
    const hint = estimatedAhv ? 'Die AHV-Rente ist eine Pauschale; ersetze sie unter «AHV-Renten» durch deine eigene Rente. ' : '';
    const split = 'Die Aufteilung in AHV, PK-Rente und weitere Renten kannst du unter «AHV-Renten» und «Weitere Einnahmen» präzisieren. ';
    const body = `<p>Alle laufenden Renten zusammen, <strong>vor Steuern</strong>:</p><dl class="v3-info-list">${rows}${line('<strong>Renten total</strong>', `<strong>${money(total)} / Monat</strong>`)}</dl><p>${hint}${split}Die Steuern sind hier nicht abgezogen – das zeigt «Einkommen netto / Monat».</p>`;
    return modalInfo({title:'Renten total / Monat', aria:'Renten erklären', body});
  }
  /* «Einkommen netto / Monat» transparent herleiten – mit den echten Zahlen des ersten
     Planjahres: Einnahmen je Quelle, Steuerbasis, Steuersatz, Steuer, Netto. */
  function incomeNetInfo(item) {
    const plan = item.plan, row = item.result.yearlyProjection?.[0] ?? {};
    const value = {...row, ...(row.nominal ?? {})};
    const canton = State.canton(state) || plan.person?.canton || '';
    const rate = TaxModel.getIncomeTaxRate(canton, value.taxableAnnualIncome);
    const sources = Calculator.incomeSourcesAtStart(plan).filter(source => source.annualIncome > 0.5);
    const line = (label, amount) => `<div><dt>${label}</dt><dd>${amount}</dd></div>`;
    const estimatedAhv = Estimates && Estimates.ahvOf(state).origin === 'estimated';
    const sourceRows = sources.map(source => line(`${esc(source.name)}${source.id === 'ahv' && estimatedAhv ? ' <small>geschätzt</small>' : ''}`, `${money(source.annualIncome / 12)} / Monat`)).join('');
    const taxNote = hasCanton()
      ? 'Modellrechnung mit dem kantonalen Durchschnittssatz. Die tatsächliche Steuer hängt von Gemeinde, Zivilstand, Konfession und Abzügen ab.'
      : 'Ohne Wohnkanton schätzen wir die Steuer mit dem kantonalen Modell eines mittleren Kantons. Ergänze deinen Wohnkanton, um die Schätzung zu verbessern.';
    const body = `<p>So entsteht das Einkommen netto im ersten Planjahr:</p><dl class="v3-info-list">${sourceRows}${line('Einnahmen vor Steuern', `${money(value.grossIncome / 12)} / Monat`)}${line('Steuerbares Einkommen', `${money(value.taxableAnnualIncome)} / Jahr`)}${line(`Steuerannahme ${esc(canton)}`, `${percent(rate)} %`)}${line('Geschätzte Einkommenssteuer', `− ${money(numeric(value.estimatedIncomeTax) / 12)} / Monat`)}${line('<strong>Einkommen netto</strong>', `<strong>${money(value.rent / 12)} / Monat</strong>`)}</dl><p>${taxNote}</p><p>Die einmalige Kapitalbezugssteuer beim PK-Bezug ist hier nicht enthalten; sie fällt nur im Bezugsjahr an. Alle Beträge sind nominale CHF des ersten Planjahres.</p>`;
    return modalInfo({title:'Einkommen netto / Monat', aria:'Einkommen netto erklären', body});
  }
  /* Gemeinsame Kennzahlen für Rentner und Nicht-Rentner – dieselben vier Kacheln:
     Renten total (inkl. AHV), Einkommen netto, Bedarf netto, Fehlbetrag. Nach der
     Pensionierung entfällt nur der Kapitalentscheid, nicht dieser Block. */
  function coreReadout(item) {
    const sources = Calculator.incomeSourcesAtStart(item.plan);
    const monthly = id => (sources.find(source => source.id === id)?.annualIncome ?? 0) / 12;
    const rents = monthly('ahv') + monthly('pk') + monthly('other');
    const needInfo = modalInfo({title:'Bedarf netto / Monat', aria:'Nettobedarf erklären', body:'<p>Dein monatlicher Bedarf nach Steuern (netto), aus deinen Angaben zum Bedarf.</p>'});
    const gapInfo = modalInfo({title:'Fehlbetrag / Monat', aria:'Fehlbetrag erklären', body:'<p>Was nach deinem laufenden Nettoeinkommen monatlich offen bleibt und aus deinem verfügbaren Kapital entnommen wird. Basis ist die Basisrechnung ohne Stressszenario.</p>'});
    const tile = (icon, label, value, {extra = '', info = '', note = ''} = {}) => `<div class="v3-readout-tile${extra}"><span>${Icons.icon(icon, {size:18})} ${label} ${info}</span><strong>${money(value)}</strong>${note ? `<small>${note}</small>` : ''}</div>`;
    return `${tile('buildingBank', 'Renten total / Monat', rents, {info:rentsInfo(item)})}${tile('wallet', 'Einkommen netto / Monat', item.result.monthlyIncomeNet, {info:incomeNetInfo(item)})}${tile('shoppingCart', 'Bedarf netto / Monat', item.result.monthlyNeed, {info:needInfo})}${tile('alertCircle', 'Fehlbetrag / Monat', item.result.monthlyGap, {extra:' v3-readout-gap', info:gapInfo, note:'nach geschätzten Steuern'})}`;
  }
  /* Vor der Pensionierung zusätzlich die beiden PK-Kacheln des Kapitalentscheids
     (anklickbar); der Schieber selbst bleibt darüber. */
  function readout(item) {
    const taxed = !!item?.plan?.person?.canton;
    const pkTiles = `<button type="button" class="v3-readout-tile" data-v3-next="pension" data-focus-section="pkBreakdown" data-focus-highlight="pkRente"><span>${Icons.icon('buildingBank', {size:18})} PK-Rente / Monat</span><strong>${money(item.pension.rent / 12)}</strong></button><button type="button" class="v3-readout-tile" data-pk-breakdown><span>${Icons.icon('pigMoney', {size:18})} ${taxed ? 'PK-Kapital netto' : 'PK-Kapital brutto'}</span><strong>${money(item.pension.netCap)}</strong>${taxed ? (hasCanton() ? '' : '<small>Steuern geschätzt</small>') : '<small>Steuern offen</small>'}</button>`;
    return `<div class="v3-readout">${coreReadout(item)}${pkTiles}</div>`;
  }
  function currentVariants() { return variantShares().map((share, index) => ({share, index, ...evaluated(share)})).filter(item => item.plan); }
  /* «Weiteres Kapital» (§4.4): alles, was zusätzlich zum PK-Kapital zum Start verfügbar ist.
     Die Zusammensetzung kommt aus dem Datenmodell; die Säule 3a zählt mit ihrem
     Nettobetrag nach Bezugssteuer, damit PK netto + weiteres Kapital = Startkapital gilt. */
  function furtherCapital(s, item) {
    const capital = Calculator.calculateAvailableCapital(item.plan, item.share);
    const projected = Calculator.calculateRetirementStart(item.plan);
    const a = s.details.assets ?? null, pre = s.mode === 'pre';
    // Ohne Vermögensaufteilung ist der eingegebene Gesamtbetrag der freie Teil;
    // mit Aufteilung zählt ausschliesslich der dort geführte Rest (wie im Rechenkern).
    const free = a ? (a.unallocated !== undefined ? numeric(a.unallocated) : 0) : (s.values.free !== undefined ? numeric(s.values.free) : null);
    // Wertschriften zählen wie im Rechenkern mit ihrer Hochrechnung zum Start, nicht mit dem Eingabewert.
    const securities = entered(a?.securities) ? (pre && projected ? projected.sec : numeric(a.securities)) : null;
    const rows = [
      ['Säule 3a (netto)', pre && s.details.pension3a ? capital.p3.netAtStart : null],
      ['Freies Vermögen', free],
      ['Wertschriften', securities],
      ['Bank / liquide Mittel', entered(a?.cash) ? numeric(a.cash) : null],
      ['Weitere Kapitalpositionen', entered(a?.otherAssets) ? numeric(a.otherAssets) : null]
    ].filter(([, value]) => value !== null && value > 0.5);
    const total = rows.reduce((sum, [, value]) => sum + value, 0);
    return {rows, total, available:p3AvailableFrom(item.plan), planned:capital.existingFreeCapital};
  }
  /* Verfügbarkeit der 3a-Position: der Bezug liegt ein Jahr vor dem PK-Bezug. */
  function p3AvailableFrom(plan) {
    const capital = Calculator.calculateAvailableCapital(plan);
    return capital.p3 && capital.p3.withdrawalAge !== null ? `verfügbar ab Alter ${capital.p3.withdrawalAge}` : '';
  }
  /* Beurteilung je Variante und für den aktuellen Plan – dieselbe Quelle (evaluatePlan).
     Ohne Wohnkanton gibt es eine vorläufige Aussage mit geschätzter AHV und geschätzten
     Steuern: «geht auf» bzw. «noch knapp», nie ein hartes «geht nicht auf». */
  function outcomeOf(item) {
    if (!item) return {tone:'pending', short:'Noch keine Angaben', long:''};
    const result = item.result, estimated = !hasCanton();
    if (estimated) {
      const note = 'Erste Orientierung mit geschätzter AHV und geschätzten Steuern.';
      if (result.capitalExhaustionAge) return {tone:'watch', short:'Dein Plan ist noch knapp', long:`Mit den bisherigen Angaben reicht dein Vermögen voraussichtlich bis Alter ${result.capitalExhaustionAge}.`, note};
      return {tone:'covered', short:'Dein erster Plan geht auf', long:`Mit den bisherigen Angaben reicht dein Vermögen bis zum Planungshorizont Alter ${item.plan.retirement.targetAge}.`, note};
    }
    // Die Überschrift nennt den Planungshorizont, der Satz darunter das Abbaualter – sonst
    // widersprechen sich die beiden Zahlen («Reicht nicht bis Alter 87» vs. «reicht bis 87»).
    if (result.capitalExhaustionAge) return {tone:'gap', short:`Reicht nicht bis Alter ${item.plan.retirement.targetAge}`, long:`Dein Vermögen reicht voraussichtlich bis Alter ${result.capitalExhaustionAge}. Danach entsteht eine Finanzierungslücke.`};
    if (result.stressGapAge) return {tone:'watch', short:`Knapp – Risiko ab Alter ${result.stressGapAge}`, long:`Nur bei einer ungünstigen Entwicklung entsteht ab Alter ${result.stressGapAge} eine Lücke.`};
    return {tone:'covered', short:'Plan geht auf', long:`Unter den gewählten Annahmen ist dein Lebensstandard bis Alter ${item.plan.retirement.targetAge} finanzierbar.`};
  }
  function variantStatus(item) {
    const outcome = outcomeOf(item);
    return `<span class="v3-variant-status ${outcome.tone}">${outcome.tone === 'covered' ? Icons.icon('circleCheck', {size:15}) : outcome.tone === 'gap' || outcome.tone === 'watch' ? Icons.icon('alertCircle', {size:15}) : ''} ${outcome.short}</span>`;
  }
  /* «So kannst du deinen Plan verbessern»: höchstens drei Massnahmen, aus der Planung
     abgeleitet und – wo möglich – mit berechneter Wirkung. Gerechnet wird ausschliesslich
     im gemeinsamen Rechenkern (Profilvarianten, Bedarfsvariante). */
  const profileLabels = {cautious:'Vorsichtig', balanced:'Ausgewogen', growth:'Chancenorientiert'};
  function reachAge(result, targetAge) {
    return result.capitalExhaustionAge ? `Alter ${result.capitalExhaustionAge}` : `Alter ${targetAge}+`;
  }
  function planWithNeed(plan, monthlyDelta) {
    const next = JSON.parse(JSON.stringify(plan));
    const delta = monthlyDelta * 12;
    if (next.spending) next.spending.annualNeed = Math.max(0, numeric(next.spending.annualNeed) + delta);
    if (Array.isArray(next.spending?.phases)) next.spending.phases = next.spending.phases.map(phase => ({...phase, need:Math.max(0, numeric(phase.need) + delta)}));
    return next;
  }
  function planActionRows(item) {
    const plan = item.plan, target = plan.retirement.targetAge, pre = state.mode === 'pre';
    const known = dataKnown(), income = state.details.income ?? {};
    const rows = [];
    // 1 · Angaben vervollständigen – nur solange etwas fehlt.
    if (!known.assets) rows.push({icon:'listDetails', title:'Ist dein Vermögen vollständig erfasst?', text:'Kontoguthaben, Wertschriften, Festgelder oder andere verfügbare Anlagen können deinen Plan wesentlich verändern.', cta:'Vermögen ergänzen', page:'assets'});
    else if (!entered(income.additional) && !entered(income.other)) rows.push({icon:'coins', title:'Hast du weitere Einnahmen?', text:'Zum Beispiel Mieteinnahmen, Erwerbseinkommen, Versicherungsleistungen oder andere regelmässige Einnahmen.', cta:'Einnahmen ergänzen', page:'extra'});
    // 2 · Anlagestrategie prüfen – mit berechneter Reichweite je Profil. Wirkt die Rendite
    // nicht auf das Abbaualter (alle Profile gleich), wird das Restkapital zum Horizont gezeigt.
    const profiles = globalThis.RiskProfiles;
    if (profiles?.profiles) {
      const currentKey = plan.riskProfile, current = profiles.getRiskProfile(currentKey);
      const currentRate = (numeric(current?.expectedRealReturn) * 100).toLocaleString('de-DE', {maximumFractionDigits:1});
      const variants = Object.keys(profiles.profiles).map(key => {
        const variant = Calculator.withReturnProfile(plan, key), result = Calculator.evaluatePlan(variant);
        return {key, variant, result, profile:profiles.getRiskProfile(key), age:result.capitalExhaustionAge ?? null, rest:numeric(result.capitalAtTargetAgeNominal)};
      });
      const ages = new Set(variants.map(entry => entry.age ?? `+${target}`));
      const sameAge = ages.size === 1;
      // Restkapital nur zeigen, wenn es sich zwischen den Profilen unterscheidet.
      const restDiffers = new Set(variants.map(entry => Math.round(Math.max(0, entry.rest)))).size > 1;
      const showRest = sameAge && restDiffers;
      const lines = variants.map(entry => {
        const rate = (numeric(entry.profile?.expectedRealReturn) * 100).toLocaleString('de-DE', {maximumFractionDigits:1});
        const reach = entry.age ? `reicht bis Alter ${entry.age}` : `reicht bis Alter ${target}+`;
        const rest = showRest ? ` · Restkapital ${money(Math.max(0, entry.rest))}` : '';
        return `<li${entry.key === currentKey ? ' class="current"' : ''}><span>${profileLabels[entry.key] ?? entry.key}</span><strong>${rate} %</strong><small>${reach}${rest}</small></li>`;
      }).join('');
      const note = showRest
        ? 'Langfristige Modellannahmen; höhere Chancen bedeuten grössere Schwankungen. Die Rendite wirkt hier vor allem auf das Restkapital am Planungshorizont. Auch im Ruhestand kann ein Wachstumsteil helfen, einen langen Horizont und die Inflation abzudecken.'
        : 'Langfristige Modellannahmen; höhere Chancen bedeuten grössere Schwankungen. Auch im Ruhestand kann ein Wachstumsteil helfen, einen langen Horizont und die Inflation abzudecken.';
      rows.push({icon:'chartLine', title:'Anlagestrategie prüfen', text:`Dein Plan rechnet aktuell mit der Anlageannahme «${profileLabels[currentKey] ?? currentKey}» (${currentRate} % real im Wachstumsteil). Prüfe, wie sich andere Anlagestrategien auf deinen Plan auswirken.`, list:`<ul class="v3-action-profiles">${lines}</ul>`, note, cta:'Annahmen öffnen', page:'assumptions'});
    }
    // 3 · Bedarf anpassen – die kleinste runde Reduktion zeigen, die die Reichweite verschiebt;
    // wirkt keine, steht die ehrliche Aussage statt einer Scheinwirkung.
    const base = item.result.capitalExhaustionAge ?? null;
    let delta = 0, cheaper = item.result;
    for (const step of [500, 1000, 1500, 2000]) {
      const result = Calculator.evaluatePlan(planWithNeed(plan, -step));
      const age = result.capitalExhaustionAge ?? null;
      const better = base === null ? false : (age === null || age > base);
      if (better) { delta = step; cheaper = result; break; }
      cheaper = result;
    }
    const baseLabel = reachAge(item.result, target);
    const impact = delta
      ? `CHF ${delta.toLocaleString('de-CH')} weniger pro Monat → Vermögen reicht bis ${reachAge(cheaper, target)} statt ${baseLabel}`
      : (base === null
        ? `Dein Vermögen reicht heute schon ${baseLabel}; der Bedarf beeinflusst das Restkapital.`
        : `Auch CHF 2'000 weniger pro Monat verschieben die Reichweite nicht über ${baseLabel} – dein Vermögen ist dafür zu klein. Prüfe zusätzlich Einnahmen und die Anlagestrategie.`);
    rows.push({icon:'shoppingCart', title:'Bedarf netto anpassen', text:'Sieh, wie sich ein tieferer Nettobedarf auf die Haltbarkeit deines Vermögens auswirkt.', impact, cta:'Bedarf anpassen', page:'need'});
    return rows.slice(0, 3);
  }
  /* Die Massnahmen stehen auf einem eigenen Screen; auf «Mein Plan» führt ein kompakter
     Einstieg mit Verbesserungs-Icon dorthin, damit die Karte kurz bleibt. */
  function planActions(rowList) {
    if (!rowList.length) return '';
    const row = action => `<li><span class="v3-action-icon" aria-hidden="true">${Icons.icon(action.icon, {size:20})}</span><div class="v3-action-body"><strong>${action.title}</strong><p>${action.text}</p>${action.impact ? `<p class="v3-action-impact">${action.impact}</p>` : ''}${action.list ?? ''}${action.note ? `<p class="v3-action-note">${action.note}</p>` : ''}</div><button type="button" class="v3-action-cta" data-v3-next="${action.page}">${action.cta} <span aria-hidden="true">→</span></button></li>`;
    return `<section class="v3-actions-plan"><h3>So kannst du deinen Plan verbessern</h3><ul>${rowList.map(row).join('')}</ul></section>`;
  }
  function improveEntry(count) {
    if (!count) return '';
    return `<button type="button" class="v3-improve-entry" data-v3-next="improve"><span class="v3-improve-icon" aria-hidden="true">${Icons.icon('bulb', {size:20})}</span><span class="v3-improve-copy"><strong>Plan verbessern</strong><small>${count === 1 ? '1 Idee' : `${count} Ideen`} mit gerechneter Wirkung</small></span><span class="v3-improve-chevron" aria-hidden="true">${Icons.icon('chevronRight', {size:18})}</span></button>`;
  }
  /* Eigener Screen «Plan verbessern»: Status zur Einordnung, darunter die Massnahmen. */
  function renderImprove() {
    closeMenu(); chartObserver?.disconnect(); route = 'improve'; markDirty();
    window.scrollTo(0, 0);
    const item = evaluated(chosenShare());
    if (!item) { returnToPlan(); return; }
    const rows = planActionRows(item);
    app.innerHTML = `<header class="v3-heading v3-heading-detail"><button type="button" class="home-link" data-improve-back>← Mein Plan</button><h1>Plan verbessern</h1></header><div class="v3-detail-layout"><section class="v3-detail-form"><p class="v3-sublead">Was du mit den heutigen Angaben verändern kannst – jeweils mit berechneter Wirkung.</p>${planOutcome(item)}${planActions(rows)}${rows.length ? '' : '<p class="v3-hint">Dein Plan ist vollständig und geht auf – im Moment gibt es nichts zu verbessern.</p>'}</section></div>`;
    document.querySelector('[data-improve-back]')?.addEventListener('click', returnToPlan);
  }
  /* Statusbox zum aktuellen Plan mit dem Weg in den Jahresverlauf. Die vorläufige Aussage
     (ohne Wohnkanton) nennt ihre Grundlage und bietet den Weg zur Schärfung an. */
  function planOutcome(item) {
    const outcome = outcomeOf(item);
    const icon = outcome.tone === 'covered' ? 'circleCheck' : 'alertCircle';
    const note = outcome.note ? `<p class="v3-outcome-note">${outcome.note}</p>` : '';
    return `<div class="v3-outcome ${outcome.tone}"><span class="v3-outcome-icon" aria-hidden="true">${Icons.icon(icon, {size:20})}</span><div><strong>${outcome.short}</strong><p>${outcome.long}</p>${note}</div><button type="button" class="v3-outcome-link" data-v3-next="years">Jahresverlauf ansehen ${Icons.icon('chevronRight', {size:16})}</button></div>${taxEstimateNote()}`;
  }
  /* Ohne Wohnkanton: Steuern sind geschätzt – ruhig benannt statt «Steuern offen». */
  function taxEstimateNote() {
    if (hasCanton()) return '';
    const body = `<p>Für den ersten Check schätzen wir die Steuern mit dem kantonalen Modell eines mittleren Kantons für dein erwartetes Einkommen. Die AHV-Rente ist mit ${Estimates ? money(Estimates.ahv.monthly) : ''} pro Monat angenommen.</p><p>Modellrechnung, keine individuelle Steuerberechnung. Ergänze deinen Wohnkanton, um die Schätzung zu verbessern.</p>`;
    return `<div class="v3-tax-estimate"><span>Steuern geschätzt</span> ${infoMarkup({iconOnly:true, aria:'Geschätzte Steuern erklären', body})}<small>Wohnkanton ergänzen, um die Schätzung zu verbessern.</small></div>`;
  }
  /* Einstiegskachel am Seitenende. */
  function entryTile(target, icon, title, subtitle) {
    const attribute = target === 'pots' ? 'data-pots-modal' : `data-v3-next="${target}"`;
    return `<button type="button" class="v3-entry" ${attribute}><span class="v3-entry-icon" aria-hidden="true">${Icons.icon(icon, {size:24})}</span><span class="v3-entry-copy"><strong>${title}</strong><small>${subtitle}</small></span></button>`;
  }
  function marker(index) { return index === 0 ? '●' : index === 1 ? '■' : '◆'; }
  /* Verbindlicher Variantenname: ausschliesslich der tatsächliche Kapitalbezug (§6.1). */
  const variantName = share => `${share} % Kapitalbezug`;
  const splitLabel = variantName;
  /* Sichtbare Aktion oben rechts: der aktuelle Plan ist bezeichnet, die anderen
     lassen sich mit «Übernehmen» austauschen (§6.2). */
  function variantActions(share) {
    const current = share === chosenShare();
    return current
      ? `<span class="v3-variant-badge">${Icons.icon('circleCheck', {size:16})} Aktueller Plan</span>`
      : `<button type="button" class="v3-variant-adopt" data-adopt-variant="${share}">Übernehmen</button>`;
  }
  /* Eine Darstellung für alle Varianten (Plan und Vergleich): dieselben fünf Kennzahlen,
     damit auf einen Blick sichtbar ist, dass sich nur die PK-Angaben unterscheiden –
     die Gesamtsicht (Total-Rente, Startkapital, Vermögen) bleibt immer sichtbar. */
  function metricInfo(key, targetAge, item = null) {
    const body = {
      totalRent: '<p>AHV und alle Renten zusammen, pro Monat und vor Steuern.</p>',
      start: startCapitalInfo(item),
      target: `<p>Verfügbares Kapital am Ende des Planungshorizonts (Alter ${targetAge}) in nominalen CHF dieses Jahres, ohne gebundenes Immobilienkapital.</p>`,
      rent: '<p>Laufende Rente aus dem nicht bezogenen PK-Anteil, pro Monat und vor Steuern.</p>',
      pkNet: '<p>Bezogenes PK-Kapital nach der geschätzten Kapitalbezugssteuer. Bestehendes freies Vermögen wird nicht damit belastet.</p>',
      gap: '<p>Was nach deinem laufenden Nettoeinkommen monatlich offen bleibt und aus dem verfügbaren Kapital entnommen wird. Basisrechnung ohne Stressszenario.</p>'
    }[key];
    const aria = {totalRent:'Total-Rente erklären', start:'Startkapital erklären', target:'Vermögen am Zielalter erklären', rent:'PK-Rente erklären', pkNet:'PK-Kapital netto erklären', gap:'Fehlbetrag erklären'}[key];
    const title = {totalRent:'Total-Rente / Monat', start:'Startkapital', target:`Vermögen mit ${targetAge}`, rent:'PK-Rente / Monat', pkNet:'PK-Kapital netto', gap:'Fehlbetrag / Monat'}[key];
    // Im Kennzahlenraster öffnet die Erklärung als Dialog statt im Seitenfluss.
    return modalInfo({title, body, aria});
  }
  /* Startkapital-Dialog (Designvorlage): Kopfzeile mit Icon, Hero-Kachel mit Total,
     Zeile «PK-Kapital netto», aufklappbare Position «Weiteres Kapital» mit den echten
     Bestandteilen. Alle Werte aus derselben Variante und Revision. */
  const capitalIcons = {p3:'pigMoney', securities:'chartLine', cash:'wallet', other:'coins'};
  const capitalNotes = {
    'Säule 3a (netto)': 'Guthaben der Säule 3a, das ein Jahr vor dem PK-Bezug bezogen wird – netto nach der geschätzten Bezugssteuer.',
    'Freies Vermögen': 'Nicht aufgeteiltes Vermögen aus deinen Angaben, das zusätzlich zur Verfügung steht.',
    'Wertschriften': 'Wertschriften zum Start der Pensionierung, hochgerechnet mit deiner Anlageannahme.',
    'Bank / liquide Mittel': 'Bankguthaben und liquide Mittel, die sofort verfügbar sind.',
    'Weitere Kapitalpositionen': 'Weitere erfasste Vermögenswerte, die für die Planung verfügbar sind.'
  };
  function capitalPositionIcon(label) {
    if (/Säule 3a/.test(label)) return capitalIcons.p3;
    if (/Wertschriften/.test(label)) return capitalIcons.securities;
    if (/Bank/.test(label)) return capitalIcons.cash;
    return capitalIcons.other;
  }
  function startCapitalInfo(item) {
    const explanation = 'Alles, was dir zum Start der Pensionierung zur Verfügung steht: PK-Kapital netto plus weiteres Kapital.';
    if (!item || !item.plan) return `<p>${explanation}</p>`;
    const capital = Calculator.calculateAvailableCapital(item.plan, item.share);
    const {rows, total, available} = furtherCapital(state, item);
    const tip = (title, body) => infoMarkup({iconOnly:true, aria:`${title} erklären`, body:`<p>${body}</p>`});
    const position = (icon, label, value, note, tipBody = '') =>
      `<div class="v3-cap-row"><span class="v3-cap-icon" aria-hidden="true">${Icons.icon(icon, {size:22})}</span><div class="v3-cap-body"><span class="v3-cap-label">${label}${tipBody ? tip(label, tipBody) : ''}</span>${note ? `<small>${note}</small>` : ''}</div><strong>${money(value)}</strong></div>`;
    const detail = rows.map(([label, value]) => position(capitalPositionIcon(label), label, value, '', capitalNotes[label] ?? 'Bestandteil deines weiteren Kapitals gemäss deinen Angaben.')).join('');
    return `<div class="v3-cap-hero"><div class="v3-cap-hero-main"><span class="v3-cap-icon" aria-hidden="true">${Icons.icon('coins', {size:26})}</span><div><span class="v3-cap-label">Startkapital ${tip('Startkapital', explanation)}</span><strong class="v3-cap-total">${money(capital.totalInvestableCapital)}</strong>${available ? `<small>${available[0].toUpperCase()}${available.slice(1)}. ${tip('Verfügbarkeit', 'Die Säule 3a wird ein Jahr vor dem PK-Bezug bezogen und steht ab dann als Nettobetrag zur Verfügung.')}</small>` : ''}</div></div><p class="v3-cap-note">${explanation}</p></div>${position('buildingBank', 'PK-Kapital netto', capital.netPkCapitalWithdrawal, `Nach Abzug allfälliger Steuern und Sozialabgaben.${tip('PK-Kapital netto', 'Bezogenes PK-Kapital nach der geschätzten Kapitalbezugssteuer. Bestehendes freies Vermögen wird nicht damit belastet.')}`)}<details class="v3-cap-more" open><summary><span class="v3-cap-icon" aria-hidden="true">${Icons.icon('pigMoney', {size:22})}</span><div class="v3-cap-body"><span class="v3-cap-label">Weiteres Kapital ${tip('Weiteres Kapital', 'Zusätzlich zum PK-Kapital verfügbar. Die Zusammensetzung folgt deinen erfassten Vermögenswerten.')}</span><small>Zusätzlich zum PK-Kapital verfügbar.</small></div><strong>${money(total)}</strong><span class="v3-cap-chevron" aria-hidden="true">${Icons.icon('chevronUp', {size:18})}</span></summary><div class="v3-cap-rows">${detail}</div></details><p class="v3-cap-note">PK-Kapital netto ${money(capital.netPkCapitalWithdrawal)} + weiteres Kapital ${money(total)} = <strong>${money(capital.totalInvestableCapital)}</strong>.</p>`;
  }
  function variantMetrics(item, targetAge) {
    const capital = Calculator.calculateAvailableCapital(item.plan, item.share);
    const sources = Calculator.incomeSourcesAtStart(item.plan).reduce((map, entry) => ({...map, [entry.id]:entry.annualIncome}), {});
    const values = {
      totalRent: ((sources.ahv ?? 0) + (sources.pk ?? 0) + (sources.other ?? 0)) / 12,
      start: item.result.availableCapital,
      target: item.result.capitalAtTargetAgeNominal ?? item.result.capitalAtTargetAge,
      rent: item.pension.rent / 12,
      pkNet: capital.netPkCapitalWithdrawal,
      gap: item.result.monthlyGap
    };
    const metric = (key, label) => `<div class="v3-compare-metric${key === 'gap' ? ' v3-compare-gap' : ''}"><span>${label} ${metricInfo(key, targetAge, item)}</span><strong>${money(values[key])}</strong></div>`;
    return `<div class="v3-compare-metrics">${metric('totalRent', 'Total-Rente / Monat')}${metric('start', 'Startkapital')}${metric('target', `Vermögen mit ${targetAge}`)}${metric('rent', 'PK-Rente / Monat')}${metric('pkNet', 'PK-Kapital netto')}${metric('gap', 'Fehlbetrag / Monat')}</div>`;
  }
  /* Dieselbe Karte in beiden Ansichten; nur die Auswahl unterscheidet sich
     (Plan: Klick lädt den Wert in den PK-Bezug · Vergleich: Auswahlkreis).
     Der aktuelle Plan trägt den Auswahlkreis und die Bezeichnung, die anderen den Knopf «Übernehmen». */
  /* Die ganze Kachel ist klickbar: Zeile trägt den Platz, der Titelknopf bleibt für die Tastatur. */
  function variantCard(item, {mode = 'plan', index = 0, targetAge, selected = false} = {}) {
    const current = item.share === chosenShare();
    const title = `<span class="v3-compare-main"><span class="v3-compare-title"><strong>${variantName(item.share)}</strong></span></span>`;
    if (mode === 'compare') {
      // §8.2: keine Radio-Buttons, keine Chevrons, keine Auswahl über die Kartenfläche.
      return `<li class="v3-compare-card${current ? ' current' : ''}"><div class="v3-compare-head"><span class="v3-compare-main">${title}</span>${variantActions(item.share)}</div>${variantMetrics(item, targetAge)}</li>`;
    }
    const check = current ? '<span class="v3-compare-check v3-compare-check-on" aria-hidden="true">✓</span>' : '<span class="v3-compare-check" aria-hidden="true"></span>';
    return `<li class="v3-variant-row${current ? ' current' : ''}${item.share === (previewShare ?? chosenShare()) ? ' editing' : ''}" data-variant-index="${index}"><div class="v3-variant-head">${check}<button type="button" class="v3-variant-select" data-variant-index="${index}"${current ? ' aria-current="true"' : ''}>${title}</button>${variantStatus(item)}${variantActions(item.share)}</div>${variantMetrics(item, targetAge)}</li>`;
  }
  function variantCards(targetAge) {
    return `<ul class="v3-variant-list">${variantShares().map((share, index) => {
      const evaluatedShare = evaluated(share);
      return evaluatedShare ? variantCard({share, ...evaluatedShare}, {mode:'plan', index, targetAge}) : '';
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
    const labels = rows.map((row,index) => ({index, y:y((row.result.yearlyProjection.at(-1).nominal ?? row.result.yearlyProjection.at(-1)).free)})).sort((a,b) => a.y-b.y);
    labels.forEach((entry,i) => { entry.y = Math.max(entry.y, i ? labels[i-1].y + 16 : top); });
    if (labels.at(-1)?.y > height-bottom) { const overflow=labels.at(-1).y-(height-bottom); labels.forEach(entry => entry.y -= overflow); }
    const lines = rows.map((row, index) => { const series = row.result.yearlyProjection, coordinates = series.map((entry, i) => `${left + (i / Math.max(1, series.length - 1)) * plotWidth},${y((entry.nominal ?? entry).free)}`).join(' '), selected = isSelectedLine(row, rows), dash = index === 1 ? ' stroke-dasharray="9 6"' : index === 2 ? ' stroke-dasharray="2 6"' : '', color = lineColor(selected, index), markers = [0, Math.floor((series.length - 1) / 2), series.length - 1].filter((value, position, all) => all.indexOf(value) === position).map(i => { const x = left + (i / Math.max(1, series.length - 1)) * plotWidth; const cy = y((series[i].nominal ?? series[i]).free); return index === 0 ? `<circle cx="${x}" cy="${cy}" r="4" fill="${color}"></circle>` : index === 1 ? `<rect x="${x - 3}" y="${cy - 3}" width="6" height="6" fill="${color}"></rect>` : `<path d="M ${x} ${cy - 5} L ${x + 5} ${cy} L ${x} ${cy + 5} L ${x - 5} ${cy} Z" fill="${color}"></path>`; }).join(''), end = series.at(-1); return `<polyline data-chart-share="${row.share}" points="${coordinates}" fill="none" stroke="${color}" stroke-width="${selected ? 3.5 : 1.8}" opacity="${selected ? 1 : .7}"${dash}></polyline>${markers}<text class="v3-chart-value" x="${left + plotWidth + 8}" y="${labels.find(entry => entry.index === index).y + 4}">${plainMoney((end.nominal ?? end).free)}</text>`; }).join('');
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
    // Nach der Pensionierung zählen die laufenden Renten (Schnellstart: Renten total in den Einnahmen).
    const pension = pre
      ? state.details.pension?.pk !== undefined
      : (entered(state.details.income?.ahv) || entered(state.details.income?.other) || entered(state.details.pension?.pkRent));
    return {pre, assets, pension, ready:assets && pension};
  }
  /* Nach der Pensionierung gibt es keinen Kapitalentscheid: derselbe Kennzahlen-Block zeigt
     die laufende PK-Rente, das Nettoeinkommen, den Bedarf und den Fehlbetrag. */
  function postDecision(item) {
    return `<section class="v3-decision"><h2>Deine laufenden Renten ${infoMarkup({iconOnly:true, aria:'Laufende Renten erklären', body:'<p>Nach der Pensionierung zählen deine tatsächlich laufenden Renten (AHV, PK und weitere). Ein Kapitalbezug und eine Kapitalbezugssteuer werden nicht mehr gerechnet.</p>'})}</h2><div class="v3-readout">${coreReadout(item)}</div>${planOutcome(item)}${improveEntry(planActionRows(item).length)}</section>`;
  }
  /* Der frühere Übersichtsblock (Einnahmen/Bedarf/Noch zu decken mit Schätzhinweis) ist
     entfernt: «Mein Plan» startet direkt mit dem PK-Bezug. Die Herkunft der AHV-Pauschale
     steht bei «Plan genauer machen» und im AHV-Editor. */
  /* Verfeinerung in fester Reihenfolge: 1 AHV-Rente · 2 Wohnkanton · 3 Weiteres Kapital und
     Säule 3a · 4 PK-Ausweis. Jede Zeile nennt ihren Stand und führt direkt in den Editor;
     sind alle vier erfasst, verschwindet der Block. */
  function planSteps() {
    const known = dataKnown(), pre = state.mode === 'pre';
    const ahv = Estimates ? Estimates.ahvOf(state) : {origin:'user', monthly:0};
    const uws = Estimates ? Estimates.uwsOf(state) : null;
    const pkPrecise = numeric(state.details.pension?.pkContrib) > 0;
    const steps = [
      {page:'ahv', label:'AHV-Rente', done:ahv.origin === 'user', state:ahv.origin === 'user' ? 'erfasst' : 'geschätzt',
       note:ahv.origin === 'user' ? 'Deine erfasste AHV-Rente ersetzt die Pauschale.' : (Estimates ? Estimates.ahv.note : '')},
      {page:'personal', label:'Wohnkanton', done:hasCanton(), state:hasCanton() ? 'erfasst' : 'offen',
       note:'Der Wohnkanton bestimmt die geschätzten Steuern und das verfügbare Einkommen.'},
      {page:'assets', label:'Weiteres Kapital und Säule 3a', done:known.assets, state:known.assets ? 'erfasst' : 'offen',
       note:'Bank, Wertschriften, weiteres Vermögen und Säule 3a vervollständigen dein Startkapital.'},
      pre ? {page:'pension', label:'PK-Ausweis', done:pkPrecise, state:pkPrecise ? 'erfasst' : 'offen',
       note:`Sparbeiträge machen Rente und Kapital genauer.${uws ? ` Wir rechnen mit einem Umwandlungssatz von ${percent(uws.percent)} % pro Jahr (${uws.origin === 'model' ? 'Standardannahme' : 'deine Annahme'}).` : ''}`} : null
    ].filter(Boolean);
    // Nur noch offene Punkte: Erledigtes verschwindet, die Nummerierung rückt nach.
    const open = steps.filter(step => !step.done);
    if (!open.length) return '';
    const row = (step, index) => `<li><button type="button" class="v3-step" data-v3-next="${step.page}"><span class="v3-step-index" aria-hidden="true">${index + 1}</span><span class="v3-step-copy"><strong>${step.label}</strong><small>${step.note}</small></span><span class="v3-step-state ${step.state === 'geschätzt' ? 'estimated' : 'open'}">${step.state}</span></button></li>`;
    return `<section class="v3-steps"><h2>Plan genauer machen</h2><ol class="v3-step-list">${open.map(row).join('')}</ol></section>`;
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
    // Geschätzte AHV: als Schätzung benannt, damit sie nicht als erfasste Rente gelesen wird.
    const ahvEstimated = Estimates ? Estimates.ahvOf(state).origin === 'estimated' : false;
    const pensionsGross = source('ahv') + source('pk') + other;
    const additionalRows = sources.filter(entry => !['ahv', 'pk', 'other', 'additional'].includes(entry.id) && entry.annualIncome > 0);
    return `<div class="v3-summary-block"><details class="v3-income-sources"><summary>Renten und Steuern im Detail</summary>${row(`AHV${ahvEstimated ? ' · geschätzt' : ''}`, source('ahv'), 'ahv', 'detailFields')}${row('PK-Rente', source('pk'), 'pension', 'pkBreakdown', 'pkRente')}${other > 0 ? `<div class="v3-rent-row">${row('Weitere Renten', other, 'extra', 'detailFields')}${infoMarkup({iconOnly:true, aria:'Weitere Renten erläutern', body:`<p>Weitere Renten: ${money(other)} / Monat</p>`})}</div>` : ''}<div class="v3-pension-total"><span>Renten gesamt · vor Steuern</span><strong>${money(pensionsGross)} / Monat</strong></div>${additional > 0 ? row('Weitere Einnahmen', additional, 'extra', 'detailFields') : ''}${additionalRows.map(entry => `<div class="v3-source-line"><span>${esc(entry.name)}</span><strong>${money(entry.annualIncome / 12)}</strong></div>`).join('')}${taxRow(item)}<div class="v3-income-total"><span>${hasCanton() ? 'Einkommen netto' : 'Einkommen vor Steuern'}</span><strong>${money(result.monthlyIncomeNet)} / Monat</strong></div></details><div class="v3-compact-summary">${row(hasCanton() ? 'Einkommen netto / Monat' : 'Einkommen vor Steuern / Monat', result.monthlyIncomeNet, 'ahv', 'detailFields')}${row('Bedarf netto / Monat', result.monthlyNeed, 'need', 'detailFields')}<div class="v3-gap-value"><span>Monatlich offen</span><strong>${money(result.monthlyGap)}</strong></div>${row('Verfügbares Vermögen', result.availableCapital, 'assets', 'assetTotal')}</div>${prognosisMarkup(item)}<p class="v3-compact-note">${hasCanton() ? 'Nach geschätzten Steuern' : 'Steuern offen'} · Modellrechnung unter deinen Annahmen.</p></div>`;
  }
  /* Zentrale Topfkonfiguration (§3.3 der konsolidierten Spezifikation): Icon, Label,
     Reihenfolge, Farbtoken und Kurzbeschreibung an einer Stelle. Alle Topfkomponenten
     (Kacheln, Karten, Balken, Legenden, Donut) beziehen ihre Darstellung von hier. */
  const bucketConfig = [
    {key:'cash', icon:'cash', label:'Geldmarkt', short:'1 Jahr', tone:'cash', color:'var(--v3-pot-cash)', note:'Für kurzfristige Entnahmen und Sicherheit.'},
    {key:'bonds', icon:'chartBar', label:'Obligationen', short:'2 Jahre', tone:'bonds', color:'var(--v3-pot-bonds)', note:'Für Stabilität und regelmässige Erträge.'},
    {key:'growth', icon:'trendingUp', label:'Wertschöpfung', short:'Rest', tone:'growth', color:'var(--v3-pot-growth)', note:'Für langfristiges Wachstum.'}
  ];
  const bucketNames = bucketConfig.map(bucket => bucket.label);
  const potGlyph = bucketConfig.map(bucket => bucket.icon);
  const potMeta = bucketConfig.map(bucket => [bucket.label, bucket.short, bucket.tone]);
  /* Anzeigerundung (Invariante I-15): Teilbeträge werden so gerundet, dass ihre Summe
     exakt dem gerundeten Total entspricht. Gerechnet wird weiterhin ungerundet. */
  function roundedParts(values, total = null) {
    const target = Math.round(total === null ? values.reduce((a, b) => a + b, 0) : total);
    const parts = values.map(value => Math.floor(value));
    let rest = target - parts.reduce((a, b) => a + b, 0);
    const order = values.map((value, index) => ({index, fraction:value - Math.floor(value)})).sort((a, b) => b.fraction - a.fraction);
    for (let i = 0; i < order.length && rest > 0; i++, rest--) parts[order[i].index] += 1;
    while (rest < 0) { const last = order.at(-1).index; if (parts[last] <= 0) break; parts[last] -= 1; rest++; }
    return parts;
  }
  function potTotal(values, total = null) {
    const sum = total ?? values.reduce((a, b) => a + b, 0);
    return `<p class="v3-pot-total"><span>Total</span><strong>${money(sum)}</strong></p>`;
  }
  function potTiles(values, {total = null} = {}) {
    const sum = total ?? values.reduce((a, b) => a + b, 0);
    // Anzeige: gerundete Beträge und Anteile, die zusammen exakt Total und 100 % ergeben.
    const amounts = roundedParts(values, sum);
    const percents = roundedParts(values.map(value => sum > 0 ? value / sum * 100 : 0), 100);
    const tile = (name, amount, percent, key, glyph) => `<li class="v3-pot-tile pot-${key}"><span class="v3-pot-icon" aria-hidden="true">${Icons.icon(glyph, {size:20})}</span><span class="v3-pot-name">${name}</span><strong>${money(amount)}</strong><span class="v3-pot-share">${percent} %</span><span class="v3-pot-bar" aria-hidden="true"><span style="width:${percent}%"></span></span></li>`;
    return `<ul class="v3-pot-tiles">${potMeta.map((meta, index) => tile(meta[0], amounts[index], percents[index], meta[2], potGlyph[index])).join('')}</ul>`;
  }
  /* Der Variantenvergleich ist entfallen: Varianten, Ausgangslage und Einstiege stehen
     auf «Mein Plan». Erhalten bleibt die Kartengrafik (Kapitalentwicklung) im Töpfe-Modell. */
  function bindChart(container) {
    chartObserver?.disconnect();
    const draw = () => {
      const host = container?.querySelector('.v3-chart-container');
      if (!host) return;
      const share = chosenShare(), benchmark = currentVariants();
      const rows = previewShare !== null && previewShare !== share && !variantShares().includes(previewShare)
        ? [...benchmark, {share:previewShare, ...evaluated(previewShare)}].filter(item => item.plan)
        : benchmark;
      const width = host.getBoundingClientRect().width;
      if (!width) return;
      host.innerHTML = chart(rows, width);
      const legend = container.querySelector('[data-chart-legend]');
      if (legend) legend.innerHTML = chartLegend(rows);
    };
    draw();
    chartObserver = new ResizeObserver(draw);
    chartObserver.observe(container.querySelector('.v3-chart-container'));
  }
  /* «Jahr für Jahr»: ein Jahr der bestehenden Simulation Schritt für Schritt.
     Keine zweite Rechnung: alle Werte stammen aus evaluatePlan().yearlyProjection
     (Einnahmen je Quelle, Steuern, Bedarf, Kapitalbedarf, Töpfe, Rendite je Topf,
     Umbuchungen, Endkapital) sowie aus capitalWithdrawalEvents() für PK- und 3a-Bezüge. */
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
  /* Anfang und Ende eines Jahres sehen gleich aus: Total, dreifarbiger Balken, drei Töpfe.
     Nur das Jahresende zeigt zusätzlich die Veränderung gegenüber dem Jahresbeginn. */
  function wealthMarkup({values, total, delta = null}) {
    const shares = values.map(value => total > 0 ? value / total * 100 : 0);
    const segments = values.map((value, index) => `<span class="seg-${potMeta[index][2]}" style="width:${shares[index].toFixed(2)}%"></span>`).join('');
    // Anzeige: Topfbeträge summieren exakt auf das Total, Anteile auf 100 %.
    const amounts = roundedParts(values, total);
    const percents = roundedParts(shares, 100);
    const legend = values.map((value, index) => `<li class="pot-${potMeta[index][2]}"><strong>${money(amounts[index])}</strong><span>${potMeta[index][0]}</span><small>${percents[index]} %</small></li>`).join('');
    const change = delta === null ? '' : `<span class="v3-year-delta${delta >= 0 ? ' up' : ' down'}">${delta >= 0 ? '+' : '−'} ${money(Math.abs(delta))} <small>gegenüber Jahresbeginn</small></span>`;
    return `<p class="v3-year-wealth"><strong>${money(total)}</strong>${change}</p><div class="v3-year-bar" role="img" aria-label="Aufteilung auf die drei Töpfe">${segments}</div><ul class="v3-year-legend">${legend}</ul>`;
  }
  function yearWealth(row) {
    return wealthMarkup({values:row.endBuckets, total:row.end, delta:row.net});
  }
  function yearIncome(row, planCanton = '') {
    // Ohne eigenen Wohnkanton gilt der geschätzte Kanton des ersten Checks.
    const rate = TaxModel.getIncomeTaxRate(State.canton(state) || planCanton, row.taxableAnnualIncome);
    // Herkunft je Einnahmequelle: die geschätzte AHV-Rente wird als Schätzung benannt.
    const estimated = Estimates && Estimates.ahvOf(state).origin === 'estimated';
    const sourceRows = (row.sources || []).filter(source => source.gross > 0.5).map(source => yearLine(esc(source.name) + (estimated && source.id === 'ahv' ? ' · geschätzt' : ''), money(source.gross), {note:source.taxable ? 'brutto' : 'nicht steuerbar'})).join('');
    const body = `${sourceRows}${yearLine('Einnahmen vor Steuern', money(row.grossIncome), {total:true})}${yearLine('Steuerbares Einkommen', money(row.taxableAnnualIncome), {note:'nominal'})}${yearLine('Steuersatz', `${percent(rate)} %`)}${yearLine('Einkommenssteuer', `− ${money(row.estimatedIncomeTax ?? 0)}`)}${yearLine('Netto verfügbar', money(row.rent), {total:true})}<p class="v3-year-note">Alle Einnahmen sind brutto, also vor Steuern. Die laufende Einkommenssteuer wird jedes Jahr neu aus dem steuerbaren Einkommen gerechnet.</p>`;
    return `<section class="v3-year-block"><div class="v3-year-block-head"><span class="v3-year-chip" aria-hidden="true">1</span><span class="v3-year-block-icon" aria-hidden="true">${Icons.icon('wallet', {size:20})}</span><h3>Dein Einkommen</h3></div><div class="v3-year-rows">${yearLine('Renten &amp; weitere Einnahmen', money(row.grossIncome))}${yearLine(`Steuern ${Icons.icon('receiptTax', {size:18})}`, `− ${money(row.estimatedIncomeTax ?? 0)}`)}<details class="v3-year-sum"><summary><span>Netto verfügbar</span><strong>${money(row.rent)}</strong><span class="v3-chevron" aria-hidden="true">${Icons.icon('chevronDown', {size:18})}</span></summary><div class="v3-year-sum-body">${body}</div></details></div></section>`;
  }
  function yearNeed(row) {
    const surplus = Math.max(0, row.rent - row.need - (row.special ?? 0));
    const gap = row.withdrawal > 0.5;
    const amount = gap ? row.withdrawal : surplus;
    const info = infoMarkup({iconOnly:true, aria:'Fehlbetrag erklären', body:`${yearLine('Bedarf', money(row.need))}${yearLine('Einnahmen netto', `− ${money(row.rent)}`)}${yearLine(gap ? 'Fehlbetrag' : 'Überschuss', money(amount), {total:true})}${yearLine('Pro Monat', money(amount / 12))}<p class="v3-year-note">${gap ? 'Dieser Betrag wird in diesem Jahr aus dem Geldmarkttopf finanziert.' : 'Der Überschuss wird dem Geldmarkttopf gutgeschrieben.'}</p>`});
    return `<section class="v3-year-block"><div class="v3-year-block-head"><span class="v3-year-chip" aria-hidden="true">2</span><span class="v3-year-block-icon" aria-hidden="true">${Icons.icon('shoppingCart', {size:20})}</span><h3>Dein Bedarf netto</h3></div><div class="v3-year-rows">${yearLine('Lebenshaltung netto', money(row.need))}${row.special > 0.5 ? yearLine('Sonderausgabe', money(row.special)) : ''}<div class="v3-year-row gap"><span>${gap ? 'Fehlbetrag' : 'Überschuss'}</span><strong>${money(amount)}</strong>${info}</div></div></section>`;
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
    /* Eine Zahlenwelt: alle Anzeigewerte dieses Jahres sind nominale CHF des Jahres.
       Der Rechenkern liefert sie als `nominal` zur internen (realen) Zeile mit. */
    const row = {...data.rows[index], ...data.rows[index].nominal};
    const nextAge = ages[index + 1];
    const event = data.events.find(entry => entry.age === row.age) || null;
    const label = app.querySelector('#yearAgeLabel');
    if (label) label.textContent = `Alter ${row.age + 1}`;
    const range = app.querySelector('#yearRange');
    if (range) range.value = String(row.age);
    const previous = app.querySelector('[data-year-prev]'), following = app.querySelector('[data-year-next]');
    // Jahr −/+ mit Chevron-Icons statt Textpfeilen.
    if (previous) { previous.innerHTML = `${Icons.icon('chevronLeft', {size:18})} ${index > 0 ? `Alter ${ages[index - 1] + 1}` : 'Start'}`; previous.disabled = index === 0; }
    if (following) { following.innerHTML = `${nextAge ? `Alter ${nextAge + 1}` : 'Letztes Jahr'} ${Icons.icon('chevronRight', {size:18})}`; following.disabled = !nextAge; }
    container.innerHTML = `<section class="v3-year-block v3-year-start"><div class="v3-year-block-head"><span class="v3-year-block-icon" aria-hidden="true">${Icons.icon('coins', {size:20})}</span><h3>Dein Vermögen am Jahresanfang · Alter ${row.age + 1}</h3></div>${wealthMarkup({values:row.buckets, total:row.free})}${event ? `<p class="v3-year-note">Enthält deinen Kapitalbezug netto von ${money(event.net)}${event.items.some(item => item.id !== 'pk') ? ' inklusive Säule 3a' : ''}.</p>` : ''}</section>${yearIncome(row, data.plan.person?.canton ?? "")}${yearNeed(row)}<section class="v3-year-block"><div class="v3-year-block-head"><span class="v3-year-chip" aria-hidden="true">3</span><span class="v3-year-block-icon" aria-hidden="true">${Icons.icon('coins', {size:20})}</span><h3>Deine Töpfe</h3></div>${yearPots(row)}<p class="v3-year-note">Topf 1 enthält die Entnahme des laufenden Jahres; deshalb ist sein Bestand am Jahresende 0. ${modalLink({label:'Wie die Töpfe aufgefüllt werden', title:'Auffüllung der Töpfe', aria:'Auffüllung der Töpfe erklären', body:'<p>Zu Jahresbeginn werden die Töpfe auf ihre Zielbeträge aufgefüllt: Topf 1 für die Entnahme dieses Jahres, Topf 2 für die beiden folgenden Jahre, Topf 3 erhält den Rest.</p><p>Danach wird die Entnahme des Jahres aus Topf 1 entnommen und der verbleibende Bestand verzinst. Deshalb ist Topf 1 am Jahresende 0, solange eine Entnahme nötig war.</p><p>Reicht Topf 1 nicht, wird zuerst Topf 2 und danach Topf 3 genutzt.</p>'})}</p></section><p class="v3-year-rendite">Rendite dieses Jahr ${Icons.icon('trendingUp', {size:18})} <strong>${row.ret >= 0 ? '+' : '−'} ${money(Math.abs(row.ret))}</strong> <small>In den Jahresendbeständen enthalten.</small></p><section class="v3-year-block"><div class="v3-year-block-head"><span class="v3-year-chip" aria-hidden="true">4</span><span class="v3-year-block-icon" aria-hidden="true">${Icons.icon('chartLine', {size:20})}</span><h3>Dein Vermögen am Jahresende · Alter ${row.age + 1}</h3></div>${wealthMarkup({values:row.endBuckets, total:row.end, delta:row.net})}</section><details class="v3-info v3-year-detail"><summary><span class="v3-info-label">So wurde dieses Jahr berechnet</span><span class="v3-info-glyph" aria-hidden="true">${Icons.icon('chevronRight', {size:18})}</span></summary><div class="v3-info-panel">${yearDetailRows(data, row)}</div></details>`;
  }
  /* Jahresrechnung als nummerierte Abschnitte mit Icon und ⓘ (Designvorlage):
     1 Einnahmen · 2 Bedarf · 3 Entnahmen · 4 Rendite · 5 Umbuchungen · 6 Vermögen am Jahresende. */
  function yearDetailRows(data, row) {
    const code = State.canton(state);
    // Die Anzeigezeile ist die nominale Mischzeile (Kopie): der Index wird über das Alter
    // bestimmt, sonst wäre das erste Planjahr nicht als Startjahr erkennbar.
    const found = data.rows.indexOf(row);
    const index = found >= 0 ? found : data.rows.findIndex(entry => entry.age === row.age);
    const event = data.events.find(entry => entry.age === row.age) || null;
    const roundedEnd = roundedParts(row.endBuckets, row.end);
    const surplus = Math.max(0, row.rent - row.need - (row.special ?? 0));
    const takes = roundedParts(row.takes, row.takes.reduce((a, b) => a + b, 0));
    const gains = roundedParts(row.gains, row.gains.reduce((a, b) => a + b, 0));
    const transfers = roundedParts(row.transfers.map(Math.abs), row.transfers.reduce((a, b) => a + Math.abs(b), 0));
    const info = (title, body) => infoMarkup({iconOnly:true, aria:`${title} erklären`, body:`<p>${body}</p>`});
    const line = (label, value, {note = '', info: tip = '', total = false, alert = false} = {}) =>
      `<div class="v3-calc-row${total ? ' v3-calc-total' : ''}${alert ? ' v3-calc-alert' : ''}"><span>${label}${tip}</span><strong>${value}</strong>${note ? `<small>${note}</small>` : ''}</div>`;
    const pot = (position, value, negative = false) => `${potMeta[position][0]} ${negative ? '− ' : ''}${money(Math.abs(value))}`;
    /* Struktur: der Jahresverlauf ist eingeklappt; geöffnet zeigt er die Totale, und jedes
       Total lässt sich einzeln zu seinen Bestandteilen aufklappen. */
    const totalRow = (label, value, rows, {alert = false, info: tip = ''} = {}) =>
      `<details class="v3-calc-total-row${alert ? ' v3-calc-alert' : ''}" open><summary><span>${label}${tip}</span><strong>${value}</strong><span class="v3-calc-chevron" aria-hidden="true">${Icons.icon('chevronDown', {size:16})}</span></summary><div class="v3-calc-rows">${rows}</div></details>`;
    const section = (number, icon, title, amounts, totals, note = '') =>
      `<details class="v3-calc-section"><summary><span class="v3-year-chip" aria-hidden="true">${number}</span><span class="v3-year-block-icon" aria-hidden="true">${Icons.icon(icon, {size:20})}</span><h4>${title}</h4><span class="v3-calc-amounts">${amounts.map(entry => `<strong class="${entry.tone ?? ''}">${entry.value}</strong>`).join('')}</span><span class="v3-calc-chevron" aria-hidden="true">${Icons.icon('chevronDown', {size:18})}</span></summary>${totals}${note ? `<p class="v3-year-note">${note}</p>` : ''}</details>`;

    const incomeSources = (row.sources || []).filter(source => source.gross > 0.5).map(source => line(esc(source.name), money(source.gross), {note:source.taxable ? 'brutto' : 'nicht steuerbar'})).join('');
    const income = [
      totalRow('Einnahmen vor Steuern', money(row.grossIncome), incomeSources, {info:info('Einnahmen vor Steuern','AHV, PK-Rente und alle weiteren steuerbaren Einnahmen dieses Jahres, vor Abzug der Einkommenssteuer.')}),
      totalRow('Verfügbar nach Steuern', money(row.rent), [
        line('Steuerbares Einkommen', money(row.taxableAnnualIncome), {info:info('Steuerbares Einkommen','Einkommen, das das vereinfachte kantonale Modell der Steuerbemessung zugrunde legt (nominal, in CHF dieses Jahres).')}),
        line(`Einkommenssteuer (${percent(TaxModel.getIncomeTaxRate(code, row.taxableAnnualIncome))} %)`, `− ${money(row.estimatedIncomeTax ?? 0)}`, {info:info('Einkommenssteuer','Geschätzte laufende Steuer des Jahres nach dem hinterlegten kantonalen Durchschnittssatz. Modellrechnung, keine individuelle Steuerberechnung.')})
      ])
    ].join('');
    const need = [
      totalRow('Bedarf netto', money(row.need), [
        line('Lebensbedarf netto', money(row.need), {info:info('Lebensbedarf','Dein geplanter Jahresbedarf für dieses Planjahr, nach Steuern.')}),
        row.special > 0.5 ? line('Sonderausgabe', money(row.special)) : ''
      ].filter(Boolean).join('')),
      totalRow('Fehlbetrag', money(row.withdrawal), [
        line('Bedarf netto', money(row.need)),
        line('Einnahmen netto', `− ${money(row.rent)}`),
        line(surplus > 0.5 ? 'Überschuss' : 'Fehlbetrag', money(surplus > 0.5 ? surplus : row.withdrawal), {total:true})
      ].join(''), {alert:true, info:info('Kapitalbedarf','Was nach deinem verfügbaren Einkommen offen bleibt und aus den Töpfen entnommen wird. Bei vollständiger Deckung ist der Betrag null.')})
    ].join('');
    const withdrawals = potMeta.map((meta, position) => line(meta[0], pot(position, takes[position], takes[position] > 0), {info:info(`Entnahme ${meta[0]}`,`Entnahme aus dem Topf ${meta[0]} in diesem Jahr. Eine tatsächliche Entnahme erscheint mit negativem Vorzeichen.`)})).join('');
    const returns = potMeta.map((meta, position) => line(meta[0], money(gains[position]), {info:info(`Rendite ${meta[0]}`,`Im Topf ${meta[0]} in diesem Jahr erzielte Rendite. Sie ist in den Beständen am Jahresende bereits enthalten.`)})).join('');
    const moves = potMeta.map((meta, position) => line(meta[0], `${row.transfers[position] < 0 ? '− ' : ''}${money(transfers[position])}`, {info:info(`Umbuchung ${meta[0]}`,`Interne Umbuchung auf den Zielbestand des Topfes. Umbuchungen verändern das Gesamtvermögen nicht.`)})).join('');
    const wealth = potMeta.map((meta, position) => line(meta[0], money(roundedEnd[position]))).join('');

    return [
      index === 0 ? totalRow('Startkapital', money(row.free), line('Kapital zu Jahresbeginn', money(row.free - row.injection), {info:info('Kapital zu Jahresbeginn','Dein verfügbares Kapital am Anfang dieses Planjahres in nominalen CHF dieses Jahres.')})) : '',
      event ? totalRow('Kapitalbezug netto investiert', money(event.net), line('Kapitalbezug brutto', money(event.gross)) + line('Kapitalbezugssteuer', `− ${money(event.tax)}`), {info:info('Kapitalbezug netto','Der Netto-Betrag des Kapitalbezugs (nach Bezugssteuer), der in diesem Jahr ins verfügbare Kapital fliesst.')}) : '',
      section(1, 'wallet', 'Einnahmen', [{value:money(row.grossIncome)}, {value:`${money(row.rent)} netto`, tone:'muted'}], income),
      section(2, 'shoppingCart', 'Bedarf netto', [{value:money(row.need)}, {value:money(row.withdrawal), tone:'alert'}], need),
      section(3, 'coins', 'Entnahmen aus den Töpfen', [{value:money(takes.reduce((a, b) => a + b, 0))}], totalRow('Entnahme aus den Töpfen', money(takes.reduce((a, b) => a + b, 0)), withdrawals, {info:info('Entnahme','Summe der Entnahmen dieses Jahres aus den drei Töpfen, zuerst aus dem Geldmarkttopf.')}), row.gap > 0.5 ? `Nicht gedeckt: ${money(row.gap)}.` : ''),
      section(4, 'trendingUp', 'Rendite der Töpfe', [{value:`${row.ret >= 0 ? '+' : '−'} ${money(Math.abs(row.ret))}`}], totalRow('Rendite dieses Jahres', `${row.ret >= 0 ? '+' : '−'} ${money(Math.abs(row.ret))}`, returns, {info:info('Rendite','Im Jahr erzielte Rendite der drei Töpfe; in den Beständen am Jahresende enthalten.')}), 'In den Beständen am Jahresende enthalten.'),
      section(5, 'arrowsExchange', index === 0 ? 'Initialbefüllung der Töpfe' : 'Umbuchungen auf Ziel', [{value:money(transfers.reduce((a, b) => a + b, 0))}], totalRow(index === 0 ? 'Initialbefüllung' : 'Umbuchungen', money(transfers.reduce((a, b) => a + b, 0)), moves, {info:info('Umbuchungen','Interne Umbuchungen auf die Zielbestände; sie verändern das Gesamtvermögen nicht.')}), 'Topf 1 erhält die laufende Entnahme, Topf 2 die beiden folgenden Jahre, Topf 3 den Rest.'),
      section(6, 'coins', 'Vermögen am Jahresende', [{value:money(row.end)}], totalRow('Total Vermögen', money(row.end), wealth, {info:info('Total Vermögen','Summe der drei Töpfe am Jahresende. Sie entspricht dem verfügbaren Kapital nach Entnahmen, Umbuchungen und Rendite.')})),
      `<div class="v3-calc-foot">${Icons.icon('infoCircle', {size:18})} Gerechnet mit: Inflation ${percent(data.plan.assumptions.rates.inflation)} %, Rendite Geldmarkt ${percent(data.rates[0])} %, Obligationen ${percent(data.rates[1])} %, Wertschöpfung ${percent(data.rates[2])} %, Planung bis Alter ${data.plan.retirement.targetAge}. Alle Beträge sind nominale CHF dieses Jahres; Bedarf und Steuern werden jährlich gerechnet, die Kapitalbezugssteuer einmalig im Bezugsjahr. Annahmen ändern: unter «Annahmen».</div>`,
      '<button type="button" class="primary v3-calc-close" data-detail-close>Schliessen</button>'
    ].filter(Boolean).join('');
  }
  // Ein Jahr der Planung verstehen: dieselbe Simulation als Jahres-Dashboard.
  function renderYearByYear() {
    // Auch ohne Wohnkanton verfügbar: der erste Check rechnet mit geschätzten Steuern.
    const data = yearData();
    if (!data) { returnToPlan(); return; }
    closeMenu(); chartObserver?.disconnect(); route = 'years'; markDirty(); assetPart = null;
    window.scrollTo(0, 0);
    stopYearPlay();
    const ages = data.rows.map(row => row.age);
    if (!ages.includes(yearState.age)) yearState.age = ages[0];
    const share = yearShare();
    app.innerHTML = `<header class="v3-heading v3-heading-detail"><div class="v3-year-topline"><button type="button" class="home-link" data-year-back>← Zurück zu Mein Plan</button><span class="v3-year-pill">${variantName(share)}</span></div><h1>Planung Jahr für Jahr</h1></header><div class="v3-detail-layout"><section class="v3-detail-form"><div class="v3-year-nav"><div class="v3-year-nav-row"><button type="button" data-year-prev>${Icons.icon('chevronLeft', {size:18})} Start</button><strong id="yearAgeLabel">Alter ${yearState.age + 1}</strong><button type="button" data-year-next>Alter ${(ages[1] ?? ages[0]) + 1} ${Icons.icon('chevronRight', {size:18})}</button></div><input id="yearRange" class="v3-range v3-year-range" type="range" min="${ages[0]}" max="${ages[ages.length - 1]}" step="1" value="${yearState.age}" aria-label="Alter wählen"><div class="v3-year-nav-labels"><span>Pensionierung</span><span>Alter ${ages[ages.length - 1] + 1}</span></div></div><div data-year-body></div></section></div>`;
    renderYearBody();
    bindYearByYear();
  }
  function bindYearByYear() {
    document.querySelector('[data-year-back]')?.addEventListener('click', returnToPlan);
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

      if (event.target.closest('[data-detail-close]')) {
        const detail = event.target.closest('.v3-year-detail');
        if (detail) { detail.open = false; detail.scrollIntoView({block:'center'}); }
        return;
      }
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
    /* Kopfzeile mit Tipp (schliessbar) – ersetzt den früheren Untertitel. */
    const tip = state.tipDismissed ? '' : `<div class="v3-tip" role="note">${Icons.icon('infoCircle', {size:18})}<div><strong>Tipp</strong><p>Teste verschiedene Varianten, um zu sehen, was für dich am besten passt.</p></div><button type="button" data-tip-close aria-label="Tipp schliessen">${Icons.icon('close', {size:16})}</button></div>`;
    const decision = pre ? `<section class="v3-decision"><h2>PK-Bezug wählen ${infoMarkup({iconOnly:true, aria:'PK-Bezug erklären', body:'<p>Der Kapitalanteil bestimmt, wie viel deines PK-Guthabens du bei Pensionierung als Kapital beziehst. Der Rest wird zur Rente.</p>'})}</h2>${known.pension ? `<div class="v3-share-row"><label class="v3-share-field" for="shareNumber"><span class="v3-share-caption">Kapitalanteil</span><span class="v3-share-entry"><input id="shareNumber" type="number" inputmode="numeric" min="0" max="100" step="1" value="${share}" aria-describedby="shareReadout"><span class="v3-share-unit" aria-hidden="true">%</span></span></label><p class="v3-share-readout" id="shareReadout"><strong id="shareValue">${share}</strong> % Kapital</p></div><input id="shareRange" class="v3-range" type="range" min="0" max="100" step="1" value="${share}" aria-label="Kapitalanteil"><div class="v3-range-labels"><span>0 % Kapital</span><span>100 % Kapital</span></div><div class="v3-preview" data-preview="${preview ? 'draft' : 'current'}"><div class="v3-decision-head"><h3 id="previewStatus">${preview ? 'Vorschau' : 'Dein aktueller Plan'}</h3>${preview ? `<button type="button" class="primary" data-remember>${Icons.icon('circleCheck', {size:18})} Speichern</button>` : ''}</div><div id="previewReadout">${readout(item)}</div>${planOutcome(item)}${improveEntry(planActionRows(item).length)}</div><p id="v3Error" class="v3-error" role="alert"></p>` : '<p>Rente, Kapital oder eine Mischung? Erfasse deine PK-Grunddaten, um die Wirkung auf deinen Ruhestand zu sehen.</p><button type="button" class="primary" data-v3-next="pension">PK-Angaben erfassen</button>'}</section>` : (known.pension ? postDecision(item) : '<section class="v3-decision"><h2>Deine laufende PK-Rente</h2><p>Erfasse die PK-Rente, die du heute tatsächlich erhältst.</p><button type="button" class="primary" data-v3-next="pension">PK-Rente erfassen</button></section>');
    const variants = pre && known.pension ? `<section class="v3-section v3-variants-section"><div class="v3-variants-head"><h2>Meine Varianten</h2></div><p class="v3-section-sub">Wähle eine Variante und übernimm sie in deinen Plan.</p><div class="v3-cards">${variantCards(item.plan.retirement.targetAge)}</div></section>` : '';
    const entries = pre ? `<div class="v3-entry-grid">${entryTile('years', 'buildingBank', 'Planung Jahr für Jahr', 'Detaillierte Jahresrechnung')}${entryTile('pots', 'chartDonut', 'Töpfe-Modell', 'Aufteilung und Entwicklung')}${entryTile('assumptions', 'chartLine', 'Annahmen', 'Zinsen, Inflation, Lebenserwartung')}</div>` : '';
    app.innerHTML = `${planHeader(planStatus())}${tip}<div class="v3-plan-grid v3-plan-compact"><section>${state.exampleValues ? '<p class="v3-hint">Beispielwerte – bitte durch deine persönlichen Angaben ersetzen.</p>' : ''}${decision}${planSteps()}${variants}${entries}</section></div><footer class="v3-plan-footer">${saveRow()}</footer>`;
    bindPlan(); renderSaveState();
    if (restore) window.scrollTo(0, planScrollY);
  }
  function bindPlan() {
    const range = document.getElementById('shareRange'), number = document.getElementById('shareNumber');
    const remember = app.querySelector('[data-remember]');
    const update = value => {
      if (String(value).trim() === '' || !Number.isInteger(Number(value)) || Number(value) < 0 || Number(value) > 100) {
        message('Bitte eine ganze Zahl von 0 bis 100 eingeben.');
        if (remember) remember.disabled = true;
        return;
      }
      previewShare = Number(value); message();
      if (remember) remember.disabled = false;
      const preview = previewShare !== chosenShare();
      if (range) range.value = previewShare; if (number) number.value = previewShare;
      document.getElementById('shareValue').textContent = previewShare;
      document.getElementById('previewStatus').textContent = preview ? 'Vorschau (noch nicht gespeichert)' : 'Dein aktueller Plan';
      app.querySelector('.v3-preview')?.setAttribute('data-preview', preview ? 'draft' : 'current');
      const item = evaluated(previewShare);
      document.getElementById('previewReadout').innerHTML = readout(item);
      const projection = document.getElementById('planProjection');
      if (projection) projection.innerHTML = compactReadySummary(item);
      if (remember) remember.hidden = !preview;
      // Die geladene Variante wird auch in der Liste sichtbar (identische Karten, nur der Zustand wechselt).
      const cards = app.querySelector('.v3-cards');
      if (cards) cards.innerHTML = variantCards(item.plan.retirement.targetAge);
    };
    range?.addEventListener('input', event => update(event.target.value));
    number?.addEventListener('input', event => update(event.target.value));
    app.querySelector('.v3-cards')?.addEventListener('click', event => {
      // «Übernehmen» ist delegiert: die Karten werden bei jeder Vorschau neu gerendert,
      // direkt gebundene Listener gingen dabei verloren.
      const adopt = event.target.closest('[data-adopt-variant]');
      if (adopt) {
        try { state = V3State.activate(state, numeric(adopt.dataset.adoptVariant)); previewShare = null; editSlot = null; markDirty(); renderPlan(true); }
        catch (error) { message(error.message); }
        return;
      }
      // Erklärungen (ⓘ) öffnen nur ihren Dialog und laden keine Quote in den Bezug.
      if (event.target.closest('[data-modal]')) return;
      const button = event.target.closest('[data-variant-index]');
      if (!button) return;
      // Klick irgendwo auf die Kachel lädt genau diesen Wert in den PK-Bezug (Vorschau).
      editSlot = Number(button.dataset.variantIndex);
      update(variantShares()[editSlot]);
      focusTarget('shareNumber');
    });
    remember?.addEventListener('click', () => {
      try {
        const saved = previewShare;
        // Ohne Klick auf eine Karte wird der aktuelle Plan selbst gespeichert;
        // mit Klick der geladene Platz – auch wenn das der aktuelle Plan ist.
        const target = editSlot ?? Math.max(0, variantShares().indexOf(chosenShare()));
        state = V3State.remember(state, saved, target);
        previewShare = null; editSlot = null; markDirty(); renderPlan(true);
      }
      catch (error) { message(error.message); }
    });
    app.querySelector('[data-tip-close]')?.addEventListener('click', () => { state.tipDismissed = true; markDirty(); renderPlan(true); });

    app.querySelectorAll('[data-pots-modal]').forEach(button => button.addEventListener('click', event => openPotsModal(event.currentTarget)));
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
      else if (position === 'compare' && state.mode === 'pre') returnToPlan();
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
    const modal = event.target.closest('[data-modal]');
    if (modal) openModal(modal);
    else if (back) { previewShare = null; editSlot = null; returnToPlan(); }
    else if (breakdown) openDetail('pension', 'pkBreakdown', 'pkKapital');
    else if (vorsorge) openDetail(vorsorge.dataset.openVorsorge, vorsorge.dataset.focusSection || '', vorsorge.dataset.focusHighlight || '');
    else if (next) openDetail(next.dataset.v3Next, next.dataset.focusSection || '', next.dataset.focusHighlight || '');
    else if (cancel) { assetPart = null; renderAssets(); }
    else if (asset) { assetPart = asset.dataset.asset; renderAssets(); }
  });
  const modalClose = document.querySelector('[data-modal-close]');
  if (modalClose && !modalClose.innerHTML.trim()) modalClose.innerHTML = Icons.icon('close', {size:18});
  // Delegiert, damit auch im Dialog erzeugte Schliessen-Knöpfe funktionieren.
  document.getElementById('v3Modal')?.addEventListener('click', event => {
    if (event.target.closest('[data-modal-close]')) { closeModal(); return; }
    if (event.target === event.currentTarget) closeModal();
  });
  // Klick auf den Hintergrund schliesst den Dialog; Escape erledigt der Browser selbst.
  /* Testmodus: genau zwei Werkzeuge – gespeicherten Stand aus einer JSON-Datei laden und
     den gespeicherten Stand löschen. Nur aktiv mit ?dev=1 oder devMode=1; ohne Aktivierung
     wird nichts gerendert. */
  if (globalThis.DevFixture?.enabled?.()) {
    const bar = document.createElement('div');
    bar.className = 'v3-dev';
    bar.innerHTML = '<strong>Testmodus</strong><span>Beispielplanung, Stand laden oder löschen – nur in der Entwicklung.</span><button type="button" data-dev="demo">Beispielplanung</button><button type="button" data-dev="load">Stand laden</button><button type="button" data-dev="clear">Stand löschen</button><input type="file" accept=".json,application/json" hidden data-dev-file><span class="v3-dev-status" data-dev-status role="status"></span>';
    const status = text => { const node = bar.querySelector('[data-dev-status]'); if (node) node.textContent = text || ''; };
    const file = bar.querySelector('[data-dev-file]');
    const reload = () => { suspendSaving(); globalThis.location.reload(); };
    // Datei darf die Speicherhülle der App oder einen reinen Zustand enthalten.
    const useFile = (raw, name) => {
      const problem = importState(raw);
      status(problem || `Stand «${name}» geladen.`);
      if (!problem) reload();
    };
    bar.addEventListener('click', event => {
      const button = event.target.closest('[data-dev]');
      if (!button) return;
      if (button.dataset.dev === 'demo') { loadDemo(); status('Beispielplanung geladen.'); return; }
      if (button.dataset.dev === 'load') { status(''); file.value = ''; file.click(); return; }
      globalThis.DevFixture.clear();
      status('Gespeicherter Stand gelöscht.');
      reload();
    });
    file.addEventListener('change', () => {
      const chosen = file.files?.[0];
      if (!chosen) return;
      const reader = new FileReader();
      reader.onload = () => useFile(String(reader.result ?? ''), chosen.name);
      reader.onerror = () => status(`«${chosen.name}» konnte nicht gelesen werden.`);
      reader.readAsText(chosen);
    });
    document.body.insertBefore(bar, document.body.firstChild);
  }  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
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
  setStartDraft(); renderStart();
  load();
  window.addEventListener?.('pagehide', save);
})();