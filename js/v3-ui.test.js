const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const M = require('./v2-state.js');
const C = require('./retirement-calculator.js');
const Tax = require('./tax-model.js');
// Exercise the real UI adapter helpers without a browser or production-only test hooks.
const node = {innerHTML:'',hidden:false,addEventListener(){},setAttribute(){},querySelectorAll:()=>[],querySelector:()=>null,getBoundingClientRect:()=>({width:0}),focus(){},scrollIntoView(){}};
const context = vm.createContext({CheckV2State:M, RetirementCalculator:C, TaxModel:Tax, structuredClone, ResizeObserver:class{observe(){} disconnect(){}},
  document:{getElementById:()=>node, querySelector:()=>node, addEventListener(){}}, window:{scrollTo(){}}});
let source = fs.readFileSync(require.resolve('./v3-ui.js'), 'utf8');
source = source.replace('window.V3 = {save, load, planFor};', `window.test = {
  seed(value) { state = structuredClone(value); },
  edit(values) { draft = values; state = pensionDraft(); },
  snapshot() { return {state,share:chosenShare()}; },
  planFor, currentVariants, readout, pensionBreakdown, editorFields, renderAssets, renderPlan, renderDetail, renderP3Plan, renderP3Account, renderP3Effect, renderCompare, renderYearByYear, p3Section, loadDemo, rentFields, taxRow, taxPanel, taxAssumptionHint, amountValue, formatAmount,
  assets() { return assetComposition(state); },
  assetForm(part) { assetPart = part; const markup = assetComposition(state); assetPart = null; return markup; },
  applyAsset(part, values) { state = State.applyAsset(state, part, values); return state; },
  applyAssetOptional(part, values) { state = State.applyAsset(state, part, values, {keepOptional:true}); return state; }
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
// Die Beispielplanung lädt meine Planungswerte (Kanton AR) und zeigt sofort Ergebnisse.
UI.loadDemo();
const demoState = UI.snapshot().state;
assert.equal(demoState.canton,'AR');
assert.equal(demoState.values.age,61);
assert.equal(demoState.values.retirement,65);
assert.equal(demoState.values.need,9000);
assert.equal(demoState.details.pension.pk,850000);
assert.equal(demoState.details.pension.pkContrib,50000,'PK-Sparbeiträge 50\'000 / Jahr');
assert.equal(demoState.details.pension.pkShare,50);
assert.equal(demoState.details.assumptions.pkInterest,3,'die PK-Verzinsung 3 % wird geladen');
assert.equal(demoState.details.assumptions.targetAge,87,'der Horizont kommt automatisch aus dem Alter');
assert.equal(demoState.details.assumptions.uws,5.2,'übrige Annahmen bleiben auf den Standardwerten');
assert.equal(demoState.details.pension3a.p3,234500);
assert.equal(demoState.details.pension3a.p3Mode,'later');
assert.deepEqual(demoState.details.pension3a.p3Accounts.map(account=>[account.name,account.amount,account.age]),[['Helvetia',160000,68],['RB SG',44500,66],['RB Mö',30000,70]]);
assert.equal(demoState.details.income.additional,1000,'weitere Einnahmen 1\'000 / Monat');
assert.equal(demoState.details.income.ahv,4166.67,'AHV 50\'000 / Jahr im Monatsfeld');
assert.equal(demoState.details.assets.cash,20000,'Bank/liquide Mittel 20\'000');
assert.equal(demoState.details.assets.securities,10000,'Wertschriften 10\'000');
assert.equal(demoState.details.assets.saving,0);
assert.ok(UI.planFor(50),'Beispielplanung liefert ohne Zwischenschritt ein Planobjekt');
// Mit Vermögen ist der Plan vollständig: Regler und Variantenvergleich stehen bereit.
assert.match(node.innerHTML,/id="shareRange"/,'der PK-Regler erscheint');
assert.match(node.innerHTML,/data-compare/,'der Variantenvergleich ist erreichbar');
assert.match(node.innerHTML,/Renten gesamt · vor Steuern/,'die Einkommensübersicht erscheint');
assert.ok(UI.pensionBreakdown().includes('Appenzell Ausserrhoden'),'PK-Seite nennt den Kanton');
const demoPlan = C.calculatePension(UI.planFor(50),50);
assert.deepEqual(UI.snapshot().state.details.pension3a.p3Accounts.map(a=>a.age),[68,66,70]);
assert.equal(Math.round(demoPlan.rent/12),2526,'PK-Rente der geladenen Planung');
assert.equal(Math.round(C.calculateRetirementStart(UI.planFor(50)).sec),11925,'Wertschriften wachsen bis 65 mit der hinterlegten Annahme');
assert.equal(Math.round(C.calculateAvailableCapital(UI.planFor(50),50).totalInvestableCapital),555899,'Startkapital aus Vermögen, PK netto und 3a');
// In der Einkommensübersicht steht die Steuerzeile zwischen Brutto und Netto (vollständiger Plan).
UI.seed(seed('pre','ZH'));
UI.renderPlan();
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
const additionalRow = incomeBlock.match(/<span>Weitere Einnahmen<\/span><strong>(CHF [\d']+) /);
assert.ok(additionalRow,'die weiteren Einnahmen stehen als eigene Zeile');
const beforeTax = toChf(grossIncome[1]) + toChf(additionalRow[1]);
assert.equal(beforeTax - toChf(rowTax[1]), toChf(netIncome[1]),'Renten und weitere Einnahmen minus geschätzte Steuern ergeben das ausgewiesene Netto');
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
// --- UX-Verdichtung: Pflichtfeld-Stern, Betragsformat, optionale Felder, Speicherstatus, Vergleich ---
// Pflichtfelder werden mit «*» gekennzeichnet; der ausgeschriebene Hinweis entfällt.
UI.seed(seed('pre','ZH'));
UI.renderDetail('personal');
assert.match(node.innerHTML,/Dein Wohnsitzkanton <span class="v3-required" aria-hidden="true">\*<\/span>/,'der Pflichtkanton trägt den Stern');
assert.ok(!node.innerHTML.includes('Pflichtangabe'),'kein ausgeschriebener Pflichttext mehr');
UI.renderDetail('pension');
assert.match(node.innerHTML,/name="pk" type="text" inputmode="decimal" autocomplete="off" data-amount value="500&#39;000"/,'Betragsfelder zeigen Tausendertrennzeichen und bleiben Textfelder');
assert.match(node.innerHTML,/PK-Guthaben heute <span class="v3-required" aria-hidden="true">\*<\/span>/);
assert.match(node.innerHTML,/name="pkInterest"[\s\S]{0,200}?type="number"/,'Prozentfelder bleiben Zahlenfelder');
// Optionale Betragsfelder bleiben leer und gelten als nicht erfasst statt als 0.
UI.seed(seed('pre','ZH'));
const optionalForm = UI.assetForm('otherAssets');
assert.match(optionalForm,/id="asset-input-otherAssets"[^>]*data-amount data-optional="true" value=""/,'optionales Feld startet leer und ist markiert');
assert.match(optionalForm,/Weitere verfügbare Vermögenswerte<\/label>/,'optionales Feld ohne Stern');
assert.match(UI.assetForm('cash'),/Bank \/ liquide Mittel <span class="v3-required" aria-hidden="true">\*<\/span>/,'erfasste Pflichtfelder tragen den Stern');
UI.applyAssetOptional('otherAssets', {otherAssets:''});
assert.equal(UI.snapshot().state.details.assets.otherAssets, undefined,'leeres optionales Feld wird nicht zu 0');
UI.applyAssetOptional('otherAssets', {otherAssets:'0'});
assert.equal(UI.snapshot().state.details.assets.otherAssets, 0,'eine ausdrückliche 0 bleibt erhalten');
// Beträge werden für die Anzeige gruppiert und beim Lesen wieder numerisch interpretiert.
assert.equal(UI.formatAmount('194500'), "194'500");
assert.equal(UI.formatAmount(1200000), "1'200'000");
assert.equal(UI.formatAmount('1234.5'), "1'234.5");
assert.equal(UI.formatAmount(''), '');
assert.equal(UI.amountValue("120'000"), '120000','Trennzeichen werden beim Lesen ignoriert');
assert.equal(UI.amountValue('1 234'), '1234');
assert.equal(UI.amountValue('1500,50'), '1500.50');
assert.equal(M.breakdown(M.apply(seed('pre','ZH'),'assets',{cash:UI.amountValue("120'000"),securities:0,saving:0})).assets.cash,120000,'die Berechnung erhält den numerischen Wert');
// Ohne erfasstes Vermögen und ohne PK entsteht keine Lückenprognose.
const incomplete = M.apply(M.apply(seed('pre','ZH'),'assets',{cash:0,securities:0,saving:0}),'pension',{pk:0,pkContrib:0,pkShare:45});
delete incomplete.details.assets; delete incomplete.details.pension; delete incomplete.values.free;
UI.seed(incomplete);
UI.renderPlan();
assert.match(node.innerHTML,/class="v3-status pending">Vervollständige deinen Plan, um die langfristige Entwicklung zu sehen\.</,'keine Lücke aus unvollständigen Daten');
assert.ok(!node.innerHTML.includes('Finanzierungslücke'),'keine verfrühte Lückenaussage');
assert.match(node.innerHTML,/id="saveLabel">Noch nicht gespeichert</,'der Speicherstatus startet neutral');
assert.match(node.innerHTML,/<button type="button" data-save>Jetzt speichern<\/button>/,'der Speicherknopf heisst «Jetzt speichern»');
assert.ok(!node.innerHTML.includes('separat gespeichert'),'kein technischer Speicherhinweis');
assert.ok(!node.innerHTML.includes('Auf diesem Gerät speichern'));
// Mit vollständigen Daten bleibt die qualitative Aussage erhalten.
UI.seed(seed('pre','ZH'));
UI.renderPlan();
assert.match(node.innerHTML,/class="v3-status (covered|gap)">(Unter den gewählten Annahmen|Finanzierungslücke)/,'mit erfassten Daten bleibt die Aussage');
// Variantenvergleich: kompakter Kopf, integrierter Umschalter, flache Grafik ohne doppelte Wertzeile.
UI.seed(seed('pre','ZH'));
node.querySelector = () => node;
UI.renderCompare();
node.querySelector = () => null;
const compareHtml = node.innerHTML;
assert.match(compareHtml,/class="v3-compare-sub">So entwickelt sich dein Kapital bis Alter 95\.</,'Subline nennt den Horizont');
assert.ok(!compareHtml.includes('Deine Wahl: '),'keine separate Zeile «Deine Wahl»');
assert.match(compareHtml,/class="v3-compare-head"><h2>Kapitalentwicklung <details class="v3-info v3-info-sub">[\s\S]*?<\/details><\/h2><label class="v3-compare-toggle"><span>Alle Varianten<\/span><input type="checkbox" id="compareLines" role="switch"/,'Umschalter sitzt im Kartenkopf');
assert.ok(!compareHtml.includes('Drei Verläufe gemeinsam anzeigen'),'keine eigene Zeile für die Checkbox');
assert.match(compareHtml,/class="v3-chosen-line">45 % PK-Kapital · <strong>Deine Wahl<\/strong>/);
assert.match(compareHtml,/class="v3-chart-legend" data-chart-legend/,'Legende direkt unter der Grafik');
assert.ok(!compareHtml.includes('v3-chart-readout'),'keine doppelte Wertzeile unter der Grafik');
assert.match(compareHtml,/PK-Aufteilung im Vergleich <details/,'der Vergleich trägt sein eigenes ⓘ');
assert.match(compareHtml,/class="v3-subline">Monatliche Rente und Kapital zu Beginn \(Alter 65\)\.</,'kurze Subline statt Erklärtext');
assert.equal((compareHtml.match(/<div class="v3-comparison-card /g) || []).length, 3,'drei kompakte Varianten-Karten');
assert.match(compareHtml,/class="v3-comparison-head"><strong>50 % Kapital<\/strong>/,'Titel und Markierung teilen sich eine Zeile');
assert.ok(!compareHtml.includes('v3-chosen-note'),'die Zusatznotiz liegt hinter dem ⓘ');
assert.match(compareHtml,/data-back>← Mein Plan<\/button>/,'Rückweg bleibt am Seitenende');
assert.match(compareHtml,/data-v3-next="years"/,'Einstieg «Jahr für Jahr» aus dem Vergleich');
assert.match(UI.taxPanel(itemAt(50)),/data-v3-next="years"/,'Einstieg «Jahr für Jahr» auch aus den Steuerdetails');
// «Jahr für Jahr»: derselbe Rechenkern, ein Jahr in Schritten – keine zweite Rechnung.
UI.seed(seed('pre','ZH'));
node.querySelector = () => node;
UI.renderYearByYear();
node.querySelector = () => null;
const yearHtml = node.innerHTML;
const yearRow = C.evaluatePlan(UI.planFor(45)).yearlyProjection.find(row => row.age === 65);
// Kompakt: pro Schritt eine Zahl im Seitenfluss, die Herleitung liegt hinter dem ⓘ.
assert.ok(!yearHtml.includes('class="v3-year-summary"'),'keine doppelte Jahreszusammenfassung neben den Schritten');
const yearStepTitles = (yearHtml.match(/<div class="v3-year-step-title"><strong>([^<]+)<\/strong>/g) || []).map(chunk => chunk.replace(/[\s\S]*<strong>([^<]+)<\/strong>/,'$1'));
assert.deepEqual(yearStepTitles,['Einnahmen','Steuern','Einnahmen netto','Bedarf','Offen','Kapitalbezug','Die drei Töpfe zu Jahresbeginn','Rendite dieses Jahr','Startbefüllung der Töpfe','Kapital Ende Jahr'],'Schrittfolge des Jahres');
assert.equal((yearHtml.match(/class="v3-year-step-value"/g) || []).length,9,'neun Schritte tragen genau eine Zahl');
assert.ok((yearHtml.match(/class="v3-info v3-info-sub"/g) || []).length >= 10,'jeder Schritt hat sein ⓘ mit der Herleitung');
assert.ok(!/class="v3-info v3-info-sub" open/.test(yearHtml),'die ⓘ sind standardmässig geschlossen');
const firstStep = yearHtml.slice(yearHtml.indexOf('<li class="v3-year-step'), yearHtml.indexOf('</li>'));
assert.ok(firstStep.includes(`<div class="v3-year-step-value"><strong>${money(yearRow.grossIncome)}</strong></div>`),'Schritt «Einnahmen» zeigt genau den Betrag vor Steuern');
assert.ok(!/AHV/.test(firstStep.split('v3-info-panel')[0]),'die Quellen stehen nicht mehr im Seitenfluss');
assert.match(firstStep,/v3-info-panel[\s\S]*AHV[\s\S]*Einnahmen gesamt/,'die Quellen liegen hinter dem ⓘ');
assert.match(yearHtml,/<strong>Einnahmen<\/strong><small>vor Steuern<\/small>/,'Einnahmen immer vor Steuern');
assert.match(yearHtml,/<strong>Steuern<\/strong><small>Einkommenssteuer<\/small>/);
assert.match(yearHtml,/<strong>Einnahmen netto<\/strong><small>nach Steuern<\/small>/,'Einnahmen netto als eigener Schritt');
assert.match(yearHtml,/<strong>Bedarf<\/strong><small>nach Steuern<\/small>/,'Bedarf nach Steuern');
assert.match(yearHtml,/<strong>Offen<\/strong><small>aus Vermögen<\/small>/,'Offen als eigener Schritt');
assert.match(yearHtml,/Steuern im ersten Jahr bereits berücksichtigt ✓/,'das erste Jahr ist gekennzeichnet');
assert.ok(yearHtml.includes(`Einnahmen gesamt</span><strong>${money(yearRow.grossIncome)}</strong>`),'Einnahmen gesamt stammt aus der Engine');
assert.match(yearHtml,/Kapitalbezugssteuer <small>[\d.,]+ %<\/small><\/span><strong>− CHF [\d']+<\/strong>/,'Bezugssteuer separat ausgewiesen');
assert.match(yearHtml,/Netto investiert/,'nur der Nettobetrag wird investiert');
assert.match(yearHtml,/<small>Geldmarkt<\/small><em>1 Jahr<\/em>/,'Topf 1 mit Untertitel «1 Jahr»');
assert.match(yearHtml,/<small>Obligationen<\/small><em>2 Jahre<\/em>/,'Topf 2 mit Untertitel «2 Jahre»');
assert.match(yearHtml,/<small>Wertschöpfung<\/small><em>Rest<\/em>/,'Topf 3 mit Untertitel «Rest»');
assert.match(yearHtml,/Kapitalbedarf des laufenden Jahres \(1 Jahr\): CHF /,'Zielwert des Geldmarkttopfs erklärt');
assert.match(yearHtml,/Geldmarkt = Kapitalbedarf der beiden Folgejahre|Kapitalbedarf der beiden Folgejahre/,'die Zielstruktur ist offengelegt');
assert.match(yearHtml,/Berechnung dieses Jahres ansehen/,'Detailberechnung pro Jahr');
assert.match(yearHtml,/Weiter zu Alter 66/,'Weiter zum nächsten Jahr');
assert.equal(UI.planFor(45).pensionDecision.capitalShare,45,'der Screen ändert die Planvariante nicht');
// Renditen: keine ausgewiesene Wertschriftenrendite, dafür offengelegte Mechanik.
UI.seed(seed('pre','ZH'));
UI.renderDetail('assumptions');
const assumptionHtml = node.innerHTML;
assert.ok(!assumptionHtml.includes('name="secReturn"'),'keine separat einstellbare Wertschriftenrendite');
assert.ok(!assumptionHtml.includes('label for="secReturn"'),'kein Eingabefeld für die Wertschriftenrendite');
assert.match(assumptionHtml,/separat einstellbare Wertschriftenrendite rechnen wir nicht/,'der Verzicht ist ausdrücklich benannt');
assert.match(assumptionHtml,/name="targetAge"/,'Horizont bleibt');
assert.match(assumptionHtml,/name="inflation"/,'Inflation bleibt');
assert.match(assumptionHtml,/name="p3Return"/,'3a-Rendite bleibt');
assert.ok(!/name="pkInterest"|name="uws"/.test(assumptionHtml),'PK-Raten bleiben im PK-Editor');
assert.match(assumptionHtml,/So rechnen wir mit Renditen/,'die Mechanik ist offengelegt');
assert.match(assumptionHtml,/internen Satz von 4,5 %/,'der intern verwendete Satz ist genannt');
assert.match(assumptionHtml,/<strong>Cash<\/strong> 0 %/,'Cash-Topf mit Satz');
assert.match(assumptionHtml,/<strong>Anleihen<\/strong> 1 %/,'Anleihentopf mit Satz');
assert.match(assumptionHtml,/<strong>Wertschöpfung<\/strong> 6 %/,'Wertschöpfungstopf mit Profilsatz');
assert.match(assumptionHtml,/Entnahme des laufenden Jahres/,'Entnahmemechanik ist erklärt');
assert.match(assumptionHtml,/einmalig beim Bezug abgezogen/,'keine Doppelbesteuerung der Entnahmen');
console.log('Passed: V3 PK edits, shared engine/assumptions, all variants, active share, mandatory canton without results, tax transparency, 3a withdrawal planning (capture, plan row, 3a overview, account screen, effect screen, chronological capital tax), invalid input, post-retirement capital, the asset page (menu, editing, Vorsorge sources, single counting), mandatory stars, amount formatting, optional fields, save status, no premature gap prognosis, the compact variant comparison, the disclosed return mechanics and the year-by-year screen.');;
