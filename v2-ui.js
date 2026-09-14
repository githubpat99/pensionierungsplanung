(() => {
 const app=document.getElementById('app'),M=CheckV2State,C=RetirementCalculator;
 const cash=n=>"CHF "+Math.round(n).toLocaleString('de-CH').replace(/’/g,"'");
 const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const num=v=>Number(v||0);
 const shareValue=()=>{const n=Number(draft?.pkShare);return Number.isFinite(n)?Math.round(Math.max(0,Math.min(100,n))):50;};
 const basic=['time','need','regular','free'],names=['Erste Einschätzung','Gute Basis','Gut abgestützt'];
 let state=M.fresh(),route='welcome',draft={},saved=null,resumeRecord=null,loadError='',effect=null;
let drafts={};
let assetOpen=null,assetDrafts={};
const editorRoutes=[...basic,'income','assets','tax','pension','pension3a','assumptions'];
const detailRoutes=['income-detail','assets-detail','asset-funding'];
const parentOf=g=>g==='income'||g==='tax'?'income-detail':g==='assets'?'assets-detail':g==='pension3a'||g==='pension'?'vorsorge':'plan';
function keepDraft(){if(editorRoutes.includes(route))drafts[route]=structuredClone(draft);}
function firstOpen(){return basic.find(g=>g==='regular'?state.values.regular===undefined:!!M.error(g,state.values,state))||'time';}
function focusHeading(){window.scrollTo(0,0);const h=app.querySelector('h1');if(h){h.tabIndex=-1;h.focus({preventScroll:true});}}
function restorePosition(){if(state.position==='plan')plan();else if(state.position==='vorsorge')renderVorsorge();else if(state.position==='more')renderMore();else if(detailRoutes.includes(state.position))showDetail(state.position);else showEditor(state.position);}
function showParent(g){const parent=parentOf(g);if(parent==='vorsorge')renderVorsorge();else if(detailRoutes.includes(parent))showDetail(parent);else plan();}
function updateNav() {
  let nav = document.getElementById('v2Nav');
  if (!nav) {
    nav = document.createElement('nav');
    nav.id = 'v2Nav';
    nav.className = 'bottom-nav';
    nav.setAttribute('aria-label','Hauptnavigation');
    document.body.appendChild(nav);
  } else if (!nav.parentNode) {
    document.body.appendChild(nav);
  }
  const complete = M.complete(state);
  const active = ['vorsorge','pension','pension3a'].includes(route) ? 'pension' : route === 'assumptions' ? 'assumptions' : route === 'more' ? 'more' : 'plan';
  const items = [
    ['plan', '▦', 'Dein Plan'],
    ['pension', '◆', 'Vorsorge'],
    ['assumptions', '⚙', 'Annahmen'],
    ['more', '⋯', 'Mehr']
  ];
  nav.hidden = route === 'welcome';
  nav.innerHTML = items.map(([k, icon, label]) =>
    `<button data-nav="${k}"${(k === 'pension' || k === 'assumptions') && !complete ? ' disabled' : ''}${k === active ? ' aria-current="page"' : ''}><span aria-hidden="true">${icon}</span>${label}</button>`
  ).join('');
  const footer=document.querySelector('footer.footer');if(footer)footer.hidden=route!=='more';
  if (!nav.dataset.bound) {
    nav.dataset.bound = '1';
    nav.addEventListener('click', e => {
      const btn = e.target.closest('button[data-nav]');
      if (!btn || btn.disabled) return;
      keepDraft();
      const n = btn.dataset.nav;
      if (n === 'plan') {
        if (M.complete(state)) plan();
        else {
          const g = firstOpen();
          showEditor(g);
        }
      } else if (n === 'pension') {
        renderVorsorge();
      } else if (n === 'assumptions') {
        showEditor(n);
      } else if (n === 'more') {
        renderMore();
      }
      updateNav();
      save();
    });
  }
}

function renderVorsorge() {
  route = 'vorsorge';
  state.position = 'vorsorge';
  updateNav();
  app.innerHTML = `<header class="work-heading"><h1>Vorsorge</h1></header><div class="vorsorge-menu">${state.mode==='pre'?'<button data-open="pension3a"><span>Säule 3a<small>Guthaben und Beiträge</small></span><span aria-hidden="true">→</span></button>':''}<button data-open="pension"><span>Pensionskasse<small>${state.mode==='pre'?'Rente oder Kapital':'Laufende PK-Rente'}</small></span><span aria-hidden="true">→</span></button></div>`;
  focusHeading();
}

function renderMore() {
  route = 'more';
  state.position='more';
  const complete = M.complete(state);
  app.innerHTML = `<header class="work-heading"><h1>Mehr</h1></header><section class="more-screen">
    <button data-save>Bestätigten Stand speichern</button>
    <button data-new>Neue Planung</button>
    <p class="context">${saved?.savedAt?`Letzter Stand: ${new Date(saved.savedAt).toLocaleString('de-CH',{dateStyle:'short',timeStyle:'short'})}`:'Noch kein gespeicherter Stand.'}</p>
    ${complete ? modelNotes() : ''}
    <details class="model-notes">
      <summary>Hilfe / Glossar</summary>
      <p><strong>Reichweite Modellrechnung:</strong> Die Modellrechnung ist eine vereinfachte Projektion und ersetzt keine Finanzberatung.</p>
      <p><strong>Verfügbare Mittel vs. Immobilien:</strong> Verfügbare Mittel sind liquide; Immobilienwerte sind nicht direkt verfügbar.</p>
    </details>
  </section>`;
  updateNav();
  focusHeading();
}
 function status(text,error=false){const el=document.getElementById('saveStatus');el.textContent=text;el.dataset.error=error;const alert=document.getElementById('saveError');alert.textContent=error?text:'';alert.hidden=!error;}
 function save(){
  try{saved=M.save(localStorage,state,document.documentElement.dataset.theme);status('Gespeichert · '+new Date(saved.savedAt).toLocaleString('de-CH',{dateStyle:'short',timeStyle:'short'}));return true;}
  catch(_){status('Speichern nicht möglich. Dein Stand bleibt vorerst nur in dieser geöffneten Seite.',true);return false;}
 }
 function read(){
  try{saved=M.load(localStorage);loadError='';}
  catch(_){saved=null;loadError='Der gespeicherte V2-Stand ist nicht lesbar. Er bleibt erhalten, bis du ausdrücklich eine neue Planung bestätigst.';status(loadError,true);}
 }
 function quality(s){const level=M.quality(s);return `<section class="quality" aria-label="Belastbarkeit deiner Datengrundlage"><span class="quality-caption">Deine Datengrundlage</span><ol>${names.map((n,i)=>`<li ${i===level?'aria-current="step"':''} data-reached="${i<=level}"><span aria-hidden="true">${i<level?'●':i===level?(level===2?'●':level===1?'◐':'○'):'○'}</span>${n}</li>`).join('')}</ol></section>`;}
 function qualityPlan(s){
  const level=M.quality(s),checks=[['Zeitpunkt','time'],['Bedarf','need'],['Einnahmen','income'],['Vermögen','assets'],['Pensionskasse','pension'],...(s.mode==='pre'?[['Säule 3a','pension3a']]:[]),['Annahmen','assumptions']];
  return `<details class="quality-plan"><summary><span>Datengrundlage</span> <strong>${names[level]}</strong> <span class="quality-info" aria-hidden="true">ⓘ</span></summary><p class="hint">${level===0?'Für eine gute Basis bestätige die noch offenen Angaben.':level===1?'Für «Gut abgestützt» fehlen noch geprüfte Annahmen oder der Wohnkanton.':'Die Angaben und Modellannahmen sind bestätigt. Das ist keine Garantie für die Finanzierung.'}</p><ul>${checks.map(([name,g])=>`<li data-ok="${s.confirmed[g]===true}"><span aria-hidden="true">${s.confirmed[g]?'✓':'○'}</span> ${name}: ${s.confirmed[g]?'bestätigt':'noch offen'}</li>`).join('')}<li data-ok="${!!M.canton(s)}">Wohnkanton: ${M.canton(s)?esc(TaxModel.canton(M.canton(s)).name):'noch offen'}</li></ul></details>`;
 }
 function welcome(){
  route='welcome';
  updateNav();
  resumeRecord=state.mode&&Object.keys(state.confirmed).length?{state:structuredClone(state),savedAt:saved?.savedAt}:saved;
  const current=resumeRecord;
  app.innerHTML=`<section class="intro"><div class="eyebrow">Dein Leben. Dein Plan.</div><h1>${current?'Willkommen zurück':'Wo stehst du heute?'}</h1><p>${current?'Deine Planung ist bereits begonnen.':'Reicht dein Geld bis zum Planungshorizont? Mit jeder Angabe wird dein Plan klarer.'}</p>${current?`${quality(current.state)}<p class="hint">Letzter Stand: ${current.savedAt?new Date(current.savedAt).toLocaleString('de-CH'):'nur in dieser geöffneten Seite'}</p><div class="welcome-actions"><button class="primary" data-resume>Weiterplanen</button><button data-new>Neue Planung</button></div>`:loadError?`<p class="context">${esc(loadError)}</p><button data-new>Neue Planung</button>`:'<div class="choices"><button data-mode="pre">Vor meiner Pensionierung <span aria-hidden="true">→</span></button><button data-mode="post">Bereits pensioniert <span aria-hidden="true">→</span></button></div>'}</section>`;
 }
 function groupInfo(g){
  const pre=state.mode==='pre';
  return {
   time:{title:pre?'Wann beginnt dein Ruhestand?':'Dein Zeitpunkt',hint:'Alter heute'+(pre?' und gewünschter Pensionierungsstart.':'. Die Planung beginnt heute.')},
   need:{title:'Wie viel möchtest du monatlich zur Verfügung haben?',hint:'Dein Lebensbedarf zu Beginn deiner '+(pre?'Pensionierung.':'Planung.')},
   regular:{title:'Welche Einnahmen hast du im Ruhestand?',hint:'Monatsbeträge vor persönlicher Steuer. Erfasse AHV und weitere regelmässige Einnahmen; falls nicht vorhanden: 0. Den Wohnkanton kannst du noch offen lassen.'},
   free:{title:'Wie viel frei verfügbares Vermögen hast du ungefähr?',hint:'Heute frei verfügbares Kapital. Noch gebundene PK-/3a-Guthaben und Immobilien nicht mitzählen.'},
   income:{title:'Dein Einkommen',hint:'Monatsbeträge vor persönlicher Steuer; Nettomiete nach Objektkosten. Alle Einnahmen gelten ab Planungsstart, ohne Indexierung.'},
   assets:{title:'Dein verfügbares Vermögen',hint:'Erfasse heutige Beträge. Bereits bezogenes Vorsorgekapital gehört zu deinen verfügbaren Mitteln. Weitere Vermögenswerte und Immobilien sind optional; leere Zusatzfelder bleiben offen.'},
   tax:{title:'Wohnkanton ergänzen',hint:'Dein Wohnkanton bestimmt die geschätzte Einkommenssteuer und bei künftigem PK-Kapitalbezug die Bezugssteuer.'},
   pension:{title:'Pensionskasse',hint:pre?'PK und Säule 3a ergänzen dein bisher erfasstes freies Vermögen. Nicht vorhandene Beträge: 0.':'Erfasse deine tatsächlich laufende PK-Rente vor persönlicher Steuer. Bereits bezogenes Kapital gehört zum verfügbaren Vermögen.'},
   pension3a:{title:'Säule 3a',hint:'Säule 3a ergänzt dein bisher erfasstes freies Vermögen. Nicht vorhandene Beträge: 0.'},
   assumptions:{title:'Deine Annahmen',hint:'Bestehende Modellannahmen. Prüfe, ob sie zu deinen Angaben passen; sie sind keine Zusicherung.'}
  }[g];
 }
 function editorValues(g){
  if(g==='assumptions')return {...M.defaults,targetAge:state.targetAge,...state.details.assumptions,reviewed:false,targetAge:state.targetAge};
  if(g==='regular')return editorValues('income');
  if(g==='tax')return {canton:M.canton(state)};
  if(g==='income')return {...Object.fromEntries(M.fields(g,state).map(f=>[f.key,''])),...state.details.income,canton:M.canton(state)};
  if(basic.includes(g))return Object.fromEntries(M.fields(g,state).map(f=>[f.key,state.values[f.key]??'']));
  return {...Object.fromEntries(M.fields(g,state).map(f=>[f.key,f.type==='check'?false:''])),...state.details[g]};
 }
 function input(f){
  const v=draft[f.key]??'';
  const section=f.section?`<h3 class="field-section">${f.section}</h3>`:'';
  if(f.type==='check')return `${section}<label class="review-check"><input type="checkbox" name="${f.key}" ${v===true?'checked':''}>${f.label}</label>`;
  if(f.type==='canton')return `<div class="field"><label for="${f.key}">${f.label}</label><select id="${f.key}" name="${f.key}"><option value="">Noch offen · keine Steuerschätzung</option>${Object.entries(TaxModel.config.cantons).map(([k,c])=>`<option value="${k}" ${v===k?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div>`;
  return `${section}<div class="field"><label for="${f.key}">${f.label}</label><div class="entry"><input id="${f.key}" name="${f.key}" type="number" inputmode="${f.step===1?'numeric':'decimal'}" min="${f.min}" max="${f.max}" step="${f.step}" value="${esc(v)}" aria-describedby="groupHint error" ${f.optional?'':'required'}><span>${f.unit}</span></div></div>`;
 }
 function groupNote(g){
  if(g==='pension'&&state.mode==='pre')return `<p class="hint">PK-Beiträge: Arbeitnehmer und Arbeitgeber zusammen. Zinsen und Umwandlungssatz findest du unter Annahmen.</p>`;
  if(['income','regular'].includes(g)){
   const previous=!state.details.income&&state.values.regular!==undefined?`<p class="hint">Bisher als Gesamtsumme erfasst: ${cash(state.values.regular)} / Monat. Bitte auf die einzelnen Quellen aufteilen.</p>`:'';
   return previous+`<p class="hint">${state.details.pension?`PK-Rente aus deiner Vorsorge: ${cash(M.breakdown(state).income.pk/12)} / Monat vor Steuer.`:'Deine PK-Rente ergänzen wir im Bereich Vorsorge → Pensionskasse.'}</p>`;
  }
  if(g==='assumptions')return `<p class="hint">Horizont ${state.horizonMode==='automatic'?'automatisch aus der Schweizer Restlebenserwartung abgeleitet':'manuell festgelegt'}. Eine Änderung des Zielalters schaltet auf manuell. ${state.riskProfile==='cautious'?'Vorsichtige Standardannahme':'Gespeicherte Anlageannahme'}: Wachstum ${String(C.getRiskProfile(M.toPlan(state)).expectedRealReturn*100).replace('.',',')} % real, Anleihen 1 %, Geldmarkt 0 %.</p><details class="model-notes"><summary>Grundlage und Grenzen</summary><p>BFS-Periodensterbetafeln 2023: mittlere Restlebenserwartung Frauen/Männer im heutigen Alter, aufgerundet; mindestens ein Ruhestandsjahr. Keine individuelle Lebensdauerprognose.</p><p>Ab Start konstante Kaufkraft; laufende Einnahmen ohne Indexierung. Vor Pensionierung keine Inflationierung des Bedarfs. Noch nicht aufgeteiltes verfügbares Kapital wird bis zum Start unverändert angesetzt. Bei Aufteilung projiziert der gemeinsame Rechenkern die Anlagen und Beiträge.</p><p>Die Steuerrechnung ist eine Modellrechnung, keine individuelle Steuerberechnung. Vermögenssteuer und allfällige 3a-Bezugssteuern fehlen; Zinsen und Dividenden werden nicht separat besteuert.</p></details>`;
  return '';
 }
 function plainInput(f){
  const v=draft[f.key]??'';
  return `<div class="field"><label for="${f.key}">${f.label}</label><div class="entry"><input id="${f.key}" name="${f.key}" type="number" inputmode="${f.step===1?'numeric':'decimal'}" min="${f.min}" max="${f.max}" step="${f.step}" value="${esc(v)}" aria-describedby="pensionHint error" required><span>${f.unit}</span></div></div>`;
 }
 function pensionInputsMarkup(){
  const f=M.fields('pension',state);
  const pk=f.find(x=>x.key==='pk'),pkContrib=f.find(x=>x.key==='pkContrib');
  const share=shareValue();
  return `<div class="pension-basics">${plainInput(pk)}${plainInput(pkContrib)}</div>
   <div class="pension-slider"><span class="slider-caption">Rente oder Kapital</span><div class="slider-axis" aria-hidden="true"><span>Mehr Rente</span><span>Mehr Kapital</span></div><input id="pkShare" name="pkShare" type="range" min="0" max="100" step="1" value="${esc(share)}" aria-label="Anteil Rente oder Kapital"><div class="slider-values" aria-hidden="true"><span>100 % Rente · 0 % Kapital</span><span>0 % Rente · 100 % Kapital</span></div></div>
   <div class="pension-readout" aria-live="polite" aria-atomic="true"></div>`;
 }
 function pensionPreview(){
  if(M.error('pension',draft,state))return {pk:null};
  const s=M.apply(state,'pension',draft);s.confirmed=state.confirmed;
  const p=M.toPlan(s);
  return {s,p,pk:p?C.calculatePension(p):null};
 }
 function pensionReadoutMarkup(pk){
  const share=shareValue(),rentPct=100-share;
  if(!pk)return '<p class="hint">Guthaben und jährliche Sparbeiträge eingeben, um Rente und Kapitalbezug zu sehen.</p>';
  const cap=pk.cap,rent=pk.rent,taxOpen=pk.capitalTax!==null;
  return `<div class="pension-readout-grid"><div data-readout="rent-share"><span>% Rente</span><strong>${rentPct} %</strong></div><div data-readout="capital-share"><span>% Kapital</span><strong>${share} %</strong></div><div data-readout="rent"><span>Monatliche PK-Rente</span><strong>${cash(rent/12)}</strong></div><div data-readout="capital"><span>Kapitalbezug einmalig</span><strong>${cash(cap)}</strong><small>PK-Kapital brutto${taxOpen?` · netto ${cash(pk.netCap)}`:' · Steuer noch offen'}</small></div></div>`;
 }
 function refreshPension(){
  const preview=pensionPreview(),pk=preview.pk,slider=document.getElementById('pkShare'),readout=document.querySelector('.pension-readout');
  if(slider){const share=shareValue();slider.value=share;slider.setAttribute('aria-valuetext',`${100-share} % Rente, ${share} % Kapital`);}
  if(readout)readout.innerHTML=pensionReadoutMarkup(pk);
 }
 function renderPensionEditor(){
  if(draft.pkShare===''||draft.pkShare===undefined)draft.pkShare=50;
  app.innerHTML=`<header class="work-heading">${M.complete(state)?'':'<button class="home-link" data-home>← Übersicht</button>'}<button class="home-link" data-parent="vorsorge">← Vorsorge</button><h1>Pensionskasse</h1></header><div class="pension-screen"><section class="question pension-question"><div class="decision-kicker">Kernentscheidung</div><h2>Wie möchtest du deine Pensionskasse beziehen?</h2><p class="hint" id="pensionHint">Wähle, wie viel du als Rente und wie viel als einmaliges Kapital beziehen möchtest.</p><form id="question" novalidate>${pensionInputsMarkup()}<p class="hint">Sparbeiträge von Arbeitnehmer und Arbeitgeber zusammen.</p><p id="error" class="error" role="alert"></p><div class="actions"><button type="button" class="back" data-cancel>${M.complete(state)?'Abbrechen':'← Zurück'}</button><button class="primary" type="submit">Übernehmen</button></div></form></section></div>`;
  app.querySelectorAll('#question input').forEach(el=>el.addEventListener('input',()=>{
   draft[el.name]=el.type==='range'?Number(el.value):el.value;
   el.removeAttribute('aria-invalid');document.getElementById('error').textContent='';refreshPension();
  }));
  refreshPension();window.scrollTo(0,0);focusHeading();
 }
 function showEditor(g,{persist=false}={}){
  if(g==='assets'){showDetail('assets-detail');if(persist)save();return;}
  route=g;state.position=g;draft=structuredClone(drafts[g]??editorValues(g));effect=null;
  updateNav();
  if(persist)save();
  if(g==='pension'&&state.mode==='pre'){renderPensionEditor();return;}
  const info=groupInfo(g),isBasic=basic.includes(g);
  app.innerHTML=`<header class="work-heading">${M.complete(state)?'':'<button class="home-link" data-home>← Übersicht</button>'}${!isBasic?`<button class="home-link" data-parent="${parentOf(g)}">← ${['pension3a','pension'].includes(g)?'Vorsorge':g==='income'||g==='tax'?'Einkommen':g==='assets'?'Vermögen':'Dein Plan'}</button>`:''}<h1>${isBasic?'Dein Plan entsteht.':info.title}</h1></header><div class="workspace ${isBasic?'':'group-detail'} ${g==='tax'?'single-editor':''}"><section class="question">${isBasic?`<h2>${info.title}</h2>`:''}<p class="hint" id="groupHint">${info.hint}</p><form id="question" novalidate><div class="question-fields">${M.fields(g,state).map(input).join('')}</div>${groupNote(g)}<p id="timeFeedback" class="context" aria-live="polite"></p><p id="error" class="error" role="alert"></p><div class="actions"><button type="button" class="back" data-cancel>${M.complete(state)?'Abbrechen':'← Zurück'}</button><button class="primary" type="submit">${isBasic&&!M.complete(state)?'Weiter →':'Übernehmen'}</button></div></form></section><section class="live-plan" id="livePlan" aria-label="Dein Live-Plan" aria-live="polite" aria-atomic="true"></section></div>`;
  app.querySelectorAll('#question input,#question select').forEach(el=>el.addEventListener('input',()=>{
   draft[el.name]=el.type==='checkbox'?el.checked:el.value;
   el.removeAttribute('aria-invalid');document.getElementById('error').textContent='';renderLive(preview());
  }));
  renderLive(preview());focusHeading();
 }
 function preview(){
  if(!M.error(route,draft,state)){
   const next=M.apply(state,route,draft);next.confirmed=state.confirmed;return next;
  }
  const next=structuredClone(state);
  if(route==='regular')delete next.values.regular;else if(basic.includes(route))for(const f of M.fields(route,state))delete next.values[f.key];
  return next;
 }
 function detailRow(key,label,value,{unit='',hint='',negative=false,total=false,empty='Noch nicht erfasst'}={}){
  return `<div class="detail-row${total?' detail-total':''}" data-detail="${key}"><dt>${label}${hint?`<small>${hint}</small>`:''}</dt><dd>${value===null?`<span class="unknown">${empty}</span>`:`<strong>${negative?'− ':''}${cash(value)}</strong>${unit?`<span class="detail-unit">${unit}</span>`:''}`}</dd></div>`;
 }
 function incomeComposition(s){
  const b=M.breakdown(s),r=b.result,c=TaxModel.canton(M.canton(s)),monthly={unit:'/ Monat'};
  return `<p class="hint">${s.mode==='pre'?`Ab Pensionierung mit ${s.values.retirement}`:`Ab Alter ${s.values.age}`} · Einnahmen vor persönlicher Steuer</p><dl class="detail-list income-sources">
   ${detailRow('ahv','AHV',b.income.ahv===null?null:b.income.ahv/12,monthly)}
   ${detailRow('pk-income','PK-Rente',b.income.pk===null?null:b.income.pk/12,{...monthly,hint:s.details.pension?'aus Vorsorge':'Unter Vorsorge → Pensionskasse ergänzen'})}
   ${detailRow('other-income','Weitere regelmässige Einnahmen',b.income.other===null?null:b.income.other/12,{...monthly,hint:'Weitere Renten und Einnahmen, einschliesslich Nettomiete'})}
   ${b.income.unallocated===null?'':detailRow('unallocated-income','Noch nicht aufgeteilte Einnahmen',b.income.unallocated/12,monthly)}
  </dl><section class="tax-summary" aria-label="Einkommen und Steuern"><dl class="detail-list">
   ${detailRow('income-gross','Bruttoeinkommen',r.incomeGross/12,monthly)}
   ${detailRow('income-tax','Geschätzte Einkommenssteuer',r.incomeTax===null?null:r.incomeTax/12,{...monthly,negative:true,empty:'Steuern noch offen',hint:r.incomeTax===null?'':`${cash(r.incomeTax)} / Jahr`})}
  </dl><p class="canton-line">Wohnkanton: <strong>${c?esc(c.name):'Noch offen'}</strong></p>
  ${c?`<p class="hint">Geschätzter Satz: ${String(TaxModel.getIncomeTaxRate(M.canton(s),r.incomeGross)).replace('.',',')} % · <button class="inline-action" data-open="tax">Wohnkanton ändern</button></p>`:'<p class="hint">Die vorläufige Rechnung enthält noch keinen Steuerabzug. Die Datengrundlage ist deshalb noch nicht gut abgestützt.</p><button data-open="tax">Wohnkanton ergänzen</button>'}
  <dl class="detail-list">${detailRow('income-net',c?'Netto verfügbar':'Vorläufig verfügbar',r.monthlyIncomeNet,{...monthly,total:true,hint:c?'nach geschätzten Steuern':'Steuern noch offen'})}</dl>
  </section><p class="hint">Beträge auf ganze Franken gerundet. Modellrechnung, keine individuelle Steuerberechnung.</p>`;
 }
 function assetRow(s,key,label,value,{part,hint='',source}={}){
  const expanded=part&&assetOpen===part;
  const action=source?`data-open="${source}"`:`data-asset="${part}" aria-expanded="${!!expanded}" aria-controls="asset-${part}"`;
  const values=assetDrafts[part]??s.details.assets??{};
  const form=expanded?`<form class="asset-inline" id="asset-${part}" data-asset-form="${part}" novalidate>${M.assetFields(part,s).map(f=>`<div class="field"><label for="asset-input-${f.key}">${f.label}${f.key==='securities'?' heute':''}</label><div class="entry"><input id="asset-input-${f.key}" name="${f.key}" type="number" inputmode="decimal" min="${f.min}" max="${f.max}" step="any" value="${esc(values[f.key]??(f.key==='unallocated'?M.breakdown(s).assets.unallocated??0:''))}" aria-describedby="asset-error" required><span>${f.unit}</span></div></div>`).join('')}${['cash','securities','otherAssets'].includes(part)&&!s.details.assets?.[part]&&M.breakdown(s).assets.unallocated!==null?'<p class="hint">Neu erfasste Bestände teilen zuerst deine bisherige Gesamtsumme auf. Der verbleibende Rest bleibt separat sichtbar und kann angepasst werden.</p>':''}<p class="error" id="asset-error" role="alert"></p><div class="actions"><button type="button" data-asset-cancel="${part}">Abbrechen</button><button class="primary" type="submit">Übernehmen</button></div></form>`:'';
  return `<div class="asset-item" data-detail="${key}"><button class="asset-row" ${action}><span>${label}${hint?`<small>${hint}</small>`:''}</span><span class="asset-amount">${value===null?'<span class="unknown">Noch nicht erfasst</span>':`<strong>${cash(value)}</strong>`}${source?'<small>aus Vorsorge</small>':''}</span><span class="asset-chevron">${value===null&&!source?'Erfassen':'›'}</span></button>${form}</div>`;
 }
 function assetComposition(s){
  const b=M.breakdown(s),pre=s.mode==='pre',projection='voraussichtlich zum Pensionierungszeitpunkt';
  const pkHint=`gemäss deiner PK-Entscheidung${b.assets.pk===null?'':` · ${b.pk.capitalTax===null?'PK-Kapital brutto, Steuer noch offen':'PK-Kapital netto nach Bezugssteuer'}`}`;
  return `<p class="hint">${pre?`Verfügbare Mittel ab Pensionierung mit ${s.values.retirement}`:`Verfügbare Mittel ab Alter ${s.values.age}`}</p><div class="asset-sources">
   ${assetRow(s,'cash','Bank / liquide Mittel',b.assets.cash,{part:'cash'})}
   ${assetRow(s,'securities','Wertschriften',b.assets.securities,{part:'securities',hint:pre?projection:''})}
   ${pre?assetRow(s,'p3-assets','Säule 3a',b.assets.p3,{source:'pension3a',hint:projection})+assetRow(s,'pk-assets','PK-Kapital',b.assets.pk,{source:'pension',hint:pkHint}):''}
   ${assetRow(s,'other-assets','Weitere verfügbare Vermögenswerte',b.assets.other,{part:'otherAssets'})}
   ${b.assets.unallocated===null?'':assetRow(s,'unallocated-assets','Noch nicht aufgeteiltes verfügbares Vermögen',b.assets.unallocated,{part:'unallocated'})}
  </div><dl class="detail-list" aria-live="polite">${detailRow('assets-total','Verfügbares Vermögen total',b.result.availableCapital,{total:true})}</dl>${pre?'<p class="hint">Noch nicht erfasste Vorsorgebeträge sind nicht eingerechnet. Eine separate 3a-Bezugssteuer ist noch nicht berücksichtigt.</p>':'<p class="hint">Bereits bezogenes PK- und 3a-Kapital ist in deinen verfügbaren Mitteln enthalten und wird nicht nochmals hinzugezählt.</p>'}
  <section class="bound-assets" aria-label="Gebundenes Vermögen"><h2>Gebundenes Vermögen</h2>${assetRow(s,'bound-assets','Immobilien netto',b.assets.bound,{part:'property',hint:'Immobilienwert abzüglich Hypotheken'})}<p class="hint">Dieses Vermögen ist aktuell nicht für laufende Entnahmen eingeplant.</p></section>`;
 }
 function showDetail(view){
  route=view;state.position=view;effect=null;updateNav();
  const income=view==='income-detail',mechanics=view==='asset-funding';
  const title=income?'Deine Einkommen im Ruhestand':mechanics?'So finanziert dein Vermögen deinen Ruhestand':'Dein verfügbares Vermögen';
  app.innerHTML=`<header class="work-heading"><button class="home-link" data-parent="${mechanics?'assets-detail':'plan'}">← ${mechanics?'Vermögen':'Dein Plan'}</button><h1>${title}</h1></header><div class="detail-screen">${income?incomeComposition(state):mechanics?assetFunding(state,C.evaluatePlan(M.toPlan(state))):assetComposition(state)}${mechanics?'':`<div class="detail-actions">${income?'<button data-open="income">Einkommen bearbeiten</button>':'<button class="primary" data-view="asset-funding">So finanziert dein Vermögen deinen Ruhestand →</button>'}</div>`}</div>`;
  focusHeading();
 }
 function render3a(s){
  const valid=!M.error('pension3a',draft,state),p=valid?M.toPlan(s):null,value=p?C.calculateRetirementStart(p).p3:null;
  document.getElementById('livePlan').innerHTML=`<section class="p3-projection"><span>Voraussichtlich zum Pensionierungszeitpunkt</span><strong>${value===null?'Noch offen':cash(value)}</strong><p class="hint">Mit Alter ${state.values.retirement} · ergänzt dein verfügbares Vermögen.</p><details class="model-notes"><summary>So wird die Säule 3a berücksichtigt</summary><p>Guthaben und jährliche Beiträge werden mit der 3a-Rendite aus deinen Annahmen bis zur Pensionierung hochgerechnet. Eine separate 3a-Bezugssteuer ist noch nicht berücksichtigt.</p></details></section>`;
 }
 function assetFunding(s,r){
  if(!r)return '<p class="hint">Für die Finanzierung fehlen noch Angaben.</p>';
  const buckets=r.bucketAllocation;
  return `<section class="asset-funding"><p class="hint">${s.mode==='pre'?`Ab Pensionierung mit ${s.values.retirement}`:`Ab Alter ${s.values.age}`} · ${cash(r.availableCapital)} verfügbar${r.incomeTax===null?' · vorläufig ohne Steuerabzug':''}</p><p class="annual-withdrawal">Restbedarf aus Vermögen: <strong>${cash(r.annualGap)} / Jahr</strong></p><ol class="bucket-flow">${[[2,'Langfristiges Wachstum','Verbleibendes verfügbares Kapital'],[1,'Reserve für später','Für die nächsten zwei Entnahmejahre'],[0,'Kurzfristig verfügbar','Für die laufende Jahresentnahme']].map(([i,title,hint])=>`<li><span>${title}</span><strong>${cash(buckets[i])}</strong><small>${hint}</small></li>`).join('')}<li class="bucket-withdrawal"><span>Laufende Entnahmen</span><strong>${cash(r.monthlyGap)} / Monat</strong></li></ol><p class="hint bound-note">Immobilien und anderes gebundenes Vermögen sind hier nicht als verfügbare Mittel berücksichtigt.</p><details class="model-notes"><summary>So funktionieren die Reserven</summary><p>Als Orientierung: ein zusätzlicher Jahresbedarf kurzfristig verfügbar, ungefähr zwei weitere als Reserve, der Rest für langfristiges Wachstum. Die Beträge stammen aus der Planrechnung; sie berücksichtigen die tatsächlichen Entnahmen der jeweiligen Jahre. Bei knappem Kapital hat der kurzfristige Bedarf Vorrang.</p><p>Der Geldfluss führt vom Wachstum über die Reserve zu den laufenden Entnahmen. Die Reserven werden jährlich geprüft und aufgefüllt. Auch nach Verlusten können Verkäufe nötig sein.</p></details></section>`;
 }
 function nextStep(s){
  if(s.mode==='pre'){
   const missing=[!s.confirmed.pension3a&&['pension3a','Säule 3a'],!s.confirmed.pension&&['pension','Pensionskasse']].filter(Boolean);
   if(missing.length)return `<aside class="next-step"><p>${missing.map(([,label])=>label).join(' und ')} ${missing.length===1?'ist':'sind'} noch nicht bestätigt. Deine Einschätzung berücksichtigt bisher nur die erfassten Angaben.</p><button data-open="${missing[0][0]}">${missing[0][1]} prüfen →</button></aside>`;
  }
  if(s.mode==='post'&&!s.confirmed.pension)return '<aside class="next-step"><p>Deine laufende PK-Rente ist noch offen.</p><button data-open="pension">Pensionskasse ergänzen →</button></aside>';
  if(!M.canton(s))return '<aside class="next-step"><p>Für die Steuerschätzung fehlt noch dein Wohnkanton.</p><button data-open="tax">Wohnkanton ergänzen →</button></aside>';
  return '';
 }
function metric(key,label,amount,annual,sign='',edit){
  const arrow=route==='plan'&&edit?'<span class="metric-arrow" aria-hidden="true">→</span>':'';
  const note=route==='plan'&&key==='income'?`<small class="metric-note">${M.canton(state)?'nach geschätzten Steuern':'Steuern noch offen'}</small>`:'';
  const row = `<span class="label">${label}${note}</span><div>${amount===null?'<span class="unknown">noch offen</span>':`<strong>${sign}${cash(amount)}</strong>${key==='capital'?'':'<span class="unit">/ Monat</span>'}`}</div>${annual===null?'':`<small>${sign}${cash(annual)} / Jahr</small>`}${arrow}`;
  if(route==='plan'&&edit) return `<button type="button" class="metric secondary" data-metric="${key}" ${detailRoutes.includes(edit)?'data-view':'data-open'}="${edit}">${row}</button>`;
  return `<div class="metric secondary" data-metric="${key}">${row}</div>`;
}
function range(s,r){
  const p=M.toPlan(s);
  return {
    start:s.mode==='pre'?p.retirement.age:p.person.currentAge,
    end:p.retirement.targetAge,
    until:r.capitalExhaustionAge??p.retirement.targetAge,
    pending:r.assessment==='pending'
  };
}
function rangeText(x){
  return `${x.pending?'ohne Steuerabzug: ':''}bis Alter ${x.until}`;
}
function funding(s,r){
  const x=range(s,r),gap=r.capitalExhaustionAge!==undefined;
  const endLabel=s.horizonMode==='automatic'?`Planungshorizont ${x.end}`:`Ziel ${x.end}`;
  const startLabel=s.mode==='pre'?`Pensionierung ${x.start}`:`Start ${x.start}`;
  const title=x.pending?(gap?`Vorläufig bis Alter ${x.until}`:`Reichweite bis Alter ${x.end} · Steuern offen`):gap?`Aktuell reicht dein Plan bis Alter ${x.until}`:'✓ Deine erste Planung geht voraussichtlich auf.';
  const statusLabel=gap?`bis ${x.until}`:`bis ${x.end}${x.pending?'':' ✓'}`;
  const funded=Math.max(0,Math.min(100,(x.until-x.start)/(x.end-x.start)*100));
  const stress=r.assessment==='amber'?`<p class="stress-note">Stress-Test: Bei fünf schwachen Jahren entsteht ab Alter ${r.stressGapAge} eine Lücke. <span aria-hidden="true">ⓘ</span></p>`:'';
  return `<section class="funding" data-status="${r.assessment}"><span class="quality-caption">Deine Finanzierung · Modellrechnung</span><h2>${title}</h2><div class="funding-static" role="img" aria-label="Finanzierter Zeitraum bis zum Planungshorizont${x.pending?', vorläufig ohne Steuern':''}: ${startLabel}, finanziert bis ${x.until}, ${endLabel}"><div class="funding-static-track" aria-hidden="true"><span style="width:${funded}%"></span></div><div class="funding-static-labels"><span>${startLabel}</span><span>${x.pending?'vorläufig':'finanziert'} ${statusLabel}</span><span>${endLabel}</span></div></div><p>${gap?`${s.horizonMode==='automatic'?`Planung bis Alter ${x.end}`:`Ziel: Alter ${x.end}`}. Es fehlen noch ${x.end-x.until} ${x.end-x.until===1?'Jahr':'Jahre'}.`:x.pending?'Noch keine abschliessende Finanzierbarkeitsaussage.':`Unter den aktuellen Annahmen ist dein Lebensstandard bis Alter ${x.end} finanziert.`}</p>${x.pending?'<p>Vorläufig ohne Steuerabzug · Wohnkanton noch offen.</p>':''}${stress}</section>`;
}
 function renderLive(s){
  const p=M.toPlan(s),r=p?C.evaluatePlan(p):null,has=k=>s.values[k]!==undefined,done=M.complete(s);
  if(route==='pension3a'){render3a(s);return;}
  if(route==='tax')return;
  if(route==='assets'){document.getElementById('livePlan').innerHTML=`<h2>Vorschau zum Planungsstart</h2>${assetComposition(s)}`;return;}
  const feedback=document.getElementById('timeFeedback');
  if(feedback)feedback.textContent=route==='time'&&p?(s.mode==='pre'?`Noch ${p.retirement.age-p.person.currentAge} Jahre bis zu deiner Pensionierung`:'Planungsstart heute.') :'';
  const metrics=metric('need','Bedarf',r&&has('need')?r.monthlyNeed:null,r&&has('need')?r.yearlyProjection[0].need:null,'','need')
   +metric('income',r&&r.incomeTax!==null?'Einkommen netto':'Einkommen · Steuern offen',r&&has('regular')?r.monthlyIncomeNet:null,r&&has('regular')?r.incomeNet:null,'− ','income-detail')
   +(()=>{const surplus=r&&has('need')&&has('regular')&&r.monthlyIncomeNet>r.monthlyNeed;return metric('withdrawal',surplus?'Keine Entnahme nötig':'Restbedarf aus Vermögen',r&&has('need')&&has('regular')?r.monthlyGap:null,r&&has('need')&&has('regular')?r.annualGap:null,surplus?'':'= ','asset-funding');})()
   +metric('capital','Verfügbares Vermögen',r&&has('free')?r.availableCapital:null,null,'','assets-detail');
  let html=`<div class="live-title"><span>Dein Plan</span><span>${p?`Ab Alter ${s.mode==='pre'?p.retirement.age:p.person.currentAge}`:'Zeitpunkt noch offen'}</span></div>`;
  if(route==='plan'){html+=metrics;html+=done?funding(s,r):'<p class="open-result">Ergebnis noch offen</p>';html+=qualityPlan(s);html+=nextStep(s);if(effect)html+=`<details class="model-notes pension-effect"><summary>Was deine Vorsorgeangaben verändert haben</summary><p>Reichweite: ${rangeText(effect.before)} → ${rangeText(effect.after)}.</p><p>Verfügbares Vermögen: ${cash(effect.beforeCapital)} → ${cash(effect.afterCapital)}.</p></details>`;}
  else{html+=metrics;html+=done?funding(s,r):'<p class="open-result">Ergebnis noch offen</p>';if(!done&&has('regular'))html+='<p class="context">Zwischenstand · noch nicht alle Angaben bestätigt.</p>';}
  document.getElementById('livePlan').innerHTML=html;
 }
function modelNotes(){
  const p=M.toPlan(state),r=C.evaluatePlan(p),c=TaxModel.canton(p.person.canton),pk=C.calculatePension(p);
  const horizonLabel=state.horizonMode==='automatic'?'Planungshorizont':'Ziel';
  return `<details class="model-notes"><summary>So rechnen wir</summary><p>Planung von Alter ${state.mode==='pre'?p.retirement.age:p.person.currentAge} bis ${p.retirement.targetAge}. Verfügbares Restkapital am ${horizonLabel}: ${cash(r.capitalAtTargetAge)}. Keine Aussage über weitere Jahre ausserhalb des berechneten Horizonts.</p><p>${c?`Geschätzte Einkommenssteuer: ${cash(r.incomeTax)} / Jahr auf ${cash(r.incomeGross)} in ${esc(c.name)} (${String(TaxModel.getIncomeTaxRate(p.person.canton,r.incomeGross)).replace('.',',')} %).`:'Ohne Wohnkanton ist keine Steuerschätzung berücksichtigt.'} Modellrechnung, keine individuelle Steuerberechnung.</p>${state.mode==='pre'&&state.details.pension?`<p>PK-Kapital brutto ${cash(pk.cap)}, Bezugssteuer ${pk.capitalTax===null?'noch offen':cash(pk.capitalTax)}, netto ${cash(pk.netCap)}${pk.capitalTax===null?' (vorläufig ohne Steuerabzug)':''}. Nur die gewählte Kapitalquote wird besteuert. PK-Rente ${cash(pk.rent/12)} / Monat, vor persönlicher Steuer.</p>`:''}<p>Monatseinnahmen gelten ab Planungsstart ohne Indexierung. Gebundenes Immobilienkapital ist nicht enthalten. ${!state.details.assets&&state.mode==='pre'?'Unaufgeteiltes freies Kapital bleibt bis zur Pensionierung unverändert. ':''}Anlage-, Inflations- und Horizontannahmen unter «Annahmen» prüfen.</p></details>`;
}
 function plan(){
  route='plan';state.position='plan';
  updateNav();
  app.innerHTML=`<header class="work-heading">${M.complete(state)?'':'<button class="home-link" data-home>← Übersicht</button>'}<h1>Dein Plan</h1><button class="time-edit" data-open="time">${state.mode==='pre'?`Pensionierung mit ${state.values.retirement}`:`Planungsstart mit ${state.values.age}`} · Ändern</button></header><div class="plan-screen"><section class="live-plan" id="livePlan" aria-label="Dein Plan"></section></div>`;
  renderLive(state);window.scrollTo(0,0);const h=app.querySelector('h1');h.tabIndex=-1;h.focus({preventScroll:true});
 }
 function submit(){
  const problem=M.error(route,draft,state);
  if(problem){
   document.getElementById('error').textContent=problem.message;const el=app.querySelector(`[name="${problem.key}"]`);el?.setAttribute('aria-invalid','true');el?.focus();return;
  }
  const wasComplete=M.complete(state),before=wasComplete?C.evaluatePlan(M.toPlan(state)):null,old=state,g=route;
  state=M.apply(state,g,draft);
  delete drafts[g];
  if(g==='time'){drafts={};assetDrafts={};assetOpen=null;}
  else {delete drafts.assumptions;if(g==='pension') {delete drafts.income;delete drafts.regular;}if(['income','regular','tax'].includes(g)){delete drafts.income;delete drafts.regular;delete drafts.tax;}}
  if(['pension','pension3a'].includes(g)&&before){const after=C.evaluatePlan(M.toPlan(state));effect={before:range(old,before),after:range(state,after),beforeCapital:before.availableCapital,afterCapital:after.availableCapital};}
  else effect=null;
  if(!wasComplete&&basic.includes(g)&&g!=='free'){const next=basic[basic.indexOf(g)+1];state.position=next;save();showEditor(next);}
  else {if(['income','assets','tax'].includes(g))showParent(g);else plan();save();}
 }
 function refreshAssets(focus){
  const y=window.scrollY;showDetail('assets-detail');window.scrollTo(0,y);app.querySelector(focus)?.focus({preventScroll:true});
 }
 app.addEventListener('input',e=>{
  const form=e.target.closest('[data-asset-form]');if(!form)return;
  assetDrafts[form.dataset.assetForm]=Object.fromEntries(new FormData(form));
  e.target.removeAttribute('aria-invalid');form.querySelector('.error').textContent='';
 });
 app.addEventListener('submit',e=>{
  e.preventDefault();const part=e.target.dataset.assetForm;if(!part){submit();return;}
  const values=Object.fromEntries(new FormData(e.target)),problem=M.assetError(part,values,state);
  if(problem){e.target.querySelector('.error').textContent=problem.message;const input=e.target.elements[problem.key];input?.setAttribute('aria-invalid','true');input?.focus();return;}
  state=M.applyAsset(state,part,values);delete assetDrafts[part];delete drafts.assumptions;assetOpen=null;
  refreshAssets(`[data-asset="${part}"]`);save();
 });
 app.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.asset){assetOpen=assetOpen===b.dataset.asset?null:b.dataset.asset;refreshAssets(assetOpen?'[data-asset-form] input':`[data-asset="${b.dataset.asset}"]`);return;}
  if(b.dataset.assetCancel){delete assetDrafts[b.dataset.assetCancel];assetOpen=null;refreshAssets(`[data-asset="${b.dataset.assetCancel}"]`);return;}
  if(b.hasAttribute('data-save')){save();renderMore();}
  if(b.dataset.mode){state=M.fresh(b.dataset.mode);showEditor('time');}
  if(b.hasAttribute('data-resume')&&resumeRecord){state=structuredClone(resumeRecord.state);restorePosition();}
  if(b.dataset.open){keepDraft();showEditor(b.dataset.open,{persist:true});}
  if(b.dataset.view){keepDraft();showDetail(b.dataset.view);save();}
  if(b.dataset.parent){keepDraft();if(b.dataset.parent==='vorsorge')renderVorsorge();else if(detailRoutes.includes(b.dataset.parent))showDetail(b.dataset.parent);else plan();save();}
  if(b.hasAttribute('data-home')){keepDraft();welcome();}
  if(b.hasAttribute('data-cancel')){
   delete drafts[route];
   effect=null;
   if(M.complete(state)){showParent(route);save();}
   else {const i=basic.indexOf(route);if(i>0){state.position=basic[i-1];save();showEditor(state.position);}else welcome();}
  }
  if(b.hasAttribute('data-new')){
   if(!window.confirm('Neue Planung beginnen? Dein gespeicherter V2-Stand wird ersetzt.'))return;
   try{localStorage.removeItem(M.key);saved=null;loadError='';state=M.fresh();drafts={};assetDrafts={};assetOpen=null;effect=null;status('Neue Planung · bestätigte Angaben werden lokal gespeichert.');welcome();}
   catch(_){status('Der gespeicherte Stand konnte nicht entfernt werden. Er bleibt erhalten.',true);}
  }
 });
 window.CheckV2={getState:()=>structuredClone(state),getPlan:()=>M.toPlan(state),getResult:()=>M.toPlan(state)?C.evaluatePlan(M.toPlan(state)):null};
 read();welcome();
})();
