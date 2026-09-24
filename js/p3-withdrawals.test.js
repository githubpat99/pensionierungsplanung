/* Säule 3a: Bezugsplanung und Kapitalbezugssteuer (Spec §16).
   Geprüft wird der gemeinsame Rechenkern über den bestehenden Zustandsadapter; keine Nebenrechnung. */
const assert = require('node:assert/strict');
const M = require('./v2-state.js');
const C = require('./retirement-calculator.js');
const Tax = require('./tax-model.js');
const round = value => Math.round(value * 100) / 100;

function state({p3 = 0, p3Contrib = 0, mode = 'retirement', accounts = [], pk = 0, pkShare = 100, targetAge = 95, need = 60000, extra = []} = {}) {
  let s = M.fresh('pre'); s.riskProfile = 'growth';
  for (const [group, values] of [
    ['time', {age:60, retirement:65}],
    ['regular', {canton:'ZH', ahv:0, other:0, additional:0}],
    ['need', {need}], ['free', {free:0}],
    ['assets', {cash:0, securities:0, saving:0}],
    ['pension', {pk, pkContrib:0, pkShare}],
    ['pension3a', {p3, p3Contrib, p3Mode:mode, p3Accounts:accounts}],
    ['assumptions', {...M.defaults, targetAge, inflation:0.6}],
    ...extra
  ]) s = M.apply(s, group, values);
  return s;
}
const events = s => C.capitalWithdrawalEvents(M.toPlan(s));
const capital = s => C.calculateAvailableCapital(M.toPlan(s));
const p3Of = s => capital(s).p3;

// 1) 3a CHF 100'000, Standardbezug ein Jahr vor dem PK-Bezug: Steuer wird abgezogen, nur netto ist verfügbar.
{
  const s = state({p3:100000});
  const [event] = events(s), plan = M.toPlan(s), schedule = C.p3Schedule(plan).withdrawals[0];
  const rate = Tax.getCapitalWithdrawalTaxRate('ZH', schedule.gross), tax = schedule.gross * rate / 100;
  assert.equal(event.age, 64, 'Standardbezug ein Jahr vor der Pensionierung');
  assert.equal(round(event.gross), round(schedule.gross), 'der Bezug ist die 3a-Hochrechnung im Bezugsjahr');
  assert.ok(event.gross < C.calculateRetirementStart(plan).p3, 'ein Jahr früher bedeutet weniger Aufbau');
  assert.equal(round(event.tax), round(tax));
  assert.equal(round(event.net), round(schedule.gross - tax));
  assert.equal(p3Of(s).withdrawalAge, 64, 'das Bezugsalter ist ausgewiesen');
  assert.equal(p3Of(s).netAtStart, event.net, 'nur der Nettobetrag ist bei Pensionierung verfügbar');
  assert.equal(capital(s).totalInvestableCapital, event.net, 'das verfügbare Kapital enthält 3a nur netto');
  assert.ok(p3Of(s).netAtStart < event.gross, 'der Bruttobetrag wird niemals verfügbar');
  assert.equal(plan.assets.pre.p3, 100000, 'die Erfassung bleibt brutto');
}

// 2) 3a CHF 100'000, Bezug zwei Jahre nach Pensionierung: vorher gebunden, dann Nettozufluss.
{
  const s = state({p3:100000, mode:'later', accounts:[{name:'Helvetia', amount:100000, age:67}], p3Contrib:0, need:5000});
  const atRetirement = capital(s), plan = M.toPlan(s), [event] = events(s);
  assert.equal(event.age, 67);
  assert.equal(atRetirement.p3.netAtStart, 0, 'vor dem Bezugsjahr ist nichts verfügbar');
  assert.equal(round(atRetirement.boundP3Capital), round(C.calculateRetirementStart(plan).p3 * 1.045 ** 0), 'vor dem Bezug bleibt das Guthaben gebunden');
  assert.ok(atRetirement.boundP3Capital > 0);
  const projection = C.evaluatePlan(plan).yearlyProjection;
  const before = projection.find(row => row.age === 66), after = projection.find(row => row.age === 67);
  assert.equal(before.injection, 0, 'kein Zufluss vor dem Bezugsjahr');
  assert.equal(round(after.injection), round(event.net), 'im Bezugsjahr fliesst das Netto zu');
  assert.ok(before.gap > 0 && after.gap === 0, 'im Bezugsjahr deckt der Zufluss die Lücke');
  assert.ok(after.free > 0, 'das zugeflossene Kapital steht danach zur Verfügung');
}

