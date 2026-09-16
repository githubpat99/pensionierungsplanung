const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const context=vm.createContext({
  st:{need:90000,plan:{need2:80000,need3:70000}},planningLocked:false,
  saved:[],renders:[],
  persist(){this.saved.push(JSON.parse(JSON.stringify(this.st)))},
  renderResult(refresh){this.renders.push(refresh)}
});
vm.runInContext(fs.readFileSync('financing-view.js','utf8')+`
  persist=()=>saved.push(JSON.parse(JSON.stringify(st)));
  renderResult=refresh=>renders.push(refresh);
  updateFinancingValues=()=>{};
  financingPreview={phase:0,scenario:'base',input:{start:65,end:92,capital:650000,phases:[{need:90000},{need:80000},{need:70000}]}};
  changeFinancing('need','123000');
`,context);
assert.equal(context.st.need,123000);
assert.equal(context.saved.at(-1).need,123000);
assert.equal(context.renders.at(-1),false,'Refresh results without rebuilding the active slider');
vm.runInContext("financingPreview.phase=1;changeFinancing('need','105000');financingPreview.phase=2;changeFinancing('need','85000');",context);
assert.equal(context.st.need,123000);
assert.equal(context.st.plan.need2,105000);
assert.equal(context.st.plan.need3,85000);
const count=context.saved.length;
vm.runInContext("changeFinancing('scenario','crash');changeFinancing('horizon','10');changeFinancing('capital','500000');",context);
assert.equal(context.saved.length,count,'Other simulation controls remain previews');
vm.runInContext("planningLocked=true;changeFinancing('need','40000');",context);
assert.equal(context.st.plan.need3,85000);
assert.equal(context.saved.length,count,'Locked plans cannot be changed');
console.log('Passed: annual need persistence, phase isolation, result refresh, preview separation and locked plans.');
