/* A personal snapshot is separate from the automatically saved working plan. */
const personalSaveKey='retirement-personal-snapshot-v1';
function showStorageMessage(message,error=false){
  document.querySelectorAll('[data-storage-message]').forEach(node=>{node.textContent=message;node.classList.toggle('bad',error);});
}
function readPersonalSave(){
  const raw=readLocal(personalSaveKey);if(!raw)return null;
  try{return PlanningStorage.decode(raw,D)}catch(error){showStorageMessage(error.message,true);return null;}
}
function renderPersonalSave(){
  const raw=readLocal(personalSaveKey),saved=readPersonalSave();
  document.querySelectorAll('[data-personal-load]').forEach(button=>button.hidden=!raw);
  document.querySelectorAll('[data-personal-date]').forEach(node=>{
    const date=saved?new Date(saved.savedAt):null;
    node.textContent=date&&Number.isFinite(date.getTime())?`Zuletzt gespeichert: ${date.toLocaleDateString('de-CH')} um ${date.toLocaleTimeString('de-CH',{hour:'2-digit',minute:'2-digit'})}`:'';
  });
}
function savePersonalStand(){
  if(!st.mode)return showStorageMessage('Bitte zuerst deine Planung erfassen.',true);
  try{
    // Preserve unreadable/future snapshots instead of silently replacing them.
    const existing=localStorage.getItem(personalSaveKey);
    if(existing)PlanningStorage.decode(existing,D);
    const raw=JSON.stringify({version:PlanningStorage.version,savedAt:new Date().toISOString(),plan:RetirementCalculator.fromState(st)});
    PlanningStorage.decode(raw,D);
    localStorage.setItem(personalSaveKey,raw);
    if(localStorage.getItem(personalSaveKey)!==raw)throw Error('Speicherung konnte nicht bestätigt werden.');
    renderPersonalSave();showStorageMessage('✓ Dein Stand wurde auf diesem Gerät gespeichert.');
  }catch(error){showStorageMessage('Speichern nicht möglich. '+error.message,true);}
}
function loadPersonalStand(){
  let saved;try{saved=PlanningStorage.decode(localStorage.getItem(personalSaveKey),D)}catch(error){showStorageMessage('Laden nicht möglich. '+error.message,true);return;}
  if(st.mode&&!confirm('Deinen persönlichen Stand laden? Die aktuellen Arbeitswerte werden dadurch ersetzt.'))return;
  try{
    // Keep the previous working values available as a recovery copy.
    localStorage.setItem('retirement-before-personal-load',JSON.stringify(st));
    localStorage.setItem('retirementMvp5',JSON.stringify(saved.state));
    localStorage.removeItem('retirementMvp5-submitted');
    localStorage.removeItem('retirementMvp5-submission');
  }catch(_){showStorageMessage('Der Stand konnte nicht geladen werden. Bitte prüfe die lokale Speicherung im Browser.',true);return;}
  st=structuredClone(saved.state);planningLocked=false;returnToResult=false;
  flow=makeFlow();i=0;selectedAdviceTopic='overall';
  document.getElementById('submittedStatus')?.classList.remove('visible');
  document.getElementById('contactForm')?.classList.remove('hidden');
  document.getElementById('requestSuccess')?.classList.add('hidden');
  ensurePlan();ui();
  showStorageMessage('Dein persönlicher Stand wurde geladen.');renderPersonalSave();
  return true;
}
document.querySelector('[data-screen="start"]').insertAdjacentHTML('beforeend',`<div class="personal-save-start"><button class="secondary" data-personal-load onclick="loadPersonalStand()" hidden>Meinen Stand laden</button><small data-personal-date></small><p data-storage-message role="status" aria-live="polite"></p></div>`);
document.getElementById('tab-overview').insertAdjacentHTML('beforeend',`<div class="personal-save-box"><button class="secondary" data-personal-load onclick="loadPersonalStand()" hidden>Meinen Stand laden</button><small data-personal-date></small><p>Auf diesem Gerät in diesem Browser gespeichert. Beim Löschen der Browserdaten geht der Stand verloren.</p><p id="personalSaveMessage" data-storage-message role="status" aria-live="polite"></p></div>`);
const personalSaveButton=document.querySelector('.completion-actions .secondary');
personalSaveButton.textContent='Auf diesem Gerät speichern';
personalSaveButton.removeAttribute('onclick');
personalSaveButton.onclick=savePersonalStand;
renderPersonalSave();

if(globalThis.storageWarning)showStorageMessage(storageWarning,true);
