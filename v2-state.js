/* V2 input/state adapter. Financial calculations remain in RetirementCalculator.
 * Default rates match index.html; balances are never filled with example values. */
(function(root){
 const calc=typeof module!=='undefined'?require('./retirement-calculator.js'):root.RetirementCalculator;
 const life=typeof module!=='undefined'?require('./life-expectancy.js'):root.LifeExpectancy;
 const profiles=typeof module!=='undefined'?require('./risk-profiles.js'):root.RiskProfiles;
 const tax=typeof module!=='undefined'?require('./tax-model.js'):root.TaxModel;
 const key='retirement-v2-plan',version=1;
 const routes=['time','need','regular','free','plan','income','assets','vorsorge','pension','pension3a','assumptions','more'];
 const detailGroups=['income','assets','pension','pension3a','assumptions'];
 const defaults=Object.freeze({inflation:.6,pkInterest:4.33,p3Return:4.5,secReturn:4.5,uws:5.2});
 const clone=v=>structuredClone(v),num=v=>Number(v||0);
 function fresh(mode=null){return {mode,values:{},details:{},confirmed:{},position:'time',targetAge:null,horizonMode:'automatic',riskProfile:'cautious'};}
 function field(key,label,unit='CHF / Monat',min=0,max=1e10,step='any'){return {key,label,unit,min,max,step};}
 function fields(group,s){
  const pre=s.mode==='pre';
  switch(group){
   case 'time':return [field('age','Alter heute','Jahre',18,100,1),...(pre?[field('retirement','Pensionierungsalter','Jahre',50,100,1)]:[])];
   case 'need':return [field('need','Lebensbedarf','CHF / Monat')];
   case 'regular':return fields('income',s);
   case 'free':return [field('free','Frei verfügbares Vermögen','CHF')];
   case 'income':return [{key:'canton',label:'Dein Wohnsitzkanton',type:'canton'},field('ahv','AHV'),...(!pre||!s.details.pension?[field('pkRent',pre?'Erwartete PK-Rente':'Laufende PK-Rente')]:[]),field('other','Weitere Renten'),field('additional','Weitere Einnahmen / Nettomiete')];
   case 'assets':return [field('cash','Bankguthaben','CHF'),field('securities','Wertschriften','CHF'),...(pre?[field('saving','Zusätzliche Anlage pro Jahr','CHF / Jahr')]:[])];
   case 'pension':return pre?[{...field('pk','PK-Guthaben heute','CHF'),section:'Pensionskasse'},field('pkContrib','Sparbeiträge zusammen','CHF / Jahr'),field('pkShare','Kapitalanteil','%',0,100)]:[{key:'reviewed',label:'Bestehende PK-Rente und bezogenes Vorsorgekapital sind in meinen Einnahmen bzw. meinem Vermögen berücksichtigt.',type:'check'}];
   case 'pension3a':return pre?[field('p3','3a-Guthaben heute','CHF'),field('p3Contrib','Beiträge pro Jahr','CHF / Jahr')]:[];
   case 'assumptions':return [field('targetAge','Planung bis Alter','Jahre',19,110,1),field('inflation','Inflation','%',0,20),...(pre?[{...field('pkInterest','PK-Verzinsung','%',0,100),section:'Aufbau bis Pensionierung'},field('uws','PK-Umwandlungssatz','%',0,20),field('p3Return','3a-Rendite','%',0,100),field('secReturn','Wertschriftenrendite','%',0,100)]:[]),{key:'reviewed',label:'Ich habe die wichtigen Angaben und die dargestellten Modellannahmen geprüft.',type:'check'}];
   default:return [];
  }
 }
 function validField(f,v){
  if(f.type==='check')return v===true;
  if(f.type==='canton')return v===''||!!tax.canton(v);
  return v!==undefined&&v!==null&&String(v).trim()!==''&&Number.isFinite(Number(v))&&Number(v)>=f.min&&Number(v)<=f.max&&(f.step!==1||Number.isInteger(Number(v)));
 }
 function error(group,v,s){
  const bad=fields(group,s).find(f=>!validField(f,v[f.key]));
  if(bad)return {key:bad.key,message:bad.type==='check'?'Bitte bestätige die geprüften Angaben.':`Bitte «${bad.label}» prüfen${bad.min!==undefined?` (${bad.min} bis ${bad.max.toLocaleString('de-CH')})`:''}.`};
  const start=s.mode==='pre'?num(group==='time'?v.retirement:s.values.retirement):num(group==='time'?v.age:s.values.age);
  if(group==='time'&&s.mode==='pre'&&num(v.retirement)<num(v.age))return {key:'retirement',message:'Die Pensionierung darf nicht vor deinem heutigen Alter liegen.'};
  if(group==='time'&&s.horizonMode==='manual'&&s.targetAge<=start)return {key:s.mode==='pre'?'retirement':'age',message:'Bitte zuerst unter Annahmen den Planungshorizont über den neuen Start hinaus verlängern.'};
  if(group==='assumptions'&&num(v.targetAge)<=start)return {key:'targetAge',message:'Das Zielalter muss nach dem Planungsstart liegen.'};
  return null;
 }
 function timing(s){return s.mode&&s.values.age!==undefined&&!error('time',s.values,s);}
 // The aggregate remains a compatibility marker; new input always records sources.
 function complete(s){return !!timing(s)&&['need','free'].every(g=>!error(g,s.values,s))&&validField(field('regular','Einnahmen'),s.values.regular);}
 function quality(s){
  const confirmedGroups=['time','need','regular','free','income','assets','pension',...(s.mode==='pre'?['pension3a']:[])];
  const base=complete(s)&&confirmedGroups.every(g=>s.confirmed[g]===true);
  return base?(s.confirmed.assumptions===true&&tax.canton(s.details.income?.canton)?2:1):0;
 }
 function apply(s,group,values){
  const problem=error(group,values,s);if(problem)throw Error(problem.message);
  const next=clone(s),changed=JSON.stringify(detailGroups.includes(group)?s.details[group]:Object.fromEntries(fields(group,s).map(f=>[f.key,s.values[f.key]])))!==JSON.stringify(Object.fromEntries(fields(group,s).map(f=>[f.key,values[f.key]])));
  if(group==='regular'||group==='income'){
   next.details.income=clone(values);
   next.values.regular=num(values.ahv)+num(values.pkRent)+num(values.other)+num(values.additional);
   next.confirmed.regular=true;next.confirmed.income=true;
  }else if(detailGroups.includes(group))next.details[group]=clone(values);else fields(group,s).forEach(f=>next.values[f.key]=num(values[f.key]));
  if(group==='time'&&next.horizonMode==='automatic'){next.targetAge=life.defaultTargetAge(num(values.age),s.mode==='pre'?num(values.retirement):num(values.age));if(next.details.assumptions)next.details.assumptions.targetAge=next.targetAge;}
  if(group==='assumptions'){
   next.horizonMode=num(values.targetAge)===s.targetAge?s.horizonMode:'manual';next.targetAge=num(values.targetAge);
  }
  if(changed&&group!=='assumptions')next.confirmed.assumptions=false;
  if(changed&&group==='time')for(const g of ['income','assets','pension','pension3a'])next.confirmed[g]=false;
  next.confirmed[group]=true;
  return next;
 }
 function toPlan(s){
  if(!timing(s))return null;
  const v=s.values,d=s.details,pre=s.mode==='pre',p=d.pension||{},p3=d.pension3a||{},a=d.assets,i=d.income;
  const profile=profiles.getRiskProfile(s.riskProfile??'balanced'),rates={...defaults,...d.assumptions},need=num(v.need)*12;
  const grossOther=i?num(i.other)+(pre&&!d.pension?num(i.pkRent):0):num(v.regular);
  const state={mode:s.mode,currentAge:num(v.age),retirementAge:pre?num(v.retirement):num(v.age),planningAge:s.targetAge??life.defaultTargetAge(num(v.age),pre?num(v.retirement):num(v.age)),horizonMode:s.horizonMode,horizonReference:life.reference,need,canton:i?.canton||null,
   assets:{pk:num(p.pk),p3:num(p3.p3),sec:a?num(a.securities):0,cash:a?num(a.cash):num(v.free),re:0,mort:0},
   post:{ahv:i?num(i.ahv)*12:0,pkRent:i?num(i.pkRent)*12:0,other:grossOther*12,otherIncome:i?num(i.additional)*12:0,free:a?num(a.cash)+num(a.securities):num(v.free),re:0,mort:0},
   income:{ahv:i?num(i.ahv)*12:0,other:grossOther*12,rent:i?num(i.additional)*12:0},
   build:{pkContrib:num(p.pkContrib),p3Contrib:num(p3.p3Contrib),otherSave:a?num(a.saving):0},pkShare:num(p.pkShare),risk:profile.key,riskProfile:profile.key,
   ass:{pkInterest:num(rates.pkInterest),p3Return:num(rates.p3Return),secReturn:num(rates.secReturn),uws:num(rates.uws),inflation:num(rates.inflation),capitalReturn:profile.expectedRealReturn*100},
   plan:{version:1,phase2:73,phase3:83,need2:need,need3:need,returns:[0,1,profile.expectedRealReturn*100],volatilityFactor:profile.volatilityFactor,timing:{},extras:[],rental:false,repair:30000}};
  return calc.fromState(state);
 }
 function validate(s){
  if(!s||!['pre','post'].includes(s.mode)||!routes.includes(s.position)||!s.values||!s.details||!s.confirmed||!['automatic','manual'].includes(s.horizonMode))throw Error('Ungültiger V2-Stand.');
  // Existing version-1 plans used balanced. Preserve their complete projections.
  s.riskProfile??='balanced';profiles.getRiskProfile(s.riskProfile);
  if(s.mode==='pre'&&s.details.pension&&!s.details.income&&Number.isFinite(Number(s.details.pension.includedPk))){const legacyPk=num(s.details.pension.includedPk);s.values.regular=Math.max(0,num(s.values.regular)-legacyPk);delete s.details.pension.includedPk;}
  if(s.mode==='pre'&&s.details.pension&&!s.details.pension3a){const legacy=s.details.pension;s.details.pension={pk:legacy.pk,pkContrib:legacy.pkContrib,pkShare:legacy.pkShare};if(legacy.p3!==undefined||legacy.p3Contrib!==undefined){s.details.pension3a={p3:legacy.p3??0,p3Contrib:legacy.p3Contrib??0};if(s.confirmed.pension===true)s.confirmed.pension3a=true;}}
  for(const [g,confirmed] of Object.entries(s.confirmed))if(!routes.includes(g)||typeof confirmed!=='boolean')throw Error('Ungültige Bestätigung.');
  for(const g of ['time','need','free'])for(const f of fields(g,s))if(s.values[f.key]!==undefined&&!validField(f,s.values[f.key]))throw Error('Ungültiger Eingabewert.');
  if(s.values.regular!==undefined&&!validField(field('regular','Einnahmen'),s.values.regular))throw Error('Ungültige Einnahmen.');
  for(const g of ['time','need','free'])if(s.confirmed[g]&&error(g,s.values,s))throw Error('Unvollständiger V2-Stand.');
  if(s.confirmed.regular&&s.values.regular===undefined)throw Error('Unvollständige Einnahmen.');
  for(const g of detailGroups){if(s.details[g]&&error(g,s.details[g],s))throw Error('Ungültige Datengruppe.');if(s.confirmed[g]&&!s.details[g])throw Error('Bestätigung ohne Angaben.');}
  if(timing(s)&&(!Number.isInteger(s.targetAge)||s.targetAge>110||s.targetAge<=(s.mode==='pre'?s.values.retirement:s.values.age)))throw Error('Ungültiger Planungshorizont.');
  if((detailGroups.includes(s.position)||['plan','vorsorge'].includes(s.position))&&!complete(s))throw Error('Unvollständiger Einstieg.');
  return s;
 }
 function save(storage,s,theme){
  validate(s);const record={version,savedAt:new Date().toISOString(),state:clone(s),theme,quality:quality(s)};
  storage.setItem(key,JSON.stringify(record));return record;
 }
 function load(storage){
  const raw=storage.getItem(key);if(raw===null)return null;
  const record=JSON.parse(raw);if(record.version!==version)throw Error('Diese V2-Speicherversion kann noch nicht geladen werden.');
  validate(record.state);if(!Number.isFinite(Date.parse(record.savedAt)))throw Error('Ungültiges Speicherdatum.');return record;
 }
 const api={key,version,defaults,fresh,fields,error,timing,complete,quality,apply,toPlan,validate,save,load};
 root.CheckV2State=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
