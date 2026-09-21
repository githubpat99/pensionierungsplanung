/* Regression für das Variantenmanagement und die Berechnungs-Invarianten (Spec §6, §29–31).
 * Geprüft wird die tatsächliche State-/Persistenzlogik und der gemeinsame Rechenkern –
 * keine zweite Finanzimplementierung. */
const assert = require('node:assert/strict');
const M = require('./v2-state.js'), C = require('./retirement-calculator.js'), V = require('./v3-state.js');
const near = (a, b, message) => assert.ok(Math.abs(a - b) < 1e-6, `${message || ''} ${a} != ${b}`);
function seed(mode = 'pre') {
  let s = M.fresh(mode); s.riskProfile = 'balanced';
  for (const [group, value] of [
    ['time', mode === 'pre' ? {age:61, retirement:65} : {age:70}],
    ['regular', {canton:'AR', ahv:4166.67, other:0, additional:1000}],
    ['need', {need:9000}],
    ['assets', {cash:20000, securities:10000, saving:0, otherAssets:5000}],
    ['pension3a', {p3:234500, p3Contrib:0}],
    ['pension', mode === 'pre' ? {pk:850000, pkContrib:50000, pkShare:70} : {pkRent:2800}]
  ]) s = M.apply(s, group, value);
  s = M.apply(s, 'assumptions', {...M.defaults, pkInterest:3, targetAge:s.targetAge, reviewed:true});
  s.position = 'plan'; s.v3Variants = [70];
  return s;
}
const share = s => Number(s.details.pension?.pkShare ?? 0);
const planFor = (s, value) => { const plan = M.toPlan(s); plan.pensionDecision.capitalShare = value; return plan; };

// --- Drei feste, mutierbare Plätze ---------------------------------------------
const withShare = (state, value) => V.normalize({...state, v3Variants:undefined, details:{...state.details, pension:{...state.details.pension, pkShare:value}}});
let s = withShare(seed(), 50);
assert.deepEqual(V.variants(s), [0,50,100], 'eine neue Planung startet mit 0 / 50 / 100 %');
assert.deepEqual(V.variants(withShare(seed(), 61)), [0,61,100], 'ein bestehender Anteil ersetzt den mittleren Platz');
assert.deepEqual(V.variants(V.normalize({...s, v3Variants:[0,35,50]})), [0,35,50], 'bestehende drei Plätze bleiben unverändert');
assert.deepEqual(V.variants(V.normalize({...s, v3Variants:[0,35,70]})), [0,50,70], 'ein fehlender aktueller Anteil wird in die Plätze aufgenommen');
const before = JSON.stringify(C.evaluatePlan(planFor(s, 50)));
s = V.remember(s, 61, 2);
assert.deepEqual(V.variants(s), [0,50,61], 'der gewählte Platz wird mutiert');
assert.equal(share(s), 50, 'das Speichern lässt den aktuellen Plan unberührt');
assert.equal(JSON.stringify(C.evaluatePlan(planFor(s, 50))), before, 'das Speichern verändert keine Rechenwerte');
assert.deepEqual(V.variants(V.remember(s, 0, 2)), [0,50,61], 'kein doppelter Wert');
assert.deepEqual(V.variants(V.remember(s, 61, 1)), [0,50,61], 'ein bereits vorhandener Wert wird nicht erneut gespeichert');
const guarded = V.remember(s, 7, 1);
assert.equal(V.variants(guarded)[1], 50, 'der Platz des aktuellen Plans wird nie überschrieben');
assert.ok(V.variants(guarded).includes(50), 'der aktuelle Plan bleibt in den Varianten');
for (const invalid of [-1, 101, 1.5, NaN, '35']) assert.throws(() => V.remember(s, invalid), undefined, 'ungültige Anteile werden abgelehnt');

