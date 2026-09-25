const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const M = require('./v2-state.js');
const V = require('./v3-state.js');
const C = require('./retirement-calculator.js');
const Tax = require('./tax-model.js');
const plain = x => JSON.parse(JSON.stringify(x));
const near = (a,b) => assert.ok(Math.abs(a-b)<1e-6, `${a} != ${b}`);
function seed(mode='pre', canton='ZH') {
 let s=M.fresh(mode); s.riskProfile='balanced';
 for(const [group,value] of [
  ['time', mode==='pre'?{age:60,retirement:65}:{age:70}],
  ['regular',{canton,ahv:2500,other:200,additional:100}],['need',{need:6500}],
  ['assets',{cash:50000,securities:150000,saving:1000,otherAssets:30000,propertyValue:900000,mortgage:400000}],
  ['pension',mode==='pre'?{pk:600000,pkContrib:20000,pkShare:0}:{pkRent:2800}],
  ...(mode==='pre'?[['pension3a',{p3:100000,p3Contrib:7000}]]:[]),
  ['assumptions',{...M.defaults,targetAge:95}]
 ]) s=M.apply(s,group,value);
 s.position='plan'; return s;
}
// Exactly-once capital, no 3a withdrawal taxes or later injections; PK tax only on PK.
for(const mode of ['pre','post']) for(const canton of ['ZH','BE','']) {
 const s=seed(mode,canton);
 for(const share of [0,1,35,99,100]) {
  const p=M.toPlan(V.normalize(s)); p.pensionDecision.capitalShare=share;
  const cap=C.calculateAvailableCapital(p), pk=C.calculatePension(p), result=C.evaluatePlan(p);
  assert.deepEqual(C.simulationInput(p).capitalInjections,{});
  assert.equal(cap.boundP3Capital,0);
  near(cap.boundCapital,500000);
  if(mode==='pre') {
   const start=C.calculateRetirementStart(p);
   const p3=cap.p3;
   near(start.cash,80000);
   near(start.p3,100000*1.045**5+7000*((1.045**5-1)/.045));
   near(pk.cap,start.pk*share/100);
   near(pk.rent,(start.pk-pk.cap)*M.defaults.uws/100);
   near(pk.capitalTax??0,Tax.calculateCapitalWithdrawalTax(canton,pk.cap)??0);
   // Der 3a-Bezug liegt ein Jahr vor dem PK-Bezug, ist netto im Startkapital und wird getrennt besteuert.
   assert.equal(p3.withdrawalAge,64);
   near(p3.netAtStart,p3.grossAtStart-(p3.taxAtStart??0));
   assert.ok(p3.grossAtStart<start.p3,'ein Jahr früher bedeutet weniger Aufbau');
   near(cap.totalInvestableCapital,start.cash+start.sec+p3.netAtStart+pk.netCap);
   near(cap.existingFreeCapital,start.cash+start.sec+p3.netAtStart);
   assert.ok(C.capitalWithdrawalEvents(p).some(e=>e.items.some(i=>i.id!=='pk')),'der 3a-Bezug ist ein eigenes Ereignis');
   assert.equal(C.simulationInput(p).phases[0].need,6500*12,'no inflation before retirement');
  } else { near(cap.totalInvestableCapital,230000); near(pk.capitalTax,0); }
  near(result.availableCapital,cap.totalInvestableCapital);
  if(!canton) assert.equal(result.assessment,'pending');
 }
}
// Old accounts are consolidated; old details kept for recovery, never used after migration.
let legacy=seed(); legacy.details.pension3a={p3:1,p3Contrib:7000,p3Mode:'later',p3Accounts:[{name:'A',amount:30000,age:66},{name:'B',amount:70000,age:70}]};
const migrated=V.normalize(legacy);
assert.equal(migrated.details.pension3a.p3,100000);
assert.equal(migrated.details.pension3a.p3Mode,undefined);
assert.equal(migrated.legacyP3.p3Accounts[1].age,70);
assert.equal(legacy.details.pension3a.p3,1,'source untouched');
assert.deepEqual(C.evaluatePlan(M.toPlan(migrated)),C.evaluatePlan(M.toPlan(seed())));
const post=seed('post'); post.details.pension3a=legacy.details.pension3a;
near(C.evaluatePlan(M.toPlan(V.normalize(post))).availableCapital,230000);
assert.throws(()=>V.normalize({...legacy,details:{...legacy.details,pension3a:{p3Accounts:[{amount:-1}]}}}));
// Variants are three fixed, mutable slots; they share one state and never duplicate person data.
let s=seed(), before=structuredClone(s);
for(const share of [0,1,35,99,100]) { const p=M.toPlan(s);p.pensionDecision.capitalShare=share;C.evaluatePlan(p); }
assert.deepEqual(s,before);
s=V.normalize({...s,v3Variants:undefined});
assert.deepEqual(V.variants(s),[0,50,100],'neue Planung startet mit den drei Standardwerten');
s=V.remember(s,35,1);
assert.deepEqual(V.variants(s),[0,35,100],'der gewählte Platz wird mutiert');
assert.equal(s.details.pension.pkShare,0,'der aktuelle Plan bleibt unberührt');
assert.deepEqual(V.variants(V.remember(s,0,2)),[0,35,100],'kein doppelter Wert');
// Der aktuelle Plan ist selbst veränderbar: sein Platz wird mutiert und der Plan wandert mit.
const movedPlan=V.remember(s,7,0);
assert.deepEqual(V.variants(movedPlan),[7,35,100],'der Platz des aktuellen Plans wird mutiert');
assert.equal(movedPlan.details.pension.pkShare,7,'der aktuelle Plan übernimmt den neuen Wert');
// Ein bereits vorhandener Wert wird übernommen statt doppelt geführt.
const adopted=V.remember(s,100,0);
assert.deepEqual(V.variants(adopted),[0,35,100],'bestehender Wert erzeugt keinen zweiten Platz');
assert.equal(adopted.details.pension.pkShare,100,'die bestehende Variante wird zum aktuellen Plan');
s=V.activate(s,35); assert.equal(s.details.pension.pkShare,35);
assert.deepEqual(V.variants(s),[0,35,100],'Übernehmen verändert die Plätze nicht');
assert.throws(()=>V.remove(s,35));
s=V.remove(s,100); assert.deepEqual(V.variants(s),[0,35]);
for(const invalid of [-1,101,1.5,NaN,'35']) assert.throws(()=>V.remember(s,invalid));
const oldResults=V.variants(s).map(share=>{const p=M.toPlan(s);p.pensionDecision.capitalShare=share;return C.evaluatePlan(p);});
s=M.apply(s,'pension',{...s.details.pension,pk:800000});
V.variants(s).forEach((share,i)=>{const p=M.toPlan(s);p.pensionDecision.capitalShare=share;assert.notDeepEqual(C.evaluatePlan(p),oldResults[i]);});
// Mode switches retain incompatible PK inputs without reusing them as current income.
let switchState=seed();switchState=V.changeMode(switchState,'post');
assert.equal(switchState.details.pension,undefined);
switchState=M.apply(switchState,'pension',{pkRent:2000});
switchState=V.changeMode(switchState,'pre');assert.equal(switchState.details.pension.pk,600000);
switchState=V.changeMode(switchState,'post');assert.equal(switchState.details.pension.pkRent,2000);
let oldPost=seed('post');oldPost.details.income.pkRent=3100;delete oldPost.details.pension;
assert.equal(V.normalize(oldPost).details.pension.pkRent,3100);
// Versioned storage, full restoration and protection against unsupported or corrupt records.
s.position='assets';
const record={version:2,savedAt:new Date().toISOString(),state:s};
assert.deepEqual(V.decode(JSON.stringify(record)).state,V.normalize(s),'Laden füllt die drei Variantenplätze auf');
assert.deepEqual(C.evaluatePlan(M.toPlan(V.decode(JSON.stringify(record)).state)),C.evaluatePlan(M.toPlan(s)));
/* Auch Schema 1 erhält die drei Variantenplätze: sonst fehlten bei einem alten Speicherstand
   beim ersten Öffnen der Variantenvergleich und jede Auswahl zum Übernehmen. */
