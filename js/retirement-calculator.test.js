const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const core=require('./retirement-calculator.js'),tax=require('./tax-model.js'),engine=require('./retirement-engine.js');
const storage=require('./planning-storage.js');
// The legacy inline adapter now lives in the archived index; the shared calculator still
// has to reproduce its inputs and every annual result exactly.
const html=fs.readFileSync('archive/legacy-index/index.html','utf8');
const defaults=vm.runInNewContext('('+html.match(/const D=(\{[\s\S]*?);\s*let st=/)[1]+')',{RiskProfiles:require('./risk-profiles.js'),LifeExpectancy:require('./life-expectancy.js')});
const names=['compound','projected','split','capitalComponents','free0','bound0','startAge'];
const source=names.map(name=>{
 const start=html.indexOf('function '+name+'('),end=html.indexOf('\nfunction ',start+1);
 return html.slice(start,end);
}).join('\n');
const planning=fs.readFileSync('js/retirement-planning.js','utf8');
const adapter=planning.slice(planning.indexOf('function ensurePlan'),planning.indexOf('function planProjection'));
// The shared calculator may carry additional planning fields (for example the 3a withdrawal
// schedule). Every input the legacy adapter produces must still match exactly.
function subset(actual,expected,path){
 if(Array.isArray(expected)){assert.ok(Array.isArray(actual),`${path}: array expected`);assert.equal(actual.length,expected.length,`${path}: same length`);expected.forEach((value,index)=>subset(actual[index],value,`${path}[${index}]`));return}
 if(expected&&typeof expected==='object'){for(const [key,value] of Object.entries(expected)){assert.ok(key in actual,`${path}.${key} is provided`);subset(actual[key],value,`${path}.${key}`)}return}
 assert.deepEqual(actual,expected,path);
}
for(const mode of ['pre','post'])for(const share of [0,50,100]){
 const st=structuredClone(defaults);st.mode=mode;st.canton='AR';st.pkShare=share;
 if(mode==='post')st.currentAge=67;
 const context=vm.createContext({st,TaxModel:tax,RetirementCalculator:core,RiskProfiles:require('./risk-profiles.js'),P:n=>n/100,structuredClone});
 vm.runInContext(source+'\n'+adapter,context);
 const old=JSON.parse(JSON.stringify(vm.runInContext('planningInput()',context)));
 const plan=core.fromState(context.st),input=core.simulationInput(plan),before=structuredClone(plan);
 subset(JSON.parse(JSON.stringify(input)),old,`${mode}/${share}: same capital, income, tax inputs and periods`);
 assert.deepEqual(core.evaluatePlan(plan).yearlyProjection,engine.simulate(old));
 assert.deepEqual(core.fromState(core.toState(plan)),plan);
 const restored=storage.decode(JSON.stringify({version:3,savedAt:'2026-09-11T12:00:00Z',plan}),defaults);
 assert.deepEqual(core.evaluatePlan(core.fromState(restored.state)),core.evaluatePlan(plan),'v3 complete result roundtrip');
 assert.deepEqual(plan,before,'calculation does not mutate the plan');
 if(mode==='pre'){
  const ends=['cautious','balanced','bold'].map(key=>core.evaluatePlan(core.withReturnProfile(plan,key)).capitalAtTargetAge);
  assert.ok(ends[0]<ends[1]&&ends[1]<ends[2],'profiles affect actual capital development');
 }
}
const sample=structuredClone(defaults);sample.mode='post';sample.currentAge=65;sample.planningAge=85;sample.canton='ZG';sample.need=50000;
sample.post={...sample.post,ahv:0,pkRent:0,other:0,otherIncome:0};sample.ass.inflation=0;
const p=core.fromState(sample);p.scenarios.returns=[0,0,4];
p.assets.post.free=100000;
assert.equal(core.evaluatePlan(p).assessment,'red');
assert.equal(core.evaluatePlan(p).capitalExhaustionAge,67);
p.assets.post.free=800000;
assert.equal(core.evaluatePlan(p).assessment,'amber');
p.assets.post.free=2000000;
assert.equal(core.evaluatePlan(p).assessment,'green');
const ends=['cautious','balanced','bold'].map(key=>core.evaluatePlan(core.withReturnProfile(p,key)).capitalAtTargetAge);
assert.ok(ends[0]<ends[1]&&ends[1]<ends[2],'profiles affect retired plans too');
p.person.canton=null;
assert.equal(core.evaluatePlan(p).assessment,'pending');
console.log('Passed: extracted core equals legacy inputs and every annual result before/after retirement, all PK shares, model roundtrip and profile impact.');
