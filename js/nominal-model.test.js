/* Nominale Zahlenwelt (eine Einheit, keine Parallelrechnung) – Invarianten N-01 bis N-06:
 * N-01 Steuerbasis und ausgewiesene Steuer sind konsistent (Steuer = Satz × ausgewiesene Basis).
 * N-02 Alle Anzeigewerte einer Zeile stammen aus derselben nominalen Umrechnung.
 * N-03 Der Bedarf steigt mit der Inflationsannahme, nominal feste Renten bleiben konstant.
 * N-04 Renditen sind nominal: die nominale Entwicklung entspricht der realen × Preisfaktor.
 * N-05 Der Zielalterwert (nominal) entspricht dem letzten Punkt der nominalen Kapitalentwicklung.
 * N-06 Ohne Inflation (0 %) sind reale und nominale Sicht identisch (Rückwärtskompatibilität).
 * Geprüft wird der gemeinsame Rechenkern; es findet keine zweite Finanzrechnung statt. */
const assert = require('node:assert/strict');
const M = require('./v2-state.js'), C = require('./retirement-calculator.js'), Tax = require('./tax-model.js');
const near = (a, b, message, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${message}: ${a} != ${b}`);
function seed({inflation = 1.0, need = 9000, share = 100} = {}) {
  let s = M.fresh('pre'); s.riskProfile = 'balanced';
  for (const [group, values] of [
    ['time', {age:61, retirement:65}],
    ['regular', {canton:'AR', ahv:4166.67, other:0, additional:1000}],
    ['need', {need}],
    ['assets', {cash:20000, securities:10000, saving:0, otherAssets:5000}],
    ['pension3a', {p3:234500, p3Contrib:0}],
    ['pension', {pk:850000, pkContrib:50000, pkShare:share}]
  ]) s = M.apply(s, group, values);
  s = M.apply(s, 'assumptions', {...M.defaults, pkInterest:3, inflation, targetAge:s.targetAge, reviewed:true});
  return s;
}

for (const inflation of [0, 0.5, 1.0, 2.5]) {
  const plan = M.toPlan(seed({inflation})), result = C.evaluatePlan(plan);
  const rows = result.yearlyProjection.filter(row => !row.terminal);
  const code = plan.person.canton;
  rows.forEach((row, index) => {
    const n = row.nominal;
    const factor = Math.pow(1 + inflation / 100, row.age - rows[0].age);
    // N-02: dieselbe nominale Umrechnung für alle Werte der Zeile.
    near(n.factor, factor, `${inflation}% Alter ${row.age}: Preisfaktor`);
    near(n.free, row.free * factor, `${inflation}% Alter ${row.age}: Anfangsvermögen nominal`);
    near(n.end, row.end * factor, `${inflation}% Alter ${row.age}: Endvermögen nominal`);
    near(n.end, n.endBuckets.reduce((a, b) => a + b, 0), `${inflation}% Alter ${row.age}: Töpfe nominal = Total`);
    near(n.ret, row.ret * factor, `${inflation}% Alter ${row.age}: Rendite nominal`);
    // N-01: Steuer = Satz × ausgewiesene Basis (nominal), nicht auf einer anderen Basis.
    const rate = Tax.getIncomeTaxRate(code, n.taxableAnnualIncome);
    if (n.estimatedIncomeTax !== null && rate !== null) near(n.estimatedIncomeTax, n.taxableAnnualIncome * rate / 100, `${inflation}% Alter ${row.age}: Steuer = Satz × Basis`, 1);
    // N-03: Bedarf steigt nominal mit der Inflation, Renten bleiben nominal konstant.
    near(n.need, row.need * factor, `${inflation}% Alter ${row.age}: Bedarf nominal`);
    if (index > 0) {
      near(n.rent, rows[0].nominal.rent, `${inflation}% Alter ${row.age}: nominale Rente konstant`, 1e-6);
      if (inflation > 0) assert.ok(n.need > rows[index - 1].nominal.need, `${inflation}% Alter ${row.age}: Bedarf steigt nominal`);
    }
    // N-06: ohne Inflation sind beide Sichten identisch.
    if (inflation === 0) { near(n.free, row.free, 'ohne Inflation: real = nominal'); near(n.need, row.need, 'ohne Inflation: Bedarf gleich'); }
  });
  // N-05: Zielalterwert nominal = letzter Punkt der nominalen Kapitalentwicklung.
  const last = result.yearlyProjection.at(-1);
  near(result.capitalAtTargetAgeNominal, (last.nominal ?? last).free, `${inflation}%: Zielalterwert nominal = Chartendpunkt`);
  near(result.capitalAtTargetAgeNominal, result.capitalAtTargetAge * result.targetFactor, `${inflation}%: Zielalterwert nominal = real × Faktor`);
  // N-04: nominale Entwicklung = reale Entwicklung × Preisfaktor (nominale Renditen).
  const nominalSeries = rows.map(row => row.nominal.free), realSeries = rows.map(row => row.free);
  nominalSeries.forEach((value, index) => near(value, realSeries[index] * rows[index].nominal.factor, `${inflation}%: Reihe nominal = real × Faktor`));
}

console.log('Passed: nominale Zahlenwelt über 4 Inflationsannahmen (Steuer = Satz × ausgewiesene Basis, einheitliche nominale Umrechnung, steigender Bedarf bei nominell konstanten Renten, nominale Renditen, Zielalterwert = Chartendpunkt, 0 %-Rückfall auf die reale Sicht).');
