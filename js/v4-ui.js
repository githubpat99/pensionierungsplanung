/* V4 – radikal vereinfachte Mobile UX (Executive Summary statt Dashboard).
 *
 * Wiederverwendet wird alles Fachliche unverändert: Eingabeadapter (`v2-state.js`),
 * Varianten-/Persistenzschicht (`v3-state.js`), Schätzwerte (`estimates.js`), Icons
 * (`icons.js`) und der gemeinsame Rechenkern (`retirement-calculator.js` /
 * `retirement-engine.js` / `tax-model.js` / `risk-profiles.js`). V4 baut ausschliesslich
 * die Informationsarchitektur neu. Keine eigene Rechenlogik, keine hardcodierten Werte.
 *
 * «Mein Plan» ist die Zusammenfassung, kein Inhaltsverzeichnis der App:
 *   1 PageTitle (eine Titelzeile) · 2 Planstatus (ohne Buttons) · 3 vier Kennzahlen ·
 *   4 PK-Bezug-Slider · 5 genau eine zustandsabhängige Aktion («Plan präzisieren»/«Plan optimieren») · 6 zwei sekundäre Zeilen.
 * Alles Weitere liegt auf fokussierten Screens («Angaben & Grundlagen», «Plan präzisieren»/«Plan optimieren», «Meine Varianten»,
 * «Jahr für Jahr», Editoren) oder im Menü (siehe docs/information-architecture-v4.md). Autosave läuft ohne sichtbare Zeile.
 */
