const assert=require('node:assert/strict');
const M=require('./v2-state.js'),C=require('./retirement-calculator.js'),Engine=require('./retirement-engine.js');
const memory=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};
function core(mode='pre'){
 let s=M.fresh(mode);
 for(const [g,v] of [['time',mode==='pre'?{age:60,retirement:65}:{age:70}],['need',{need:7500}],['regular',{canton:'',ahv:3430,pkRent:0,other:0,additional:0}],['free',{free:650000}]])s=M.apply(s,g,v);
 s.position='plan';return s;
}
function legacyCore(){const s=core();delete s.details.income;delete s.confirmed.income;delete s.riskProfile;return s;}
const pension={pk:550000,pkContrib:22000,pkShare:50};
const pension3a={p3:120000,p3Contrib:7000};
let s=core(),r=C.evaluatePlan(M.toPlan(s));
assert.equal(r.availableCapital,650000);assert.equal(r.monthlyGap,4070);assert.equal(r.assessment,'pending');
assert.equal(M.quality(s),0);
let withPension=M.apply(s,'pension',pension);withPension=M.apply(withPension,'pension3a',pension3a);const p=M.toPlan(withPension),pk=C.calculatePension(p);
assert.equal(C.evaluatePlan(p).incomeGross,3430*12+pk.rent,'the regular income total is now recorded without PK; the computed pension is added once');
const firstCapital=C.calculateAvailableCapital(p);assert.equal(firstCapital.existingFreeCapital,650000+C.calculateRetirementStart(p).p3);
assert.equal(C.evaluatePlan(p).availableCapital,firstCapital.totalInvestableCapital);
s=M.apply(withPension,'income',{canton:'AR',ahv:2350,other:80,additional:0});
assert.equal(C.evaluatePlan(M.toPlan(s)).incomeGross,2430*12+C.calculatePension(M.toPlan(s)).rent);
s=M.apply(s,'assets',{cash:50000,securities:600000,saving:10000});assert.equal(M.quality(s),1);
s=M.apply(s,'assumptions',{...M.defaults,targetAge:s.targetAge,reviewed:true});assert.equal(M.quality(s),2);
const store=memory();M.save(store,s,'dark');const loaded=M.load(store).state;
assert.deepEqual(C.evaluatePlan(M.toPlan(loaded)),C.evaluatePlan(M.toPlan(s)));
assert.equal(M.quality(loaded),2);
assert.deepEqual(C.evaluatePlan(M.toPlan(s)).yearlyProjection,Engine.simulate(C.simulationInput(M.toPlan(s))));
const legacyPension=M.apply(legacyCore(),'pension',{...pension,includedPk:1000});
assert.equal(legacyPension.details.pension.includedPk,1000);
M.save(store,legacyPension,'system');
assert.equal(legacyPension.values.regular,2430);
assert.equal(legacyPension.details.pension.includedPk,undefined);
assert.equal(C.evaluatePlan(M.toPlan(M.load(store).state)).incomeGross,2430*12+C.calculatePension(M.toPlan(legacyPension)).rent);
const legacyCombined=M.apply(legacyCore(),'pension',{...pension,p3:120000,p3Contrib:7000});
assert.equal(legacyCombined.details.pension.p3,120000);
M.save(store,legacyCombined,'system');
assert.equal(legacyCombined.details.pension.p3,undefined);
assert.equal(legacyCombined.details.pension3a.p3,120000);
assert.equal(legacyCombined.confirmed.pension3a,true);
const changed=M.apply(s,'need',{need:7600});assert.equal(M.quality(changed),1);assert.ok(changed.details.pension);
const aged=M.apply(s,'time',{age:80,retirement:80});assert.equal(aged.targetAge,90);assert.equal(aged.details.assumptions.targetAge,90);M.save(store,aged,'system');assert.equal(M.quality(aged),0);
const manual=M.apply(s,'assumptions',{...M.defaults,targetAge:95,reviewed:true});assert.equal(M.apply(manual,'time',{age:61,retirement:66}).targetAge,95);
assert.throws(()=>M.apply(manual,'time',{age:96,retirement:96}));
let post=core('post');post=M.apply(post,'income',{canton:'ZH',ahv:2350,pkRent:1000,other:80,additional:0});post=M.apply(post,'assets',{cash:50000,securities:600000});post=M.apply(post,'pension',{pkRent:1000});assert.equal(M.quality(post),1);
assert.equal(C.evaluatePlan(M.toPlan(post)).availableCapital,650000);
assert.equal(M.fields('pension',post).length,1);
const unknownVersion=JSON.stringify({version:99,state:s});store.setItem(M.key,unknownVersion);assert.throws(()=>M.load(store));assert.equal(store.getItem(M.key),unknownVersion);
store.setItem(M.key,'{broken');assert.throws(()=>M.load(store));assert.equal(store.getItem(M.key),'{broken');
assert.throws(()=>M.save({setItem(){throw Error('quota');}},s,'dark'));
console.log('Passed: aggregate reconciliation, PK/3a projection, quality confirmations, pre/post, horizon, persistence and corrupt/failed storage.');

