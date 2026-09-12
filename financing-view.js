/* Annual needs are saved per phase; market, capital and horizon remain what-if controls. */
let financingPreview = null;
function renderFinancingView(reset = true) {
  if (reset || !financingPreview) financingPreview = {phase: 0, scenario: 'base', input: structuredClone(planningInput())};
  const wasOpen=document.getElementById('financeDialog')?.open;
  const p = financingPreview.input;
  document.getElementById('planOverview').innerHTML = `
    <header class="finance-heading"><div class="kicker">Deine 3 Finanzierungstöpfe</div><h2>So fliesst dein Geld durch die drei Töpfe</h2><p>Renten und weitere Einnahmen decken einen Teil deines Bedarfs. Den Rest finanzierst du aus deinem verfügbaren Vermögen.</p></header>
    <div class="finance-layout">
      <section class="finance-panel finance-income" id="financeIncome" aria-label="Laufende Einnahmen"></section>
      <section class="finance-panel finance-need" id="financeNeed" aria-label="Jahresbedarf"></section>
      <section class="finance-panel finance-model" id="financeModel" aria-label="Das Drei-Töpfe-Modell"></section>
      <button class="primary finance-mobile finance-open" onclick="document.getElementById('financeDialog').showModal()">Simulation anpassen</button><dialog id="financeDialog" class="finance-dialog"><button class="secondary finance-mobile finance-close" onclick="document.getElementById('financeDialog').close()">Fertig · Zur Finanzierung</button><section class="finance-panel finance-controls"><div class="finance-sim-title"><h3>Simulation</h3><details class="finance-info"><summary aria-label="Information zur Simulation">ⓘ</summary><p>Alle Beträge sind auf die Kaufkraft zu Beginn deiner ${st.mode==='post'?'Planung':'Pensionierung'} bezogen. Der Jahresbedarf wird je Lebensphase gespeichert. Markt, Dauer und Startkapital sind Vorschauwerte. Das Startkapital berücksichtigt die geschätzte PK-Kapitalbezugssteuer, sofern ein Kanton gewählt wurde. Die Topfbeträge zeigen den Jahresanfang der gewählten Phase, der Endwert das verfügbare Restkapital nach allen geplanten Entnahmen. Gebundenes Immobilienkapital ist in keinem dieser Beträge enthalten.</p></details></div><div class="finance-sim-fields">
        <div class="finance-sim-field"><label for="financePhase">Phase · Alter</label><select id="financePhase" onchange="changeFinancing('phase',this.value)"><option value="0">1 · ab ${p.start}</option><option value="1">2 · ab ${Math.max(p.start,p.phases[1].from)}</option><option value="2">3 · ab ${Math.max(p.start,p.phases[2].from)}</option></select></div>
        <div class="finance-sim-field"><label for="financeNeedInput">Jahresbedarf <output id="financeNeedOutput"></output></label><input id="financeNeedInput" ${planningLocked?'disabled':''} type="range" min="0" max="${Math.max(250000,...p.phases.map(x=>x.need))}" step="1000" value="${p.phases[0].need}" oninput="changeFinancing('need',this.value)"></div>
        <div class="finance-sim-field"><label for="financeMarket">Markt</label><select id="financeMarket" onchange="changeFinancing('scenario',this.value)"><option value="base">Basisannahmen</option><option value="weak">Fünf schwache Jahre</option><option value="crash">Früher Börsencrash</option></select></div>
        <div class="finance-sim-field"><label for="financeHorizon">Dauer <output id="financeHorizonOutput"></output></label><input id="financeHorizon" type="range" min="1" max="${110-p.start}" step="1" value="${p.end-p.start}" oninput="changeFinancing('horizon',this.value)"></div>
        <div class="finance-sim-field"><label for="financeCapital">Verfügbares Startkapital <output id="financeCapitalOutput"></output></label><input id="financeCapital" type="range" min="0" max="${Math.max(5000000,p.capital)}" step="10000" value="${p.capital}" oninput="changeFinancing('capital',this.value)"></div>
        </div><div class="finance-preview-result" id="financeProjection" role="status" aria-live="polite"></div>
        <div class="finance-sim-actions"><button class="secondary" onclick="renderFinancingView()">Vorschau zurücksetzen</button><button class="primary" onclick="document.getElementById('financeDialog').close();tab('ass',document.querySelector('.tabs button[data-tab=&quot;ass&quot;]'));window.scrollTo({top:0,behavior:'smooth'})">Annahmen →</button></div><small class="finance-save-note">Jahresbedarf wird gespeichert · übrige Werte: Vorschau</small>
      </section></dialog>
    </div><aside class="finance-bound-secondary" id="financeBound" aria-label="Gebundenes Immobilienkapital"></aside>`;
  updateFinancingValues();
  if(wasOpen)document.getElementById('financeDialog').showModal();
}
function changeFinancing(key, value) {
  const f=financingPreview, p=f.input;
  if(key==='phase') { f.phase=Number(value); document.getElementById('financeNeedInput').value=p.phases[f.phase].need; }
  if(key==='scenario') f.scenario=value;
  if(key==='need') {
    const need=Number(value);
    if(planningLocked || !Number.isFinite(need) || need<0)return;
    p.phases[f.phase].need=need;
    if(f.phase===0)st.need=need;
    else st.plan[f.phase===1?'need2':'need3']=need;
    persist();
    renderResult(false);
  }
  if(key==='horizon') p.end=p.start+Number(value);
  if(key==='capital') p.capital=Number(value);
  updateFinancingValues();
}
function updateFinancingValues() {
  document.getElementById('financeHelp')?.remove();
  const f=financingPreview,p=f.input,rows=RetirementEngine.simulate(p,f.scenario);
  const selectedAge=Math.max(p.start,p.phases[f.phase].from),r=rows.find(x=>x.age===selectedAge&&!x.terminal),last=rows.at(-1),gap=rows.find(x=>x.gap>0);
  const phaseUnavailable=!r,shown=r||rows[0],age=shown.age;
  document.getElementById('financeNeedOutput').textContent=CHF(p.phases[f.phase].need);
  document.getElementById('financeHorizonOutput').textContent=`${p.end-p.start} ${p.end-p.start===1?'Jahr':'Jahre'}`;
  document.getElementById('financeCapitalOutput').textContent=CHF(p.capital);
  document.getElementById('financeProjection').innerHTML=`<strong>Verfügbares Restkapital mit ${last.age}: ${CHF(last.free)}</strong><span>${gap?`Erste ungedeckte Lücke: Alter ${gap.age}–${gap.age+1}.`:TaxModel.canton(p.canton)?'Bis zum Zielalter gedeckt.':'Vorläufig · Steuern noch nicht berücksichtigt.'}</span>${phaseUnavailable?'<span>Die gewählte Phase liegt ausserhalb des Zeithorizonts. Darstellung: Planungsstart.</span>':''}`;
  document.getElementById('financeIncome').innerHTML=`<div class="finance-income-compact"><div><span>${shown.estimatedIncomeTax===null?'Einnahmen · vorläufig ohne Steuerabzug':'Netto verfügbar'}</span><strong>${CHF(shown.rent)} <small>pro Jahr</small></strong><small>Ab Alter ${age}</small></div><button type="button" class="finance-help-button" data-income-details aria-label="Einkommen und Steuern im Detail ansehen">ⓘ</button></div>`;
  const coverage=shown.need>0?Math.min(100,Math.max(0,shown.rent/shown.need*100)):100;
  document.getElementById('financeNeed').innerHTML=`<h3>▱ Jahresbedarf</h3><div class="finance-amount">${CHF(shown.need)}</div><small>pro Jahr · ab Alter ${age}</small><div class="finance-coverage" role="meter" aria-label="Bedarf durch Einnahmen gedeckt" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(coverage)}"><i style="width:${coverage}%"></i></div><small>${Math.round(coverage)} % durch laufende Einnahmen gedeckt</small><div class="finance-gap"><strong>${shown.withdrawal?'Restbedarf':'Kein Restbedarf'}</strong><b>${CHF(shown.withdrawal)}<small>pro Jahr</small></b></div><p class="finance-down">${shown.withdrawal?'Finanzierung aus den drei Töpfen ↓':'Die Einnahmen decken den Bedarf.'}</p>`;
  const info=(label,text)=>`<button type="button" class="finance-help-button" aria-label="${planningEscape(label)}" aria-expanded="false" aria-controls="financeHelp" data-finance-help="${planningEscape(text)}">ⓘ</button>`;
  document.getElementById('financeBound').innerHTML=`<span>Gebundenes Immobilienkapital: <strong>${CHF(shown.bound)}</strong></span>${info('Gebundenes Immobilienkapital erklären','Immobilienwert abzüglich Hypotheken. Dieses Kapital gehört zum Vermögen, ist aber nicht für laufende Entnahmen eingeplant. Verkauf, Teilverkauf oder zusätzliche Belehnung sind nicht modelliert. Erfasste Netto-Mieterträge zählen separat zu den laufenden Einnahmen.')}`;
  document.getElementById('financeNeed').insertAdjacentHTML('afterbegin',`<div class="finance-mobile finance-budget"><div><small>Jahresbedarf</small><strong>${CHF(shown.need)}</strong></div><div><small>Aus Vermögen / Jahr</small><strong>${CHF(shown.withdrawal)}</strong></div>${info('Information zum Jahresbedarf','Bedarf ab Alter '+age+'. '+Math.round(coverage)+' % werden durch laufende Einnahmen gedeckt. Den Rest finanzierst du aus dem verfügbaren Vermögen.')}</div>`);
  const pot=(index,color,title,description)=>`<div class="finance-pot"><div class="finance-cylinder ${color}"><span aria-hidden="true">${index===0?'●':index===1?'▥':'↗'}</span><strong>Topf ${index+1}<br>${title}</strong></div><b>${CHF(shown.buckets[index])}</b>${info(`Topf ${index+1} – ${title} erklären`,description)}</div>`;
  const capitalExplanation=`Das verfügbare Anlagekapital finanziert deinen Ruhestand. Es umfasst frei verfügbares Vermögen und vor Pensionierung den gewählten PK-Kapitalbezug nach geschätzter Bezugssteuer. Gebundenes Immobilienkapital ist nicht enthalten. Start ${st.mode==='post'?'heute':'bei Pensionierung'} mit Alter ${p.start}: ${CHF(p.capital)}${p.capital!==p.capitalBreakdown.totalInvestableCapital?' (Vorschau)':''}. Die Töpfe zeigen das verfügbare Kapital zu Jahresbeginn mit Alter ${age}, vor der Entnahme dieses Jahres. Ab späteren Phasen sind frühere Entnahmen und geschätzte Steuern bereits berücksichtigt. Alle Beträge in konstanter Kaufkraft des Planungsstarts.`;
  document.getElementById('financeModel').innerHTML=`<div class="finance-capital-header"><div><h3>Verfügbares Anlagekapital</h3>${info('Verfügbares Anlagekapital erklären',capitalExplanation)}</div><strong>${CHF(shown.free)}</strong><small>${age===p.start?`${st.mode==='post'?'Start heute':'Start bei Pensionierung'} · Alter ${age}`:`Jahresbeginn · Alter ${age}`}${p.capital!==p.capitalBreakdown.totalInvestableCapital?' · Vorschau':''}</small></div><div class="finance-pots">${pot(2,'stock-pot','Wachstum','Langfristig angelegtes Kapital mit Renditechancen und entsprechenden Schwankungen. Finanziert spätere Jahre des Ruhestands und füllt Topf 2 auf.')}${pot(1,'bond-pot','Anleihen','Reserve für die folgenden zwei Entnahmejahre. Soll Schwankungen abfedern und Topf 1 auffüllen. Auch Anleihen können an Wert verlieren.')}${pot(0,'cash-pot','Geldmarkt','Kapital für die laufenden Entnahmen eines Jahres. Hält den kurzfristigen Bedarf möglichst stabil bereit und wird aus Topf 2 aufgefüllt.')}</div><div class="finance-payout">↓<br><strong>Laufende Kosten</strong></div>${shown.gap>0?`<p class="note gold">Das verfügbare Kapital reicht in diesem Jahr nicht aus. Ungedeckt: ${CHF(shown.gap)}.</p>`:''}<div class="finance-method-help"><span>So funktionieren die Töpfe</span>${info('Methode der drei Töpfe erklären',`Die Reserven richten sich nach den geplanten Entnahmen: ein Jahr in Topf 1, die beiden folgenden Jahre in Topf 2. Verbleibendes Kapital liegt in Topf 3 (hier ${shown.free?(shown.buckets[2]/shown.free*100).toLocaleString('de-DE',{maximumFractionDigits:1}):'0'} %). Jährliche Prüfung und Auffüllung: Topf 3 → Topf 2 → Topf 1. Auch nach Kursverlusten können Verkäufe nötig sein. Entnahmen erfolgen am Jahresanfang, danach wird das verbleibende Kapital verzinst. Modellrechnung, keine Garantie.`)}</div><div id="financeHelp" class="finance-help-panel" hidden></div>`;
}
