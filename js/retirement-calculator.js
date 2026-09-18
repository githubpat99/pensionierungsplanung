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
 function num(value){return Number(value)||0}
 function calculateRetirementStart(p){
  const s=toState(p);if(s.mode==='post')return null;
  const y=Math.max(0,s.retirementAge-s.currentAge);
  return {pk:compound(s.assets.pk,s.build.pkContrib,s.ass.pkInterest,y),p3:compound(s.assets.p3,s.build.p3Contrib,s.ass.p3Return,y),sec:compound(s.assets.sec,s.build.otherSave,s.ass.secReturn,y),cash:s.assets.cash,re:s.assets.re,mort:s.assets.mort};
 }
 // 3a-Bezugsplanung: Pläne mit Kennzeichnung nutzen die neue Logik; Altbestände/V2 bleiben unverändert.
 function p3PlanOf(p){
  const plan=p.assets&&p.assets.pre&&p.assets.pre.p3Plan;
  return plan&&typeof plan==='object'&&plan.mode?plan:null;
 }
 function p3AccountSelection(p,s){
  const balance=Math.max(0,num(s.assets.p3)),retirementAge=s.retirementAge;
  const fallback={name:'Säule 3a',amount:balance,age:retirementAge};
  const plan=p3PlanOf(p);
  if(!plan||plan.mode==='retirement')return {planned:false,accounts:[fallback],reason:plan?'retirement':'none'};
  const entries=(Array.isArray(plan.accounts)?plan.accounts:[]).map((account,index)=>({
   name:String((account&&account.name)||'').trim()||`3a Konto ${index+1}`,
   amount:Math.max(0,num(account&&account.amount)),
   age:Math.round(num(account&&account.age))
  }));
  // Sobald Konten erfasst sind, sind sie die Wahrheit: ihre Summe ist der Gesamtbetrag der Säule 3a.
  // Der Gesamtbetrag aus der Schnellerfassung gilt nur, solange keine Aufteilung existiert.
  if(!entries.length)return {planned:false,accounts:[fallback],reason:'none',consistent:false};
  const total=entries.reduce((sum,account)=>sum+account.amount,0);
  const consistent=Math.abs(total-balance)<1;
  return {planned:true,accounts:entries,reason:'planned',consistent,balance:total};
 }
 /* Jedes 3a-Konto wächst mit seinem Anteil an den Beiträgen bis zu seinem Bezugsalter.
    Ein einzelnes Konto im Pensionierungsjahr ergibt exakt die bisherige Hochrechnung. */
 function p3Schedule(p){
  const s=toState(p),retirementAge=s.retirementAge;
  const selection=s.mode==='post'?{planned:false,accounts:[],reason:'post'}:p3AccountSelection(p,s);
  const empty={mode:s.mode,planned:false,reason:selection.reason,consistent:!!selection.consistent,accounts:[],withdrawals:[],boundAtRetirement:0,retirementAge};
  if(!selection.accounts.length)return empty;
  const balance=Math.max(0,num(s.assets.p3)),contribution=Math.max(0,num(s.build.p3Contrib)),rate=num(s.ass.p3Return);
  // Jedes Konto trägt sein eigenes Guthaben; die Summe der Konten ergibt den 3a-Gesamtbetrag.
  const parts=selection.accounts.map(account=>({name:account.name,age:account.age,balance:Math.max(0,account.amount),withdrawn:false,atAge:null,gross:0}));
  const span=Math.max(0,Math.max(...parts.map(part=>part.age),retirementAge)-s.currentAge);
  const withdrawals=[];let boundAtRetirement=0;
  for(let year=0;year<=span;year++){
   const age=s.currentAge+year;
   parts.filter(part=>!part.withdrawn&&(part.age-s.currentAge)<=year).forEach(part=>{part.withdrawn=true;part.atAge=age;part.gross=part.balance;withdrawals.push({name:part.name,gross:part.balance,age});});
   if(age===retirementAge)boundAtRetirement=parts.filter(part=>!part.withdrawn).reduce((sum,part)=>sum+part.balance,0);
   if(year===span)break;
   const alive=parts.filter(part=>!part.withdrawn),sumBalance=alive.reduce((sum,part)=>sum+part.balance,0);
   alive.forEach(part=>{part.balance=part.balance*(1+rate/100)+(sumBalance>0?contribution*part.balance/sumBalance:0);});
  }
  return {...empty,planned:selection.planned,consistent:!!selection.consistent,accounts:parts.map(part=>({name:part.name,age:part.age,amount:part.balance})),withdrawals,boundAtRetirement};
 }
 function pensionCapitalGross(p,share=p.pensionDecision.capitalShare){
  const projected=calculateRetirementStart(p);
  return projected?projected.pk*share/100:0;
 }
 /* Alle Vorsorge-Kapitalbezüge eines Plans, pro Bezugsjahr aggregiert.
    PK und 3a im selben Jahr bilden eine gemeinsame Steuerbasis; jedes Element erhält seinen Anteil. */
 function capitalWithdrawalEvents(p,share=p.pensionDecision.capitalShare){
  const s=toState(p);if(s.mode==='post')return [];
  const items=[],pk=pensionCapitalGross(p,share);
  if(pk>0)items.push({id:'pk',name:'PK-Kapital',gross:pk,age:s.retirementAge});
  if(p3PlanOf(p))p3Schedule(p).withdrawals.forEach((withdrawal,index)=>items.push({id:`p3-${index}`,name:withdrawal.name,gross:withdrawal.gross,age:withdrawal.age}));
  const byAge=new Map();
  items.forEach(item=>{if(!byAge.has(item.age))byAge.set(item.age,[]);byAge.get(item.age).push(item);});
  return [...byAge.entries()].sort((a,b)=>a[0]-b[0]).map(([age,list])=>{
   const gross=list.reduce((sum,item)=>sum+item.gross,0),taxAmount=tax.calculateCapitalWithdrawalTax(p.person.canton,gross),total=taxAmount??0;
   return {age,gross,tax:taxAmount,net:gross-total,items:list.map(item=>{
    // Bei einem einzigen Bezug im Jahr entspricht der Anteil exakt der Jahressteuer.
    const own=list.length===1?total:(gross>0?total*item.gross/gross:0);
    return {...item,tax:own,net:item.gross-own};
   })};
  });
 }
 function calculatePension(p,share=p.pensionDecision.capitalShare){
  const projected=calculateRetirementStart(p);if(!projected)return {cap:0,base:0,rent:0,capitalTax:0,netCap:0,sharedWithP3:false};
  const cap=projected.pk*share/100,base=projected.pk-cap;
  const event=capitalWithdrawalEvents(p,share).find(entry=>entry.age===p.retirement.age);
  const own=event&&event.items.find(item=>item.id==='pk');
  const capitalTax=own?own.tax:tax.calculateCapitalWithdrawalTax(p.person.canton,cap);
  return {cap,base,capitalTax,netCap:cap-(capitalTax??0),rent:base*(p.assumptions.rates.uws/100),sharedWithP3:!!(event&&event.items.some(item=>item.id!=='pk')),eventGross:event?event.gross:cap,eventTax:event?event.tax:capitalTax};
 }
 function calculateAvailableCapital(p,share=p.pensionDecision.capitalShare){
  if(p.person.mode==='post')return {existingFreeCapital:p.assets.post.free,grossPkCapitalWithdrawal:0,pkWithdrawalTax:0,netPkCapitalWithdrawal:0,totalInvestableCapital:p.assets.post.free,boundCapital:p.assets.post.re-p.assets.post.mort,boundP3Capital:0,p3:null};
  const s=toState(p),v=calculateRetirementStart(p),plan=p3PlanOf(p),events=capitalWithdrawalEvents(p,share);
  const atStart=events.filter(event=>event.age<=s.retirementAge),later=events.filter(event=>event.age>s.retirementAge);
  const pkEvent=events.find(event=>event.age===s.retirementAge),pkItem=pkEvent&&pkEvent.items.find(item=>item.id==='pk');
  const p3Items=atStart.flatMap(event=>event.items.filter(item=>item.id!=='pk'));
  const p3Gross=p3Items.reduce((sum,item)=>sum+item.gross,0),p3Tax=p3Items.reduce((sum,item)=>sum+item.tax,0),p3Net=p3Items.reduce((sum,item)=>sum+item.net,0);
  const schedule=plan?p3Schedule(p):null;
  const existingFreeCapital=(plan?0:v.p3)+v.sec+v.cash;
  const netAtStart=atStart.reduce((sum,event)=>sum+event.net,0);
  return {existingFreeCapital,grossPkCapitalWithdrawal:pkItem?pkItem.gross:0,pkWithdrawalTax:pkItem?pkItem.tax:0,netPkCapitalWithdrawal:pkItem?pkItem.net:0,
   totalInvestableCapital:existingFreeCapital+netAtStart,boundCapital:v.re-v.mort,
   boundP3Capital:schedule?schedule.boundAtRetirement:0,
   p3:plan?{planned:schedule.planned,consistent:schedule.consistent,reason:schedule.reason,mode:p3PlanOf(p).mode,accounts:schedule.accounts,withdrawals:schedule.withdrawals,
    grossAtStart:p3Gross,taxAtStart:p3Tax,netAtStart:p3Net,boundAtRetirement:schedule.boundAtRetirement,
    grossTotal:schedule.withdrawals.reduce((sum,withdrawal)=>sum+withdrawal.gross,0),
    grossLater:later.flatMap(event=>event.items.filter(item=>item.id!=='pk')).reduce((sum,item)=>sum+item.gross,0),
    taxTotal:events.flatMap(event=>event.items.filter(item=>item.id!=='pk')).reduce((sum,item)=>sum+item.tax,0),
    netTotal:events.flatMap(event=>event.items.filter(item=>item.id!=='pk')).reduce((sum,item)=>sum+item.net,0)}:null};
 }
 function simulationInput(p,share=p.pensionDecision.capitalShare){
  const s=toState(p),start=s.mode==='post'?s.currentAge:s.retirementAge,pk=calculatePension(p,share),a=s.mode==='post'?s.post:s.income;
  const sources=[['ahv','AHV',a.ahv],['pk','PK-Rente',s.mode==='post'?a.pkRent:pk.rent],['other','Weitere Renten',a.other],['additional','Weitere Einnahmen',s.mode==='post'?a.otherIncome:a.rent]].map(([id,name,amount])=>({id,name,amount,quoteAge:start,from:start,until:111,indexed:false,...s.plan.timing[id],rental:id==='additional'&&s.plan.rental}));
  const capitalBreakdown=calculateAvailableCapital(p,share);
  const profile=getRiskProfile(p);
  // 3a-Bezüge nach dem Ruhestandsstart fliessen erst in ihrem Bezugsjahr ins verfügbare Kapital.
  const capitalInjections={};
  capitalWithdrawalEvents(p,share).filter(event=>event.age>start).forEach(event=>{capitalInjections[event.age]=(capitalInjections[event.age]||0)+event.net;});
  return {today:s.currentAge,start,end:s.planningAge,capital:capitalBreakdown.totalInvestableCapital,capitalBreakdown,bound:capitalBreakdown.boundCapital,capitalInjections,inflation:s.ass.inflation,phases:[{from:0,need:s.need},{from:s.plan.phase2,need:s.plan.need2},{from:s.plan.phase3,need:s.plan.need3}],canton:s.canton,sources:sources.concat(s.plan.extras),returns:s.plan.returns,repair:s.plan.repair,growthShocks:{crash:profiles.scaleShock(-.30,profile.volatilityFactor),weak:profiles.scaleShock(-.15,profile.volatilityFactor)}};
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
  const capitalBreakdown=calculateAvailableCapital(p);
  return {incomeGross:first.grossIncome,incomeTax:first.estimatedIncomeTax,incomeNet:first.rent,annualGap:first.withdrawal,monthlyIncomeNet:first.rent/12,monthlyGap:first.withdrawal/12,monthlyNeed:first.need/12,availableCapital:first.free,restrictedCapital:first.bound,capitalAtTargetAge:last.free,capitalExhaustionAge:gap?.age,bucketAllocation:first.buckets,yearlyProjection,assessment:!tax.canton(p.person.canton)?'pending':gap?'red':stressGap?'amber':'green',stressGapAge:stressGap?.age,capitalWithdrawals:capitalWithdrawalEvents(p),p3Planning:capitalBreakdown.p3,boundP3Capital:capitalBreakdown.boundP3Capital};
 }
 function incomeSourcesAtStart(p){
  const input=simulationInput(p);
  // Reuse the annual engine so payment dates, indexation and quote ages match the total.
  return input.sources.map((source,index)=>({id:source.id||'extra-'+index,name:source.rental?'Nettomiete':source.name,
   annualIncome:engine.simulate({...input,end:input.start+1,sources:[source]})[0].grossIncome}));
 }
 function withReturnProfile(p,key){const next=copy(p),profile=profiles.getRiskProfile(key),rate=profile.expectedRealReturn*100;next.riskProfile=profile.key;next.assumptions.risk=profile.key==='growth'?'bold':profile.key;next.assumptions.rates.capitalReturn=rate;next.scenarios.returns[2]=rate;next.scenarios.volatilityFactor=profile.volatilityFactor;return next;}
 function compareProfiles(p){return Object.keys(profiles.profiles).map(key=>{const plan=withReturnProfile(p,key);return {profile:getRiskProfile(plan),unfavourable:simulateCapitalDevelopment(plan,'historicalPessimistic'),favourable:simulateCapitalDevelopment(plan,'historicalOptimistic')};});}
 root.RetirementCalculator={fromState,toState,getRiskProfile,calculateRetirementStart,p3Schedule,capitalWithdrawalEvents,calculatePension,calculateAvailableCapital,simulationInput,simulateCapitalDevelopment,evaluatePlan,incomeSourcesAtStart,withReturnProfile,compareProfiles};
 if(typeof module!=='undefined')module.exports=root.RetirementCalculator;
})(globalThis);