// 3) Zwei 3a-Konten im selben Jahr: gemeinsame Steuerbasis.
{
  const s = state({p3:155000, mode:'later', accounts:[{name:'Konto A', amount:80000, age:66}, {name:'Konto B', amount:75000, age:66}]});
  const [event] = events(s);
  assert.equal(event.items.length, 2);
  assert.equal(round(event.gross), round(event.items[0].gross + event.items[1].gross), 'beide Konten bilden eine gemeinsame Basis');
  const rate = Tax.getCapitalWithdrawalTaxRate('ZH', event.gross);
  assert.equal(round(event.tax), round(event.gross * rate / 100));
  assert.equal(round(event.tax), round(event.items[0].tax + event.items[1].tax), 'die Steuer wird auf die Konten aufgeteilt');
  assert.ok(event.tax > Tax.calculateCapitalWithdrawalTax('ZH', event.items[0].gross) + Tax.calculateCapitalWithdrawalTax('ZH', event.items[1].gross), 'die gemeinsame Basis ist nicht die Summe von Einzelsteuern');
}

// 4) Zwei 3a-Konten in unterschiedlichen Jahren: getrennte Jahresereignisse.
{
  const s = state({p3:155000, mode:'later', accounts:[{name:'Konto A', amount:80000, age:63}, {name:'Konto B', amount:75000, age:64}]});
  const list = events(s);
  assert.deepEqual(list.map(event => event.age), [63, 64]);
  const first = list[0], second = list[1];
  assert.equal(first.items.length, 1);
  assert.equal(round(first.tax), round(Tax.calculateCapitalWithdrawalTax('ZH', first.gross)));
  assert.equal(round(second.tax), round(Tax.calculateCapitalWithdrawalTax('ZH', second.gross)));
  assert.equal(capital(s).p3.netAtStart, first.net + second.net, 'beide Bezüge vor Pensionierung sind bei Pensionierung verfügbar');
}

// 5) PK und 3a im selben Jahr: gemeinsame Kapitalbezugsbasis.
{
  const s = state({p3:85000, mode:'later', accounts:[{name:'RB Mörschwil', amount:85000, age:65}], pk:500000, pkShare:100});
  const [event] = events(s), plan = M.toPlan(s), p3Item = event.items.find(item => item.id.startsWith('p3-'));
  assert.equal(event.age, 65);
  assert.equal(event.items.length, 2, 'PK und 3a liegen im selben Bezugsjahr');
  assert.equal(round(event.gross), round(C.calculatePension(plan).cap + p3Item.gross), 'die Basis ist hochgerechnetes PK-Kapital plus 3a-Bezug');
  const rate = Tax.getCapitalWithdrawalTaxRate('ZH', event.gross);
  assert.equal(round(event.tax), round(event.gross * rate / 100));
  const pension = C.calculatePension(plan);
  assert.equal(pension.sharedWithP3, true, 'die PK weist die gemeinsame Basis aus');
  assert.equal(round(pension.capitalTax), round(event.items.find(item => item.id === 'pk').tax));
  assert.ok(pension.capitalTax > Tax.calculateCapitalWithdrawalTax('ZH', pension.cap), 'keine Doppelbesteuerung, aber gemeinsame Basis');
  assert.ok(Math.abs(capital(s).totalInvestableCapital - event.net) < 1e-6, 'nur der Nettozufluss wird verfügbar');
}

// 6) PK und 3a in unterschiedlichen Jahren: getrennte Kapitalbezugsereignisse.
{
  const s = state({p3:85000, mode:'later', accounts:[{name:'RB Mörschwil', amount:85000, age:68}], pk:500000, pkShare:100});
  const list = events(s);
  assert.deepEqual(list.map(event => event.age), [65, 68]);
  assert.equal(round(list[0].tax), round(Tax.calculateCapitalWithdrawalTax('ZH', C.calculatePension(M.toPlan(s)).cap)));
  assert.equal(round(list[1].tax), round(Tax.calculateCapitalWithdrawalTax('ZH', list[1].gross)));
  assert.equal(C.calculatePension(M.toPlan(s)).sharedWithP3, false);
  assert.ok(capital(s).totalInvestableCapital < list[0].net + list[1].net, 'der spätere 3a-Bezug ist bei Pensionierung noch nicht verfügbar');
}

// 7) «Bezüge später planen» ohne Detailplanung: Default Pensionierungsjahr inklusive Steuer.
{
  const s = state({p3:100000, mode:'later', accounts:[]});
  const planning = p3Of(s), [event] = events(s);
  assert.equal(planning.planned, false);
  assert.equal(planning.reason, 'none');
  assert.equal(event.age, 64, 'ohne Planung gilt der Standardbezug ein Jahr vor der Pensionierung');
  assert.ok(event.tax > 0, 'die Steuer wird trotzdem berücksichtigt');
  assert.equal(planning.netAtStart, event.net);
}