assert.deepEqual(V.variants(V.decode(JSON.stringify({...record,version:1})).state),V.variants(V.normalize(s)),'Schema 1 erhält die drei Variantenplätze');
// Doppelte oder unvollständige Altstände werden beim Laden repariert statt verworfen.
const repaired=V.decode(JSON.stringify({...record,state:{...s,v3Variants:[35,35]}})).state;
assert.equal(new Set(V.variants(repaired)).size,3,'doppelte Plätze werden zu drei eindeutigen Plätzen');
assert.ok(V.variants(repaired).includes(Number(s.details.pension.pkShare)),'der aktuelle Plan bleibt in den Varianten');
for(const raw of ['{','null',JSON.stringify({...record,version:99}),JSON.stringify({...record,savedAt:'bad'})]) assert.throws(()=>V.decode(raw));
/* Speicherversion, Migration und Invalidierung: Tester dürfen nie manuell löschen müssen. */
assert.ok(Number.isInteger(V.STORAGE_VERSION)&&V.STORAGE_VERSION>=1,'Speicherversion ist gesetzt');
const encoded=V.encode(s,'2026-09-25T00:00:00.000Z');
assert.equal(encoded.storageVersion,V.STORAGE_VERSION,'neue Hüllen tragen die aktuelle Speicherversion');
assert.equal(encoded.version,2,'das Datenschema bleibt 2');
/* Ältere Hülle ohne storageVersion → Generation 1, wird migriert und als migriert gemeldet. */
const legacyEnvelope={version:2,savedAt:record.savedAt,state:{...s,v3Variants:undefined}};
const restoredLegacy=V.restore(JSON.stringify(legacyEnvelope));
assert.equal(restoredLegacy.ok,true,'Altstand ohne storageVersion wird geladen');
assert.equal(restoredLegacy.migrated,true,'Altstand wird als migriert gemeldet');
assert.equal(restoredLegacy.record.storageVersion,V.STORAGE_VERSION,'migrierter Stand trägt die aktuelle Speicherversion');
assert.equal(new Set(V.variants(restoredLegacy.state)).size,3,'Migration füllt auf drei eindeutige Variantenplätze auf');
assert.ok(V.variants(restoredLegacy.state).includes(Number(restoredLegacy.state.details.pension.pkShare)),'der aktuelle Plan bleibt nach der Migration in den Varianten');
assert.deepEqual(V.restore(JSON.stringify(encoded)).migrated,false,'aktueller Stand wird nicht migriert');
/* Neuere Generation und unbekanntes Schema: nichts anfassen, nur melden. */
assert.equal(V.restore(JSON.stringify({...encoded,storageVersion:V.STORAGE_VERSION+1})).reason,'newer');
assert.equal(V.restore(JSON.stringify({...encoded,version:99})).reason,'newer');
/* Defekter eigener Stand: nicht werfen, sondern als invalid melden (UI sichert und räumt). */
for(const broken of ['{','null',JSON.stringify({...encoded,savedAt:'bad'}),JSON.stringify({...encoded,state:{mode:'pre'}})]) {
  const result=V.restore(broken);
  assert.equal(result.ok,false,'defekter Stand wird nicht geladen ('+broken.slice(0,24)+')');
  assert.equal(result.reason,'invalid','defekter Stand gilt als invalid');
  assert.ok(result.message.length>10,'Meldung nennt den Grund');
}
for(const position of V.routes) V.validate({...s,position});
const noAssets=M.fresh('pre'); noAssets.position='rents'; V.validate(noAssets);
// Actual UI render functions, no additional financial implementation in the harness.
const listeners={}, nodes=new Map();
function node(id='') { if(nodes.has(id)) return nodes.get(id); const n={innerHTML:'',hidden:false,value:'',style:{setProperty(){}},classList:{add(){},remove(){}},addEventListener(event,fn){listeners[`${id}:${event}`]=fn;},setAttribute(){},querySelectorAll:()=>[],querySelector:sel=>node(sel),getBoundingClientRect:()=>({width:360}),focus(){},scrollIntoView(){}};nodes.set(id,n);return n; }
const local=new Map();
const context=vm.createContext({CheckV2State:M,CheckV3State:V,RetirementCalculator:C,TaxModel:Tax,Icons:require('./icons.js'),Estimates:require('./estimates.js'),structuredClone,ResizeObserver:class{observe(){}disconnect(){}},
 document:{getElementById:node,querySelector:node,querySelectorAll:()=>[],addEventListener(){}},window:{scrollTo(){},addEventListener(){}},localStorage:{getItem:k=>local.get(k)??null,setItem:(k,v)=>local.set(k,v)}});
