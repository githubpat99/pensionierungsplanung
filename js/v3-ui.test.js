const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const M = require('./v2-state.js');
const C = require('./retirement-calculator.js');
const Tax = require('./tax-model.js');
// Exercise the real UI adapter helpers without a browser or production-only test hooks.
const node = {innerHTML:'',hidden:false,addEventListener(){},setAttribute(){},querySelectorAll:()=>[],querySelector:()=>null,getBoundingClientRect:()=>({width:0}),focus(){},scrollIntoView(){}};
const context = vm.createContext({CheckV2State:M, RetirementCalculator:C, TaxModel:Tax, structuredClone,
  document:{getElementById:()=>node, querySelector:()=>node, addEventListener(){}}, window:{scrollTo(){}}});
let source = fs.readFileSync(require.resolve('./v3-ui.js'), 'utf8');
source = source.replace('window.V3 = {save, load, planFor};', `window.test = {
  seed(value) { state = structuredClone(value); },
  edit(values) { draft = values; state = pensionDraft(); },
  snapshot() { return {state,share:chosenShare()}; },
  planFor, currentVariants, readout, pensionBreakdown, editorFields, renderAssets, renderPlan, renderDetail, renderP3Plan, renderP3Account, renderP3Effect, p3Section, loadDemo, rentFields, taxRow, taxPanel, taxAssumptionHint,
  assets() { return assetComposition(state); },
  assetForm(part) { assetPart = part; const markup = assetComposition(state); assetPart = null; return markup; },
  applyAsset(part, values) { state = State.applyAsset(state, part, values); return state; }
};`);
source = source.replace("  setRentDraft(); renderForm('rents');\n})();", '})();');
vm.runInContext(source, context);
const UI = context.window.test;
const plain = value => JSON.parse(JSON.stringify(value));
const money = value => `CHF ${Math.round(value || 0).toLocaleString('de-CH').replace(/’/g, "'")}`;
function seed(mode, canton) {
  let s = M.fresh(mode); s.riskProfile = 'growth';
  for (const [group, values] of [
    ['time', mode === 'pre' ? {age:60, retirement:65} : {age:70}],
    ['regular', {canton, ahv:2500, other:200, additional:100}],
    ['need', {need:6500}], ['free', {free:650000}],
    ['pension', mode === 'pre' ? {pk:500000, pkContrib:20000, pkShare:45} : {pkRent:2000}],
    ['assumptions', {...M.defaults, targetAge:95, inflation:1.2, reviewed:true}]
  ]) s=M.apply(s,group,values);
  return s;
}
for (const canton of ['ZH', 'BE']) {
  UI.seed(seed('pre', canton));
  const before = plain(UI.snapshot());
  const years = plain(UI.currentVariants()).map(item => item.result.yearlyProjection);
  UI.edit({pk:600000,pkContrib:25000,pkInterest:2,uws:6});
  const after = plain(UI.snapshot());
  assert.equal(after.share, before.share);
  assert.equal(after.state.details.pension.pkShare,45);
  assert.equal(after.state.confirmed.assumptions,false);
  assert.equal(after.state.riskProfile,'growth');
  assert.equal(after.state.details.assumptions.inflation,1.2);
  assert.equal(after.state.targetAge,95);
  assert.deepEqual(after.state.details.income,before.state.details.income);
  UI.currentVariants().forEach((item, i) => {
    assert.equal(item.plan.assets.pre.pk,600000);
    assert.equal(item.plan.assumptions.contributions.pkContrib,25000);
    assert.notDeepEqual(plain(item.result.yearlyProjection),years[i]);
    assert.deepEqual(plain(item.result),plain(C.evaluatePlan(item.plan)));
    assert.equal(item.pension.rent,item.pension.base*.06);
    assert.equal(item.pension.capitalTax,Tax.calculateCapitalWithdrawalTax(canton,item.pension.cap));
    // Mit Pflichtkanton gibt es keinen «Steuern offen»-Zustand mehr.
    assert.ok(UI.readout(item).includes('PK-Kapital netto'));
    assert.ok(!UI.readout(item).includes('Steuern offen'));
  });
  assert.ok(!UI.editorFields('pension').some(f=>f.key==='pkShare'));
  assert.ok(!UI.editorFields('assumptions').some(f=>['pkInterest','uws'].includes(f.key)));
  assert.throws(()=>UI.edit({pk:-1,pkContrib:25000,pkInterest:2,uws:6}));
  assert.deepEqual(plain(UI.snapshot()),after,'invalid edits must not change committed data');
  // PK-Detail zeigt Rente, Kapital und die aktuelle Aufteilung aus demselben Rechner.
  const breakdown = UI.pensionBreakdown();
  assert.match(breakdown,/PK-Rente/);
  assert.match(breakdown,/Deine aktuelle Aufteilung/);
  assert.match(breakdown,/55 % Rente \/ 45 % Kapital/);
  assert.match(breakdown,/id="pkRente"/);
  assert.match(breakdown,/id="pkKapital"/);
  assert.ok(breakdown.includes(`data-pk-rent>${money(C.calculatePension(UI.planFor(45)).rent / 12)}`),'PK-Rente im Detail stimmt mit dem gemeinsamen Rechner überein');
  assert.ok(breakdown.includes(`data-pk-rent-year>${money(C.calculatePension(UI.planFor(45)).rent)}`),'Jahresrente stammt aus demselben Wert');
  assert.match(breakdown,/data-pk-net>CHF/);
  // Steuertext nennt Betrag, Satz, ausgeschriebenen Kanton und die Modellgrenzen.
  const pkText = C.calculatePension(UI.planFor(45));
  assert.ok(breakdown.includes(Tax.canton(canton).name),'Steuertext nennt den ausgeschriebenen Kanton');
  assert.ok(breakdown.includes(`${money(pkText.cap)} × `) && breakdown.includes(`${money(pkText.capitalTax)}`),'Steuertext nennt Bezugsbetrag und Steuerbetrag');
  assert.match(breakdown,/Modellrechnung, keine individuelle Steuerberechnung/);
}
// V3-Pflichtkanton: ohne Kanton entstehen keine Ergebnisse, aber der Stand bleibt lesbar.
UI.seed(seed('pre',''));
assert.equal(UI.planFor(45),null,'ohne Kanton entsteht kein Planobjekt');
assert.deepEqual(plain(UI.currentVariants()),[]);
assert.match(UI.pensionBreakdown(),/Wohnsitzkanton/);
assert.match(UI.assets(),/Wohnsitzkanton/);
assert.ok(!UI.assets().includes('CHF'),'ohne Kanton zeigt die Vermögensseite keine Beträge');
assert.equal(UI.taxRow({result:{yearlyProjection:[{}],incomeTax:0},pension:{cap:0,capitalTax:0,netCap:0}}),'','ohne Kanton keine Steuerzeile');
UI.renderPlan();
assert.match(node.innerHTML,/Wohnkanton wählen/);
assert.match(node.innerHTML,/id="canton" name="canton" data-empty-label="Kanton wählen" aria-required="true" required/,'das Kantonstor verlangt eine Pflichtauswahl');
assert.match(node.innerHTML,/<option value="" disabled selected>Kanton wählen<\/option>/,'kein «noch offen»-Kanton, sondern ein Pflichtplatzhalter');
assert.ok(!node.innerHTML.includes('Noch offen'),'V3 kennt keinen optionalen Kantonsmodus');
assert.ok(!node.innerHTML.includes('CHF'),'ohne Kanton zeigt «Mein Plan» keine Beträge');
// Mit Kanton: Steuerzeile mit ⓘ statt eines Modellblocks am Seitenende.
UI.seed(seed('pre','ZH'));
const itemAt = share => { const plan = UI.planFor(share); return {plan, result: C.evaluatePlan(plan), pension: C.calculatePension(plan)}; };
const cantonField = UI.rentFields().find(f=>f.key==='canton');
assert.equal(cantonField.type,'canton');
assert.match(UI.taxAssumptionHint('ZH'),/Modellrechnung, keine individuelle Steuerberechnung/);
assert.match(UI.taxAssumptionHint('ZH'),/3a-Bezüge werden mit demselben vereinfachten kantonalen Modell geschätzt/);
UI.renderPlan();
assert.match(node.innerHTML,/Geschätzte Steuern/);
assert.match(node.innerHTML,/So rechnen wir mit Steuern/);
assert.match(node.innerHTML,/Steuerannahme ZH/);
assert.match(node.innerHTML,/Vereinfachte Planungsannahme für Zürich \(ZH\)/);
assert.match(node.innerHTML,/Modellrechnung, keine individuelle Steuerberechnung/);
assert.match(node.innerHTML,/Kapitalbezüge/);
assert.match(node.innerHTML,/Alter 65 · Pensionierung/);
assert.match(node.innerHTML,/Geschätzte Steuer<\/dt><dd>CHF [\d']+ \/ Jahr<small>CHF [\d']+ \/ Monat<\/small>/,'die Steuer wird pro Jahr und pro Monat genannt');
assert.ok(!node.innerHTML.includes('Steuern offen'),'«Steuern offen» existiert in V3 nicht mehr');
assert.ok(!UI.readout(itemAt(50)).includes('PK-Kapital brutto'),'die Kapitalkennzahl heisst netto');
// Die offengelegten Steuerannahmen nennen die Werte der gewählten PK-Quote.
const taxHalf = UI.taxRow(itemAt(50)), taxAllCapital = UI.taxRow(itemAt(100));
assert.notEqual(taxHalf, taxAllCapital);
assert.ok(taxAllCapital.includes(money(C.calculatePension(UI.planFor(100)).capitalTax)),'Bezugssteuer der gewählten Quote steht im Steuertext');
assert.ok(taxHalf.includes(money(C.calculatePension(UI.planFor(50)).capitalTax)));
assert.ok(taxAllCapital.includes('Kapitalbezüge') && taxHalf.includes('Laufende Einkommenssteuer'));
assert.match(UI.taxRow(itemAt(0)),/Ohne PK-Kapitalbezug und ohne 3a-Bezug entsteht keine Bezugssteuer/);
// Die Beispielplanung lädt den Beispielkanton AR mit und zeigt damit sofort Ergebnisse.
UI.loadDemo();
assert.equal(UI.snapshot().state.canton,'AR');
assert.ok(UI.planFor(50),'Beispielplanung liefert ohne Zwischenschritt ein Planobjekt');
assert.ok(UI.pensionBreakdown().includes('Appenzell Ausserrhoden'),'PK-Seite nennt den Beispielkanton');
// In der Einkommensübersicht steht die Steuerzeile zwischen Brutto und Netto.
const incomeBlock = node.innerHTML;
assert.ok(incomeBlock.indexOf('Renten gesamt') < incomeBlock.indexOf('Geschätzte Steuern'),'Steuerzeile folgt dem Bruttowert');
assert.ok(incomeBlock.indexOf('Geschätzte Steuern') < incomeBlock.indexOf('Einkommen netto'),'Steuerzeile steht vor dem Nettowert');
assert.match(incomeBlock,/Steuersatz [\d.,]+ %/,'der Satz des Kapitalbezugs ist sichtbar');
assert.match(incomeBlock,/linear zwischen den Referenzbeträgen/,'die Interpolation steht erst hinter dem zweiten ⓘ');
assert.ok(!incomeBlock.includes('id="taxAssumptions"'),'kein Modellblock am Seitenende');
// Alle ⓘ der Oberfläche nutzen dasselbe Muster.
assert.match(incomeBlock,/class="v3-info v3-info-sub"/,'auch das ⓘ der weiteren Renten nutzt das gemeinsame Muster');
assert.ok(!incomeBlock.includes('v3-source-detail'),'kein zweites Info-Muster mehr');
// Die sichtbare Rechnung bleibt nachvollziehbar: Jahr/12 = Monat und Brutto − Steuern = Netto.
const toChf = value => Number(String(value).replace(/[^0-9]/g, ''));
const taxCells = incomeBlock.match(/Geschätzte Steuer<\/dt><dd>CHF ([\d']+) \/ Jahr<small>CHF ([\d']+) \/ Monat<\/small>/);
assert.ok(taxCells,'die Steuer wird pro Jahr und pro Monat ausgewiesen');
assert.equal(toChf(taxCells[2]), Math.round(toChf(taxCells[1]) / 12),'Jahressteuer geteilt durch zwölf ergibt die ausgewiesene Monatssteuer');
const rowTax = incomeBlock.match(/v3-tax-amount">− (CHF [\d']+) \/ Monat/);
const grossIncome = incomeBlock.match(/Renten gesamt · vor Steuern<\/span><strong>(CHF [\d']+) \/ Monat/);
const netIncome = incomeBlock.match(/v3-income-total"><span>Einkommen netto<\/span><strong>(CHF [\d']+) \/ Monat/);
assert.ok(rowTax && grossIncome && netIncome,'Steuerzeile, Brutto und Netto sind sichtbar');
assert.equal(toChf(grossIncome[1]) - toChf(rowTax[1]), toChf(netIncome[1]),'Brutto minus geschätzte Steuern ergibt das ausgewiesene Netto');
// 100 % bzw. 0 % Kapital: Aufteilung, PK-Rente und PK-Kapital bleiben konsistent.
const allCapital = M.apply(seed('pre','ZH'),'pension',{pk:600000,pkContrib:20000,pkShare:100});
UI.seed(allCapital);
let variant = UI.pensionBreakdown();
assert.match(variant,/0 % Rente \/ 100 % Kapital/);
assert.ok(variant.includes(`data-pk-rent>${money(0)}`),'ohne Rentenbasis ist die PK-Rente CHF 0');
assert.ok(variant.includes(`data-pk-gross>${money(C.calculatePension(UI.planFor(100)).cap)}`),'das PK-Kapital bleibt der gemeinsame Rechenwert');
const allRent = M.apply(seed('pre','ZH'),'pension',{pk:600000,pkContrib:20000,pkShare:0});
UI.seed(allRent);
variant = UI.pensionBreakdown();
assert.match(variant,/100 % Rente \/ 0 % Kapital/);
assert.ok(variant.includes(`data-pk-gross>${money(0)}`),'ohne Kapitalanteil entsteht kein Kapitalbezug');
assert.ok(variant.includes(`data-pk-rent>${money(C.calculatePension(UI.planFor(0)).rent / 12)}`),'die volle PK-Rente stammt aus demselben Rechner');
UI.seed(seed('post','ZH'));
UI.edit({pkRent:2500});
const post = UI.planFor(90), capital = C.calculateAvailableCapital(post);
assert.equal(post.income.post.pkRent,30000);
assert.equal(capital.totalInvestableCapital,650000);
assert.equal(capital.pkWithdrawalTax,0);
assert.equal(C.evaluatePlan(post).incomeGross,63600);
assert.deepEqual(plain(UI.editorFields('pension')).map(f=>f.key),['pkRent']);
assert.ok(!UI.pensionBreakdown().includes('pkBreakdown'));
// --- V3 Vermögensdetailseite: menu page, editing, Vorsorge sources and single counting ---
const cash = value => `CHF ${Math.round(value || 0).toLocaleString('de-CH').replace(/’/g, "'")}`;
const assetState = M.apply(seed('pre', 'ZH'), 'pension3a', {p3:120000, p3Contrib:7000, p3Mode:'retirement', p3Accounts:[]});
UI.seed(assetState);
let view = UI.assets();
assert.match(view, /Noch nicht aufgeteiltes Vermögen/);
assert.match(view, /Noch nicht erfasst/);
assert.ok(!view.includes('CHF 0'), 'unrecorded assets are never shown as a confirmed zero');
assert.match(view, /Gebundenes Vermögen/);
assert.match(view, /Dieses Vermögen ist aktuell nicht für laufende Entnahmen eingeplant\./);
// Transparenz im neuen UI-Muster: Zahlen zuerst, Erklärung hinter dem ⓘ, Technik hinter dem zweiten ⓘ.
assert.match(view, /PK-Kapital netto/);
assert.match(view, /Geschätzte Kapitalbezugssteuer für Zürich: CHF/);
assert.match(view, /Die 3a-Bezugssteuer wird mit demselben vereinfachten kantonalen Modell geschätzt/);
assert.match(view, new RegExp(Tax.canton('ZH').name));
assert.equal((view.match(/class="v3-info"/g) || []).length, 2, 'je ein ⓘ für den PK-Bezug und die 3a-Modellgrenze');
assert.equal((view.match(/v3-info-sub/g) || []).length, 1, 'die Interpolation liegt hinter dem zweiten ⓘ');
assert.ok(!/v3-hint">[^<]*linear zwischen den Referenzbeträgen/.test(view), 'keine technische Annahme im Seitenfluss');
// Säule 3a and the chosen PK capital come from Vorsorge and are never editable here.
assert.match(view, /data-open-vorsorge="pension3a"/);
assert.match(view, /data-open-vorsorge="pension"/);
assert.equal((view.match(/aus Vorsorge/g) || []).length, 2);
assert.ok(!view.includes('name="p3"') && !view.includes('name="pk"'), 'Vorsorge amounts must not be free capital inputs');
assert.match(UI.assetForm('otherAssets'), /name="otherAssets"/);
assert.match(UI.assetForm('otherAssets'), /Weitere verfügbare Vermögenswerte/);
const projected = C.calculateRetirementStart(UI.planFor(45)), available = C.calculateAvailableCapital(UI.planFor(45));
assert.ok(available.p3 && available.p3.netAtStart > 0, 'ohne Detailplanung gilt der Bezug bei Pensionierung');
assert.ok(view.includes(cash(available.p3.netAtStart)), 'die Säule 3a steht netto nach Bezugssteuer im verfügbaren Vermögen');
assert.ok(available.p3.netAtStart < projected.p3, 'der 3a-Bruttobetrag wird nie vollständig als verfügbares Kapital geführt');
assert.ok(!view.includes(`<strong>${cash(projected.p3)}</strong>`), 'der 3a-Bruttobetrag erscheint nicht als verfügbarer Betrag');
assert.ok(view.includes(cash(available.netPkCapitalWithdrawal)), 'the chosen PK capital withdrawal comes from the shared calculator');
assert.ok(view.includes(cash(C.evaluatePlan(UI.planFor(45)).availableCapital)), 'the total is the shared available capital');
// A newly identified source reduces an existing aggregate instead of adding a second time.
const beforeCash = plain(UI.planFor(45).assets.pre.cash), beforeFree = available.existingFreeCapital;
UI.applyAsset('otherAssets', {otherAssets:50000});
assert.equal(plain(UI.snapshot().state.details.assets.unallocated), 600000);
assert.equal(plain(UI.planFor(45).assets.pre.cash), beforeCash);
assert.equal(C.calculateAvailableCapital(UI.planFor(45)).existingFreeCapital, beforeFree);
// A later change of a known source moves the total by exactly its difference.
UI.applyAsset('otherAssets', {otherAssets:80000});
assert.equal(plain(UI.planFor(45).assets.pre.cash), beforeCash + 30000);
assert.equal(plain(UI.snapshot().state.details.assets.unallocated), 600000);
const b = M.breakdown(UI.snapshot().state);
const rows = (b.assets.cash ?? 0) + (b.assets.securities ?? 0) + (b.assets.other ?? 0) + (b.assets.unallocated ?? 0) + (b.p3 ? b.p3.netAtStart : 0) + (b.assets.pk ?? 0);
assert.equal(rows, b.result.availableCapital, 'every displayed amount is counted exactly once');
assert.ok(!rows || b.p3.netAtStart < b.assets.p3, 'Säule 3a zählt nur netto zum verfügbaren Kapital');
UI.seed(assetState);
UI.renderAssets();
assert.match(node.innerHTML, /Vermögen/);
assert.match(node.innerHTML, /Noch nicht erfasst/);
assert.match(node.innerHTML, /Gebundenes Vermögen/);
UI.seed(seed('post', 'ZH'));
const postView = UI.assets();
assert.ok(!postView.includes('data-open-vorsorge') && !postView.includes('name="p3"'));
assert.match(postView, /Bereits bezogenes PK- und 3a-Kapital ist in deinen verfügbaren Mitteln enthalten/);
// --- Säule 3a: Schnellerfassung mit Bezugswahl, Planbereich, Detailplanung und Rechendetails ---
const p3PlanState = M.apply(seed('pre','ZH'), 'pension3a', {p3:240000, p3Contrib:0, p3Mode:'later', p3Accounts:[
  {name:'Helvetia', amount:80000, age:63}, {name:'RB SG', amount:75000, age:64}, {name:'RB Mörschwil', amount:50000, age:65}, {name:'Säule 3a später', amount:35000, age:70}
]});
UI.seed(p3PlanState);
UI.renderPlan();
const planHtml = node.innerHTML;
// Mein Plan zeigt nur die kompakte, navigierbare Zeile.
assert.match(planHtml,/class="v3-p3-link"/);
assert.match(planHtml,/Säule 3a/);
assert.match(planHtml,/CHF 240'000 · 4 Konten · Bezüge 63, 64, 65, 70/);
assert.match(planHtml,/data-v3-next="pension3aplan"/);
assert.ok(!/3a-Bezüge anpassen|Kapitalbezugssteuern gesamt/.test(planHtml),'keine 3a-Steuerkennzahlen und kein eigener Planen-Button auf «Mein Plan»');
const planned = UI.planFor(45), plannedCapital = C.calculateAvailableCapital(planned);
assert.ok(plannedCapital.p3.planned, 'eine konsistente Kontenplanung ersetzt die Default-Annahme');
assert.ok(plannedCapital.boundP3Capital > 0, 'nicht bezogene Konten bleiben gebunden');
// Rechendetails: die Kapitalbezüge erscheinen chronologisch und je Jahr mit gemeinsamer Basis.
const item = {plan:UI.planFor(45), result:C.evaluatePlan(UI.planFor(45)), pension:C.calculatePension(UI.planFor(45))};
const panel = UI.taxPanel(item);
assert.match(panel,/Kapitalbezüge/);
assert.match(panel,/Alter 63/);
assert.match(panel,/Alter 64/);
assert.match(panel,/Alter 65 · Pensionierung/);
assert.match(panel,/Helvetia/);
assert.match(panel,/RB Mörschwil/);
assert.match(panel,/Säule 3a später/);
assert.match(panel,/PK-Kapital/);
assert.match(panel,/Kapitalbezüge gesamt/,'PK und 3a im selben Jahr bilden eine gemeinsame Basis');
assert.match(panel,/Geschätzte Bezugssteuer/);
assert.match(panel,/Netto ins Vermögen/);
assert.ok(!panel.includes('Bezugsplanung noch offen'),'eine konsistente Planung zeigt keine Default-Annahme mehr');
// Ohne Detailplanung deklariert die Rechnung die Default-Annahme transparent.
UI.seed(M.apply(seed('pre','ZH'), 'pension3a', {p3:120000, p3Contrib:0, p3Mode:'later', p3Accounts:[]}));
const openItem = {plan:UI.planFor(45), result:C.evaluatePlan(UI.planFor(45)), pension:C.calculatePension(UI.planFor(45))};
const openPanel = UI.taxPanel(openItem);
assert.match(openPanel,/Säule 3a – Bezugsplanung noch offen/);
assert.match(openPanel,/Aktuelle Planungsannahme: Gesamter Bezug bei Pensionierung/);
// Schnellerfassung: ein Gesamtbetrag und die Wahl des Bezugszeitpunkts, Default Bezug bei Pensionierung.
UI.seed(M.apply(seed('pre','ZH'), 'pension3a', {p3:120000, p3Contrib:7000}));
UI.renderDetail('pension3a');
assert.match(node.innerHTML,/name="p3Mode" value="retirement" checked/);
assert.match(node.innerHTML,/name="p3Mode" value="later"/);
assert.match(node.innerHTML,/Bezug bei Pensionierung/);
assert.match(node.innerHTML,/Bezüge später planen/);
assert.match(node.innerHTML,/Wir rechnen mit dem gesamten Bezug bei Pensionierung inklusive geschätzter Kapitalbezugssteuer/);
assert.match(node.innerHTML,/data-p3-hint/);
UI.seed(p3PlanState);
UI.renderDetail('pension3a');
assert.match(node.innerHTML,/name="p3Mode" value="later" checked/,'die gewählte Bezugsplanung bleibt erhalten');
assert.match(node.innerHTML,/Für die erste Berechnung rechnen wir vorläufig mit Bezug bei Pensionierung/,'die Schnellerfassung deklariert die Annahme als vorläufig');
// Screen 1 «Säule 3a planen»: Kontenliste, Werkzeuge und die Wirkung der laufenden Planung.
UI.seed(p3PlanState);
UI.renderP3Plan();
const p3PlanHtml = node.innerHTML;
assert.match(p3PlanHtml,/Säule 3a planen/);
assert.match(p3PlanHtml,/← Mein Plan/,'die Übersicht führt über den Kopf zurück zu «Mein Plan»');
assert.match(p3PlanHtml,/data-back/);
assert.match(p3PlanHtml,/Gesamt[\s\S]{0,400}?<\/dt><dd>CHF 240'000/,'die Summe der Konten ist der Gesamtbetrag');
assert.match(p3PlanHtml,/Konten<\/dt><dd>4/);
assert.match(p3PlanHtml,/data-p3-account="0"/,'jede Kontenzeile öffnet das Konto');
assert.match(p3PlanHtml,/Helvetia/);
assert.match(p3PlanHtml,/RB Mörschwil/);
assert.match(p3PlanHtml,/data-p3-add/);
assert.match(p3PlanHtml,/\+ Konto hinzufügen/);
assert.match(p3PlanHtml,/Deine Planung/);
assert.match(p3PlanHtml,/Bezugssteuer gesamt/);
assert.match(p3PlanHtml,/Netto aus 3a/);
assert.match(p3PlanHtml,/data-p3-effect/,'«Auswirkungen ansehen» öffnet die Analyse');
assert.match(p3PlanHtml,/Auswirkungen ansehen/);
assert.match(p3PlanHtml,/Planung übernehmen/);
assert.match(p3PlanHtml,/data-p3-commit/);
assert.ok(!p3PlanHtml.includes('data-p3-total'),'der Gesamtbetrag ist nicht separat editierbar – die Konten sind die Wahrheit');
assert.ok(!/Summe der Konten|data-p3-sum/.test(p3PlanHtml),'keine Summenkontrolle mehr, weil es nur eine Wahrheit gibt');
// Screen 2 «3a-Konto bearbeiten»: ein Konto, Live-Wirkung, Entfernen ab zwei Konten.
UI.renderP3Account(1);
const p3AccountHtml = node.innerHTML;
assert.match(p3AccountHtml,/3a-Konto bearbeiten/);
assert.match(p3AccountHtml,/← Säule 3a/,'das Kontoscreen führt zurück in den 3a-Flow');
assert.match(p3AccountHtml,/data-back-p3/);
assert.match(p3AccountHtml,/id="p3AccountName"/);
assert.match(p3AccountHtml,/id="p3AccountAmount"/);
assert.match(p3AccountHtml,/<select id="p3AccountAge"/,'das Bezugsalter wird als Auswahl gesetzt');
assert.match(p3AccountHtml,/<option value="64" selected>Alter 64<\/option>/,'das gespeicherte Bezugsalter ist vorausgewählt');
assert.match(p3AccountHtml,/data-p3-live/,'die Wirkung der Eingabe wird im Konto sofort ausgewiesen');
assert.match(p3AccountHtml,/data-p3-remove/);
assert.match(p3AccountHtml,/>Übernehmen</);
// Screen 3 «Auswirkung deiner 3a-Planung»: Steuervergleich, Kurvenumschalter und Stützpunkte.
node.querySelector = () => node;
UI.renderP3Effect();
node.querySelector = () => null;
const p3EffectHtml = node.innerHTML;
assert.match(p3EffectHtml,/Auswirkung deiner 3a-Planung/);
assert.match(p3EffectHtml,/← Säule 3a/);
assert.match(p3EffectHtml,/data-back-p3/);
assert.match(p3EffectHtml,/Kapitalbezugssteuer/);
assert.match(p3EffectHtml,/Netto aus 3a/);
assert.match(p3EffectHtml,/Gegenüber Bezug bei Pensionierung/);
assert.match(p3EffectHtml,/name="p3curve" value="plan" checked/);
assert.match(p3EffectHtml,/name="p3curve" value="baseline"/);
assert.match(p3EffectHtml,/data-p3-chart/);
assert.match(p3EffectHtml,/Alter 65 · Pensionierung/,'der Stützpunkt bei Pensionierung ist markiert');
assert.match(p3EffectHtml,/<th scope="col">Deine Planung<\/th><th scope="col">Bezug bei Pensionierung<\/th>/);
assert.match(p3EffectHtml,/data-p3-commit/);
console.log('Passed: V3 PK edits, shared engine/assumptions, all variants, active share, mandatory canton without results, tax transparency, 3a withdrawal planning (capture, plan row, 3a overview, account screen, effect screen, chronological capital tax), invalid input, post-retirement capital and the asset page (menu, editing, Vorsorge sources, single counting).');
