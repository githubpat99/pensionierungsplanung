const assert=require('node:assert/strict');
const M=require('./v2-state.js'),C=require('./retirement-calculator.js'),Tax=require('./tax-model.js'),T=require('./tax-detail.js');
const round=value=>Math.round(value*100)/100;
/* Buying-power-neutral reference: AHV 5'000 + weitere Einnahmen 1'000 pro Monat = 72'000 / Jahr. */
function state(mode='pre',{canton='AR',ahv=5000,other=0,additional=1000,need=6500,free=200000}={}){
 let s=M.fresh(mode);
 for(const [g,v] of [
  ['time',mode==='pre'?{age:60,retirement:65}:{age:70}],
  ['regular',{canton,ahv,other,additional}],['need',{need}],['free',{free}]
 ])s=M.apply(s,g,v);
 return s;
}
function summary(s){const plan=M.toPlan(s);return {plan,result:C.evaluatePlan(plan),t:T.summary(plan,C.evaluatePlan(plan))};}

// --- Kanton: ohne Kanton bleibt die Steuer ausdrücklich offen, nicht null Franken ---
const openState=state('pre',{canton:''});
const open=summary(openState);
assert.equal(open.t.yearly.tax,null,'without a canton no tax amount is claimed');
assert.equal(open.t.yearly.taxOpen,true);
assert.equal(open.t.yearly.rate,null);
assert.equal(open.t.yearly.canton,null);
// A new plan cannot be captured or completed without a canton; an older stand stays readable.
assert.ok(M.error('regular',{canton:'',ahv:5000,other:0,additional:1000},openState,{requireCanton:true}),'new input requires the canton');
assert.equal(M.error('regular',{canton:'AR',ahv:5000,other:0,additional:1000},openState,{requireCanton:true}),null);
assert.equal(M.complete(openState),false,'a new plan without a canton is not complete');
assert.equal(M.complete(openState,{requireCanton:false}),true,'an older stand without a canton stays readable');

// --- Einkommenssteuer: 72'000 / Jahr in AR zu 13,5 % ---
const taxed=summary(state());
assert.equal(taxed.t.yearly.canton,'AR');
assert.equal(taxed.t.yearly.cantonName,'Appenzell Ausserrhoden');
assert.equal(taxed.t.yearly.gross,72000);
assert.equal(taxed.t.yearly.taxable,72000);
assert.equal(taxed.t.yearly.rate,13.5);
assert.equal(taxed.t.yearly.tax,9720);
assert.equal(taxed.t.yearly.net,62280);
assert.equal(taxed.t.yearly.net/12,5190);
assert.equal(taxed.t.yearly.tax/12,810);
assert.equal(taxed.t.yearly.net,taxed.t.yearly.gross-taxed.t.yearly.tax,'net is gross minus the estimated tax');
assert.equal(taxed.result.incomeTax,taxed.t.yearly.tax);
assert.equal(taxed.result.monthlyIncomeNet,5190);
// The percentage comes from the central configuration, not from the presentation layer.
assert.equal(taxed.t.yearly.rate,Tax.getIncomeTaxRate('AR',72000));

// --- Kapitalentnahmen aus freiem Vermögen sind kein steuerbares Einkommen ---
const modest=summary(state('pre',{need:6000})),heavy=summary(state('pre',{need:12000}));
assert.ok(heavy.result.annualGap>modest.result.annualGap,'a higher need requires more capital withdrawal');
assert.equal(heavy.t.yearly.taxable,modest.t.yearly.taxable,'withdrawals are not taxable income');
assert.equal(heavy.t.yearly.tax,modest.t.yearly.tax,'withdrawals are not taxed a second time');
assert.equal(heavy.t.yearly.gross,modest.t.yearly.gross);

// --- PK-Kapital: brutto minus Bezugssteuer ergibt netto, netto plus freies Kapital das Startkapital ---
for(const share of [0,50,100]){
 let s=state();s=M.apply(s,'pension',{pk:600000,pkContrib:20000,pkShare:share});
 const s3=M.apply(s,'pension3a',{p3:120000,p3Contrib:7000});
 const {plan,t}=summary(s3),pk=C.calculatePension(plan),capital=C.calculateAvailableCapital(plan);
 assert.equal(t.once.share,share);
 assert.equal(t.once.pkGross,pk.cap);
 assert.equal(t.once.pkTax,pk.capitalTax);
 assert.equal(t.once.pkNet,pk.netCap);
 assert.equal(round(t.once.pkGross-t.once.pkTax),round(t.once.pkNet),`${share} %: gross minus withdrawal tax is the net capital`);
 assert.equal(t.once.existingFreeCapital,capital.existingFreeCapital);
 assert.equal(t.once.startCapital,capital.totalInvestableCapital);
 assert.equal(round(t.once.pkNet+t.once.existingFreeCapital),round(t.once.startCapital),`${share} %: PK net plus existing capital is the start capital`);
 assert.ok(t.once.startCapital>t.once.pkNet,'PK net is not the whole start capital');
 assert.equal(t.once.taxOpen,false);
 // Die laufende Steuer folgt der PK-Rente dieser Variante.
 assert.equal(t.yearly.sources.find(x=>x.id==='pk').annual,pk.rent);
 assert.equal(round(t.yearly.taxable),round(72000+pk.rent),`${share} %: taxable income is the running gross income`);
 if(share===0)assert.ok(pk.rent>0&&pk.cap===0);
 if(share===100)assert.equal(pk.rent,0);
}

// --- Varianten 0/50/100 bleiben in sich konsistent ---
const variants=[0,50,100].map(share=>{
 const s=M.apply(state(),'pension',{pk:600000,pkContrib:20000,pkShare:share});
 return {share,...summary(s)};
});
for(const v of variants){
 const pk=C.calculatePension(v.plan);
 assert.equal(round(v.t.once.pkGross+v.plan.assumptions.rates.uws*0),round(pk.cap),`${v.share} %: capital withdrawal from the shared calculator`);
 assert.equal(v.t.yearly.sources.find(x=>x.id==='pk').annual,pk.rent,`${v.share} %: running taxable income follows the PK rent`);
 assert.notEqual(v.result.assessment,'pending',`${v.share} %: a canton keeps the assessment in the calculated states`);
}
assert.ok(variants[0].t.yearly.tax>variants[2].t.yearly.tax,'more PK rent means more running income tax');
assert.ok(variants[2].t.once.pkTax>variants[0].t.once.pkTax,'more capital means a higher one-time withdrawal tax');
assert.equal(variants[0].t.once.pkTax,0,'a pure pension draws no capital');
assert.ok(variants[2].t.once.startCapital>variants[0].t.once.startCapital);

// --- Säule 3a: vorhandenes Guthaben wird gekennzeichnet, aber nicht besteuert ---
const with3a=M.apply(state(),'pension3a',{p3:120000,p3Contrib:7000});
assert.equal(summary(with3a).t.threeA.has3a,true);
assert.equal(summary(with3a).t.threeA.withdrawalTaxModelled,false,'the missing 3a withdrawal tax stays declared');
assert.equal(summary(state()).t.threeA.has3a,false,'no 3a hint without 3a capital');
const post=summary(state('post',{canton:'ZH'}));
assert.equal(post.t.once,null,'after retirement there is no future capital withdrawal');
assert.equal(post.t.threeA.has3a,false);
console.log('Passed: canton-open vs. canton-based tax, the 72\u2019000/13.5 % example, non-taxed capital withdrawals, PK gross/tax/net and start capital, the 0/50/100 variants and the declared 3a gap.');
