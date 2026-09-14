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
let post=core('post');post=M.apply(post,'income',{canton:'ZH',ahv:2350,pkRent:1000,other:80,additional:0});post=M.apply(post,'assets',{cash:50000,securities:600000});post=M.apply(post,'pension',{reviewed:true});assert.equal(M.quality(post),1);
assert.equal(C.evaluatePlan(M.toPlan(post)).availableCapital,650000);
assert.equal(M.fields('pension',post).length,1);
const unknownVersion=JSON.stringify({version:99,state:s});store.setItem(M.key,unknownVersion);assert.throws(()=>M.load(store));assert.equal(store.getItem(M.key),unknownVersion);
store.setItem(M.key,'{broken');assert.throws(()=>M.load(store));assert.equal(store.getItem(M.key),'{broken');
assert.throws(()=>M.save({setItem(){throw Error('quota');}},s,'dark'));
console.log('Passed: aggregate reconciliation, PK/3a projection, quality confirmations, pre/post, horizon, persistence and corrupt/failed storage.');

// Separate early sources, provisional PK replacement, and preserved old returns.
let early=core();early=M.apply(early,'income',{canton:'',ahv:2500,pkRent:2000,other:100,additional:200});
assert.equal(C.evaluatePlan(M.toPlan(early)).monthlyIncomeNet,4800);
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
console.log('Passed: separated early income, provisional pension replacement, cautious V2 default, preserved old profile and navigation positions.');
