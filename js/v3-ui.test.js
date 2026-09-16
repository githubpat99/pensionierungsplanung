const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const M = require('./v2-state.js');
const C = require('./retirement-calculator.js');
const Tax = require('./tax-model.js');
// Exercise the real UI adapter helpers without a browser or production-only test hooks.
const node = {innerHTML:'',hidden:false,addEventListener(){},setAttribute(){},querySelectorAll:()=>[],querySelector:()=>null,focus(){},scrollIntoView(){}};
const context = vm.createContext({CheckV2State:M, RetirementCalculator:C, TaxModel:Tax, structuredClone,
  document:{getElementById:()=>node, querySelector:()=>node, addEventListener(){}}, window:{scrollTo(){}}});
let source = fs.readFileSync(require.resolve('./v3-ui.js'), 'utf8');
source = source.replace('window.V3 = {save, load, planFor};', `window.test = {
  seed(value) { state = structuredClone(value); currentShare = 45; previewShare = selectedShare = 90; selectedVariantIndex = 2; variants = [10,45,90]; },
  edit(values) { draft = values; state = pensionDraft(); },
  snapshot() { return {state,currentShare,previewShare,selectedVariantIndex,variants}; },
  planFor, currentVariants, readout, pensionBreakdown, editorFields, renderAssets,
  assets() { return assetComposition(state); },
  assetForm(part) { assetPart = part; const markup = assetComposition(state); assetPart = null; return markup; },
  applyAsset(part, values) { state = State.applyAsset(state, part, values); return state; }
};`);
source = source.replace("  setDraft('time'); renderForm('rents');\n})();", '})();');
vm.runInContext(source, context);
const UI = context.window.test;
const plain = value => JSON.parse(JSON.stringify(value));
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
for (const canton of ['', 'ZH']) {
  UI.seed(seed('pre', canton));
  const before = plain(UI.snapshot());
  const years = plain(UI.currentVariants()).map(item => item.result.yearlyProjection);
  UI.edit({pk:600000,pkContrib:25000,pkInterest:2,uws:6});
  const after = plain(UI.snapshot());
  for (const key of ['currentShare','previewShare','selectedVariantIndex','variants']) assert.deepEqual(after[key], before[key]);
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
    assert.equal(UI.readout(item).includes('PK-Kapital brutto'),!canton);
    assert.equal(UI.readout(item).includes('Steuern offen'),!canton);
  });
  assert.ok(!UI.editorFields('pension').some(f=>f.key==='pkShare'));
  assert.ok(!UI.editorFields('assumptions').some(f=>['pkInterest','uws'].includes(f.key)));
  assert.throws(()=>UI.edit({pk:-1,pkContrib:25000,pkInterest:2,uws:6}));
  assert.deepEqual(plain(UI.snapshot()),after,'invalid edits must not change committed data');
  assert.match(UI.pensionBreakdown(),canton ? /PK-Kapital netto/ : /Steuern offen/);
}
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
const assetState = M.apply(seed('pre', 'ZH'), 'pension3a', {p3:120000, p3Contrib:7000});
UI.seed(assetState);
let view = UI.assets();
assert.match(view, /Noch nicht aufgeteiltes Vermögen/);
assert.match(view, /Noch nicht erfasst/);
assert.ok(!view.includes('CHF 0'), 'unrecorded assets are never shown as a confirmed zero');
assert.match(view, /Gebundenes Vermögen/);
assert.match(view, /Dieses Vermögen ist aktuell nicht für laufende Entnahmen eingeplant\./);
// Säule 3a and the chosen PK capital come from Vorsorge and are never editable here.
assert.match(view, /data-open-vorsorge="pension3a"/);
assert.match(view, /data-open-vorsorge="pension"/);
assert.equal((view.match(/aus Vorsorge/g) || []).length, 2);
assert.ok(!view.includes('name="p3"') && !view.includes('name="pk"'), 'Vorsorge amounts must not be free capital inputs');
assert.match(UI.assetForm('otherAssets'), /name="otherAssets"/);
assert.match(UI.assetForm('otherAssets'), /Weitere verfügbare Vermögenswerte/);
const projected = C.calculateRetirementStart(UI.planFor(45)), available = C.calculateAvailableCapital(UI.planFor(45));
assert.ok(view.includes(cash(projected.p3)), 'projected Säule 3a comes from the shared calculator');
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
const rows = (b.assets.cash ?? 0) + (b.assets.securities ?? 0) + (b.assets.other ?? 0) + (b.assets.unallocated ?? 0) + (b.assets.p3 ?? 0) + (b.assets.pk ?? 0);
assert.equal(rows, b.result.availableCapital, 'every displayed amount is counted exactly once');
UI.seed(assetState);
UI.renderAssets();
assert.match(node.innerHTML, /Vermögen/);
assert.match(node.innerHTML, /Noch nicht erfasst/);
assert.match(node.innerHTML, /Gebundenes Vermögen/);
UI.seed(seed('post', 'ZH'));
const postView = UI.assets();
assert.ok(!postView.includes('data-open-vorsorge') && !postView.includes('name="p3"'));
assert.match(postView, /Bereits bezogenes PK- und 3a-Kapital ist in deinen verfügbaren Mitteln enthalten/);
console.log('Passed: V3 PK edits, shared engine/assumptions, all variants, active share, tax/no canton, invalid input, post-retirement capital and the asset page (menu, editing, Vorsorge sources, single counting).');
