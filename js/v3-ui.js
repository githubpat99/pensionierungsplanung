(() => {
  const app = document.getElementById('app');
  const State = CheckV2State;
  const Calculator = RetirementCalculator;
  const storageKey = 'retirement-v3-plan';
  const money = value => `CHF ${Math.round(value || 0).toLocaleString('de-CH').replace(/’/g, "'")}`;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const numeric = value => Number(value || 0);
  const entered = value => value !== undefined && value !== null && String(value).trim() !== '';
  let state = State.fresh('pre');
  let route = 'rents';
  let draft = {};
  let assetPart = null;
  let currentShare = 50;
  let previewShare = 50;
  let selectedShare = 50;
  let selectedVariantIndex = 1;
  let variants = [0, 50, 100];
  let chartObserver;

  function fieldMarkup(field) {
    const value = draft[field.key] ?? '';
    if (field.type === 'check') return `<label class="v3-checkbox"><input type="checkbox" name="${field.key}" ${value ? 'checked' : ''}>${field.label}</label>`;
    if (field.type === 'canton') return `<div class="v3-field"><label for="${field.key}">${field.label}</label><select id="${field.key}" name="${field.key}"><option value="">Noch offen · keine Steuerschätzung</option>${Object.entries(TaxModel.config.cantons).map(([key, canton]) => `<option value="${key}" ${value === key ? 'selected' : ''}>${esc(canton.name)}</option>`).join('')}</select></div>`;
    return `<div class="v3-field"><label for="${field.key}">${field.label}</label><div class="v3-entry"><input id="${field.key}" name="${field.key}" type="number" inputmode="decimal" min="${field.min ?? 0}" max="${field.max ?? 1e10}" step="${field.step ?? 'any'}" value="${esc(value)}"><span>${field.unit}</span></div></div>`;
  }
  function assignForm() { app.querySelectorAll('input,select').forEach(input => { if (input.name) draft[input.name] = input.type === 'checkbox' ? input.checked : input.value; }); }
  function setDraft(group) { draft = {}; State.fields(group, state).forEach(field => { draft[field.key] = group === 'pension' && field.key === 'pkShare' ? currentShare : (state.details[group]?.[field.key] ?? state.values[field.key] ?? ''); }); }
  function pageHeader(title, eyebrow, back = '') { return `<header class="v3-heading">${back ? `<button class="home-link" data-back>${back}</button>` : ''}<span class="v3-eyebrow">${eyebrow}</span><h1>${title}</h1></header>`; }
  function stepper(active) { return `<nav class="v3-stepper" aria-label="Planungsschritte"><span class="${active === 'rents' ? 'active' : ''}">Meine Renten</span><span class="${active === 'need' ? 'active' : ''}">Mein Bedarf</span><span class="${active === 'plan' ? 'active' : ''}">Mein Plan</span></nav>`; }
  function message(text = '') { const node = document.getElementById('v3Error'); if (node) node.textContent = text; }
  function apply(group, values) { state = State.apply(state, group, values); }
  function renderForm(routeName) {
    route = routeName;
    const isRents = routeName === 'rents';
    const title = isRents ? 'Meine Renten' : 'Mein Bedarf';
    const copy = isRents ? 'Erfasse die Renten und Vorsorge, die deinen Ruhestand tragen. Unbekannte Beträge bleiben offen.' : 'Lege deinen monatlichen Bedarf fest. Die PK-Varianten teilen diesen Bedarf und alle übrigen Annahmen.';
    const fields = isRents
      ? [...State.fields('time', state), State.fields('income', state).find(field => field.key === 'ahv')].map(field => ({...field, group:field.key === 'ahv' ? 'income' : 'time'}))
      : State.fields('need', state).map(field => ({...field, group:'need'}));
      app.innerHTML = `${pageHeader(title, 'V3 · Ruhestandsplanung')}${stepper(routeName === 'rents' ? 'rents' : 'need')}<div class="v3-layout"><section class="v3-form"><p class="v3-lead">${copy}</p>${isRents ? '<button type="button" class="v3-demo-button" data-demo>Beispielplanung laden</button>' : ''}<form id="v3Form"><div class="v3-fields">${fields.map(field => fieldMarkup(field)).join('')}</div><p class="v3-error" id="v3Error" role="alert"></p><div class="v3-actions"><button type="button" data-v3-back ${isRents ? 'hidden' : ''}>Zurück</button><button class="primary" type="submit">${isRents ? 'Weiter zu meinem Bedarf' : 'Meinen Plan öffnen'}</button></div></form></section><aside class="v3-aside"><strong>${isRents ? 'Der Plan entsteht aus deinen Angaben.' : 'Die PK-Entscheidung kommt im Plan.'}</strong><p>Die Berechnung verwendet den bestehenden gemeinsamen Rechenkern. Es werden keine Werte neben dem Rechner geschätzt.</p>${isRents ? '<button type="button" data-load>Gespeicherten V3-Stand laden</button>' : ''}</aside></div>`;
    document.querySelector('[data-load]')?.addEventListener('click', load);
    document.querySelector('[data-demo]')?.addEventListener('click', loadDemo);
    document.querySelector('[data-v3-back]')?.addEventListener('click', () => { setDraft('time'); renderForm('rents'); });
    document.getElementById('v3Form').addEventListener('submit', submitForm);
  }
  function submitForm(event) {
      event.preventDefault(); assignForm();
    try {
      if (route === 'rents') {
        const time = Object.fromEntries(State.fields('time', state).map(field => [field.key, draft[field.key]]));
        apply('time', time); apply('regular', {...incomeValues(), ahv:draft.ahv ?? state.details.income?.ahv ?? 0});
        setDraft('need'); renderForm('need');
      } else { apply('need', {need:draft.need}); renderPlan(); }
    } catch (error) { message(error.message); }
  }
  const editorTitles = {personal:'Persönliche Angaben', ahv:'AHV-Renten', pension:'Pensionskasse', pension3a:'Säule 3a', extra:'Weitere Einnahmen', need:'Bedarf', assumptions:'Annahmen', assets:'Vermögen'};
  const pkRateKeys = ['pkInterest', 'uws'];
  function editorFields(detail) {
    if (detail === 'personal') return [...State.fields('time', state), ...State.fields('tax', state)];
    if (detail === 'ahv') return State.fields('income', state).filter(field => field.key === 'ahv');
    if (detail === 'extra') return State.fields('income', state).filter(field => ['other', 'additional'].includes(field.key));
    if (detail === 'pension') return [...State.fields('pension', state).filter(field => field.key !== 'pkShare'), ...State.fields('assumptions', state).filter(field => pkRateKeys.includes(field.key))];
    return State.fields(detail, state).filter(field => detail !== 'assumptions' || !pkRateKeys.includes(field.key));
  }
  function assumptionValues() { return {...State.defaults, ...state.details.assumptions, targetAge:state.targetAge}; }
  function incomeValues() { return {ahv:0, other:state.values.regular ?? 0, additional:0, ...state.details.income, canton:State.canton(state)}; }
  function returnToPlan() {
    closeMenu();
    if (!State.timing(state)) { setDraft('time'); renderForm('rents'); return; }
    if (state.values.need === undefined) { setDraft('need'); renderForm('need'); return; }
    renderPlan();
  }
  function pensionBreakdown(source = state, share = previewShare) {
    if (source.mode === 'post') return '<p class="v3-hint">Die tatsächlich laufende PK-Rente zählt zum Einkommen. Bereits bezogenes Kapital ist im verfügbaren Vermögen enthalten.</p>';
    const plan = planFor(share, source);
    if (!plan) return '<p class="v3-hint">Ergänze zuerst deine persönlichen Angaben, damit wir die Pensionskasse hochrechnen können.</p>';
    const pk = Calculator.calculatePension(plan), open = pk.capitalTax === null;
    return `<section id="pkBreakdown" class="v3-pk-breakdown" tabindex="-1" aria-labelledby="pkBreakdownTitle"><h2 id="pkBreakdownTitle">Dein PK-Kapital im Überblick</h2><p class="v3-hint">Für ${share} % Kapital bei Pensionierung mit ${plan.retirement.age}. Den Kapitalanteil wählst du unter «Mein Plan».</p><dl><div><dt>PK-Kapital brutto</dt><dd data-pk-gross>${money(pk.cap)}</dd></div><div><dt>↓ Geschätzte Kapitalbezugssteuer</dt><dd data-pk-tax>${open ? 'Steuern offen' : money(pk.capitalTax)}</dd></div><div><dt>↓ PK-Kapital netto</dt><dd data-pk-net>${open ? 'Steuern offen' : money(pk.netCap)}</dd></div></dl><p class="v3-hint">${open ? 'Ergänze deinen Wohnkanton unter «Persönliche Angaben». Der Bruttobetrag ist vorläufig ohne Steuerabzug.' : `Geschätzte Kapitalbezugssteuer auf ${money(pk.cap)}: ${money(pk.capitalTax)} (${TaxModel.getCapitalWithdrawalTaxRate(plan.person.canton, pk.cap).toLocaleString('de-DE', {maximumFractionDigits:2})} %) im Kanton ${esc(TaxModel.canton(plan.person.canton).name)}.`} Modellrechnung, keine individuelle Steuerberechnung.</p></section>`;
  }
  function pensionDraft() {
    const values = {...state.details.pension, ...Object.fromEntries(State.fields('pension', state).map(field => [field.key, field.key === 'pkShare' ? currentShare : draft[field.key]]))};
    let next = State.apply(state, 'pension', values);
    if (state.mode === 'pre') {
      const rates = {...assumptionValues(), ...Object.fromEntries(pkRateKeys.map(key => [key, draft[key]])), reviewed:true};
      next = State.apply(next, 'assumptions', rates);
      // Editing PK data is not confirmation of all planning assumptions.
      next.confirmed.assumptions = false;
    }
    return next;
  }
  function renderDetail(detail, focusBreakdown = false) {
    closeMenu(); chartObserver?.disconnect(); route = detail; assetPart = null;
    window.scrollTo(0, 0);
    const pension = detail === 'pension';
    const fields = editorFields(detail);
    const initial = detail === 'personal' ? {...state.values, canton:State.canton(state)}
      : ['ahv','extra'].includes(detail) ? incomeValues()
      : detail === 'assumptions' ? {...assumptionValues(), reviewed:false}
      : pension ? {...assumptionValues(), ...state.details.pension}
      : {...state.values, ...state.details[detail]};
    draft = Object.fromEntries(fields.map(field => [field.key, initial[field.key] ?? '']));
    const modeField = detail === 'personal' ? `<div class="v3-field"><label for="personMode">Deine Situation</label><select id="personMode"><option value="pre" ${state.mode === 'pre' ? 'selected' : ''}>Vor der Pensionierung</option><option value="post" ${state.mode === 'post' ? 'selected' : ''}>Bereits pensioniert</option></select></div>` : '';
    const hint = pension ? (state.mode === 'pre' ? 'Erfasse dein PK-Guthaben und die Sparbeiträge von dir und deinem Arbeitgeber zusammen. Kapitalanteil und Varianten wählst du unter «Mein Plan».' : 'Erfasse die PK-Rente, die du heute tatsächlich erhältst.') : detail === 'pension3a' ? 'Erfasse dein 3a-Guthaben und die jährlichen Beiträge. Der Betrag ergänzt dein verfügbares Vermögen zum Pensionierungszeitpunkt.' : 'Änderungen gelten für deinen Plan und alle PK-Varianten.';
    app.innerHTML = `${pageHeader(editorTitles[detail], 'V3 · Mein Plan', '← Mein Plan')}<div class="v3-detail-layout"><section class="v3-detail-form"><p class="v3-sublead">${hint}</p><form id="v3DetailForm">${modeField}<div class="v3-fields">${fields.map(fieldMarkup).join('')}</div><p class="v3-error" id="v3Error" role="alert"></p><div id="pensionResult">${pension ? pensionBreakdown() : ''}</div><div class="v3-actions"><button type="button" data-detail-back>Abbrechen</button><button class="primary" type="submit">Übernehmen</button></div></form></section></div>`;
    document.querySelector('[data-detail-back]').addEventListener('click', returnToPlan);
    const form = document.getElementById('v3DetailForm');
    document.getElementById('personMode')?.addEventListener('change', event => {
      assignForm();
      const source = {...state, mode:event.target.value};
      draft.retirement ??= state.values.retirement ?? '';
      form.querySelector('.v3-fields').innerHTML = [...State.fields('time', source), ...State.fields('tax', source)].map(fieldMarkup).join('');
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
          const mode = document.getElementById('personMode').value, previousMode = state.mode;
          const next = State.apply({...state, mode}, 'time', draft);
          state = State.apply(next, 'tax', {canton:draft.canton});
          if (mode === 'pre' && previousMode !== mode) previewShare = selectedShare = currentShare;
        } else if (['ahv','extra'].includes(detail)) apply('income', {...incomeValues(), ...draft});
        else if (detail === 'assumptions') apply('assumptions', {...assumptionValues(), ...draft});
        else apply(detail, {...state.details[detail], ...draft});
        returnToPlan();
      } catch (error) { message(error.message); }
    });
    if (focusBreakdown) {
      const section = document.getElementById('pkBreakdown');
      section?.focus({preventScroll:true}); section?.scrollIntoView({block:'start'});
    }
  }
  // --- Vermögensdetailseite: verfügbare Mittel direkt bearbeiten, Vorsorge nur lesend ---
  function assetRowMarkup({part, label, value, hint = '', source = '', badge = ''}) {
    const open = !!part && assetPart === part;
    const action = source ? `data-open-vorsorge="${source}"` : `data-asset="${part}" aria-expanded="${open}" aria-controls="asset-${part}"`;
    return `<div class="v3-asset-item${source ? ' v3-asset-source' : ''}"><button type="button" class="v3-asset-trigger" ${action}><span class="v3-asset-label">${label}${hint ? `<small>${hint}</small>` : ''}</span><span class="v3-asset-value">${value === null ? '<span class="v3-unknown">Noch nicht erfasst</span>' : `<strong>${money(value)}</strong>`}${badge ? `<small>${badge}</small>` : ''}</span><span class="v3-asset-chevron" aria-hidden="true">${value === null ? 'Erfassen' : '›'}</span></button>${open ? assetFormMarkup(part) : ''}</div>`;
  }
  function assetFormMarkup(part) {
    const values = part === 'unallocated' ? {unallocated:State.breakdown(state).assets.unallocated ?? ''} : (state.details.assets ?? {});
    return `<form class="v3-asset-form" id="asset-${part}" data-asset-form="${part}" novalidate><div class="v3-fields">${State.assetFields(part, state).map(field => `<div class="v3-field"><label for="asset-input-${field.key}">${field.label}</label><div class="v3-entry"><input id="asset-input-${field.key}" name="${field.key}" type="number" inputmode="decimal" min="${field.min ?? 0}" max="${field.max ?? 1e10}" step="${field.step ?? 'any'}" value="${esc(values[field.key] ?? '')}"><span>${field.unit}</span></div></div>`).join('')}</div><p class="v3-error" id="asset-error-${part}" role="alert"></p><div class="v3-actions"><button type="button" data-asset-cancel="${part}">Abbrechen</button><button class="primary" type="submit">Übernehmen</button></div></form>`;
  }
  /* Available capital stays with its own sources; Säule 3a and the chosen PK capital
     withdrawal come from Vorsorge and are only shown, never entered here a second time. */
  function assetComposition(s) {
    if (!State.timing(s)) return '<p class="v3-hint">Ergänze zuerst deine persönlichen Angaben.</p>';
    const b = State.breakdown(s), pre = s.mode === 'pre', projection = 'voraussichtlich zum Pensionierungszeitpunkt';
    const pkOpen = b.pk.capitalTax === null, rest = b.assets.unallocated;
    const pkValue = b.assets.pk === null ? null : (pkOpen ? b.pk.cap : b.assets.pk);
    const pkHint = `gemäss deiner PK-Entscheidung${b.assets.pk === null ? '' : pkOpen ? ' · brutto, Steuer noch offen' : ' · netto nach Bezugssteuer'}`;
    return `<p class="v3-hint">${pre ? `Verfügbare Mittel ab Pensionierung mit ${s.values.retirement}` : `Verfügbare Mittel ab Alter ${s.values.age}`}</p><div class="v3-assets">
     ${assetRowMarkup({part:'cash', label:'Bank / liquide Mittel', value:b.assets.cash})}
     ${assetRowMarkup({part:'securities', label:'Wertschriften', value:b.assets.securities, hint:pre ? projection : ''})}
     ${assetRowMarkup({part:'otherAssets', label:'Weitere verfügbare Vermögenswerte', value:b.assets.other})}
     ${rest !== null && rest > 0 ? assetRowMarkup({part:'unallocated', label:'Noch nicht aufgeteiltes Vermögen', value:rest, hint:'Rest deiner bisherigen Gesamtsumme'}) : ''}
     ${pre ? assetRowMarkup({source:'pension3a', label:'Säule 3a', value:b.assets.p3, hint:projection, badge:'aus Vorsorge'}) : ''}
     ${pre ? assetRowMarkup({source:'pension', label:pkOpen ? 'PK-Kapital brutto' : 'PK-Kapital netto', value:pkValue, hint:pkHint, badge:'aus Vorsorge'}) : ''}
    </div><dl class="v3-asset-total"><div><dt>Verfügbares Vermögen total</dt><dd>${money(b.result.availableCapital)}</dd></div></dl><p class="v3-hint">${pre ? 'Säule 3a und PK-Kapital stammen aus deiner Vorsorge. Sie werden hier nur angezeigt und nicht ein zweites Mal als verfügbares Vermögen erfasst. Eine separate 3a-Bezugssteuer ist noch nicht berücksichtigt.' : 'Bereits bezogenes PK- und 3a-Kapital ist in deinen verfügbaren Mitteln enthalten und wird nicht nochmals hinzugezählt.'}</p><section class="v3-bound-assets"><h2>Gebundenes Vermögen</h2>${assetRowMarkup({part:'property', label:'Immobilien netto', value:b.assets.bound, hint:'Immobilienwert abzüglich Hypotheken'})}<p class="v3-hint">Dieses Vermögen ist aktuell nicht für laufende Entnahmen eingeplant.</p></section>`;
  }
  function renderAssets() {
    closeMenu(); chartObserver?.disconnect();
    if (!State.timing(state) || state.values.need === undefined) { returnToPlan(); return; }
    route = 'assets';
    window.scrollTo(0, 0);
    app.innerHTML = `${pageHeader('Vermögen', 'V3 · Mein Plan', '← Mein Plan')}<div class="v3-detail-layout"><section class="v3-detail-form"><p class="v3-sublead">Dein verfügbares Vermögen besteht aus Bank, Wertschriften und weiteren verfügbaren Vermögenswerten. Vorsorgebeträge werden nur angezeigt; Immobilien netto bleiben als gebundenes Vermögen getrennt.</p>${assetComposition(state)}</section></div>`;
    app.querySelectorAll('[data-asset-form]').forEach(form => form.addEventListener('submit', event => {
      event.preventDefault();
      const values = Object.fromEntries([...form.querySelectorAll('input')].filter(input => input.name).map(input => [input.name, input.value]));
      try { state = State.applyAsset(state, form.dataset.assetForm, values); assetPart = null; renderAssets(); }
      catch (error) { form.querySelector('.v3-error').textContent = error.message; }
    }));
  }
  function openDetail(name) {
    assetPart = null;
    if (name === 'assets') renderAssets();
    else renderDetail(name);
  }
  function planFor(share, source = state) {
    const plan = State.toPlan(source);
    if (plan && source.mode === 'pre') plan.pensionDecision.capitalShare = share;
    return plan;
  }
  function evaluated(share) { const plan = planFor(share); return {plan, result:Calculator.evaluatePlan(plan), pension:Calculator.calculatePension(plan)}; }
  function readout(item) {
    const open = item.pension.capitalTax === null;
    return `<div class="v3-readout"><div><span>PK-Rente / Monat</span><strong>${money(item.pension.rent / 12)}</strong></div><button type="button" class="v3-capital-link" data-pk-breakdown><span>${open ? 'PK-Kapital brutto' : 'PK-Kapital netto'}</span><strong>${money(open ? item.pension.cap : item.pension.netCap)}</strong><small>${open ? 'Steuern offen · ' : ''}Aufschlüsselung ansehen →</small></button></div>`;
  }
  function currentVariants() { return variants.slice(0, 3).map((share, index) => ({share, index, ...evaluated(share)})); }
  function marker(index) { return index === 0 ? '●' : index === 1 ? '■' : '◆'; }
  function variantCards() { return currentVariants().map(item => { const saved = item.share === variants[item.index]; return `<div class="v3-variant ${item.index === selectedVariantIndex ? 'selected' : ''}"><button class="v3-variant-select" data-variant-index="${item.index}" type="button"><span class="v3-marker marker-${item.index}">${marker(item.index)}</span><span class="v3-variant-copy"><strong>${item.share} % Kapital</strong><small>${item.index === 1 ? 'Rente + Kapital' : item.share === 0 ? 'mehr laufende PK-Rente' : 'mehr Kapital zu Beginn'}</small></span></button><button class="v3-variant-save ${saved ? 'saved' : ''}" data-save-variant-index="${item.index}" type="button" aria-label="${saved ? 'Variante gespeichert' : 'Variante speichern'}" title="${saved ? 'Gespeichert' : 'Variante speichern'}">${saved ? '✓' : '＋'}</button></div>`; }).join(''); }
  function chart(rows, width) {
    const points = rows.flatMap(row => row.result.yearlyProjection.map(entry => entry.free));
    // Match SVG units to CSS pixels so labels and markers stay legible on mobile.
    const maximum = Math.max(1, ...points), height = 270, left = money(maximum).length * 8 + 16, right = 10, top = 16, bottom = 32, plotWidth = width - left - right, plotHeight = height - top - bottom;
    const y = value => top + plotHeight - (value / maximum) * plotHeight;
    const grid = [0, .5, 1].map(ratio => `<line class="v3-grid" x1="${left}" x2="${width - right}" y1="${y(maximum * ratio)}" y2="${y(maximum * ratio)}"></line><text x="${left - 12}" text-anchor="end" y="${y(maximum * ratio) + 5}">${money(maximum * ratio)}</text>`).join('');
    const lines = rows.map((row, index) => { const series = row.result.yearlyProjection, coordinates = series.map((entry, i) => `${left + (i / Math.max(1, series.length - 1)) * plotWidth},${y(entry.free)}`).join(' '), dash = index === 1 ? ' stroke-dasharray="9 6"' : index === 2 ? ' stroke-dasharray="2 6"' : '', color = ['#316d58', '#6f675e', '#536477'][index], markers = [0, Math.floor((series.length - 1) / 2), series.length - 1].filter((value, position, all) => all.indexOf(value) === position).map(i => { const x = left + (i / Math.max(1, series.length - 1)) * plotWidth; const cy = y(series[i].free); return index === 0 ? `<circle cx="${x}" cy="${cy}" r="4" fill="${color}"></circle>` : index === 1 ? `<rect x="${x - 3}" y="${cy - 3}" width="6" height="6" fill="${color}"></rect>` : `<path d="M ${x} ${cy - 5} L ${x + 5} ${cy} L ${x} ${cy + 5} L ${x - 5} ${cy} Z" fill="${color}"></path>`; }).join(''); return `<polyline points="${coordinates}" fill="none" stroke="${color}" stroke-width="${index === 0 ? 3 : 2}"${dash}></polyline>${markers}`; }).join('');
    return `<svg class="v3-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Verfügbares Kapital aller Varianten bis Alter ${rows[0].plan.retirement.targetAge}">${grid}<line class="v3-axis" x1="${left}" x2="${width - right}" y1="${y(0)}" y2="${y(0)}"></line>${lines}<text x="${left}" y="${height - 8}">Start</text><text x="${width - right}" text-anchor="end" y="${height - 8}">Zielalter</text></svg>`;
  }
  function planSummary(item) { const result = item.result, pending = result.assessment === 'pending'; const assetsKnown = !!state.details.assets || state.values.free !== undefined; const pensionKnown = state.details.pension?.[state.mode === 'pre' ? 'pk' : 'pkRent'] !== undefined; const assets = assetsKnown ? Calculator.calculateAvailableCapital(item.plan).totalInvestableCapital : null; const assetsMarkup = `<section class="v3-asset-card"><div class="v3-asset-icon" aria-hidden="true">◉</div><div class="v3-asset-copy"><h3>Vermögen</h3><strong>${assets === null ? 'Noch nicht erfasst' : `${money(assets)} im Plan`}</strong><div class="v3-progress"><span style="width:${assets === null ? 0 : 100}%"></span></div><small>${assets === null ? 'Damit wird dein Plan genauer.' : 'Kann einen Teil der Lücke decken.'}</small></div></section>`; const checklist = `<section class="v3-settle"><h2>Plan festigen</h2><button type="button" class="v3-next-row" data-v3-next="assets"><span class="v3-circle">${assetsKnown ? '✓' : ''}</span><span><strong>Vermögen</strong><small>${assetsKnown ? 'Erfasst' : 'Offen'}</small></span><em>${assetsKnown ? 'Anpassen' : 'Nächster Schritt'}</em><b>›</b></button><button type="button" class="v3-next-row" data-v3-next="pension"><span class="v3-circle">${pensionKnown ? '✓' : ''}</span><span><strong>Pensionskasse</strong><small>${pensionKnown ? 'Erfasst' : 'Offen'}</small></span><em>${pensionKnown ? 'Anpassen' : 'Nächster Schritt'}</em><b>›</b></button></section>`; return `<div class="v3-summary"><div><span>Bedarf / Monat</span><strong>${money(result.monthlyNeed)}</strong></div><div><span>${pending ? 'Einkommen · Steuern offen' : 'Einkommen netto'}</span><strong>${money(result.monthlyIncomeNet)}</strong></div><div><span>Aus Vermögen / Monat</span><strong>${money(result.monthlyGap)}</strong></div></div><div class="v3-status ${pending ? 'pending' : result.capitalExhaustionAge ? 'gap' : 'covered'}">${pending ? 'Vorläufig ohne Wohnkanton und Steuerabzug.' : result.capitalExhaustionAge ? `Finanzierungslücke voraussichtlich ab Alter ${result.capitalExhaustionAge}.` : `Unter den gewählten Annahmen bis Alter ${item.plan.retirement.targetAge} finanzierbar.`}</div>${assetsMarkup}${checklist}`; }
  function compactReadySummary(item) { const result = item.result; return `<div class="v3-summary-block"><div class="v3-compact-summary"><div><span>AHV + PK</span><strong>${money(result.monthlyIncomeNet)} <small>/ Monat</small></strong></div><div><span>Bedarf</span><strong>${money(result.monthlyNeed)} <small>/ Monat</small></strong></div><div class="v3-gap-value"><span>Monatlich offen</span><strong>${money(result.monthlyGap)}</strong></div></div><p class="v3-compact-note">${result.assessment === 'pending' ? 'Vor Steuern · erste Orientierung.' : 'Nach geschätzten Steuern · Kapitalwirkung über die Jahre vergleichen.'}</p></div>`; }
  function updateCompactSummary(item) { document.querySelectorAll('.v3-compact-note').forEach(note => note.remove()); const summary = document.querySelector('.v3-summary-block') || document.querySelector('.v3-compact-summary'); if (summary) summary.outerHTML = compactReadySummary(item); }
  function renderCompare() {
    route = 'compare';
    chartObserver?.disconnect();
    app.innerHTML = `${pageHeader('Varianten vergleichen', 'V3 · Mein Plan', '← Mein Plan')}<div class="v3-compare"><section class="v3-section"><h2>Verfügbares Kapital über die Jahre</h2><p class="v3-hint">Illustration aus derselben Berechnung, mit identischem Bedarf, Steuern und Inflationsbeginn ab Pensionierung.</p><div class="v3-chart-container"></div></section><section class="v3-section"><h2>Was bedeuten die Varianten?</h2><div class="v3-meaning">${currentVariants().map(item => `<div><span class="v3-marker marker-${item.index}">${marker(item.index)}</span><strong>${item.share} % Kapital</strong><span>${item.share === 0 ? 'mehr laufende PK-Rente' : item.share > 50 ? 'mehr Kapital zu Beginn' : 'Rente + Kapital'}</span></div>`).join('')}</div><p class="v3-hint">Gleiche übrige Annahmen für alle Varianten. Keine Farbe bewertet eine Variante.</p></section><button class="primary v3-full-button" data-back-plan>Zurück zu meinem Plan</button></div>`;
    const container = app.querySelector('.v3-chart-container');
    const rows = currentVariants();
    let chartWidth = 0;
    const resizeChart = () => {
      const width = container.getBoundingClientRect().width;
      if (width > 0 && width !== chartWidth) {
        chartWidth = width;
        container.innerHTML = chart(rows, width);
      }
    };
    resizeChart();
    chartObserver = new ResizeObserver(resizeChart);
    chartObserver.observe(container);
    document.querySelector('[data-back-plan]').addEventListener('click', renderPlan);
  }
  function renderPlan() {
    closeMenu(); window.scrollTo(0, 0);
    chartObserver?.disconnect();
    route = 'plan';
    const pre = state.mode === 'pre';
    const assetsReady = !!state.details.assets && Object.values(state.details.assets).some(value => String(value ?? '').trim() !== '' && numeric(value) > 0);
    const pensionReady = state.details.pension?.[pre ? 'pk' : 'pkRent'] !== undefined;
    const decisionReady = assetsReady && pensionReady;
    if (pre) currentShare = numeric(state.details.pension?.pkShare ?? currentShare);
    if (!pre) previewShare = selectedShare = 0;
    const item = evaluated(previewShare);
    const decision = decisionReady && pre ? `<div class="v3-decision"><div class="v3-decision-title"><span>PK-Bezug wählen</span><strong><em id="shareValue">${previewShare}</em> % Kapital</strong></div><input id="shareRange" class="v3-range" type="range" min="0" max="100" step="1" value="${previewShare}" aria-label="PK-Kapitalanteil"><div class="v3-range-labels"><span>100 % Rente</span><span>100 % Kapital</span></div><div id="previewReadout">${readout(item)}</div><p class="v3-hint" id="variantMessage"></p><button type="button" data-apply-variant ${previewShare === currentShare ? 'hidden' : ''}>Variante übernehmen</button></div>` : `<div class="v3-note">${decisionReady ? 'Die laufende PK-Rente wird als bestehende Einnahme verwendet.' : 'Vermögen und PK-Angaben fehlen noch. Ergänze sie, bevor du PK-Bezug und Varianten vergleichst.'}</div>`;
    const variantsSection = decisionReady && pre ? `<section class="v3-section"><div class="v3-variants-heading"><h2>PK-Varianten vergleichen</h2></div><p class="v3-hint">3 Varianten</p><div class="v3-cards">${variantCards()}</div><button class="v3-compare-button" data-compare>Varianten vergleichen <span aria-hidden="true">→</span></button></section>` : '';
    const readyContent = decisionReady && pre ? `<section class="v3-compact-plan">${decision}${compactReadySummary(item)}${variantsSection}</section>` : `${decision}<section><h2 class="v3-current-title">Aktueller Plan</h2>${planSummary(item)}<p class="v3-info-line">${state.canton ? `Steuerschätzung für ${esc(TaxModel.canton(state.canton).name)}.` : 'Vor Steuern · erste Orientierung.'} Weitere Angaben verfeinern die Planung.</p></section>`;
    const afterReady = `<div class="v3-save"><span id="saveLabel">V3 wird separat gespeichert.</span><button data-save>Auf diesem Gerät speichern</button></div>`;
    app.innerHTML = `${pageHeader('Mein Plan', 'V3 · Zentrale Ansicht')}<div class="v3-plan-meta">${pre ? `Ruhestandsstart bei Pensionierung mit ${item.plan.retirement.age}` : 'Planungsstart heute'} · Planung bis Alter ${item.plan.retirement.targetAge}</div><div class="v3-plan-grid v3-plan-compact"><section>${readyContent}</section><aside>${decisionReady && pre ? '' : ''}${afterReady}</aside></div>`;
    bindPlan();
  }
  function bindPlan() {
    const range = document.getElementById('shareRange');
    if (range) { const update = value => { previewShare = Math.max(0, Math.min(100, Math.round(numeric(value)))); selectedShare = previewShare; const item = evaluated(previewShare); range.value = previewShare; document.getElementById('shareValue').textContent = previewShare; document.getElementById('previewReadout').innerHTML = readout(item); updateCompactSummary(item); updateVariantSaveIndicators(); document.querySelector('[data-apply-variant]').hidden = previewShare === currentShare; }; range.addEventListener('input', event => update(event.target.value)); }
    document.querySelectorAll('[data-variant-index]').forEach(button => button.addEventListener('click', () => { selectedVariantIndex = numeric(button.dataset.variantIndex); selectedShare = previewShare = variants[selectedVariantIndex]; const item = evaluated(previewShare); document.querySelectorAll('.v3-variant').forEach(candidate => candidate.classList.toggle('selected', candidate.querySelector('[data-variant-index]') === button)); const range = document.getElementById('shareRange'); if (range) range.value = previewShare; const shareValue = document.getElementById('shareValue'); if (shareValue) shareValue.textContent = previewShare; const previewReadout = document.getElementById('previewReadout'); if (previewReadout) previewReadout.innerHTML = readout(item); updateCompactSummary(item); updateVariantSaveIndicators(); document.querySelector('[data-apply-variant]').hidden = previewShare === currentShare; }));
    document.querySelectorAll('[data-save-variant-index]').forEach(button => button.addEventListener('click', () => { const index = numeric(button.dataset.saveVariantIndex); selectedVariantIndex = index; variants[index] = previewShare; selectedShare = previewShare; renderPlan(); }));
    document.querySelectorAll('[data-v3-next]').forEach(button => button.addEventListener('click', () => openDetail(button.dataset.v3Next)));
    document.querySelector('[data-compare]')?.addEventListener('click', renderCompare);
    document.querySelector('[data-apply-variant]')?.addEventListener('click', () => { apply('pension', {...state.details.pension, pkShare:previewShare}); currentShare = previewShare; renderPlan(); });
    document.querySelector('[data-save]')?.addEventListener('click', save);
  }
  function updateVariantSaveIndicators() { document.querySelectorAll('[data-save-variant-index]').forEach(button => { const index = numeric(button.dataset.saveVariantIndex); const saved = index !== selectedVariantIndex || variants[index] === previewShare; button.classList.toggle('saved', saved); button.textContent = saved ? '✓' : '＋'; button.setAttribute('aria-label', saved ? 'Variante gespeichert' : 'Variante speichern'); }); }
  function toggleMenu() { const menu = document.getElementById('v3Menu'); const button = document.querySelector('.menu-button'); if (!menu || !button) return; menu.hidden = !menu.hidden; button.setAttribute('aria-expanded', String(!menu.hidden)); }
  function closeMenu() { const menu = document.getElementById('v3Menu'); const button = document.querySelector('.menu-button'); if (menu) menu.hidden = true; if (button) button.setAttribute('aria-expanded', 'false'); }
  function save() { try { localStorage.setItem(storageKey, JSON.stringify({version:1, savedAt:new Date().toISOString(), state, currentShare, selectedShare, selectedVariantIndex, variants})); document.getElementById('saveLabel').textContent = '✓ Dein Stand wurde auf diesem Gerät gespeichert.'; } catch (error) { document.getElementById('saveLabel').textContent = 'Speichern nicht möglich.'; } }
  function load() { try { const saved = JSON.parse(localStorage.getItem(storageKey) || 'null'); if (!saved || saved.version !== 1) throw Error('Kein gültiger V3-Stand.'); State.validate(saved.state); state = saved.state; currentShare = numeric(saved.currentShare ?? state.details.pension?.pkShare ?? 50); variants = Array.isArray(saved.variants) && saved.variants.length === 3 ? saved.variants : [0, currentShare, 100]; selectedVariantIndex = numeric(saved.selectedVariantIndex ?? 1); selectedShare = numeric(saved.selectedShare ?? variants[selectedVariantIndex]); previewShare = selectedShare; returnToPlan(); } catch (error) { message(error.message); } }
  function loadDemo() {
    try {
      state = State.fresh('pre'); state.riskProfile = 'balanced';
      apply('time', {age:55, retirement:65});
      apply('regular', {canton:'', ahv:3300, other:0, additional:0});
      apply('need', {need:10000});
      apply('assets', {cash:20000, securities:30000, saving:0, otherAssets:0, propertyValue:0, mortgage:0});
      apply('pension', {pk:650000, pkContrib:50000, pkShare:50});
      apply('pension3a', {p3:0, p3Contrib:0});
      currentShare = 50; selectedShare = 50; previewShare = 50; selectedVariantIndex = 1; variants = [0, 50, 100];
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
    const cancel = event.target.closest('[data-asset-cancel]');
    const asset = event.target.closest('[data-asset]');
    if (back) returnToPlan();
    else if (breakdown) renderDetail('pension', true);
    else if (vorsorge) renderDetail(vorsorge.dataset.openVorsorge, vorsorge.dataset.openVorsorge === 'pension');
    else if (cancel) { assetPart = null; renderAssets(); }
    else if (asset) { assetPart = asset.dataset.asset; renderAssets(); }
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
  state.riskProfile = 'balanced';
  window.V3 = {save, load, planFor};
  setDraft('time'); renderForm('rents');
})();
