const assert=require('node:assert/strict');
const risk=require('./risk-profiles.js'),history=require('./historical-returns.js');
const core=require('./retirement-calculator.js'),storage=require('./planning-storage.js');
const historical=history.observations.map(r=>r.real/100),original=[...historical];
const deviation=values=>{const mean=values.reduce((a,b)=>a+b)/values.length;return Math.sqrt(values.reduce((s,v)=>s+(v-mean)**2,0)/values.length);};
const series=Object.keys(risk.profiles).map(key=>{
 const p=risk.getRiskProfile(key),rows=risk.buildProfileReturnSeries(historical,p.expectedRealReturn,p.volatilityFactor);
 const geometric=Math.expm1(rows.reduce((sum,r)=>sum+Math.log1p(r),0)/rows.length);
 assert.ok(Math.abs(geometric-p.expectedRealReturn)<.0005,'target within 0.05 percentage points');
 assert.ok(rows.every(r=>Number.isFinite(r)&&r>-1));
 assert.deepEqual(risk.buildFavourableSequence(rows).slice().reverse(),risk.buildUnfavourableSequence(rows));
 return rows;
});
assert.deepEqual(historical,original,'input is not sorted or changed');
for(let i=1;i<series.length;i++){
 assert.notDeepEqual(series[i],series[i-1]);
 assert.ok(deviation(series[i])>deviation(series[i-1]));
 assert.ok(Math.min(...series[i])<Math.min(...series[i-1]));
 assert.ok(Math.max(...series[i])>Math.max(...series[i-1]));
}
assert.deepEqual(risk.getRiskProfile('bold'),risk.getRiskProfile('growth'));
assert.throws(()=>risk.buildProfileReturnSeries([],0.025,.45));
assert.throws(()=>risk.buildProfileReturnSeries([-1],0.025,.45));
assert.throws(()=>risk.buildProfileReturnSeries([.1],0.025,-1));
assert.throws(()=>risk.getRiskProfile('unknown'));
const state={mode:'post',currentAge:65,retirementAge:65,planningAge:85,canton:'AR',need:55000,
 assets:{pk:0,p3:0,sec:0,cash:0,re:0,mort:0},post:{free:1000000,re:800000,mort:300000,ahv:0,pkRent:0,other:0,otherIncome:0},
 income:{ahv:0,other:0,rent:0},build:{pkContrib:0,pkEmployee:0,pkEmployer:0,p3Contrib:0,otherSave:0},pkShare:50,risk:'balanced',ass:{inflation:0,uws:5,pkInterest:0,p3Return:0,secReturn:0,capitalReturn:4.5}};
const plan=core.fromState(state),comparisons=core.compareProfiles(plan);
for(const row of comparisons){
 const selected=core.withReturnProfile(plan,row.profile.key),before=structuredClone(selected),result=core.evaluatePlan(selected);
 assert.deepEqual(row.unfavourable,core.simulateCapitalDevelopment(selected,'historicalPessimistic'));
 for(const scenario of ['base','weak','crash','combined','historicalPessimistic','historicalOptimistic']){
  const rows=core.simulateCapitalDevelopment(selected,scenario);
  assert.ok(rows.every(r=>r.bound===500000),'property unaffected');
  rows.forEach(r=>assert.ok(Math.abs(r.buckets.reduce((a,b)=>a+b,0)-r.free)<1e-7));
 }
 const loaded=storage.decode(JSON.stringify({version:storage.version,savedAt:'2026-09-11T12:00:00Z',plan:selected}),state);
 const restored=core.fromState(loaded.state);
 assert.equal(restored.riskProfile,row.profile.key);
 assert.deepEqual(core.getRiskProfile(restored),core.getRiskProfile(selected));
 assert.deepEqual(core.evaluatePlan(restored),result);
 assert.deepEqual(core.simulateCapitalDevelopment(restored,'historicalPessimistic'),row.unfavourable);
 assert.deepEqual(core.simulateCapitalDevelopment(restored,'historicalOptimistic'),row.favourable);
 assert.deepEqual(selected,before,'simulation is pure');
 // Legacy v3 plans had a nested risk (including bold), no canonical riskProfile.
 const old=structuredClone(selected);delete old.riskProfile;delete old.scenarios.volatilityFactor;
 const migrated=core.fromState(storage.decode(JSON.stringify({version:3,plan:old}),state).state);
 assert.equal(migrated.riskProfile,row.profile.key);
 assert.deepEqual(core.evaluatePlan(migrated),result);
}
const [cautious,balanced,growth]=comparisons;
assert.ok(growth.unfavourable[1].free<cautious.unfavourable[1].free,'more risk can hurt earlier');
assert.ok(growth.favourable.at(-1).free>balanced.favourable.at(-1).free&&balanced.favourable.at(-1).free>cautious.favourable.at(-1).free);
const bands=comparisons.map(p=>p.favourable.at(-1).free-p.unfavourable.at(-1).free);
assert.ok(bands[0]<bands[1]&&bands[1]<bands[2]);
const crash=key=>core.simulateCapitalDevelopment(core.withReturnProfile(plan,key),'crash')[0].end;
assert.ok(crash('growth')<crash('balanced')&&crash('balanced')<crash('cautious'));
assert.notDeepEqual(cautious.unfavourable,balanced.unfavourable);
assert.notDeepEqual(balanced.unfavourable,growth.unfavourable);
// A large property never changes financing status or the year of the first gap.
const wealthyProperty=structuredClone(plan);wealthyProperty.assets.post.re=50000000;
assert.equal(core.evaluatePlan(plan).assessment,core.evaluatePlan(wealthyProperty).assessment);
assert.equal(core.evaluatePlan(plan).capitalExhaustionAge,core.evaluatePlan(wealthyProperty).capitalExhaustionAge);
console.log('Passed: profile targets, volatility, sequence ordering, downside/upside, shared annual results, property isolation, stress scaling, persistence and legacy profile migration.');
