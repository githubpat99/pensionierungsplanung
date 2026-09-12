const assert=require('node:assert/strict');
const life=require('./life-expectancy.js'),storage=require('./planning-storage.js');
assert.equal(life.rows.length,83);
assert.deepEqual(life.rows.find(row=>row[0]===65),[65,20.25,23.33]);
for(const [age,target] of [[56,86],[65,87],[80,90],[100,102]])assert.equal(life.defaultTargetAge(age),target);
for(let age=18;age<=100;age++){
 const target=life.defaultTargetAge(age);assert.ok(Number.isInteger(target)&&target>age&&target<=110);
 if(age>18)assert.ok(target>=life.defaultTargetAge(age-1));
}
for(const age of [17,101,65.5,NaN])assert.throws(()=>life.remainingYears(age));
assert.equal(life.defaultTargetAge(56,100),101,'late retirement keeps a valid minimum horizon');
const late={horizonMode:'automatic',currentAge:56,retirementAge:100,mode:'pre'};life.updateAutomatic(late);assert.match(life.explanation(late),/mindestens/);
const defaults={mode:'pre',currentAge:56,retirementAge:65,planningAge:86,horizonMode:'automatic',horizonReference:life.reference};
const auto={...defaults,currentAge:80,retirementAge:80};life.updateAutomatic(auto);assert.equal(auto.planningAge,90);
const manual={...auto,horizonMode:'manual',planningAge:100};life.updateAutomatic(manual);assert.equal(manual.planningAge,100);
const old=storage.decode(JSON.stringify({version:1,state:{mode:'pre',currentAge:56,retirementAge:65,planningAge:95}}),defaults).state;
assert.equal(old.horizonMode,'saved');assert.equal(old.horizonReference,undefined);life.updateAutomatic(old);assert.equal(old.planningAge,95);
for(const state of [auto,manual]){
 const restored=storage.decode(JSON.stringify({version:2,state}),defaults).state;
 assert.equal(restored.horizonMode,state.horizonMode);assert.equal(restored.planningAge,state.planningAge);
}
console.log('Passed: BFS reference points, all supported ages, rounding, late retirement, automatic/manual horizons and legacy storage.');
