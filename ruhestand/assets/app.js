'use strict';
const engine=new Conversation(), session=new RetirementSession();
const log=document.getElementById('messages'), choices=document.getElementById('choices'), field=document.getElementById('message'), proposals=document.getElementById('proposals'), statusLine=document.getElementById('request-status');
let mode='demo', password='', busy=false, controller=null, epoch=0;
const starters=['Früher aufhören','Rente oder Kapital?','Erst einmal Orientierung finden'];
function bubble(role,text){const el=document.createElement('div');el.className='bubble '+role;el.textContent=text;log.appendChild(el);log.scrollTop=log.scrollHeight;return el;}
function showChoices(items){choices.replaceChildren();items.forEach(text=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.disabled=busy;b.onclick=()=>send(text);choices.appendChild(b);});}
function renderReply(reply){bubble('assistant',reply.text);showChoices(reply.choices||[]);renderFacts();}
function current(){return mode==='ai'?session:engine;}
function setBusy(value){busy=value;document.querySelector('#composer button').disabled=value;field.disabled=value;document.getElementById('connect').disabled=value;choices.querySelectorAll('button').forEach(b=>b.disabled=value);}
function renderFacts(){const saved=document.getElementById('saved');saved.replaceChildren();if(!current().facts.length){const p=document.createElement('p');p.className='empty';p.textContent='Noch keine Punkte gemerkt. Du kannst einfach weiterreden.';saved.appendChild(p);}current().facts.forEach((f,i)=>{const card=document.createElement('div');card.className='fact';const title=document.createElement('strong');title.textContent=f.label;const content=document.createElement('div');content.textContent=f.value;const kind=document.createElement('div');kind.className='small';kind.textContent=f.kind;const remove=document.createElement('button');remove.type='button';remove.textContent='Entfernen';remove.onclick=()=>{current().remove(i);renderFacts();};card.append(title,content,kind,remove);saved.appendChild(card);});document.getElementById('download').disabled=!current().facts.length;document.querySelector('.overview').classList.toggle('is-empty',!current().facts.length);if(mode==='ai')syncMemoryRows();}
function syncMemoryRows(){
 log.querySelectorAll('.memory-suggestion').forEach(row=>{
  const p=JSON.parse(row.dataset.proposal);
  const exists=session.facts.some(f=>f.label===p.label&&f.value===p.value&&f.kind===p.kind);
  row.querySelector('.memory-prompt').textContent=exists?'✓ Gemerkt':'Für später merken?';
  const button=row.querySelector('button');button.textContent=exists?'Rückgängig':'Merken';button.setAttribute('aria-pressed',String(exists));
  row.classList.toggle('is-saved',exists);
 });
}
function showProposals(items){
 // Unbestätigte ältere Vorschläge verschwinden; gemerkte bleiben am Gespräch sichtbar.
 log.querySelectorAll('.memory-suggestion:not(.is-saved)').forEach(row=>row.remove());
 proposals.replaceChildren();
 const p=items.find(item=>!session.facts.some(f=>f.label===item.label&&f.value===item.value&&f.kind===item.kind));
 if(!p)return;
 const row=document.createElement('div');row.className='memory-suggestion';row.dataset.proposal=JSON.stringify(p);
 const prompt=document.createElement('span');prompt.className='memory-prompt';prompt.textContent='Für später merken?';
 const text=document.createElement('span');text.className='memory-text';text.textContent='«'+(p.value.includes('_')?p.label:p.value)+'»';
 const button=document.createElement('button');button.type='button';button.className='memory-action';button.textContent='Merken';button.setAttribute('aria-pressed','false');
 button.onclick=()=>{try{const index=session.facts.findIndex(f=>f.label===p.label&&f.value===p.value&&f.kind===p.kind);if(index>=0)session.remove(index);else session.accept(p);renderFacts();syncMemoryRows();}catch(e){statusLine.textContent=e.message;}};
 const explanation=document.createElement('small');explanation.className='memory-explanation';explanation.textContent='Gemerkte Punkte sammeln wir für deine Übersicht und ein mögliches Dossier.';
 if(log.querySelector('.memory-explanation'))row.append(prompt,text,button);else row.append(prompt,text,button,explanation);
 log.appendChild(row);log.scrollTop=log.scrollHeight;
}
async function api(data,secret,signal){const r=await fetch('api.php',{method:'POST',headers:{'Content-Type':'application/json','X-Ruhestand-Access':secret},body:JSON.stringify(data),signal});let answer;try{answer=await r.json();}catch{throw new Error('Der Server liefert keine API-Antwort. PHP-Einrichtung und Upload prüfen.');}if(!r.ok)throw new Error(answer.error||'Die Verbindung ist fehlgeschlagen.');return answer;}
async function send(raw){const text=String(raw).trim().slice(0,2000);if(!text||busy)return;if(mode==='demo'){bubble('user',text);renderReply(engine.send(text));field.value='';return;}let request;try{request=session.request(text);}catch(e){statusLine.textContent=e.message;return;}const userBubble=bubble('user',text);const turnEpoch=epoch;const oldChoices=Array.from(choices.children).map(b=>b.textContent);setBusy(true);statusLine.textContent='Der Begleiter denkt nach …';controller=new AbortController();const timer=setTimeout(()=>controller?.abort(),55000);try{const answer=await api(request,password,controller.signal);if(turnEpoch!==epoch)return;session.commit(text,answer);proposals.replaceChildren();renderReply({text:answer.reply});showProposals(answer.proposals);field.value='';statusLine.textContent='Aktuelles Anliegen: '+answer.topic+' · '+session.history.length/2+'/30 Gesprächsrunden';}catch(e){if(turnEpoch!==epoch)return;userBubble.remove();statusLine.textContent=e.name==='AbortError'?'Die Anfrage dauerte zu lange. Deine Nachricht wurde nicht in den lokalen Verlauf übernommen; du kannst sie erneut senden.':e.message;field.value=text;showChoices(oldChoices);}finally{clearTimeout(timer);if(turnEpoch===epoch){setBusy(false);controller=null;field.focus();}}}
function restart(){epoch++;if(controller)controller.abort();controller=null;setBusy(false);session.reset();engine.reset();log.replaceChildren();proposals.replaceChildren();field.value='';statusLine.textContent='';if(mode==='ai')renderReply({text:'Wenn du an deinen Ruhestand denkst: Worauf freust du dich – und was beschäftigt dich? Wir können zwischen deinen Themen wechseln. Die persönliche Übersicht befüllen wir nur mit deiner Zustimmung.',choices:starters});else renderReply({text:engine.history[0].text,choices:starters});}
document.getElementById('composer').onsubmit=e=>{e.preventDefault();send(field.value);};
field.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();document.getElementById('composer').requestSubmit();}};
document.getElementById('reset').onclick=restart;
document.getElementById('connect').onclick=async()=>{const secret=document.getElementById('access').value;const connection=document.getElementById('connection-status');if(!document.getElementById('consent').checked||!secret){connection.textContent='Bitte Testpasswort eingeben und der Übermittlung zustimmen.';return;}if(location.protocol!=='https:'){connection.textContent='Für den KI-Test bitte die HTTPS-Adresse auf deinem Hosting öffnen.';return;}const thisEpoch=epoch;setBusy(true);controller=new AbortController();const timer=setTimeout(()=>controller?.abort(),15000);connection.textContent='Verbindung zum Hosting prüfen …';try{await api({action:'ping'},secret,controller.signal);if(thisEpoch!==epoch)return;password=secret;document.getElementById('access').value='';mode='ai';document.getElementById('mode-label').textContent='KI-Gespräch · Gedächtnis innerhalb dieser Sitzung';document.getElementById('mode-badge').textContent='KI-TEST';document.getElementById('mode-foot').textContent='Dein Gespräch wird für jede Antwort an OpenAI übermittelt.';connection.textContent='Verbunden. Neues KI-Gespräch gestartet. Ob Modell und Guthaben funktionieren, zeigt die erste Antwort.';restart();}catch(e){if(thisEpoch===epoch)connection.textContent=e.name==='AbortError'?'Verbindungstest abgebrochen.':e.message;}finally{clearTimeout(timer);if(thisEpoch===epoch){setBusy(false);controller=null;}}};
document.getElementById('download').onclick=()=>{const text=current().dossier();const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='meine-ruhestandsgedanken.txt';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);};
restart();
