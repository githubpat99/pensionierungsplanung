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
  /* Prozentanteile, die sich **exakt auf 100 %** addieren (Rest auf den grössten Posten).
     Ohne diesen Ausgleich ergäben drei gerundete Werte je nach Datenlage 99 % oder 101 %. */
  const sharesOf = values => {
    const total = values.reduce((sum, value) => sum + Math.max(0, number(value) ?? 0), 0);
    if (!total) return values.map(() => null);
    const shares = values.map(value => Math.floor(Math.max(0, number(value) ?? 0) / total * 100));
    let rest = 100 - shares.reduce((sum, value) => sum + value, 0);
    const order = values.map((value, index) => index).sort((a, b) => Math.max(0, number(values[b]) ?? 0) - Math.max(0, number(values[a]) ?? 0));
    for (let step = 0; rest > 0; step++) { shares[order[step % order.length]] += 1; rest -= 1; }
    return shares;
  };

  /* Topfbeträge, die sich **exakt** zum ausgewiesenen Zeitpunktwert addieren. Der Rechenkern
     rundet Töpfe und Summe unabhängig; ohne diesen Ausgleich zeigte die Karte «drei Töpfe, die
     zusammen einen Franken mehr ergeben als der Zeitpunktwert». */
  const partsSummingTo = (values, target) => {
    const parts = values.map(value => Math.max(0, Math.round(number(value) ?? 0)));
    if (!parts.length) return parts;
    const sum = parts.reduce((total, value) => total + value, 0);
    let diff = (number(target) ?? sum) - sum;
    for (let guard = 0; diff !== 0 && guard < 2000; guard++) {
      const index = parts.indexOf(Math.max(...parts));
      const step = diff > 0 ? 1 : -1;
      if (index < 0 || parts[index] + step < 0) break;
      parts[index] += step;
      diff -= step;
    }
    return parts;
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
      heroAsset, strategy, canton, taxModelName, advice = {}, createdAt = new Date()
    } = context;
    const plan = item?.plan ?? null;
    const result = item?.result ?? null;
    const rows = (result?.yearlyProjection ?? []).filter(row => !row.terminal);
    const first = rows[0] ?? null;
    const last = rows[rows.length - 1] ?? null;
    const share = item?.share ?? null;
    const sources = (item?.plan ? context.incomeSources ?? [] : []);
    /* «Bereits pensioniert» (Post-Modus) kennt keinen Kapitalbezug und keine Aufbauphase:
       Es gibt keinen Bezugsentscheid, kein PK-Kapital und kein 3a-Guthaben in der Planung und
       keine Renditen/Verzinsung «bis Pensionierung». Das Dossier lässt diese Themen deshalb
       weg, statt sie mit «Noch nicht erfasst» oder mit Nullvarianten zu zeigen. */
    const retired = state.mode !== 'pre';
    const p3 = state.details.pension3a ?? {};
    const assets = state.details.assets ?? {};
    const pension = state.details.pension ?? {};
    const assumptions = {...root.CheckV2State?.defaults, ...(state.details.assumptions ?? {})};
    const entered = value => value !== undefined && value !== null && value !== '' && Number.isFinite(Number(value));
    const amountOrNull = value => entered(value) ? rounded(value) : null;
    const year = value => value === null ? NOT_CAPTURED : money(value);

    /* --- Person und Zeitraum ------------------------------------------------------------- */
    /* Beratungsdaten (Name, Gesprächsdatum, Notizen) kommen aus dem Zustand der Oberfläche und
       werden **nicht** gerechnet – sie beschriften das Dossier und werden «Noch nicht erfasst»,
       wenn sie fehlen. */
    const meetingOn = String(advice.meetingOn ?? '').trim();
    const meetingMatch = meetingOn.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const person = {
      mode: state.mode,
      retired,
      situation: state.mode === 'pre' ? 'Vor der Pensionierung' : 'Bereits pensioniert',
      age: amountOrNull(state.values.age),
      retirementAge: state.mode === 'pre' ? amountOrNull(state.values.retirement) : null,
      targetAge: amountOrNull(state.targetAge),
      canton: canton || null,
      horizonMode: state.horizonMode === 'manual' ? 'manuell' : 'automatisch',
      name: String(advice.name ?? '').trim() || null,
      meetingOn: meetingMatch ? `${meetingMatch[3]}.${meetingMatch[2]}.${meetingMatch[1]}` : null
    };

    /* --- Die zentralen Zahlen (Kennzahlen des ersten Planjahres) ------------------------- */
    /* «Nicht erfasst» ist nicht dasselbe wie 0: Fehlt jegliche Kapitalangabe, zeigen wir
       «Noch nicht erfasst» statt «CHF 0» (Auftrag Punkt 13). */
    const freeEntered = entered(state.values.free) || (assets.unallocated !== undefined && entered(assets.unallocated));
    const capitalEntered = entered(pension.pk) || entered(p3.p3) || entered(assets.cash) || entered(assets.securities) || entered(assets.otherAssets) || freeEntered;
    const startCapital = capitalEntered ? rounded(result?.availableCapital) : null;
    const incomeNet = rounded(result?.monthlyIncomeNet);
    const needNet = rounded(result?.monthlyNeed);
    /* Immer dieselbe Zahl wie «Aus Vermögen / Monat» auf «Mein Plan»: der Rechenkern liefert den
       monatlichen Fehlbetrag des ersten Planjahres als `monthlyGap` (= Jahresentnahme / 12). Der
       Jahreswert der Projektion (`first.withdrawal`) darf hier nicht stehen – sonst passen die
       Anteile nicht mehr zum monatlichen Bedarf (Fehler «665 % Kapitalentnahme»). */
    const withdrawal = rounded(result?.monthlyGap);
    const tiles = [
      metric('Bedarf netto / Monat', needNet, {formatter:money, icon:'shoppingCart'}),
      metric('Einkommen netto / Monat', incomeNet, {formatter:money, icon:'wallet'}),
      metric('Entnahme aus Vermögen / Monat', withdrawal, {formatter:money, icon:'coins'}),
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
      net: metric('Bedarf netto / Monat', needNet, {formatter:money}),
      fromIncome: metric('Einkommen netto / Monat', incomeNet, {formatter:money}),
      fromWealth: metric('Vermögensentnahme / Monat', withdrawal, {formatter:money}),
      /* Anteile nur, wenn wirklich aus dem Vermögen entnommen wird: bei gedecktem Bedarf gäbe es
         sonst Werte über 100 % (oder negative Balken). Beide Anteile bleiben zwischen 0 und 100. */
      covered: withdrawal !== null && withdrawal <= 0,
      incomeShare: (needNet && incomeNet !== null) ? Math.max(0, Math.min(100, Math.round(incomeNet / needNet * 100))) : null,
      withdrawalShare: (needNet && withdrawal !== null) ? Math.max(0, Math.min(100, Math.round(withdrawal / needNet * 100))) : null
    };

    /* --- Vermögen ------------------------------------------------------------------------- */
    const capital = context.capitalParts ?? {};   // aus calculateAvailableCapital()
    /* Im Post-Modus besteht das Vermögen ausschliesslich aus dem heute verfügbaren Kapital:
       PK-Guthaben und Säule 3a sind nicht Teil der Planung (der Rechenkern liefert dort 0),
       ihre Zeilen würden nur «Noch nicht erfasst» oder «CHF 0» anzeigen. */
    const availableRows = [
      ...(retired ? [] : [
        metric('PK-Kapital netto', entered(pension.pk) ? capital.netPkCapitalWithdrawal : null, {formatter:money, note:'nach Steuern'}),
        metric('Säule 3a', entered(p3.p3) ? capital.p3?.netAtStart : null, {formatter:money, note:'netto zum Start'})
      ]),
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
        share: allocationTotal ? sharesOf(allocation)[index] : null
      })),
      total: allocationTotal,
      totalText: money(allocationTotal)
    };

    /* --- Verlauf (dieselbe Jahresprojektion wie in der App) -------------------------------
       Gezeigt werden **Jahresanfangswerte der Planjahre**: dann sind alle drei Töpfe gefüllt und
       die Zusammensetzung ist aussagekräftig. Das erste Planjahr ist das der Pensionierung
       **folgende** (Pension 65 → Startjahr 66); sein Jahresanfangswert ist das Startkapital. */
    const points = rows.map(row => {
      const total = Math.max(0, rounded(row.free) ?? 0);
      const parts = (row.buckets ?? []).map(value => Math.max(0, rounded(value) ?? 0));
      return {age: row.age + 1, total, pots: partsSummingTo(parts, total)};
    });
    /* Drei beschriftete Zeitpunkte wie in der Vorlage: Start · Mitte · Ende. Die Mitte liegt
       möglichst auf einer Fünfjahreslinie (65…97 → 80), sonst auf dem nächstgelegenen Planjahr –
       aber **nur im Mitteldrittel der Grafik**: die Beschriftungen von Start und Ende belegen je
       ein Fünftel der Breite (`css/v4-dossier.css`), dazwischen muss die Mitte Platz haben.
       Findet sich dort kein Planjahr mit Vermögen (sehr kurze Reichweite), bleiben Start und
       Ende – zwei lesbare Angaben sind besser als drei übereinander. */
    const from = points.length ? points[0].age : null;
    const to = points.length ? points[points.length - 1].age : null;
    /* Der dritte Zeitpunkt ist das letzte Planjahr **mit Vermögen** – der Planungshorizont,
       solange dieser Wert trägt, sonst das Jahr, in dem das Vermögen aufgebraucht wird (dasselbe
       Alter wie in der Zustandskarte). Ein Nulljahr ergäbe eine Karte mit «CHF 0» und ohne
       Aussage; die Erklärung unter der Legende verspricht gefüllte Töpfe. */
    const startPoint = points.length ? points[0] : null;
    const filledPoints = points.filter(entry => entry.total > 0);
    const endPoint = filledPoints.length ? filledPoints[filledPoints.length - 1] : (points.length ? points[points.length - 1] : null);
    const labelEnd = endPoint ? endPoint.age : to;
    const pointAt = age => points.find(entry => entry.age === age) ?? null;
    const midAge = (() => {
      if (from === null || labelEnd === null || to === null || to === from) return null;
      const position = age => (age - from) / (to - from) * 100;
      const inside = points.filter(entry => entry.age > from && entry.age < labelEnd && position(entry.age) >= 30 && position(entry.age) <= 70);
      if (!inside.length) return null;
      const mid = (from + labelEnd) / 2;
      const grid = [Math.floor(mid / 5) * 5, Math.ceil(mid / 5) * 5]
        .filter(age => inside.some(entry => entry.age === age))
        .sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid) || b - a)[0];
      if (grid !== undefined) return grid;
      return inside.reduce((best, entry) => Math.abs(entry.age - mid) < Math.abs(best.age - mid) ? entry : best, inside[0]).age;
    })();
    const milestone = (age, kicker) => {
      const point = pointAt(age);
      if (!point) return null;
      /* Nur Töpfe **mit Vermögen** – dieselbe Regel wie im Töpfe-Dialog und in der Jahresansicht
         (keine «CHF 0»-Zeile). Bleibt kein Topf übrig, entfällt die Karte. */
      const filled = potDefinitions
        .map((pot, index) => ({pot, value:Math.max(0, number(point.pots[index]) ?? 0)}))
        .filter(entry => entry.value > 0);
      if (!filled.length) return null;
      const shares = sharesOf(filled.map(entry => entry.value));
      return {
        age, kicker,
        totalText: money(point.total),
        rows: filled.map((entry, position) => ({
          key:entry.pot.key, label:entry.pot.label,
          text:money(entry.value),
          share:shares[position]
        }))
      };
    };
    /* Beschriftungen an der Grafik: **immer** Startjahr, Mitte und Endejahr – kurz gehalten,
       damit alle drei Angaben auf einer Linie liegen. */
    const projectionLabels = [
      startPoint ? {age:startPoint.age, kicker:`Start mit ${startPoint.age}`, text:money(startPoint.total), place:'start'} : null,
      midAge !== null ? {age:midAge, kicker:`mit ${midAge}`, text:money(pointAt(midAge)?.total ?? 0), place:'mid'} : null,
      endPoint && (!startPoint || endPoint.age !== startPoint.age) ? {age:endPoint.age, kicker:`mit ${endPoint.age}`, text:money(endPoint.total), place:'end'} : null
    ].filter(Boolean);
    const projectionCards = [
      startPoint ? milestone(startPoint.age, `Startvermögen mit ${startPoint.age}`) : null,
      midAge !== null ? milestone(midAge, `Vermögen mit ${midAge}`) : null,
      endPoint && (!startPoint || endPoint.age !== startPoint.age) ? milestone(endPoint.age, `Vermögen mit ${endPoint.age}`) : null
    ].filter(Boolean);
    /* Achse: Fünfjahresschritte zwischen Start- und Endejahr. Ein Rasterschritt, der nur ein oder
       zwei Jahre vom Start- oder Endejahr entfernt liegt, entfällt – sonst stünden dort zwei
       Zahlen direkt nebeneinander (Beispiel 66…96: 95 wird weggelassen, 96 bleibt). */
    const axisAges = (() => {
      if (from === null || to === null) return [];
      const ages = [from];
      for (let age = Math.ceil(from / 5) * 5; age < to; age += 5) {
        if (age <= from + 2 || age >= to - 2) continue;
        ages.push(age);
      }
      if (to > from) ages.push(to);
      return [...new Set(ages)].sort((a, b) => a - b);
    })();
    const projection = {
      from, to, points,
      pots: potDefinitions,
      labels: projectionLabels,
      cards: projectionCards,
      axis: axisAges,
      rest: {label:`Restvermögen mit ${person.targetAge ?? '–'}`, text: reach ? NOT_CAPTURED : year(restValue)},
      exhaustionAge: reach,
      /* Zustand der Seite: gedeckt (grüner Haken) oder aufgebraucht (Hinweis). */
      status: reach
        ? {
            tone:'gap',
            title:`Dein Vermögen ist voraussichtlich mit ${reach} aufgebraucht.`,
            text:'Danach laufen AHV- und PK-Rente weiter – frei verfügbares Vermögen ist keines mehr vorhanden.'
          }
        : {
            tone:'covered',
            title:'Dein Vermögen reicht bis zum Planungshorizont.',
            text: person.targetAge !== null && restValue !== null
              ? `Mit ${person.targetAge} bleiben voraussichtlich ${money(restValue)} (in heutiger Kaufkraft).`
              : 'Alle Werte in heutiger Kaufkraft.'
          }
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
    /* Die Renditen und die Verzinsung der Aufbauphase («bis Pensionierung») existieren nur vor
       der Pensionierung: im Post-Modus sind sie weder erfasst noch wirksam und würden das
       Dossier irreführend mit Werten füllen, die für den Plan keine Rolle spielen. */
    const assumptionsRows = [
      {label:'Anlagestrategie', text: strategy?.label ?? NOT_CAPTURED, note: strategy?.chosen ? 'gewählt' : 'Modellannahme'},
      {label:'Rendite', text: strategy?.rateText ?? NOT_CAPTURED, note:'real, pro Jahr'},
      {label:'Inflation', text: entered(assumptions.inflation) ? `${percent(Number(assumptions.inflation))} % p.a.` : NOT_CAPTURED, note:'Modellannahme'},
      ...(retired ? [] : [
        {label:'PK-Verzinsung bis Pensionierung', text: entered(assumptions.pkInterest) ? `${percent(Number(assumptions.pkInterest))} %` : NOT_CAPTURED, note:''},
        {label:'3a-Rendite bis Pensionierung', text: entered(assumptions.p3Return) ? `${percent(Number(assumptions.p3Return))} %` : NOT_CAPTURED, note:''},
        {label:'Wertschriftenrendite bis Pensionierung', text: entered(assumptions.secReturn) ? `${percent(Number(assumptions.secReturn))} %` : NOT_CAPTURED, note:'interner Produktsatz'}
      ]),
      {label:'Wohnkanton', text: person.canton ?? NOT_CAPTURED, note: taxModelName ? `Steuermodell ${taxModelName}` : ''}
    ];

    /* --- Nächste Entscheidungen: nur was im Plan wirklich vorkommt ------------------------ */
    const decisions = [];
    if (state.mode === 'pre' && (entered(pension.pk) || context.variantCount > 1)) {
      decisions.push({title:'PK-Bezug', text:'Kapitalbezug 0 / 50 / 100 % prüfen und die Variante festlegen, die zu Rente und Bedarf passt.'});
    }
    if (!retired && (entered(p3.p3) || entered(p3.p3Contrib))) {
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
      /* Notizen aus der Beratungsvorbereitung – freier Text, nur Darstellung. */
      preparation: {notes: String(advice.notes ?? '').trim() || null},
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

  /* Verlauf nach der Vorlage: gestapelte Flächen der drei Töpfe (Geldmarkt oben, darunter
     Obligationen, unten Wertschöpfung), darüber die Linie «Gesamtvermögen» mit Punkten an den
     drei beschrifteten Zeitpunkten, Fünfjahresachse mit «Alter» und Legende.
     Alle Werte stammen aus der Jahresprojektion des Rechenkerns (`points`); die Beschriftungen
     stehen als HTML über der Grafik, damit sie auf jedem Format lesbar bleiben. */
  function projectionChart(data) {
    const projection = data.projection;
    const points = projection.points;
    if (!projection.from || !projection.to || points.length < 2) return missingBlock('Für den Verlauf fehlen noch Angaben.');
    const W = 1000, H = 360, padTop = 28, padBottom = 8, padX = 12;
    const from = projection.from, to = projection.to;
    const max = Math.max(1, ...points.map(point => point.total));
    const x = age => padX + (age - from) / Math.max(1, to - from) * (W - padX * 2);
    const y = value => padTop + (1 - value / max) * (H - padTop - padBottom);
    const percent = age => x(age) / W * 100;
    /* Gestapelt wird von unten nach oben: Wertschöpfung, Obligationen, Geldmarkt. */
    const stack = projection.pots.map((pot, index) => ({pot, index})).reverse();
    let lower = points.map(() => 0);
    const bands = stack.map(({pot, index}) => {
      const upper = points.map((point, position) => lower[position] + Math.max(0, number(point.pots[index]) ?? 0));
      const topEdge = points.map((point, position) => `${position ? 'L' : 'M'}${x(point.age).toFixed(1)} ${y(upper[position]).toFixed(1)}`).join(' ');
      const bottomEdge = points.map((point, position) => ({point, position})).reverse()
        .map(({point, position}) => `L${x(point.age).toFixed(1)} ${y(lower[position]).toFixed(1)}`).join(' ');
      lower = upper;
      return `<path class="band pot-${pot.key}" d="${topEdge} ${bottomEdge} Z"/>`;
    }).join('');
    const totals = points.map(point => point.total);
    const totalLine = points.map((point, index) => `${index ? 'L' : 'M'}${x(point.age).toFixed(1)} ${y(totals[index]).toFixed(1)}`).join(' ');
    const markers = projection.labels.map(label => `<circle class="marker-dot" cx="${x(label.age).toFixed(1)}" cy="${y(pointAt(points, label.age)?.total ?? totals[totals.length - 1]).toFixed(1)}" r="6"/>`).join('');
    const guides = projection.labels.map(label => `<line class="guide" x1="${x(label.age).toFixed(1)}" x2="${x(label.age).toFixed(1)}" y1="${padTop}" y2="${y(0).toFixed(1)}"/>`).join('');
    const grid = [0.25, 0.5, 0.75, 1].map(share => `<line class="grid" x1="${padX}" x2="${W - padX}" y1="${(padTop + (1 - share) * (H - padTop - padBottom)).toFixed(1)}" y2="${(padTop + (1 - share) * (H - padTop - padBottom)).toFixed(1)}"/>`).join('');
    /* Beschriftungen: Start linksbündig, Mitte zentriert, Ende rechtsbündig – jedes Feld höchstens
       ein Drittel breit, damit sich die Angaben nie überlagern (auf schmalen Screens stehen sie
       untereinander, siehe `css/v4-dossier.css`). */
    const labels = projection.labels.map(label => {
      const style = label.place === 'start' ? 'left:0' : label.place === 'end' ? 'right:0' : `left:${percent(label.age).toFixed(2)}%;transform:translateX(-50%)`;
      return `<p class="v4-dossier-chart-label is-${label.place}" style="${style}"><span class="v4-dossier-chart-kicker">${escapeText(label.kicker)}</span>${label.text ? `<strong>${escapeText(label.text)}</strong>` : ''}</p>`;
    }).join('');
    const axis = projection.axis.map(age => `<span class="v4-dossier-axis-tick" style="left:${percent(age).toFixed(2)}%">${age}</span>`).join('')
      + '<span class="v4-dossier-axis-caption">Alter</span>';
    const legend = `<li><span class="dot total" aria-hidden="true"></span>Gesamtvermögen</li>`
      + projection.pots.map(pot => `<li><span class="dot pot-${pot.key}" aria-hidden="true"></span>${escapeText(pot.label)}${pot.key === 'growth' ? ' (Aktien)' : ''}</li>`).join('');
    return `<figure class="v4-dossier-chart">`
      + `<div class="v4-dossier-chart-canvas"><div class="v4-dossier-chart-labels">${labels}</div><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Vermögensverlauf (Jahresanfang) von Alter ${from} bis ${to}">`
      + grid + guides + bands
      + `<path class="line-total" d="${totalLine}"/>${markers}`
      + `</svg><div class="v4-dossier-axis">${axis}</div></div>`
      + `<figcaption><ul class="v4-dossier-legend">${legend}</ul>`
      + `<p class="v4-dossier-chart-note">Jahresanfangswerte, in denen alle drei Töpfe gefüllt sind – ohne gebundenes Vermögen (Immobilien).</p></figcaption></figure>`;
  }
  /* Wert eines Punktes zu einem Alter (der Aufbrauchpunkt kann zwischen zwei Planjahren liegen). */
  function pointAt(points, age) {
    return points.find(point => point.age === age) ?? null;
  }
  /* Die drei Karten unter der Grafik: Zusammensetzung an Start, Mitte und Horizont. */
  function projectionCards(data) {
    const cards = data.projection.cards;
    if (!cards.length) return '';
    return `<div class="v4-dossier-milestones">${cards.map(card => `<div class="v4-dossier-milestone">`
      + `<p class="v4-dossier-milestone-kicker">${escapeText(card.kicker)}</p>`
      + `<p class="v4-dossier-milestone-amount">${escapeText(card.totalText)}</p>`
      + `<dl class="v4-dossier-milestone-rows">${card.rows.map(row => `<div class="v4-dossier-milestone-row">`
        + `<dt><span class="dot pot-${row.key}" aria-hidden="true"></span>${escapeText(row.label)}</dt>`
        + `<dd><span class="v4-dossier-milestone-value">${escapeText(row.text)}</span>${row.share !== null ? `<span class="v4-dossier-milestone-share">${row.share} %</span>` : ''}</dd>`
        + `</div>`).join('')}</dl>`
      + `</div>`).join('')}</div>`;
  }
  /* Zustandskarte über der Grafik (grüner Haken oder Hinweis auf den Aufbrauch). */
  function projectionStatus(data) {
    const status = data.projection.status;
    if (!status || data.projection.points.length < 2) return '';
    return `<div class="v4-dossier-status is-${status.tone}">`
      + `<span class="v4-dossier-status-icon" aria-hidden="true">${icon(status.tone === 'covered' ? 'circleCheck' : 'infoCircle', 30)}</span>`
      + `<div><p class="v4-dossier-status-title">${escapeText(status.title)}</p><p class="v4-dossier-status-text">${escapeText(status.text)}</p></div></div>`;
  }

  function render(data) {
    const pages = [];
    const retired = data.person.retired === true;
    /* Seitenzahlen werden fortlaufend vergeben: entfällt eine Seite (Varianten im Post-Modus,
       weil es dort keinen Kapitalbezug gibt), bleiben sie lückenlos. */
    let pageNumber = 1;
    const nextPage = (title, subtitle, body) => pages.push(page(++pageNumber, title, subtitle, body));
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
      + (data.person.name || data.person.meetingOn
        ? `<p class="v4-dossier-for">${data.person.name ? `Vorbereitet für ${escapeText(data.person.name)}` : 'Beratungsvorbereitung'}${data.person.meetingOn ? ` · Gespräch vom ${escapeText(data.person.meetingOn)}` : ''}</p>`
        : '')
      + `<ul class="v4-dossier-pills">${pills.map(pill => `<li>${escapeText(pill)}</li>`).join('')}</ul></div>`
      + `<div class="v4-dossier-body"><h2 class="v4-dossier-section-title">Die zentralen Zahlen</h2>`
      + `<div class="v4-dossier-tiles">${data.summary.tiles.map(metricCard).join('')}</div>`
      + `<div class="v4-dossier-result${data.summary.tone === 'gap' ? ' is-gap' : ''}">`
      + `<div><p class="v4-dossier-kicker">Ergebnis</p><p class="v4-dossier-result-headline">${escapeText(data.summary.headline)}</p><p class="v4-dossier-result-note">${escapeText(data.summary.note)}</p></div>`
      + `<div class="v4-dossier-result-value"><p class="v4-dossier-kicker">${escapeText(data.summary.rest.label)}</p>${amount(data.summary.rest.text, {strong:true, size:'result'})}<p class="v4-dossier-result-note">${escapeText(data.summary.rest.caption)}</p></div>`
      + `</div></div></section>`);

    /* Seite 2 – Einkommen und Bedarf */
    const ratio = data.need.covered
      ? `<p class="v4-dossier-note is-strong">Dein Einkommen deckt den Bedarf vollständig – es ist keine Entnahme aus dem Vermögen nötig.</p>`
      : (data.need.incomeShare !== null && data.need.withdrawalShare !== null)
        ? `<div class="v4-dossier-ratio" role="img" aria-label="Anteile: ${data.need.incomeShare} % Einkommen, ${data.need.withdrawalShare} % Vermögensentnahme">`
          + `<div class="v4-dossier-ratio-bar"><span class="income" style="width:${data.need.incomeShare}%"></span><span class="wealth" style="width:${data.need.withdrawalShare}%"></span></div>`
          + `<ul class="v4-dossier-ratio-labels"><li><span class="dot income" aria-hidden="true"></span>${data.need.incomeShare} % Einkommen</li><li><span class="dot wealth" aria-hidden="true"></span>${data.need.withdrawalShare} % Vermögensentnahme</li></ul></div>`
        : missingBlock('Für die Aufteilung fehlen noch Angaben.');
    nextPage('So finanzierst du deinen Ruhestand', 'Einkommen, Steuern und die notwendige Entnahme aus deinem Vermögen.',
      `<div class="v4-dossier-columns"><div class="v4-dossier-card"><p class="v4-dossier-card-title">${retired ? 'Dein Einkommen heute' : 'Einkommen im ersten Planjahr'}</p>`
      + `<dl class="v4-dossier-rows">${data.income.sources.map(source => valueRow({label:source.label, text:source.text, amount:source.amount})).join('')}${data.income.rows.map(row => valueRow(row)).join('')}</dl>`
      + `${data.income.estimateNote ? `<p class="v4-dossier-note">${escapeText(data.income.estimateNote)}</p>` : ''}</div>`
      + `<div class="v4-dossier-card"><p class="v4-dossier-card-title">Bedarf und Deckung</p>`
      + `<dl class="v4-dossier-rows">${valueRow(data.need.net, {strong:true})}${valueRow(data.need.fromIncome)}${valueRow(data.need.fromWealth)}</dl>`
      + ratio + `</div></div>`);

    /* Seite 3 – Vermögen. Im Post-Modus steht hier das **heute** verfügbare Vermögen; die
       Formulierung «zum Start der Pensionierung» wäre falsch, weil die Pensionierung zurückliegt. */
    nextPage(retired ? 'Dein Vermögen heute' : 'Dein Vermögen zum Start der Pensionierung',
      retired ? 'Was dir heute für die Planung zur Verfügung steht – und was gebunden bleibt.' : 'Was für die Planung verfügbar ist – und was gebunden bleibt.',
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
      + `</div>`);
    /* Seite 4 – Töpfe */
    nextPage('So ist dein Kapital aufgeteilt', `Drei Töpfe mit unterschiedlichen Aufgaben${data.pots.yearLabel ? ` – Stand ${data.pots.yearLabel}` : ''}.`,
      data.pots.total > 0
        ? `<div class="v4-dossier-pots">${data.pots.rows.map(row => `<div class="v4-dossier-pot pot-${row.key}">`
          + `<p class="v4-dossier-pot-label">${escapeText(row.label)}</p>`
          + amount(row.text, {strong:true, size:'pot'})
          + `<p class="v4-dossier-pot-share">${row.share === null ? '–' : `${row.share} % des Startkapitals`}</p>`
          + `<p class="v4-dossier-pot-note">${escapeText(row.note)}</p></div>`).join('')}</div>`
          + `<p class="v4-dossier-note is-strong">Die Aufteilung wird im Zeitverlauf anhand des Kapitalbedarfs und der gewählten Strategie jährlich neu berechnet.</p>`
        : missingBlock('Solange kein verfügbares Kapital erfasst ist, gibt es keine Aufteilung auf die Töpfe.'));

    /* Seite 5 – Verlauf: Zustand, gestapelte Flächen mit drei beschrifteten Zeitpunkten,
       Zusammensetzung an Start, Mitte und Ende (Vorlage «So entwickelt sich dein Vermögen»). */
    nextPage('So entwickelt sich dein Vermögen', `Jahresprojektion von Alter ${data.projection.from ?? '–'} bis ${data.projection.to ?? '–'} – in heutiger Kaufkraft.`,
      projectionStatus(data) + projectionChart(data) + projectionCards(data));

    /* Seite 6 – PK-Varianten: **nur vor der Pensionierung.** Im Post-Modus gibt es keinen
       Kapitalbezug; die Variantenseite entfällt (dieselbe Regel wie in der App, wo ohne
       Kapitalbezug kein Variantenbereich existiert). */
    const variantColumns = data.variants.rows.map(variant => `<div class="v4-dossier-variant${variant.current ? ' is-current' : ''}">`
      + `<p class="v4-dossier-variant-head">${variant.share} % Kapitalbezug</p>`
      + (variant.current ? `<p class="v4-dossier-variant-badge">Dein aktueller Plan</p>` : `<p class="v4-dossier-variant-badge is-empty">&nbsp;</p>`)
      + `<dl class="v4-dossier-rows">${variant.rows.map(row => valueRow(row)).join('')}</dl></div>`).join('');
    if (!retired) nextPage('Deine PK-Varianten', 'Kapitalbezug, Rente und Reichweite im Vergleich – ohne Wertung.',
      data.variants.rows.length ? `<div class="v4-dossier-variants">${variantColumns}</div>` : missingBlock('Es ist erst eine Variante gespeichert.'));

    /* Seite 7 – Annahmen */
    nextPage('Annahmen deiner Planung', 'Alle Werte stammen aus deinen Angaben und den hinterlegten Modellannahmen.',
      `<div class="v4-dossier-card"><dl class="v4-dossier-rows">${data.assumptions.rows.map(row => valueRow(row)).join('')}</dl></div>`
      + `<p class="v4-dossier-disclaimer">${escapeText(data.disclaimer)}</p>`);

    /* Seite 8 – Nächste Entscheidungen und Notizen (nur wenn Themen im Plan vorkommen) */
    const notes = data.preparation?.notes ?? null;
    if (data.decisions.length || notes) {
      const notesCard = notes
        ? `<div class="v4-dossier-card is-muted"><p class="v4-dossier-card-title">Notizen aus der Vorbereitung</p><p class="v4-dossier-notes">${escapeText(notes)}</p></div>`
        : '';
      nextPage(data.decisions.length ? 'Deine nächsten Entscheidungen' : 'Notizen aus der Vorbereitung',
        data.decisions.length ? 'Themen, die in deiner Planung tatsächlich vorkommen.' : 'Festgehalten für das Beratungsgespräch.',
        (data.decisions.length ? `<div class="v4-dossier-decisions">${data.decisions.map(entry => `<div class="v4-dossier-decision">`
          + `<p class="v4-dossier-decision-title">${escapeText(entry.title)}</p><p class="v4-dossier-decision-text">${escapeText(entry.text)}</p></div>`).join('')}</div>` : '')
        + notesCard);
    }

    return `<div class="v4-dossier" data-pages="${pages.length}">${pages.join('')}</div>`;
  }

  root.V4Dossier = {build, render, NOT_CAPTURED};
})(globalThis);

