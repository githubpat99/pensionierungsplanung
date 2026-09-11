/* Shared text, input accessibility and sample-state presentation. */
function applyProductUI(){
  let sample=document.getElementById('exampleNotice');
  if(!sample){sample=document.createElement('p');sample.id='exampleNotice';sample.className='note';document.getElementById('headerGuide').after(sample);}
  sample.textContent='Beispielwerte – bitte durch deine persönlichen Angaben ersetzen.';
  sample.hidden=!st.exampleValues;
  const known={pkEmployee:'PK-Beitrag Arbeitnehmer',pkEmployer:'PK-Beitrag Arbeitgeber',pkInterest:'Verzinsung PK (%)',p3Contrib:'Beitrag Säule 3a pro Jahr',p3Return:'Rendite Säule 3a (%)',secReturn:'Rendite Wertschriften (%)',otherSave:'Zusätzliche Sparleistung pro Jahr',assInfl:'Inflationsannahme (%)',assCap:'Rendite PK-Kapitalbezug (%)',assUws:'Umwandlungssatz (%)',pkSlider:'PK-Kapitalanteil (%)',contactName:'Name',contactEmail:'E-Mail',contactPhone:'Telefon'};
  document.querySelectorAll('input,select,textarea').forEach((input,i)=>{
    const asset=input.closest('.asset'),existing=input.labels?.[0];
    const name=known[input.id]||input.getAttribute('aria-label')||existing?.textContent.trim()||asset?.querySelector('.copy b')?.textContent||input.placeholder||'Planungswert';
    input.setAttribute('aria-label',name);
    if(!existing&&!input.matches('select')&&input.type!=='range'){
      if(!input.id)input.id='planning-field-'+i;
      let label=document.querySelector(`label[for="${input.id}"]`);
      if(!label){label=document.createElement('label');label.htmlFor=input.id;label.className='input-caption';label.textContent=name;input.before(label);}
    }
    if(input.classList.contains('pct')&&document.activeElement!==input)input.value=input.value.replace('.',',');
  });
  document.querySelectorAll('.asset-head').forEach(el=>{el.setAttribute('role','button');el.tabIndex=0;el.setAttribute('aria-expanded',String(!el.nextElementSibling.classList.contains('hidden')));});
  document.querySelectorAll('[data-risk],[data-postrisk]').forEach(button=>{
    const key=button.dataset.risk||button.dataset.postrisk;
    const profile=RiskProfiles.getRiskProfile(key);
    button.querySelector('b').textContent=profile.label;
    button.querySelector('span').textContent=`Erwartete reale Rendite: ${(profile.expectedRealReturn*100).toLocaleString('de-DE',{minimumFractionDigits:1})} %`;
    button.title=profile.description;
    button.setAttribute('aria-pressed',String(RiskProfiles.getRiskProfile(st.risk).key===profile.key));
    if(!button.parentElement.nextElementSibling?.classList.contains('risk-explanation')){
      const note=document.createElement('p');note.className='note risk-explanation';note.textContent='Das Anlageprofil bestimmt Rendite und Schwankungen des Wachstumstopfs. Höhere Renditechancen bedeuten auch grössere Verlustrisiken. Auch eine vorsichtige Anlage kann Verluste aufweisen. Geldmarkt und Anleihen behalten ihre eigenen Annahmen.';button.parentElement.after(note);
    }
  });
  document.querySelectorAll('#planRisks table').forEach(table=>{
    const headers=[...table.querySelectorAll('thead th')].map(el=>el.childNodes[0].textContent.trim());
    table.querySelectorAll('tbody tr').forEach(row=>[...row.children].forEach((cell,i)=>cell.dataset.label=headers[i]));
  });
  const walker=document.createTreeWalker(document.querySelector('.app'),NodeFilter.SHOW_TEXT);let node;
  while(node=walker.nextNode())if(!node.parentElement.closest('script,style,textarea'))node.textContent=node.textContent.replace(/(\d+)\.(\d+)(?=\s*%)/g,'$1,$2').replace(/Pessimistisch/g,'Ungünstige Reihenfolge').replace(/Optimistisch/g,'Günstige Reihenfolge');
}
document.addEventListener('keydown',event=>{const el=event.target.closest('.asset-head');if(el&&['Enter',' '].includes(event.key)){event.preventDefault();el.click();el.setAttribute('aria-expanded',String(!el.nextElementSibling.classList.contains('hidden')));}});
const restartProduct=restartPlanning;restartPlanning=function(){restartProduct();exampleBaseline=JSON.stringify({...st,mode:null,plan:null});applyProductUI();};
const productPersist=persist;
let exampleBaseline=JSON.stringify({...st,mode:null,plan:null});
persist=function(){
  if(st.exampleValues&&JSON.stringify({...st,mode:null,plan:null})!==exampleBaseline)st.exampleValues=false;
  productPersist();
};
document.addEventListener('input',event=>{if(st.exampleValues&&event.target.matches('input,select')){st.exampleValues=false;persist();applyProductUI();}});
const productUI=ui;ui=function(){productUI();applyProductUI();};
const productResult=renderResult;renderResult=function(refresh=true){productResult(refresh);applyProductUI();};
const productTab=tab;tab=function(n,b){productTab(n,b);applyProductUI();};
const productFinance=updateFinancingValues;updateFinancingValues=function(){productFinance();applyProductUI();};
applyProductUI();