let source=fs.readFileSync(require.resolve('./v3-ui.js'),'utf8');
source=source.replace('window.V3 = {save, load, planFor};',`window.test={seed(s){state=V3State.normalize(s);previewShare=null;},tip(){state.tipDismissed=true;},snapshot(){return {state,previewShare};},planFor,evaluated,renderPlan,renderDetail,pensionBreakdown,assetComposition,chart,currentVariants,editorFields,furtherCapital,startCapitalInfo,planSteps,startFields,load,save};`);
source=source.replace("  setStartDraft(); renderStart();\n  load();",'');
vm.runInContext(source,context);
const ui=context.window.test;
for(const canton of ['ZH','']) {
 ui.seed(seed('pre',canton));
 assert.ok(ui.planFor(35));
 assert.equal(ui.planFor(35).assets.pre.p3Plan,undefined);
 ui.tip();ui.renderPlan(); assert.match(node('app').innerHTML,/shareNumber/);
 // Die 3a-Erklärung nennt die gerechneten Werte und den verwendeten Satz.
 assert.match(ui.assetComposition(seed('pre',canton)),/Säule 3a netto/);
 assert.match(ui.assetComposition(seed('pre',canton)),canton?/kantonalen Durchschnittssteuersatz/:/Ohne Wohnkanton schätzen wir noch keine Bezugssteuer/);
 assert.match(ui.assetComposition(seed('pre',canton)),/netto<\/strong> zur Verfügung/);
 assert.doesNotMatch(ui.assetComposition(seed('pre',canton)),/3a-Bezugssteuer wird nicht modelliert/);
 // Ohne Wohnkanton rechnet der erste Check mit geschätzter Steuerannahme: Netto statt «Steuern offen».
 assert.match(ui.pensionBreakdown(),/data-pk-net>CHF/,'Netto wird auch ohne Wohnkanton ausgewiesen');
 ui.renderDetail('pension3a'); assert.doesNotMatch(node('app').innerHTML,/p3Mode|p3Accounts|Bezugsalter/);
 assert.equal(ui.editorFields('pension').some(f=>f.key==='pkShare'),false);
 assert.equal(ui.editorFields('assumptions').some(f=>f.key==='pkInterest'),false);
}
ui.seed(seed());ui.tip();ui.renderPlan();
// Die Aufschlüsselung des weiteren Kapitals muss exakt das weitere Kapital des Rechenkerns ergeben
// (I-05: Startkapital-Herleitung) – inklusive Hochrechnung der Wertschriften.
for(const share of [0,35,100]) {
 const item=ui.evaluated(share), plan=item.plan, cap=C.calculateAvailableCapital(plan,share);
 const {rows,total}=ui.furtherCapital(ui.snapshot().state,item);
 near(total,cap.existingFreeCapital);
 assert.equal(rows.length>0,true,'die Aufschlüsselung hat Positionen');
 assert.match(ui.startCapitalInfo(item),/PK-Kapital netto .* \+ weiteres Kapital .* = /);
 near(cap.existingFreeCapital+cap.netPkCapitalWithdrawal,cap.totalInvestableCapital);
}
listeners['shareNumber:input']({target:{value:'35'}});
assert.equal(ui.snapshot().state.details.pension.pkShare,0,'preview leaves active share unchanged');
assert.equal(ui.snapshot().previewShare,35);
assert.match(node('previewStatus').textContent,/Vorschau/);
// «Speichern» ohne Kartenklick aktualisiert den aktuellen Plan selbst.
listeners['[data-remember]:click']();
assert.equal(ui.snapshot().state.details.pension.pkShare,35,'Speichern aktualisiert den aktuellen Plan');
assert.ok(V.variants(ui.snapshot().state).includes(35),'der neue Wert liegt auf einem Variantenplatz');
assert.equal(JSON.parse(local.get('retirement-v3-plan')).state.details.pension.pkShare,35);
// Zum aktuellen Plan wird eine Variante über das «···»-Menü bzw. den Vergleich.
assert.equal(V.activate(ui.snapshot().state,35).details.pension.pkShare,35);
ui.seed(seed('post'));ui.tip();ui.renderPlan();assert.doesNotMatch(node('app').innerHTML,/id="shareRange"/);
ui.tip();ui.seed(s); const rows=ui.currentVariants(), svg=ui.chart(rows,340);
assert.equal((svg.match(/data-chart-share=/g)||[]).length,3);
assert.match(svg,/stroke-dasharray="9 6"/);assert.match(svg,/stroke-dasharray="2 6"/);
assert.match(svg,/<circle/);assert.match(svg,/<rect/);assert.match(svg,/<path/);
assert.match(svg,/data-chart-tick-age="95"/);
const protectedRaw=JSON.stringify({...record,version:99});local.set('retirement-v3-plan',protectedRaw);ui.load();ui.save();assert.equal(local.get('retirement-v3-plan'),protectedRaw);
// Schnelleinstieg: Ohne AHV-Angabe rechnet der Plan mit der Pauschale, eine Eingabe ersetzt sie.
const Est=require('./estimates.js');
let quick=M.fresh('pre');
for(const [group,value] of [['time',{age:60,retirement:65}],['pension',{pk:600000,pkContrib:0,pkShare:0}],['need',{need:6500}]]) quick=M.apply(quick,group,value);
quick.position='plan';
assert.ok(!(M.toPlan(V.normalize(quick)).income.ahv>0),'ohne Eingabe liefert der Rechenkern keine AHV');
const ahvAnnual=plan=>(C.incomeSourcesAtStart(plan).find(source=>source.id==='ahv')||{}).annualIncome||0;
ui.seed(quick);
assert.equal(Est.ahvOf(quick).origin,'estimated');
assert.equal(ahvAnnual(ui.planFor(0)),36000,"der Plan rechnet mit der Pauschale von CHF 3'000 pro Monat");
assert.ok(!(ui.snapshot().state.details.income?.ahv>0),'die Pauschale verändert den gespeicherten Stand nicht');
assert.match(ui.planSteps(),/Plan genauer machen/);
assert.match(ui.planSteps(),/AHV-Rente/);
assert.match(ui.planSteps(),/Umwandlungssatz von 5,2 %/);
assert.match(ui.planSteps(),/Wohnkanton/);
assert.match(ui.planSteps(),/Weiteres Kapital und Säule 3a/);
assert.match(ui.planSteps(),/PK-Ausweis/);
assert.deepEqual([...ui.planSteps().matchAll(/data-v3-next="(\w+)"/g)].map(m=>m[1]),['ahv','personal','assets','pension'],'Reihenfolge der Verfeinerung');
assert.equal(ui.startFields().map(f=>f.key).join(','),'age,retirement,pk,need','vier Fragen im Schnelleinstieg');
const withAhv=M.apply(quick,'regular',{canton:'ZH',ahv:2500,other:0,additional:0});
ui.seed(withAhv);
assert.equal(Est.ahvOf(withAhv).origin,'user');
assert.equal(ahvAnnual(ui.planFor(0)),30000,'eine erfasste AHV-Rente ersetzt die Pauschale');
// Erledigte Punkte verschwinden; die Nummerierung rückt nach (AHV und Kanton sind erfasst).
const remaining=ui.planSteps();
assert.deepEqual([...remaining.matchAll(/data-v3-next="(\w+)"/g)].map(m=>m[1]),['assets','pension'],'nur noch offene Punkte');
assert.doesNotMatch(remaining,/AHV-Rente/);
assert.doesNotMatch(remaining,/Wohnkanton/);
console.log('V3: capital, 3a migration, all PK boundaries, variants, storage, preview and UI regression checks passed.');
