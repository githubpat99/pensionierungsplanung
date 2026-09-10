/* Annual needs are saved per phase; market, capital and horizon remain what-if controls. */
let financingPreview = null;
function renderFinancingView(reset = true) {
  if (reset || !financingPreview) financingPreview = {phase: 0, scenario: 'base', input: structuredClone(planningInput())};
  const wasOpen=document.getElementById('financeDialog')?.open;
  const p = financingPreview.input;
  document.getElementById('planOverview').innerHTML = `
    <header class="finance-heading"><div class="kicker">Deine 3 Finanzierungstöpfe</div><h2>So funktioniert deine Entnahme-Strategie</h2><p>Renten und weitere Einnahmen decken einen Teil deines Bedarfs. Den Rest finanzierst du aus deinem verfügbaren Vermögen.</p></header>
    <div class="finance-layout">
      <section class="finance-panel finance-income" id="financeIncome" aria-label="Laufende Einnahmen"></section>
      <section class="finance-panel finance-need" id="financeNeed" aria-label="Jahresbedarf"></section>
      <section class="finance-panel finance-bound" id="financeBound" aria-label="Gebundenes Kapital"></section>
      <section class="finance-panel finance-model" id="financeModel" aria-label="Das Drei-Töpfe-Modell"></section>
      <button class="primary finance-mobile finance-open" onclick="document.getElementById('financeDialog').showModal()">Simulation anpassen</button><dialog id="financeDialog" class="finance-dialog"><button class="secondary finance-mobile finance-close" onclick="document.getElementById('financeDialog').close()">Fertig · Zur Finanzierung</button><section class="finance-panel finance-controls"><div class="finance-sim-title"><h3>Simulation</h3><details class="finance-info"><summary aria-label="Information zur Simulation">ⓘ</summary><p>Beträge in heutiger Kaufkraft. Der Jahresbedarf wird je Lebensphase gespeichert. Markt, Dauer und Startkapital sind Vorschauwerte. Das Startkapital berücksichtigt die geschätzte PK-Kapitalbezugssteuer, sofern ein Kanton gewählt wurde. Die Topfbeträge zeigen den Jahresanfang der gewählten Phase, der Endwert das verbleibende Kapital nach allen geplanten Entnahmen.</p></details></div><div class="finance-sim-fields">
        <div class="finance-sim-field"><label for="financePhase">Phase · Alter</label><select id="financePhase" onchange="changeFinancing('phase',this.value)"><option value="0">1 · ab ${p.start}</option><option value="1">2 · ab ${Math.max(p.start,p.phases[1].from)}</option><option value="2">3 · ab ${Math.max(p.start,p.phases[2].from)}</option></select></div>
        <div class="finance-sim-field"><label for="financeNeedInput">Jahresbedarf <output id="financeNeedOutput"></output></label><input id="financeNeedInput" ${planningLocked?'disabled':''} type="range" min="0" max="${Math.max(250000,...p.phases.map(x=>x.need))}" step="1000" value="${p.phases[0].need}" oninput="changeFinancing('need',this.value)"></div>
        <div class="finance-sim-field"><label for="financeMarket">Markt</label><select id="financeMarket" onchange="changeFinancing('scenario',this.value)"><option value="base">Basisannahmen</option><option value="weak">Fünf schwache Jahre</option><option value="crash">Früher Börsencrash</option></select></div>
        <div class="finance-sim-field"><label for="financeHorizon">Dauer <output id="financeHorizonOutput"></output></label><input id="financeHorizon" type="range" min="1" max="${110-p.start}" step="1" value="${p.end-p.start}" oninput="changeFinancing('horizon',this.value)"></div>
        <div class="finance-sim-field"><label for="financeCapital">Startkapital netto <output id="financeCapitalOutput"></output></label><input id="financeCapital" type="range" min="0" max="${Math.max(5000000,p.capital)}" step="10000" value="${p.capital}" oninput="changeFinancing('capital',this.value)"></div>
        </div><div class="finance-preview-result" id="financeProjection" role="status" aria-live="polite"></div>
        <div class="finance-sim-actions"><button class="secondary" onclick="renderFinancingView()">Vorschau zurücksetzen</button><button class="primary" onclick="document.getElementById('financeDialog').close();tab('ass',document.querySelector('.tabs button[data-tab=&quot;ass&quot;]'));window.scrollTo({top:0,behavior:'smooth'})">Annahmen →</button></div><small class="finance-save-note">Jahresbedarf wird gespeichert · übrige Werte: Vorschau</small>
      </section></dialog>
    </div><footer class="finance-goal"><span aria-hidden="true">◎</span><div><strong>Ziel: Deinen Lebensunterhalt vorausschauend finanzieren.</strong><p>Reserven für laufende Auszahlungen, langfristige Anlagen für spätere Jahre. Die Töpfe werden jährlich neu aufgefüllt – auch nach Kursverlusten können dafür Aktienverkäufe nötig sein.</p></div></footer>`;
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
  const f=financingPreview,p=f.input,rows=RetirementEngine.simulate(p,f.scenario);
  const selectedAge=Math.max(p.start,p.phases[f.phase].from),r=rows.find(x=>x.age===selectedAge&&!x.terminal),last=rows.at(-1),gap=rows.find(x=>x.gap>0);
  const phaseUnavailable=!r,shown=r||rows[0],age=shown.age;
  document.getElementById('financeNeedOutput').textContent=CHF(p.phases[f.phase].need);
  document.getElementById('financeHorizonOutput').textContent=`${p.end-p.start} ${p.end-p.start===1?'Jahr':'Jahre'}`;
  document.getElementById('financeCapitalOutput').textContent=CHF(p.capital);
  document.getElementById('financeProjection').innerHTML=`<strong>Endkapital mit ${last.age}: ${CHF(last.free)}</strong><span>${gap?`Erste ungedeckte Lücke: Alter ${gap.age}–${gap.age+1}.`:TaxModel.canton(p.canton)?'Bis zum Zielalter gedeckt.':'Vorläufig · Steuern noch nicht berücksichtigt.'}</span>${phaseUnavailable?'<span>Die gewählte Phase liegt ausserhalb des Zeithorizonts. Darstellung: Planungsstart.</span>':''}`;
  const income=p.sources.map(s=>({name:s.name,value:RetirementEngine.simulate({...p,sources:[s],canton:null},f.scenario).find(x=>x.age===age).rent,icon:s.id==='ahv'?'▥':s.id==='pk'?'▣':s.rental?'⌂':'•••'})).filter(s=>s.value!==0);
  document.getElementById('financeIncome').innerHTML=`<h3>Renten & weitere Einnahmen</h3><p>Diese Einnahmen decken einen Teil deines Jahresbedarfs ab Alter ${age}.</p><div class="finance-source-list">${income.map(s=>`<div class="finance-source"><span class="finance-source-icon" aria-hidden="true">${s.icon}</span><strong>${planningEscape(s.name)}</strong><div><b>${CHF(s.value)}</b><small>pro Jahr</small></div></div>`).join('')||'<p>Keine laufenden Einnahmen erfasst.</p>'}</div>${taxIncomeSummary(shown)}<div class="finance-income-arrow" aria-hidden="true">Deckt einen Teil des Bedarfs →</div>`;
  const coverage=shown.need>0?Math.min(100,Math.max(0,shown.rent/shown.need*100)):100;
  document.getElementById('financeNeed').innerHTML=`<h3>▱ Jahresbedarf</h3><div class="finance-amount">${CHF(shown.need)}</div><small>pro Jahr · ab Alter ${age}</small><div class="finance-coverage" role="meter" aria-label="Bedarf durch Einnahmen gedeckt" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(coverage)}"><i style="width:${coverage}%"></i></div><small>${Math.round(coverage)} % durch laufende Einnahmen gedeckt</small><div class="finance-gap"><strong>${shown.withdrawal?'Restbedarf':'Kein Restbedarf'}</strong><b>${CHF(shown.withdrawal)}<small>pro Jahr</small></b></div><p class="finance-down">${shown.withdrawal?'Finanzierung aus den drei Töpfen ↓':'Die Einnahmen decken den Bedarf.'}</p>`;
  document.getElementById('financeBound').innerHTML=`<div class="finance-cylinder gold-pot" aria-hidden="true"><span>🔒</span></div><div><h3>Nebentopf · Gebundenes Kapital</h3><strong>${CHF(shown.bound)}</strong><p>Netto-Immobilienvermögen bleibt separat. Ein Verkauf ist nicht eingeplant. Erfasste Netto-Mieterträge zählen zu den Einnahmen.</p></div>`;
  const info=(label,text)=>`<details class="finance-info"><summary aria-label="${label}">ⓘ</summary><p>${text}</p></details>`;
  document.getElementById('financeIncome').insertAdjacentHTML('afterbegin',`<div class="finance-mobile finance-compact-title"><strong>Netto verfügbar · ${CHF(shown.rent)}/J.</strong>${info('Information zu Einnahmen','Laufende Einnahmen ab Alter '+age+', in heutiger Kaufkraft. Die Laufzeiten und Inflationsannahmen stehen unter Annahmen.')}</div>`);
  document.getElementById('financeNeed').insertAdjacentHTML('afterbegin',`<div class="finance-mobile finance-budget"><div><small>Jahresbedarf</small><strong>${CHF(shown.need)}</strong></div><div><small>Aus Vermögen / Jahr</small><strong>${CHF(shown.withdrawal)}</strong></div>${info('Information zum Jahresbedarf','Bedarf ab Alter '+age+'. '+Math.round(coverage)+' % werden durch laufende Einnahmen gedeckt. Den Rest finanzierst du aus dem verfügbaren Vermögen.')}</div>`);
  document.getElementById('financeBound').insertAdjacentHTML('afterbegin',`<div class="finance-mobile finance-bound-line"><span>🔒 Gebunden: <strong>${CHF(shown.bound)}</strong></span>${info('Information zum gebundenen Kapital','Netto-Immobilienvermögen bleibt separat. Ein Verkauf ist nicht eingeplant. Erfasste Netto-Mieterträge zählen zu den Einnahmen.')}</div>`);
  const pot=(index,color,title,description)=>`<div class="finance-pot"><div class="finance-cylinder ${color}"><span aria-hidden="true">${index===0?'●':index===1?'▥':'↗'}</span><strong>Topf ${index+1}<br>${title}</strong></div><b>${CHF(shown.buckets[index])}</b><p>${description}</p></div>`;
  document.getElementById('financeModel').innerHTML=`<h3>Das 3-Töpfe-Modell</h3>${p.capital===p.capitalBreakdown.totalInvestableCapital?investableCapitalSummary(p):`<p>Gesamtes Anlagekapital · Vorschau: <strong>${CHF(p.capital)}</strong></p>`}<p>Aufteilung zu Jahresbeginn mit ${age}: <strong>${CHF(shown.free)}</strong></p><div class="finance-refill"><span>Jährlich die Reserven auffüllen</span></div><div class="finance-pots"><svg class="finance-flow-arrows" viewBox="0 0 600 90" preserveAspectRatio="none" aria-hidden="true"><defs><marker id="bondArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10Z" fill="#ed8c91"/></marker><marker id="stockArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10Z" fill="#71afe7"/></marker></defs><path d="M140 64 Q195 7 250 50" fill="none" stroke="#ed8c91" stroke-width="6" marker-end="url(#bondArrow)"/><path d="M460 64 Q405 7 350 50" fill="none" stroke="#71afe7" stroke-width="6" marker-end="url(#stockArrow)"/></svg>${pot(1,'bond-pot','Anleihen','Reserve für die folgenden zwei Entnahmejahre.')}${pot(0,'cash-pot','Geldmarkt','Laufende Entnahmen eines Jahres.')}${pot(2,'stock-pot','Aktien','Verbleibendes Kapital für spätere Jahre.')}</div><div class="finance-payout">↓<br><strong>Auszahlungen für deinen Lebensunterhalt</strong></div>${shown.gap>0?`<p class="note gold">Das Kapital reicht in diesem Jahr nicht aus. Ungedeckt: ${CHF(shown.gap)}.</p>`:''}<p class="finance-model-note">Aktienquote: ${shown.free?(shown.buckets[2]/shown.free*100).toFixed(1):'0'} %. Die Darstellung zeigt die Aufteilung zu Jahresbeginn. Renditen und Reserven sind Modellannahmen.</p>`;
  document.getElementById('financeModel').insertAdjacentHTML('afterbegin',`<div class="finance-mobile finance-compact-title"><small>Jahresanfang mit ${age} · ${CHF(shown.free)}</small>${info('Information zu den drei Finanzierungstöpfen','Geldmarkt: Entnahmen eines Jahres. Anleihen: Reserve für die folgenden zwei Jahre. Aktien: verbleibendes Kapital für spätere Jahre. Jährliche Auffüllung, auch nach Kursverlusten; Aktienverkäufe können nötig sein. Aktienquote: '+(shown.free?(shown.buckets[2]/shown.free*100).toFixed(1):'0')+' %.')}</div>`);

}
