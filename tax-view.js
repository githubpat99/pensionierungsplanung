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
function taxInfo(income=rent0(),capital=false){
  const c=TaxModel.canton(st.canton),rate=TaxModel.getIncomeTaxRate(st.canton,income);
  const level={low:'tief',medium:'mittel',high:'hoch'}[TaxModel.getIncomeTaxLevel(income)];
  const amount=st.mode==='post'?0:split().cap;
  return `<details class="tax-info"><summary aria-label="Information zur Steuerannahme">ⓘ</summary><div><strong>Steuerannahme</strong>${c?`<p>Wir verwenden für deine Planung eine vereinfachte Steuerannahme für den Kanton <strong>${c.name}</strong>.</p><p>Laufendes steuerbares Einkommen: ca. <strong>${rate.toLocaleString('de-CH')} %</strong> · Aktuelle Stufe: <strong>${level}</strong>.</p>`:'<p>Bitte wähle deinen Wohnkanton. Bis dahin zeigt die Vorschau Beträge ohne Steuerabzug; Steuern sind noch nicht berücksichtigt.</p>'}<p>Kapitalbezüge aus der Pensionskasse werden separat mit einem reduzierten Steuersatz berechnet.</p>${capital&&c?`<p><strong>Geschätzte Kapitalbezugssteuer: ${TaxModel.getCapitalWithdrawalTaxRate(st.canton,amount).toLocaleString('de-CH',{maximumFractionDigits:1})} %</strong><br>Basis: Kanton ${st.canton}, Kapitalbezug ${CHF(amount)}, Referenz Steuerjahr 2026. Referenz: Kantonshauptort, ledige konfessionslose Person. Unter CHF 50'000 und über CHF 1'000'000 verwenden wir vereinfachend den jeweils äussersten Referenzsatz.</p>`:''}<p><span class="tax-swiss" aria-hidden="true">✚</span> Grundlage des vorgegebenen Modells: Steuerdaten der Eidgenössischen Steuerverwaltung ESTV. Die tatsächliche Steuer hängt unter anderem von Gemeinde, Zivilstand, Konfession, Abzügen und weiteren Einkünften ab.</p><small>Kapitalentnahmen und private Kapitalgewinne gelten nicht als laufendes Einkommen. Zinsen und Dividenden sind grundsätzlich steuerpflichtig und werden in dieser vereinfachten Simulation nicht separat aufgeteilt. Vermögenssteuer und Steuern auf Säule-3a-Bezüge sind nicht enthalten.</small><p><strong>Modellrechnung, keine individuelle Steuerberechnung.</strong> Die gerundeten Einkommenssteuersätze sind Planungsannahmen.</p></div></details>`;
}
function taxCapitalSummary(){
  if(st.mode==='post')return '';
  const s=split();
  return `<div class="tax-summary"><div class="row"><span>PK-Kapital brutto</span><strong>${CHF(s.cap)}</strong></div><div class="row"><div class="tax-label">Geschätzte Kapitalbezugssteuer ${taxInfo(rent0(),true)}</div><strong>${s.capitalTax===null?'—':'− '+CHF(s.capitalTax)}</strong></div><div class="row total"><span>PK-Kapital netto${s.capitalTax===null?' (vorläufig)':''}</span><strong>${CHF(s.netCap)}</strong></div></div>`;
}
function taxIncomeSummary(row){
  return `<div class="tax-summary"><div class="row"><span>Einkommen brutto</span><strong>${CHFJ(row.grossIncome)}</strong></div><div class="row"><div class="tax-label">Geschätzte Steuern ${taxInfo(row.taxableAnnualIncome)}</div><strong>${row.estimatedIncomeTax===null?'—':'− '+CHFJ(row.estimatedIncomeTax)}</strong></div><div class="row total"><span>Netto verfügbar${row.estimatedIncomeTax===null?' (vorläufig)':''}</span><strong>${CHFJ(row.rent)}</strong></div></div>`;
}
function renderTaxResults(first){
  let target=document.getElementById('resultTaxes');
  if(!target){target=document.createElement('div');target.id='resultTaxes';target.className='card';document.getElementById('tab-overview').append(target);}
  target.innerHTML=`${taxCantonField()}${taxIncomeSummary(first)}${taxCapitalSummary()}${investableCapitalSummary(planningInput())}`;
}
const taxOriginalUi=ui;
ui=function(){taxOriginalUi();document.querySelectorAll('.tax-canton select').forEach(el=>{el.value=st.canton||'';el.disabled=planningLocked;});document.getElementById('pkTaxSummary').innerHTML=taxCapitalSummary();};
document.querySelector('[data-screen="ageNow"] .card').insertAdjacentHTML('beforeend',taxCantonField());
ui();

function investableCapitalSummary(input){
  const c=input.capitalBreakdown;
  const info=`<details class="tax-info"><summary aria-label="Zusammensetzung des Anlagekapitals">ⓘ</summary><div>Bestehendes freies Vermögen plus PK-Kapital nach Kapitalbezugssteuer. Dieses Kapital wird auf Geldmarkt, Anleihen und Aktien verteilt. Gebundenes Kapital bleibt separat.</div></details>`;
  return `<div class="tax-summary investable-summary"><div class="row"><span>Freies Vermögen ohne PK</span><strong>${CHF(c.existingFreeCapital)}</strong></div><div class="row total"><div class="tax-label">Gesamtes Anlagekapital ${info}</div><strong>${CHF(c.totalInvestableCapital)}</strong></div></div>`;
}
