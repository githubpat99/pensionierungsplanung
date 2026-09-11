/* Presentation and completeness status only; calculations remain unchanged. */
const compactInfo=(title,text)=>`<details class="inline-info"><summary aria-label="${title}">ⓘ</summary><div>${text}</div></details>`;
const screenCopy={assets:'Was hast du bereits aufgebaut?',postAssets:'Was hast du bereits aufgebaut?',build:'Was kommt bis zur Pensionierung dazu?',pk:'Welche PK-Aufteilung passt zu deinem Plan?',income:'Welche Einnahmen kommen zur PK hinzu?',postIncome:'Welche Einnahmen erhältst du heute?'};
for(const [screen,copy] of Object.entries(screenCopy))document.querySelector(`[data-screen="${screen}"] .bubble`).textContent=copy;
document.querySelectorAll('.coach-mini,.advice-coach').forEach(el=>el.remove());
const headerGuide=document.createElement('div');headerGuide.id='headerGuide';headerGuide.className='header-guide';document.querySelector('.top').after(headerGuide);
function updateHeaderGuide(){const source=document.querySelector('.screen.active .bubble.assistant');headerGuide.textContent=source&&!returnToResult?source.textContent:'';headerGuide.hidden=!headerGuide.textContent;}
document.querySelector('[data-screen="start"]').insertAdjacentHTML('beforeend','<p class="global-edit-note">Du kannst alle Angaben und Annahmen später jederzeit anpassen.</p>');
document.querySelector('[data-screen="pk"] .decision-banner').remove();
document.querySelector('[data-screen="need"] .note').innerHTML=`In heutiger Kaufkraft, ohne Einkommenssteuern. ${compactInfo('Information zum Lebensbedarf','Die geschätzten Einkommenssteuern werden separat abgezogen. Unter Annahmen kannst du den Bedarf für deine drei Lebensphasen festlegen. Bereits im Bedarf enthaltene Einkommenssteuern bitte entfernen.')}`;
document.querySelector('[data-screen="horizon"] .note').innerHTML=`Dein Planungshorizont. ${compactInfo('Information zum Planungshorizont','Wir rechnen mit Modellannahmen zu Inflation, Renditen und Steuern. Die hinterlegten SECO- und ESTV-basierten Annahmen kannst du unter Annahmen prüfen und anpassen.')}`;
const compactShow=show;
show=function(n){compactShow(n);updateHeaderGuide();document.querySelector('.app').classList.toggle('editing',returnToResult&&!['start','result','advice'].includes(n));};
const compactShowStep=showStep;
showStep=function(){compactShowStep();if(returnToResult){ptext.textContent='Meine Angaben · '+pchapter.textContent;}};
const compactClosing=renderClosingAdvisor;
renderClosingAdvisor=function(){
  compactClosing();
  const ready=!!TaxModel.canton(st.canton),gap=adviceContext().gap;
  const row=document.querySelector('.completion-row'),title=row.querySelector('.completion-copy>strong');
  row.classList.toggle('provisional',!ready);row.classList.toggle('has-gap',ready&&!!gap);

  title.textContent=!ready?'Steuern noch nicht berücksichtigt':'Deine erste Planung steht.';
  if(ready){const rows=planProjection(),last=rows.at(-1);closingMessage.textContent=currentPlanStatus({feasible:!gap,firstGapAge:gap?.age},st.planningAge).message+(gap?'':` Erwartetes Restkapital mit Alter ${last.age}: ca. ${CHF(last.free)}.`);}
  if(!ready){
    closingMessage.textContent='Für die vollständige Einschätzung fehlt noch dein Wohnkanton.';
    closingInsight.innerHTML='Vorläufige Einschätzung · Für die Steuerschätzung brauchen wir deinen Wohnkanton.';
  }
};
const compactResult=renderResult;
renderResult=function(refresh=true){compactResult(refresh);if(!TaxModel.canton(st.canton))rr5.classList.remove('ok');};
if(st.mode)renderResult();

const guideUi=ui;ui=function(){guideUi();updateHeaderGuide();};updateHeaderGuide();
