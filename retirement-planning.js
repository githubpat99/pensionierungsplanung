/* Integrates the annual engine with the existing guided application. */
const planningEscape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function ensurePlan(){
  if(st.plan)return;
  st.plan={version:1,phase2:73,phase3:83,need2:st.need,need3:st.need,
    returns:[0,1,4],timing:{},extras:[],rental:false,repair:30000};
}
function baseSources(){
  const a=startAge();
  const rows=st.mode==='post'?[['ahv','AHV',st.post.ahv],['pk','PK-Rente',st.post.pkRent],['other','Weitere Renten',st.post.other],['additional','Weitere Einnahmen',st.post.otherIncome]]:
    [['ahv','AHV',st.income.ahv],['pk','PK-Rente',split().rent],['other','Weitere Renten',st.income.other],['additional','Weitere Einnahmen',st.income.rent]];
  return rows.map(([id,name,amount])=>({id,name,amount,quoteAge:a,from:a,until:111,indexed:false,...st.plan.timing[id],rental:id==='additional'&&st.plan.rental}));
}
function planningInput(){
  ensurePlan();
  const factor=Math.pow(1+P(st.ass.inflation),Math.max(0,startAge()-st.currentAge));
  const sources=baseSources().concat(st.plan.extras);
  // Wizard income amounts are quoted for the first retirement year.
  return {today:st.currentAge,start:startAge(),end:st.planningAge,capital:free0()/factor,bound:bound0(),inflation:st.ass.inflation,
    phases:[{from:0,need:st.need},{from:st.plan.phase2,need:st.plan.need2},{from:st.plan.phase3,need:st.plan.need3}],
    sources,returns:st.plan.returns,repair:st.plan.repair};
}
function planProjection(scenario='base'){return RetirementEngine.simulate(planningInput(),scenario)}
function renderPlanningForm(){
  ensurePlan();
  const target=document.getElementById('planningForm');if(!target)return;
  const input=(id,label,value,extra='')=>`<label>${label}<input id="${id}" type="number" step="any" value="${value}" ${extra}></label>`;
  const phaseRow=(ageId,ageValue,needId,needValue,fixed=false)=>`<div class="plan-phase-row"><span>Ab</span>${fixed?`<strong>${ageValue}</strong>`:`<input id="${ageId}" aria-label="Beginn der Phase" type="number" min="18" max="110" step="1" value="${ageValue}">`}<span>Bedarf</span><label class="plan-phase-amount"><span>CHF</span><input id="${needId}" aria-label="Bedarf pro Jahr" type="number" min="0" step="any" value="${needValue}"></label><small>/ Jahr</small></div>`;
  const sourceRows=baseSources().map(s=>`<div class="plan-source"><strong>${s.name} · ${CHFJ(s.amount)}</strong><div class="plan-grid">${input('from-'+s.id,'Ab Alter',s.from,'min="18" max="110" step="1"')}${input('until-'+s.id,'Bis Alter (exklusiv)',s.until,'min="19" max="111" step="1"')}<label class="plan-check"><input type="checkbox" id="indexed-${s.id}" ${s.indexed?'checked':''}>Mit Inflation anpassen</label></div></div>`).join('');
  target.innerHTML=`<fieldset ${planningLocked?'disabled':''}><div class="kicker">Lebensplanung & Entnahme</div><h2>Dein Bedarf in drei Phasen</h2><p class="note">Beträge in heutiger Kaufkraft, inklusive Steuern und Wohnkosten.</p>
    <div class="plan-phases">${phaseRow('',startAge(),'plan-need',st.need,true)}${phaseRow('phase2',st.plan.phase2,'need2',st.plan.need2)}${phaseRow('phase3',st.plan.phase3,'need3',st.plan.need3)}</div>
    <details><summary>Laufzeiten deiner Einnahmen</summary><p class="note">Beträge unter «Angaben» ändern. «Bis 73» bedeutet: letzte Zahlung im Jahr 72–73. Nominal feste Zahlungen verlieren in dieser Ansicht Kaufkraft. Die PK-Rente vor Pensionierung ist ein Betrag zum Pensionierungszeitpunkt.</p>${sourceRows}<label class="plan-check"><input id="rental" type="checkbox" ${st.plan.rental?'checked':''}>Die Position «Weitere Einnahmen» ist Netto-Mietertrag</label><p class="note">Miete nach Objektkosten, Hypothekarzinsen und Unterhaltsreserve erfassen. Persönliche Steuern im Budget berücksichtigen.</p></details>
    <details><summary>Zusätzliche zeitlich begrenzte Einnahmen</summary><p class="note">Nur Beträge ergänzen, die noch nicht in den bisherigen Einnahmen enthalten sind, etwa eine Kinder-Zusatzleistung. Leere Zeilen bleiben unberücksichtigt.</p>${[0,1,2].map(i=>{const x=st.plan.extras[i]||{name:'',amount:0,from:startAge(),until:73,indexed:false};return `<div class="plan-source"><label>Bezeichnung<input id="extra-name-${i}" maxlength="60" value="${planningEscape(x.name)}"></label><div class="plan-grid">${input('extra-amount-'+i,'CHF / Jahr',x.amount,'min="0"')}${input('extra-from-'+i,'Ab Alter',x.from,'min="18" max="110" step="1"')}${input('extra-until-'+i,'Bis Alter (exklusiv)',x.until,'min="19" max="111" step="1"')}<label class="plan-check"><input type="checkbox" id="extra-indexed-${i}" ${x.indexed?'checked':''}>Mit Inflation anpassen</label></div></div>`}).join('')}</details>
    <details><summary>Immobilien aufteilen</summary><p class="note">Die Gesamtwerte unter «Angaben» bleiben massgebend. Trage hier ein, welcher Anteil zum Renditeobjekt gehört; der Rest wird dem Eigenheim zugeordnet. Ohne Bestätigung bleibt der Bestand unaufgeteilt.</p><label class="plan-check"><input type="checkbox" id="property-split" ${st.plan.propertySplit?'checked':''}>Eigenheim und Renditeobjekt getrennt zeigen</label><div class="plan-grid">${input('property-value','Davon Wert Renditeobjekt CHF',st.plan.propertyValue||0,'min="0"')}${input('property-debt','Davon Hypothek Renditeobjekt CHF',st.plan.propertyDebt||0,'min="0"')}</div></details>
    <details><summary>Drei Töpfe und Annahmen</summary><p class="note">Jährliche Zielauffüllung: ein Jahr Entnahmebedarf im Geldmarkt, die folgenden zwei Jahre in Anleihen, Rest in Aktien. Auch nach Kursverlusten wird aufgefüllt. Die tatsächliche Aktienquote siehst du in der Übersicht. Dies ist keine persönliche Anlageempfehlung.</p><div class="plan-grid">${input('return0','Geldmarkt real % / Jahr',st.plan.returns[0],'min="-99" max="50"')}${input('return1','Anleihen real % / Jahr',st.plan.returns[1],'min="-99" max="50"')}${input('return2','Aktien real % / Jahr',st.plan.returns[2],'min="-99" max="50"')}${input('repair','Unterhaltsausgabe im Stresstest CHF',st.plan.repair,'min="0"')}</div><p class="note">Reale Gesamtrenditen nach Inflation und Anlagekosten; keine zusätzliche Zählung von Zinsen oder Dividenden. Ausgangswerte 0 / 1 / 4 % sind Modellannahmen. Reserven auf CHF ausrichten; Anleihen können an Wert verlieren. Entnahmen erfolgen im Modell am Jahresanfang, danach wird das verbleibende Kapital verzinst.</p></details>
    <p id="planError" role="alert" class="bad"></p><button class="primary" type="button" onclick="savePlanning()">Plan übernehmen →</button></fieldset>`;
}
function savePlanning(){
  if(planningLocked)return;
  const form=document.getElementById('planningForm');
  for(const input of form.querySelectorAll('input[type=number]'))if(!input.checkValidity()||input.value===''){input.reportValidity();return;}
  const n=id=>Number(document.getElementById(id).value), checked=id=>document.getElementById(id).checked;
  const next=structuredClone(st.plan);next.phase2=n('phase2');next.phase3=n('phase3');next.need2=n('need2');next.need3=n('need3');
  const fail=message=>document.getElementById('planError').textContent=message;
  if(next.phase3<=next.phase2)return fail('Die dritte Phase muss nach der zweiten beginnen.');
  for(const s of baseSources()){
    const from=n('from-'+s.id),until=n('until-'+s.id);
    if(until<=from)return fail('Das Ende einer Einnahme muss nach ihrem Beginn liegen.');
    next.timing[s.id]={from,until,indexed:checked('indexed-'+s.id)};
  }
  next.extras=[];
  for(let i=0;i<3;i++)if(n('extra-amount-'+i)>0){
    const name=document.getElementById('extra-name-'+i).value.trim(),from=n('extra-from-'+i),until=n('extra-until-'+i);
    if(!name||until<=from)return fail('Zusätzliche Einnahmen brauchen eine Bezeichnung und eine gültige Laufzeit.');
    next.extras.push({name,amount:n('extra-amount-'+i),from,until,indexed:checked('extra-indexed-'+i)});
  }
  next.propertySplit=checked('property-split');next.propertyValue=n('property-value');next.propertyDebt=n('property-debt');
  const assets=st.mode==='post'?st.post:st.assets;
  if(next.propertySplit&&(next.propertyValue>assets.re||next.propertyDebt>assets.mort))return fail('Der Anteil des Renditeobjekts darf den erfassten Gesamtwert bzw. die Gesamthypothek nicht übersteigen.');
  next.rental=checked('rental');next.returns=[0,1,2].map(i=>n('return'+i));next.repair=n('repair');
  st.plan=next;st.need=n('plan-need');persist();renderResult();tab('overview',document.querySelector('.tabs button'));window.scrollTo({top:0,behavior:'smooth'});
}
function renderPlanOverview(refreshFinancing=true){
  const rows=planProjection(),first=rows[0],last=rows.at(-1),p=planningInput();
  const quote=first.free?first.buckets[2]/first.free*100:0;
  rCapTotal.textContent=CHF(first.total);rBound.textContent=CHF(first.bound);rFree.textContent=CHF(first.free);
  rIncomeTotal.textContent=CHFJ(first.rent);rRent.textContent=CHFJ(first.rent);rYield.closest('.row').classList.add('hidden');rOther.closest('.row').classList.add('hidden');
  rr4.textContent=CHFJ(first.need);rrLabel.textContent=first.rent>=first.need?'Überschuss':'Benötigt aus dem Vermögen';rr5.textContent=CHFJ(Math.abs(first.need-first.rent));
  const incomeRows=document.querySelectorAll('.side.rent .row');
  if(incomeRows[1])incomeRows[1].querySelector('span').textContent='Laufende Einnahmen';
  if(refreshFinancing)renderFinancingView();
  const scenarios=[['historicalPessimistic','10 Jahre · pessimistisch'],['historicalOptimistic','10 Jahre · optimistisch'],['base','Basisannahmen'],['weak','Fünf schwache Jahre'],['crash','Einmaliger Crash −30 %'],['property','Immobilienstress'],['combined','Crash + Immobilie'],['longlife','Fünf Jahre länger']];
  const scenarioProjection=id=>id.startsWith('historical')?RetirementEngine.simulate({...p,equityReturns:HistoricalReturns.paths[id==='historicalPessimistic'?'pessimistic':'optimistic']}):planProjection(id);
  const scenarioRows=list=>list.map(([id,label])=>{const d=scenarioProjection(id),gap=d.find(r=>r.gap>0),end=d.at(-1);return `<tr><td>${label}</td><td data-label="Erste Lücke im Jahr">${gap?`${gap.age}–${gap.age+1}<br>${CHF(gap.gap)}`:'Keine'}</td><td data-label="Freies Gesamtkapital am Ziel">${CHF(end.free)}<br><small>Alter ${end.age}</small></td></tr>`}).join('');
  if(refreshFinancing&&st.plan.propertySplit){
    const assets=st.mode==='post'?st.post:st.assets;
    document.getElementById('planOverview').insertAdjacentHTML('beforeend',`<p class="note">Renditeobjekt netto: ${CHF(st.plan.propertyValue-st.plan.propertyDebt)} · Eigenheim netto: ${CHF(assets.re-assets.mort-st.plan.propertyValue+st.plan.propertyDebt)}.</p>`);
  }
  document.getElementById('planRisks').innerHTML=`<details class="risk-disclosure"><summary><span class="risk-summary-copy"><small>Belastungsprobe</small><strong>Was passiert, wenn es anders läuft?</strong></span><span class="risk-chevron" aria-hidden="true">⌄</span></summary><div class="risk-body"><p class="note risk-link-note"><strong>Bezug zur Grafik:</strong> Die Grafik zeigt nur Topf 3 während der zehn historischen Jahre. Hier werden dieselben Renditereihenfolgen mit Topf 1 und 2, Einnahmen und Bedarf bis zum Zielalter weitergerechnet. Das ausgewiesene Kapital umfasst alle drei frei verfügbaren Töpfe.</p><div class="plan-table plan-scenarios"><table><thead><tr><th>Szenario</th><th>Erste Lücke im Jahr</th><th>Freies Gesamtkapital am Ziel</th></tr></thead><tbody>${scenarioRows(scenarios.slice(0,2))}</tbody></table></div><div class="risk-assumptions"><strong>Annahmen</strong><p>Reale MSCI-World-Renditen in CHF von 2016–2025: pessimistisch mit schwachen, optimistisch mit starken Jahren zuerst. Danach gelten wieder die Basisannahmen. Beträge in heutiger Kaufkraft; historische Erfahrungen sind keine Prognosen.</p></div><details><summary>Weitere Szenarien</summary><div class="plan-table plan-scenarios"><table><thead><tr><th>Szenario</th><th>Erste Lücke im Jahr</th><th>Freies Gesamtkapital am Ziel</th></tr></thead><tbody>${scenarioRows(scenarios.slice(2))}</tbody></table></div><p class="note">Einmaliger Crash: Aktien im ersten Jahr −30 %, danach Basisrendite. Schwäche: Aktien −15 %, dann vier Jahre 0 %; Anleihen im ersten Jahr −8 %, danach vier Jahre 0 %. Immobilie: markierte Miete entfällt ein Jahr, zusätzlich ${CHF(p.repair)} Unterhalt. Kombination: Crash und Immobilie gleichzeitig. Längeres Leben: fünf zusätzliche Entnahmejahre.</p></details><details><summary>Jahresrechnung prüfen</summary><p class="plan-scroll-hint">Tabelle seitlich scrollen, um alle Jahreswerte zu sehen.</p><div class="plan-table" tabindex="0" role="region" aria-label="Jahresrechnung, seitlich scrollbar"><table><thead><tr><th>Jahr</th><th>Bedarf</th><th>Einnahmen</th><th>Entnahme</th><th>Rendite</th><th>Endkapital</th><th>Lücke</th></tr></thead><tbody>${rows.filter(r=>!r.terminal).map(r=>`<tr><td>${r.age}–${r.age+1}</td>${[r.need,r.rent,r.withdrawal,r.ret,r.end,r.gap].map(v=>`<td>${CHF(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details></div></details>`;
}

const planningPreviousSave=localStorage.getItem('retirementMvp5');
const planningOriginalPersist=persist;
persist=function(){
  if(planningPreviousSave&&!localStorage.getItem('retirementMvp5-before-three-pots'))localStorage.setItem('retirementMvp5-before-three-pots',planningPreviousSave);
  planningOriginalPersist();
};
ensurePlan();
document.getElementById('tab-overview').insertAdjacentHTML('afterend',`<div id="tab-pots" class="hidden"><div class="card" id="planOverview"></div></div>`);
document.getElementById('tab-ass').insertAdjacentHTML('afterbegin','<div class="card" id="planningForm"></div>');
document.getElementById('tab-dev').insertAdjacentHTML('beforeend','<div class="card" id="planRisks"></div>');
const originalRenderResult=renderResult;
renderResult=function(refreshFinancing=true){originalRenderResult();renderPlanningForm();renderPlanOverview(refreshFinancing)};
proj=function(){return planProjection()};
bound0=function(){const x=st.mode==='post'?st.post:st.assets;return x.re-x.mort};
adviceContext=function(){const d=proj(),first=d[0];return {d,gap:d.find(x=>x.gap>0),free:first.free,bound:first.bound,rent:first.rent,yield0:first.ret,withdrawal:first.withdrawal}};
function planningPhaseSubmissionLines(){
  const p=planningInput(),rows=planProjection();
  const ages=[p.start,...p.phases.slice(1).map(phase=>Math.max(p.start,phase.from))]
    .filter((age,index,all)=>age<p.end&&all.indexOf(age)===index);
  return ['Planungsphasen',...ages.map((age,index)=>{
    const row=rows.find(item=>!item.terminal&&item.age===age);
    return row?`Phase ${index+1} ab ${age}: Bedarf ${CHFJ(row.need)} · Einnahmen ${CHFJ(row.rent)}`:'';
  }).filter(Boolean)];
}
const detailedSubmissionLinesWithoutPhases=detailedSubmissionLines;
detailedSubmissionLines=function(c){
  return [...planningPhaseSubmissionLines(),'',...detailedSubmissionLinesWithoutPhases(c)];
};
renderChart=function(){
  const c=chart,visibleWidth=Math.round(c.parentElement.clientWidth),compact=window.innerWidth<=600;
  c.width=visibleWidth||520;c.height=compact?250:300;
  const ctx=c.getContext('2d'),input=planningInput(),comparisonEnd=Math.min(input.end,input.start+10);
  const historical=path=>RetirementEngine.simulate({...input,end:comparisonEnd,equityReturns:HistoricalReturns.paths[path]});
  const pessimistic=historical('pessimistic'),optimistic=historical('optimistic');
  const stock=row=>row.buckets?.[2]||0,pad={l:62,r:16,t:25,b:35},W=c.width-pad.l-pad.r,H=c.height-pad.t-pad.b;
  const rawMax=Math.max(1,...pessimistic.map(stock),...optimistic.map(stock)),tickUnit=rawMax>900000?100000:50000,max=Math.ceil(rawMax/(tickUnit*3))*tickUnit*3;
  const X=i=>pad.l+i/Math.max(1,optimistic.length-1)*W,Y=value=>pad.t+H-value/max*H;
  const moneyAxis=value=>value>=1000000?`${(value/1000000).toLocaleString('de-CH',{maximumFractionDigits:1})} Mio.`:Math.round(value/1000)+"'000";
  ctx.clearRect(0,0,c.width,c.height);ctx.font='11px system-ui';ctx.lineWidth=1;
  for(let j=0;j<4;j++){
    const value=max*(1-j/3),y=Y(value);ctx.strokeStyle='#dce3ec';ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(pad.l+W,y);ctx.stroke();
    ctx.fillStyle='#64748b';ctx.textAlign='right';ctx.textBaseline='middle';ctx.fillText(moneyAxis(value),pad.l-8,y);
  }
  ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText('CHF',pad.l,4);ctx.textAlign='right';ctx.fillText('Alter',pad.l+W,c.height-13);
  [0,Math.round((optimistic.length-1)/2),optimistic.length-1].filter((v,i,a)=>a.indexOf(v)===i).forEach(i=>{ctx.textAlign='center';ctx.fillText(optimistic[i].age,X(i),pad.t+H+8)});
  ctx.beginPath();ctx.moveTo(X(0),Y(0));optimistic.forEach((row,i)=>ctx.lineTo(X(i),Y(stock(row))));ctx.lineTo(X(optimistic.length-1),Y(0));ctx.closePath();ctx.fillStyle='rgba(155,196,255,.35)';ctx.fill();
  const line=(rows,color,dash=[])=>{ctx.save();ctx.beginPath();rows.forEach((row,i)=>i?ctx.lineTo(X(i),Y(stock(row))):ctx.moveTo(X(i),Y(stock(row))));ctx.strokeStyle=color;ctx.lineWidth=3;ctx.setLineDash(dash);ctx.stroke();ctx.restore()};
  line(optimistic,'#2563eb');line(pessimistic,'#e5484d',[6,4]);
  const indexes=[0,Math.min(3,optimistic.length-1),Math.min(6,optimistic.length-1),optimistic.length-1].filter((v,i,a)=>a.indexOf(v)===i);
  const point=(rows,index,color,labelPosition)=>{const value=stock(rows[index]),x=X(index),y=Y(value);ctx.beginPath();ctx.arc(x,y,6,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle=color;ctx.font='bold 12px system-ui';ctx.textAlign=index===0?'left':index===rows.length-1?'right':'center';ctx.textBaseline=labelPosition==='above'?'bottom':'top';ctx.fillText(Math.round(value).toLocaleString('de-CH'),x+(index===0?7:index===rows.length-1?-7:0),y+(labelPosition==='above'?-9:9))};
  point(optimistic,0,'#162033','above');
  indexes.filter(index=>index>0).forEach(index=>point(optimistic,index,'#2563eb','above'));
  indexes.filter(index=>index>0&&Math.abs(stock(pessimistic[index])-stock(optimistic[index]))>1).forEach(index=>point(pessimistic,index,'#e5484d',stock(pessimistic[index])===0?'above':'below'));
  const gapPoint=document.getElementById('gapPoint'),years=comparisonEnd-input.start,pessEnd=stock(pessimistic.at(-1)),optEnd=stock(optimistic.at(-1));
  gapPoint.className='gap-point history';
  const depleted=pessEnd===0&&optEnd>0?' In der pessimistischen Variante ist Topf 3 vorher aufgebraucht und kann an den späteren starken Jahren nicht mehr teilnehmen.':'';
  gapPoint.innerHTML=`<span aria-hidden="true">↕</span><div><strong>Nach ${years} Jahren: pessimistisch ${CHF(pessEnd)}, optimistisch ${CHF(optEnd)}.</strong>Die Differenz entsteht allein durch die Reihenfolge der Renditen.${depleted} Geldmarkt, Anleihen und gebundenes Kapital sind im Chart nicht enthalten.</div>`;
  const ids=[['a0','v0','s0'],['a10','v10','s10'],['a20','v20','s20'],['ae','ve','se']];
  ids.forEach((group,j)=>document.getElementById(group[0]).closest('.hcard').classList.toggle('hidden',j>=indexes.length));
  indexes.forEach((index,j)=>{const yearsPassed=optimistic[index].age-input.start,card=document.getElementById(ids[j][0]).closest('.hcard'),value=document.getElementById(ids[j][1]),comparison=document.getElementById(ids[j][2]);card.classList.toggle('start',j===0);document.getElementById(ids[j][0]).textContent=yearsPassed?`Nach ${yearsPassed} Jahren · Alter ${optimistic[index].age}`:`Ausgangslage · Alter ${optimistic[index].age}`;if(j===0){value.textContent=CHF(stock(optimistic[index]));value.className='';comparison.textContent='';comparison.className='hidden'}else{value.textContent='Opt. · '+CHF(stock(optimistic[index]));value.className='optimistic';comparison.textContent='Pess. · '+CHF(stock(pessimistic[index]));comparison.className='pessimistic'}});
  document.getElementById('devPotSummary').innerHTML=[
    ['bond','Topf 2','Anleihen',optimistic[0].buckets[1]],['cash','Topf 1','Geldmarkt',optimistic[0].buckets[0]],['stock','Topf 3','Aktien',optimistic[0].buckets[2]]
  ].map(([kind,number,name,value])=>`<div class="dev-pot ${kind==='stock'?'active':''}"><span class="dev-pot-icon ${kind}" aria-hidden="true">${kind==='stock'?'↗':kind==='cash'?'●':'▥'}</span><div><small>${number}</small><strong>${name}</strong><b>${CHF(value)}</b></div></div>`).join('');
};
// Retain the original assumptions for the accumulation / PK comparison only.
document.querySelector('#assCap').closest('.data-row').querySelector('.hint').textContent='Nur für den Vergleich von PK-Kapitalbezug und PK-Rente; die Entnahmeplanung verwendet die drei Topfrenditen.';
document.querySelector('[data-screen="need"] .note').textContent='Bedarf in heutiger Kaufkraft. Drei Lebensphasen kannst du anschliessend unter «Annahmen» planen.';
const originalTab=tab;
tab=function(n,b){if(n==='ass')renderPlanningForm();if(n==='pots')renderFinancingView();originalTab(n,b);if(n==='dev')renderChart();document.querySelector('.app').classList.toggle('finance-wide',n==='pots')};
if(st.mode)renderResult();
