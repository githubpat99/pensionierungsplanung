/* Reuses the annual engine for split comparisons and affordable spending. */
(function(root){
  const engine=typeof module!=='undefined'?require('./retirement-engine.js'):root.RetirementEngine;
  const tolerance=.01;
  function evaluate(input,capitalShare){
    const rows=engine.simulate(input),firstGap=rows.find(r=>r.gap>tolerance);
    return {capitalShare,rows,feasible:!firstGap,firstGapAge:firstGap?.age??null,
      capitalAtHorizon:rows.at(-1).free,totalGap:rows.reduce((sum,r)=>sum+r.gap,0)};
  }
  function findBestVariant(results){
    return [...results].sort((a,b)=>
      (b.firstGapAge??Infinity)-(a.firstGapAge??Infinity)||a.totalGap-b.totalGap||b.capitalAtHorizon-a.capitalAtHorizon
    )[0];
  }
  function reduceNeeds(input,reduction){
    // One annual reduction across the existing phases; no new spending profile.
    return {...input,phases:input.phases.map(p=>({...p,need:Math.max(0,p.need-reduction)}))};
  }
  function sustainableNeed(input){
    let low=0,high=Math.max(...input.phases.map(p=>p.need));
    if(!evaluate(reduceNeeds(input,high)).feasible)return {annualShortfall:null,sustainableAnnualNeed:null};
    for(let i=0;i<30&&high-low>.5;i++){
      const mid=(low+high)/2;
      if(evaluate(reduceNeeds(input,mid)).feasible)high=mid;else low=mid;
    }
    const firstNeed=(input.phases.filter(p=>input.start>=p.from).at(-1)||input.phases[0]).need;
    return {annualShortfall:high,sustainableAnnualNeed:Math.max(0,firstNeed-high)};
  }
  function analyze(inputs){
    const results=inputs.map(({input,capitalShare})=>evaluate(input,capitalShare));
    const bestVariant=findBestVariant(results),planFeasible=results.some(r=>r.feasible);
    const bestInput=inputs.find(v=>v.capitalShare===bestVariant.capitalShare).input;
    return {planFeasible,bestVariant,results,...(planFeasible?{annualShortfall:0,sustainableAnnualNeed:bestInput.phases[0].need}:sustainableNeed(bestInput))};
  }
  root.RetirementFeasibility={evaluate,findBestVariant,reduceNeeds,sustainableNeed,analyze};
  if(typeof module!=='undefined')module.exports=root.RetirementFeasibility;
})(globalThis);