// Separate early sources, PK only from Vorsorge, and preserved old returns.
let early=core();early=M.apply(early,'income',{canton:'',ahv:2500,pkRent:2000,other:100,additional:200});
assert.equal(C.evaluatePlan(M.toPlan(early)).monthlyIncomeNet,2800);
const decided=M.apply(early,'pension',pension),decidedPlan=M.toPlan(decided);
assert.equal(C.evaluatePlan(decidedPlan).incomeGross,2800*12+C.calculatePension(decidedPlan).rent);
assert.equal(M.toPlan(core()).riskProfile,'cautious');
const oldPlan=legacyCore(),oldResult=C.evaluatePlan(M.toPlan(oldPlan));
M.save(store,oldPlan,'dark');assert.equal(M.load(store).state.riskProfile,'balanced');
assert.deepEqual(C.evaluatePlan(M.toPlan(M.load(store).state)),oldResult);
for(const position of ['vorsorge','more']){const savedState={...decided,position};M.save(store,savedState,'dark');assert.equal(M.load(store).state.position,position);}
for(const mode of ['pre','post']){
 const state=core(mode),p=M.toPlan(state),r=C.evaluatePlan(p);
 assert.ok(Math.abs(r.bucketAllocation.reduce((a,b)=>a+b,0)-r.availableCapital)<1e-7);
 assert.equal(r.monthlyGap,Math.max(0,r.monthlyNeed-r.monthlyIncomeNet));
}
console.log('Passed: separated early income, PK only from Vorsorge, cautious V2 default, preserved old profile and navigation positions.');

for(const mode of ['pre','post'])for(const canton of ['','SG']){
 let detailed=core(mode);
 detailed=M.apply(detailed,'income',{canton,ahv:2500,pkRent:1500,other:100,additional:300});
 detailed=M.apply(detailed,'assets',{cash:50000,securities:200000,saving:5000,otherAssets:30000,propertyValue:800000,mortgage:300000});
 if(mode==='pre')detailed=M.apply(M.apply(detailed,'pension',pension),'pension3a',pension3a);
 const b=M.breakdown(detailed),r=C.evaluatePlan(M.toPlan(detailed));
 assert.equal(b.income.ahv+b.income.pk+b.income.other,r.incomeGross);
 assert.ok(Math.abs(['cash','securities','other','p3','pk'].reduce((sum,k)=>sum+(b.assets[k]??0),0)-r.availableCapital)<1e-7);
 assert.equal(b.assets.bound,500000);
 assert.equal(b.result.monthlyIncomeNet,r.monthlyIncomeNet);
 const withoutProperty=M.apply(detailed,'assets',{...detailed.details.assets,propertyValue:0,mortgage:0});
 assert.deepEqual(C.evaluatePlan(M.toPlan(withoutProperty)).yearlyProjection.map(x=>x.free),r.yearlyProjection.map(x=>x.free));
 const withDebt=M.apply(detailed,'assets',{...detailed.details.assets,propertyValue:100000,mortgage:200000});
 assert.equal(M.breakdown(withDebt).assets.bound,-100000);
 for(const position of ['income-detail','assets-detail','asset-funding','tax']){
  detailed.position=position;M.save(store,detailed,'system');
  assert.deepEqual(M.breakdown(M.load(store).state),b);
 }
}
const legacyTotals=legacyCore();
assert.equal(M.breakdown(legacyTotals).income.ahv,null);
assert.equal(M.breakdown(legacyTotals).income.unallocated,3430*12);
assert.equal(M.breakdown(legacyTotals).assets.unallocated,650000);
assert.equal(M.breakdown(legacyTotals).assets.bound,null);
const taxedLegacy=M.apply(legacyTotals,'tax',{canton:'SG'});
assert.equal(taxedLegacy.details.income,undefined);
assert.equal(M.breakdown(taxedLegacy).result.incomeGross,3430*12);
assert.ok(M.breakdown(taxedLegacy).result.incomeTax>0);
let taxState=M.apply(s,'tax',{canton:''});
assert.equal(M.quality(taxState),1);
taxState=M.apply(taxState,'assumptions',{...M.defaults,targetAge:taxState.targetAge,reviewed:true});
assert.equal(M.quality(taxState),1,'missing canton prevents well-supported status even with assumptions checked');
assert.equal(M.breakdown(taxState).result.incomeTax,null);
assert.throws(()=>M.apply(core(),'assets',{cash:0,securities:0,saving:0,propertyValue:100000}));
assert.throws(()=>M.apply(core(),'assets',{cash:0,securities:0,saving:0,otherAssets:-1}));
console.log('Passed: income/asset detail reconciliation, optional assets, property isolation, tax-only editor, unknown data and detail persistence.');

