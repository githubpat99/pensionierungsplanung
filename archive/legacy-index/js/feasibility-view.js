/* Comparison remains available; the primary status evaluates the current choice. */
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
  const status=currentPlanStatus(variant,input.end);
  overall.className='pk-status '+(variant.feasible?'feasible':'shortfall');
  overall.innerHTML=`<strong>${status.message}</strong>${variant.feasible?`<p><strong>Verfügbares Restkapital mit Alter ${input.end}: ${CHF(variant.capitalAtHorizon)}</strong></p>`:`<p>Ab Alter ${variant.firstGapAge} entsteht eine Finanzierungslücke.</p>`}<small>Basisrechnung · alle drei Töpfe, ohne gebundenes Immobilienkapital · aktuell gewählte PK-Aufteilung</small>`;
  current.className='pk-status';
  current.innerHTML=`<strong>Aktuelle Wahl: ${100-st.pkShare} % Rente / ${st.pkShare} % Kapital</strong><small>Die Auswirkungen dieser Wahl sind oben ausgewiesen.</small>`;

}
const feasibilityOriginalUi=ui;
ui=function(){feasibilityOriginalUi();renderFeasibility();};
renderFeasibility();

function currentPlanStatus(variant,end){
  return {message:variant.feasible?`Unter den gewählten Annahmen ist dein gewünschter Lebensstandard bis Alter ${end} finanzierbar.`:`Unter den gewählten Annahmen reicht dein verfügbares Kapital voraussichtlich bis Alter ${variant.firstGapAge}.`};
}
