/* A personal snapshot is separate from the automatically saved working plan. */
const personalSaveKey='retirement-personal-snapshot-v1';
function readPersonalSave(){
  try{
    const saved=JSON.parse(localStorage.getItem(personalSaveKey)||'null');
    return saved?.version===1&&saved.state&&['pre','post'].includes(saved.state.mode)?saved:null;
  }catch(_){return null;}
}
function renderPersonalSave(){
  const saved=readPersonalSave();
  document.querySelectorAll('[data-personal-load]').forEach(button=>button.hidden=!saved);
  document.querySelectorAll('[data-personal-date]').forEach(node=>{
    node.textContent=saved?`Persönlicher Stand: ${new Date(saved.savedAt).toLocaleString('de-CH',{dateStyle:'short',timeStyle:'short'})}`:'Noch kein persönlicher Stand gespeichert.';
  });
}
function savePersonalStand(){
  if(!st.mode)return;
  try{
    localStorage.setItem(personalSaveKey,JSON.stringify({version:1,savedAt:new Date().toISOString(),state:structuredClone(st)}));
    renderPersonalSave();
    document.getElementById('personalSaveMessage').textContent='Dein persönlicher Stand ist gespeichert.';
  }catch(_){document.getElementById('personalSaveMessage').textContent='Speichern nicht möglich. Bitte prüfe, ob dein Browser lokale Speicherung zulässt.';}
}
function loadPersonalStand(){
  const saved=readPersonalSave();if(!saved)return;
  if(st.mode&&!confirm('Deinen persönlichen Stand laden? Die aktuellen Arbeitswerte werden dadurch ersetzt.'))return;
  try{
    // Keep the previous working values available as a recovery copy.
    localStorage.setItem('retirement-before-personal-load',JSON.stringify(st));
    localStorage.setItem('retirementMvp5',JSON.stringify(saved.state));
    localStorage.removeItem('retirementMvp5-submitted');
    localStorage.removeItem('retirementMvp5-submission');
  }catch(_){alert('Der Stand konnte nicht geladen werden. Bitte prüfe die lokale Speicherung im Browser.');return;}
  st=structuredClone(saved.state);planningLocked=false;returnToResult=false;
  flow=makeFlow();i=0;selectedAdviceTopic='overall';
  document.getElementById('submittedStatus')?.classList.remove('visible');
  document.getElementById('contactForm')?.classList.remove('hidden');
  document.getElementById('requestSuccess')?.classList.add('hidden');
  ensurePlan();ui();renderResult();show('result');tab('overview',document.querySelector('.tabs button'));
  document.getElementById('personalSaveMessage').textContent='Dein persönlicher Stand wurde geladen. Du kannst ihn weiter bearbeiten.';
}
document.querySelector('[data-screen="start"]').insertAdjacentHTML('beforeend',`<div class="personal-save-start"><button class="secondary" data-personal-load onclick="loadPersonalStand()" hidden>Meinen Stand laden</button><small data-personal-date></small></div>`);
document.getElementById('tab-overview').insertAdjacentHTML('beforeend',`<div class="personal-save-box"><button class="secondary" data-personal-load onclick="loadPersonalStand()" hidden>Meinen Stand laden</button><small data-personal-date></small><p>Auf diesem Gerät in diesem Browser gespeichert. Beim Löschen der Browserdaten geht der Stand verloren.</p><p id="personalSaveMessage" role="status" aria-live="polite"></p></div>`);
const personalSaveButton=document.querySelector('.completion-actions .secondary');
personalSaveButton.textContent='Meinen Stand speichern';
personalSaveButton.onclick=savePersonalStand;
renderPersonalSave();