// Direct source editing preserves aggregate remainder and complete engine results.
for(const mode of ['pre','post']){
 let inline=core(mode);
 assert.ok(!M.fields('regular',inline).some(f=>f.key==='pkRent'));
 inline=M.applyAsset(inline,'property',{propertyValue:800000,mortgage:300000});
 assert.equal(M.breakdown(inline).result.availableCapital,650000);
 assert.equal(M.breakdown(inline).assets.cash,null);
 inline=M.applyAsset(inline,'cash',{cash:50000});
 assert.equal(M.breakdown(inline).assets.unallocated,600000);
 assert.equal(M.breakdown(inline).result.availableCapital,650000);
 inline.position='assets-detail';M.save(store,inline,'system');
 assert.deepEqual(M.breakdown(M.load(store).state),M.breakdown(inline));
 inline=M.applyAsset(inline,'securities',{securities:600000,saving:0});
 assert.equal(inline.confirmed.assets,true);
 assert.equal(M.breakdown(inline).assets.unallocated,null);
 const before=M.breakdown(inline).result;
 inline=M.applyAsset(inline,'cash',{cash:70000});
 assert.equal(M.breakdown(inline).result.availableCapital,before.availableCapital+20000);
 inline=M.applyAsset(inline,'otherAssets',{otherAssets:30000});
 assert.equal(M.breakdown(inline).result.availableCapital,before.availableCapital+50000);
 assert.equal(M.breakdown(inline).assets.bound,500000);
 assert.throws(()=>M.applyAsset(inline,'property',{propertyValue:1}));
 assert.throws(()=>M.applyAsset(inline,'cash',{cash:-1}));
 assert.throws(()=>M.applyAsset(inline,'cash',{cash:''}));
 assert.throws(()=>M.applyAsset(inline,'unallocated',{unallocated:-1}));
 M.save(store,inline,'system');assert.deepEqual(M.breakdown(M.load(store).state),M.breakdown(inline));
}
const priorPre=core();priorPre.details.income.pkRent=2000;priorPre.values.regular+=2000;priorPre.confirmed.assumptions=true;
M.validate(priorPre);assert.equal(priorPre.archivedPkRent,2000);assert.equal(priorPre.confirmed.assumptions,false);
assert.equal(M.breakdown(priorPre).income.pk,null);assert.equal(M.breakdown(priorPre).result.incomeGross,3430*12);
const priorPost=core('post');priorPost.details.income.pkRent=1500;priorPost.details.pension={reviewed:true};priorPost.confirmed.pension=true;
M.validate(priorPost);assert.equal(priorPost.details.pension.pkRent,1500);assert.equal(priorPost.details.income.pkRent,undefined);
assert.equal(M.breakdown(priorPost).income.pk,1500*12);
const editedPost=M.apply(priorPost,'income',{canton:'SG',ahv:2400,other:0,additional:0,pkRent:9999});
assert.equal(M.breakdown(editedPost).income.pk,1500*12);
console.log('Passed: inline asset allocation, partial persistence, validation, exact totals and PK source migration.');
