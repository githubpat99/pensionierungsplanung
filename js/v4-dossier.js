/* Beratungsdossier (A4/PDF) für den Ruhestands-Check – Datenaufbau.
 *
 * Grundsatz: **keine zweite Rechnung.** Dieses Modul baut aus den Objekten, die der gemeinsame
 * Rechenkern bereits geliefert hat (`evaluatePlan`, `calculateAvailableCapital`,
 * `incomeSourcesAtStart`, `calculatePension`, Projektion), **ein** strukturiertes Beratungsobjekt
 * und formatiert es mit den Formattern der Oberfläche. Es wird nichts nachgerechnet, nichts
 * geschätzt und **keine Zahl hart verdrahtet**.
 *
 * Fehlende Angaben sind `null` und werden als «Noch nicht erfasst» dargestellt – bewusst nicht als
 * «CHF 0», weil das fachlich etwas anderes bedeutet. 0 erscheint nur, wenn der Rechenkern
 * tatsächlich 0 liefert (z. B. keine Hypothek bei erfasstem Immobilienwert).
 *
 * Struktur des Ergebnisses (das eine Objekt, das der Renderer bekommt):
 *   meta · person · summary · income · need · assets · pots · projection · variants ·
 *   assumptions · decisions
 */
(function(root) {
  const NOT_CAPTURED = 'Noch nicht erfasst';

  const number = value => {
    /* `null`/`undefined`/leerer String bedeuten «nicht erfasst» – und nicht 0. */
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  /* Rundung wie in der Oberfläche: ganze Franken für Beträge, ganze Prozente für Anteile. */
  const rounded = value => {
    const parsed = number(value);
    return parsed === null ? null : Math.round(parsed);
  };

  /* Ein Budget aus einer Kennzahlenliste – Betrag fehlt = «Noch nicht erfasst». */
  const metric = (label, value, options = {}) => {
    const amount = rounded(value);
    return {
      label,
      amount,
      text: amount === null ? (options.missing ?? NOT_CAPTURED) : options.formatter(amount),
      note: options.note ?? '',
      icon: options.icon ?? ''
    };
  };

  function build(context) {
    const {
      state, item, variantItems = [], money, compactMoney, percent, appVersion,
      heroAsset, strategy, canton, taxModelName, createdAt = new Date()
    } = context;
    const plan = item?.plan ?? null;
    const result = item?.result ?? null;
    const rows = (result?.yearlyProjection ?? []).filter(row => !row.terminal);
    const first = rows[0] ?? null;
    const last = rows[rows.length - 1] ?? null;
    const share = item?.share ?? null;
    const sources = (item?.plan ? context.incomeSources ?? [] : []);
    const p3 = state.details.pension3a ?? {};
    const assets = state.details.assets ?? {};
    const pension = state.details.pension ?? {};
    const assumptions = {...root.CheckV2State?.defaults, ...(state.details.assumptions ?? {})};
    const entered = value => value !== undefined && value !== null && value !== '' && Number.isFinite(Number(value));
    const amountOrNull = value => entered(value) ? rounded(value) : null;
    const year = value => value === null ? NOT_CAPTURED : money(value);

    /* --- Person und Zeitraum ------------------------------------------------------------- */
    const person = {
      mode: state.mode,
      situation: state.mode === 'pre' ? 'Vor der Pensionierung' : 'Bereits pensioniert',
      age: amountOrNull(state.values.age),
      retirementAge: state.mode === 'pre' ? amountOrNull(state.values.retirement) : null,
      targetAge: amountOrNull(state.targetAge),
      canton: canton || null,
      horizonMode: state.horizonMode === 'manual' ? 'manuell' : 'automatisch'
    };

    /* --- Die zentralen Zahlen (Kennzahlen des ersten Planjahres) ------------------------- */
    /* «Nicht erfasst» ist nicht dasselbe wie 0: Fehlt jegliche Kapitalangabe, zeigen wir
       «Noch nicht erfasst» statt «CHF 0» (Auftrag Punkt 13). */
    const freeEntered = entered(state.values.free) || (assets.unallocated !== undefined && entered(assets.unallocated));
    const capitalEntered = entered(pension.pk) || entered(p3.p3) || entered(assets.cash) || entered(assets.securities) || entered(assets.otherAssets) || freeEntered;
    const startCapital = capitalEntered ? rounded(result?.availableCapital) : null;
    const incomeNet = rounded(result?.monthlyIncomeNet);
    const needNet = rounded(result?.monthlyNeed);
    const withdrawal = rounded(first?.withdrawal);
    const tiles = [
      metric('Bedarf netto / Monat', needNet, {formatter:money, icon:'shoppingCart'}),
      metric('Einkommen netto / Monat', incomeNet, {formatter:money, icon:'wallet'}),
      metric('Entnahme aus Vermögen', withdrawal, {formatter:money, icon:'coins'}),
      metric('Startkapital', startCapital, {formatter:compactMoney, icon:'pigMoney'})
    ];

    /* --- Ergebnis ------------------------------------------------------------------------- */
    const reach = context.exhaustionAge ? context.exhaustionAge : null;
    const restValue = last ? rounded(last.end) : null;
    const summary = {
      tiles,
      tone: reach ? 'gap' : 'covered',
      headline: reach ? `Reicht bis Alter ${reach}` : `Reicht bis Alter ${person.targetAge ?? '–'}+`,
      note: reach
        ? 'Nach diesem Alter ist das frei verfügbare Vermögen aufgebraucht; AHV und PK-Rente laufen weiter.'
        : 'Das frei verfügbare Vermögen reicht bis zum Planungshorizont. Immobilien sind nicht enthalten.',
      rest: {
        label: `Restvermögen mit ${person.targetAge ?? '–'}`,
        amount: reach ? null : restValue,
        text: reach ? NOT_CAPTURED : year(restValue),
        // Wenn das Vermögen vor dem Horizont aufgebraucht ist, gibt es kein Restvermögen.
        caption: reach ? 'vorzeitig aufgebraucht' : 'in heutiger Kaufkraft'
      }
    };

    /* --- Einkommen und Bedarf ------------------------------------------------------------ */
    const income = {
      rows: [
        metric('Einkommen brutto', result?.incomeGross === undefined ? null : Number(result.incomeGross) / 12, {formatter:money}),
        metric('Geschätzte Steuern', result?.incomeTax === undefined ? null : -Number(result.incomeTax) / 12, {formatter:money, note: person.canton ? `kantonales Modell ${person.canton}` : 'ohne Wohnkanton geschätzt'}),
        metric('Einkommen netto', incomeNet, {formatter:money, strong:true})
      ],
      sources: sources.filter(source => Number(source.annualIncome) > 0.5).map(source => ({
        id: source.id,
        label: source.name,
        amount: rounded(Number(source.annualIncome) / 12),
        text: money(Number(source.annualIncome) / 12)
      })),
      estimateNote: context.ahvEstimated ? 'Die AHV-Pauschale ist ein Durchschnittswert, bis du deine eigene Rente erfasst.' : ''
    };
    const need = {
      net: metric('Bedarf netto', needNet, {formatter:money}),
      fromIncome: metric('Einkommen', incomeNet, {formatter:money}),
      fromWealth: metric('Vermögensentnahme', withdrawal, {formatter:money}),
      incomeShare: (incomeNet !== null && needNet) ? Math.round(incomeNet / needNet * 100) : null,
      withdrawalShare: (withdrawal !== null && needNet) ? Math.round(withdrawal / needNet * 100) : null
    };

    /* --- Vermögen ------------------------------------------------------------------------- */
    const capital = context.capitalParts ?? {};   // aus calculateAvailableCapital()
    const availableRows = [
      metric('PK-Kapital netto', entered(pension.pk) ? capital.netPkCapitalWithdrawal : null, {formatter:money, note:'nach Steuern'}),
      metric('Säule 3a', entered(p3.p3) ? capital.p3?.netAtStart : null, {formatter:money, note:'netto zum Start'}),
      metric('Bank / liquide Mittel', amountOrNull(assets.cash), {formatter:money}),
      metric('Wertschriften', amountOrNull(assets.securities), {formatter:money}),
      metric('Weitere Positionen', amountOrNull(assets.otherAssets), {formatter:money}),
      metric('Frei verfügbares Kapital', context.freeCapital, {formatter:money, note:'nicht aufgeteilt'})
    ];
    const propertyValue = amountOrNull(assets.propertyValue);
    const mortgage = amountOrNull(assets.mortgage);
    const propertyNet = propertyValue === null ? null : Math.max(0, propertyValue - (mortgage ?? 0));
    const boundRows = [
      metric('Immobilienwert', propertyValue, {formatter:money}),
      metric('Hypotheken', mortgage === null ? null : -mortgage, {formatter:money}),
      metric('Immobilien netto', propertyNet, {formatter:money, strong:true})
    ];
    const assetsSection = {
      available: {rows: availableRows, total: metric('Startkapital', startCapital, {formatter:money, strong:true}), entered: capitalEntered},
      bound: {rows: boundRows, total: metric('Immobilien netto', propertyNet, {formatter:money, strong:true})},
      hasBound: propertyValue !== null || mortgage !== null
    };

    /* --- Drei Töpfe (Startaufteilung aus dem Rechenkern) ---------------------------------- */
    const allocation = (result?.bucketAllocation ?? []).map(value => Math.max(0, rounded(value) ?? 0));
    const allocationTotal = allocation.reduce((sum, value) => sum + value, 0);
    const potDefinitions = [
      {key:'cash', label:'Geldmarkt', note:'Kurzfristige Entnahmen / Liquidität'},
      {key:'bonds', label:'Obligationen', note:'Stabilität / mittelfristige Reserve'},
      {key:'growth', label:'Wertschöpfung', note:'Langfristig investiertes Kapital'}
    ];
    const pots = {
      yearLabel: first ? `Alter ${first.age + 1}` : null,
      rows: potDefinitions.map((pot, index) => ({
        ...pot,
        amount: allocation[index] ?? 0,
        text: money(allocation[index] ?? 0),
        share: allocationTotal ? Math.round((allocation[index] ?? 0) / allocationTotal * 100) : null
      })),
      total: allocationTotal,
      totalText: money(allocationTotal)
    };

    /* --- Verlauf (dieselbe Jahresprojektion wie in der App) -------------------------------
       Der erste Punkt ist das **Startkapital am Pensionierungsalter** – dieselbe Zahl wie die
       Kachel «Startkapital» und wie im Variantenvergleich; danach folgen die Jahresendwerte. */
    const points = rows.map(row => ({
      age: row.age + 1,
      total: Math.max(0, rounded(row.end) ?? 0),
      pots: (row.endBuckets ?? []).map(value => Math.max(0, rounded(value) ?? 0))
    }));
    if (person.retirementAge !== null && points.length && person.retirementAge < points[0].age) {
      points.unshift({age:person.retirementAge, total:startCapital ?? Math.max(0, rounded(result?.availableCapital) ?? 0), pots:allocation});
    }
    const projection = {
      from: points.length ? points[0].age : null,
      to: points.length ? points[points.length - 1].age : null,
      points,
      pots: potDefinitions,
      rest: {label:`Restvermögen mit ${person.targetAge ?? '–'}`, text: reach ? NOT_CAPTURED : year(restValue)},
      exhaustionAge: reach
    };

    /* --- PK-Varianten --------------------------------------------------------------------- */
    const variants = {
      current: share,
      rows: variantItems.map(entry => {
        const variantResult = entry.item?.result;
        const variantPlan = entry.item?.plan;
        const horizon = entry.horizonValue;
        const rests = variantResult ? rounded(horizon) : null;
        return {
          share: entry.share,
          current: entry.share === share,
          rows: [
            {label:'PK-Rente / Monat', text: variantResult ? money(Number(entry.pkPensionMonthly)) : NOT_CAPTURED},
            {label:'Startkapital', text: variantResult ? money(variantResult.availableCapital) : NOT_CAPTURED},
            {label:'Netto-Einkommen / Monat', text: variantResult ? money(variantResult.monthlyIncomeNet) : NOT_CAPTURED},
            {label:'Notwendige Kapitalentnahme', text: variantResult ? money(variantResult.monthlyGap) : NOT_CAPTURED},
            {label:'Vermögen am Planungshorizont', text: entry.exhaustionAge ? `aufgebraucht mit ${entry.exhaustionAge}` : (rests === null ? NOT_CAPTURED : money(rests))}
          ],
          note: variantPlan ? '' : ''
        };
      })
    };

    /* --- Annahmen -------------------------------------------------------------------------- */
    const assumptionsRows = [
      {label:'Anlagestrategie', text: strategy?.label ?? NOT_CAPTURED, note: strategy?.chosen ? 'gewählt' : 'Modellannahme'},
      {label:'Rendite', text: strategy?.rateText ?? NOT_CAPTURED, note:'real, pro Jahr'},
      {label:'Inflation', text: entered(assumptions.inflation) ? `${percent(Number(assumptions.inflation))} % p.a.` : NOT_CAPTURED, note:'Modellannahme'},
      {label:'PK-Verzinsung bis Pensionierung', text: entered(assumptions.pkInterest) ? `${percent(Number(assumptions.pkInterest))} %` : NOT_CAPTURED, note:''},
      {label:'3a-Rendite bis Pensionierung', text: entered(assumptions.p3Return) ? `${percent(Number(assumptions.p3Return))} %` : NOT_CAPTURED, note:''},
      {label:'Wertschriftenrendite bis Pensionierung', text: entered(assumptions.secReturn) ? `${percent(Number(assumptions.secReturn))} %` : NOT_CAPTURED, note:'interner Produktsatz'},
      {label:'Wohnkanton', text: person.canton ?? NOT_CAPTURED, note: taxModelName ? `Steuermodell ${taxModelName}` : ''}
    ];

    /* --- Nächste Entscheidungen: nur was im Plan wirklich vorkommt ------------------------ */
    const decisions = [];
    if (state.mode === 'pre' && (entered(pension.pk) || context.variantCount > 1)) {
      decisions.push({title:'PK-Bezug', text:'Kapitalbezug 0 / 50 / 100 % prüfen und die Variante festlegen, die zu Rente und Bedarf passt.'});
    }
    if (entered(p3.p3) || entered(p3.p3Contrib)) {
      decisions.push({title:'Säule 3a', text:'Bezugsplanung festlegen: Guthaben, Bezugsjahr und Wirkung auf die Steuern.'});
    }
    if (assetsSection.hasBound) {
      decisions.push({title:'Hypothek', text:'Finanzierung und Amortisation prüfen – gebundenes Vermögen ist nicht für den Bedarf verfügbar.'});
    }
    if (strategy) {
      decisions.push({title:'Anlagestrategie', text:'Risikoprofil und Aufteilung auf die drei Töpfe bestätigen.'});
    }

    return {
      meta: {
        appVersion: appVersion ?? null,
        createdAt,
        claim: 'Sicher planen. Investiert bleiben.',
        hero: heroAsset,
        title: 'Dein Ruhestandsplan'
      },
      person, summary, income, need, assets: assetsSection, pots, projection, variants,
      assumptions: {rows: assumptionsRows},
      decisions,
      disclaimer: 'Modellrechnung in heutiger Kaufkraft. Die Ergebnisse basieren auf den erfassten Angaben und den dargestellten Annahmen. Keine Steuer- oder Anlageberatung.'
    };
  }

  /* ------------------------------------------------------------------ Renderer -------------
     Der Renderer bekommt **nur** das fertige Objekt von `build()` und erzeugt HTML. Er rechnet
     nichts, kennt keinen Zustand und liest keine DOM-Texte. Icons kommen aus der bestehenden
     Icon-Quelle (`js/icons.js`), nie als Emoji. */
  const escapeText = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
  const amount = (text, {strong = false, size = ''} = {}) => `<span class="v4-dossier-amount${strong ? ' is-strong' : ''}${size ? ` is-${size}` : ''}">${escapeText(text)}</span>`;
  const icon = (name, size = 18) => {
    const source = root.Icons;
    return source?.icon && name ? `<span class="v4-dossier-icon" aria-hidden="true">${source.icon(name, {size})}</span>` : '';
  };
  const metricCard = row => `<div class="v4-dossier-metric${row.amount === null ? ' is-missing' : ''}">`
    + `<p class="v4-dossier-metric-label">${icon(row.icon, 16)}<span>${escapeText(row.label)}</span></p>`
    + amount(row.text, {size:'tile'})
    + `${row.note ? `<p class="v4-dossier-metric-note">${escapeText(row.note)}</p>` : ''}</div>`;
  const valueRow = (row, options = {}) => `<div class="v4-dossier-row${row.amount === null ? ' is-missing' : ''}${options.strong || row.strong ? ' is-strong' : ''}">`
    + `<dt>${icon(row.icon, 15)}<span>${escapeText(row.label)}</span>${row.note ? `<small>${escapeText(row.note)}</small>` : ''}</dt>`
    + `<dd>${amount(row.text)}</dd></div>`;
  const head = (title, subtitle) => `<header class="v4-dossier-head"><p class="v4-dossier-brand"><span class="v4-dossier-brandline" aria-hidden="true"></span>Ruhestands-Check</p>`
    + `<h2>${escapeText(title)}</h2>${subtitle ? `<p class="v4-dossier-sub">${escapeText(subtitle)}</p>` : ''}</header>`;
  const foot = pageNumber => `<footer class="v4-dossier-foot"><span>Modellrechnung in heutiger Kaufkraft</span><span>Seite ${pageNumber}</span></footer>`;
  const page = (number, title, subtitle, body) => `<section class="v4-dossier-page" aria-label="Seite ${number}: ${escapeText(title)}">${head(title, subtitle)}<div class="v4-dossier-body">${body}</div>${foot(number)}</section>`;
  const missingBlock = text => `<p class="v4-dossier-missing">${escapeText(text)}</p>`;

  /* Verlauf: eine ruhige Fläche mit Linie (Gesamtvermögen) und drei dünnen Topf-Linien.
     Alle Punkte stammen aus der Jahresprojektion des Rechenkerns (`points`). */
  function projectionChart(data) {
    const points = data.projection.points;
    if (points.length < 2) return missingBlock('Für den Verlauf fehlen noch Angaben.');
    const W = 1000, H = 430, padTop = 30, padBottom = 46, padX = 14;
    const from = data.projection.from, to = data.projection.to;
    const max = Math.max(1, ...points.map(point => point.total));
    const x = age => padX + (age - from) / Math.max(1, to - from) * (W - padX * 2);
    const y = value => padTop + (1 - value / max) * (H - padTop - padBottom);
    const line = values => values.map((value, index) => `${index ? 'L' : 'M'}${x(points[index].age).toFixed(1)} ${y(value).toFixed(1)}`).join(' ');
    const totals = points.map(point => point.total);
    const area = `${line(totals)} L${x(to).toFixed(1)} ${y(0).toFixed(1)} L${x(from).toFixed(1)} ${y(0).toFixed(1)} Z`;
    const potLines = data.projection.pots.map((pot, index) => `<path class="pot-${pot.key}" d="${line(points.map(point => point.pots[index] ?? 0))}"/>`).join('');
    const grid = [0.25, 0.5, 0.75, 1].map(share => `<line class="grid" x1="${padX}" x2="${W - padX}" y1="${(padTop + (1 - share) * (H - padTop - padBottom)).toFixed(1)}" y2="${(padTop + (1 - share) * (H - padTop - padBottom)).toFixed(1)}"/>`).join('');
    /* Achsenzahlen nur für die Mitte und einen allfälligen Aufbrauchpunkt – die Ränder sind als
       «Pensionierung» und «Planungshorizont» beschriftet, damit keine Zahl doppelt erscheint. */
    const midAge = Math.round((from + to) / 2);
    const marks = [...new Set([data.projection.exhaustionAge, midAge].filter(age => age !== null && age > from && age < to))].sort((a, b) => a - b);
    const ticks = marks.map(age => `<text class="tick" x="${x(age).toFixed(1)}" y="${H - 14}" text-anchor="middle">${age}</text>`).join('');
    const exhaustion = data.projection.exhaustionAge && data.projection.exhaustionAge >= from && data.projection.exhaustionAge <= to
      ? `<line class="marker" x1="${x(data.projection.exhaustionAge).toFixed(1)}" x2="${x(data.projection.exhaustionAge).toFixed(1)}" y1="${padTop}" y2="${y(0).toFixed(1)}"/><text class="marker-label" x="${x(data.projection.exhaustionAge).toFixed(1)}" y="${padTop - 10}" text-anchor="middle">aufgebraucht mit ${data.projection.exhaustionAge}</text>`
      : '';
    const legend = data.projection.pots.map(pot => `<li><span class="dot pot-${pot.key}" aria-hidden="true"></span>${escapeText(pot.label)}</li>`).join('');
    return `<figure class="v4-dossier-chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Vermögensverlauf von Alter ${from} bis ${to}">`
      + grid + exhaustion
      + `<path class="area" d="${area}"/>`
      + potLines
      + `<path class="line-total" d="${line(totals)}"/>`
      + ticks
      + `<text class="edge-label" x="${padX}" y="${H - 14}" text-anchor="start">Pensionierung ${from}</text>`
      + `<text class="edge-label" x="${W - padX}" y="${H - 14}" text-anchor="end">Planungshorizont ${to}</text>`
      + `</svg><figcaption><ul class="v4-dossier-legend"><li><span class="dot total" aria-hidden="true"></span>Gesamtvermögen</li>${legend}</ul>`
      + `<p class="v4-dossier-chart-note">Frei verfügbares Vermögen am Jahresende; gebundenes Vermögen (Immobilien) ist nicht enthalten.</p></figcaption></figure>`;
  }

  function render(data) {
    const pages = [];
    const pills = [
      data.person.retirementAge !== null ? `Pensionierung mit ${data.person.retirementAge}` : null,
      data.person.targetAge !== null ? `Planung bis ${data.person.targetAge}` : null,
      data.person.canton ? `Wohnkanton ${data.person.canton}` : null,
      data.person.situation
    ].filter(Boolean);

    /* Seite 1 – Titel und Executive Summary */
    pages.push(`<section class="v4-dossier-page v4-dossier-cover" aria-label="Seite 1: ${escapeText(data.meta.title)}">`
      + `<div class="v4-dossier-hero" aria-hidden="true"><img src="${escapeText(data.meta.hero)}" alt=""></div>`
      + `<div class="v4-dossier-cover-body"><p class="v4-dossier-brand"><span class="v4-dossier-brandline" aria-hidden="true"></span>Ruhestands-Check</p>`
      + `<h1 class="v4-dossier-title">${escapeText(data.meta.title)}</h1>`
      + `<p class="v4-dossier-claim">${escapeText(data.meta.claim)}</p>`
      + `<ul class="v4-dossier-pills">${pills.map(pill => `<li>${escapeText(pill)}</li>`).join('')}</ul></div>`
      + `<div class="v4-dossier-body"><h2 class="v4-dossier-section-title">Die zentralen Zahlen</h2>`
      + `<div class="v4-dossier-tiles">${data.summary.tiles.map(metricCard).join('')}</div>`
      + `<div class="v4-dossier-result${data.summary.tone === 'gap' ? ' is-gap' : ''}">`
      + `<div><p class="v4-dossier-kicker">Ergebnis</p><p class="v4-dossier-result-headline">${escapeText(data.summary.headline)}</p><p class="v4-dossier-result-note">${escapeText(data.summary.note)}</p></div>`
      + `<div class="v4-dossier-result-value"><p class="v4-dossier-kicker">${escapeText(data.summary.rest.label)}</p>${amount(data.summary.rest.text, {strong:true, size:'result'})}<p class="v4-dossier-result-note">${escapeText(data.summary.rest.caption)}</p></div>`
      + `</div></div></section>`);

    /* Seite 2 – Einkommen und Bedarf */
    const ratio = (data.need.incomeShare !== null && data.need.withdrawalShare !== null)
      ? `<div class="v4-dossier-ratio" role="img" aria-label="Anteile: ${data.need.incomeShare} % Einkommen, ${data.need.withdrawalShare} % Kapitalentnahme">`
        + `<div class="v4-dossier-ratio-bar"><span class="income" style="width:${data.need.incomeShare}%"></span><span class="wealth" style="width:${data.need.withdrawalShare}%"></span></div>`
        + `<ul class="v4-dossier-ratio-labels"><li><span class="dot income" aria-hidden="true"></span>${data.need.incomeShare} % Einkommen</li><li><span class="dot wealth" aria-hidden="true"></span>${data.need.withdrawalShare} % Kapitalentnahme</li></ul></div>`
      : missingBlock('Für die Aufteilung fehlen noch Angaben.');
    pages.push(page(2, 'So finanzierst du deinen Ruhestand', 'Einkommen, Steuern und die notwendige Entnahme aus deinem Vermögen.',
      `<div class="v4-dossier-columns"><div class="v4-dossier-card"><p class="v4-dossier-card-title">Einkommen im ersten Planjahr</p>`
      + `<dl class="v4-dossier-rows">${data.income.sources.map(source => valueRow({label:source.label, text:source.text, amount:source.amount})).join('')}${data.income.rows.map(row => valueRow(row)).join('')}</dl>`
      + `${data.income.estimateNote ? `<p class="v4-dossier-note">${escapeText(data.income.estimateNote)}</p>` : ''}</div>`
      + `<div class="v4-dossier-card"><p class="v4-dossier-card-title">Bedarf und Deckung</p>`
      + `<dl class="v4-dossier-rows">${valueRow(data.need.net, {strong:true})}${valueRow(data.need.fromIncome)}${valueRow(data.need.fromWealth)}</dl>`
      + ratio + `</div></div>`));

    /* Seite 3 – Vermögen */
    pages.push(page(3, 'Dein Vermögen zum Start der Pensionierung', 'Was für die Planung verfügbar ist – und was gebunden bleibt.',
      `<div class="v4-dossier-columns">`
      + `<div class="v4-dossier-card is-accent"><p class="v4-dossier-card-title">Für die Planung verfügbar</p>`
      + (data.assets.available.entered
        ? `<dl class="v4-dossier-rows">${data.assets.available.rows.map(row => valueRow(row)).join('')}</dl><div class="v4-dossier-total">${valueRow(data.assets.available.total, {strong:true})}</div>`
        : missingBlock('Für das verfügbare Kapital fehlen noch Angaben (PK-Guthaben, Säule 3a oder Vermögen).'))
      + `</div>`
      + (data.assets.hasBound
        ? `<div class="v4-dossier-card is-muted"><p class="v4-dossier-card-title">Gebundenes Vermögen</p>`
          + `<dl class="v4-dossier-rows">${data.assets.bound.rows.map(row => valueRow(row)).join('')}</dl>`
          + `<p class="v4-dossier-note">Gebundenes Vermögen steht für den laufenden Bedarf nicht zur Verfügung und wird nicht verbraucht.</p></div>`
        : `<div class="v4-dossier-card is-muted"><p class="v4-dossier-card-title">Gebundenes Vermögen</p>${missingBlock('Kein gebundenes Vermögen erfasst.')}</div>`)
      + `</div>`));

    /* Seite 4 – Töpfe */
    pages.push(page(4, 'So ist dein Kapital aufgeteilt', `Drei Töpfe mit unterschiedlichen Aufgaben${data.pots.yearLabel ? ` – Stand ${data.pots.yearLabel}` : ''}.`,
      data.pots.total > 0
        ? `<div class="v4-dossier-pots">${data.pots.rows.map(row => `<div class="v4-dossier-pot pot-${row.key}">`
          + `<p class="v4-dossier-pot-label">${escapeText(row.label)}</p>`
          + amount(row.text, {strong:true, size:'pot'})
          + `<p class="v4-dossier-pot-share">${row.share === null ? '–' : `${row.share} % des Startkapitals`}</p>`
          + `<p class="v4-dossier-pot-note">${escapeText(row.note)}</p></div>`).join('')}</div>`
          + `<p class="v4-dossier-note is-strong">Die Aufteilung wird im Zeitverlauf anhand des Kapitalbedarfs und der gewählten Strategie jährlich neu berechnet.</p>`
        : missingBlock('Solange kein verfügbares Kapital erfasst ist, gibt es keine Aufteilung auf die Töpfe.')));

    /* Seite 5 – Verlauf */
    pages.push(page(5, 'So entwickelt sich dein Vermögen', `Jahresprojektion von Alter ${data.projection.from ?? '–'} bis ${data.projection.to ?? '–'}.`,
      projectionChart(data)
      + `<div class="v4-dossier-highlight"><p class="v4-dossier-kicker">${escapeText(data.projection.rest.label)}</p>${amount(data.projection.rest.text, {strong:true, size:'result'})}</div>`));

    /* Seite 6 – PK-Varianten */
    const variantColumns = data.variants.rows.map(variant => `<div class="v4-dossier-variant${variant.current ? ' is-current' : ''}">`
      + `<p class="v4-dossier-variant-head">${variant.share} % Kapitalbezug</p>`
      + (variant.current ? `<p class="v4-dossier-variant-badge">Dein aktueller Plan</p>` : `<p class="v4-dossier-variant-badge is-empty">&nbsp;</p>`)
      + `<dl class="v4-dossier-rows">${variant.rows.map(row => valueRow(row)).join('')}</dl></div>`).join('');
    pages.push(page(6, 'Deine PK-Varianten', 'Kapitalbezug, Rente und Reichweite im Vergleich – ohne Wertung.',
      data.variants.rows.length ? `<div class="v4-dossier-variants">${variantColumns}</div>` : missingBlock('Es ist erst eine Variante gespeichert.')));

    /* Seite 7 – Annahmen */
    pages.push(page(7, 'Annahmen deiner Planung', 'Alle Werte stammen aus deinen Angaben und den hinterlegten Modellannahmen.',
      `<div class="v4-dossier-card"><dl class="v4-dossier-rows">${data.assumptions.rows.map(row => valueRow(row)).join('')}</dl></div>`
      + `<p class="v4-dossier-disclaimer">${escapeText(data.disclaimer)}</p>`));

    /* Seite 8 – Nächste Entscheidungen (nur wenn Themen im Plan vorkommen) */
    if (data.decisions.length) {
      pages.push(page(8, 'Deine nächsten Entscheidungen', 'Themen, die in deiner Planung tatsächlich vorkommen.',
        `<div class="v4-dossier-decisions">${data.decisions.map(entry => `<div class="v4-dossier-decision">`
          + `<p class="v4-dossier-decision-title">${escapeText(entry.title)}</p><p class="v4-dossier-decision-text">${escapeText(entry.text)}</p></div>`).join('')}</div>`));
    }

    return `<div class="v4-dossier" data-pages="${pages.length}">${pages.join('')}</div>`;
  }

  root.V4Dossier = {build, render, NOT_CAPTURED};
})(globalThis);

