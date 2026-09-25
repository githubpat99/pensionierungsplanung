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
  /* Beträge werden schweizerisch angezeigt: Gruppierung mit Apostroph, Dezimaltrennzeichen ist
     das Komma («3'000», «1'234,50»). Das Komma bleibt beim Tippen stehen – der frühere Weg über
     den Punkt hat «4,5» zu «45.» verstümmelt. */
  const formatAmount = value => {
    const text = String(value ?? '').replace(/['\s\u00a0]/g, '').replace(/\./g, ',');
    if (text === '') return '';
    if (!/^-?\d*,?\d*$/.test(text)) return String(value ?? '');
    const [whole = '', decimals] = text.split(',');
    const sign = whole.startsWith('-') ? '-' : '', digits = whole.replace('-', '');
    const grouped = digits ? plain(Number(digits)) : '';
    return `${sign}${grouped}${decimals === undefined ? '' : `,${decimals}`}`;
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
      state.position = route;
      state = normalizeP3(state);
      V3State.validate(state);
      /* Hülle immer über `V3State.encode`: nur so tragen Stände `storageVersion` und können
         beim nächsten Deployment migriert (statt geräumt) werden. */
      const record = V3State.encode(state);
      localStorage.setItem(storageKey, JSON.stringify(record));
      lastSavedAt = record.savedAt; storageFailed = false;
    } catch (error) { storageFailed = true; globalThis.__v4PersistError = error?.message ?? String(error); }
  }
  function markDirty() {
    if (saveTimer && canDefer) clearTimeout(saveTimer);
    saveTimer = canDefer ? setTimeout(() => { saveTimer = null; persist(); }, autoSaveDelay) : null;
    if (!saveTimer) persist();
  }
  function save() { if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; } persist(); }
  function message(text = '') { const node = document.getElementById('v4Error'); if (node) node.textContent = text; }
  /* Meldungen, die nicht an eine einzelne Card gebunden sind (Speicherstände, Updates).
     Sie erscheinen in einem stehenden Banner, damit nichts stillschweigend passiert –
     `#v4Error` gibt es nur auf einzelnen Screens. */
  const noticeDismissed = new Set();
  function notice(text, {id = text, tone = 'info'} = {}) {
    const bar = document.getElementById('v4Notice');
    if (!bar || !text || noticeDismissed.has(id)) return;
    bar.dataset.tone = tone;
    bar.innerHTML = `<p class="v4-notice-text">${esc(text)}</p><button type="button" class="v4-notice-close" data-notice-close aria-label="Hinweis schliessen">${Icons.icon('close', {size:18})}</button>`;
    bar.hidden = false;
    bar.dataset.noticeId = id;
  }
  function hideNotice() {
    const bar = document.getElementById('v4Notice');
    if (!bar) return;
    const id = bar.dataset.noticeId;
    if (id) noticeDismissed.add(id);
    bar.hidden = true;
  }
  /* Gesicherte Alt-/Defektstände: höchstens zwei Sicherungen, damit der Speicher nicht vollläuft. */
  function parkPlan(raw) {
    try {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const prefix = `${storageKey}.backup-`;
      Object.keys(localStorage).filter(key => key.startsWith(prefix)).sort().slice(0, -1).forEach(key => localStorage.removeItem(key));
      const backupKey = `${prefix}${stamp}`;
      localStorage.setItem(backupKey, raw);
      localStorage.removeItem(storageKey);
      return backupKey;
    } catch (error) { globalThis.__v4ParkError = error?.message ?? String(error); return null; }
  }
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
  /* Die Oberfläche beschriftet jedes Planjahr mit `row.age + 1` (die erste Zeile der Projektion
     heisst «Alter 66»). Die Reichweite des Rechenkerns (`capitalExhaustionAge`) ist der rohe
     Zeilenindex des Jahres, in dem das Vermögen aufgebraucht ist – sie wird hier mit derselben
     Konvention ausgegeben. So zeigen Statusbox, Varianten, Strategien, Vergleich, Bericht und
     Grafik dieselbe Zahl aus derselben Quelle. */
  function exhaustionAge(result) { return result?.capitalExhaustionAge ? numeric(result.capitalExhaustionAge) + 1 : null; }
  function reachAge(result, targetAge) { const age = exhaustionAge(result); return age ? `Alter ${age}` : `Alter ${targetAge}+`; }
  function outcomeOf(item) {
    if (!item) return {tone:'pending', short:'Noch keine Angaben', long:''};
    const result = item.result, target = item.plan.retirement.targetAge;
    if (!hasCanton()) {
      const note = 'Erste Orientierung mit geschätzter AHV und geschätzten Steuern.';
      if (exhaustionAge(result)) return {tone:'watch', short:'Dein Plan ist noch knapp.', long:`Mit den bisherigen Angaben reicht dein Vermögen voraussichtlich bis ${reachAge(result, target)}.`, note};
      return {tone:'covered', short:'Dein erster Plan geht voraussichtlich auf.', long:`Dein Vermögen reicht bis zum Planungshorizont ${reachAge(result, target)}.`, note};
    }
    /* Ist der Wohnkanton erfasst und rechnen wir mit den eigenen Angaben, braucht der Status
       keine Herkunftszeile: «Berechnet mit deinen Angaben und deinem Wohnkanton» sagt nichts,
       was der Nutzer nicht schon weiss – er hat die Angaben ja selbst erfasst. Der Hinweis
       bleibt nur dort, wo er etwas erklärt: bei der geschätzten AHV und den geschätzten Steuern. */
    if (exhaustionAge(result)) return {tone:'gap', short:'Dein Plan ist noch knapp.', long:`Mit den bisherigen Angaben reicht dein Vermögen voraussichtlich bis ${reachAge(result, target)}.`};
    return {tone:'covered', short:'Dein Plan geht voraussichtlich auf.', long:`Dein Vermögen reicht bis zum Planungshorizont ${reachAge(result, target)}.`};
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
    return `<section class="v4-lever"><div class="v4-lever-head"><h2>PK-Bezug wählen ${modalInfo({title:'PK-Bezug', aria:'PK-Bezug erklären', body:'<p>Der Kapitalanteil bestimmt, wie viel deines PK-Guthabens du bei Pensionierung als Kapital beziehst. Der Rest wird zur Rente.</p><p>Wenn du den PK-Bezug änderst, verändern sich deine PK-Rente, dein verfügbares Startkapital und dein Vermögensverlauf.</p>'})}</h2><span class="v4-lever-value">${share} % Kapitalbezug</span></div><input id="shareRange" type="range" min="0" max="100" step="1" value="${share}" aria-label="Kapitalbezug in Prozent"><div class="v4-lever-labels"><span>0 % Kapital</span><span>100 % Kapital</span></div>${preview ? `<div class="v4-lever-state"><span id="previewStatus" class="v4-detail-state">Vorschau – noch nicht gespeichert</span><button type="button" class="primary" data-remember>Als aktuellen Plan speichern</button></div>` : ''}${compareEntry()}<p id="v4Error" class="v3-error" role="alert"></p></section>`;
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
    /* Nach der Pensionierung gibt es keinen Kapitalbezug mehr (TC-02.01: «Post-Ansichten ohne
       Bezugsregler») – dann entfällt auch der Varianteneinstieg, statt auf einen toten Screen zu führen. */
    const variants = state.mode === 'pre' ? row(`Meine Varianten · ${count} gespeichert`, 'variants') : '';
    return `<ul class="v4-rows">${row('Jahresverlauf', 'years')}${variants}</ul>`;
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
        age: exhaustionAge(result),
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
    /* Ohne Kapitalbezug (bereits pensioniert) gibt es keine Varianten: der Screen führt zurück
       auf «Mein Plan», statt Übernehmen-Knöpfe zu zeigen, die nur fehlschlagen könnten. */
    if (state.mode !== 'pre') { renderPlan(); return; }
    closeMenu(); route = 'variants'; detailParent = 'plan'; markDirty(); setMenuAvailable(true);
    window.scrollTo(0, 0);
    const target = (evaluated(chosenShare()) ?? {}).plan?.retirement.targetAge ?? '';
    const active = chosenShare();
    /* Der aktuelle Plan steht immer zuerst und offen; alle weiteren Varianten sind zugeklappt und
       zeigen nur ihre Reichweite («reicht bis Alter X» bzw. «geht voraussichtlich auf»). Die
       Kennzahlen kommen auf Tap – dieselbe Karte, nur eingeklappt; «Übernehmen» bleibt direkt
       erreichbar, damit die Auswahl ein Tap bleibt. */
    const order = [...variantShares()].sort((a, b) => (a === active ? -1 : b === active ? 1 : a - b));
    const cards = order.map(share => {
      const item = evaluated(share);
      if (!item) return '';
      const result = item.result;
      const capital = Calculator.calculateAvailableCapital(item.plan, share);
      const sources = Calculator.incomeSourcesAtStart(item.plan);
      const monthly = id => (sources.find(source => source.id === id)?.annualIncome ?? 0) / 12;
      const rents = monthly('ahv') + monthly('pk') + monthly('other');
      const current = share === active;
      const outcome = outcomeOf(item);
      const reach = exhaustionAge(result) ? `Reicht voraussichtlich bis Alter ${exhaustionAge(result)}` : 'Plan geht voraussichtlich auf';
      const line = (label, value) => `<div><dt>${label}</dt><dd>${value}</dd></div>`;
      const head = `<span class="v4-variant-head"><strong>${share} % Kapitalbezug</strong>${current ? `<span class="v4-badge">${Icons.icon('circleCheck', {size:15})} Aktueller Plan</span>` : ''}</span>`;
      const status = `<span class="v4-variant-status ${outcome.tone}">${reach}</span>`;
      const metrics = `<dl>${line('Total-Rente / Monat', money(rents))}${line('Startkapital', money(result.availableCapital))}${exhaustionAge(result) ? line('Reicht bis', `Alter ${exhaustionAge(result)}`) : line(`Restvermögen mit ${target}`, money(horizonValue(item).value))}${line('PK-Rente / Monat', money(item.pension.rent / 12))}${line('PK-Kapital netto', money(capital.netPkCapitalWithdrawal))}${line('Entnahme / Monat', money(result.monthlyGap))}</dl>`;
      if (current) return `<section class="v4-variant current">${head}${status}${metrics}</section>`;
      return `<section class="v4-variant"><details class="v4-variant-fold"><summary class="v4-variant-summary">${head}${status}<span class="v4-variant-chevron" aria-hidden="true">${Icons.icon('chevronDown', {size:18})}</span></summary>${metrics}</details><div class="v4-variant-actions"><button type="button" data-adopt-variant="${share}">Übernehmen</button></div></section>`;
    }).join('');
    app.innerHTML = `${title('Meine Varianten.', variantContext(), detailHead)}<p class="v4-lead">Eine Variante ist immer dein aktueller Plan. Auswahl ausschliesslich über «Übernehmen» – ohne zusätzliche Auswahlknöpfe.</p>${cards}<p id="v4Error" class="v3-error" role="alert"></p>${compareEntry('v4-cmp-entry-last')}`;
    app.querySelectorAll('[data-adopt-variant]').forEach(button => button.addEventListener('click', () => {
      /* «Übernehmen» ist eine planungsrelevante Änderung: sie bestätigt, rechnet neu und führt
         gemäss der globalen Apply-and-return-Regel direkt auf «Mein Plan». */
      try { state = V3State.activate(state, numeric(button.dataset.adoptVariant)); previewShare = null; markDirty(); renderPlan(); }
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
    /* Topf-Zeilen tragen das Icon ihres Topfes (dieselben Icons und Farben wie im Töpfe-Modell):
       so ist auf einen Blick erkennbar, welche Zeile welcher Topf ist. */
    const line = (label, amount, note = '', {icon = '', tone = ''} = {}) => `<div class="v4-year-line${tone ? ` pot-${tone}` : ''}"><span>${icon ? `<span class="v3-pot-icon" aria-hidden="true">${Icons.icon(icon, {size:15})}</span>` : ''}${label}${note ? ` <small>${note}</small>` : ''}</span><strong>${amount}</strong></div>`;
    const potLine = (position, amount, note = '') => line(['Geldmarkt','Obligationen','Wertschöpfung'][position], amount, note, {icon:bucketConfig[position].icon, tone:bucketConfig[position].tone});
    const pot = (position, take) => potLine(position, `${take > 0.5 ? '− ' : ''}${money(Math.abs(take))}`);
    const takes = row.takes ?? [0,0,0];
    /* Nur Töpfe mit Vermögen: «Geldmarkt CHF 0» erklärt nichts. Im Töpfe-Modell gilt dieselbe
       Regel (keine Null-Zeile); bleibt kein Topf übrig, sagt genau eine Zeile das offen. */
    const potRows = amountAt => {
      const rows = [0,1,2].filter(position => numeric(amountAt(position)) > 0.5).map(position => potLine(position, money(numeric(amountAt(position)))));
      return rows.length ? rows.join('') : line('Töpfe leer', money(0));
    };
    const takeRows = () => [0,1,2].filter(position => numeric(takes[position]) > 0.5).map(position => pot(position, numeric(takes[position]))).join('');
    /* Der Jahresverlauf ist eine Übersicht: jeder Abschnitt zeigt zugeklappt genau seine
       Kennzahl (sein Ergebnis) und den Rest erst auf Tap. Gibt es nichts aufzuklappen, bleibt
       es bei einer einzelnen Zeile ohne Chevron. Der offene Zustand bleibt beim Jahreswechsel
       erhalten (`yearState.fold`). */
    const fold = (key, label, amount, body) => body
      ? `<details class="v4-year-fold" data-fold="${key}"${yearState.fold?.[key] ? ' open' : ''}><summary class="v4-year-line"><span>${label}</span><strong>${amount}</strong>${Icons.icon('chevronDown', {size:18})}</summary><div class="v4-year-fold-body">${body}</div></details>`
      : line(label, amount);
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
    /* Das Töpfe-Modell ist einen Tap entfernt: dasselbe Donut-Icon steht direkt neben den
       Überschriften der beiden Vermögensabschnitte und öffnet denselben Dialog wie das Menü –
       aber an der Position, die zur Überschrift gehört (Abschnitt 1 = Jahresanfang,
       Abschnitt 6 = Jahresende). Der frühere Textlink am Seitenende ist damit überflüssig. */
    const potButton = position => `<button type="button" class="v4-year-pot" data-v4-action="pots" data-pot-position="${position}" aria-label="Töpfe-Modell öffnen">${Icons.icon('chartDonut', {size:18})}</button>`;
    /* Die frühere Fusszeile (Variante, Kaufkraft, Annahmen) steht jetzt hinter einem ⓘ in der
       Jahreszeile – die Ansicht selbst bleibt ohne stehenden Erklärtext. */
    const yearInfo = modalInfo({title:'So rechnet diese Ansicht', aria:'Erklärung zur Jahresansicht', body:`<p>${state.mode === 'pre' ? `Variante ${chosenShare()} % Kapitalbezug · ` : ''}Alle Beträge in heutiger Kaufkraft – so bleiben die Jahre untereinander vergleichbar.</p><p>Gerechnet mit den bestehenden Annahmen (Inflation ${percent(item.plan.assumptions.rates.inflation)} %).</p>`});
    app.innerHTML = `${title('Jahr für Jahr.', 'So arbeitet dein Plan im Detail.', detailHead)}<section class="v4-year-nav"><div class="v4-year-slider">${step(-1, 'Ein Jahr früher', 'chevronLeft', first)}<input id="yearRange" type="range" min="${ages[0]}" max="${ages[ages.length - 1]}" step="1" value="${row.age}" aria-label="Alter wählen">${step(1, 'Ein Jahr später', 'chevronRight', last)}</div><div class="v4-year-row"><span class="v4-detail-state">Alter ${value.age + 1}</span><span class="v4-year-meta"><span class="v4-detail-state">${ages.length} Planjahre</span>${yearInfo}</span></div></section><section class="v4-year-block"><h3>1 · Vermögen am Jahresanfang ${potButton('start')}</h3>${fold('start', 'Total', money(value.free), potRows(position => value.buckets?.[position]))}</section><section class="v4-year-block"><h3>2 · Einkommen</h3>${fold('income', 'Netto verfügbar', money(value.rent), `${(value.sources ?? []).filter(source => source.gross > 0.5).map(source => line(esc(source.name), money(source.gross), source.taxable ? 'brutto' : 'nicht steuerbar')).join('')}${line('Einnahmen vor Steuern', money(value.grossIncome))}${line(`Steuern (${percent(rate)} %)`, `− ${money(numeric(value.estimatedIncomeTax))}`)}`)}</section><section class="v4-year-block"><h3>3 · Bedarf netto</h3>${fold('need', value.withdrawal > 0.5 ? 'Fehlbetrag' : 'Überschuss', money(value.withdrawal > 0.5 ? value.withdrawal : Math.max(0, value.rent - value.need - (value.special ?? 0))), `${line('Lebenshaltung netto', money(value.need))}${value.special > 0.5 ? line('Sonderausgabe', money(value.special)) : ''}`)}</section><section class="v4-year-block"><h3>4 · Entnahme aus den Töpfen</h3>${takeRows() ? fold('take', 'Total Entnahme', money(takes.reduce((a, b) => a + b, 0)), takeRows()) : line('Keine Entnahme nötig', money(0))}</section><section class="v4-year-block"><h3>5 · Deine Töpfe (Jahresende)</h3>${fold('pots', 'Rendite dieses Jahres', `${value.ret >= 0 ? '+' : '−'} ${money(Math.abs(value.ret))}`, `${strategyLine}${potRows(position => value.endBuckets?.[position])}${line('Umbuchungen (intern)', money((value.transfers ?? []).reduce((a, b) => a + Math.abs(b), 0)))}`)}</section><section class="v4-year-block"><h3>6 · Vermögen am Jahresende ${potButton('end')}</h3>${fold('end', 'Total', money(value.end), line('Veränderung', `${value.net >= 0 ? '+' : '−'} ${money(Math.abs(value.net))}`))}</section>`;
    document.getElementById('yearRange')?.addEventListener('input', event => { yearState.age = numeric(event.target.value); renderYear(); });
    /* Aufgeklappte Abschnitte bleiben beim Jahreswechsel offen. */
    app.querySelectorAll('.v4-year-fold').forEach(node => node.addEventListener('toggle', () => {
      if (!yearState.fold) yearState.fold = {};
      yearState.fold[node.dataset.fold] = node.open;
    }));
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

  /* ---------------- «Rente oder Kapital?» – Variantenvergleich ----------------
     Der Screen erklärt den Unterschied zwischen zwei gespeicherten Varianten. Es wird nichts neu
     gerechnet: alle Werte kommen aus `evaluatePlan()` (Jahresprojektion), `calculatePension()`,
     `calculateAvailableCapital()` und `incomeSourcesAtStart()` – denselben Quellen wie «Mein
     Plan», der Jahresverlauf und das Töpfe-Modell. Der Screen gibt keine Anlageempfehlung ab,
     übernimmt keine Variante und verändert keine Anlagestrategie oder Töpfe. */
  /* Die gewählte Vergleichsvariante und die Ansicht (Vermögen/Einkommen) sind Nutzereinstellungen
     des Vergleichs und werden – getrennt vom Plan – im Browser gemerkt. Sie tragen dieselbe
     `storageVersion` wie der Plan: ein Stand aus einer neueren Generation wird ignoriert statt
     falsch interpretiert, ein ungültiger Wert fällt auf den Standard zurück. */
  const comparisonStoreKey = 'retirement-v4-compare';
  function readComparisonPrefs() {
    try {
      const prefs = JSON.parse(localStorage.getItem(comparisonStoreKey) ?? '{}') ?? {};
      const generation = Number(prefs.storageVersion);
      if (Number.isInteger(generation) && generation > (V3State.STORAGE_VERSION ?? 0)) return {};
      const share = Number(prefs.share);
      return {share:Number.isInteger(share) && share >= 0 && share <= 100 ? share : null, view:prefs.view === 'income' ? 'income' : 'assets'};
    } catch (error) { return {}; }
  }
  function writeComparisonPrefs() {
    try { localStorage.setItem(comparisonStoreKey, JSON.stringify({storageVersion:V3State.STORAGE_VERSION, share:comparisonState.share, view:comparisonState.view})); } catch (error) { /* Speicher nicht verfügbar */ }
  }
  const comparisonPrefs = readComparisonPrefs();
  const comparisonState = {share:comparisonPrefs.share ?? null, view:comparisonPrefs.view === 'income' ? 'income' : 'assets', last:null};
  /* Einstieg nur, wenn es überhaupt zwei unterschiedliche Varianten gibt. */
  function compareEntry(extraClass = '') {
    if (variantShares().length < 2) return '';
    /* Kompakte Action-Card: Icon links, Titel und Subline, Chevron rechts. Bewusst zwischen den
       sekundären Zeilen (Jahresverlauf/Varianten) und der Karte «Plan optimieren»: mintfarbene
       Fläche mit grünem Rahmen, aber kleiner und ohne Icon-Kachel. */
    return `<button type="button" class="v4-cmp-entry${extraClass ? ` ${extraClass}` : ''}" data-v4-next="compare">`
      + `<span class="v4-cmp-entry-icon" aria-hidden="true">${Icons.icon('arrowsExchange', {size:18})}</span>`
      + `<span class="v4-cmp-entry-copy"><span class="v4-cmp-entry-title">Rente oder Kapital?</span><span class="v4-cmp-entry-line">Vergleiche deinen Plan mit einer anderen Variante</span></span>`
      + `${Icons.icon('chevronRight', {size:18})}</button>`;
  }
  /* ViewModel des Vergleichs – abgeleitet, keine zweite Rechnung. */
  function comparisonOf(item, share) {
    if (!item) return null;
    const result = item.result, plan = item.plan;
    const sources = Calculator.incomeSourcesAtStart(plan);
    const rows = (result.yearlyProjection ?? []).filter(row => !row.terminal);
    const retirement = numeric(plan.retirement.age);
    const phase = rows.filter(row => row.age + 1 >= retirement);
    const exhaustAge = exhaustionAge(result);
    const rowAt85 = rows.find(row => row.age + 1 === 85) ?? null;
    /* «Danach Einkommen»: laufendes Nettoeinkommen (nach Steuern, ohne Kapitalentnahme) im Jahr,
       in dem das frei verfügbare Vermögen aufgebraucht ist – bzw. am Planungshorizont, wenn es
       reicht. `rent` enthält AHV, PK-Rente und weitere dauerhafte Einkommen. */
    const afterRow = (exhaustAge ? rows.find(row => row.age + 1 >= exhaustAge) : null) ?? rows[rows.length - 1] ?? null;
    return {share, label:`${share} % Kapital`,
      netStartCapital:numeric(result.availableCapital),
      netPkPensionMonthly:numeric(sources.find(source => source.id === 'pk')?.annualIncome) / 12,
      capitalWithdrawalTax:numeric(item.pension?.capitalTax),
      annualIncomeTax:numeric(result.incomeTax),
      assetsAt85:rowAt85 ? numeric(rowAt85.end) : null,
      assetsLastUntilAge:exhaustAge,
      postDepletionNetIncomeMonthly:numeric(afterRow?.rent) / 12,
      retirementAge:retirement, targetAge:numeric(plan.retirement.targetAge),
      /* Eine Linie je Ansicht: Vermögen am Jahresende bzw. monatlich verfügbares Einkommen
         (Nettoeinkommen + Kapitalentnahme, solange Vermögen vorhanden ist). */
      /* Monatlich verfügbares Einkommen: Nettoeinkommen plus der tatsächlich entnommene
         Kapitalbetrag (`takes`). Nach dem Aufbrauch des Vermögens fällt die Entnahme weg – dann
         bleibt genau das lebenslange Einkommen sichtbar. */
      series:phase.map(row => ({age:row.age + 1, assets:numeric(row.end), income:(numeric(row.rent) + (row.takes ?? []).reduce((sum, value) => sum + numeric(value), 0)) / 12}))};
  }
  function compareReach(comparison) {
    if (!comparison) return '–';
    return comparison.assetsLastUntilAge ? `Alter ${comparison.assetsLastUntilAge}` : `Alter ${comparison.targetAge}+`;
  }
  /* Fazit: ausschliesslich aus den beiden Vergleichen abgeleitet und ohne Wertung. Die
     Zwei-Zeilen-Aussage gilt nur, wenn genau die Variante mit mehr Kapital auch mindestens so
     lange Vermögen hält und die andere die höhere lebenslange Rente hat; sonst neutral. */
  function compareSummary(a, b) {
    if (!a || !b) return ['Für einen Vergleich fehlen zwei Varianten.'];
    const moreCapital = a.netStartCapital >= b.netStartCapital ? a : b;
    const morePension = a.netPkPensionMonthly >= b.netPkPensionMonthly ? a : b;
    const lastsLonger = numeric(moreCapital.assetsLastUntilAge ?? 999) >= numeric(morePension.assetsLastUntilAge ?? 999);
    const spread = Math.abs(a.netStartCapital - b.netStartCapital) > 1000 && Math.abs(a.netPkPensionMonthly - b.netPkPensionMonthly) > 20;
    if (moreCapital !== morePension && spread && lastsLonger) {
      return ['Mehr Kapital hält in dieser Planung länger Vermögen verfügbar.', 'Mehr Rente gibt dir dafür lebenslang ein höheres Einkommen.'];
    }
    return ['Die Varianten unterscheiden sich vor allem bei verfügbarem Startkapital und lebenslanger PK-Rente.'];
  }
  /* Grafik: zwei Linien in voller Kartenbreite, bewusst ohne CHF-Y-Achse. Beschriftet werden
     Start, Mitte, Alter 85 und der Punkt «Kapital aufgebraucht» – direkt am Punkt, grün über der
     Linie des aktuellen Plans, blau unter der Vergleichslinie. */
  function compareChartSvg(width, a, b, view) {
    const W = Math.max(240, Math.round(width)), H = 126, padTop = 30, padBottom = 24, padX = 12;
    const all = [...(a?.series ?? []), ...(b?.series ?? [])];
    if (!all.length) return '';
    const ages = [...new Set(all.map(point => point.age))].sort((p, q) => p - q);
    const minAge = ages[0], maxAge = ages[ages.length - 1];
    const value = point => view === 'income' ? point.income : point.assets;
    const max = Math.max(1, ...all.map(value));
    const step = Math.pow(10, Math.max(0, String(Math.round(max)).length - 1));
    const nice = Math.ceil(max / step) * step;
    const x = age => padX + (age - minAge) / Math.max(1, maxAge - minAge) * (W - padX * 2);
    const y = amount => padTop + (1 - amount / nice) * (H - padTop - padBottom);
    const path = series => series.map((point, index) => `${index ? 'L' : 'M'}${x(point.age).toFixed(1)} ${y(value(point)).toFixed(1)}`).join(' ');
    const grid = [0.25, 0.5, 0.75, 1].map(share => {
      const line = (padTop + (1 - share) * (H - padTop - padBottom)).toFixed(1);
      return `<line class="grid" x1="${padX}" x2="${W - padX}" y1="${line}" y2="${line}"/>`;
    }).join('');
    /* Genau drei beschriftete Zeitpunkte je Linie: Start · Mitte · Ende (bzw. Aufbrauch). Die
       Punkte dazwischen bleiben als Marker sichtbar, tragen aber keine Zahl – so konkurrenzieren
       die Labels nicht mehr. Das Ende ist `assetsLastUntilAge` aus derselben Projektion wie die
       Summary («Vermögen reicht bis»), damit beide dieselbe Zahl zeigen. */
    const markersFor = (series, endAge) => {
      const change = view === 'income' ? series.find((point, index) => index > 0 && Math.abs(point.income - series[index - 1].income) > 1)?.age : undefined;
      const stop = view === 'income' ? (change ?? maxAge) : (endAge ?? maxAge);
      /* Nach dem Aufbrauch bleibt die Linie auf 0 – dort braucht es keine weitere Marke. */
      const wanted = (view === 'income' ? [minAge, stop] : [minAge, (minAge + maxAge) / 2, stop])
        .filter(age => view === 'income' || endAge === null || endAge === undefined || age <= endAge);
      const picked = [];
      wanted.forEach(target => {
        if (target === null || target === undefined) return;
        const closest = ages.reduce((best, age) => Math.abs(age - target) < Math.abs(best - target) ? age : best, ages[0]);
        if (!picked.some(age => Math.abs(age - closest) < 4)) picked.push(closest);
      });
      return picked.sort((p, q) => p - q);
    };
    /* Beschriftung ohne Überdeckung: jede Marke bekommt eine Box (grün über, blau unter der
       Linie). Kollidiert sie mit einer schon gesetzten Box oder mit einer Linie, rutscht sie
       schrittweise weiter nach aussen; findet sie keinen Platz, entfällt sie – lieber ein Label
       weniger als übereinanderliegende Zahlen. */
    const seriesList = [[a?.series ?? [], 'current', a?.assetsLastUntilAge], [b?.series ?? [], 'second', b?.assetsLastUntilAge]];
    const candidates = [];
    seriesList.forEach(([series, tone, endAge]) => { const order = []; return markersFor(series, endAge).forEach(age => {
      const point = series.find(entry => entry.age === age);
      if (!point) return;
      const amount = value(point);
      const zero = view === 'assets' && amount <= 1;
      const text = zero ? `0 mit ${age}` : money(amount);
      candidates.push({tone, age, amount, text, zero, index:order.length, width:Math.min(W - 8, Math.round(text.length * 5.7) + 14)});
      order.push(age);
    }); });
    /* Reihenfolge: erst die Aufbrauchmarke (die Kernaussage), dann abwechslungsweise je Linie
       die nächste Marke – so bekommen beide Varianten ihre Labels. */
    const priority = entry => (entry.zero ? -1 : entry.index) * 2 + (entry.tone === 'current' ? 0 : 1);
    candidates.sort((p, q) => priority(p) - priority(q));
    const boxes = [];
    const hits = box => boxes.some(other => !(box.right < other.left || other.right < box.left || box.bottom < other.top || other.bottom < box.top));
    const covers = box => all.some(point => {
      const px = x(point.age), py = y(value(point));
      return px >= box.left - 2 && px <= box.right + 2 && py >= box.top - 2 && py <= box.bottom + 2;
    });
    const placed = [];
    candidates.forEach(entry => {
      const dotX = x(entry.age), dotY = y(entry.amount);
      /* Ein Wertelabel gehört zu genau einem Datenpunkt: es sitzt waagerecht **zentriert über
         seinem Punkt** (labelX = pointX). Bei Überdeckung weicht es ausschliesslich **vertikal**
         aus – zuerst weiter nach oben, zur Not unter die Linie. Nur wenn es am linken/rechten Rand
         abgeschnitten würde, rutscht es innerhalb der Chartgrenze und bekommt eine Leader-Line
         zum Punkt. Findet es keinen freien Platz, entfällt es (lieber kein Label als ein falsch
         zugeordnetes). */
      const wanted = dotX - entry.width / 2;
      const left = Math.min(Math.max(wanted, 2), W - entry.width - 2);
      const leader = Math.abs(left - wanted) > 0.5;
      const offsets = [];
      for (let step = 0; step <= 12; step++) { offsets.push(-9 * step); if (step > 0) offsets.push(9 * step); }
      for (const offset of offsets) {
        const top = dotY - 27 + offset;
        if (top < 2 || top + 17 > H - padBottom - 3) continue;
        const box = {left, right:left + entry.width, top, bottom:top + 17};
        if (hits(box) || covers(box)) continue;
        boxes.push(box);
        placed.push({...entry, ...box, dotX, dotY, leader});
        return;
      }
    });
    /* X-Achse = die beschrifteten Zeitpunkte: Start, der **gemeinsame Vergleichspunkt** (Mitte),
       der Aufbrauch beider Varianten und der Planungshorizont. Keine zusätzlichen Zehnjahreswerte –
       so entspricht jede Zahl genau einem Punkt im Chart. */
    const markerAges = [...new Set(seriesList.flatMap(([series, tone, endAge]) => markersFor(series, endAge)))].sort((p, q) => p - q);
    const ticks = [...new Set([...markerAges, minAge, maxAge])].sort((p, q) => p - q);
    const labelledTicks = ticks.filter((age, index) => index === 0 || age - ticks[index - 1] >= 2);
    const tickLabels = labelledTicks.map(age => `<text class="tick" x="${x(age).toFixed(1)}" y="${H - 7}" text-anchor="middle">${age}</text>`).join('');
    const dots = seriesList.map(([series, tone, endAge]) => markersFor(series, endAge).map(age => {
      const point = series.find(entry => entry.age === age);
      if (!point) return '';
      return `<circle class="dot-${tone}" cx="${x(age).toFixed(1)}" cy="${y(value(point)).toFixed(1)}" r="3.2"/>`;
    }).join('')).join('');
    /* Leader-Line nur, wenn das Label am Rand verschoben werden musste. */
    const leaders = placed.filter(entry => entry.leader).map(entry => {
      const fromX = entry.dotX < entry.left ? entry.left : entry.right;
      return `<line class="leader leader-${entry.tone}" x1="${fromX.toFixed(1)}" y1="${(entry.top + 8.5).toFixed(1)}" x2="${entry.dotX.toFixed(1)}" y2="${entry.dotY.toFixed(1)}"/>`;
    }).join('');
    const pills = placed.map(entry => `<g class="pill pill-${entry.tone}"><rect x="${entry.left.toFixed(1)}" y="${entry.top.toFixed(1)}" width="${entry.width}" height="17" rx="4"/>`
      + `<text x="${(entry.left + entry.width / 2).toFixed(1)}" y="${(entry.top + 12.4).toFixed(1)}" text-anchor="middle">${esc(entry.text)}</text></g>`).join('');
    return `<svg class="v4-cmp-chart" viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" aria-label="${view === 'income' ? 'Monatliches Einkommen' : 'Vermögensentwicklung'} im Vergleich">`
      + grid + tickLabels
      + `<path class="line-second" d="${path(b?.series ?? [])}"/>` + `<path class="line-current" d="${path(a?.series ?? [])}"/>`
      + leaders + dots + pills + '</svg>';
  }
  /* Berechnungsbasis: dieselben Annahmen wie «Annahmen & Berechnung», kompakt zusammengefasst. */
  function compareAssumptions() {
    const plan = planFor(chosenShare());
    const rates = plan?.assumptions?.rates ?? {};
    const profile = globalThis.RiskProfiles?.getRiskProfile(plan?.riskProfile ?? state.riskProfile);
    const canton = State.canton(state);
    const strategy = `${strategyLabels[profile?.key] ?? profile?.label ?? '–'} · ${percent(numeric(profile?.expectedRealReturn) * 100)} % pro Jahr`;
    return {
      /* Kurzzeile für die zugeklappte Zeile (ohne Beschriftungen, ohne Inflation – die steht
         ausgeschrieben im aufgeklappten Teil). */
      short:[`${canton || 'Kanton geschätzt'}`, `${percent(rates.uws)} %`, `${strategyLabels[profile?.key] ?? profile?.label ?? '–'}`, `bis ${plan?.retirement?.targetAge ?? '–'}`],
      rows:[['Pensionierungsalter', state.mode === 'post' ? 'bereits pensioniert' : `Alter ${plan?.retirement?.age ?? '–'}`],
        ['Planungshorizont', `Alter ${plan?.retirement?.targetAge ?? '–'}`],
        ['Wohnkanton', canton || 'geschätzt (mittleres Kantonsmodell)'],
        ['Umwandlungssatz PK', `${percent(rates.uws)} %`],
        ['PK-Verzinsung', `${percent(rates.pkInterest)} %`],
        ['Säule 3a', `${percent(rates.p3Return)} %`],
        ['Anlagestrategie', strategy],
        ['Inflation', `${percent(rates.inflation)} %`],
        ['Wertschriftenrendite bis Pensionierung', `${percent(assumedSecuritiesRate())} %`],
        ['Zahlenwelt', 'heutige Kaufkraft (real)']]
    };
  }
  function renderCompare() {
    closeMenu(); route = 'comparison'; detailParent = 'plan'; markDirty(); setMenuAvailable(true);
    window.scrollTo(0, 0);
    const active = chosenShare();
    const others = variantShares().filter(share => share !== active);
    if (!others.length) { renderPlan(); return; }
    if (!others.includes(comparisonState.share)) { comparisonState.share = others[0]; writeComparisonPrefs(); }
    const current = comparisonOf(evaluated(active), active);
    const other = comparisonOf(evaluated(comparisonState.share), comparisonState.share);
    comparisonState.last = {current, other};
    const summary = compareSummary(current, other);
    const basis = compareAssumptions();
    const cantonNote = hasCanton() ? '' : ' · geschätzt';
    const values = comparison => `<dl class="v4-cmp-values"><div><dt>Startkapital netto</dt><dd>${money(comparison.netStartCapital)}</dd></div><div><dt>PK-Rente netto / Mt.</dt><dd>${money(comparison.netPkPensionMonthly)}</dd></div><div><dt>Vermögen reicht bis</dt><dd>${compareReach(comparison)}</dd></div></dl>`;
    /* Beide Karten haben genau drei Zeilen (Badge · Auswahl/Untertitel · Werte), damit die
       Kennzahlen untereinander exakt auf derselben Höhe stehen. */
    const cards = `<div class="v4-cmp-cards">`
      + `<section class="v4-cmp-card current"><span class="v4-cmp-badge">${Icons.icon('circleCheck', {size:15})} Aktueller Plan</span><span class="v4-cmp-sub">${current.label}</span>${values(current)}</section>`
      + `<section class="v4-cmp-card second"><span class="v4-cmp-badge"><span class="v4-cmp-dot" aria-hidden="true"></span> Variante</span>`
      + `<label class="v4-cmp-select"><span class="v3-visually-hidden">Variante wählen</span><select data-cmp-share aria-label="Variante wählen">${others.map(share => `<option value="${share}"${share === comparisonState.share ? ' selected' : ''}>${share} % Kapital</option>`).join('')}</select>${Icons.icon('chevronDown', {size:14})}</label>`
      + `${values(other)}</section></div>`;
    const view = comparisonState.view;
    const row = (icon, label, note, a, b, info = '') => `<div class="v4-cmp-row"><span class="v4-cmp-row-icon" aria-hidden="true">${Icons.icon(icon, {size:16})}</span>`
      + `<span class="v4-cmp-row-label">${label}${note ? ` <small>${note}</small>` : ''}${info}</span>`
      + `<span class="v4-cmp-val current">${a}</span><span class="v4-cmp-val second">${b}</span></div>`;
    const infoAfter = modalInfo({title:'Danach Einkommen', aria:'Danach Einkommen erklären', body:`<p><strong>Danach Einkommen</strong> – Einkommen, das dir weiterhin zur Verfügung steht, nachdem dein frei verfügbares Vermögen aufgebraucht ist.</p><p>Enthalten sind AHV, PK-Rente und weitere dauerhafte Einkommen – netto nach Steuern und <strong>ohne</strong> Kapitalentnahme. Die Zahl stammt aus dem Jahr, in dem das Vermögen aufgebraucht ist (bzw. aus dem Planungshorizont, wenn es reicht).</p>`});
    const infoTax = modalInfo({title:'Steuern im Vergleich', aria:'Steuern im Vergleich erklären', body:`<p>Die <strong>Kapitalsteuer</strong> ist die geschätzte einmalige Steuer auf dem PK-Kapitalbezug deines Wohnkantons; die <strong>laufende Einkommensteuer</strong> ist die geschätzte Jahressteuer im ersten Planjahr (Pensionierungsjahr).</p><p>Beide Werte kommen aus dem kantonalen Steuermodell der App – keine eigene Steuerformel für diesen Screen.</p>`});
    /* Unterhalb der Grafik ist alles eingeklappt: der Screen bleibt eine Übersicht und passt
       auf einen Screen. Die Zusammenfassungen nennen, was drinsteckt. */
    const details = `<details class="v4-cmp-fold"><summary><span class="v4-cmp-fold-head">Die wichtigsten Unterschiede</span><span class="v4-cmp-fold-line">Kapitalsteuer · Startkapital · PK-Rente · Steuern · Vermögen · Danach Einkommen</span>${Icons.icon('chevronDown', {size:18})}</summary><div class="v4-cmp-rows">`
      + row('receiptTax', 'Kapitalsteuer', `beim Bezug${cantonNote}`, money(current.capitalWithdrawalTax), money(other.capitalWithdrawalTax), infoTax)
      + row('wallet', 'Verfügbares Startkapital', 'nach Steuern', money(current.netStartCapital), money(other.netStartCapital))
      + row('buildingBank', 'PK-Rente netto', 'pro Monat', money(current.netPkPensionMonthly), money(other.netPkPensionMonthly))
      + row('receiptTax', 'Laufende Einkommensteuer', `pro Jahr${cantonNote}`, money(current.annualIncomeTax), money(other.annualIncomeTax))
      + row('trendingUp', 'Vermögen mit 85', '', current.assetsAt85 === null ? '–' : money(current.assetsAt85), other.assetsAt85 === null ? '–' : money(other.assetsAt85))
      + row('target', 'Vermögen reicht bis', '', compareReach(current), compareReach(other))
      + row('chartLine', 'Danach Einkommen', 'netto / Mt.', money(current.postDepletionNetIncomeMonthly), money(other.postDepletionNetIncomeMonthly), infoAfter)
      + `</div></details>`;
    const chartCard = `<section class="v4-cmp-chart-card"><div class="v4-cmp-chart-head"><h2>${view === 'income' ? 'Einkommensentwicklung' : 'Vermögensentwicklung'}</h2>`
      + `<div class="v4-cmp-seg" role="group" aria-label="Ansicht wählen"><button type="button" class="v4-cmp-seg-item" data-cmp-view="assets" aria-pressed="${view === 'assets'}">Vermögen</button><button type="button" class="v4-cmp-seg-item" data-cmp-view="income" aria-pressed="${view === 'income'}">Einkommen</button></div></div>`
      + `<p class="v4-cmp-legend"><span class="current">Aktueller Plan · ${current.label}</span><span class="second">Variante · ${other.label}</span></p>`
      + `<div class="v4-cmp-canvas" id="v4CmpCanvas"></div>`
      + `<p class="v4-cmp-hint">${Icons.icon('infoCircle', {size:15})} Wichtig: Wenn das freie Vermögen aufgebraucht ist, laufen AHV und PK-Rente weiter.</p></section>`;
    /* Klar als Beratungs-CTA erkennbar (nicht als Informations-Accordion): mintfarbene Fläche,
       grüner Rahmen, dunkelgrüner Titel und rechts «Individuell besprechen →» statt Chevron. */
    const advice = `<button type="button" class="v4-cmp-cta-row" data-v4-action="advisor"><span class="v4-cmp-cta-icon" aria-hidden="true">${Icons.icon('arrowUpRight', {size:18})}</span><span class="v4-cmp-cta-title">Und deine Anlagestrategie?</span><span class="v4-cmp-cta-line">Passt deine Strategie zu Rente, Bedarf und Anlagehorizont?</span><span class="v4-cmp-cta-action">Individuell besprechen <span aria-hidden="true">→</span></span></button>`;
    const basisBlock = `<details class="v4-cmp-basis"><summary><span class="v4-cmp-basis-head">${Icons.icon('adjustments', {size:16})} So haben wir gerechnet</span><span class="v4-cmp-basis-line">${basis.short.map(esc).join(' · ')}</span>${Icons.icon('chevronDown', {size:18})}</summary><div class="v4-cmp-basis-body">${infoRows(basis.rows)}<p class="v4-info-source">Beide Varianten werden mit denselben Angaben und derselben Anlagestrategie gerechnet; nur der PK-Kapitalanteil unterscheidet sich. Der Vergleich verändert weder deinen Plan noch deine Töpfe.</p></div></details>`;
    app.innerHTML = `${title('Rente oder Kapital?', 'Zwei Varianten im Vergleich.', detailHead)}<div class="v4-cmp"><div class="v4-cmp-cards-wrap">${cards}<p class="v4-cmp-summary"><span class="v4-cmp-summary-icon" aria-hidden="true">${Icons.icon('arrowsExchange', {size:18})}</span><span>${summary.map(esc).join('<br>')}</span></p></div>${chartCard}${details}${advice}${basisBlock}</div>`;
    const canvas = document.getElementById('v4CmpCanvas');
    if (canvas) canvas.innerHTML = compareChartSvg(canvas.clientWidth || 320, current, other, view);
    app.querySelector('[data-cmp-share]')?.addEventListener('change', event => { comparisonState.share = numeric(event.target.value); writeComparisonPrefs(); renderCompare(); });
    app.querySelectorAll('[data-cmp-view]').forEach(button => button.addEventListener('click', () => { comparisonState.view = button.dataset.cmpView; writeComparisonPrefs(); renderCompare(); }));
  }
  /* Breite ändert sich (Rotation, Fenstergröße): nur die Grafik neu zeichnen, nicht der Screen. */
  let comparisonResizeTimer = null;
  window.addEventListener('resize', () => {
    if (route !== 'comparison' || !comparisonState.last) return;
    clearTimeout(comparisonResizeTimer);
    comparisonResizeTimer = setTimeout(() => {
      const canvas = document.getElementById('v4CmpCanvas');
      if (canvas) canvas.innerHTML = compareChartSvg(canvas.clientWidth || 320, comparisonState.last.current, comparisonState.last.other, comparisonState.view);
    }, 180);
  });

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
    /* «Meine Varianten» ist an den Kapitalbezug gebunden und erscheint nur vor der Pensionierung. */
    const variants = document.querySelector('#v4Menu [data-menu-page="variants"]');
    if (variants) variants.hidden = state.mode !== 'pre';
    /* Sichtbare App-Version im Pilotbereich: Tester können ihre Version nennen. */
    const version = document.getElementById('v4Version');
    if (version && !version.textContent.trim()) version.textContent = `App-Version ${globalThis.V4Version?.label?.() ?? 'unbekannt'}`;
    if (!available) closeMenu();
  }
  function returnToPlan() { closeMenu(); previewShare = null; markDirty(); renderPlan(); }
  /* ---------------- Pilot: Feedback und Zurücksetzen (dezent unten im Menü) ----------------
     Beide Einträge sind bewusst keine Navigationsziele der App, sondern Werkzeuge für das
     Pilottesting: Rückmeldung geben und wieder bei null starten. */
  /* ---------------- Pilot: Angaben für die Beratung, Plan zurücksetzen ----------------
     Zwei Werkzeuge unten im Menü. «Angaben für die Beratung» bereitet den Plan als Klartext
     auf, den der Nutzer kopieren oder als Datei speichern und selbst verschicken kann –
     nichts wird automatisch gesendet, und es ist sichtbar, was drinsteht. */
  const pad = value => String(value ?? '').padEnd(0, ' ');
  const reportLine = (label, value, note = '') => `${label}: ${value}${note ? `   ${note}` : ''}`;
  /* Klartext-Bericht aus demselben Zustand und Rechenkern wie die Oberfläche. */
  function advisorReport(item = evaluated(previewShare ?? chosenShare())) {
    const when = new Date();
    const stamp = `${String(when.getDate()).padStart(2, '0')}.${String(when.getMonth() + 1).padStart(2, '0')}.${when.getFullYear()}, ${String(when.getHours()).padStart(2, '0')}:${String(when.getMinutes()).padStart(2, '0')}`;
    const out = [];
    const h = text => { out.push('', text, '─'.repeat(Math.max(24, text.length))); };
    const pre = state.mode === 'pre';
    const known = dataKnown(), amounts = captured();
    const ahv = Estimates ? Estimates.ahvOf(state) : {origin:'estimated', monthly:0};
    const profile = globalThis.RiskProfiles?.getRiskProfile(state.riskProfile);
    const plan = state.details.assumptions ?? {};
    const a = state.details.assets ?? {}, p3 = state.details.pension3a ?? {}, pension = state.details.pension ?? {};
    const inAge = value => entered(value) ? `${numeric(value)} Jahre` : 'nicht erfasst';
    const amount = value => entered(value) ? money(numeric(value)) : 'noch nicht erfasst';

    out.push('Ruhestands-Check – Angaben für die Beratung');
    out.push(`Erstellt: ${stamp}`);
    out.push('Alle Beträge in heutiger Kaufkraft (real). Modellrechnung, keine Steuer- oder Anlageberatung.');

    h('PERSON UND ZEITRAUM');
    out.push(reportLine('Alter heute', inAge(state.values.age)));
    out.push(reportLine('Pensionierung mit', state.values.retirement !== undefined ? `${numeric(state.values.retirement)}` : (pre ? 'nicht erfasst' : 'bereits pensioniert')));
    out.push(reportLine('Planungshorizont bis', state.targetAge !== undefined && state.targetAge !== null ? `${numeric(state.targetAge)}` : 'automatisch'));
    out.push(reportLine('Wohnkanton', State.canton(state) || 'nicht erfasst'));
    out.push(reportLine('Situation', pre ? 'vor der Pensionierung' : 'bereits pensioniert'));

    if (item) {
      const sources = Calculator.incomeSourcesAtStart(item.plan).filter(source => source.annualIncome > 0.5);
      h('EINKOMMEN IM ERSTEN PLANJAHR');
      if (!sources.length) out.push(reportLine('Einnahmen', 'keine erfasst'));
      sources.forEach(source => out.push(reportLine(source.name, `${money(source.annualIncome / 12)} / Monat`, source.id === 'ahv' && ahv.origin === 'estimated' ? '(geschätzte AHV-Pauschale)' : '')));
      out.push(reportLine('Einkommen brutto', `${money(numeric(item.result.incomeGross) / 12)} / Monat`));
      out.push(reportLine('Geschätzte Steuern', `− ${money(numeric(item.result.incomeTax) / 12)} / Monat`, `(kantonales Modell ${State.canton(state) || '–'})`));
      out.push(reportLine('Einkommen netto', `${money(Math.round(numeric(item.result.monthlyIncomeNet)))} / Monat`));

      const needMonthly = Math.round(numeric(item.result.monthlyNeed)), incomeMonthly = Math.round(numeric(item.result.monthlyIncomeNet));
      const fromWealth = Math.max(0, needMonthly - incomeMonthly);
      h('BEDARF UND ENTNAHME');
      out.push(reportLine('Bedarf netto', `${money(needMonthly)} / Monat`));
      out.push(reportLine('Aus Vermögen', `${money(fromWealth)} / Monat`, fromWealth > 0 ? '(= Bedarf − Einkommen netto)' : '(Einkommen deckt den Bedarf)'));

      h('VERMÖGEN ZUM PENSIONIERUNGSZEITPUNKT');
      out.push(reportLine('PK-Guthaben heute', amount(pension.pk)));
      out.push(reportLine('PK-Beiträge pro Jahr', amount(pension.pkContrib)));
      out.push(reportLine('PK-Kapitalbezug', `${chosenShare()} %`, `(Varianten ${variantShares().join(' / ')} %)`));
      out.push(reportLine('PK-Kapital netto', money(Calculator.calculateAvailableCapital(item.plan, chosenShare()).netPkCapitalWithdrawal)));
      out.push(reportLine('Säule 3a Guthaben', amounts.p3 !== null ? money(amounts.p3) : 'noch nicht erfasst'));
      out.push(reportLine('Säule 3a Beiträge pro Jahr', amounts.p3Contrib ? money(amounts.p3Contrib) : 'keine erfasst'));
      out.push(reportLine('Bank / liquide Mittel', amount(a.cash)));
      out.push(reportLine('Wertschriften', amount(a.securities)));
      out.push(reportLine('Weitere Positionen', amount(a.otherAssets)));
      /* Das freie Kapital aus dem Schnellstart steckt nicht in den Einzelpositionen – ohne
         diese Zeile klaffte zwischen den Positionen und dem Startkapital eine Lücke. */
      if (amounts.free > 0) out.push(reportLine('Frei verfügbares Kapital', money(amounts.free), state.details.assets ? '(Summe der Positionen)' : '(Angabe aus dem Schnellstart, nicht weiter aufgeteilt)'));
      out.push(reportLine('Immobilienwert', amount(a.propertyValue), '(gebundenes Vermögen)'));
      out.push(reportLine('Hypotheken', amount(a.mortgage)));
      if (amounts.property > 0) out.push(reportLine('Immobilien netto', money(amounts.property)));
      out.push(reportLine('Startkapital', money(numeric(item.result.availableCapital))));

      const allocation = roundedParts(item.result.bucketAllocation ?? [], item.result.availableCapital);
      h('AUFTEILUNG AUF DIE TÖPFE (Modell)');
      ['Geldmarkt','Obligationen','Wertschöpfung'].forEach((name, position) => out.push(reportLine(name, money(allocation[position] ?? 0))));

      h('ERGEBNIS');
      out.push(reportLine('Reicht bis', reachAge(item.result, item.plan.retirement.targetAge)));
      if (!exhaustionAge(item.result)) out.push(reportLine('Restvermögen am Planungshorizont', money(horizonValue(item).value)));
    }

    h('ANNAHMEN');
    out.push(reportLine('Anlagestrategie', profile ? `${profile.label} · ${percent(numeric(profile.expectedRealReturn) * 100)} % pro Jahr` : 'nicht erfasst', state.strategyChosen === true ? '(vom Nutzer gewählt)' : '(Modellannahme)'));
    out.push(reportLine('Inflation', `${percent(numeric(plan.inflation ?? State.defaults.inflation))} % pro Jahr`));
    out.push(reportLine('PK-Verzinsung bis Pensionierung', `${percent(numeric(plan.pkInterest ?? State.defaults.pkInterest))} %`));
    out.push(reportLine('3a-Rendite bis Pensionierung', `${percent(numeric(plan.p3Return ?? State.defaults.p3Return))} %`));
    out.push(reportLine('Wertschriftenrendite bis Pensionierung', `${percent(assumedSecuritiesRate())} %`, '(interner Produktsatz)'));

    if (variantShares().length > 1) {
      h('VARIANTEN (PK-Kapitalbezug)');
      variantShares().forEach(share => out.push(reportLine(`${share} % Kapitalbezug`, share === chosenShare() ? 'aktueller Plan' : 'gespeicherte Variante')));
    }

    out.push('', 'Erstellt mit dem Ruhestands-Check. Die Werte stammen aus dem gemeinsamen Rechenkern und den oben genannten Annahmen.', '');
    return out.join('\n');
  }
  function openAdvisorModal() {
    const body = `<p class="v3-modal-lead">Diese Zusammenfassung ist für dein Beratungsgespräch gedacht. Kopiere sie oder speichere sie als Datei – sie wird <strong>nicht</strong> automatisch verschickt.</p><label class="v4-report-label" for="v4Report">Deine Angaben</label><textarea id="v4Report" class="v4-report" rows="14" readonly spellcheck="false">${esc(advisorReport())}</textarea><p class="v4-info-source">Enthalten sind Person und Zeitraum, Einkommen, Bedarf, Vermögen, das Ergebnis sowie die verwendeten Annahmen – geschätzte Werte sind als solche bezeichnet. Du kannst den Text vor dem Kopieren bearbeiten.</p><div class="v4-hebel-actions"><button type="button" class="primary v4-block-action" data-report-copy>Text kopieren</button><button type="button" class="v4-chip" data-report-save>Als Datei speichern</button></div><p class="v4-report-state" id="v4ReportState" role="status"></p>`;
    openModal({modalTitle:'Angaben für die Beratung', modalBody:body});
  }
  async function copyAdvisorReport() {
    const field = document.getElementById('v4Report');
    const note = document.getElementById('v4ReportState');
    if (!field) return;
    /* Zuerst markieren: damit funktioniert «Kopieren» auch ohne Clipboard-API (und der
       Nutzer kann jederzeit mit Ctrl/Cmd + C nachhelfen). Danach der bequeme Weg. */
    field.removeAttribute('readonly');
    field.focus();
    field.select();
    if (note) note.textContent = 'Text ist markiert – mit Ctrl/Cmd + C kopieren.';
    try {
      if (!navigator.clipboard?.writeText) return;
      await navigator.clipboard.writeText(field.value);
      if (note) note.textContent = 'Kopiert – jetzt in deine E-Mail einfügen.';
    } catch (error) { /* Auswahl bleibt bestehen; Hinweis oben steht schon */ }
  }
  function saveAdvisorReport() {
    const text = document.getElementById('v4Report')?.value ?? advisorReport();
    const stamp = new Date().toISOString().slice(0, 10);
    try {
      const url = URL.createObjectURL(new Blob([text], {type:'text/plain;charset=utf-8'}));
      const link = document.createElement('a');
      link.href = url; link.download = `ruhestands-check-angaben-${stamp}.txt`;
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      const note = document.getElementById('v4ReportState');
      if (note) note.textContent = 'Datei gespeichert.';
    } catch (error) { /* Download nicht möglich – der Text bleibt zum Kopieren */ }
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
    /* Das Töpfe-Modell zeigt den Zustand EINES Planjahres – gelesen aus der zentralen
       Jahresprojektion (`yearlyProjection`), nach Entnahme, Rendite und Umbuchungen. Es wird
       hier nichts neu gerechnet, und die Aufteilung wird nie aus der Anlagestrategie
       abgeleitet (die Strategie liefert nur die Renditeannahme, siehe Card unten). */
    /* Zwei Positionen desselben Jahres, eine Rechnung: der Einstieg über Abschnitt 1 zeigt den
       Jahresanfang (`buckets` mit dem frei verfügbaren Vermögen `free`), der Einstieg über
       Abschnitt 6 das Jahresende (`endBuckets` / `end`). Der Menüeintrag zeigt immer den
       Jahresanfang des ersten Planjahres – genau die Sicht des Icons an Abschnitt 1 im ersten
       Jahr, damit der Einstieg aus dem Menü stabil und vergleichbar bleibt. */
    const fromScreen = !!trigger;
    const atStart = !fromScreen || trigger.dataset.potPosition === 'start';
    const row = potsYear(item, {first: !fromScreen});
    const values = row ? (atStart ? (row.buckets ?? []) : (row.endBuckets ?? [])) : (item.result.bucketAllocation ?? []);
    const total = row ? numeric(atStart ? row.free : row.end) : numeric(item.result.availableCapital);
    const amounts = roundedParts(values, total), percents = roundedParts(values.map(value => total > 0 ? numeric(value) / total * 100 : 0), 100);
    /* Nur die Töpfe zeigen, in denen tatsächlich Vermögen liegt: bei einem einzigen Topf wäre
       eine Drei-Töpfe-Darstellung mit zwei leeren Zeilen irreführend. */
    const all = bucketConfig.map((bucket, index) => ({...bucket, value:numeric(values[index]), amount:amounts[index], percent:percents[index]}));
    const shown = all.filter(entry => entry.amount > 0 || entry.percent > 0);
    const lead = total <= 0
      ? 'Für dieses Jahr ist kein Vermögen mehr vorhanden.'
      : shown.length === 1
        ? `Dein frei verfügbares Vermögen liegt in diesem Jahr vollständig in der ${shown[0].label}.`
        : shown.length === 2
          ? `Dein frei verfügbares Vermögen liegt in diesem Jahr in zwei von drei Töpfen: ${shown.map(entry => entry.label).join(' und ')}.`
          : 'Dein frei verfügbares Vermögen ist in diesem Jahr auf drei Töpfe verteilt.';
    /* Das Planjahr wird im Dialog genannt: das Modell ist kein statischer Startzustand. */
    const yearLine = row
      ? `<p class="v4-pot-year">Alter ${numeric(row.age) + 1} · Jahr ${planCalendarYear(item.plan, row)} <span>Stand am ${atStart ? 'Anfang' : 'Ende'} dieses Jahres</span></p>`
      : '';
    /* Zentrum hell und neutral, Text in Navy: Label «Frei verfügbares Vermögen», darunter der Betrag. */
    const chart = shown.length
      ? `<div class="v3-donut-wrap">${donutSvg(shown)}<div class="v3-donut-total"><span>Frei verfügbares Vermögen</span><strong>${money(total)}</strong></div></div>`
      : '';
    /* Genau drei kompakte Zeilen: Icon, Name, Betrag, Prozentanteil. Die Erklärung zu jedem
       Topf hängt als ⓘ an der Zeile – kein zweiter Erklärblock, keine Wiederholung. */
    const rows = shown.length
      ? `<ul class="v3-donut-legend">${shown.map(entry => `<li class="pot-${entry.tone}"><span class="v3-pot-icon" aria-hidden="true">${Icons.icon(entry.icon, {size:20})}</span><span class="v3-pot-name">${entry.label}</span><strong>${money(entry.amount)}</strong><small>${entry.percent} %</small>${modalInfo({title:`Topf ${entry.label}`, aria:`${entry.label} erklären`, body:`<p><strong>${entry.label}</strong> – ${esc(entry.note)}</p><p>${row ? `Am ${atStart ? 'Anfang' : 'Ende'} von Alter ${numeric(row.age) + 1} enthält dieser Topf ${money(entry.amount)} (${entry.percent} % deines frei verfügbaren Vermögens).` : `Der Topf enthält ${money(entry.amount)} (${entry.percent} % deines frei verfügbaren Vermögens).`} Die Beträge stammen aus der Jahresrechnung; sie verschieben sich mit Entnahmen, Rendite und Umbuchungen.</p>`})}</li>`).join('')}</ul>`
      : '';
    const body = `${yearLine}<p class="v3-modal-lead">${lead}</p>${chart}${rows}${potsStrategy(item)}<button type="button" class="primary v3-modal-action" data-modal-close>Schliessen</button>`;
    openModal({dataset:{modalTitle:'Das Töpfe-Modell', modalBody:body}, currentTarget:trigger});
  }
  /* Das im Jahresverlauf gewählte Planjahr; ohne Auswahl das erste Planjahr. Beides kommt aus
     derselben Projektion wie die Jahresansicht – niemals eine zweite Wahrheit. */
  function potsYear(item, {first = false} = {}) {
    const rows = (item?.result?.yearlyProjection ?? []).filter(row => !row.terminal);
    if (!rows.length) return null;
    if (first) return rows[0];
    return rows.find(row => row.age === yearState.age) ?? rows[0];
  }
  /* Kalenderjahr eines Planjahres: aus dem heutigen Jahr und dem Alter abgeleitet (der Plan
     startet heute). Reine Einordnung im Dialog, keine Finanzrechnung. */
  function planCalendarYear(plan, row) {
    return new Date().getFullYear() + (numeric(row.age) + 1 - numeric(plan?.person?.currentAge));
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

  /* ---------------- Laden/Start ----------------
     Drei Fälle, drei Reaktionen (kein manuelles Löschen durch Tester):
       1. Stand passt (ggf. migriert) → laden; migrierte Stände sofort in der neuen Hülle speichern.
       2. Stand ist defekt/zu alt → **sichern** (Backup-Schlüssel), Hauptschlüssel räumen,
          sichtbar melden, mit frischem Plan starten. Speichern bleibt erlaubt.
       3. Stand stammt aus einer **neueren** Version → nichts anfassen, Speichern blockieren
          (damit der neuere Stand nicht überschrieben wird) und sichtbar melden. */
  function load() {
    let raw = null;
    try { raw = localStorage.getItem(storageKey); } catch (error) { raw = null; }
    if (!raw) return false;
    const result = V3State.restore(raw);
    if (!result.ok) {
      if (result.reason === 'newer') {
        storageBlocked = true;
        notice(`${result.message} Dieser Plan wird nicht überschrieben.`, {id:'storage-newer', tone:'warn'});
      } else {
        storageBlocked = false;
        const backup = parkPlan(raw);
        globalThis.__v4StorageReset = {reason:result.reason, backup, at:new Date().toISOString()};
        notice(`Dein gespeicherter Plan liess sich mit dieser Version nicht mehr öffnen und wurde gesichert. Du startest mit einem frischen Plan.`, {id:'storage-reset', tone:'warn'});
      }
      return false;
    }
    state = result.state; previewShare = null; lastSavedAt = result.record.savedAt; storageBlocked = false; storageFailed = false;
    /* Migrierte Stände beim Start einmal in der aktuellen Hülle ablegen. */
    if (result.migrated) globalThis.__v4StorageMigrated = true;
    if (state.position === 'variants') renderVariants();
    else if (state.position === 'comparison') renderCompare();
    else if (state.position === 'years') renderYear();
    else if (state.position === 'improve') renderImprove();
    else if (state.position === 'basics') renderBasics();
    else if (['plan','rents','need','compare'].includes(state.position)) returnToPlan();
    else openDetail(state.position);
    if (result.migrated) markDirty();
    return true;
  }

  document.addEventListener('click', event => {
    const modal = event.target.closest('[data-modal]');
    if (modal) { event.preventDefault(); openModal(modal); return; }
    if (event.target.closest('[data-modal-close]')) { closeModal(); return; }
    const back = event.target.closest('[data-v4-back]');
    if (back) { goBack(); return; }
    if (event.target.closest('[data-v4-action="advisor"]')) { openAdvisorModal(); return; }
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
      else if (target === 'compare') renderCompare();
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
      else if (target === 'pots') openPotsModal(null);   // dieselbe Komponente: Jahresanfang des ersten Planjahres
      else openDetail(target, 'plan');
      return;
    }
    /* Pilotwerkzeuge unten im Menü: Beratungsangaben, Plan zurücksetzen, Seite neu laden. */
    const action = event.target.closest('[data-menu-action]');
    if (action) {
      closeMenu();
      if (action.dataset.menuAction === 'report') openAdvisorModal();
      else if (action.dataset.menuAction === 'reset') openResetModal();
      else if (action.dataset.menuAction === 'reload') { save(); location.reload(); }
      return;
    }
    if (event.target.closest('[data-notice-close]')) { hideNotice(); return; }
    if (event.target.closest('[data-report-copy]')) { copyAdvisorReport(); return; }
    if (event.target.closest('[data-report-save]')) { saveAdvisorReport(); return; }
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
    /* Nur Ziffern, ein Dezimalkomma und ein Vorzeichen zulassen: Buchstaben und eingefügte
       Währungstexte verschwinden sofort, statt im Feld stehen zu bleiben. */
    const clean = text => text.replace(/[^\d,'\s\u00a0.-]/g, '');
    const significant = text => clean(text).replace(/['\s\u00a0]/g, '').length;
    const next = formatAmount(clean(raw));
    if (next === raw) return;
    const target = significant(raw.slice(0, caret));
    input.value = next;
    // Cursor hinter dieselbe Anzahl signifikanter Zeichen setzen – auch beim Tippen in der Mitte.
    let index = 0, seen = 0;
    while (index < next.length && seen < target) { if (/[\d,-]/.test(next[index])) seen++; index++; }
    try { input.setSelectionRange(index, index); } catch (error) { /* Feld ohne Auswahl */ }
  });
  /* Backspace hinter einem Trennzeichen («3'|000») soll die Ziffer davor löschen – sonst
     passiert scheinbar nichts, weil die Formatierung den Apostroph sofort wieder einsetzt. */
  app.addEventListener('keydown', event => {
    if (event.key !== 'Backspace' || event.altKey || event.ctrlKey || event.metaKey) return;
    const input = event.target.closest?.('input[data-amount]');
    if (!input || input.selectionStart !== input.selectionEnd) return;
    const caret = input.selectionStart ?? 0, before = input.value.slice(0, caret);
    if (!before || /\d$/.test(before)) return;
    const chars = [...before];
    let index = chars.length - 1;
    while (index >= 0 && !/\d/.test(chars[index])) index--;
    if (index < 0) return;
    event.preventDefault();
    chars.splice(index, 1);
    input.value = chars.join('') + input.value.slice(caret);
    try { input.setSelectionRange(index, index); } catch (error) { /* Feld ohne Auswahl */ }
    input.dispatchEvent(new Event('input', {bubbles:true}));
  });
  app.addEventListener('blur', event => { const input = event.target.closest?.('input[data-amount]'); if (input) input.value = formatAmount(input.value); }, true);
  window.addEventListener?.('pagehide', save);

  state.riskProfile = 'balanced';
  /* Der Schliessen-Knopf der Info-Dialoge zeigt ausschliesslich das Tabler-«✕» (`close`,
     IconX-Pfad) in der dunkelgrünen Textfarbe – Grösse 22, Strichstärke 1,7, keine Fläche.
     Das Icon kommt aus der einen Icon-Quelle (`js/icons.js`), nie als eigenes SVG. */
  const modalCloseButton = document.querySelector('#v4Modal [data-modal-close]');
  if (modalCloseButton && !modalCloseButton.firstChild) modalCloseButton.innerHTML = Icons.icon('close', {size:22, stroke:1.7});
  window.V4 = {save, load, planFor, evaluated, renderPlan, renderStart, renderVariants, renderCompare, comparisonOf, precisionItems, profileComparison, needImpact};
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