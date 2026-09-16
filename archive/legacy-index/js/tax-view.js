/* Tax presentation only; rates are read from the central model. */
function taxCantonField(){
  return `<div class="tax-canton"><select aria-label="Wohnkanton" ${planningLocked?'disabled':''} onchange="changeTaxCanton(this.value)"><option value="">Dein Wohnsitzkanton</option>${Object.entries(TaxModel.config.cantons).sort((a,b)=>a[1].name.localeCompare(b[1].name,'de-CH')).map(([code,c])=>`<option value="${code}" ${st.canton===code?'selected':''}>${c.name} (${code})</option>`).join('')}</select><details class="inline-info"><summary aria-label="Information zum Wohnsitzkanton">ⓘ</summary><div>Dein Wohnsitzkanton wird für die vereinfachte Schätzung der Einkommens- und Kapitalbezugssteuern verwendet.</div></details></div>`;
}
function changeTaxCanton(code){
  if(planningLocked)return;
  st.canton=TaxModel.canton(code)?code:null;
  st.taxModelVersion=TaxModel.config.version;
  persist();ui();renderResult();
  document.querySelectorAll('.tax-canton select').forEach(el=>el.value=st.canton||'');
}
function taxInfo(income=rent0(),capital=false,row=null){
  const c=TaxModel.canton(st.canton),rate=TaxModel.getIncomeTaxRate(st.canton,row?.taxableAnnualIncome??income);
  const estimated=row?.estimatedIncomeTax??TaxModel.calculateEstimatedIncomeTax(st.canton,income);
  const amount=st.mode==='post'?0:split().cap;
  const pct=n=>n.toLocaleString('de-DE',{maximumFractionDigits:2});
  return `<details class="tax-info"><summary aria-label="Information zur Steuerannahme">ⓘ</summary><div><strong>Steuerannahme</strong>${c?`<p><strong>Laufende Einkommenssteuer</strong><br>Bei einem jährlichen Einkommen von <strong>${CHF(income)}</strong> rechnen wir für <strong>${c.name}</strong> vereinfacht mit einer Einkommenssteuer von rund <strong>${CHF(estimated)} pro Jahr</strong>. Das entspricht einem angenommenen Steuersatz von <strong>${pct(rate)} %</strong>.</p><p>Die tatsächliche Steuer hängt unter anderem von Wohngemeinde, Zivilstand, Konfession, Abzügen und weiteren Einkünften ab.</p>`:'<p>Für die Steuerschätzung brauchen wir deinen Wohnkanton.</p>'}<p><strong>Kapitalbezugssteuer</strong><br>Der Kapitalbezug aus der Pensionskasse wird separat mit einem reduzierten Steuersatz berechnet. Bereits bestehendes freies Vermögen wird nicht mit einer Kapitalbezugssteuer belastet.${capital&&c&&amount>0?` Beim gewählten Bezug: ca. ${pct(TaxModel.getCapitalWithdrawalTaxRate(st.canton,amount))} %.`:''}</p><p><strong>Modellrechnung, keine individuelle Steuerberechnung.</strong> Nicht berücksichtigt sind unter anderem die Vermögenssteuer und allfällige Steuern beim Bezug der Säule 3a. Zinsen und Dividenden werden in der vereinfachten Simulation nicht separat besteuert.</p><small>ESTV-basiertes Planungsmodell 2026. Kapitalbezug: Referenz Kantonshauptort, ledig und konfessionslos. Unter CHF 50'000 und über CHF 1'000'000 bleibt der jeweilige äusserste Referenzsatz konstant.</small></div></details>`;
}
function taxCapitalSummary(){
  if(st.mode==='post')return '';
  const s=split();
  return `<div class="tax-summary"><div class="row"><span>PK-Kapital brutto</span><strong>${CHF(s.cap)}</strong></div><div class="row"><div class="tax-label">Geschätzte Kapitalbezugssteuer ${taxInfo(rent0(),true)}</div><strong>${s.capitalTax===null?'—':'− '+CHF(s.capitalTax)}</strong></div><div class="row total"><span>PK-Kapital netto${s.capitalTax===null?' (vorläufig)':''}</span><strong>${CHF(s.netCap)}</strong></div></div>`;
}
function taxIncomeSummary(row){
  return `<div class="tax-summary"><div class="row"><span>Einkommen brutto</span><strong>${CHFJ(row.grossIncome)}</strong></div><div class="row"><div class="tax-label">Geschätzte Steuern ${taxInfo(row.grossIncome,false,row)}</div><strong>${row.estimatedIncomeTax===null?'—':'− '+CHFJ(row.estimatedIncomeTax)}</strong></div><div class="row total"><span>Netto verfügbar${row.estimatedIncomeTax===null?' (vorläufig)':''}</span><strong>${CHFJ(row.rent)}</strong></div></div>`;
}
function renderTaxResults(first){
  let target=document.getElementById('resultTaxes');
  if(!target){target=document.createElement('div');target.id='resultTaxes';target.className='card';document.getElementById('tab-overview').append(target);}
  const sources=RetirementCalculator.incomeSourcesAtStart(RetirementCalculator.fromState(st)).filter(source=>source.annualIncome!==0);
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const breakdown=`<section class="income-source-summary" aria-label="Zusammensetzung des Einkommens"><h2>So setzt sich dein Einkommen zusammen</h2><p>Ab Alter ${first.age} · vor persönlicher Einkommenssteuer</p>${sources.length?sources.map(source=>`<div class="row income-source"><span>${escape(source.name)}</span><div><strong>${CHFJ(source.annualIncome)}</strong><small>${CHF(source.annualIncome/12)} / Monat</small></div></div>`).join(''):'<p>Im ersten Planungsjahr sind keine laufenden Einnahmen vorhanden.</p>'}</section>`;
  target.innerHTML=`${taxCantonField()}${breakdown}${taxIncomeSummary(first)}${taxCapitalSummary()}${investableCapitalSummary(planningInput())}`;
}
const taxOriginalUi=ui;
ui=function(){taxOriginalUi();document.querySelectorAll('.tax-canton select').forEach(el=>{el.value=st.canton||'';el.disabled=planningLocked;});document.getElementById('pkTaxSummary').innerHTML=taxCapitalSummary();};
document.querySelector('[data-screen="ageNow"] .card').insertAdjacentHTML('beforeend',taxCantonField());
ui();

function investableCapitalSummary(input){
  const c=input.capitalBreakdown;
  const info=`<details class="tax-info"><summary aria-label="Zusammensetzung des Anlagekapitals">ⓘ</summary><div>Bestehendes freies Vermögen plus PK-Kapital nach Kapitalbezugssteuer. Dieses Kapital wird auf Geldmarkt, Anleihen und Wachstum verteilt. Gebundenes Immobilienkapital ist darin nicht enthalten.</div></details>`;
  return `<div class="tax-summary investable-summary"><div class="row"><span>Verfügbares Vermögen ohne PK-Bezug</span><strong>${CHF(c.existingFreeCapital)}</strong></div><div class="row total"><div class="tax-label">Verfügbares Anlagekapital ${info}</div><strong>${CHF(c.totalInvestableCapital)}</strong></div></div>`;
}
