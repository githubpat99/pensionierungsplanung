/* Pure application model. Existing tax and annual engines remain authoritative. */
(function(root){
 const tax=typeof module!=='undefined'?require('./tax-model.js'):root.TaxModel;
 const engine=typeof module!=='undefined'?require('./retirement-engine.js'):root.RetirementEngine;
 const history=typeof module!=='undefined'?require('./historical-returns.js'):root.HistoricalReturns;
 const profiles=typeof module!=='undefined'?require('./risk-profiles.js'):root.RiskProfiles;
 const copy=value=>structuredClone(value);
 function fromState(s){
  const {mode,currentAge,canton,retirementAge,planningAge,assets,post,income,need,build,pkShare,risk,riskProfile,ass,plan,...metadata}=copy(s);
  const selected=profiles.getRiskProfile(riskProfile||risk);
  const p=plan||{version:1,phase2:73,phase3:83,need2:need,need3:need,returns:[0,1,selected.expectedRealReturn*100],timing:{},extras:[],rental:false,repair:30000};
  p.volatilityFactor??=selected.volatilityFactor;
  return {riskProfile:profiles.getRiskProfile(riskProfile||risk).key,person:{mode,currentAge,canton},retirement:{age:retirementAge,targetAge:planningAge},assets:{pre:assets,post:{free:post.free,re:post.re,mort:post.mort}},income:{pre:income,post:{ahv:post.ahv,pkRent:post.pkRent,other:post.other,otherIncome:post.otherIncome}},spending:{annualNeed:need},pensionDecision:{capitalShare:pkShare},assumptions:{rates:ass,contributions:build,risk},scenarios:p,metadata};
 }
 function toState(p){return {...copy(p.metadata),riskProfile:profiles.getRiskProfile(p.riskProfile||p.assumptions.risk).key,mode:p.person.mode,currentAge:p.person.currentAge,canton:p.person.canton,retirementAge:p.retirement.age,planningAge:p.retirement.targetAge,assets:copy(p.assets.pre),post:{...copy(p.assets.post),...copy(p.income.post)},income:copy(p.income.pre),need:p.spending.annualNeed,build:copy(p.assumptions.contributions),pkShare:p.pensionDecision.capitalShare,risk:p.assumptions.risk,ass:copy(p.assumptions.rates),plan:copy(p.scenarios)}}
 function getRiskProfile(p){
  const selected=profiles.getRiskProfile(p.riskProfile||p.assumptions.risk);
  // Keep prior individually entered returns; selecting a profile restores its configured target.
  const expectedRealReturn=p.scenarios.returns[2]/100,volatilityFactor=p.scenarios.volatilityFactor??selected.volatilityFactor;
  return {...selected,expectedRealReturn,volatilityFactor,custom:Math.abs(expectedRealReturn-selected.expectedRealReturn)>1e-10||volatilityFactor!==selected.volatilityFactor};
 }
 function compound(v,c,r,years){for(let i=0;i<years;i++)v=v*(1+r/100)+c;return v}
 function calculateRetirementStart(p){
  const s=toState(p);if(s.mode==='post')return null;
  const y=Math.max(0,s.retirementAge-s.currentAge);
  return {pk:compound(s.assets.pk,s.build.pkContrib,s.ass.pkInterest,y),p3:compound(s.assets.p3,s.build.p3Contrib,s.ass.p3Return,y),sec:compound(s.assets.sec,s.build.otherSave,s.ass.secReturn,y),cash:s.assets.cash,re:s.assets.re,mort:s.assets.mort};
 }
 function calculatePension(p,share=p.pensionDecision.capitalShare){
  const projected=calculateRetirementStart(p);if(!projected)return {cap:0,base:0,rent:0,capitalTax:0,netCap:0};
  const cap=projected.pk*share/100,base=projected.pk-cap,capitalTax=tax.calculateCapitalWithdrawalTax(p.person.canton,cap);
  return {cap,base,capitalTax,netCap:cap-(capitalTax??0),rent:base*(p.assumptions.rates.uws/100)};
 }
 function calculateAvailableCapital(p,share=p.pensionDecision.capitalShare){
  if(p.person.mode==='post')return {existingFreeCapital:p.assets.post.free,grossPkCapitalWithdrawal:0,pkWithdrawalTax:0,netPkCapitalWithdrawal:0,totalInvestableCapital:p.assets.post.free,boundCapital:p.assets.post.re-p.assets.post.mort};
  const v=calculateRetirementStart(p),pk=calculatePension(p,share),existingFreeCapital=v.p3+v.sec+v.cash;
  return {existingFreeCapital,grossPkCapitalWithdrawal:pk.cap,pkWithdrawalTax:pk.capitalTax,netPkCapitalWithdrawal:pk.netCap,totalInvestableCapital:existingFreeCapital+pk.netCap,boundCapital:v.re-v.mort};
 }
 function simulationInput(p,share=p.pensionDecision.capitalShare){
  const s=toState(p),start=s.mode==='post'?s.currentAge:s.retirementAge,pk=calculatePension(p,share),a=s.mode==='post'?s.post:s.income;
  const sources=[['ahv','AHV',a.ahv],['pk','PK-Rente',s.mode==='post'?a.pkRent:pk.rent],['other','Weitere Renten',a.other],['additional','Weitere Einnahmen',s.mode==='post'?a.otherIncome:a.rent]].map(([id,name,amount])=>({id,name,amount,quoteAge:start,from:start,until:111,indexed:false,...s.plan.timing[id],rental:id==='additional'&&s.plan.rental}));
  const capitalBreakdown=calculateAvailableCapital(p,share);
  const profile=getRiskProfile(p);
  return {today:s.currentAge,start,end:s.planningAge,capital:capitalBreakdown.totalInvestableCapital,capitalBreakdown,bound:capitalBreakdown.boundCapital,inflation:s.ass.inflation,phases:[{from:0,need:s.need},{from:s.plan.phase2,need:s.plan.need2},{from:s.plan.phase3,need:s.plan.need3}],canton:s.canton,sources:sources.concat(s.plan.extras),returns:s.plan.returns,repair:s.plan.repair,growthShocks:{crash:profiles.scaleShock(-.30,profile.volatilityFactor),weak:profiles.scaleShock(-.15,profile.volatilityFactor)}};
 }
 function simulateCapitalDevelopment(p,scenario='base'){
  const input=simulationInput(p);
  if(scenario.startsWith('historical')){
   const profile=getRiskProfile(p);
   const series=profiles.buildProfileReturnSeries(history.observations.map(row=>row.real/100),profile.expectedRealReturn,profile.volatilityFactor);
   const sequence=scenario==='historicalPessimistic'?profiles.buildUnfavourableSequence(series):profiles.buildFavourableSequence(series);
   return engine.simulate({...input,equityReturns:sequence.map(r=>r*100)});
  }
  return engine.simulate(input,scenario);
 }
 function evaluatePlan(p){
  const yearlyProjection=simulateCapitalDevelopment(p),first=yearlyProjection[0],last=yearlyProjection.at(-1),gap=yearlyProjection.find(r=>r.gap>.01);
  const stressGap=simulateCapitalDevelopment(p,'weak').find(r=>r.gap>.01);
  return {incomeGross:first.grossIncome,incomeTax:first.estimatedIncomeTax,incomeNet:first.rent,annualGap:first.withdrawal,monthlyIncomeNet:first.rent/12,monthlyGap:first.withdrawal/12,monthlyNeed:first.need/12,availableCapital:first.free,restrictedCapital:first.bound,capitalAtTargetAge:last.free,capitalExhaustionAge:gap?.age,bucketAllocation:first.buckets,yearlyProjection,assessment:!tax.canton(p.person.canton)?'pending':gap?'red':stressGap?'amber':'green',stressGapAge:stressGap?.age};
 }
 function incomeSourcesAtStart(p){
  const input=simulationInput(p);
  // Reuse the annual engine so payment dates, indexation and quote ages match the total.
  return input.sources.map((source,index)=>({id:source.id||'extra-'+index,name:source.rental?'Nettomiete':source.name,
   annualIncome:engine.simulate({...input,end:input.start+1,sources:[source]})[0].grossIncome}));
 }
 function withReturnProfile(p,key){const next=copy(p),profile=profiles.getRiskProfile(key),rate=profile.expectedRealReturn*100;next.riskProfile=profile.key;next.assumptions.risk=profile.key==='growth'?'bold':profile.key;next.assumptions.rates.capitalReturn=rate;next.scenarios.returns[2]=rate;next.scenarios.volatilityFactor=profile.volatilityFactor;return next;}
 function compareProfiles(p){return Object.keys(profiles.profiles).map(key=>{const plan=withReturnProfile(p,key);return {profile:getRiskProfile(plan),unfavourable:simulateCapitalDevelopment(plan,'historicalPessimistic'),favourable:simulateCapitalDevelopment(plan,'historicalOptimistic')};});}
 root.RetirementCalculator={fromState,toState,getRiskProfile,calculateRetirementStart,calculatePension,calculateAvailableCapital,simulationInput,simulateCapitalDevelopment,evaluatePlan,incomeSourcesAtStart,withReturnProfile,compareProfiles};
 if(typeof module!=='undefined')module.exports=root.RetirementCalculator;
})(globalThis);
