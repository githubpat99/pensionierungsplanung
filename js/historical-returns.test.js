const assert=require('node:assert/strict');
const historical=require('./historical-returns.js');

assert.equal(historical.observations.length,10);
assert.deepEqual(historical.observations.map(row=>row.year),[2016,2017,2018,2019,2020,2021,2022,2023,2024,2025]);
assert.deepEqual([...historical.paths.pessimistic].sort((a,b)=>a-b),historical.paths.pessimistic);
assert.deepEqual([...historical.paths.optimistic].sort((a,b)=>b-a),historical.paths.optimistic);
assert.deepEqual([...historical.paths.pessimistic].sort((a,b)=>a-b),[...historical.paths.optimistic].sort((a,b)=>a-b));
assert.ok(historical.paths.pessimistic[0]<0&&historical.paths.pessimistic.at(-1)>0);
console.log('Passed: ten annual observations and equal pessimistic/optimistic return sets.');
