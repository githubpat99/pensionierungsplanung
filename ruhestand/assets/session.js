(function(root){
'use strict';
class Session {
 constructor(){this.reset();}
 reset(){this.history=[];this.facts=[];this.topic='Orientierung';}
 request(text){if(this.history.length>=60)throw new Error('Das Limit von 30 Gesprächsrunden ist erreicht. Bitte Übersicht herunterladen und neu beginnen.');return {messages:[...this.history,{role:'user',content:text}],facts:this.facts.map(f=>({...f}))};}
 commit(text,reply){if(typeof reply.reply!=='string'||!Array.isArray(reply.proposals)||typeof reply.topic!=='string')throw new Error('Die Antwort hatte ein ungültiges Format.');this.history.push({role:'user',content:text},{role:'assistant',content:reply.reply});this.topic=reply.topic;}
 accept(proposal){if(this.facts.length>=30)throw new Error('Die Übersicht enthält bereits 30 Punkte. Bitte zunächst als Dossier herunterladen.');if(!this.facts.some(f=>f.label===proposal.label&&f.value===proposal.value&&f.kind===proposal.kind))this.facts.push({...proposal});}
 remove(i){this.facts.splice(i,1);}
 dossier(){return 'MEINE GEDANKEN ZUM RUHESTAND\nnickpatrick · Prototyp 0.2\n\nNur ausdrücklich übernommene Angaben. Nicht fachlich geprüft.\nKeine Finanzplanung und keine Berechnung.\n\n'+this.facts.map((f,i)=>(i+1)+'. '+f.label+'\n'+f.value+'\nEinordnung: '+f.kind).join('\n\n')+'\n\nNächster Schritt: offene Fragen anhand geprüfter Quellen und gegebenenfalls mit einer Fachperson klären.\n';}
}
if(typeof module!=='undefined'&&module.exports)module.exports=Session;else root.RetirementSession=Session;
})(typeof window!=='undefined'?window:globalThis);
