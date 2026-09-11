/* Three product levels, explicit navigation states, one shared calculation model. */
window.CheckUI=(()=>{
 const core=RetirementCalculator,legacy=document.querySelector('.legacy-app');
 const shell=document.createElement('div');shell.className='check-shell';shell.id='checkApp';legacy.before(shell);
 // Only this table owns the hierarchy; legacy tabs are rendering targets.
 const routes={
  situation:{title:'Start'},basic:{title:'Deine Angaben',parent:'situation'},plan:{title:'Dein Plan'},
  income:{title:'Einkommen & Steuern',parent:'plan',view:'overview'},
  capital:{title:'Kapital & 3-Töpfe-Modell',parent:'plan',view:'pots'},
  pension:{title:'PK – Rente oder Kapital',parent:'plan',screen:'pk',pre:true},
  scenarios:{title:'Szenarien & Risiken',parent:'plan',view:'dev'},
  advice:{title:'Beratung',parent:'plan',screen:'advice'},
  edit_overview:{title:'Angaben ändern',parent:'plan'},
  edit_personal:{title:'Persönliche Situation',parent:'edit_overview',group:true},
  edit_income:{title:'Einkommen & Bedarf',parent:'edit_overview',group:true},
  edit_assets:{title:'Vermögen',parent:'edit_overview',group:true},
  edit_pension:{title:'Vorsorge',parent:'edit_overview',group:true,pre:true},
  assumptions:{title:'Lebensphasen & Annahmen',parent:'edit_overview',view:'ass'}
 };
 const deep=new Set(Object.keys(routes).filter(key=>routes[key].view||routes[key].screen));
 const aliases={answer:'plan',details:'edit_overview'};
 const editorRoutes={ageNow:'edit_personal',horizon:'edit_personal',income:'edit_income',postIncome:'edit_income',need:'edit_income',assets:'edit_assets',postAssets:'edit_assets',build:'edit_pension',pk:'pension'};
 let state='situation',message='',error=false;
 const drafts={};
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=n=>CHF(n),pct=n=>n.toLocaleString('de-DE',{maximumFractionDigits:2});
 const model=()=>{ensurePlan();return core.fromState(st)};
 const input=(name,label,value,unit='CHF',extra='')=>`<label class="check-field"><span>${label}</span><div><input name="${name}" aria-label="${label}" type="number" ${extra.includes('min=')?'':'min="0"'} ${extra.includes('step=')?'':'step="any"'} value="${value}" ${extra} required><span>${unit}</span></div></label>`;
 function header(){return `<header class="check-header"><div class="check-brand"><span class="check-mark">R</span>Ruhestands-Check</div><div class="check-advisor"><span>Mit Patrick<br><small>Dein Ruhestand. Dein Plan.</small></span><img src="pin.jpeg" alt="Patrick"></div></header>`}
 function assumptions(){return `<details class="check-method"><summary>So rechnen wir <span>ⓘ</span></summary><p>Modellrechnung ab ${st.mode==='post'?'heute':'Pensionierung'}, keine Garantie. Laufende Einnahmen und Bedarf werden zuerst verrechnet; eine Lücke finanzierst du aus deinem freien Vermögen.</p><p>Deine aktuellen Annahmen: Inflation ${pct(st.ass.inflation)} %, reale Rendite Geldmarkt ${pct(st.plan.returns[0])} %, Anleihen ${pct(st.plan.returns[1])} %, Wachstum ${pct(st.plan.returns[2])} %. Die Reserven decken ein laufendes und zwei folgende Entnahmejahre.</p><p>Steuern werden vereinfacht nach Wohnkanton geschätzt. Immobilien bleiben gebunden. Keine zusätzliche Vermögenssteuer oder 3a-Bezugssteuer. Alle Details kannst du unter «Angaben ändern» anpassen.</p></details>`}
 function storage(){let date='';const saved=readPersonalSave();if(saved?.savedAt)date=`Zuletzt gespeichert: ${new Date(saved.savedAt).toLocaleString('de-CH')}`;return `<div class="check-storage"><button class="check-button" data-action="save">Auf diesem Gerät speichern</button><button class="check-button secondary" data-go="advice">Beratung ansehen</button><small>Nur in diesem Browser auf diesem Gerät gespeichert.</small>${date?`<small>${esc(date)}</small>`:''}</div>`}
 function profileSelection(showResult=['assumptions','scenarios'].includes(state)){
  const plan=model(),selected=core.getRiskProfile(plan),result=showResult?core.evaluatePlan(plan):null;
  const profiles=Object.keys(RiskProfiles.profiles).map(key=>RiskProfiles.getRiskProfile(key));
  return `<section class="check-profiles"><div class="profile-bar-heading"><strong>Anlageprofil · Wachstum</strong><details class="profile-help"><summary aria-label="Anlageprofile erklären">ⓘ</summary><div><p>Geld für später: langfristig entsprechend deinem Anlageprofil investiert.</p>${profiles.map(profile=>`<p><strong>${profile.label}</strong><br>${profile.description}</p>`).join('')}<p>Höhere Renditechancen bedeuten grössere Verlustrisiken. Auch vorsichtige Anlagen können Verluste aufweisen.</p><p>Aktuell: ${selected.label} · reale Zielrendite ${pct(selected.expectedRealReturn*100)} % · Schwankungsfaktor ${pct(selected.volatilityFactor)}. Modellannahmen, keine Renditegarantie.</p></div></details></div><div class="profile-options" role="group" aria-label="Anlageprofil auswählen">${profiles.map(profile=>`<button type="button" data-profile="${profile.key}" aria-pressed="${selected.key===profile.key}" aria-label="${profile.label}, erwartete reale Rendite ${pct(profile.expectedRealReturn*100)} Prozent" ${planningLocked?'disabled':''}><strong>${profile.label.replace('Chancenorientiert','Chancen<wbr>orientiert')}</strong><span>${pct(profile.expectedRealReturn*100)} %</span></button>`).join('')}</div>${selected.custom?`<small class="profile-custom">Individuell angepasst · reale Zielrendite ${pct(selected.expectedRealReturn*100)} %</small>`:''}${showResult?`<div class="profile-result ${result.assessment}" aria-live="polite"><strong>${result.assessment==='pending'?'Wohnkanton fehlt':result.assessment==='red'?`Finanzierungslücke ab Alter ${result.capitalExhaustionAge}`:result.assessment==='amber'?'Basis ausreichend, aber empfindlich':'Voraussichtlich ausreichend'}</strong><span>Verfügbares Restkapital mit ${st.planningAge}: ${money(result.capitalAtTargetAge)}</span><small>Basisrechnung unter den gewählten Annahmen. Separat in Immobilien gebunden: ${money(result.restrictedCapital)} (Marktwert minus Hypotheken; im Restkapital nicht enthalten).</small></div>`:''}</section>`;
 }
 function selectProfile(key){
  if(planningLocked)return;
  const y=window.scrollY,focused=document.activeElement?.hasAttribute('data-profile'),inLegacy=legacy.contains(document.activeElement);
  rememberDraft();st=core.toState(core.withReturnProfile(model(),key));
  if(drafts.assumptions){delete drafts.assumptions.return2;delete drafts.assumptions.assCap;}
  persist();ui();go(state,{remember:false});window.scrollTo({top:y});
  if(focused)(inLegacy?legacy.querySelector('.screen.active'):shell)?.querySelector(`[data-profile="${core.getRiskProfile(model()).key}"]`)?.focus({preventScroll:true});
 }
 function render(){
  ensurePlan();document.body.classList.add('check-v2');document.body.classList.toggle('check-deep',deep.has(state));legacy.hidden=!deep.has(state);
  let html='';
  if(state==='situation')html=`<main class="check-welcome"><div class="check-intro"><span class="check-eyebrow">Ein guter Anfang für deinen Ruhestand</span><h1>Reicht mein Geld<br>für das Leben,<br>das ich möchte?</h1><p>Ein paar Angaben. Eine verständliche Antwort. Und mehr Tiefe, wenn du sie möchtest.</p><div class="check-promise"><span>01 · Deine Situation</span><span>02 · Deine Angaben</span><span>03 · Dein Plan</span></div></div><section class="check-choice"><span class="check-eyebrow">Wo stehst du heute?</span><h2>Beginnen wir bei dir.</h2><button class="check-situation" data-mode="pre"><span class="check-choice-icon">↗</span><span><strong>Ich plane meinen Ruhestand</strong><small>Vermögen aufbauen und Pensionierung vorbereiten</small></span><b>→</b></button><button class="check-situation" data-mode="post"><span class="check-choice-icon">☀</span><span><strong>Ich bin bereits pensioniert</strong><small>Renten, Vermögen und Lebensstandard einordnen</small></span><b>→</b></button>${st.mode?'<button class="check-text-button" data-go="plan">Aktuelle Planung weiter ansehen →</button>':''}${readLocal(personalSaveKey)?'<button class="check-text-button" data-action="load">Meinen Stand laden →</button>':''}<p class="check-privacy">Deine Angaben bleiben auf deinem Gerät.<br>Du kannst sie jederzeit ändern.</p></section></main>`;
  if(state==='basic'){
   const post=st.mode==='post',a=post?st.post:st.assets,monthly=(post?st.post.ahv+st.post.pkRent+st.post.other:st.income.ahv+st.income.other)/12;
   html=`<main class="check-basic">${pageHeading()}<div class="check-section-heading"><span class="check-eyebrow">Der einfache Check</span><h2>Was soll dein Geld<br>für dich möglich machen?</h2><p>Ungefähre Beträge reichen für den ersten Überblick.</p></div>${st.exampleValues?'<p class="check-example">Beispielwerte – bitte durch deine persönlichen Angaben ersetzen.</p>':''}<form id="checkForm"><section class="check-form-section"><div><span class="check-number">01</span><h2>Du und dein Ruhestand</h2></div><div class="check-fields">${input('currentAge','Wie alt bist du?',st.currentAge,'Jahre','min="18" max="100" step="1"')}${!post?input('retirementAge','Wann möchtest du in Pension gehen?',st.retirementAge,'Jahre','min="50" max="100" step="1"'):''}${input('planningAge','Bis zu welchem Alter planen wir?',st.planningAge,'Jahre','max="110" step="1"')}<label class="check-field"><span>Dein Wohnsitzkanton</span><select name="canton" aria-label="Dein Wohnsitzkanton" required><option value="">Bitte auswählen</option>${Object.entries(TaxModel.config.cantons).sort((a,b)=>a[1].name.localeCompare(b[1].name,'de-CH')).map(([code,c])=>`<option value="${code}" ${st.canton===code?'selected':''}>${c.name} (${code})</option>`).join('')}</select></label></div></section><section class="check-form-section"><div><span class="check-number">02</span><h2>Monat für Monat</h2><p>Bruttoeinnahmen vor persönlichen Steuern.</p></div><div class="check-fields">${input('monthlyIncome',post?'AHV und Renten pro Monat':'Erwartete AHV und weitere Renten (ohne PK) pro Monat',monthly,'CHF / Monat')}${input('monthlyOther','Weitere Einnahmen, z. B. Nettomiete',(post?st.post.otherIncome:st.income.rent)/12,'CHF / Monat')}${input('monthlyNeed','Wie viel möchtest du zur Verfügung haben?',st.need/12,'CHF / Monat')}<p class="check-field-note">Lebensbedarf inklusive Wohnen, ohne Einkommenssteuern.</p></div></section><section class="check-form-section"><div><span class="check-number">03</span><h2>Dein Vermögen</h2><p>${post?'Was heute für dich verfügbar ist.':'Was du heute bereits aufgebaut hast.'}</p></div><div class="check-fields">${input('free',post?'Frei verfügbares Vermögen':'Bank und Wertschriften (ohne PK und 3a)',post?a.free:a.sec+a.cash)}<label class="check-field check-property"><span>Immobilien, die du behalten möchtest</span><select name="hasProperty" aria-label="Immobilien behalten"><option value="no" ${!a.re&&!a.mort?'selected':''}>Nein</option><option value="yes" ${a.re||a.mort?'selected':''}>Ja</option></select></label><div class="check-fields property-fields" ${!a.re&&!a.mort?'hidden':''}>${input('property','Marktwert Immobilien',a.re)}${input('mortgage','Hypotheken',a.mort)}</div></div></section>${!post?`<section class="check-form-section"><div><span class="check-number">04</span><h2>Deine Vorsorge</h2><p>Wir rechnen deine Beiträge bis zur Pensionierung hoch.</p></div><div class="check-fields">${input('pk','PK-Guthaben heute',st.assets.pk)}${input('pkContribution','Jährliche PK-Beiträge, Arbeitnehmer und Arbeitgeber',st.build.pkContrib,'CHF / Jahr')}${input('p3','Säule 3a heute',st.assets.p3)}${input('p3Contribution','Sparbeiträge Säule 3a',st.build.p3Contrib,'CHF / Jahr')}<label class="check-field check-pension"><span>Wie möchtest du die PK beziehen?</span><output id="checkPkLabel">${st.pkShare} % Kapital · ${100-st.pkShare} % Rente</output><input name="pkShare" aria-label="PK-Kapitalanteil" type="range" min="0" max="100" step="1" value="${st.pkShare}"><small>Die Wahl kannst du später in Ruhe vergleichen.</small></label></div></section>`:''}${assumptions()}<p id="checkFormError" role="alert"></p><button class="check-button" type="submit">Meine erste Antwort ansehen <span>→</span></button></form></main>`;
  }
  if(state==='plan'){
   const r=core.evaluatePlan(model()),status={green:'Voraussichtlich ausreichend',amber:'Ausreichend, aber empfindlich',red:'Voraussichtliche Finanzierungslücke',pending:'Noch nicht vollständig'}[r.assessment];
   html=`<main class="check-answer"><span class="check-eyebrow">Deine erste Planung steht</span><h1>Dein Plan</h1><p class="check-lead">${st.mode==='post'?'Ab heute':`Ab deiner Pensionierung mit ${st.retirementAge}`} · Planung bis Alter ${st.planningAge}</p><section class="check-result ${r.assessment}"><div class="check-status"><i></i>${status}</div><div class="check-answer-lines"><article><span>Deine laufenden Einnahmen</span><strong>${money(r.monthlyIncomeNet)}<small> / Monat</small></strong><p>${r.incomeTax===null?'Vorläufig ohne Steuerabzug. Für die vollständige Einschätzung fehlt dein Wohnkanton.':'Nach geschätzten Steuern aus Renten und weiteren Einnahmen.'}</p></article><article><span>${r.monthlyGap?'Ergänzung aus verfügbarem Kapital':'Dein Lebensstandard ist gedeckt'}</span><strong>${money(r.monthlyGap)}<small> / Monat</small></strong><p>${r.monthlyGap?`Diesen Betrag entnimmst du für deinen Bedarf von ${money(r.monthlyNeed)} pro Monat.`:'Deine laufenden Einnahmen decken den geplanten Bedarf.'}</p></article><article><span>${r.capitalExhaustionAge!==undefined?'Die Reichweite deiner Planung':`Verfügbares Restkapital mit ${st.planningAge}`}</span><strong>${r.capitalExhaustionAge!==undefined?`Bis Alter ${r.capitalExhaustionAge}`:money(r.capitalAtTargetAge)}</strong><p>${r.capitalExhaustionAge!==undefined?`Ab Alter ${r.capitalExhaustionAge} bleibt ein Teil des Bedarfs ungedeckt.`:`Basisrechnung · alle drei Töpfe, ohne gebundenes Immobilienkapital.`}</p></article></div>${r.assessment==='amber'?`<p class="check-stress-note">Die Basisrechnung reicht. Bei fünf schwachen Marktjahren entsteht ab Alter ${r.stressGapAge} eine Lücke.</p>`:''}<p class="check-model-note">Modellrechnung unter deinen Annahmen, keine Garantie. Alle Werte gerundet. Immobilienkapital bleibt gebunden und steht für Entnahmen nicht zur Verfügung.</p></section><nav class="check-next" aria-label="Dein Plan im Detail"><h2>Dein Plan im Detail</h2>${['income','capital',...(st.mode==='pre'?['pension']:[]),'scenarios'].map((key,i)=>`<button data-go="${key}"><span>0${i+1}</span><strong>${routes[key].title}</strong><b>→</b></button>`).join('')}</nav><button class="check-button secondary" data-action="edit">Angaben ändern</button>${storage()}${assumptions()}<button class="check-text-button" data-action="restart">Neue Planung</button></main>`;
  }
  if(state==='edit_overview')html=editOverview();
  if(routes[state].group)html=editor();
  if(deep.has(state))html=pageHeading()+(['assumptions','scenarios','capital'].includes(state)?profileSelection():'');
  if(shell.contains(legacy))shell.after(legacy);
  shell.innerHTML=header()+html+`<p class="check-message ${error?'error':''}" role="status" aria-live="polite">${esc(message)}</p><footer class="check-footer">Dein Ruhestands-Check · Klarheit für deinen nächsten Schritt.</footer>`;
 }
 function rememberDraft(){
  const fields=routes[state].group||state==='basic'?shell.querySelectorAll('form input,form select'):state==='assumptions'?legacy.querySelectorAll('#tab-ass input,#tab-ass select'):null;
  if(fields)drafts[state]=Object.fromEntries([...fields].map(el=>[el.name||el.id,{value:el.value,checked:el.checked}]));
 }
 function restoreDraft(){
  const saved=drafts[state];if(!saved)return;
  (state==='assumptions'?legacy:shell).querySelectorAll('input,select').forEach(el=>{const value=saved[el.name||el.id];if(value){el.value=value.value;if(el.type==='checkbox')el.checked=value.checked;}});
  const property=shell.querySelector('[name=hasProperty]');if(property)shell.querySelector('.property-fields').hidden=property.value==='no';
  const share=shell.querySelector('[name=pkShare]');if(share&&shell.querySelector('#checkPkLabel'))shell.querySelector('#checkPkLabel').textContent=`${share.value} % Kapital · ${100-share.value} % Rente`;
 }
 function go(next,{remember=true}={}){
  next=aliases[next]||next;if(!routes[next])return;
  if(next!=='situation'&&!st.mode)next='situation';
  if(routes[next].pre&&st.mode==='post')next='plan';
  if(remember)rememberDraft();state=next;render();
  if(deep.has(state)){
   shell.querySelector('.check-footer').before(legacy);legacy.dataset.topic=state;
   if(routes[state].screen){ui();legacyShow(routes[state].screen);if(state==='advice')renderClosingAdvisor();}
   else{renderResult();legacyShow('result');legacyTab(routes[state].view);}
  }
  restoreDraft();window.scrollTo({top:0,behavior:'instant'});
 }
 function pageHeading(){const route=routes[state];return `<div class="check-deep-heading"><button class="check-back" data-go="${route.parent}">← ${routes[route.parent].title}</button><h1 tabindex="-1">${route.title}</h1></div>`;}
 function cantonField(){return `<label class="check-field"><span>Dein Wohnsitzkanton</span><select name="canton" required><option value="">Bitte auswählen</option>${Object.entries(TaxModel.config.cantons).sort((a,b)=>a[1].name.localeCompare(b[1].name,'de-CH')).map(([code,c])=>`<option value="${code}" ${st.canton===code?'selected':''}>${c.name} (${code})</option>`).join('')}</select></label>`;}
 function editOverview(){
  const post=st.mode==='post',a=post?st.post:st.assets,sources=core.incomeSourcesAtStart(model()).filter(row=>row.annualIncome>0);
  const rows=[
   ['edit_personal',[['Situation',post?'Bereits pensioniert':'Vor Pensionierung'],['Alter heute',`${st.currentAge} Jahre`],...(!post?[['Pensionierung',`Mit ${st.retirementAge}`]]:[]),['Planung bis',`Alter ${st.planningAge}`],['Wohnsitzkanton',TaxModel.canton(st.canton)?.name||'Noch nicht gewählt']]],
   ['edit_income',[...sources.map(row=>[row.name,`${money(row.annualIncome/12)} / Monat`]),['Lebensbedarf',`${money(st.need/12)} / Monat`]]],
   ['edit_assets',[[post?'Verfügbares Kapital heute':'Bank und Wertschriften heute',money(post?a.free:a.cash+a.sec)],['Immobilienwert vor Hypotheken',money(a.re)],['Hypotheken',money(a.mort)],['Gebundenes Immobilienkapital',money(a.re-a.mort)]]],
   ...(!post?[['edit_pension',[['PK-Guthaben heute',money(a.pk)],['Säule 3a heute',money(a.p3)],['PK-Kapitalanteil',`${st.pkShare} %`]]]]:[])
  ];
  return `<main class="check-edit">${pageHeading()}<div class="check-edit-groups">${rows.map(([key,values])=>`<section class="check-edit-card"><div class="check-edit-title"><h2>${routes[key].title}</h2><button class="check-text-button" data-go="${key}" aria-label="${routes[key].title} ändern">Ändern →</button></div><dl>${values.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl></section>`).join('')}</div><button class="check-text-button" data-go="assumptions">Lebensphasen & Annahmen ändern →</button></main>`;
 }
 function editor(){
  const post=st.mode==='post',a=post?st.post:st.assets,inc=post?st.post:st.income,annual=(name,label,value)=>input(name,label,value/12,'CHF / Monat'),rate=(name,label,value)=>input(name,label,value,'%','min="-99" max="50"');
  let fields='';
  if(state==='edit_personal')fields=input('currentAge','Alter heute',st.currentAge,'Jahre','min="18" max="100" step="1"')+(!post?input('retirementAge','Pensionierungsalter',st.retirementAge,'Jahre','min="50" max="100" step="1"'):'')+input('planningAge','Planung bis Alter',st.planningAge,'Jahre','max="110" step="1"')+cantonField();
  if(state==='edit_income')fields=annual('ahv','AHV',inc.ahv)+(post?annual('pkRent','PK-Rente',inc.pkRent):`<p>PK-Rente aus deiner Aufteilung: ${money(split().rent/12)} / Monat. Die Aufteilung änderst du unter «PK – Rente oder Kapital».</p>`)+annual('other','Weitere Renten',inc.other)+annual('additional',st.plan.rental?'Nettomiete nach Objektkosten':'Weitere Einnahmen nach laufenden Kosten',post?inc.otherIncome:inc.rent)+annual('monthlyNeed','Lebensbedarf ohne Einkommenssteuern',st.need);
  if(state==='edit_assets')fields=(post?input('free','Frei verfügbares Vermögen',a.free):input('cash','Bankguthaben',a.cash)+input('sec','Wertschriften',a.sec))+input('re','Marktwert Immobilien',a.re)+input('mort','Hypotheken',a.mort);
  if(state==='edit_pension')fields=input('pk','PK-Guthaben heute',a.pk)+input('p3','Säule 3a heute',a.p3)+input('pkEmployee','PK-Beitrag Arbeitnehmer',st.build.pkEmployee,'CHF / Jahr')+input('pkEmployer','PK-Beitrag Arbeitgeber',st.build.pkEmployer,'CHF / Jahr')+input('p3Contrib','Beitrag Säule 3a',st.build.p3Contrib,'CHF / Jahr')+input('otherSave','Zusätzliche Sparleistung in Wertschriften',st.build.otherSave,'CHF / Jahr')+rate('pkInterest','Verzinsung PK',st.ass.pkInterest)+rate('p3Return','Rendite Säule 3a',st.ass.p3Return)+rate('secReturn','Rendite Wertschriften',st.ass.secReturn);
  return `<main class="check-edit">${pageHeading()}<form id="groupEditor"><fieldset ${planningLocked?'disabled':''}><div class="check-fields">${fields}</div><p id="checkFormError" role="alert"></p><button type="submit" class="check-button">Änderungen übernehmen</button></fieldset></form></main>`;
 }
 function submitGroup(form){
  if(planningLocked||!form.reportValidity())return;
  const data=new FormData(form),n=key=>Number(data.get(key)),next=structuredClone(st),post=st.mode==='post',a=post?next.post:next.assets,inc=post?next.post:next.income;
  // Keep exact annual amounts when an unchanged monthly input is saved.
  const annual=(key,old)=>n(key)===old/12?old:n(key)*12;
  if(state==='edit_personal'){
   next.currentAge=n('currentAge');next.retirementAge=post?Math.min(next.retirementAge,next.currentAge):n('retirementAge');next.planningAge=n('planningAge');next.canton=data.get('canton');
   if((!post&&next.retirementAge<next.currentAge)||next.planningAge<=(post?next.currentAge:next.retirementAge)){shell.querySelector('#checkFormError').textContent='Bitte prüfe die Reihenfolge von aktuellem Alter, Pensionierung und Zielalter.';return;}
  }
  if(state==='edit_income'){
   inc.ahv=annual('ahv',inc.ahv);inc.other=annual('other',inc.other);if(post)inc.pkRent=annual('pkRent',inc.pkRent);
   const key=post?'otherIncome':'rent';inc[key]=annual('additional',inc[key]);
   const oldNeed=next.need;next.need=annual('monthlyNeed',oldNeed);
   if(next.plan.need2===oldNeed)next.plan.need2=next.need;if(next.plan.need3===oldNeed)next.plan.need3=next.need;
  }
  if(state==='edit_assets'){
   for(const key of post?['free','re','mort']:['cash','sec','re','mort'])a[key]=n(key);
   if(next.plan.propertyValue>a.re||next.plan.propertyDebt>a.mort)next.plan.propertySplit=false;
  }
  if(state==='edit_pension'){
   for(const key of ['pk','p3'])a[key]=n(key);
   for(const key of ['pkEmployee','pkEmployer','p3Contrib','otherSave'])next.build[key]=n(key);
   next.build.pkContrib=next.build.pkEmployee+next.build.pkEmployer;
   for(const key of ['pkInterest','p3Return','secReturn'])next.ass[key]=n(key);
  }
  next.exampleValues=false;st=next;persist();delete drafts[state];delete drafts.basic;delete drafts.assumptions;go('edit_overview',{remember:false});
 }
 function distribute(target,keys,total){const old=keys.reduce((sum,k)=>sum+target[k],0);if(Math.abs(total-old)<1e-8)return;keys.forEach((k,i)=>target[k]=old?total*target[k]/old:i===0?total:0);}
 function submit(form){
  const data=new FormData(form),n=key=>Number(data.get(key)),next=structuredClone(st),post=next.mode==='post';
  next.currentAge=n('currentAge');if(!post)next.retirementAge=n('retirementAge');else next.retirementAge=Math.min(next.retirementAge,next.currentAge);
  next.planningAge=n('planningAge');
  if((!post&&next.retirementAge<next.currentAge)||next.planningAge<=(post?next.currentAge:next.retirementAge)){document.getElementById('checkFormError').textContent='Bitte prüfe die Reihenfolge von aktuellem Alter, Pensionierung und Zielalter.';return;}
  next.canton=data.get('canton');next.exampleValues=false;
  const oldNeed=next.need;next.need=n('monthlyNeed')*12;
  if(next.plan.need2===oldNeed)next.plan.need2=next.need;if(next.plan.need3===oldNeed)next.plan.need3=next.need;
  const a=post?next.post:next.assets;
  if(post){distribute(next.post,['ahv','pkRent','other'],n('monthlyIncome')*12);next.post.otherIncome=n('monthlyOther')*12;next.post.free=n('free');}
  else{distribute(next.income,['ahv','other'],n('monthlyIncome')*12);next.income.rent=n('monthlyOther')*12;distribute(next.assets,['sec','cash'],n('free'));next.assets.pk=n('pk');next.assets.p3=n('p3');distribute(next.build,['pkEmployee','pkEmployer'],n('pkContribution'));next.build.pkContrib=next.build.pkEmployee+next.build.pkEmployer;next.build.p3Contrib=n('p3Contribution');next.pkShare=n('pkShare');}
  a.re=data.get('hasProperty')==='yes'?n('property'):0;a.mort=data.get('hasProperty')==='yes'?n('mortgage'):0;
  if(next.plan.propertyValue>a.re||next.plan.propertyDebt>a.mort)next.plan.propertySplit=false;
  st=next;persist();delete drafts.basic;go('plan',{remember:false});
 }
 shell.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button||legacy.contains(button))return;
  if(button.dataset.mode){st.mode=button.dataset.mode;if(st.mode==='post'){st.currentAge=Math.max(st.currentAge,st.retirementAge);}ensurePlan();persist();go('basic');}
  else if(button.dataset.profile)selectProfile(button.dataset.profile);
  else if(button.dataset.go)go(button.dataset.go);
  else if(button.dataset.action==='edit')go('edit_overview');
  else if(button.dataset.action==='restart')restartPlanning();
  else if(button.dataset.action==='save'){savePersonalStand();render();}
  else if(button.dataset.action==='load'){loadPersonalStand();}
 });
 shell.addEventListener('submit',event=>{event.preventDefault();if(event.target.id==='groupEditor')submitGroup(event.target);else submit(event.target);});
 shell.addEventListener('input',event=>{shell.querySelector('.check-example')?.remove();if(event.target.name==='pkShare')document.getElementById('checkPkLabel').textContent=`${event.target.value} % Kapital · ${100-event.target.value} % Rente`;});
 shell.addEventListener('change',event=>{if(event.target.name==='hasProperty')shell.querySelector('.property-fields').hidden=event.target.value==='no';});
 // Bridge retained depth components to the pure model. Their inputs remain compatible.
 const legacyShow=show,legacyTab=tab;
 projected=()=>core.calculateRetirementStart(model());
 split=(share=st.pkShare)=>core.calculatePension(model(),share);
 capitalComponents=(share=st.pkShare)=>core.calculateAvailableCapital(model(),share);
 free0=(share=st.pkShare)=>capitalComponents(share).totalInvestableCapital;
 bound0=()=>capitalComponents().boundCapital;
 planningInput=(share=st.pkShare)=>core.simulationInput(model(),share);
 planProjection=(scenario='base')=>core.simulateCapitalDevelopment(model(),scenario);
 risk=selectProfile;
 // Reuse exactly the same profile bar in the retained PK and asset editors.
 legacy.querySelectorAll('.risks').forEach(group=>{
  if(group.previousElementSibling?.classList.contains('section'))group.previousElementSibling.remove();
  if(group.nextElementSibling?.classList.contains('risk-explanation'))group.nextElementSibling.remove();
  const mount=document.createElement('div');mount.className='legacy-profile-selector';group.replaceWith(mount);
 });
 const profileUi=ui;ui=function(){profileUi();legacy.querySelectorAll('.legacy-profile-selector').forEach(mount=>mount.innerHTML=profileSelection(false));};
 legacy.addEventListener('click',event=>{const button=event.target.closest('button[data-profile]');if(button)selectProfile(button.dataset.profile);});
 const oldMessages=showStorageMessage;showStorageMessage=function(text,isError=false){oldMessages(text,isError);message=text;error=isError;const node=shell.querySelector('.check-message');if(node){node.textContent=text;node.classList.toggle('error',isError);}};
 const oldLoad=loadPersonalStand;loadPersonalStand=function(){if(oldLoad()===true){Object.keys(drafts).forEach(key=>delete drafts[key]);go('plan',{remember:false});}};
 // Legacy entry points request routes; go() alone selects screens and tabs.
 show=function(screen){go(({start:'situation',result:'plan',advice:'advice',...editorRoutes})[screen]);};
 tab=function(name){go(({overview:'income',pots:'capital',dev:'scenarios',ass:'assumptions',edit:'edit_overview'})[name]);};
 back=function(){const parent=routes[state].parent;if(parent)go(parent);};
 forward=function(){if(state==='basic')shell.querySelector('#checkForm')?.requestSubmit();};
 jump=function(screen){if(!planningLocked)go(editorRoutes[screen]);};
 startAdvice=function(){go('advice');};
 const oldRestart=restartPlanning;restartPlanning=function(){oldRestart();if(!st.mode){Object.keys(drafts).forEach(key=>delete drafts[key]);message='';error=false;go('situation',{remember:false});}};
 const oldSavePlan=savePlanning,oldSaveAss=saveAss;
 savePlanning=function(){
  if(planningLocked)return;
  const assInputs=[assInfl,...(st.mode==='pre'?[assCap,assUws]:[])];
  if(assInputs.some(el=>!el.value.trim()||!Number.isFinite(Number(el.value.replace(',','.'))))){document.getElementById('planError').textContent='Bitte gültige Zahlen für die Modellannahmen eingeben.';return;}
  if(oldSavePlan()!==true)return;
  oldSaveAss();delete drafts.assumptions;delete drafts.edit_income;delete drafts.edit_personal;delete drafts.basic;go('edit_overview',{remember:false});
 };
 saveAss=savePlanning;
 legacy.querySelector('[onclick="saveAss()"]').hidden=true;
 legacy.querySelectorAll('.screen>.actions,.restart-link').forEach(node=>node.hidden=true);
 document.querySelectorAll('.tabs button').forEach(b=>b.tabIndex=-1);
 message=globalThis.storageWarning||'';error=!!globalThis.storageWarning;ui();go('situation');
 return {go,get state(){return state},getPlan:model,getResult:()=>core.evaluatePlan(model())};
})();
