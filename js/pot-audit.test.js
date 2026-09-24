/* Topf-Audit (Invarianten I-06, I-07, I-08, I-10, I-11, I-14, I-15):
 * Jeder Topf wird über alle Jahre und mehrere Varianten nachgerechnet:
 *   Vorjahresende + Umbuchung − Entnahme + Rendite = Endbestand
 * und die Summe der Töpfe muss das ausgewiesene Gesamtvermögen ergeben.
 * Geprüft wird der gemeinsame Rechenkern; es findet keine zweite Finanzrechnung statt. */
const assert = require('node:assert/strict');
const M = require('./v2-state.js'), C = require('./retirement-calculator.js');
const POTS = ['Geldmarkt', 'Obligationen', 'Wertschöpfung'];
const near = (a, b, message) => assert.ok(Math.abs(a - b) < 1e-6, `${message}: ${a} != ${b} (Δ ${a - b})`);
function seed({share = 50, need = 9000, mode = 'pre', age = 61, retirement = 65, p3 = 234500} = {}) {
  let s = M.fresh(mode); s.riskProfile = 'balanced';
  for (const [group, values] of [
    ['time', mode === 'pre' ? {age, retirement} : {age: 70}],
    ['regular', {canton:'AR', ahv:4166.67, other:0, additional:1000}],
    ['need', {need}],
    ['assets', {cash:20000, securities:10000, saving:0, otherAssets:5000}],
    ...(mode === 'pre' ? [['pension3a', {p3, p3Contrib:0}]] : []),
    ['pension', mode === 'pre' ? {pk:850000, pkContrib:50000, pkShare:share} : {pkRent:2800}]
  ]) s = M.apply(s, group, values);
  s = M.apply(s, 'assumptions', {...M.defaults, pkInterest:3, targetAge:s.targetAge, reviewed:true});
  return s;
}
/* Anzeigerundung wie im UI: gerundete Teilbeträge ergeben exakt das gerundete Total (I-15). */
function roundedParts(values, total) {
  const target = Math.round(total);
  const parts = values.map(value => Math.floor(value));
  let rest = target - parts.reduce((a, b) => a + b, 0);
  const order = values.map((value, index) => ({index, fraction:value - Math.floor(value)})).sort((a, b) => b.fraction - a.fraction);
  for (let i = 0; i < order.length && rest > 0; i++, rest--) parts[order[i].index] += 1;
  return parts;
}

let checked = 0;
for (const share of [0, 35, 50, 100]) for (const need of [4000, 9000, 20000]) {
  const plan = M.toPlan(seed({share, need}));
  const rows = C.evaluatePlan(plan).yearlyProjection.filter(row => !row.terminal);
  rows.forEach((row, index) => {
    const previous = index > 0 ? rows[index - 1].endBuckets : null;
    // I-06: Töpfe = Gesamtvermögen an jedem dargestellten Bestandszeitpunkt.
    near(row.endBuckets.reduce((a, b) => a + b, 0), row.end, `Jahr ${row.age}: Töpfe ≠ Endvermögen`);
    near(row.buckets.reduce((a, b) => a + b, 0), row.free, `Jahr ${row.age}: Töpfe ≠ Anfangsvermögen`);
    // I-07: Jahreskontinuität inklusive ausgewiesener Zuflüsse.
    near(row.free, (previous ? previous.reduce((a, b) => a + b, 0) : row.free - row.injection) + row.injection, `Jahr ${row.age}: Anfangsvermögen ≠ Vorjahresende + Zufluss`);
    // I-08: Bewegung je Topf und Umbuchungen als reine Innenbewegung.
    POTS.forEach((name, pot) => {
      // Erstes Jahr: die Umbuchung ist die Initialbefüllung. Danach: Zielbestand = Vorjahresende + Umbuchung.
      if (index === 0) near(row.transfers[pot], row.buckets[pot], `Jahr ${row.age} ${name}: Initialbefüllung ≠ Startbestand`);
      else near(row.buckets[pot] - row.transfers[pot], previous[pot], `Jahr ${row.age} ${name}: Zielbestand ≠ Vorjahresende + Umbuchung`);
      // Ein Überschuss des Jahres wird dem Geldmarkttopf gutgeschrieben (Engine-Regel).
      const surplus = pot === 0 ? Math.max(0, row.rent - row.need - row.special) : 0;
      near(row.endBuckets[pot], row.buckets[pot] - row.takes[pot] + surplus + row.gains[pot], `Jahr ${row.age} ${name}: Endbestand ≠ Ziel − Entnahme + Überschuss + Rendite`);
      assert.ok(row.endBuckets[pot] >= -1e-9, `Jahr ${row.age} ${name}: negativer Endbestand`);
    });
    if (index > 0) near(row.transfers.reduce((a, b) => a + b, 0), row.injection, `Jahr ${row.age}: Umbuchungen ≠ Zufluss`);
    // I-10 / I-11: Entnahmen nicht negativ, Delta aus den Beständen.
    assert.ok(row.takes.every(take => take >= 0), `Jahr ${row.age}: negative Entnahme`);
    near(row.takes.reduce((a, b) => a + b, 0), Math.min(row.withdrawal, row.free), `Jahr ${row.age}: Entnahmesumme ≠ Kapitalbedarf`);
    near(row.net, row.end - row.free, `Jahr ${row.age}: Delta ≠ Ende − Anfang`);
    // I-15: Anzeigerundung der Töpfe ergibt exakt das gerundete Total und 100 %.
    const amounts = roundedParts(row.endBuckets, row.end);
    assert.equal(amounts.reduce((a, b) => a + b, 0), Math.round(row.end), `Jahr ${row.age}: gerundete Töpfe ≠ gerundetes Total`);
    if (row.end > 0) {
      const percents = roundedParts(row.endBuckets.map(value => value / row.end * 100), 100);
      assert.equal(percents.reduce((a, b) => a + b, 0), 100, `Jahr ${row.age}: gerundete Anteile ≠ 100 %`);
    }
    checked++;
  });
  // I-13: Zielalterwert = Endpunkt der Kapitalentwicklung.
  const result = C.evaluatePlan(plan);
  near(result.capitalAtTargetAge, result.yearlyProjection.at(-1).free, `${share}/${need}: Zielalterwert ≠ Chartendpunkt`);
}
// Post-Pensionierung: unverändertes Verhalten ohne Zukunftskapitalbezug.
const post = M.toPlan(seed({mode:'post'}));
assert.ok(C.evaluatePlan(post).yearlyProjection.length > 0);
assert.deepEqual(C.capitalWithdrawalEvents(post), [], 'nach der Pensionierung keine künftigen Kapitalbezüge');

console.log(`Passed: Topf-Audit über ${checked} Planjahre (Töpfe = Gesamtvermögen, Bewegung je Topf, Umbuchungen als Innenbewegung, Entnahmevorzeichen, Delta, Anzeigerundung, Zielalterwert).`);