// 8) Konten sind die Wahrheit: ihre Summe ergibt den Gesamtbetrag, ohne zweite Validierung.
{
  const s = state({p3:240000, mode:'later', accounts:[{name:'A', amount:80000, age:63}, {name:'B', amount:75000, age:64}]});
  const planning = p3Of(s), list = events(s), rate = 1 + M.toPlan(s).assumptions.rates.p3Return / 100;
  assert.equal(planning.planned, true, 'die Kontenplanung ist rechenbar');
  assert.deepEqual(list.map(event => event.age), [63, 64], 'die erfassten Bezugsalter wirken');
  assert.equal(round(list[0].gross), round(80000 * rate ** 3), 'jedes Konto trägt sein eigenes Guthaben');
  assert.equal(round(list[1].gross), round(75000 * rate ** 4));
  assert.equal(round(planning.grossTotal), round(list.reduce((sum, event) => sum + event.gross, 0)));
  assert.ok(planning.grossTotal < 240000 * rate ** 3, 'der Gesamtbetrag der Schnellerfassung wird nicht zusätzlich verteilt');
  // Ohne Konten gilt weiterhin der Gesamtbetrag mit der Default-Annahme.
  const open = state({p3:240000, mode:'later', accounts:[]});
  assert.equal(p3Of(open).planned, false);
  assert.deepEqual(events(open).map(event => event.age), [64], 'ohne Konten gilt der Standardbezug ein Jahr vor der Pensionierung');
}

// 9) Kein 3a-Betrag: bestehende Berechnung unverändert.
{
  const withZero = state({p3:0, pk:500000, pkShare:50});
  const legacy = state({pk:500000, pkShare:50});
  delete legacy.details.pension3a;
  const a = C.calculateAvailableCapital(M.toPlan(withZero)), b = C.calculateAvailableCapital(M.toPlan(legacy));
  assert.deepEqual(events(withZero).map(event => event.age), [65], 'ohne 3a-Guthaben entsteht nur das PK-Ereignis');
  assert.ok(events(withZero).every(event => event.gross > 0), 'leere 3a erzeugt keinen Bezug');
  assert.equal(a.totalInvestableCapital, b.totalInvestableCapital, 'ohne 3a bleibt die Kapitalbasis gleich');
  assert.deepEqual(C.evaluatePlan(M.toPlan(withZero)).yearlyProjection.map(row => row.free), C.evaluatePlan(M.toPlan(legacy)).yearlyProjection.map(row => row.free));
}

// 10) Keine Doppelzählung von gebundenem und verfügbarem 3a-Kapital.
{
  const s = state({p3:240000, mode:'later', accounts:[{name:'A', amount:80000, age:63}, {name:'B', amount:75000, age:64}, {name:'C', amount:85000, age:68}]});
  const breakdown = capital(s), planning = breakdown.p3, plan = M.toPlan(s);
  assert.equal(planning.planned, true);
  assert.equal(round(planning.grossAtStart + planning.grossLater), round(planning.withdrawals.reduce((sum, withdrawal) => sum + withdrawal.gross, 0)));
  assert.equal(round(planning.netAtStart + planning.taxAtStart), round(planning.grossAtStart), 'verfügbar wird nur der Nettobetrag');
  assert.equal(round(breakdown.boundP3Capital), round(planning.boundAtRetirement));
  assert.ok(planning.boundAtRetirement > 0 && planning.grossLater >= planning.boundAtRetirement, 'gebundenes Kapital wächst bis zum Bezug weiter');
  assert.equal(planning.withdrawals.filter(withdrawal => withdrawal.age <= 65).length, 2, 'zwei Konten werden vor der Pensionierung bezogen');
  assert.equal(round(breakdown.totalInvestableCapital), round(breakdown.existingFreeCapital + breakdown.netPkCapitalWithdrawal), 'weiteres Kapital inkl. 3a netto plus PK netto ergibt das Startkapital');
  assert.equal(round(breakdown.existingFreeCapital), round(planning.netAtStart), 'das weitere Kapital enthält hier nur den 3a-Nettobetrag');
  assert.ok(!C.evaluatePlan(plan).yearlyProjection.some(row => row.free >= planning.boundAtRetirement + breakdown.totalInvestableCapital), 'gebundenes 3a-Kapital erhöht das verfügbare Kapital nie');
  // Ein Bezug im Alter 68 darf vorher keine Lücke schliessen.
  const paid = state({p3:120000, mode:'later', accounts:[{name:'Spät', amount:120000, age:75}], need:5000});
  const rows = C.evaluatePlan(M.toPlan(paid)).yearlyProjection;
  assert.ok(rows.find(row => row.age === 74).free < 1000, 'das späte Guthaben steht vor dem Bezugsjahr nicht zur Verfügung');
  assert.ok(rows.find(row => row.age === 75).injection > 100000, 'im Bezugsjahr fliegt es netto zu');
}

console.log('Passed: Säule 3a – Bezug bei/nach Pensionierung, gemeinsame Steuerbasis je Jahr (mehrere Konten und PK+3a), gestaffelte Bezüge, Default-Annahme, Konsistenzprüfung, unveränderte Berechnung ohne 3a und keine Doppelzählung.');