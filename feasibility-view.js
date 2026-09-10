/* Overall feasibility is independent of the selected slider position. */
let feasibilityCache=null;
function getPlanFeasibility(){
  const inputs=Array.from({length:11},(_,i)=>({capitalShare:i*10,input:planningInput(i*10)}));
  const key=JSON.stringify(inputs);
  if(feasibilityCache?.key!==key)feasibilityCache={key,value:RetirementFeasibility.analyze(inputs)};
  return feasibilityCache.value;
}
function renderFeasibility(){
  if(st.mode!=='pre')return;
  const overall=document.getElementById('planFeasibility'),current=document.getElementById('pkVariantStatus');
  const input=planningInput(),variant=RetirementFeasibility.evaluate(input,st.pkShare),first=variant.rows[0];
  document.getElementById('pkIncomeTaxSummary').innerHTML=`<small>Laufende Einnahmen im ersten Ruhestandsjahr</small>${taxIncomeSummary(first)}`;
  current.hidden=!TaxModel.canton(st.canton);
  if(current.hidden){
    overall.className=current.className='pk-status pending';
    overall.innerHTML='<strong>Machbarkeit noch offen</strong><p>Für die vollständige Einschätzung fehlt noch dein Wohnsitzkanton.</p>';
    current.innerHTML='';
    return;
  }
  const result=getPlanFeasibility(),differentPhases=input.phases.some(p=>p.from<input.end&&p.need!==input.phases[0].need);
  const rounded=n=>CHF(Math.round(n/500)*500);
  overall.className='pk-status '+(result.planFeasible?'feasible':'shortfall');
  if(result.planFeasible){
    overall.innerHTML=`<strong>✓ Dein Plan geht grundsätzlich auf</strong><p>${differentPhases?`Dein geplanter Lebensstandard mit anfangs ${CHF(st.need)} pro Jahr und den hinterlegten Lebensphasen`:`Dein gewünschter Lebensstandard von ${CHF(st.need)} pro Jahr`} ist bis Alter ${input.end} finanzierbar.</p><small>Mindestens eine PK-Aufteilung ist unter deinen Modellannahmen finanzierbar.</small>`;
  }else{
    overall.innerHTML=`<strong>Dein Plan geht noch nicht vollständig auf</strong>${result.annualShortfall===null?'<p>Auch mit reduziertem Lebensbedarf bleibt eine Finanzierungslücke. Prüfe deine Einnahmen und Annahmen.</p>':`<p>Mit den aktuellen Annahmen fehlen langfristig ca. ${rounded(result.annualShortfall)} pro Jahr.</p><p>Nachhaltig finanzierbar: ca. ${rounded(result.sustainableAnnualNeed)} pro Jahr${differentPhases?' zu Beginn':''}.</p>`}<small>${differentPhases?'Dafür wird der Bedarf in jeder Lebensphase um denselben Jahresbetrag gesenkt, mindestens auf null. ':''}Prüfe deinen Lebensstandard oder deine Annahmen.</small>`;
  }
  current.className='pk-status '+(variant.feasible?'feasible':'shortfall');
  current.innerHTML=variant.feasible?`<strong>✓ Diese Variante reicht bis mindestens Alter ${input.end}</strong><p>Restkapital mit Alter ${input.end}: ca. ${rounded(variant.capitalAtHorizon)}</p>`:
    `<strong>${variant.firstGapAge===input.start?'Diese Variante deckt bereits das erste Ruhestandsjahr nicht vollständig.':`Diese Variante reicht voraussichtlich bis Alter ${variant.firstGapAge}.`}</strong><p>Ab Alter ${variant.firstGapAge} entsteht eine Finanzierungslücke (Jahr ${variant.firstGapAge}–${variant.firstGapAge+1}).</p>`;
  current.insertAdjacentHTML('beforeend',`<small>Aktuelle Wahl: ${100-st.pkShare} % Rente / ${st.pkShare} % Kapital · Modellrechnung</small>`);
}
const feasibilityOriginalUi=ui;
ui=function(){feasibilityOriginalUi();renderFeasibility();};
renderFeasibility();