(() => {
  const app = document.getElementById('app');
  const State = CheckV2State;
  const Calculator = RetirementCalculator;
  const V3State = CheckV3State;
  const Estimates = globalThis.Estimates ?? null;
  const storageKey = 'retirement-v3-plan';
  const autoSaveDelay = 600;

  /* ---------------- Darstellung ---------------- */
  const money = value => `CHF ${Math.round(value || 0).toLocaleString('de-CH').replace(/’/g, "'")}`;
  const plain = value => Math.round(value || 0).toLocaleString('de-CH').replace(/’/g, "'");
  const percent = value => Number(value || 0).toLocaleString('de-DE', {maximumFractionDigits:2});
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const numeric = value => Number(value || 0);
  const entered = value => value !== undefined && value !== null && String(value).trim() !== '';
  const amountRaw = value => String(value ?? '').replace(/['\s\u00a0]/g, '');
  const amountValue = value => { const raw = amountRaw(value).replace(',', '.'); return raw === '' ? '' : raw; };
  const formatAmount = value => {
    const raw = amountValue(value);
    if (raw === '' || !/^-?\d*\.?\d*$/.test(raw)) return String(value ?? '');
    const [whole = '', decimals] = raw.split('.');
    const sign = whole.startsWith('-') ? '-' : '', digits = whole.replace('-', '');
    const grouped = digits ? plain(Number(digits)) : '';
    return `${sign}${grouped}${decimals === undefined ? '' : `.${decimals}`}`;
  };
  const isAmountField = field => String(field?.unit ?? '').startsWith('CHF');
  const requiredMark = field => field.optional === true ? '' : ' <span class="v3-required" aria-hidden="true">*</span>';

  /* ---------------- Zustand und Speicherung ---------------- */
  let state = State.fresh('pre');
  let route = 'plan';
  let draft = {};
  let previewShare = null;
  let lastSavedAt = null;
  let saveTimer = null;
  let storageBlocked = false;
  let storageFailed = false;
  const normalizeP3 = source => V3State.normalize(source);
  const variantShares = () => V3State.variants(state);
  const chosenShare = () => state.mode === 'post' ? 0 : numeric(state.details.pension?.pkShare ?? 0);

  /* Speicherung läuft im Hintergrund (Autosave). Kein Speicher-Text und kein
     «Jetzt speichern»-Knopf mehr im UI – «Mein Plan» endet nach den sekundären
     Zeilen. Fehler werden für die Diagnose festgehalten. */
  const canDefer = typeof setTimeout === 'function';
  function persist() {
    try {
      if (storageBlocked || globalThis.__v4SuspendSave) return;
      const stamp = new Date().toISOString();
      state.position = route;
      state = normalizeP3(state);
      V3State.validate(state);
      localStorage.setItem(storageKey, JSON.stringify({version:2, savedAt:stamp, state}));
      lastSavedAt = stamp; storageFailed = false;
    } catch (error) { storageFailed = true; globalThis.__v4PersistError = error?.message ?? String(error); }
  }
  function markDirty() {
    if (saveTimer && canDefer) clearTimeout(saveTimer);
    saveTimer = canDefer ? setTimeout(() => { saveTimer = null; persist(); }, autoSaveDelay) : null;
    if (!saveTimer) persist();
  }
  function save() { if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; } persist(); }
  function message(text = '') { const node = document.getElementById('v4Error'); if (node) node.textContent = text; }
  function apply(group, values) { state = State.apply(state, group, values); markDirty(); }

  /* ---------------- Schätzwerte (eine Quelle je Zahl) ---------------- */
  function estimatedCanton(plan) {
    const Tax = globalThis.TaxModel, cantons = Tax?.config?.cantons;
    if (!Tax || !cantons) return '';
    const income = plan?.income ?? {};
    const reference = numeric(income.pre?.ahv) + numeric(income.pre?.other) + numeric(income.post?.pkRent) || 60000;
    const rated = Object.keys(cantons).map(code => ({code, rate:Tax.getIncomeTaxRate(code, reference)})).filter(entry => Number.isFinite(entry.rate)).sort((a, b) => a.rate - b.rate);
    return rated.length ? rated[Math.floor(rated.length / 2)].code : '';
  }
  function withEstimates(plan, source) {
    if (!plan || !Estimates) return plan;
    const ahv = Estimates.ahvOf(source);
    if (ahv.origin === 'estimated') {
      const annual = ahv.monthly * 12;
      if (plan.income?.pre && !(numeric(plan.income.pre.ahv) > 0)) plan.income.pre.ahv = annual;
      if (plan.income?.post && !(numeric(plan.income.post.ahv) > 0)) plan.income.post.ahv = annual;
    }
    if (!State.canton(source)) { const code = estimatedCanton(plan); if (code) plan.person.canton = code; }
    return plan;
  }
  function planFor(share, source = state) {
    const plan = State.toPlan(normalizeP3(source));
    if (plan && source.mode === 'pre') plan.pensionDecision.capitalShare = share;
    return withEstimates(plan, source);
  }
  function evaluated(share, source = state) {
    const plan = planFor(share, source);
    return plan ? {plan, result:Calculator.evaluatePlan(plan), pension:Calculator.calculatePension(plan)} : null;
  }
  const hasCanton = () => !!State.canton(state);

  /* ---------------- Antwort: Planstatus ---------------- */
  function reachAge(result, targetAge) { return result.capitalExhaustionAge ? `Alter ${result.capitalExhaustionAge}` : `Alter ${targetAge}+`; }
  function outcomeOf(item) {
    if (!item) return {tone:'pending', short:'Noch keine Angaben', long:''};
    const result = item.result, target = item.plan.retirement.targetAge;
    if (!hasCanton()) {
      const note = 'Erste Orientierung mit geschätzter AHV und geschätzten Steuern.';
      if (result.capitalExhaustionAge) return {tone:'watch', short:'Dein Plan ist noch knapp.', long:`Mit den bisherigen Angaben reicht dein Vermögen voraussichtlich bis ${reachAge(result, target)}.`, note};
      return {tone:'covered', short:'Dein erster Plan geht voraussichtlich auf.', long:`Dein Vermögen reicht bis zum Planungshorizont ${reachAge(result, target)}.`, note};
    }
    if (result.capitalExhaustionAge) return {tone:'gap', short:'Dein Plan ist noch knapp.', long:`Mit den bisherigen Angaben reicht dein Vermögen voraussichtlich bis ${reachAge(result, target)}.`, note:'Berechnet mit deinen Angaben und deinem Wohnkanton.'};
    return {tone:'covered', short:'Dein Plan geht voraussichtlich auf.', long:`Dein Vermögen reicht bis zum Planungshorizont ${reachAge(result, target)}.`, note:'Berechnet mit deinen Angaben und deinem Wohnkanton.'};
  }
  function verdictCard(item) {
    const outcome = outcomeOf(item);
    const icon = outcome.tone === 'covered' ? 'circleCheck' : 'alertCircle';
    // Nur «Wo stehe ich?»: Status, Erklärung, Berechnungsinfo – keine Aktionen.
    return `<section class="v4-verdict ${outcome.tone}" aria-live="polite"><span class="v4-verdict-icon" aria-hidden="true">${Icons.icon(icon, {size:20})}</span><h2>${outcome.short}</h2><p>${outcome.long}</p>${outcome.note ? `<p class="v4-verdict-note">${outcome.note}</p>` : ''}</section>`;
  }

  /* ---------------- Vier zentrale Kennzahlen ---------------- */
  /* Vier Kennzahlen als eine logische Kette:
       Einkommen netto  −  Bedarf netto  =  Aus Vermögen  →  finanziert vom Startkapital.
     Alle drei Monatswerte stammen aus demselben ersten Planjahr des Rechenkerns
     (`monthlyIncomeNet`, `monthlyNeed`, `monthlyGap`). Die angezeigten Zahlen sind so
     gerundet, dass die Differenz sichtbar aufgeht; die Renten brutto stehen im ⓘ und in
     der Jahresrechnung. */
  function summaryTiles(item) {
    const result = item.result, sources = Calculator.incomeSourcesAtStart(item.plan);
    /* Das Bruttoeinkommen ist genau die Summe aller Einnahmequellen des ersten Planjahres
       (AHV, PK, weitere Einnahmen) – dieselbe Zahl, die der Rechenkern als `incomeGross`
       führt. Nicht die Summe einzelner Rentenarten: sonst geht die Kette brutto − Steuern
       = netto nicht auf. */
    const grossMonthly = Math.round(numeric(result.incomeGross) / 12);
    const incomeNet = Math.round(numeric(result.monthlyIncomeNet));
    const needNet = Math.round(numeric(result.monthlyNeed));
    const fromWealth = Math.max(0, needNet - incomeNet);
    const surplus = incomeNet > needNet;
    const taxMonthly = Math.round(numeric(result.incomeTax) / 12);
    const rows = sources.filter(source => source.annualIncome > 0.5).map(source => `<div><dt>${esc(source.name)}${source.id === 'ahv' && Estimates && Estimates.ahvOf(state).origin === 'estimated' ? ' <small>geschätzt</small>' : ''}</dt><dd>${money(source.annualIncome / 12)} / Monat</dd></div>`).join('');
    /* Jeder Info-Dialog nennt den Betrag und seine Herkunft – als Tabelle, nicht als Fliesstext. */
    const chain = infoRows([
      ['Einkommen netto', `${money(incomeNet)} / Monat`, 'nach Steuern'],
      ['Bedarf netto', `${money(needNet)} / Monat`, 'deine Angabe'],
      ['Aus Vermögen', `${money(fromWealth)} / Monat`, 'Differenz']
    ]);
    const incomeInfo = modalInfo({title:'Einkommen netto / Monat', aria:'Einkommen netto erklären', body:`<p class="v4-info-amount">${money(incomeNet)} <small>/ Monat</small></p>${infoRows([['Einkommen brutto', `${money(grossMonthly)} / Monat`], ['Geschätzte Steuern', `− ${money(taxMonthly)} / Monat`], ['Einkommen netto', `<strong>${money(incomeNet)} / Monat</strong>`]])}<p class="v4-info-source">Herkunft: die Einnahmen (AHV, PK-Rente, weitere Einnahmen) aus deinen Angaben bzw. der AHV-Pauschale, die Steuern aus dem kantonalen Modell${hasCanton() ? ` (${esc(State.canton(state))})` : ''}.</p><details class="v3-info v4-info-detail"><summary><span class="v3-info-label">Einnahmen einzeln</span><span class="v3-info-glyph" aria-hidden="true">${Icons.icon('chevronRight', {size:18})}</span></summary><div class="v3-info-panel"><dl class="v3-info-list">${rows}</dl></div></details><p>Was dir nach den geschätzten laufenden Steuern monatlich zur Verfügung steht.</p>`});
    const needInfo = modalInfo({title:'Bedarf netto / Monat', aria:'Nettobedarf erklären', body:`<p class="v4-info-amount">${money(needNet)} <small>/ Monat</small></p>${chain}<p class="v4-info-source">Herkunft: dein monatlicher Bedarf nach Steuern aus dem Schnellstart bzw. aus dem Bedarf-Editor.</p><p>${money(needNet)} Bedarf netto − ${money(incomeNet)} Einkommen netto = <strong>${money(fromWealth)}</strong> aus Vermögen.</p>`});
    const wealthInfo = modalInfo({title:'Aus Vermögen / Monat', aria:'Entnahme aus Vermögen erklären', body:`<p class="v4-info-amount">${money(fromWealth)} <small>/ Monat</small></p>${chain}<p class="v4-info-source">Herkunft: die Differenz aus deinem Bedarf netto und deinem Einkommen netto im ersten Planjahr.</p><p>${money(needNet)} Bedarf netto − ${money(incomeNet)} Einkommen netto = <strong>${money(fromWealth)} / Monat</strong>.</p><p>${surplus ? 'Dein Einkommen deckt den Bedarf vollständig – es bleibt sogar ein Überschuss, der dein Vermögen stützt.' : 'Solange Kapital vorhanden ist, deckt dein Vermögen diese Differenz. Wie lange es reicht, steht im Planstatus oben.'}</p>`});
    const startInfo = modalInfo({title:'Startkapital', aria:'Startkapital erklären', body:startCapitalBody(item)});
    const tile = (icon, label, value, {info = '', warn = false, note = ''} = {}) => `<div class="v4-tile${warn ? ' warn' : ''}"><span>${Icons.icon(icon, {size:16})} ${label} ${info}</span><strong>${money(value)}</strong>${note ? `<small>${note}</small>` : ''}</div>`;
    return `<div class="v4-tiles">${tile('wallet', 'Einkommen netto / Monat', incomeNet, {info:incomeInfo, note:'nach geschätzten Steuern'})}${tile('shoppingCart', 'Bedarf netto / Monat', needNet, {info:needInfo})}${tile('coins', 'Aus Vermögen / Monat', fromWealth, {info:wealthInfo, warn:fromWealth > 0.5})}${tile('pigMoney', 'Startkapital', result.availableCapital, {info:startInfo})}</div>`;
  }
  function startCapitalBody(item) {
    const capital = Calculator.calculateAvailableCapital(item.plan, item.share ?? chosenShare());
    const further = FurtherCapital(item);
    return `<p class="v4-info-amount">${money(numeric(item.result.availableCapital))}</p><dl class="v3-info-list"><div><dt>PK-Kapital netto <small>nach Steuern und Sozialabgaben</small></dt><dd>${money(capital.netPkCapitalWithdrawal)}</dd></div><div><dt>Weiteres Kapital <small>Bank, Wertschriften, 3a, übrige Positionen</small></dt><dd>${money(further.total)}</dd></div>${further.rows.map(([label, value]) => `<div><dt><small>${esc(label)}</small></dt><dd><small>${money(value)}</small></dd></div>`).join('')}<div><dt><strong>Startkapital</strong></dt><dd><strong>${money(numeric(item.result.availableCapital))}</strong></dd></div></dl><p class="v4-info-source">Herkunft: PK-Ausweis, Vermögensangaben und Säule 3a aus deinen Eingaben – gerechnet mit dem gemeinsamen Rechenkern.</p><p>Dieses Kapital steht dir zum Start der Pensionierung zur Verfügung und finanziert die monatliche Differenz aus «Aus Vermögen».</p>`;
  }
  /* «Weiteres Kapital» aus dem Datenmodell (identische Quelle wie der Rechenkern). */
  function FurtherCapital(item) {
    const capital = Calculator.calculateAvailableCapital(item.plan, item.share ?? chosenShare());
    const projected = Calculator.calculateRetirementStart(item.plan);
    const a = state.details.assets ?? null, pre = state.mode === 'pre';
    const free = a ? (a.unallocated !== undefined ? numeric(a.unallocated) : 0) : (state.values.free !== undefined ? numeric(state.values.free) : null);
    const securities = entered(a?.securities) ? (pre && projected ? projected.sec : numeric(a.securities)) : null;
    const rows = [
      ['Säule 3a (netto)', pre && state.details.pension3a ? capital.p3.netAtStart : null],
      ['Freies Vermögen', free],
      ['Wertschriften', securities],
      ['Bank / liquide Mittel', entered(a?.cash) ? numeric(a.cash) : null],
      ['Weitere Kapitalpositionen', entered(a?.otherAssets) ? numeric(a.otherAssets) : null]
    ].filter(([, value]) => value !== null && value > 0.5);
    return {rows, total:rows.reduce((sum, [, value]) => sum + value, 0)};
  }

  /* ---------------- Stellhebel: PK-Bezug ---------------- */
  function lever(item) {
    if (state.mode !== 'pre') return '';
    const share = previewShare ?? chosenShare();
    const preview = share !== chosenShare();
    return `<section class="v4-lever"><div class="v4-lever-head"><h2>PK-Bezug wählen ${modalInfo({title:'PK-Bezug', aria:'PK-Bezug erklären', body:'<p>Der Kapitalanteil bestimmt, wie viel deines PK-Guthabens du bei Pensionierung als Kapital beziehst. Der Rest wird zur Rente.</p><p>Wenn du den PK-Bezug änderst, verändern sich deine PK-Rente, dein verfügbares Startkapital und dein Vermögensverlauf.</p>'})}</h2><span class="v4-lever-value">${share} % Kapitalbezug</span></div><input id="shareRange" type="range" min="0" max="100" step="1" value="${share}" aria-label="Kapitalbezug in Prozent"><div class="v4-lever-labels"><span>0 % Kapital</span><span>100 % Kapital</span></div><div class="v4-lever-state"><span id="previewStatus" class="v4-detail-state">${preview ? 'Vorschau – noch nicht gespeichert' : 'Aktueller Plan'}</span>${preview ? '<button type="button" class="primary" data-remember>Als aktuellen Plan speichern</button>' : ''}</div><p id="v4Error" class="v3-error" role="alert"></p></section>`;
  }

  /* ---------------- GENAUIGKEIT / NÄCHSTER SCHRITT (genau EINE Card) ----------------
     Datenqualität und Optimierung sind zwei verschiedene Konzepte und erscheinen
     deshalb nie gleichzeitig in derselben Card:
       – offene/geschätzte Angaben  → «Plan präzisieren»
       – Daten vollständig          → «Plan optimieren»
     Beide öffnen denselben fokussierten Screen, der seinen Zustand selbst kennt
     (siehe `renderImprove`). Kein «Plan genauer machen», kein zweiter Einstieg. */
  function improveState() {
    const {open} = precisionItems();
    return {key: open.length ? 'precise' : 'optimize', count: open.length};
  }
  function improveEntry() {
    const {key, count} = improveState();
    const icon = key === 'precise' ? 'listDetails' : 'target';
    const copy = key === 'precise'
      ? `<strong>Plan präzisieren</strong><small>Dein erster Plan basiert teilweise auf Schätzungen.</small><small>${count === 1 ? 'Eine Angabe macht deinen Plan genauer.' : `${count} Angaben machen deinen Plan genauer.`}</small>`
      : '<strong>Plan optimieren</strong><small>Teste Strategie, Bedarf und weitere Möglichkeiten.</small>';
    return `<button type="button" class="v4-next" data-v4-next="improve"><span class="v4-next-icon" aria-hidden="true">${Icons.icon(icon, {size:20})}</span><span>${copy}</span>${Icons.icon('chevronRight', {size:18})}</button>`;
  }

  /* ---------------- SEKUNDÄRE AKTIONEN (maximal zwei kompakte Zeilen) ----------------
     «Mein Plan» ist kein Inhaltsverzeichnis: der Jahresverlauf und die Varianten stehen
     hier nur als kompakte Einstiege, ihre Inhalte leben auf eigenen Screens. */
  function secondaryRows() {
    const count = variantShares().length;
    const row = (label, page) => `<li><button type="button" class="v4-row" data-v4-next="${page}"><span>${label}</span>${Icons.icon('chevronRight', {size:18})}</button></li>`;
    return `<ul class="v4-rows">${row('Jahresverlauf', 'years')}${row(`Meine Varianten · ${count} gespeichert`, 'variants')}</ul>`;
  }
  function dataKnown() {
    const pre = state.mode === 'pre', a = state.details.assets ?? null;
    const p3 = state.details.pension3a ?? null;
    const assets = state.values.free !== undefined || (!!a && ['cash','securities','otherAssets'].some(key => entered(a[key]))) || (!!p3 && (entered(p3.p3) || entered(p3.p3Contrib)));
    const income = state.details.income ?? {};
    const pension = pre ? state.details.pension?.pk !== undefined : (entered(income.ahv) || entered(income.other) || entered(state.details.pension?.pkRent));
    return {pre, assets, pension, ready:assets && pension};
  }

  /* ---------------- Verbesserungen mit Wirkung ---------------- */
  function planWithNeed(plan, monthlyDelta) {
    const next = JSON.parse(JSON.stringify(plan)), delta = monthlyDelta * 12;
    if (next.spending) next.spending.annualNeed = Math.max(0, numeric(next.spending.annualNeed) + delta);
    if (Array.isArray(next.spending?.phases)) next.spending.phases = next.spending.phases.map(phase => ({...phase, need:Math.max(0, numeric(phase.need) + delta)}));
    return next;
  }
  const profileLabels = {cautious:'Vorsichtig', balanced:'Ausgewogen', growth:'Chancenorientiert'};
  /* Vergleich der Anlagestrategien: reale Rendite, Betrag am Planungshorizont und Reichweite –
     ausschliesslich über den gemeinsamen Rechenkern. */
/* Ersetzt: profileComparison + hebelStrategy (interaktive Preview-Szenarien) */
  function profileComparison(item) {
    const profiles = globalThis.RiskProfiles;
    if (!profiles?.profiles) return null;
    const plan = item.plan, target = plan.retirement.targetAge, currentKey = plan.riskProfile;
    const rows = Object.keys(profiles.profiles).map(key => {
      const result = Calculator.evaluatePlan(Calculator.withReturnProfile(plan, key));
      const profile = profiles.getRiskProfile(key);
      return {
        key,
        label: profileLabels[key] ?? profile?.label ?? key,
        rate: (numeric(profile?.expectedRealReturn) * 100).toLocaleString('de-DE', {maximumFractionDigits:1}),
        rest: Math.max(0, horizonValue({plan, result}).value),
        age: result.capitalExhaustionAge ?? null,
        current: key === currentKey
      };
    });
    const max = Math.max(...rows.map(row => row.rest), 0) || 1;
    // Restvermögen ist nur vergleichbar, wenn alle Szenarien den Planungshorizont erreichen.
    const allReach = rows.every(row => !row.age);
    /* Zwei Schreibweisen, nie vermischt: die Reichweite («reicht bis Alter X») oder – wenn
       alle Szenarien den Horizont erreichen – das Restvermögen am Planungshorizont. */
    const withOutcome = rows.map(row => ({...row, share: row.rest / max,
      shown: allReach ? money(row.rest) : row.age ? `bis Alter ${row.age}` : `bis Alter ${target}+`,
      outcome: allReach ? `Restvermögen ${money(row.rest)}` : `reicht bis Alter ${row.age ?? `${target}+`}`}));
    return {rows: withOutcome, target, currentKey, allReach};
  }

  /* Wert am Planungshorizont: das Ende des **letzten Planjahres** in heutiger Kaufkraft. Die Engine
     führt danach noch eine nominale Schlusszeile (Zielalter + 1); sie ist kein Planjahr und wird in
     «Jahr für Jahr» nicht angezeigt. Strategie, Varianten und Jahresansicht nutzen diesen
     Wert, damit alle Screens dieselbe Zahl zeigen. */
  function horizonValue(item) {
    const rows = (item?.result?.yearlyProjection ?? []).filter(row => !row.terminal);
    const last = rows.at(-1);
    if (!last) return {value:numeric(item?.result?.capitalAtTargetAge), age:item?.plan?.retirement?.targetAge ?? null, row:null};
    // Jahresende des letzten Planjahres in heutiger Kaufkraft – V4 zeigt die reale Sicht
    // (die Engine liefert sie direkt; die nominale Schlusszeile wird nicht verwendet).
    return {value:numeric(last.end), age:item?.plan?.retirement?.targetAge ?? last.age + 1, row:last};
  }
  /* Wirkung eines veränderten Nettobedarfs auf die Reichweite (positiv = höherer Bedarf). */
  function needImpact(item, delta = 0) {
    const plan = item.plan, target = plan.retirement.targetAge;
    const monthly = Math.max(0, Math.round(numeric(item.result.monthlyNeed)) + delta);
    const result = delta !== 0 ? Calculator.evaluatePlan(planWithNeed(plan, delta)) : item.result;
    return {monthly, text:`Bei ${money(monthly)} / Monat reicht dein Vermögen voraussichtlich bis ${reachAge(result, target)}.`};
  }
  /* Was tatsächlich erfasst ist – Betrag und Kurzbeschreibung je Angabe. Dieselbe Quelle für
     «Angaben & Grundlagen» und «Plan präzisieren»: der Zustand allein («erfasst») hilft
     niemandem, der prüfen will, ob die Zahl stimmt. Alles kommt aus dem bestehenden Zustand,
     nichts wird zusätzlich gerechnet. */
  function captured() {
    const pension = state.details.pension ?? {}, p3 = state.details.pension3a ?? {}, income = state.details.income ?? {};
    const a = state.details.assets ?? null;
    const value = source => entered(source) ? numeric(source) : null;
    /* Frei verfügbares Vermögen: identisch zu `toPlan` (Noch nicht Aufgeteiltes + Bank +
       Wertschriften + weitere Positionen). Immobilien sind gebunden und werden separat genannt. */
    const unallocated = a ? (a.unallocated !== undefined ? numeric(a.unallocated) : 0)
      : (state.values.free !== undefined ? numeric(state.values.free) : 0);
    const free = unallocated + ['cash','securities','otherAssets'].reduce((sum, key) => sum + (entered(a?.[key]) ? numeric(a[key]) : 0), 0);
    const property = entered(a?.propertyValue) ? Math.max(0, numeric(a.propertyValue) - numeric(a?.mortgage)) : 0;
    const extra = (entered(income.other) ? numeric(income.other) : 0) + (entered(income.additional) ? numeric(income.additional) : 0);
    return {
      pk: value(pension.pk), pkContrib: value(pension.pkContrib),
      p3: value(p3.p3), p3Contrib: value(p3.p3Contrib),
      extra, extraDone: entered(income.other) || entered(income.additional),
      free, property,
      need: state.values.need !== undefined ? numeric(state.values.need) : null
    };
  }
  const yearMoney = value => value ? `Beitrag ${money(value)} / Jahr` : '';
  /* Offene bzw. geschätzte Angaben mit Zustand – Grundlage für Hebel 1 (Zustand A). */
  function precisionItems() {
    const pre = state.mode === 'pre', known = dataKnown(), ahv = Estimates ? Estimates.ahvOf(state) : {origin:'user'}, amounts = captured();
    const income = state.details.income ?? {};
    const ahvDone = ahv.origin === 'user';
    const monthly = ahvDone ? numeric(income.ahv) : (Estimates ? Estimates.ahv.monthly : 0);
    const pkDone = amounts.pkContrib !== null && amounts.pkContrib > 0;
    const items = [
      {page:'ahv', icon:'buildingBank', label:'AHV-Rente', sub: ahvDone ? 'Aus deiner Eingabe' : 'Durchschnittswert', value:`${money(monthly)} / Monat`, badge: ahvDone ? 'erfasst' : 'geschätzt', tone: ahvDone ? 'done' : 'estimated', done: ahvDone},
      {page:'assets', icon:'pigMoney', label:'Weiteres Kapital & Säule 3a', sub: amounts.free > 0 ? 'Bank & Wertschriften' : (known.assets ? 'Erfasst' : 'Noch ergänzen'), value: amounts.free > 0 ? money(amounts.free) : (amounts.p3 !== null ? money(amounts.p3) : ''), badge: known.assets ? 'erfasst' : 'offen', tone: known.assets ? 'done' : 'open', done: known.assets},
      amounts.extraDone ? null : {page:'extra', icon:'coins', label:'Weitere Einnahmen', sub:'Noch ergänzen', value:'', badge:'offen', tone:'open', done:false},
      pre ? {page:'pension', icon:'buildingBank', label:'PK-Ausweis', sub: pkDone ? yearMoney(amounts.pkContrib) : (amounts.pk !== null ? 'Beiträge fehlen' : 'Noch ergänzen'), value: amounts.pk !== null ? money(amounts.pk) : '', badge: pkDone ? 'erfasst' : 'offen', tone: pkDone ? 'done' : 'open', done: pkDone} : null
    ].filter(Boolean);
    return {items, open: items.filter(entry => !entry.done)};
  }

  /* ---------------- Schnellstart ---------------- */
  const startQuestions = {
    age: {label:'Wie alt bist du?', unit:'Jahre', icon:'calendarStats', short:'z. B. 60'},
    retirement: {label:'Wann möchtest du in Pension?', unit:'mit Alter', icon:'arrowsExchange', short:'z. B. 65'},
    pk: {label:'Wie hoch ist dein PK-Guthaben?', unit:'CHF', icon:'buildingBank', short:'heute'},
    rents: {label:'Wie hoch sind deine Renten?', unit:'CHF / Monat', icon:'buildingBank', short:'AHV + PK + weitere'},
    free: {label:'Kapital zur freien Verfügung', unit:'CHF', icon:'wallet', short:'Bank, Wertschriften, Festgeld …', info:{title:'Wie viel Kapital steht dir aktuell zur freien Verfügung?', body:'<p>Gemeint ist Kapital, das dir <strong>heute</strong> zur freien Verfügung steht – auch wenn es investiert oder zeitweise gebunden ist: Bankguthaben, Festgeld, Wertschriften- und ETF-Depots sowie bereits bezogene Vorsorgegelder.</p><p>Nicht dazu zählen: selbstbewohntes Wohneigentum oder anderes Vermögen, das du nicht für die Finanzierung deines Ruhestands einsetzen möchtest.</p>'}},
    need: {label:'Wie viel brauchst du pro Monat?', unit:'CHF / Monat', icon:'shoppingCart', short:'nach Steuern'}
  };
  function startFields() {
    const pick = (group, keys) => State.fields(group, state).filter(field => keys.includes(field.key)).map(field => ({...field, group}));
    return state.mode === 'pre'
      ? [...pick('time', ['age','retirement']), ...pick('pension', ['pk']), ...pick('need', ['need'])]
      : [...pick('time', ['age']), {key:'rents', group:'rents', unit:'CHF'}, ...pick('free', ['free']), ...pick('need', ['need'])];
  }
  function setStartDraft() {
    draft = {};
    startFields().forEach(field => {
      if (field.key === 'rents') { const income = state.details.income; draft.rents = income ? (numeric(income.ahv) + numeric(income.other)) || '' : ''; return; }
      const fromDetails = state.details[field.group]?.[field.key];
      draft[field.key] = fromDetails ?? state.values[field.key] ?? '';
    });
    draft.canton = State.canton(state) ?? '';
  }
  /* Wohnkanton direkt im Schnellstart und verbindlich: ein Klick, und die Steuern sind mit
     dem echten Kantonsmodell geklärt (die Schätzung über ein mittleres Modell entfällt). */
  function cantonField() {
    const options = Object.entries(TaxModel.config.cantons).map(([code, canton]) => `<option value="${code}" ${draft.canton === code ? 'selected' : ''}>${code} · ${esc(canton.name)}</option>`).join('');
    const info = modalInfo({title:'Wohnkanton', aria:'Wohnkanton erklären', body:'<p>Bestimmt die Schätzung deiner laufenden Steuern und der Kapitalbezugssteuer.</p>'});
    return `<section class="v4-start-card"><div class="v4-start-head"><span class="v4-detail-icon" aria-hidden="true">${Icons.icon('receiptTax', {size:16})}</span><label for="start-canton">Wohnkanton <span class="v3-required" aria-hidden="true">*</span></label>${info}</div><select id="start-canton" name="canton" aria-required="true" data-canton-compact="1" data-canton-hint="für deine Steuerschätzung"><option value="" ${entered(draft.canton) ? '' : 'selected'}>Bitte wählen</option>${options}</select></section>`;
  }
  /* Titelzeile: ausschliesslich über die zentrale Komponente `PageTitle` (js/v4-pagetitle.js). */
  const startContext = '5 Angaben für deinen ersten Überblick.';
  /* Kontextabhängiger Rückweg: «Zurück» ist reine Navigation und führt zur übergeordneten
     Seite, von der aus der Screen geöffnet wurde. «Übernehmen» dagegen speichert, rechnet neu
     und führt immer auf «Mein Plan» (Apply-and-return-Regel, siehe
     docs/information-architecture-v4.md §8). */
  let detailParent = 'plan';
  const parentLabel = parent => parent === 'basics' ? 'Angaben & Grundlagen' : parent === 'improve' ? 'Plan präzisieren' : 'Mein Plan';
  function goBack() {
    if (detailParent === 'basics') renderBasics();
    else if (detailParent === 'improve') renderImprove();
    else returnToPlan();
  }
  /* `{detail:true}` ergänzt unter der Titelzeile den Rückweg mit dem Namen der übergeordneten
     Seite – beide über denselben Delegationspfad (`data-v4-back`). */
  function title(title, context = '', options = {}) {
    const component = globalThis.PageTitle;
    const opts = options.detail ? {...options, backLabel: parentLabel(detailParent)} : options;
    return component ? component.render(title, context, opts) : `<header class="v4-head"><h1 class="v4-page-title">${title}</h1>${context ? `<p class="v4-page-context">${context}</p>` : ''}</header>`;
  }
  const detailHead = {detail:true};
  // Kontextzeile für alle Screens, die zum Plan gehören (immer gleicher Aufbau).
  function planContext(item) {
    const plan = item?.plan ?? planFor(chosenShare());
    if (!plan) return '';
    const age = plan.retirement?.age, target = plan.retirement?.targetAge;
    return `${state.mode === 'pre' && age ? `Pensionierung mit ${age}` : 'Planungsstart heute'}${target ? ` · Planung bis ${target}` : ''}`;
  }
  // Variantenkontext für «Meine Varianten».
  function variantContext() {
    const count = variantShares().length;
    return count === 1 ? '1 gespeicherte Variante' : `${count} gespeicherte Varianten`;
  }
  function assumptionsBody() {
    const ahv = Estimates ? Estimates.ahvOf(state) : null, uws = Estimates ? Estimates.uwsOf(state) : null, pre = state.mode === 'pre';
    const rows = [
      ahv ? `<li><strong>AHV-Rente ${money(ahv.monthly)} pro Monat</strong> – Pauschale, bis du deine eigene AHV-Rente erfasst.</li>` : '',
      pre && uws ? `<li><strong>PK-Umwandlungssatz ${percent(uws.percent)} %</strong> – Standardannahme für die Umwandlung des PK-Guthabens in eine Rente.</li>` : '',
      !pre ? '<li><strong>Deine Renten</strong> – für den ersten Check teilen wir sie in die geschätzte AHV und weitere Renten auf; die genaue Aufteilung kannst du danach erfassen.</li>' : '',
      '<li><strong>Renditen und Inflation</strong> – aus deinem Risikoprofil (ausgewogen); unter «Annahmen» änderbar.</li>',
      hasCanton() ? `<li><strong>Steuern</strong> – mit dem kantonalen Modell deines Wohnkantons (${esc(State.canton(state))}) berechnet.</li>` : '<li><strong>Steuern</strong> – geschätzt mit einem mittleren Kantonsmodell, bis du deinen Wohnkanton erfasst.</li>'
    ].filter(Boolean).join('');
    return `<p>Für deinen ersten Check rechnen wir mit sinnvollen Annahmen:</p><ul>${rows}</ul><p>Alles davon kannst du danach Schritt für Schritt durch deine eigenen Angaben ersetzen.</p>`;
  }
  function renderStart() {
    state = normalizeP3(state);
    route = 'plan'; detailParent = 'plan'; markDirty();
    // Im Schnellstart gibt es noch keinen Plan und damit nichts zu navigieren: kein Menü.
    setMenuAvailable(false);
    app.innerHTML = `${title('Mein Plan.', startContext)}<div class="v4-segments" role="group" aria-label="Deine Situation"><button type="button" class="v4-segment" data-situation="pre" aria-pressed="${state.mode === 'pre'}">${Icons.icon('user', {size:18})}<span>Vor Pensionierung</span></button><button type="button" class="v4-segment" data-situation="post" aria-pressed="${state.mode === 'post'}">${Icons.icon('users', {size:18})}<span>Bereits pensioniert</span></button></div><form id="v4Form" novalidate><div class="v4-start">${cantonField()}${startFields().map(field => {
      const meta = startQuestions[field.key] ?? {label:field.label, unit:field.unit, icon:'listDetails'};
      const amount = isAmountField(field);
      // Einheit steht im Eingabefeld; lange Hinweise stehen hinter dem ⓘ (Platz für Mobile).
      // Kompaktheitsregel: genau zwei Zeilen je Karte (Label + Feld), Erklärung im Feld.
      const info = meta.info ? modalInfo({title:meta.info.title, body:meta.info.body, aria:meta.info.title + ' erklären'}) : '';
      return `<section class="v4-start-card"><div class="v4-start-head"><span class="v4-detail-icon" aria-hidden="true">${Icons.icon(meta.icon, {size:16})}</span><label for="start-${field.key}">${meta.label}</label>${info}</div><div class="v4-entry"><input id="start-${field.key}" name="${field.key}" type="text" inputmode="${amount ? 'decimal' : 'numeric'}" autocomplete="off" placeholder="${esc(meta.short ?? '')}"${amount ? ' data-amount' : ''} value="${esc(formatAmount(draft[field.key] ?? ''))}"><span class="v4-entry-unit">${meta.unit}</span></div></section>`;
    }).join('')}</div><p class="v4-assumptions">Wir rechnen mit sinnvollen Annahmen, bis du sie ersetzt. ${modalInfo({title:'Annahmen für den ersten Check', body:assumptionsBody(), aria:'Verwendete Annahmen anzeigen'})}</p><p id="v4Error" class="v3-error" role="alert"></p><button class="primary v4-cta" type="submit">Meinen ersten Plan anzeigen <span aria-hidden="true">→</span></button></form>`;
    window.CantonPicker?.enhanceAll(app);
    app.querySelectorAll('[data-situation]').forEach(button => button.addEventListener('click', () => {
      assignForm(); state = V3State.changeMode(state, button.dataset.situation); renderStart();
    }));
    document.getElementById('v4Form').addEventListener('input', assignForm);
    document.getElementById('v4Form').addEventListener('submit', submitStart);
  }
  function assignForm() {
    app.querySelectorAll('input,select').forEach(input => {
      if (!input.name) return;
      // Beträge und Prozentwerte werden schweizerisch angezeigt (1'000 / 4,5) und numerisch
      // gelesen: Beträge als Zahl-String ohne Trennzeichen, Prozente als echte Zahl.
      draft[input.name] = input.hasAttribute('data-amount') ? amountValue(input.value)
        : input.hasAttribute('data-percent') ? (input.value.trim() === '' ? '' : Number(input.value.replace(',', '.')))
        : input.value;
    });
  }
  function submitStart(event) {
    event.preventDefault(); assignForm();
    try {
      // Wohnkanton ist verbindlich (dokumentierte Regel: ohne Kanton keine Steuerschätzung).
      if (!entered(draft.canton)) { message('Bitte wähle deinen Wohnsitzkanton.'); return; }
      if (state.mode === 'pre') {
        const pension = state.details.pension ?? {};
        apply('time', {age:draft.age, retirement:draft.retirement});
        // Default nach dem Schnellstart: 50 % Kapitalbezug (die Varianten bleiben 0 / 50 / 100).
        apply('pension', {...pension, pk:draft.pk, pkContrib:pension.pkContrib ?? 0, pkShare:pension.pkShare ?? 50});
      } else {
        const total = numeric(draft.rents), ahvMonthly = Estimates ? Estimates.ahvOf(state).monthly : 0;
        apply('time', {age:draft.age});
        apply('income', {canton:draft.canton ?? '', ahv:Math.min(total, ahvMonthly), other:Math.max(0, total - ahvMonthly), additional:0});
        apply('free', {free:draft.free});
      }
      // Kanton ist verbindlich erfasst: die Steuern rechnen mit seinem Modell.
      apply('tax', {canton:draft.canton});
      apply('need', {need:draft.need});
      renderPlan();
    } catch (error) { message(error.message); }
  }

  /* ---------------- Mein Plan (Executive Summary) ----------------
     Zielstruktur, mehr steht hier nicht:
       PageTitle · Planstatus · 4 Kennzahlen · PK-Bezug · zustandsabhängige Aktion ·
       zwei sekundäre Zeilen (Jahresverlauf, Meine Varianten).
     Alles Weitere liegt auf fokussierten Screens oder im Menü. */
  function planScreen(item) {
    return `${title('Mein Plan.', planContext(item))}${verdictCard(item)}${summaryTiles(item)}${lever(item)}${improveEntry()}${secondaryRows()}`;
  }
  function renderPlan(restore = false) {
    state = normalizeP3(state);
    if (!State.timing(state) || state.values.need === undefined) { setStartDraft(); renderStart(); return; }
    closeMenu(); route = 'plan'; detailParent = 'plan'; markDirty(); setMenuAvailable(true);
    if (!restore) window.scrollTo(0, 0);
    const item = evaluated(previewShare ?? chosenShare()) ?? evaluated(chosenShare());
    if (!item) { setStartDraft(); renderStart(); return; }
    app.innerHTML = planScreen(item);
    bindPlan();
    if (restore) window.scrollTo(0, 0);
  }
  function bindPlan() {
    const range = document.getElementById('shareRange');
    range?.addEventListener('input', event => {
      const value = numeric(event.target.value);
      previewShare = value === chosenShare() ? null : value;
      const item = evaluated(value);
      // Status, Kennzahlen und Stellhebel sofort aktualisieren – gespeicherte Varianten bleiben unberührt.
      app.innerHTML = planScreen(item);
      bindPlan();
    });
    app.querySelector('[data-remember]')?.addEventListener('click', () => {
      try {
        // Der aktuelle Plan ist veränderbar: die Vorschau wird in seinen Platz geschrieben.
        const slot = Math.max(0, variantShares().indexOf(chosenShare()));
        state = V3State.remember(state, previewShare ?? chosenShare(), slot);
        previewShare = null; markDirty(); renderPlan(true);
      }
      catch (error) { message(error.message); }
    });
  }

  /* ---------------- Meine Varianten ---------------- */
  function renderVariants() {
    closeMenu(); route = 'variants'; detailParent = 'plan'; markDirty(); setMenuAvailable(true);
    window.scrollTo(0, 0);
    const target = (evaluated(chosenShare()) ?? {}).plan?.retirement.targetAge ?? '';
    const cards = variantShares().map((share, index) => {
      const item = evaluated(share);
      if (!item) return '';
      const result = item.result;
      const capital = Calculator.calculateAvailableCapital(item.plan, share);
      const sources = Calculator.incomeSourcesAtStart(item.plan);
      const monthly = id => (sources.find(source => source.id === id)?.annualIncome ?? 0) / 12;
      const rents = monthly('ahv') + monthly('pk') + monthly('other');
      const current = share === chosenShare();
      const outcome = outcomeOf(item);
      const reach = result.capitalExhaustionAge ? `Reicht voraussichtlich bis Alter ${result.capitalExhaustionAge}` : 'Plan geht voraussichtlich auf';
      const line = (label, value) => `<div><dt>${label}</dt><dd>${value}</dd></div>`;
      return `<section class="v4-variant${current ? ' current' : ''}"><div class="v4-variant-head"><strong>${share} % Kapitalbezug</strong>${current ? `<span class="v4-badge">${Icons.icon('circleCheck', {size:15})} Aktueller Plan</span>` : ''}</div><p class="v4-variant-status ${outcome.tone}">${reach}</p><dl>${line('Total-Rente / Monat', money(rents))}${line('Startkapital', money(result.availableCapital))}${result.capitalExhaustionAge ? line('Reicht bis', `Alter ${result.capitalExhaustionAge}`) : line(`Restvermögen mit ${target}`, money(horizonValue(item).value))}${line('PK-Rente / Monat', money(item.pension.rent / 12))}${line('PK-Kapital netto', money(capital.netPkCapitalWithdrawal))}${line('Entnahme / Monat', money(result.monthlyGap))}</dl>${current ? '' : `<div class="v4-variant-actions"><button type="button" data-adopt-variant="${share}">Übernehmen</button></div>`}</section>`;
    }).join('');
    app.innerHTML = `${title('Meine Varianten.', variantContext(), detailHead)}<p class="v4-lead">Eine Variante ist immer dein aktueller Plan. Auswahl ausschliesslich über «Übernehmen» – ohne zusätzliche Auswahlknöpfe.</p>${cards}`;
    app.querySelectorAll('[data-adopt-variant]').forEach(button => button.addEventListener('click', () => {
      try { state = V3State.activate(state, numeric(button.dataset.adoptVariant)); previewShare = null; markDirty(); renderVariants(); }
      catch (error) { message(error.message); }
    }));
  }

  /* ---------------- Plan präzisieren / Plan optimieren (zwei Zustände) ----------------
     1 Angaben präzisieren · 2 Anlagestrategie · 3 Bedarf netto.
     Alle Wirkungen kommen aus dem gemeinsamen Rechenkern; gespeichert wird nur
     über die jeweilige Detailseite. */
  function hebelHead(number, title, text, info = '') {
    return `<div class="v4-hebel-head"><span class="v4-hebel-num" aria-hidden="true">${number}</span><div class="v4-hebel-intro"><h2>${title}${info}</h2><p>${text}</p></div></div>`;
  }
  const badgeTone = tone => tone === 'done' ? 'done' : tone === 'estimated' ? 'estimated' : 'open';
  /* Eine Zeile für Angaben: Icon, Label, Zustands-Badge, Zustandstext, Wert, Zielseite.
     Sie wird von «Plan präzisieren» (Hebel 1) UND vom Screen «Angaben & Grundlagen»
     verwendet – eine Implementierung, zwei legitime Wege zum selben Editor. */
  const hebelRow = (entry, parent = 'plan') => `<li><button type="button" class="v4-hebel-row" data-v4-next="${entry.page}" data-v4-parent="${parent}"><span class="v4-detail-icon" aria-hidden="true">${Icons.icon(entry.icon, {size:18})}</span><span class="v4-hebel-copy"><span class="v4-hebel-line"><strong>${esc(entry.label)}</strong><span class="v4-badge-tone ${badgeTone(entry.tone)}">${esc(entry.badge)}</span></span><span class="v4-hebel-line"><small>${esc(entry.sub)}</small>${entry.value ? `<span class="v4-hebel-value">${esc(entry.value)}</span>` : ''}</span></span>${Icons.icon('chevronRight', {size:18})}</button></li>`;
  /* Hebel 1 «Angaben präzisieren»: erscheint nur, solange Angaben fehlen oder geschätzt sind.
     Die Datenpflege selbst liegt dauerhaft unter «Angaben & Grundlagen» im Menü. */
  function hebelPrecision(items, open) {
    const target = open[0]?.page ?? 'ahv';
    return `<section class="v4-hebel">${hebelHead(1, 'Angaben präzisieren', 'Je genauer deine Angaben, desto verlässlicher dein Plan.')}<ul class="v4-hebel-list">${items.map(entry => hebelRow(entry, 'improve')).join('')}</ul><button type="button" class="primary v4-block-action" data-v4-next="${target}" data-v4-parent="improve">Angaben ergänzen <span aria-hidden="true">→</span></button></section>`;
  }
  /* ---------------- Angaben & Grundlagen (Daten-Hub) ----------------
     Die Navigation folgt den Aufgaben, nicht dem Datenmodell: alle Editoren (AHV, PK, 3a,
     Einnahmen, Bedarf, Vermögen) liegen hinter EINEM Menüpunkt «Angaben & Grundlagen».
     Jede Zeile zeigt Zustand und Wert und öffnet denselben Editor wie bisher. */
  function basicsRows() {
    const known = dataKnown(), pre = state.mode === 'pre';
    const income = state.details.income ?? {};
    const amounts = captured();
    const ahv = Estimates ? Estimates.ahvOf(state) : {origin:'user', monthly:0};
    const ahvDone = ahv.origin === 'user';
    const ahvMonthly = ahvDone ? numeric(income.ahv) : (Estimates ? Estimates.ahv.monthly : 0);
    const p3Done = amounts.p3 !== null || amounts.p3Contrib !== null;
    const pkDone = amounts.pkContrib !== null && amounts.pkContrib > 0;
    const need = state.values.need, needDone = need !== undefined;
    const row = (page, icon, label, done, value = '', style = {}) => ({page, icon, label, value, sub: style.sub ?? (done ? 'Erfasst' : 'Noch ergänzen'), badge: style.badge ?? (done ? 'erfasst' : 'offen'), tone: style.tone ?? (done ? 'done' : 'open')});
    const timeline = [state.values.age, state.values.retirement].filter(entry => entry !== undefined && entry !== null);
    /* Zeile «Vermögen»: die Summe der erfassten Positionen, nicht nur «erfasst». Der Zusatz
       nennt, was darin steckt – inklusive gebundenem Immobilienvermögen (netto). */
    const assetsSub = amounts.free > 0
      ? `Bank & Wertschriften${amounts.property > 0 ? ` · Immobilien ${money(amounts.property)}` : ''}`
      : (amounts.p3 !== null ? 'Nur Säule 3a erfasst' : 'Noch ergänzen');
    const extraSub = amounts.extraDone ? (amounts.extra > 0 ? 'Weitere Einnahmen' : 'Keine weiteren Einnahmen') : 'Noch ergänzen';
    return [
      {title:'Zeitpunkt & Steuern', rows:[row('personal', 'calendarStats', 'Persönliche Angaben', true, timeline.join(' → '), {sub:'Alter & Pensionierung'})]},
      {title:'Einkommen & Vorsorge', rows:[
        row('ahv', 'buildingBank', 'AHV-Renten', ahvDone, `${money(ahvMonthly)} / Monat`, ahvDone ? {sub:'Aus deiner Eingabe'} : {sub:'Durchschnittswert', badge:'geschätzt', tone:'estimated'}),
        pre ? row('pension', 'buildingBank', 'Pensionskasse (PK)', pkDone, amounts.pk !== null ? money(amounts.pk) : '', {sub: yearMoney(amounts.pkContrib) || (amounts.pk !== null ? 'Beiträge fehlen' : 'Noch ergänzen')}) : null,
        pre ? row('pension3a', 'pigMoney', 'Säule 3a', p3Done, amounts.p3 !== null ? money(amounts.p3) : '', {sub: yearMoney(amounts.p3Contrib) || (amounts.p3 !== null ? 'Guthaben erfasst' : 'Noch ergänzen')}) : null,
        row('extra', 'coins', 'Weitere Einnahmen', amounts.extraDone, amounts.extraDone ? (amounts.extra > 0 ? `${money(amounts.extra)} / Monat` : 'Keine') : '', {sub: extraSub})
      ].filter(Boolean)},
      {title:'Bedarf & Vermögen', rows:[
        row('need', 'shoppingCart', 'Bedarf netto', needDone, needDone ? `${money(need)} / Monat` : '', {sub: needDone ? 'Nach Steuern' : 'Noch ergänzen'}),
        row('assets', 'pigMoney', 'Vermögen', known.assets, amounts.free > 0 ? money(amounts.free) : '', {sub: assetsSub})
      ]}
    ];
  }
  function renderBasics() {
    closeMenu(); route = 'basics'; detailParent = 'plan'; markDirty(); setMenuAvailable(true);
    window.scrollTo(0, 0);
    const groups = basicsRows().map(group => `<section class="v4-hebel v4-basics"><h2 class="v4-basics-title">${group.title}</h2><ul class="v4-hebel-list">${group.rows.map(entry => hebelRow(entry, 'basics')).join('')}</ul></section>`).join('');
    app.innerHTML = `${title('Angaben & Grundlagen.', 'Deine Angaben.', detailHead)}<p class="v4-lead">Alles, was in deinen Plan einfliesst – jede Zeile öffnet den passenden Editor.</p>${groups}`;
  }
  /* Hebel 2: die drei Strategien sind echte Vorschau-Szenarien. Ein Tap rechnet die
     vollständige Ruhestandsprojektion mit diesem Profil neu (gemeinsamer Rechenkern) und
     zeigt die Wirkung sofort im Screen – der aktuelle Plan bleibt dabei unverändert.
     Erst «Strategie übernehmen» speichert die Auswahl. Keine Navigation zu «Annahmen». */
  let strategyPreview = null;
  /* Hebel 2 zeigt im Ruhezustand nur die aktuelle Strategie. Die drei Vorschau-Szenarien
     erscheinen erst auf Tap («zum Ändern aufklappen») – der Zustand überlebt das Neuzeichnen
     der Vorschau, weil ein Strategie-Tap den Block offen hält. */
  let strategyOpen = false;
  let needPreview = {step:0, sign:-1};
  function strategyImpact(item, comparison, key) {
    const row = comparison.rows.find(entry => entry.key === key) ?? comparison.rows[0];
    if (!row) return '';
    const ages = comparison.rows.map(entry => entry.age ?? `+${comparison.target}`);
    if (!comparison.allReach && new Set(ages).size === 1) {
      // Ehrlich bleiben: wenn die Strategie die Reichweite nicht verändert, sagen wir das.
      return `Alle drei Strategien reichen in diesem Szenario nur ${reachAge(item.result, comparison.target)}. Die Anlagestrategie ändert daran nichts – prüfe Bedarf und Angaben.`;
    }
    const prefix = row.current ? 'Deine aktuelle Strategie' : `Mit «${row.label}»`;
    return row.age
      ? `${prefix}: Dein Vermögen reicht voraussichtlich bis Alter ${row.age}.`
      : `${prefix}: Dein Vermögen reicht bis zum Planungshorizont ${comparison.target} – Restvermögen ${money(row.rest)}.`;
  }
  function hebelStrategy(item, number = 1) {
    const comparison = profileComparison(item);
    if (!comparison) return '';
    const selected = strategyPreview && comparison.rows.some(row => row.key === strategyPreview) ? strategyPreview : comparison.currentKey;
    const info = modalInfo({title:'Anlagestrategie', aria:'Anlagestrategie erklären', body:`<p>Die Anlagestrategie ist die einzige Quelle für die erwartete Rendite im Ruhestand. Sie bestimmt, wie dein Vermögen zwischen Sicherheit und Wachstum aufgeteilt wird.</p><p><strong>Vorsichtig ${comparison.rows[0]?.rate ?? ''} %, Ausgewogen ${comparison.rows[1]?.rate ?? ''} %, Chancenorientiert ${comparison.rows[2]?.rate ?? ''} %</strong> – Modellrenditen des Szenarios, nicht Renditen einzelner Anlagen. Höhere Chancen bedeuten grössere Schwankungen.</p>`});
    /* Jedes Szenario nennt Profil und Annahme UND die gerechnete Wirkung – keine Auswahl
       ohne sichtbare Reaktion. Der Balken erscheint nur bei vergleichbarem Horizont. */
    const rows = comparison.rows.map(row => `<li><button type="button" class="v4-strategy${row.current ? ' current' : ''}${row.key === selected ? ' selected' : ''}" role="radio" aria-checked="${row.key === selected}" data-strategy="${row.key}"><span class="v4-strategy-mark" aria-hidden="true"></span><span class="v4-strategy-copy"><strong>${esc(row.label)} · ${row.rate} % pro Jahr</strong><small class="v4-strategy-outcome">${esc(row.outcome)}</small></span>${comparison.allReach ? `<span class="v4-strategy-bar" aria-hidden="true"><span style="width:${Math.max(4, Math.round(row.share * 100))}%"></span></span>` : ''}</button></li>`).join('');
    const adopt = selected === comparison.currentKey
      ? '<button type="button" class="primary v4-block-action" disabled>Strategie ist aktuell</button>'
      : '<button type="button" class="primary v4-block-action" id="strategyAdopt">Strategie übernehmen <span aria-hidden="true">→</span></button>';
    /* Ruhezustand: die aktuell verwendete Strategie mit Annahme und Wirkung – beides
       dynamisch aus dem aktiven Profil (`risk-profiles.js`) bzw. dem Rechenkern. */
    const current = comparison.rows.find(row => row.key === comparison.currentKey) ?? comparison.rows[0];
    const summary = `${current.label} · Annahme ${current.rate} % pro Jahr · ${current.outcome} – zum Ändern aufklappen.`;
    const panel = `<div class="v4-hebel-panel"><p class="v4-strategy-head">${comparison.allReach ? 'Restvermögen am Planungshorizont' : 'Wirkung je Strategie'}</p><ul class="v4-strategy-list" role="radiogroup" aria-label="Anlagestrategie">${rows}</ul><p class="v4-impact" id="strategyImpact">${esc(strategyImpact(item, comparison, selected))}</p><div class="v4-hebel-actions">${adopt}</div></div>`;
    return `<details class="v4-hebel v4-hebel-fold v4-hebel-strategy"${strategyOpen ? ' open' : ''}><summary class="v4-hebel-summary"><span class="v4-hebel-num" aria-hidden="true">${number}</span><span class="v4-hebel-intro"><strong>Anlagestrategie${info}</strong><small>${esc(summary)}</small></span>${Icons.icon('chevronRight', {size:18})}</summary>${panel}</details>`;
  }
  function bindStrategy(item) {
    const comparison = profileComparison(item);
    if (!comparison) return;
    app.querySelector('.v4-hebel-strategy')?.addEventListener('toggle', event => { strategyOpen = event.currentTarget.open; });
    app.querySelectorAll('[data-strategy]').forEach(button => button.addEventListener('click', () => {
      // Nur die Vorschau umschalten und neu zeichnen – der gespeicherte Plan bleibt unangetastet.
      strategyPreview = button.dataset.strategy;
      strategyOpen = true;   // die aufgeklappte Auswahl bleibt beim Neuzeichnen offen
      renderImprove({reset:false});
    }));
    document.getElementById('strategyAdopt')?.addEventListener('click', () => adoptStrategy(strategyPreview ?? comparison.currentKey));
  }
  function adoptStrategy(key) {
    // Erst hier wird die Auswahl gespeichert; danach zeigt «Mein Plan» die neue Rechnung.
    // `strategyChosen` hält die Herkunft fest («gewählt» statt «Annahme» im Töpfe-Dialog).
    state = {...state, riskProfile: key, strategyChosen: true};
    strategyPreview = null;
    markDirty();
    returnToPlan();
  }

  function hebelNeed(item, number = 3) {
    const info = modalInfo({title:'Bedarf netto', aria:'Bedarf netto erklären', body:'<p>Dein monatlicher Bedarf nach Steuern. Ein tieferer Bedarf schont dein Vermögen und verlängert die Reichweite.</p><p>Die Vorschau rechnet mit demselben Rechenkern; gespeichert wird erst, wenn du deinen Bedarf anpasst.</p>'});
    const current = needImpact(item, needPreview.step * needPreview.sign);
    // Jeder Chip wechselt beim Antippen sein Vorzeichen: − 500 wird zu + 500 (höherer Bedarf).
    const chips = [500, 1000].map(step => { const active = needPreview.step === step; // Das Label zeigt, was der nächste Tap bewirkt: nach «− 500» also «+ 500».
      const sign = active && needPreview.sign < 0 ? '+' : '−'; return `<button type="button" class="v4-chip" data-need-preview="${step}" aria-pressed="${active ? 'true' : 'false'}">${sign} ${step.toLocaleString('de-CH')}</button>`; }).join('');
    return `<section class="v4-hebel">${hebelHead(number, 'Bedarf netto', 'Sieh, wie sich ein tieferer Nettobedarf auf die Haltbarkeit deines Vermögens auswirkt.', info)}<div class="v4-need-head"><strong class="v4-need-amount">${money(current.monthly)} <small>/ Monat</small></strong><div class="v4-chips">${chips}<button type="button" class="v4-chip" data-v4-next="need">ändern</button></div></div><p class="v4-impact" id="needImpact">${esc(current.text)}</p><div class="v4-hebel-actions"><button type="button" class="primary v4-block-action" data-v4-next="need">Bedarf anpassen <span aria-hidden="true">→</span></button></div></section>`;
  }
  /* Der Screen kennt zwei Zustände:
       «Plan präzisieren.» – Angaben fehlen oder sind geschätzt: nur der Datenhebel.
       «Plan optimieren.» – Daten vollständig: Strategie und Bedarf als Optimierungshebel.
     Datenqualität und Optimierung werden nie im selben Block vermischt. */
  function renderImprove({reset = true} = {}) {
    closeMenu(); route = 'improve'; detailParent = 'plan'; markDirty(); setMenuAvailable(true);
    if (reset) window.scrollTo(0, 0);
    if (reset) { strategyPreview = null; strategyOpen = false; needPreview = {step:0, sign:-1}; }
    const item = evaluated(previewShare ?? chosenShare());
    if (!item) { returnToPlan(); return; }
    const {items, open} = precisionItems();
    const precise = open.length > 0;
    const head = precise ? ['Plan präzisieren.', 'Mach deinen ersten Plan genauer.'] : ['Plan optimieren.', 'Teste, was deinen Plan verbessert.'];
    const lead = precise
      ? 'Je genauer deine Angaben, desto verlässlicher dein Plan. Danach kannst du Strategie und Bedarf durchspielen.'
      : 'Teste Strategie und Bedarf: die Vorschau rechnet sofort, gespeichert wird erst mit «übernehmen».';
    const blocks = precise ? [hebelPrecision(items, open)] : [hebelStrategy(item, 1), hebelNeed(item, 2)];
    app.innerHTML = `${title(head[0], head[1], detailHead)}<p class="v4-lead">${lead}</p>${blocks.join('')}`;
    bindStrategy(item);
    app.querySelectorAll('[data-need-preview]').forEach(chip => chip.addEventListener('click', () => {
      const step = numeric(chip.dataset.needPreview);
      const same = needPreview.step === step;
      needPreview = same ? {step, sign:-needPreview.sign} : {step, sign:-1};
      renderImprove({reset:false});
    }));
  }

  /* ---------------- Jahr für Jahr – Jahresverlauf (Plan verstehen) ---------------- */
  const yearState = {age:null};
  function renderYear() {
    closeMenu(); route = 'years'; detailParent = 'plan'; markDirty(); setMenuAvailable(true);
    window.scrollTo(0, 0);
    const item = evaluated(previewShare ?? chosenShare());
    if (!item) { returnToPlan(); return; }
    const rows = item.result.yearlyProjection.filter(row => !row.terminal);
    const ages = rows.map(row => row.age);
    if (!ages.includes(yearState.age)) yearState.age = ages[0];
    const index = ages.indexOf(yearState.age);
    const row = rows[index];
    // V4 zeigt die reale Sicht: Beträge in heutiger Kaufkraft (kein Sprung zwischen den Jahren).
    const value = row;
    const code = State.canton(state) || item.plan.person?.canton || '';
    // Der Satz stammt aus der nominalen Steuerbasis (massgebende Progression); der ausgewiesene
    // Steuerbetrag ist derselbe Wert in heutiger Kaufkraft.
    const rate = TaxModel.getIncomeTaxRate(code, numeric((row.nominal ?? row).taxableAnnualIncome));
    const line = (label, amount, note = '') => `<div class="v4-year-line"><span>${label}${note ? ` <small>${note}</small>` : ''}</span><strong>${amount}</strong></div>`;
    const pot = (position, take) => line(['Geldmarkt','Obligationen','Wertschöpfung'][position], `${take > 0.5 ? '− ' : ''}${money(Math.abs(take))}`);
    const takes = row.takes ?? [0,0,0];
    /* Kein zweites «Restvermögen am Planungshorizont» unter «Vermögen am Jahresende»: im
       letzten Planjahr ist «Total» bereits genau dieser Wert. Der Horizontwert bleibt über
       `horizonValue()` in den Strategie-Szenarien und Variantenkarten verfügbar. */
    /* Tatsächlich verwendete Anlagestrategie dieser Projektion – dynamisch aus dem aktiven
       Profil (risk-profiles.js), nie hardcodiert. */
    const activeProfile = globalThis.RiskProfiles?.getRiskProfile(item.plan.riskProfile ?? state.riskProfile);
    const strategyLine = activeProfile
      ? `<p class="v4-year-strategy">${esc(activeProfile.label)} · Annahme ${percent(numeric(activeProfile.expectedRealReturn) * 100)} % pro Jahr ${modalInfo({title:'Anlagestrategie dieser Projektion', aria:'Anlagestrategie erklären', body:`<p>Dein Plan rechnet im Ruhestand mit der Modellrendite der Anlagestrategie <strong>${esc(activeProfile.label)} (${percent(numeric(activeProfile.expectedRealReturn) * 100)} % pro Jahr, real)</strong>. Du wählst sie unter «Plan optimieren».</p><p>Die Zeile «Rendite dieses Jahres» zeigt dagegen das effektiv gerechnete Jahresergebnis deiner Töpfe – nicht die Annahme.</p>`})}</p>`
      : '';
    /* Keine Überleitungszeile mehr: in der realen Sicht schliesst das Vorjahresende exakt an die
       Eröffnung des Folgejahres an. */
    /* Jahresnavigation: Regler in der Mitte, links/rechts je ein Schritt um genau ein Jahr
       (an den Enden deaktiviert). Darunter der erreichte Stand. */
    const first = index === 0, last = index === ages.length - 1;
    const step = (direction, label, icon, disabled) => `<button type="button" class="v4-year-step" data-year-step="${direction}" aria-label="${label}"${disabled ? ' disabled' : ''}>${Icons.icon(icon, {size:18})}</button>`;
    app.innerHTML = `${title('Jahr für Jahr.', 'So arbeitet dein Plan im Detail.', detailHead)}<section class="v4-year-nav"><div class="v4-year-slider">${step(-1, 'Ein Jahr früher', 'chevronLeft', first)}<input id="yearRange" type="range" min="${ages[0]}" max="${ages[ages.length - 1]}" step="1" value="${row.age}" aria-label="Alter wählen">${step(1, 'Ein Jahr später', 'chevronRight', last)}</div><div class="v4-year-row"><span class="v4-detail-state">Alter ${value.age + 1}</span><span class="v4-detail-state">${ages.length} Planjahre</span></div></section><section class="v4-year-block"><h3>1 · Vermögen am Jahresanfang</h3>${line('Total', money(value.free))}${['Geldmarkt','Obligationen','Wertschöpfung'].map((name, position) => line(name, money(value.buckets?.[position] ?? 0))).join('')}</section><section class="v4-year-block"><h3>2 · Einkommen</h3>${(value.sources ?? []).filter(source => source.gross > 0.5).map(source => line(esc(source.name), money(source.gross), source.taxable ? 'brutto' : 'nicht steuerbar')).join('')}${line('Einnahmen vor Steuern', money(value.grossIncome))}${line(`Steuern (${percent(rate)} %)`, `− ${money(numeric(value.estimatedIncomeTax))}`)}${line('Netto verfügbar', money(value.rent))}</section><section class="v4-year-block"><h3>3 · Bedarf netto</h3>${line('Lebenshaltung netto', money(value.need))}${value.special > 0.5 ? line('Sonderausgabe', money(value.special)) : ''}${line(value.withdrawal > 0.5 ? 'Fehlbetrag' : 'Überschuss', money(value.withdrawal > 0.5 ? value.withdrawal : Math.max(0, value.rent - value.need - (value.special ?? 0))))}</section><section class="v4-year-block"><h3>4 · Entnahme aus den Töpfen</h3>${takes.map((take, position) => pot(position, take)).join('')}${line('Total Entnahme', money(takes.reduce((a, b) => a + b, 0)))}</section><section class="v4-year-block"><h3>5 · Deine Töpfe (Jahresende)</h3>${strategyLine}${['Geldmarkt','Obligationen','Wertschöpfung'].map((name, position) => line(name, money(value.endBuckets?.[position] ?? 0))).join('')}${line('Rendite dieses Jahres', `${value.ret >= 0 ? '+' : '−'} ${money(Math.abs(value.ret))}`)}${line('Umbuchungen (intern)', money((value.transfers ?? []).reduce((a, b) => a + Math.abs(b), 0)))}</section><section class="v4-year-block"><h3>6 · Vermögen am Jahresende</h3>${line('Total', money(value.end))}${line('Veränderung', `${value.net >= 0 ? '+' : '−'} ${money(Math.abs(value.net))}`)}</section><ul class="v4-rows"><li><button type="button" class="v4-row" data-v4-action="pots"><span>Töpfe-Modell · Aufteilung und Entwicklung</span>${Icons.icon('chevronRight', {size:18})}</button></li></ul><p class="v4-lead">${state.mode === 'pre' ? `Variante ${chosenShare()} % Kapitalbezug · ` : ''}Alle Beträge in heutiger Kaufkraft – so bleiben die Jahre untereinander vergleichbar. Gerechnet mit den bestehenden Annahmen (Inflation ${percent(item.plan.assumptions.rates.inflation)} %).</p>`;
    document.getElementById('yearRange')?.addEventListener('input', event => { yearState.age = numeric(event.target.value); renderYear(); });
    /* Schrittknöpfe: genau ein Jahr vor/zurück, nie über die Planjahre hinaus. */
    app.querySelectorAll('[data-year-step]').forEach(button => button.addEventListener('click', () => {
      const next = numeric(ages[index]) + numeric(button.dataset.yearStep);
      if (next < ages[0] || next > ages[ages.length - 1]) return;
      yearState.age = next;
      renderYear();
    }));
  }

  /* ---------------- Detail-Editoren (bestehende Felddefinitionen) ---------------- */
  const editorTitles = {personal:'Persönliche Angaben', ahv:'AHV-Renten', pension:'Pensionskasse (PK)', pension3a:'Säule 3a', extra:'Weitere Einnahmen', need:'Bedarf', assumptions:'Annahmen'}
  /* Kurze Kontexte der Detailseiten: die Titelzeile bleibt auch bei kleinen Breiten
     zweizeilig lesbar (der Kontext nutzt höchstens zwei kurze Zeilen rechts). */
  const editorContexts = {personal:'Zeitpunkt & Kanton', ahv:'Erfasste Rente', pension:'Guthaben & Beiträge', pension3a:'Guthaben & Beiträge', extra:'Zusätzliche Renten', need:'Netto pro Monat', assumptions:'Renditen & Inflation'};
  const pkRateKeys = ['pkInterest', 'uws'];
  function editorFields(detail) {
    if (detail === 'personal') return [...State.fields('time', state), ...State.fields('tax', state)];
    if (detail === 'ahv') return State.fields('income', state).filter(field => field.key === 'ahv');
    if (detail === 'extra') return State.fields('income', state).filter(field => ['other','additional'].includes(field.key));
    if (detail === 'pension') return [...State.fields('pension', state).filter(field => field.key !== 'pkShare'), ...State.fields('assumptions', state).filter(field => pkRateKeys.includes(field.key))];
    // `secReturn` bleibt bewusst draussen: die Rendite im Ruhestand kommt aus der Anlagestrategie,
    // die Wertschriftenrendite bis zur Pensionierung ist ein interner Produktsatz (wie in V3).
    return State.fields(detail, state).filter(field => detail !== 'assumptions' || ![...pkRateKeys, 'secReturn'].includes(field.key));
  }
  function fieldMarkup(field) {
    const value = draft[field.key] ?? '';
    const required = field.optional === true ? '' : ' <span class="v3-required" aria-hidden="true">*</span>';
    if (field.key === 'canton' || field.type === 'canton') {
      return `<label for="${field.key}">${field.label}${required}</label><div class="v4-form-value"><select id="${field.key}" name="${field.key}" data-canton-compact="1"><option value="" ${entered(value) ? '' : 'selected'}>Noch offen</option>${Object.entries(TaxModel.config.cantons).map(([code, canton]) => `<option value="${code}" ${value === code ? 'selected' : ''}>${code} · ${esc(canton.name)}</option>`).join('')}</select></div>`;
    }
    const amount = isAmountField(field);
    /* Prozentwerte erscheinen mit Dezimalkomma («4,5 %»), wie alle Prozentangaben der App. */
    const percent = !amount && String(field.unit ?? '').trim().startsWith('%');
    const shown = amount ? formatAmount(value) : percent ? String(value).replace('.', ',') : value;
    return `<label for="${field.key}">${field.label}${required}</label><div class="v4-form-value"><input id="${field.key}" name="${field.key}" type="text" inputmode="${amount || percent ? 'decimal' : 'numeric'}" autocomplete="off"${amount ? ' data-amount' : ''}${percent ? ' data-percent' : ''} value="${esc(shown)}"><span class="v4-form-unit">${field.unit}</span></div>`;
  }
  /* `parent` ist die übergeordnete Seite («Zurück»-Ziel); «Übernehmen» führt immer auf
     «Mein Plan» (Apply-and-return-Regel). */
  function openDetail(name, parent = 'plan') {
    if (name === 'plan') { returnToPlan(); return; }
    if (name === 'variants') { renderVariants(); return; }
    detailParent = parent;
    if (name === 'assets') { renderAssets(); return; }
    closeMenu(); route = name; markDirty(); setMenuAvailable(true);
    window.scrollTo(0, 0);
    const fields = editorFields(name);
    const initial = name === 'personal' ? {...state.values, canton:State.canton(state)}
      : name === 'ahv' ? {...incomeValues(), ...(Estimates && Estimates.ahvOf(state).origin === 'estimated' ? {ahv:Estimates.ahv.monthly} : {})}
      : name === 'extra' ? incomeValues()
      : name === 'assumptions' ? {...State.defaults, ...(state.details.assumptions ?? {}), targetAge:state.targetAge}
      : name === 'pension' ? {...(state.details.assumptions ?? {}), ...State.defaults, ...state.details.pension}
      : {...state.values, ...state.details[name]};
    draft = Object.fromEntries(fields.map(field => [field.key, initial[field.key] ?? '']));
    const origin = name === 'ahv' && Estimates && Estimates.ahvOf(state).origin === 'estimated' ? `<p class="v4-form-hint">Aus dem Schnellstart übernommen (Annahme ${money(Estimates.ahv.monthly)} / Monat). Deine Eingabe ersetzt sie.</p>` : '';
    const extra = name === 'assumptions' ? assumptionsInfo(evaluated(previewShare ?? chosenShare())) : '';
    app.innerHTML = `${title(`${editorTitles[name] ?? name}.`, editorContexts[name] ?? planContext(), detailHead)}<form id="v4DetailForm" class="v4-form"><div class="v4-form-table">${fields.map(fieldMarkup).join('')}</div>${extra}${origin}${name === 'ahv' && Estimates ? infoMarkup({label:'Geschätzte AHV-Rente', body:`<p>${Estimates.ahv.note}</p>`}) : ''}<p id="v4Error" class="v3-error" role="alert"></p><button type="submit" class="primary v4-form-submit">Übernehmen</button></form>`;
    window.CantonPicker?.enhanceAll(app);
    app.querySelector('[data-reset-sec-return]')?.addEventListener('click', () => {
      assignForm();
      try {
        // Nur den verdächtigen internen Satz zurücksetzen; alles andere bleibt wie erfasst.
        const values = {...State.defaults, ...draft, targetAge:draft.targetAge, secReturn:State.defaults.secReturn, reviewed:true};
        state = State.apply(state, 'assumptions', values);
        markDirty();
        openDetail('assumptions');
      } catch (error) { message(error.message); }
    });
    document.getElementById('v4DetailForm').addEventListener('submit', event => {
      event.preventDefault(); assignForm();
      try {
        if (name === 'personal') {
          const mode = document.getElementById('personMode')?.value ?? state.mode;
          if (mode !== state.mode) state = V3State.changeMode(state, mode);
          apply('time', draft); apply('tax', {canton:draft.canton});
        } else if (name === 'ahv' || name === 'extra') apply('income', {...incomeValues(), ...draft});
        else if (name === 'assumptions') apply('assumptions', {...State.defaults, ...draft, reviewed:true});
        else if (name === 'pension3a') { state = apply3a(state, draft); markDirty(); returnToPlan(); }
        else apply(name, {...state.details[name], ...draft});
        returnToPlan();
      } catch (error) { message(error.message); }
    });
  }
function incomeValues() { return {ahv:0, other:state.values.regular ?? 0, additional:0, ...state.details.income, canton:State.canton(state)}; }
  /* Tabellenzeilen für Info-Dialoge: Betrag und Herkunft je Zeile. */
  function infoRows(rows) {
    return `<dl class="v3-info-list">${rows.map(([label, value, note]) => `<div><dt>${label}${note ? ` <small>${note}</small>` : ''}</dt><dd>${value}</dd></div>`).join('')}</dl>`;
  }

  /* Expertenbereich «Annahmen»: Die Rendite im Ruhestand kommt ausschliesslich aus der
     Anlagestrategie (RiskProfiles). Die Wertschriftenrendite bis zur Pensionierung ist ein
     interner Produktsatz; unplausible Altwerte werden markiert, nicht stillschweigend verwendet. */
  const strategyLabels = {cautious:'Vorsichtig', balanced:'Ausgewogen', growth:'Chancenorientiert'};
  function assumedSecuritiesRate() {
    return numeric((state.details.assumptions ?? {}).secReturn ?? State.defaults.secReturn);
  }
  function securitiesRateSuspect(rate) {
    // 0.16 statt 16 % (Dezimalfehler) oder ein alter Jahreswert weit über dem Modell.
    return rate > 0 && rate < 0.5 ? 'decimal' : rate >= 10 ? 'high' : '';
  }
  function assumptionsInfo(item) {
    const profile = globalThis.RiskProfiles?.getRiskProfile((item?.plan ?? planFor(chosenShare()))?.riskProfile ?? state.riskProfile);
    const rate = assumedSecuritiesRate();
    const suspect = securitiesRateSuspect(rate);
    const row = (label, value, note) => `<div><dt>${label}</dt><dd>${value}</dd><p class="v4-readonly-note">${note}</p></div>`;
    const warning = suspect
      ? `<p class="v4-warning" role="status">Die hinterlegte Wertschriftenrendite von ${percent(rate)} % ist fachlich zu prüfen${suspect === 'decimal' ? ' – möglicher Dezimalfehler (0.16 statt 16 %)' : ''}. Sie wirkt nur bis zur Pensionierung; im Ruhestand rechnet der Plan mit der Anlagestrategie.</p><button type="button" class="v4-chip" data-reset-sec-return>Wertschriftenrendite auf ${percent(State.defaults.secReturn)} % zurücksetzen</button>`
      : '';
    return `<section class="v4-formed-note"><dl class="v4-readonly">${row('Anlagestrategie', `${strategyLabels[profile?.key] ?? profile?.key ?? '–'} · ${(numeric(profile?.expectedRealReturn) * 100).toLocaleString('de-DE', {maximumFractionDigits:1})} % pro Jahr`, 'einzige Renditequelle im Ruhestand – wählbar unter «Plan optimieren»')}${row('Wertschriftenrendite bis Pensionierung', `${percent(rate)} %`, 'interner Produktsatz, nicht Teil der Strategie')}</dl>${warning}</section>`;
  }

  /* Säule 3a: Guthaben und Beiträge gehören zusammen (Modellregel). Ein leeres Beitragsfeld
     bedeutet «keine weiteren Beiträge» (0); ohne Guthaben ergibt ein Beitrag keinen Sinn.
     Beide Zeilen leer = nichts erfasst, der Stand bleibt unverändert. */
  function apply3a(base, values) {
    const balance = amountValue(values.p3 ?? ''), contrib = amountValue(values.p3Contrib ?? '');
    if (balance === '' && contrib === '') return base;
    if (balance === '') throw Error('Bitte erfasse dein 3a-Guthaben – oder lass beide Zeilen leer.');
    return State.apply(base, 'pension3a', {p3:Number(balance), p3Contrib:contrib === '' ? 0 : Number(contrib)});
  }
  /* ---------------- Vermögen (eine Tabelle, eine Aktion) ----------------
     Alle Vermögenszeilen stehen in einer Tabelle mit einem «Übernehmen». Gespeichert wird
     abschnittweise über die vorgesehene API `applyAsset` (validiert je Abschnitt, optionale
     Felder dürfen leer bleiben); erst wenn alle Abschnitte gültig sind, wird der neue Stand
     übernommen – sonst bleibt der alte Stand und der Fehler steht in der Zeile. */
  function renderAssets() {
    closeMenu(); route = 'assets'; markDirty(); setMenuAvailable(true);
    window.scrollTo(0, 0);
    const item = evaluated(previewShare ?? chosenShare());
    if (!item) { returnToPlan(); return; }
    const assetLabels = {cash:'Bank / liquide Mittel', securities:'Wertschriften', saving:'Anlage pro Jahr', otherAssets:'Weitere Positionen', propertyValue:'Immobilienwert', mortgage:'Hypotheken'};
    const values = state.details.assets ?? {};
    const threeA = State.fields('pension3a', state);
    const threeALabels = {p3:'3a-Guthaben heute', p3Contrib:'Beiträge pro Jahr'};
    const threeARow = field => `<label for="asset-${field.key}">${threeALabels[field.key] ?? field.label}</label><div class="v4-form-value"><input id="asset-${field.key}" name="${field.key}" type="text" inputmode="decimal" data-amount placeholder="leer" value="${esc(formatAmount((state.details.pension3a ?? {})[field.key] ?? ''))}"><span class="v4-form-unit">${field.unit}</span></div>`;
    const sections = [
      ['cash','cash'],
      ['securities','securities','saving'],
      ['otherAssets','otherAssets'],
      /* Reihenfolge nach Wichtigkeit: die Säule 3a steht vor den optionalen Immobilien. */
      ['pension3a', ...threeA.map(field => field.key)],
      ['property','propertyValue','mortgage']
    ];
    const row = field => `<label for="asset-${field.key}">${assetLabels[field.key] ?? field.label}</label><div class="v4-form-value"><input id="asset-${field.key}" name="${field.key}" type="text" inputmode="decimal" data-amount placeholder="leer" value="${esc(formatAmount(values[field.key] ?? ''))}"><span class="v4-form-unit">${field.unit}</span></div>`;
    const rows = sections.map(([part, ...keys]) => {
      if (part === 'pension3a') {
        return threeA.length
          ? `<div class="v4-form-group">Säule 3a <small>optional – Guthaben und Beiträge</small></div>${threeA.map(threeARow).join('')}`
          : '';
      }
      const fields = part === 'property'
        ? [{key:'propertyValue', label:'Immobilienwert', unit:'CHF'}, {key:'mortgage', label:'Hypotheken', unit:'CHF', optional:true}]
        : State.assetFields(part, state, {keepOptional:true});
      const group = part === 'property' ? `<div class="v4-form-group">Immobilien <small>optional – Wert und Hypotheken gehören zusammen</small></div>` : '';
      return group + fields.filter(field => keys.includes(field.key)).map(row).join('');
    }).join('');
    app.innerHTML = `${title('Vermögen.', 'Kapital für den Ruhestand', detailHead)}<p class="v4-lead">Jede Zeile darf leer bleiben – leere Felder zählen nicht als erfasst. Erfasse nur, was du kennst.</p><form id="v4AssetForm" class="v4-form"><div class="v4-form-table">${rows}</div><p id="v4Error" class="v3-error" role="alert"></p><button type="submit" class="primary v4-form-submit">Übernehmen</button></form>`;
    document.getElementById('v4AssetForm').addEventListener('submit', event => {
      event.preventDefault();
      const entered = Object.fromEntries([...event.currentTarget.querySelectorAll('input[name]')].map(input => [input.name, amountValue(input.value)]));
      /* Immobilienwert und Hypotheken gehören zusammen: wer nur den Wert kennt, rechnet ohne
         Hypothek (0). Umgekehrt braucht es den Wert – das meldet die Validierung. */
      if (entered.propertyValue !== '' && entered.mortgage === '') entered.mortgage = '0';
      try {
        let next = state;
        for (const [part, ...keys] of sections) {
          // Die Säule 3a gehört nicht zu den Vermögensabschnitten und wird über `apply3a` gespeichert.
          if (part === 'pension3a') continue;
          next = State.applyAsset(next, part, Object.fromEntries(keys.map(key => [key, entered[key] ?? ''])), {keepOptional:true, allowEmpty:true});
        }
        next = apply3a(next, entered);
        state = next; delete state.exampleValues;
        markDirty(); returnToPlan();
      } catch (error) {
        globalThis.__v4LastError = error?.message ?? String(error);
        message(error.message);
      }
    });
  }

  /* ---------------- Modal, Menü, Navigation ---------------- */
  function modalInfo({title, body, aria = 'Erklärung öffnen'}) {
    return `<button type="button" class="v3-info v3-info-sub v3-modal-icon" data-modal data-modal-title="${esc(title)}" data-modal-body="${esc(body)}" aria-label="${esc(aria)}">${Icons.icon('infoCircle', {size:18})}</button>`;
  }
  function infoMarkup({label, body}) { return `<details class="v3-info"><summary><span class="v3-info-label">${esc(label)}</span><span class="v3-info-glyph" aria-hidden="true">${Icons.icon('chevronRight', {size:18})}</span></summary><div class="v3-info-panel">${body}</div></details>`; }
  function openModal(source) {
    const dialog = document.getElementById('v4Modal');
    if (!dialog || !source) return;
    const data = source.dataset || source;
    dialog.querySelector('#v4ModalTitle').textContent = data.modalTitle || '';
    dialog.querySelector('#v4ModalBody').innerHTML = data.modalBody || '';
    if (!dialog.open) { if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', ''); }
    /* Den Fokus in den Dialog holen, aber nicht auf den «✕»-Knopf: sonst trüge er schon beim
       Öffnen einen Focus-Ring, obwohl der Normalzustand vollständig transparent ist. */
    (dialog.querySelector('#v4ModalTitle') ?? dialog).focus?.();
  }
  function closeModal() { const dialog = document.getElementById('v4Modal'); if (!dialog) return; if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open'); }
  function closeMenu() { const menu = document.getElementById('v4Menu'), button = document.querySelector('.menu-button'); if (menu) menu.hidden = true; if (button) button.setAttribute('aria-expanded', 'false'); }
  /* Menü nur zeigen, wenn es einen Plan gibt (im Schnellstart ausgeblendet). */
  function setMenuAvailable(available) {
    const button = document.querySelector('.menu-button');
    if (button) button.hidden = !available;
    if (!available) closeMenu();
  }
  function returnToPlan() { closeMenu(); previewShare = null; markDirty(); renderPlan(); }
  /* ---------------- Pilot: Feedback und Zurücksetzen (dezent unten im Menü) ----------------
     Beide Einträge sind bewusst keine Navigationsziele der App, sondern Werkzeuge für das
     Pilottesting: Rückmeldung geben und wieder bei null starten. */
  const PILOT_FEEDBACK_EMAIL = '';
  const feedbackTemplate = () =>
    ['Was hat gut funktioniert?', '', '', 'Was war unklar oder hat gefehlt?', '', '', 'Sonstiges:', ''].join('\n');
  function openFeedbackModal() {
    const address = PILOT_FEEDBACK_EMAIL || (TaxModel?.config?.pilot?.feedbackEmail ?? '');
    const body = `<p class="v3-modal-lead">Deine Rückmeldung hilft uns, den Ruhestands-Check zu verbessern.</p><label class="v4-feedback-label" for="v4Feedback">Deine Rückmeldung</label><textarea id="v4Feedback" class="v4-feedback" rows="7" spellcheck="true">${esc(feedbackTemplate())}</textarea><p class="v4-info-source">Deine Angaben aus dem Plan werden nicht automatisch mitgeschickt – es geht nur dieser Text.</p><div class="v4-hebel-actions"><button type="button" class="primary v4-block-action" data-feedback-send>${address ? 'E-Mail öffnen' : 'E-Mail-Programm öffnen'} <span aria-hidden="true">→</span></button></div>`;
    openModal({modalTitle:'Feedback geben', modalBody:body});
  }
  function sendFeedback() {
    const address = PILOT_FEEDBACK_EMAIL || (TaxModel?.config?.pilot?.feedbackEmail ?? '');
    const text = document.getElementById('v4Feedback')?.value ?? '';
    const subject = encodeURIComponent('Ruhestands-Check: Feedback');
    const bodyText = encodeURIComponent(text);
    globalThis.location.href = `mailto:${address}?subject=${subject}&body=${bodyText}`;
  }
  function openResetModal() {
    const body = `<p class="v3-modal-lead">Damit startest du wieder beim Schnellstart. Alle erfassten Angaben, Varianten und die Anlagestrategie werden aus diesem Browser entfernt.</p><div class="v4-hebel-actions"><button type="button" class="primary v4-block-action" data-plan-reset>Plan zurücksetzen <span aria-hidden="true">→</span></button><button type="button" class="v4-chip" data-modal-close>Abbrechen</button></div>`;
    openModal({modalTitle:'Plan zurücksetzen?', modalBody:body});
  }
  function resetPlan() {
    closeModal();
    try { localStorage.removeItem(storageKey); } catch (error) { /* Speicher nicht verfügbar */ }
    state = State.fresh('pre');
    state.riskProfile = 'balanced';
    previewShare = null;
    globalThis.__v4PersistError = undefined;
    setStartDraft();
    renderStart();
  }
  function openPotsModal(trigger) {
    const item = evaluated(previewShare ?? chosenShare());
    if (!item) return;
    const values = item.result.bucketAllocation, total = item.result.availableCapital;
    const amounts = roundedParts(values, total), percents = roundedParts(values.map(value => total > 0 ? value / total * 100 : 0), 100);
    /* Nur die Töpfe zeigen, in denen tatsächlich Vermögen liegt: bei einem einzigen Topf wäre
       eine Drei-Töpfe-Darstellung mit zwei leeren Zeilen irreführend. */
    const all = bucketConfig.map((bucket, index) => ({...bucket, value:numeric(values[index]), amount:amounts[index], percent:percents[index]}));
    const shown = all.filter(entry => entry.amount > 0 || entry.percent > 0);
    const lead = total <= 0
      ? 'Für den Ruhestand ist aktuell kein Vermögen hinterlegt.'
      : shown.length === 1
        ? `Dein frei verfügbares Vermögen liegt aktuell vollständig in der ${shown[0].label}.`
        : shown.length === 2
          ? `Dein frei verfügbares Vermögen liegt in zwei von drei Töpfen: ${shown.map(entry => entry.label).join(' und ')}.`
          : 'Dein frei verfügbares Vermögen ist auf drei Töpfe verteilt.';
    /* Zentrum hell und neutral, Text in Navy: Label «Frei verfügbares Vermögen», darunter der Betrag. */
    const chart = shown.length
      ? `<div class="v3-donut-wrap">${donutSvg(shown)}<div class="v3-donut-total"><span>Frei verfügbares Vermögen</span><strong>${money(total)}</strong></div></div>`
      : '';
    /* Genau drei kompakte Zeilen: Icon, Name, Betrag, Prozentanteil. Die Erklärung zu jedem
       Topf hängt als ⓘ an der Zeile – kein zweiter Erklärblock, keine Wiederholung. */
    const rows = shown.length
      ? `<ul class="v3-donut-legend">${shown.map(entry => `<li class="pot-${entry.tone}"><span class="v3-pot-icon" aria-hidden="true">${Icons.icon(entry.icon, {size:20})}</span><span class="v3-pot-name">${entry.label}</span><strong>${money(entry.amount)}</strong><small>${entry.percent} %</small>${modalInfo({title:`Topf ${entry.label}`, aria:`${entry.label} erklären`, body:`<p><strong>${entry.label}</strong> – ${esc(entry.note)}</p><p>Der Topf enthält aktuell ${money(entry.amount)} (${entry.percent} % deines frei verfügbaren Vermögens). Die Aufteilung folgt deiner Anlagestrategie und verschiebt sich mit den Entnahmen über die Jahre.</p>`})}</li>`).join('')}</ul>`
      : '';
    const body = `<p class="v3-modal-lead">${lead}</p>${chart}${rows}${potsStrategy(item)}<button type="button" class="primary v3-modal-action" data-modal-close>Schliessen</button>`;
    openModal({dataset:{modalTitle:'Das Töpfe-Modell', modalBody:body}, currentTarget:trigger});
  }
  /* Eine einzige kompakte Card zur Anlagestrategie: Profil und Satz dynamisch aus dem aktiven
     Profil (`risk-profiles.js`), dazu die Herkunft – «gewählt» nach «Strategie übernehmen»,
     sonst «Annahme» (automatisch gesetzter Standard). */
  function potsStrategy(item) {
    const profile = globalThis.RiskProfiles?.getRiskProfile((item?.plan ?? planFor(chosenShare()))?.riskProfile ?? state.riskProfile);
    if (!profile) return '';
    const rate = percent(numeric(profile.expectedRealReturn) * 100);
    const source = state.strategyChosen === true ? 'gewählt' : 'Annahme';
    const info = modalInfo({title:'Anlagestrategie', aria:'Anlagestrategie erklären', body:`<p>Die Anlagestrategie ist die einzige Quelle für die erwartete Rendite im Ruhestand. Sie bestimmt, mit welcher <strong>Rendite und welchen Schwankungen</strong> dein Vermögen gerechnet wird – nicht die Aufteilung auf die drei Töpfe.</p><p>Du wählst sie unter «Plan optimieren»; bis dahin rechnen wir mit der Modellannahme <strong>${esc(profile.label)} (${rate} % pro Jahr)</strong>.</p>`});
    /* Zwei Zeilen statt eines umbrechenden Satzes: Profil, darunter die Annahme pro Jahr. */
    return `<section class="v4-pot-strategy"><span class="v4-pot-strategy-icon" aria-hidden="true">${Icons.icon('target', {size:22})}</span><div class="v4-pot-strategy-copy"><div class="v4-pot-strategy-head"><span>Anlagestrategie</span><span class="v4-badge-tone done">${source}</span></div><strong>${esc(profile.label)}</strong><span class="v4-pot-strategy-rate">${rate} % pro Jahr</span><small>Bestimmt die erwartete Rendite deiner Anlage, nicht die Aufteilung. ${info}</small></div></section>`;
  }
  const bucketConfig = [
    {key:'cash', icon:'cash', label:'Geldmarkt', tone:'cash', note:'Für kurzfristige Entnahmen und Sicherheit.'},
    {key:'bonds', icon:'chartBar', label:'Obligationen', tone:'bonds', note:'Für Stabilität und regelmässige Erträge.'},
    {key:'growth', icon:'trendingUp', label:'Wertschöpfung', tone:'growth', note:'Für langfristiges Wachstum.'}
  ];
  function roundedParts(values, total) {
    const target = Math.round(total ?? values.reduce((a, b) => a + b, 0));
    const parts = values.map(value => Math.floor(value));
    let rest = target - parts.reduce((a, b) => a + b, 0);
    const order = values.map((value, index) => ({index, fraction:value - Math.floor(value)})).sort((a, b) => b.fraction - a.fraction);
    for (let i = 0; i < order.length && rest > 0; i++, rest--) parts[order[i].index] += 1;
    return parts;
  }
  function potColor(tone) { return tone === 'cash' ? 'var(--v3-pot-cash)' : tone === 'bonds' ? 'var(--v3-pot-bonds)' : 'var(--v3-pot-growth)'; }
  function donutSvg(entries) {
    const total = entries.reduce((sum, entry) => sum + numeric(entry.value), 0), radius = 54, circumference = 2 * Math.PI * radius;
    let offset = 0;
    const rings = entries.map(entry => {
      const share = total > 0 ? numeric(entry.value) / total : 0, length = share * circumference;
      const ring = `<circle r="${radius}" cx="70" cy="70" fill="none" stroke="${potColor(entry.tone)}" stroke-width="22" stroke-dasharray="${length} ${circumference - length}" stroke-dashoffset="${-offset}" transform="rotate(-90 70 70)"></circle>`;
      offset += length;
      return ring;
    }).join('');
    return `<svg class="v3-donut" viewBox="0 0 140 140" role="img" aria-label="Aufteilung auf die Töpfe">${rings}</svg>`;
  }

  /* ---------------- Laden/Start ---------------- */
  function load() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return false;
      const saved = V3State.decode(raw);
      state = saved.state; previewShare = null; lastSavedAt = saved.savedAt; storageBlocked = false; storageFailed = false;
      if (state.position === 'variants') renderVariants();
      else if (state.position === 'years') renderYear();
      else if (state.position === 'improve') renderImprove();
      else if (state.position === 'basics') renderBasics();
      else if (['plan','rents','need','compare'].includes(state.position)) returnToPlan();
      else openDetail(state.position);
      return true;
    } catch (error) { storageBlocked = true; message(error.message); return false; }
  }

  document.addEventListener('click', event => {
    const modal = event.target.closest('[data-modal]');
    if (modal) { event.preventDefault(); openModal(modal); return; }
    if (event.target.closest('[data-modal-close]')) { closeModal(); return; }
    const back = event.target.closest('[data-v4-back]');
    if (back) { goBack(); return; }
    const pots = event.target.closest('[data-v4-action="pots"]');
    if (pots) { openPotsModal(pots); return; }
    const next = event.target.closest('[data-v4-next]');
    if (next) {
      const target = next.dataset.v4Next;
      /* `data-v4-parent` hält fest, von welcher Seite aus der Editor geöffnet wurde –
         «Zurück» führt genau dorthin. */
      const parent = next.dataset.v4Parent || 'plan';
      if (target === 'years') renderYear();
      else if (target === 'improve') renderImprove();
      else if (target === 'variants') renderVariants();
      else openDetail(target, parent);
      return;
    }
    const menu = event.target.closest('[data-menu-page]');
    if (menu) {
      /* Das Menü ist aufgabenorientiert (siehe docs/information-architecture-v4.md §7):
         Mein Plan · Planen (Angaben & Grundlagen, Varianten) · Plan verstehen
         (Jahresverlauf, Töpfe-Modell, Annahmen & Berechnung). Einzelne Datensätze wie
         AHV, PK oder Säule 3a sind Aufgabenbestandteile und stehen hinter
         «Angaben & Grundlagen» – nicht als eigene Destination. */
      const target = menu.dataset.menuPage;
      closeMenu();
      if (target === 'plan') returnToPlan();
      else if (target === 'basics') renderBasics();
      else if (target === 'variants') renderVariants();
      else if (target === 'years') renderYear();
      else if (target === 'pots') openPotsModal(null);   // dieselbe Komponente wie aus dem Jahresverlauf
      else openDetail(target, 'plan');
      return;
    }
    /* Pilotwerkzeuge unten im Menü: Rückmeldung geben bzw. wieder bei null starten. */
    const action = event.target.closest('[data-menu-action]');
    if (action) {
      closeMenu();
      if (action.dataset.menuAction === 'feedback') openFeedbackModal();
      else if (action.dataset.menuAction === 'reset') openResetModal();
      return;
    }
    if (event.target.closest('[data-feedback-send]')) { sendFeedback(); return; }
    if (event.target.closest('[data-plan-reset]')) { resetPlan(); return; }
  });
  document.querySelector('.menu-button')?.addEventListener('click', () => {
    const menu = document.getElementById('v4Menu'), button = document.querySelector('.menu-button');
    if (!menu) return;
    menu.hidden = !menu.hidden;
    button.setAttribute('aria-expanded', String(!menu.hidden));
  });
  document.getElementById('v4Home')?.addEventListener('click', returnToPlan);
  app.addEventListener('input', event => {
    const input = event.target.closest('input[data-amount]');
    if (!input) return;
    const raw = input.value, caret = input.selectionStart ?? raw.length;
    const next = formatAmount(raw);
    if (next === raw) return;
    input.value = next;
    // Cursor hinter dieselbe Anzahl Ziffern setzen – funktioniert auch beim Tippen in der Mitte.
    const digitsBefore = raw.slice(0, caret).replace(/\D/g, '').length;
    let index = 0, seen = 0;
    while (index < next.length && seen < digitsBefore) { if (/\d/.test(next[index])) seen++; index++; }
    try { input.setSelectionRange(index, index); } catch (error) { /* Feld ohne Auswahl */ }
  });
  app.addEventListener('blur', event => { const input = event.target.closest?.('input[data-amount]'); if (input) input.value = formatAmount(input.value); }, true);
  window.addEventListener?.('pagehide', save);

  state.riskProfile = 'balanced';
  /* Der Schliessen-Knopf der Info-Dialoge zeigt ausschliesslich das Tabler-«✕» (`close`,
     IconX-Pfad) in der dunkelgrünen Textfarbe – Grösse 22, Strichstärke 1,7, keine Fläche.
     Das Icon kommt aus der einen Icon-Quelle (`js/icons.js`), nie als eigenes SVG. */
  const modalCloseButton = document.querySelector('#v4Modal [data-modal-close]');
  if (modalCloseButton && !modalCloseButton.firstChild) modalCloseButton.innerHTML = Icons.icon('close', {size:22, stroke:1.7});
  window.V4 = {save, load, planFor, evaluated, renderPlan, renderStart, renderVariants, precisionItems, profileComparison, needImpact};
  setStartDraft(); renderStart();
  load();

  /* ---------------- Testmodus (Dev-Szenarien, nur mit ?dev=1) ---------------- */
  if (globalThis.DevFixture?.enabled?.()) {
    const bar = document.createElement('div');
    bar.className = 'v4-dev';
    bar.innerHTML = '<strong>Testmodus</strong><span>Zustand laden:</span>';
    const scenarios = [['leer','leer'],['knapp','vor Pensionierung, knapp'],['geht-auf','vor Pensionierung, geht auf'],['pensioniert','bereits pensioniert'],['1-variante','1 Variante'],['3-varianten','3 Varianten'],['ohne-kanton','ohne Wohnkanton'],['vollstaendig','vollständige Daten'],['kurz','Vermögen reicht nicht'],['ziel','bis Planungshorizont'],['optimiert','Daten vollständig']];
    scenarios.forEach(([key, label]) => {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = label; button.dataset.v4Scenario = key;
      bar.append(button);
    });
    // Zurücksetzen und Beispielplanung – wie im V3-Testmodus, nur in der Entwicklung.
    const reset = document.createElement('button');
    reset.type = 'button'; reset.textContent = 'Zurücksetzen (leer)'; reset.dataset.v4Reset = 'true';
    const demo = document.createElement('button');
    demo.type = 'button'; demo.textContent = 'Beispielplanung'; demo.dataset.v4Demo = 'true';
    bar.append(reset, demo);
    bar.addEventListener('click', event => {
      const button = event.target.closest('[data-v4Scenario]');
      const isReset = event.target.closest('[data-v4-reset]');
      const isDemo = event.target.closest('[data-v4-demo]');
      if (!button && !isReset && !isDemo) return;
      try {
        if (isReset) globalThis.DevFixture.clear();          // Persistenz entfernen → Schnellstart
        else if (isDemo) globalThis.DevFixture.restore();    // Referenzstand laden
        else globalThis.DevFixture.scenario(button.dataset.v4Scenario);
      } catch (error) { /* Testmodus bleibt bedienbar */ }
      globalThis.__v4SuspendSave = true;                     // eigenes Speichern beim Neuladen unterbinden
      globalThis.location.reload();
    });
    document.body.insertBefore(bar, document.body.firstChild);
  }
})();