const activated = V.activate(s, 61);
assert.equal(share(activated), 61, 'Übernehmen setzt den aktuellen Plan');
assert.deepEqual(V.variants(activated), [0,50,61], 'die Plätze bleiben beim Übernehmen erhalten');
assert.equal(share(s), 50, 'die Quelle bleibt unverändert (kein Snapshot wird mutiert)');
assert.throws(() => V.remove(activated, 61), /aktuelle Plan/, 'der aktuelle Plan ist nicht entfernbar');
assert.deepEqual(V.variants(V.remove(activated, 0)), [50,61], 'die Zustands-API kann weiterhin Plätze entfernen');

// --- Invarianten je Variante (§31) ---------------------------------------------
for (const value of V.variants(activated)) {
  const plan = planFor(activated, value), result = C.evaluatePlan(plan);
  const capital = C.calculateAvailableCapital(plan, value), pension = C.calculatePension(plan, value);
  const first = result.yearlyProjection[0], rows = result.yearlyProjection.filter(row => !row.terminal);
  near(first.buckets.reduce((a, b) => a + b, 0), first.free, `${value} %: Töpfe = Startvermögen`);
  near(capital.existingFreeCapital + capital.netPkCapitalWithdrawal, capital.totalInvestableCapital, `${value} %: Startkapital = weiteres Kapital + PK netto`);
  near(capital.netPkCapitalWithdrawal + capital.pkWithdrawalTax, capital.grossPkCapitalWithdrawal, `${value} %: PK netto + Steuer = PK brutto`);
  near(pension.cap - (pension.capitalTax ?? 0), pension.netCap, `${value} %: PK netto aus calculatePension`);
  near(first.takes.reduce((a, b) => a + b, 0), first.withdrawal, `${value} %: Entnahme je Topf = Kapitalbedarf`);
  rows.forEach((row, index) => {
    near(row.net, row.end - row.free, `${value} %: Delta = Ende − Anfang`);
    if (index > 0) near(row.free, rows[index - 1].end + row.injection, `${value} %: Jahresanfang = Vorjahresende (+ Zufluss)`);
    row.takes.forEach(take => assert.ok(take >= 0, `${value} %: Entnahmen sind nicht negativ gespeichert`));
    const shares = row.endBuckets.map(value => row.end > 0 ? value / row.end * 100 : 0);
    assert.ok(Math.abs(shares.reduce((a, b) => a + b, 0) - 100) < 1e-6, `${value} %: Anteile ergeben 100 %`);
    assert.ok(row.endBuckets.every(bucket => bucket >= 0), `${value} %: Töpfe bleiben nicht negativ`);
    assert.equal(row.end, row.endBuckets.reduce((a, b) => a + b, 0), `${value} %: Endvermögen = Summe der Töpfe`);
  });
}

// --- Persistenz: Reload erzeugt keinen anderen Zustand -------------------------
const store = {m:new Map(), getItem(k){return this.m.get(k) ?? null;}, setItem(k,v){this.m.set(k,v);}, removeItem(k){this.m.delete(k);}};
store.setItem('retirement-v3-plan', JSON.stringify({version:2, savedAt:new Date().toISOString(), state:activated}));
const reloaded = V.decode(store.getItem('retirement-v3-plan')).state;
assert.deepEqual(V.variants(reloaded), V.variants(activated), 'Varianten überleben den Reload');
assert.equal(share(reloaded), share(activated), 'der aktuelle Plan überlebt den Reload');
assert.equal(JSON.stringify(C.evaluatePlan(M.toPlan(reloaded))), JSON.stringify(C.evaluatePlan(M.toPlan(activated))), 'idente Rechenwerte nach dem Reload');

// --- Randfall: aktueller Anteil nicht in den Varianten -------------------------
const inconsistent = seed(); inconsistent.v3Variants = [0, 50];
assert.throws(() => V.validate(inconsistent), /Aktueller Plan fehlt/, 'inkonsistente Stände werden abgelehnt');
assert.ok(V.variants(V.remember(inconsistent, 70)).includes(70), 'Speichern repariert den fehlenden Anteil');

console.log('Passed: Varianten speichern/übernehmen/entfernen ohne Mutation, höchstens drei Varianten, Persistenz-Roundtrip und die Berechnungs-Invarianten (Töpfe, Startkapital, PK netto, Jahresanfang, Delta, Anteile).');
